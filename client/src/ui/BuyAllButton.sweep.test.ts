// Integration tests for BUY ALL sweep wiring via the driver.
// Verifies: startSweep/cancelSweep callbacks, onSweepEnd subscription,
// and that the driver-level behavior is exposed correctly to the UI layer.
// No jsdom — tests the driver contract that the BuyAllButton depends on.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDriver } from '../driver/index.ts';
import { STATIC_DATA } from '../static-data/index.ts';
import { generatorBuyCost } from '../generator/index.ts';

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

function makeFakeOneShots() {
  const pending = new Map<number, () => void>();
  let nextHandle = 100;
  return {
    setTimeout(cb: () => void): number {
      const h = nextHandle++;
      pending.set(h, cb);
      return h;
    },
    clearTimeout(h: number) { pending.delete(h); },
    flush() {
      for (const [h, cb] of [...pending]) { pending.delete(h); cb(); }
    },
    pendingCount: () => pending.size,
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', makeLocalStorageMock());
});

/** Create a driver with high engagement for testing sweep. */
function makeDriver(engagement: number = 1_000_000) {
  const timeouts = makeFakeOneShots();

  // Bootstrap via localStorage injection
  const tmp = createDriver({
    staticData: STATIC_DATA,
    now: () => 1_000_000,
    setInterval: () => 0,
    clearInterval: () => {},
    persistToStorage: true,
    loadFromStorage: false,
  });
  tmp.saveNow();
  const raw = JSON.parse(localStorage.getItem('click_farm_save')!);
  raw.state.player.engagement = engagement;
  localStorage.setItem('click_farm_save', JSON.stringify(raw));

  const driver = createDriver({
    staticData: STATIC_DATA,
    now: () => 1_000_000,
    setInterval: () => 0,
    clearInterval: () => {},
    setTimeout: timeouts.setTimeout,
    clearTimeout: timeouts.clearTimeout,
  });

  return { driver, timeouts };
}

describe('BUY ALL button — sweep driver contract', () => {
  it('idle/available: getSweepState returns active=false and previewCount > 0 with high engagement', () => {
    const { driver } = makeDriver(1_000_000);
    const s = driver.getSweepState();
    expect(s.active).toBe(false);
    expect(s.previewCount).toBeGreaterThan(0);
  });

  it('idle/empty: getSweepState returns previewCount=0 with no engagement', () => {
    const { driver } = makeDriver(0);
    const s = driver.getSweepState();
    expect(s.active).toBe(false);
    expect(s.previewCount).toBe(0);
  });

  it('sweeping: getSweepState returns active=true after startSweep with affordable items', () => {
    const { driver, timeouts } = makeDriver(1_000_000);
    driver.startSweep();
    expect(driver.getSweepState().active).toBe(true);
    timeouts.flush();
  });

  it('STOP: cancelSweep sets active=false immediately', () => {
    const { driver, timeouts } = makeDriver(1_000_000);
    driver.startSweep();
    expect(driver.getSweepState().active).toBe(true);
    driver.cancelSweep();
    expect(driver.getSweepState().active).toBe(false);
    void timeouts;
  });

  it('onStartSweep: startSweep fires first purchase synchronously (engagement decreases)', () => {
    const { driver, timeouts } = makeDriver(1_000_000);
    const before = driver.getState().player.engagement;
    driver.startSweep();
    expect(driver.getState().player.engagement).toBeLessThan(before);
    timeouts.flush();
  });

  it('onSweepEnd fires after natural sweep completion', () => {
    const buyCost = generatorBuyCost('chirps', 0, STATIC_DATA);
    const { driver } = makeDriver(buyCost);
    const ends: number[] = [];
    driver.onSweepEnd(() => ends.push(1));
    driver.startSweep();
    expect(ends).toHaveLength(1);
  });

  it('onSweepEnd fires after cancelSweep', () => {
    const { driver, timeouts } = makeDriver(1_000_000);
    const ends: number[] = [];
    driver.onSweepEnd(() => ends.push(1));
    driver.startSweep();
    driver.cancelSweep();
    expect(ends).toHaveLength(1);
    void timeouts;
  });

  it('onSweepEnd listener is removable (unsubscribe cleans up)', () => {
    const buyCost = generatorBuyCost('chirps', 0, STATIC_DATA);
    const { driver } = makeDriver(buyCost);
    const ends: number[] = [];
    const unsub = driver.onSweepEnd(() => ends.push(1));
    unsub();
    driver.startSweep();
    expect(ends).toHaveLength(0);
  });

  it('previewCount updates to 0 after sweep exhausts funds', () => {
    const buyCost = generatorBuyCost('chirps', 0, STATIC_DATA);
    const { driver } = makeDriver(buyCost);
    driver.startSweep();
    // After sweep ends, nothing more is affordable
    expect(driver.getSweepState().previewCount).toBe(0);
  });
});
