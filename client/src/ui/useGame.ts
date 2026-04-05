// useGame — React binding for the game driver.
// Subscribes a component to GameState changes and exposes action callbacks.
// The driver is framework-agnostic; this hook is the only place React meets
// the game loop.

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { GameState, GeneratorId, UpgradeId } from '../types.ts';
import { createDriver, type ActionError } from '../driver/index.ts';
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
  /**
   * Last action error, if any. Updates when a player action (click/buy/
   * upgrade/buyCloutUpgrade) fails a model precondition. Consumers can
   * render a transient toast/shake when this changes.
   */
  lastActionError: ActionError | null;
  /** Clear the last action error (call after displaying it to the user). */
  clearActionError: () => void;
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

  // Subscribe to action errors from the driver. The listener overwrites the
  // last-error slot; consumers that need queueing can layer their own buffer.
  useEffect(() => {
    const unsub = driver.onActionError((e) => setLastActionError(e));
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
      clearActionError: () => setLastActionError(null),
    }),
    [driver],
  );

  return { state, offlineResult, lastActionError, ...actions };
}
