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

import type Decimal from 'decimal.js';
import type {
  GameState,
  GeneratorId,
  StaticData,
  UpgradeId,
  VerbGearId,
  ViralBurstPayload,
} from '../types.ts';
import { tick, postClick, computeSnapshot } from '../game-loop/index.ts';
import {
  buyGenerator,
  upgradeGenerator,
  buyAutoclicker,
  generatorBuyCost,
  generatorUpgradeCost,
  autoclickerBuyCost,
  autoclickerCap,
} from '../generator/index.ts';
import { createInitialGameState, canAffordEngagement } from '../model/index.ts';
import { purchaseVerbGear } from '../verb-gear/index.ts';
import { clearSave, load, save } from '../save/index.ts';
import { calculateOffline, type OfflineResult } from '../offline/index.ts';
import {
  calculateRebrand,
  canRebrand,
  applyRebrand,
  purchaseCloutUpgrade,
  type RebrandResult,
} from '../prestige/index.ts';

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
export type ActionName = 'click' | 'buy' | 'upgrade' | 'unlock' | 'buyAutoclicker' | 'buyCloutUpgrade' | 'buyVerbGear';

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

/** Public read model returned by getSweepState(). Derived on every call. */
export interface SweepState {
  active: boolean;
  /** Whether at least one purchase is affordable right now. */
  canAfford: boolean;
}

/** Which track a sweep purchase targeted. */
export type SweepItemType = 'buy' | 'upgrade' | 'autoclicker';

/** Info about a single sweep purchase — passed to onSweepPurchase listeners. */
export interface SweepPurchaseEvent {
  type: SweepItemType;
  generatorId: GeneratorId;
  cost: Decimal;
}

// Internal sweep purchase candidate.
interface SweepItem {
  type: SweepItemType;
  generatorId: GeneratorId;
  cost: Decimal;
}

export interface DriverOptions {
  /** Injectable clock for tests. Defaults to Date.now. */
  now?: () => number;
  /** Injectable timer scheduler for tests. Defaults to window.setInterval. */
  setInterval?: (cb: () => void, ms: number) => number;
  clearInterval?: (handle: number) => void;
  /** Injectable one-shot timer for sweep. Defaults to window.setTimeout. */
  setTimeout?: (cb: () => void, ms: number) => number;
  clearTimeout?: (handle: number) => void;
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
  /** Whether rebrand is currently available (viral_stunts must be unlocked). */
  canRebrand(): boolean;
  /** Spend Clout to level up a meta-upgrade. Throws when unaffordable. */
  buyCloutUpgrade(upgradeId: UpgradeId): void;
  /** Spend Engagement on a verb gear item. Errors caught via onActionError. */
  buyVerbGear(gearId: VerbGearId): void;
  /**
   * Build the affordable purchase list and begin the 80ms sweep loop.
   * No-op if a sweep is already active.
   */
  startSweep(): void;
  /**
   * Cancel a sweep in progress. Already-fired purchases are not refunded.
   * No-op if no sweep is active.
   */
  cancelSweep(): void;
  /**
   * Synchronous read of current sweep status and affordable-purchase count.
   * canAfford is always recomputed from live state — accurate at any time.
   */
  getSweepState(): SweepState;
  /**
   * Subscribe to sweep-end events. Fires once when the sweep completes
   * naturally (list exhausted) or is cancelled. Returns an unsubscribe fn.
   */
  onSweepEnd(listener: () => void): Unsubscribe;
  /**
   * Subscribe to per-purchase events during a sweep. Fires after each
   * individual purchase succeeds with the type and generatorId that was bought.
   */
  onSweepPurchase(listener: (e: SweepPurchaseEvent) => void): Unsubscribe;
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
  /** @internal Test-only: replace the driver's state wholesale. */
  _applyState(newState: GameState): void;
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
    setTimeout: setTimeoutImpl =
      typeof window !== 'undefined' ? window.setTimeout.bind(window) : undefined,
    clearTimeout: clearTimeoutImpl =
      typeof window !== 'undefined' ? window.clearTimeout.bind(window) : undefined,
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
  const sweepEndListeners = new Set<() => void>();
  const sweepPurchaseListeners = new Set<(e: SweepPurchaseEvent) => void>();

  // Internal sweep state — ephemeral, not persisted.
  const sweep = { active: false, timeoutHandle: null as number | null, startTime: 0 };

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
        magnitude: active.magnitude.toNumber(),
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

  // ---------------------------------------------------------------------------
  // Sweep engine
  // ---------------------------------------------------------------------------

  /** Build the sorted list of affordable purchases from the current state. */
  function buildAffordableList(s: GameState): SweepItem[] {
    const items: SweepItem[] = [];
    for (const id of Object.keys(s.generators) as GeneratorId[]) {
      const gen = s.generators[id];
      if (!gen.owned) continue;
      const def = staticData.generators[id];
      if (!def) continue;

      if (def.manual_clickable) {
        // BUY track
        const buyCost = generatorBuyCost(id, gen.count, staticData);
        if (canAffordEngagement(s.player, buyCost)) {
          items.push({ type: 'buy', generatorId: id, cost: buyCost });
        }
        // HIRE track (flat cap of 12)
        if (gen.autoclicker_count < autoclickerCap()) {
          const hireCost = autoclickerBuyCost(id, gen.autoclicker_count, staticData);
          if (hireCost.gt(0) && canAffordEngagement(s.player, hireCost)) {
            items.push({ type: 'autoclicker', generatorId: id, cost: hireCost });
          }
        }
      }

      // LVL UP track — manual and passive both eligible
      if (gen.level < def.max_level) {
        const upgradeCost = generatorUpgradeCost(id, gen.level, staticData);
        if (canAffordEngagement(s.player, upgradeCost)) {
          items.push({ type: 'upgrade', generatorId: id, cost: upgradeCost });
        }
      }
    }
    // Priority: SPEED (upgrade) > HIRE (autoclicker) > POWER (buy), most expensive first within tier.
    const priority: Record<SweepItemType, number> = { upgrade: 0, autoclicker: 1, buy: 2 };
    return items.sort((a, b) => {
      const pa = priority[a.type];
      const pb = priority[b.type];
      if (pa !== pb) return pa - pb;
      return b.cost.comparedTo(a.cost);
    });
  }

  function fireSweepEndListeners(): void {
    for (const l of sweepEndListeners) l();
  }

  function endSweep(): void {
    sweep.active = false;
    sweep.timeoutHandle = null;
    fireSweepEndListeners();
  }

  /** Sweep interval ramps from 88ms → 30ms over 3s, then holds at 30ms. */
  function sweepInterval(): number {
    const elapsed = now() - sweep.startTime;
    const t = Math.min(1, elapsed / 3000);
    return Math.round(88 - 58 * t);
  }

  function fireSweepPurchase(item: SweepItem): void {
    const before = state;
    try {
      if (item.type === 'buy') {
        applyState(buyGenerator(state, item.generatorId, staticData));
      } else if (item.type === 'upgrade') {
        applyState(upgradeGenerator(state, item.generatorId, staticData));
      } else {
        applyState(buyAutoclicker(state, item.generatorId, staticData));
      }
    } catch {
      // Purchase may have become unaffordable since the list was built
      // (e.g. another purchase drained funds). Skip and re-evaluate.
    }
    // Notify per-purchase listeners only if state actually changed.
    if (state !== before) {
      for (const l of sweepPurchaseListeners) l({ type: item.type, generatorId: item.generatorId, cost: item.cost });
    }

    const next = buildAffordableList(state);
    if (next.length === 0 || !setTimeoutImpl) {
      endSweep();
      return;
    }
    sweep.timeoutHandle = setTimeoutImpl(() => {
      if (!sweep.active) return;
      const nextItems = buildAffordableList(state);
      if (nextItems.length === 0) { endSweep(); return; }
      fireSweepPurchase(nextItems[0]);
    }, sweepInterval());
  }

  return {
    getState: () => state,

    /** @internal Test-only: replace the driver's state wholesale. */
    _applyState(newState: GameState) { state = newState; notify(); },

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

    canRebrand: () => canRebrand(state),

    rebrand() {
      if (!canRebrand(state)) {
        throw new Error('rebrand: viral_stunts must be unlocked before rebranding');
      }
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

    buyVerbGear(gearId) {
      runAction('buyVerbGear', { gearId }, () => {
        applyState(purchaseVerbGear(state, gearId, staticData));
      });
    },

    startSweep() {
      if (sweep.active) return;
      const items = buildAffordableList(state);
      if (items.length === 0) {
        // Nothing to buy — fire end immediately without activating.
        fireSweepEndListeners();
        return;
      }
      sweep.active = true;
      sweep.startTime = now();
      fireSweepPurchase(items[0]);
    },

    cancelSweep() {
      if (!sweep.active) return;
      if (clearTimeoutImpl && sweep.timeoutHandle !== null) {
        clearTimeoutImpl(sweep.timeoutHandle);
      }
      endSweep();
    },

    getSweepState(): SweepState {
      return {
        active: sweep.active,
        canAfford: buildAffordableList(state).length > 0,
      };
    },

    onSweepEnd(listener) {
      sweepEndListeners.add(listener);
      return () => sweepEndListeners.delete(listener);
    },

    onSweepPurchase(listener) {
      sweepPurchaseListeners.add(listener);
      return () => sweepPurchaseListeners.delete(listener);
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
