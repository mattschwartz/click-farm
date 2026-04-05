// Driver module.
// Responsibility: runtime orchestration of the game loop. Holds the live
// GameState, runs tick() on an interval, dispatches player actions
// (click/buy/upgrade), handles periodic save + save-on-close, and notifies
// subscribers on state change.
//
// This is the boundary between the pure game-loop functions and the React UI.
// The UI never mutates state directly — it calls driver actions. The driver
// never imports from React.
//
// Architecture contract: single-player, client-authoritative. The driver IS
// the authority during play. See core-systems.md §Component Boundaries.

import type {
  GameState,
  GeneratorId,
  KitItemId,
  StaticData,
  UpgradeId,
  ViralBurstPayload,
} from '../types.ts';
import { purchaseKitItem } from '../creator-kit/index.ts';
import { tick, postClick, computeSnapshot } from '../game-loop/index.ts';
import { buyGenerator, upgradeGenerator } from '../generator/index.ts';
import { createInitialGameState } from '../model/index.ts';
import { load, save } from '../save/index.ts';
import { calculateOffline, type OfflineResult } from '../offline/index.ts';
import {
  calculateRebrand,
  applyRebrand,
  purchaseCloutUpgrade,
  getUpcomingShifts,
  type RebrandResult,
} from '../prestige/index.ts';
import type { ScheduledShift } from '../algorithm/index.ts';
import {
  createScandalSessionSnapshot,
  freezeAccumulators,
  unfreezeAccumulators,
  updateAccumulatorsOnPurchase,
  createDefaultStateMachine,
  onPlayerConfirm,
} from '../scandal/index.ts';

// ---------------------------------------------------------------------------
// Tuning constants
// ---------------------------------------------------------------------------

/** Tick interval in ms. 100ms = 10 ticks/sec. Matches spec guidance. */
export const TICK_INTERVAL_MS = 100;

/** Auto-save period in ms. Spec says "every 30s on a timer". */
export const SAVE_INTERVAL_MS = 30_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Unsubscribe = () => void;
export type StateListener = (state: GameState) => void;
export type ViralBurstListener = (payload: ViralBurstPayload) => void;

/** Which driver action was attempted when the error fired. */
export type ActionName = 'click' | 'buy' | 'upgrade' | 'buyCloutUpgrade' | 'buyKitItem';

/**
 * Fired when a player-triggered action throws out of the model layer. The
 * driver catches the throw, logs it, and invokes all action-error listeners.
 * State is not mutated when this fires (the throw happened before applyState).
 */
export interface ActionError {
  action: ActionName;
  error: Error;
  /** Action arguments at time of failure — e.g. { generatorId: 'memes' }. */
  context: Record<string, unknown>;
}

export type ActionErrorListener = (e: ActionError) => void;

export interface DriverOptions {
  /** Injectable clock for tests. Defaults to Date.now. */
  now?: () => number;
  /** Injectable timer scheduler for tests. Defaults to window.setInterval. */
  setInterval?: (cb: () => void, ms: number) => number;
  clearInterval?: (handle: number) => void;
  /** Injected static data so tests can swap balance. */
  staticData: StaticData;
  /** Whether to load from localStorage on start. Default true. */
  loadFromStorage?: boolean;
  /** Whether to persist to localStorage. Default true. */
  persistToStorage?: boolean;
}

export interface GameDriver {
  /** Current game state — snapshot at time of call. */
  getState(): GameState;
  /** Subscribe to state changes. Returns unsubscribe. */
  subscribe(listener: StateListener): Unsubscribe;
  /** Player actions — each returns void and triggers a state update. */
  click(): void;
  buy(generatorId: GeneratorId): void;
  upgrade(generatorId: GeneratorId): void;
  /** Force a single tick using the driver's clock. Test/debug utility. */
  step(deltaMs?: number): void;
  /** Persist to storage now (also captures current-rate snapshot). */
  saveNow(): void;
  /** Stop all timers. Idempotent. */
  stop(): void;
  /** Start the tick + auto-save timers. Idempotent. */
  start(): void;
  /**
   * Returns the offline result computed when the driver was created, or null
   * if the driver was not loaded from a save, this is the first session, or
   * the result has been dismissed via clearOfflineResult.
   */
  getOfflineResult(): OfflineResult | null;
  /** Clear the stored offline result (e.g. after the UI shows it). */
  clearOfflineResult(): void;
  /**
   * Rebrand: wipe the current run, award Clout, start a fresh run.
   * Returns the RebrandResult so the UI can show the Clout earned.
   */
  rebrand(): RebrandResult;
  /** Spend Clout to level up a meta-upgrade. Throws when unaffordable. */
  buyCloutUpgrade(upgradeId: UpgradeId): void;
  /** Spend Engagement on a Creator Kit item. Errors caught via onActionError. */
  buyKitItem(itemId: KitItemId): void;
  /** Upcoming algorithm shifts visible via the algorithm_insight upgrade. */
  getUpcomingShifts(): ScheduledShift[];
  /**
   * Player confirms the PR Response with a chosen engagement spend.
   * Transitions scandal state machine from scandal_active → resolving.
   * The game loop applies damage on the next tick.
   */
  confirmPR(engagementSpent: number): void;
  /**
   * Dismiss the aftermath resolution display. Clears lastResolution from
   * the state machine so the UI can stop showing the aftermath card.
   */
  dismissScandalResolution(): void;
  /**
   * Subscribe to viral burst events. Fires once per event, synchronously,
   * before state subscribers are notified. Returns an unsubscribe function.
   */
  onViralBurst(listener: ViralBurstListener): Unsubscribe;
  /**
   * Subscribe to action errors. Player-triggered actions (click, buy, upgrade,
   * buyCloutUpgrade) that throw from the model layer are caught here rather
   * than propagated — the driver logs the error to console and fires this
   * listener with the action name, original error, and arg context. Useful
   * for surfacing "that didn't work" feedback in the UI.
   */
  onActionError(listener: ActionErrorListener): Unsubscribe;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a game driver. The driver does NOT auto-start — call start() to
 * begin the tick loop. In a browser, call start() from a useEffect; in tests,
 * drive the state manually via step() / actions.
 *
 * On creation the driver either loads from localStorage or creates an initial
 * GameState.
 */
export function createDriver(options: DriverOptions): GameDriver {
  const {
    staticData,
    now = Date.now,
    setInterval: setIntervalImpl =
      typeof window !== 'undefined' ? window.setInterval.bind(window) : undefined,
    clearInterval: clearIntervalImpl =
      typeof window !== 'undefined'
        ? window.clearInterval.bind(window)
        : undefined,
    loadFromStorage = true,
    persistToStorage = true,
  } = options;

  // Load from storage or create initial state.
  let offlineResult: OfflineResult | null = null;
  let state: GameState = (() => {
    if (loadFromStorage) {
      try {
        const loaded = load();
        if (loaded) {
          // Apply offline gains if the save has a last_close_time and we're
          // opening later than that. Skip if no close time (first session
          // of this save) or if the clock has run backwards.
          const closeTime = loaded.player.last_close_time;
          const openTime = now();
          if (closeTime !== null && openTime > closeTime) {
            const { result, newState } = calculateOffline(
              loaded,
              closeTime,
              openTime,
              staticData,
            );
            offlineResult = result;
            return newState;
          }
          return loaded;
        }
      } catch {
        // Fall through to initial state — corrupt save shouldn't block play.
      }
    }
    return createInitialGameState(staticData, now());
  })();

  // Scandal: unfreeze accumulators (they were frozen on last save/close),
  // ensure state machine exists for old saves, and take a fresh session
  // snapshot for the magnitude floor. This runs on every open/foreground.
  {
    const unfrozen = unfreezeAccumulators(state.accumulators ?? []);
    const sm = state.scandalStateMachine ?? createDefaultStateMachine(staticData);
    const snapshot = createScandalSessionSnapshot(state, now());
    state = {
      ...state,
      accumulators: unfrozen,
      scandalStateMachine: sm,
      scandalSessionSnapshot: snapshot,
    };
  }

  let lastTickAt = now();
  const listeners = new Set<StateListener>();
  const viralListeners = new Set<ViralBurstListener>();
  const errorListeners = new Set<ActionErrorListener>();
  let tickHandle: number | null = null;
  let saveHandle: number | null = null;

  /**
   * Wrap a player action in try/catch. If the model throws, log to console
   * with structured context and fan out to error listeners — don't re-throw.
   * This prevents UI-level silent failures (model throws, React event handler
   * logs, state doesn't update, user sees "nothing happens"). Errors become
   * observable: listeners can surface toasts, log analytics, etc.
   */
  function runAction(
    action: ActionName,
    context: Record<string, unknown>,
    fn: () => void,
  ): void {
    try {
      fn();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      // Structured console log so the error is greppable and its context
      // is preserved even when no listeners are attached.
      // eslint-disable-next-line no-console
      console.error(`[driver] action '${action}' failed`, { context, error });
      const payload: ActionError = { action, error, context };
      for (const listener of errorListeners) listener(payload);
    }
  }

  function notify(): void {
    for (const l of listeners) l(state);
  }

  function applyState(next: GameState): void {
    if (next === state) return;
    state = next;
    notify();
  }

  function doTick(): void {
    const t = now();
    const deltaMs = Math.max(0, t - lastTickAt);
    lastTickAt = t;
    // Capture viral active state before tick so we can detect null → non-null.
    const prevViralActive = state.viralBurst.active;
    const next = tick(state, t, deltaMs, staticData);
    // Fire viral burst listeners synchronously before notifying state subscribers.
    if (prevViralActive === null && next.viralBurst.active !== null) {
      const active = next.viralBurst.active;
      const payload: ViralBurstPayload = {
        source_generator_id: active.source_generator_id,
        source_platform_id: active.source_platform_id,
        duration_ms: active.duration_ms,
        magnitude: active.magnitude,
      };
      for (const listener of viralListeners) listener(payload);
    }
    applyState(next);
  }

  function doSave(): void {
    if (!persistToStorage) return;
    // Update last_close_state snapshot from current rates before saving so
    // offline calc has fresh data on next open. Also stamp last_close_time
    // from the driver's clock so it matches what save() serialises.
    const t = now();
    const snapshot = computeSnapshot(state, staticData);
    const withSnapshot: GameState = {
      ...state,
      player: {
        ...state.player,
        last_close_state: snapshot,
        last_close_time: t,
      },
      // Freeze accumulators on save so they resume correctly on next open.
      accumulators: freezeAccumulators(state.accumulators),
    };
    // Don't go through applyState here — last_close_state / last_close_time
    // changes on save shouldn't re-render the UI, but keep local state
    // consistent so the next save reflects it.
    state = withSnapshot;
    try {
      save(state, t);
    } catch {
      // Swallow storage errors silently — game remains playable in memory.
      // TODO(engineer): surface a soft warning to the UI when quota is hit.
    }
  }

  return {
    getState: () => state,

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    click() {
      runAction('click', {}, () => {
        applyState(postClick(state, staticData));
      });
    },

    buy(generatorId) {
      runAction('buy', { generatorId }, () => {
        const prevState = state;
        const afterBuy = buyGenerator(prevState, generatorId, staticData);
        // Update Trend Chasing accumulator based on the output mix shift.
        const updatedAccumulators = updateAccumulatorsOnPurchase(
          afterBuy.accumulators,
          prevState,
          afterBuy,
          staticData,
        );
        applyState({ ...afterBuy, accumulators: updatedAccumulators });
      });
    },

    upgrade(generatorId) {
      runAction('upgrade', { generatorId }, () => {
        applyState(upgradeGenerator(state, generatorId, staticData));
      });
    },

    step(deltaMs) {
      const t = now();
      const delta = deltaMs ?? Math.max(0, t - lastTickAt);
      lastTickAt = t;
      applyState(tick(state, t, delta, staticData));
    },

    saveNow() {
      doSave();
    },

    start() {
      if (tickHandle !== null || saveHandle !== null) return;
      if (!setIntervalImpl) {
        throw new Error(
          'createDriver.start: no setInterval available — inject one via options',
        );
      }
      lastTickAt = now();
      tickHandle = setIntervalImpl(doTick, TICK_INTERVAL_MS);
      saveHandle = setIntervalImpl(doSave, SAVE_INTERVAL_MS);
    },

    stop() {
      if (!clearIntervalImpl) return;
      if (tickHandle !== null) {
        clearIntervalImpl(tickHandle);
        tickHandle = null;
      }
      if (saveHandle !== null) {
        clearIntervalImpl(saveHandle);
        saveHandle = null;
      }
    },

    getOfflineResult: () => offlineResult,
    clearOfflineResult: () => {
      offlineResult = null;
    },

    rebrand() {
      const result = calculateRebrand(state);
      applyState(applyRebrand(state, result, staticData, now()));
      // Rebrand starts a fresh run — reset the tick clock so the first tick
      // after rebrand doesn't see stale elapsed time.
      lastTickAt = now();
      return result;
    },

    buyCloutUpgrade(upgradeId) {
      runAction('buyCloutUpgrade', { upgradeId }, () => {
        applyState(purchaseCloutUpgrade(state, upgradeId, staticData));
      });
    },

    buyKitItem(itemId) {
      runAction('buyKitItem', { itemId }, () => {
        applyState(purchaseKitItem(state, itemId, staticData));
      });
    },

    getUpcomingShifts: () => getUpcomingShifts(state, staticData),

    confirmPR(engagementSpent) {
      const sm = state.scandalStateMachine;
      if (sm.state !== 'scandal_active') return;
      const nextSm = onPlayerConfirm(sm, engagementSpent);
      applyState({ ...state, scandalStateMachine: nextSm });
    },

    dismissScandalResolution() {
      const sm = state.scandalStateMachine;
      if (sm.lastResolution === null) return;
      applyState({
        ...state,
        scandalStateMachine: { ...sm, lastResolution: null },
      });
    },

    onViralBurst(listener) {
      viralListeners.add(listener);
      return () => viralListeners.delete(listener);
    },

    onActionError(listener) {
      errorListeners.add(listener);
      return () => {
        errorListeners.delete(listener);
      };
    },
  };
}
