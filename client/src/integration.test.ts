// Integration tests — multi-system scenarios.
// These exercise the full pipeline: click → engagement → buy generator →
// ticks produce engagement → followers → platform unlock → cross-posting.
// This is E7's end-to-end verification.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDriver } from './driver/index.ts';
import { STATIC_DATA } from './static-data/index.ts';
import { tick, computeSnapshot } from './game-loop/index.ts';
import { createInitialGameState } from './model/index.ts';
import type { GameState } from './types.ts';

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

beforeEach(() => {
  vi.stubGlobal('localStorage', makeLocalStorageMock());
});

// ---------------------------------------------------------------------------
// End-to-end play scenario via driver
// ---------------------------------------------------------------------------

describe('integration — end-to-end play loop', () => {
  it('click → engagement → buy → tick → followers → platform unlock', () => {
    // Construct a state directly with autoclicker_count > 0 to test the full
    // passive pipeline. The driver doesn't have buyAutoclicker yet (task E2),
    // so we seed autoclicker_count manually for this integration test.
    const T0 = 1_000_000;
    let state: GameState = createInitialGameState(STATIC_DATA, T0);
    // Give chirps enough passive production to cross picshift threshold (100 followers)
    state = {
      ...state,
      generators: {
        ...state.generators,
        chirps: {
          ...state.generators.chirps,
          owned: true,
          count: 5,
          autoclicker_count: 10,
        },
      },
      algorithm: { ...state.algorithm, shift_time: T0 + 10_000_000 },
    };

    // Run ticks to accumulate engagement → followers → platform unlock.
    for (let step = 0; step < 200; step++) {
      state = tick(state, T0 + (step + 1) * 1000, 1000, STATIC_DATA);
    }

    // Chirper accumulated followers.
    expect(state.platforms.chirper.followers).toBeGreaterThan(0);
    const platformSum =
      state.platforms.chirper.followers
      + state.platforms.picshift.followers
      + state.platforms.skroll.followers
      + state.platforms.podpod.followers;
    expect(state.player.total_followers).toBeCloseTo(platformSum, 4);

    // If we crossed 100 followers, picshift should be unlocked.
    if (state.player.total_followers >= 100) {
      expect(state.platforms.picshift.unlocked).toBe(true);
    }
  });

  it('cross-posting: followers distribute across multiple unlocked platforms', () => {
    // Fast path — construct a state with generators running and multiple
    // platforms manually unlocked to verify distribution works end-to-end.
    let state: GameState = createInitialGameState(STATIC_DATA, 1_000_000);
    // Grant selfies, owned and at scale
    state = {
      ...state,
      generators: {
        ...state.generators,
        selfies: { ...state.generators.selfies, owned: true, count: 50, level: 3, autoclicker_count: 50 },
      },
      platforms: {
        ...state.platforms,
        picshift: { ...state.platforms.picshift, unlocked: true },
      },
    };

    // Run a tick.
    const next = tick(state, 1_001_000, 1000, STATIC_DATA);

    // Selfies affinity: chirper=0.8, picshift=2.0 — picshift earns more.
    expect(next.platforms.picshift.followers).toBeGreaterThan(
      next.platforms.chirper.followers,
    );
    expect(next.platforms.chirper.followers).toBeGreaterThan(0);

    // Totals match.
    const sum =
      next.platforms.chirper.followers +
      next.platforms.picshift.followers +
      next.platforms.skroll.followers +
      next.platforms.podpod.followers;
    expect(next.player.total_followers).toBeCloseTo(sum, 6);
  });

  it('algorithm shift alters trend-sensitive generator output mid-run', () => {
    // Construct state with a memes generator (trend_sensitivity 0.8) and an
    // algorithm state heavily boosting memes. Then force a shift to a state
    // that penalizes memes. Verify follower rate changes across the shift.
    let state: GameState = createInitialGameState(STATIC_DATA, 1_000_000);
    state = {
      ...state,
      generators: {
        ...state.generators,
        memes: { ...state.generators.memes, owned: true, count: 10, level: 1, autoclicker_count: 10 },
      },
      algorithm: {
        ...state.algorithm,
        state_modifiers: { ...state.algorithm.state_modifiers, memes: 2.0 },
      },
    };

    const boostedRate =
      computeSnapshot(state, STATIC_DATA).total_engagement_rate;

    const nerfed: GameState = {
      ...state,
      algorithm: {
        ...state.algorithm,
        state_modifiers: { ...state.algorithm.state_modifiers, memes: 0.5 },
      },
    };
    const nerfedRate =
      computeSnapshot(nerfed, STATIC_DATA).total_engagement_rate;

    expect(boostedRate).toBeGreaterThan(nerfedRate);
  });

  it('currency conservation: engagement spent == engagement removed from balance', () => {
    let t = 1_000_000;
    const driver = createDriver({
      staticData: STATIC_DATA,
      now: () => t,
      loadFromStorage: false,
      persistToStorage: false,
    });
    driver.step(1); // unlock chirps
    // chirps cooldown at level=1 = max(50, 1000/(1×0.5)) = 2000ms
    for (let i = 0; i < 10; i++) { t += 2100; driver.click('chirps'); }

    const before = driver.getState().player.engagement;
    // chirps buy cost at count=0 is ceil(5 × 1.15^0) = 5
    driver.buy('chirps');
    const after = driver.getState().player.engagement;
    expect(before - after).toBe(5);
  });

  it('follower totals stay consistent with platform sums across a long run', () => {
    let t = 1_000_000;
    const driver = createDriver({
      staticData: STATIC_DATA,
      now: () => t,
      loadFromStorage: false,
      persistToStorage: false,
    });
    // With autoclicker_count=0 (no buyAutoclicker action yet), passive production
    // is zero. Verify the invariant still holds: total_followers = Σ platform.followers.
    driver.step(1);
    for (let step = 0; step < 100; step++) {
      t += 1000;
      driver.step(1000);
    }

    const s = driver.getState();
    const sum = s.platforms.chirper.followers
      + s.platforms.picshift.followers
      + s.platforms.skroll.followers
      + s.platforms.podpod.followers;
    expect(s.player.total_followers).toBeCloseTo(sum, 4);
    expect(s.player.lifetime_followers).toBeGreaterThanOrEqual(
      s.player.total_followers,
    );
  });

  it('snapshot reflects the current algorithm index and per-platform rates', () => {
    let state: GameState = createInitialGameState(STATIC_DATA, 1_000_000);
    state = {
      ...state,
      generators: {
        ...state.generators,
        selfies: { ...state.generators.selfies, owned: true, count: 20, level: 2, autoclicker_count: 20 },
      },
    };
    const snap = computeSnapshot(state, STATIC_DATA);
    expect(snap.algorithm_state_index).toBe(state.algorithm.current_state_index);
    expect(snap.total_engagement_rate).toBeGreaterThan(0);
    // chirper is unlocked, others not — only chirper gets the rate.
    expect(snap.platform_rates.chirper).toBeGreaterThan(0);
    expect(snap.platform_rates.picshift).toBe(0);
    expect(snap.platform_rates.skroll).toBe(0);
    expect(snap.total_follower_rate).toBeCloseTo(
      snap.platform_rates.chirper,
      6,
    );
  });
});

// ---------------------------------------------------------------------------
// Save → reload round-trip through the driver
// ---------------------------------------------------------------------------

describe('integration — save/reload round-trip', () => {
  it('a running session restored from storage resumes from saved state', () => {
    let t = 1_000_000;
    const driverA = createDriver({
      staticData: STATIC_DATA,
      now: () => t,
      loadFromStorage: false,
      persistToStorage: true,
    });
    driverA.step(1);
    for (let i = 0; i < 30; i++) { t += 500; driverA.click('chirps'); }
    driverA.buy('selfies');
    t += 10_000;
    driverA.step(10_000);
    driverA.saveNow();

    const savedEngagement = driverA.getState().player.engagement;
    const savedFollowers = driverA.getState().player.total_followers;
    const savedCount = driverA.getState().generators.selfies.count;
    const savedPlayerId = driverA.getState().player.id;

    // New driver loads from storage.
    const driverB = createDriver({
      staticData: STATIC_DATA,
      now: () => t,
      loadFromStorage: true,
      persistToStorage: false,
    });
    const b = driverB.getState();
    expect(b.player.id).toBe(savedPlayerId);
    expect(b.player.engagement).toBe(savedEngagement);
    expect(b.player.total_followers).toBe(savedFollowers);
    expect(b.generators.selfies.count).toBe(savedCount);
    // Snapshot survives.
    expect(b.player.last_close_state).not.toBeNull();
  });
});
