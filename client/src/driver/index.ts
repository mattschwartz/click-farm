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
import { buyGenerator, upgradeGenerator, unlockGenerator, buyAutoclicker } from '../generator/index.ts';
import { createInitialGameState } from '../model/index.ts';
import { clearSave, load, save } from '../save/index.ts';
import { calculateOffline, type OfflineResult } from '../offline/index.ts';
import {
  calculateRebrand,
  applyRebrand,
  purchaseCloutUpgrade,
  getUpcomingShifts,
  type RebrandResult,
} from '../prestige/index.ts';
import type { ScheduledShift } from '../algorithm/index.ts';

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
export type ActionName = 'click' | 'buy' | 'upgrade' | 'unlock' | 'buyAutoclicker' | 'buyCloutUpgrade' | 'buyKitItem';

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

/**
 * Fired when save subsystem operations fail (load-time corruption, save-time
 * quota exceeded, etc). Kept separate from ActionError because these aren't
 * triggered by player actions — they're storage problems the UI surfaces
 * as a persistent warning rather than a transient action shake. Task #55.
 */
export type SaveErrorKind = 'load_corrupt' | 'save_quota' | 'save_unknown';

export interface SaveError {
  kind: SaveErrorKind;
  /** Short, human-readable detail from the underlying Error (if any). */
  details?: string;
}

export type SaveErrorListener = (e: SaveError) => void;

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
  /**
   * Manual click on a specific verb (generator). Dispatches through postClick
   * with cooldown gating and per-verb yield.
   */
  click(verbId: GeneratorId): void;
  buy(generatorId: GeneratorId): void;
  upgrade(generatorId: GeneratorId): void;
  /** Unlock a manual-clickable generator (pays base_buy_cost, flips owned=true). */
  unlock(verbId: GeneratorId): void;
  /** Buy one autoclicker for a manual-clickable generator. */
  buyAutoclicker(verbId: GeneratorId): void;
  /** Force a single tick using the driver's clock. Test/debug utility. */
  step(deltaMs?: number): void;
  /** Persist to storage now (also captures current-rate snapshot). */
  saveNow(): void;
  /**
   * Clear the persisted save and disable all future writes from this driver.
   * Used by the reset-game flow: after calling resetGame(), the caller should
   * reload the page so a fresh driver can initialise from empty storage.
   * Idempotent. Stops tick and save timers.
   */
  resetGame(): void;
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
   * Run the offline calculator against the current state using the saved
   * last_close_time. Applies gains to state and stores the result for
   * getOfflineResult(). Used when resuming from a background tab.
   */
  runOfflineCalc(): void;
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
  /**
   * Subscribe to save subsystem errors — corrupt save on load, quota-exceeded
   * on persist, etc. Listeners attached after createDriver() receive any
   * pending load_corrupt event that fired during construction: the driver
   * stashes the first such error and replays it on subscribe. Task #55.
   */
  onSaveError(listener: SaveErrorListener): Unsubscribe;
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

  // Load from storage or create initial state. A corrupt save is captured
  // here and replayed to the first onSaveError listener that attaches —
  // creation happens before any React effect can subscribe. Task #55.
  let offlineResult: OfflineResult | null = null;
  let pendingSaveError: SaveError | null = null;
  let state: GameState = (() => {
    if (loadFromStorage) {
      const result = load();
      if (result.kind === 'corrupt') {
        // eslint-disable-next-line no-console
        console.error('[driver] save is corrupt — falling back to initial state', {
          error: result.error,
        });
        pendingSaveError = {
          kind: 'load_corrupt',
          details: result.error.message,
        };
      } else if (result.kind === 'loaded') {
        const loaded = result.state;
        // Apply offline gains if the save has a last_close_time and we're
        // opening later than that. Skip if no close time (first session
        // of this save) or if the clock has run backwards.
        const closeTime = loaded.player.last_close_time;
        const openTime = now();
        if (closeTime !== null && openTime > closeTime) {
          const { result: offline, newState } = calculateOffline(
            loaded,
            closeTime,
            openTime,
            staticData,
          );
          offlineResult = offline;
          return newState;
        }
        return loaded;
      }
    }
    return createInitialGameState(staticData, now());
  })();

  let lastTickAt = now();
  const listeners = new Set<StateListener>();
  const viralListeners = new Set<ViralBurstListener>();
  const errorListeners = new Set<ActionErrorListener>();
  const saveErrorListeners = new Set<SaveErrorListener>();

  function emitSaveError(e: SaveError): void {
    for (const listener of saveErrorListeners) listener(e);
  }
  let tickHandle: number | null = null;
  let saveHandle: number | null = null;
  // Set by resetGame(). Once true, doSave() becomes a no-op so that
  // late-firing saves (periodic timer, beforeunload, useEffect cleanup)
  // cannot resurrect the save we just cleared.
  let dead = false;

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
    if (dead) return;
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
    };
    // Don't go through applyState here — last_close_state / last_close_time
    // changes on save shouldn't re-render the UI, but keep local state
    // consistent so the next save reflects it.
    state = withSnapshot;
    try {
      save(state, t);
    } catch (err) {
      // Distinguish quota from other storage failures so the UI can explain
      // why the save won't stick. DOMException.name === 'QuotaExceededError'
      // is the Standard way; legacy Firefox used code 1014 via NS_ERROR_DOM_
      // QUOTA_REACHED. Either matches kind: 'save_quota'.
      const isQuota =
        err instanceof DOMException &&
        (err.name === 'QuotaExceededError' ||
          err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
          err.code === 22 ||
          err.code === 1014);
      const details = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.error('[driver] save failed', { kind: isQuota ? 'save_quota' : 'save_unknown', details });
      emitSaveError({
        kind: isQuota ? 'save_quota' : 'save_unknown',
        details,
      });
    }
  }

  return {
    getState: () => state,

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    click(verbId: GeneratorId) {
      runAction('click', { verbId }, () => {
        applyState(postClick(state, staticData, verbId, now()));
      });
    },

    buy(generatorId) {
      runAction('buy', { generatorId }, () => {
        applyState(buyGenerator(state, generatorId, staticData));
      });
    },

    upgrade(generatorId) {
      runAction('upgrade', { generatorId }, () => {
        applyState(upgradeGenerator(state, generatorId, staticData));
      });
    },

    unlock(verbId) {
      runAction('unlock', { verbId }, () => {
        applyState(unlockGenerator(state, verbId, staticData));
      });
    },

    buyAutoclicker(verbId) {
      runAction('buyAutoclicker', { verbId }, () => {
        applyState(buyAutoclicker(state, verbId, staticData));
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

    resetGame() {
      // Mark the driver dead BEFORE clearing storage so any concurrent
      // timer callback or beforeunload handler that races with us finds
      // the dead flag and bails out of doSave().
      dead = true;
      if (clearIntervalImpl) {
        if (tickHandle !== null) {
          clearIntervalImpl(tickHandle);
          tickHandle = null;
        }
        if (saveHandle !== null) {
          clearIntervalImpl(saveHandle);
          saveHandle = null;
        }
      }
      if (persistToStorage) clearSave();
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
    runOfflineCalc: () => {
      const closeTime = state.player.last_close_time;
      const openTime = now();
      if (closeTime === null || openTime <= closeTime) return;
      const { result: offline, newState } = calculateOffline(
        state,
        closeTime,
        openTime,
        staticData,
      );
      offlineResult = offline;
      applyState(newState);
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

    onSaveError(listener) {
      saveErrorListeners.add(listener);
      // Replay the construction-time corrupt-load event to late subscribers.
      // One-shot: consume the pending slot so a second listener doesn't see
      // it as well (the first receiver is responsible for UI state).
      if (pendingSaveError !== null) {
        const pending = pendingSaveError;
        pendingSaveError = null;
        listener(pending);
      }
      return () => {
        saveErrorListeners.delete(listener);
      };
    },
  };
}
