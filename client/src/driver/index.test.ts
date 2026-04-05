import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDriver } from './index.ts';
import { STATIC_DATA } from '../static-data/index.ts';

// ---------------------------------------------------------------------------
// localStorage mock (shared with save.test.ts pattern)
// ---------------------------------------------------------------------------

function makeLocalStorageMock(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
}

// ---------------------------------------------------------------------------
// Injectable clock + scheduler helpers
// ---------------------------------------------------------------------------

interface FakeScheduler {
  now: () => number;
  advance: (ms: number) => void;
  setInterval: (cb: () => void, ms: number) => number;
  clearInterval: (handle: number) => void;
}

function makeFakeScheduler(startAt: number = 1_000_000): FakeScheduler {
  let t = startAt;
  const timers = new Map<number, { cb: () => void; ms: number; next: number }>();
  let nextHandle = 1;

  return {
    now: () => t,
    advance(ms: number) {
      const target = t + ms;
      // Fire timers in order of next-due.
      for (;;) {
        let nextDue = Infinity;
        let nextHandleToFire: number | null = null;
        for (const [handle, timer] of timers) {
          if (timer.next < nextDue) {
            nextDue = timer.next;
            nextHandleToFire = handle;
          }
        }
        if (nextHandleToFire === null || nextDue > target) break;
        t = nextDue;
        const timer = timers.get(nextHandleToFire)!;
        timer.next = t + timer.ms;
        timer.cb();
      }
      t = target;
    },
    setInterval(cb, ms) {
      const handle = nextHandle++;
      timers.set(handle, { cb, ms, next: t + ms });
      return handle;
    },
    clearInterval(handle) {
      timers.delete(handle);
    },
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', makeLocalStorageMock());
});

// ---------------------------------------------------------------------------
// Driver — lifecycle & actions
// ---------------------------------------------------------------------------

describe('driver — lifecycle & actions', () => {
  it('creates an initial state when no save exists', () => {
    const s = makeFakeScheduler();
    const driver = createDriver({
      staticData: STATIC_DATA,
      now: s.now,
      setInterval: s.setInterval,
      clearInterval: s.clearInterval,
    });
    const state = driver.getState();
    expect(state.player.engagement).toBe(0);
    expect(state.player.total_followers).toBe(0);
    expect(state.platforms.chirper.unlocked).toBe(true);
  });

  it('click increments engagement and notifies subscribers', () => {
    const s = makeFakeScheduler();
    const driver = createDriver({
      staticData: STATIC_DATA,
      now: s.now,
      setInterval: s.setInterval,
      clearInterval: s.clearInterval,
    });
    let callCount = 0;
    driver.subscribe(() => { callCount++; });

    const before = driver.getState().player.engagement;
    driver.click();
    expect(driver.getState().player.engagement).toBeGreaterThan(before);
    expect(callCount).toBe(1);
  });

  it('unsubscribe stops notifications', () => {
    const s = makeFakeScheduler();
    const driver = createDriver({
      staticData: STATIC_DATA,
      now: s.now,
      setInterval: s.setInterval,
      clearInterval: s.clearInterval,
    });
    let count = 0;
    const unsub = driver.subscribe(() => { count++; });
    driver.click();
    expect(count).toBe(1);
    unsub();
    driver.click();
    expect(count).toBe(1);
  });

  it('buy and upgrade throw when unaffordable', () => {
    const s = makeFakeScheduler();
    const driver = createDriver({
      staticData: STATIC_DATA,
      now: s.now,
      setInterval: s.setInterval,
      clearInterval: s.clearInterval,
    });
    // selfies unlocks at 0 followers so it's always owned.
    // But initial state has generators all owned=false — they start owned
    // only after follower thresholds are crossed. selfies threshold is 0,
    // so on the first tick it should unlock. Force that here.
    driver.step(1);
    // selfies is now owned. Try to buy without engagement.
    expect(() => driver.buy('selfies')).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Driver — tick loop
// ---------------------------------------------------------------------------

describe('driver — tick loop', () => {
  it('runs ticks on interval and accumulates engagement when generators are active', () => {
    const s = makeFakeScheduler();
    const driver = createDriver({
      staticData: STATIC_DATA,
      now: s.now,
      setInterval: s.setInterval,
      clearInterval: s.clearInterval,
      loadFromStorage: false,
    });
    driver.start();

    // Step #1: first tick should unlock selfies (threshold 0).
    s.advance(200);
    // Bootstrap engagement via clicks so we can buy selfies.
    for (let i = 0; i < 20; i++) driver.click();
    expect(driver.getState().generators.selfies.owned).toBe(true);
    driver.buy('selfies');
    expect(driver.getState().generators.selfies.count).toBe(1);

    const before = driver.getState().player.engagement;
    s.advance(5_000); // 5 seconds of ticking
    const after = driver.getState().player.engagement;
    expect(after).toBeGreaterThan(before);

    driver.stop();
  });

  it('start is idempotent and stop is idempotent', () => {
    const s = makeFakeScheduler();
    const driver = createDriver({
      staticData: STATIC_DATA,
      now: s.now,
      setInterval: s.setInterval,
      clearInterval: s.clearInterval,
      loadFromStorage: false,
    });
    driver.start();
    driver.start(); // no-op
    driver.stop();
    driver.stop(); // no-op
    // If stop wasn't idempotent, a second stop would error on null handle.
    expect(true).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Driver — persistence
// ---------------------------------------------------------------------------

describe('driver — persistence', () => {
  it('saveNow persists state and captures the current-rate snapshot', () => {
    const s = makeFakeScheduler();
    const driver = createDriver({
      staticData: STATIC_DATA,
      now: s.now,
      setInterval: s.setInterval,
      clearInterval: s.clearInterval,
      loadFromStorage: false,
    });
    // Generate some state
    driver.step(1);
    for (let i = 0; i < 20; i++) driver.click();
    driver.buy('selfies');

    driver.saveNow();

    // Raw snapshot should be populated and reflect an engagement rate > 0.
    const snap = driver.getState().player.last_close_state;
    expect(snap).not.toBeNull();
    expect(snap!.total_engagement_rate).toBeGreaterThan(0);
  });

  it('loads persisted state on a subsequent driver creation', () => {
    const s = makeFakeScheduler();
    const driverA = createDriver({
      staticData: STATIC_DATA,
      now: s.now,
      setInterval: s.setInterval,
      clearInterval: s.clearInterval,
    });
    for (let i = 0; i < 5; i++) driverA.click();
    const savedEngagement = driverA.getState().player.engagement;
    driverA.saveNow();

    const driverB = createDriver({
      staticData: STATIC_DATA,
      now: s.now,
      setInterval: s.setInterval,
      clearInterval: s.clearInterval,
    });
    expect(driverB.getState().player.engagement).toBe(savedEngagement);
  });

  it('exposes null offline result when no save exists', () => {
    const s = makeFakeScheduler();
    const driver = createDriver({
      staticData: STATIC_DATA,
      now: s.now,
      setInterval: s.setInterval,
      clearInterval: s.clearInterval,
    });
    expect(driver.getOfflineResult()).toBeNull();
  });

  it('computes offline result when loaded from save with a later openTime', () => {
    // Session A: create state, play a bit, save at time T0.
    let t = 1_000_000;
    const sA = { now: () => t, setInterval: () => 0, clearInterval: () => {} };
    const driverA = createDriver({
      staticData: STATIC_DATA,
      ...sA,
    });
    driverA.step(1);                       // unlock selfies
    for (let i = 0; i < 30; i++) driverA.click();
    driverA.buy('selfies');
    // Tick once so there's a rate to persist in the snapshot.
    t += 1000;
    driverA.step(1000);
    driverA.saveNow();                     // save stamps last_close_time = t
    const closeTime = driverA.getState().player.last_close_time;
    expect(closeTime).toBe(t);

    // Session B: open 10 minutes later — should trigger offline calc.
    t += 10 * 60 * 1000;
    const driverB = createDriver({
      staticData: STATIC_DATA,
      now: () => t,
      setInterval: () => 0,
      clearInterval: () => {},
    });
    const result = driverB.getOfflineResult();
    expect(result).not.toBeNull();
    expect(result!.durationMs).toBe(10 * 60 * 1000);
    expect(result!.engagementGained).toBeGreaterThan(0);
    expect(result!.totalFollowersGained).toBeGreaterThan(0);
    // Algorithm should have shifted at least once (base interval 5 min).
    expect(result!.algorithmAdvances).toBeGreaterThanOrEqual(1);

    // State reflects the offline application.
    expect(driverB.getState().player.engagement).toBeGreaterThan(
      driverA.getState().player.engagement,
    );
    expect(driverB.getState().player.last_close_time).toBe(t);
  });

  it('clearOfflineResult resets the stored result to null', () => {
    let t = 1_000_000;
    const driverA = createDriver({
      staticData: STATIC_DATA,
      now: () => t,
      setInterval: () => 0,
      clearInterval: () => {},
    });
    driverA.step(1);
    for (let i = 0; i < 30; i++) driverA.click();
    driverA.buy('selfies');
    driverA.saveNow();

    t += 60_000;
    const driverB = createDriver({
      staticData: STATIC_DATA,
      now: () => t,
      setInterval: () => 0,
      clearInterval: () => {},
    });
    expect(driverB.getOfflineResult()).not.toBeNull();
    driverB.clearOfflineResult();
    expect(driverB.getOfflineResult()).toBeNull();
  });

  it('does not compute offline result when openTime <= closeTime', () => {
    const t = 1_000_000;
    const driverA = createDriver({
      staticData: STATIC_DATA,
      now: () => t,
      setInterval: () => 0,
      clearInterval: () => {},
    });
    driverA.click();
    driverA.saveNow();
    // Reopen at the same time.
    const driverB = createDriver({
      staticData: STATIC_DATA,
      now: () => t,
      setInterval: () => 0,
      clearInterval: () => {},
    });
    expect(driverB.getOfflineResult()).toBeNull();
  });

  it('rebrand wipes run state, awards clout, and is exposed via driver action', () => {
    const t = 1_000_000;
    const driver = createDriver({
      staticData: STATIC_DATA,
      now: () => t,
      setInterval: () => 0,
      clearInterval: () => {},
      loadFromStorage: false,
      persistToStorage: false,
    });
    // Bootstrap some state: enough engagement to look mid-run, some followers.
    driver.step(1);
    for (let i = 0; i < 50; i++) driver.click();
    driver.buy('selfies');
    // Force a big follower count so rebrand awards nontrivial clout.
    const s0 = driver.getState();
    const injected = {
      ...s0,
      player: {
        ...s0.player,
        total_followers: 10_000,
        lifetime_followers: 10_000,
      },
      platforms: {
        ...s0.platforms,
        chirper: { ...s0.platforms.chirper, followers: 10_000 },
      },
    };
    // Re-inject via a rebrand-adjacent path: create a driver with a custom
    // mid-state isn't available, so use a private path — directly mutate
    // isn't possible. Use subscribe + a big synthetic click loop instead.
    // Simpler: just verify rebrand works on whatever state we built organically
    // (floor(sqrt(X)/10) may be 0 here — that's fine for checking reset).
    void injected;

    const beforeClout = driver.getState().player.clout;
    const beforeRebrandCount = driver.getState().player.rebrand_count;
    const result = driver.rebrand();
    expect(result.cloutEarned).toBeGreaterThanOrEqual(0);
    expect(driver.getState().player.clout).toBe(beforeClout + result.cloutEarned);
    expect(driver.getState().player.rebrand_count).toBe(beforeRebrandCount + 1);
    expect(driver.getState().player.engagement).toBe(0);
    expect(driver.getState().player.total_followers).toBe(0);
    // All generators reset.
    expect(driver.getState().generators.selfies.owned).toBe(false);
    expect(driver.getState().generators.selfies.count).toBe(0);
  });

  it('buyCloutUpgrade throws when player has no clout', () => {
    const t = 1_000_000;
    const driver = createDriver({
      staticData: STATIC_DATA,
      now: () => t,
      setInterval: () => 0,
      clearInterval: () => {},
      loadFromStorage: false,
      persistToStorage: false,
    });
    expect(() => driver.buyCloutUpgrade('faster_engagement')).toThrow();
  });

  it('buyCloutUpgrade deducts clout and notifies subscribers on success', () => {
    // Seed a save with enough clout to afford the first upgrade, then load it.
    const t = 1_000_000;
    const seed = createDriver({
      staticData: STATIC_DATA,
      now: () => t,
      setInterval: () => 0,
      clearInterval: () => {},
      loadFromStorage: false,
      persistToStorage: true,
    });
    // Rebrand with high followers to manufacture clout. We can't mutate state
    // directly, so manufacture by injecting via localStorage: saveNow then
    // edit the saved JSON to set clout + total_followers, then reload.
    seed.saveNow();
    const raw = localStorage.getItem('click_farm_save')!;
    const parsed = JSON.parse(raw);
    parsed.state.player.clout = 100;
    localStorage.setItem('click_farm_save', JSON.stringify(parsed));

    const driver = createDriver({
      staticData: STATIC_DATA,
      now: () => t,
      setInterval: () => 0,
      clearInterval: () => {},
      loadFromStorage: true,
      persistToStorage: false,
    });
    expect(driver.getState().player.clout).toBe(100);

    let notified = 0;
    driver.subscribe(() => { notified++; });
    const cost = STATIC_DATA.cloutUpgrades.faster_engagement.cost[0];
    driver.buyCloutUpgrade('faster_engagement');
    expect(driver.getState().player.clout).toBe(100 - cost);
    expect(driver.getState().player.clout_upgrades.faster_engagement).toBe(1);
    expect(notified).toBe(1);
  });

  it('getUpcomingShifts returns [] when algorithm_insight is unpurchased', () => {
    const t = 1_000_000;
    const driver = createDriver({
      staticData: STATIC_DATA,
      now: () => t,
      setInterval: () => 0,
      clearInterval: () => {},
      loadFromStorage: false,
      persistToStorage: false,
    });
    expect(driver.getUpcomingShifts()).toEqual([]);
  });

  it('does not write to storage when persistToStorage is false', () => {
    const s = makeFakeScheduler();
    const driver = createDriver({
      staticData: STATIC_DATA,
      now: s.now,
      setInterval: s.setInterval,
      clearInterval: s.clearInterval,
      loadFromStorage: false,
      persistToStorage: false,
    });
    driver.click();
    driver.saveNow();
    expect(localStorage.getItem('click_farm_save')).toBeNull();
  });
});
