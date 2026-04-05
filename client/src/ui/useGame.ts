// useGame — React binding for the game driver.
// Subscribes a component to GameState changes and exposes action callbacks.
// The driver is framework-agnostic; this hook is the only place React meets
// the game loop.

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { GameState, GeneratorId, KitItemId, UpgradeId } from '../types.ts';
import { createDriver, type ActionError, type SaveError } from '../driver/index.ts';
import type { OfflineResult } from '../offline/index.ts';
import type { RebrandResult } from '../prestige/index.ts';
import { STATIC_DATA } from '../static-data/index.ts';

export interface UseGameResult {
  state: GameState;
  click: () => void;
  buy: (id: GeneratorId) => void;
  upgrade: (id: GeneratorId) => void;
  saveNow: () => void;
  /** Offline gains captured at driver creation, if any. */
  offlineResult: OfflineResult | null;
  /** Dismiss the offline-gains banner. */
  clearOfflineResult: () => void;
  /** Rebrand: wipe run, award Clout. Returns result for UI display. */
  rebrand: () => RebrandResult;
  /** Spend Clout on a meta-upgrade. Throws when unaffordable. */
  buyCloutUpgrade: (id: UpgradeId) => void;
  /** Spend Engagement on a Creator Kit item. */
  buyKitItem: (id: KitItemId) => void;
  /**
   * Last action error, if any. Updates when a player action (click/buy/
   * upgrade/buyCloutUpgrade) fails a model precondition. Consumers can
   * render a transient toast/shake when this changes.
   */
  lastActionError: ActionError | null;
  /** Clear the last action error (call after displaying it to the user). */
  clearActionError: () => void;
  /**
   * Last save-subsystem error (corrupt load / quota exceeded / unknown storage
   * failure). Stays set until dismissed — unlike actionError, these are
   * persistent concerns the UI should keep visible. Task #55.
   */
  saveError: SaveError | null;
  /** Dismiss the save-error notification. */
  clearSaveError: () => void;
  /**
   * Pause the game loop (stop tick + save timers). Used by the Rebrand
   * Ceremony modal per §4.1 — production halts while the ceremony is open.
   */
  pauseLoop: () => void;
  /**
   * Resume the game loop after a pause. Counterpart to pauseLoop. The driver
   * resets its tick clock on start() so time spent in the modal is not
   * counted as offline time.
   */
  resumeLoop: () => void;
  /** Wipe the current save and restart the driver with a fresh GameState. */
  resetGame: () => void;
}

/**
 * Creates a singleton driver (per hook instance), starts the tick + save
 * loops, and provides the state through React's external-store subscription.
 *
 * IMPORTANT: this hook assumes it is mounted once at the App root. Mounting
 * it in multiple component trees will create multiple drivers racing on the
 * same save slot.
 */
export function useGame(): UseGameResult {
  // useState's lazy initializer is the React-sanctioned way to build a
  // stable per-component singleton — it runs exactly once and the driver
  // reference is safe to read during render.
  const [driver] = useState(() => createDriver({ staticData: STATIC_DATA }));
  // Offline result is captured once at driver creation. We keep it in local
  // React state so dismissing it causes a re-render.
  const [offlineResult, setOfflineResult] = useState<OfflineResult | null>(
    () => driver.getOfflineResult(),
  );
  const [lastActionError, setLastActionError] = useState<ActionError | null>(null);
  const [saveError, setSaveError] = useState<SaveError | null>(null);

  // Subscribe to action errors from the driver. The listener overwrites the
  // last-error slot; consumers that need queueing can layer their own buffer.
  useEffect(() => {
    const unsub = driver.onActionError((e) => setLastActionError(e));
    return unsub;
  }, [driver]);

  // Subscribe to save-subsystem errors. The driver replays any pending
  // load_corrupt event from construction to the first subscriber, so this
  // must mount early in the component lifecycle. Task #55.
  useEffect(() => {
    const unsub = driver.onSaveError((e) => setSaveError(e));
    return unsub;
  }, [driver]);

  // Start/stop the timers with the component lifecycle. Also persist on page
  // hide (beforeunload fires unreliably on mobile; visibilitychange is the
  // recommended modern replacement).
  useEffect(() => {
    driver.start();

    const saveOnHide = (): void => {
      driver.saveNow();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', saveOnHide);
      window.addEventListener('pagehide', saveOnHide);
    }

    return () => {
      driver.saveNow();
      driver.stop();
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', saveOnHide);
        window.removeEventListener('pagehide', saveOnHide);
      }
    };
  }, [driver]);

  const state = useSyncExternalStore(
    (listener) => driver.subscribe(listener),
    () => driver.getState(),
    () => driver.getState(),
  );

  const actions = useMemo(
    () => ({
      click: () => driver.click(),
      buy: (id: GeneratorId) => driver.buy(id),
      upgrade: (id: GeneratorId) => driver.upgrade(id),
      saveNow: () => driver.saveNow(),
      clearOfflineResult: () => {
        driver.clearOfflineResult();
        setOfflineResult(null);
      },
      rebrand: () => driver.rebrand(),
      buyCloutUpgrade: (id: UpgradeId) => driver.buyCloutUpgrade(id),
      buyKitItem: (id: KitItemId) => driver.buyKitItem(id),
      clearActionError: () => setLastActionError(null),
      clearSaveError: () => setSaveError(null),
      pauseLoop: () => driver.stop(),
      resumeLoop: () => driver.start(),
      resetGame: () => driver.resetGame(),
    }),
    [driver],
  );

  return { state, offlineResult, lastActionError, saveError, ...actions };
}
