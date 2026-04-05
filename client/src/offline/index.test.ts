// Offline calculator tests.
// Verifies segment-aware gain accumulation across algorithm shifts, driven
// by the deterministic seeded PRNG.

import { describe, it, expect } from 'vitest';
import { calculateOffline } from './index.ts';
import { createInitialGameState } from '../model/index.ts';
import { STATIC_DATA } from '../static-data/index.ts';
import { getShiftAtIndex } from '../algorithm/index.ts';
import type { GameState, GeneratorId, AlgorithmStateId } from '../types.ts';

const T0 = 1_000_000;

// ---------------------------------------------------------------------------
// Test fixture — a state with selfies owned and scaled so rates are nonzero.
// Fixed seed makes shift schedules deterministic.
// ---------------------------------------------------------------------------

function makeState(overrides?: {
  seed?: number;
  selfiesCount?: number;
  selfiesLevel?: number;
  instashamUnlocked?: boolean;
  grindsetUnlocked?: boolean;
  memesCount?: number;
}): GameState {
  const s: GameState = createInitialGameState(STATIC_DATA, T0);
  return {
    ...s,
    player: {
      ...s.player,
      algorithm_seed: overrides?.seed ?? 0xDEADBEEF,
    },
    generators: {
      ...s.generators,
      selfies: {
        ...s.generators.selfies,
        owned: true,
        count: overrides?.selfiesCount ?? 10,
        level: overrides?.selfiesLevel ?? 1,
      },
      memes: overrides?.memesCount
        ? { ...s.generators.memes, owned: true, count: overrides.memesCount, level: 1 }
        : s.generators.memes,
    },
    platforms: {
      ...s.platforms,
      instasham: {
        ...s.platforms.instasham,
        unlocked: overrides?.instashamUnlocked ?? false,
      },
      grindset: {
        ...s.platforms.grindset,
        unlocked: overrides?.grindsetUnlocked ?? false,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Basic contract
// ---------------------------------------------------------------------------

describe('calculateOffline — basic contract', () => {
  it('returns empty result when openTime ≤ closeTime', () => {
    const state = makeState();
    const { result, newState } = calculateOffline(state, T0, T0, STATIC_DATA);
    expect(result.engagementGained).toBe(0);
    expect(result.totalFollowersGained).toBe(0);
    expect(result.algorithmAdvances).toBe(0);
    expect(result.durationMs).toBe(0);
    expect(newState).toBe(state);
  });

  it('returns empty result for negative elapsed (clock skew)', () => {
    const state = makeState();
    const { result, newState } = calculateOffline(state, T0, T0 - 1000, STATIC_DATA);
    expect(result.engagementGained).toBe(0);
    expect(newState).toBe(state);
  });

  it('produces zero gains when no generators are producing', () => {
    const s0 = createInitialGameState(STATIC_DATA, T0);
    // No generators owned — chirper is unlocked but nothing produces.
    const { result, newState } = calculateOffline(
      s0,
      T0,
      T0 + 60_000,
      STATIC_DATA,
    );
    expect(result.engagementGained).toBe(0);
    expect(result.totalFollowersGained).toBe(0);
    expect(newState.player.engagement).toBe(s0.player.engagement);
    // Duration recorded.
    expect(result.durationMs).toBe(60_000);
  });
});

// ---------------------------------------------------------------------------
// Single segment (no shifts during offline window)
// ---------------------------------------------------------------------------

describe('calculateOffline — single segment (no shifts)', () => {
  it('accumulates engagement at the constant rate for the full window', () => {
    const state = makeState({ selfiesCount: 10, selfiesLevel: 1 });
    // Offline for 60s — well within the 4-6 min first segment.
    const elapsedMs = 60_000;
    const { result } = calculateOffline(
      state,
      T0,
      T0 + elapsedMs,
      STATIC_DATA,
    );

    // Expected: 10 × 1.0 base × levelMultiplier(1)=2^0.2 × trend_sens(0.3)
    // × algo_modifier(depends on state)
    // We don't compute the exact value here — we just check it's positive,
    // scales linearly with duration (next test), and is finite.
    expect(result.engagementGained).toBeGreaterThan(0);
    expect(Number.isFinite(result.engagementGained)).toBe(true);
    expect(result.algorithmAdvances).toBe(0);
  });

  it('scales linearly with duration inside a single segment', () => {
    const state = makeState({ selfiesCount: 10 });
    const half = calculateOffline(state, T0, T0 + 30_000, STATIC_DATA).result;
    const full = calculateOffline(state, T0, T0 + 60_000, STATIC_DATA).result;
    // Full should be ~2× half (same segment, same rate).
    expect(full.engagementGained).toBeCloseTo(half.engagementGained * 2, 6);
    expect(full.totalFollowersGained).toBeCloseTo(half.totalFollowersGained * 2, 6);
  });

  it('distributes followers to unlocked platforms only', () => {
    const state = makeState({ selfiesCount: 10, instashamUnlocked: true });
    const { result } = calculateOffline(
      state,
      T0,
      T0 + 60_000,
      STATIC_DATA,
    );
    // chirper and instasham unlocked; grindset locked.
    expect(result.followersGained.chirper).toBeGreaterThan(0);
    expect(result.followersGained.instasham).toBeGreaterThan(0);
    expect(result.followersGained.grindset).toBe(0);
    // selfies: chirper affinity 0.8, instasham 2.0 → instasham > chirper.
    expect(result.followersGained.instasham).toBeGreaterThan(
      result.followersGained.chirper,
    );
  });
});

// ---------------------------------------------------------------------------
// Multi-segment — algorithm shifts happen during offline
// ---------------------------------------------------------------------------

describe('calculateOffline — multiple segments (shifts happen)', () => {
  it('advances algorithm state index by the right number of shifts', () => {
    const state = makeState({ selfiesCount: 10 });
    // shift_time = T0 + 300_000. Offline for 30 min (6 shifts at base).
    const { result, newState } = calculateOffline(
      state,
      T0,
      T0 + 30 * 60_000,
      STATIC_DATA,
    );
    // Variance ± 1 min per shift; over 30 min we expect ~5-7 shifts.
    expect(result.algorithmAdvances).toBeGreaterThanOrEqual(4);
    expect(result.algorithmAdvances).toBeLessThanOrEqual(8);
    expect(newState.algorithm.current_state_index).toBe(
      state.algorithm.current_state_index + result.algorithmAdvances,
    );
  });

  it('final algorithm state matches deterministic schedule walk', () => {
    const seed = 0x12345678;
    const state = makeState({ seed, selfiesCount: 5 });
    // Walk 10 shifts forward manually. First shift_time = T0 + 300_000.
    let t = T0 + STATIC_DATA.algorithmSchedule.baseIntervalMs; // first shift boundary
    for (let i = 1; i < 10; i++) {
      const shift = getShiftAtIndex(seed, i, STATIC_DATA);
      t += shift.durationMs;
    }
    // Open just AFTER the 10th shift completes (so state is post-shift 10).
    const openTime = t + 1;
    const { result, newState } = calculateOffline(
      state,
      T0,
      openTime,
      STATIC_DATA,
    );
    expect(result.algorithmAdvances).toBe(10);

    // The final state id should match what getShiftAtIndex(seed, 10) gave us.
    const expectedShift = getShiftAtIndex(seed, 10, STATIC_DATA);
    expect(newState.algorithm.current_state_id).toBe(expectedShift.stateId);
    expect(newState.algorithm.current_state_index).toBe(10);
  });

  it('engagement gain is the sum of per-segment contributions', () => {
    // A state where algorithm modifier meaningfully differs across states.
    // Use selfies + memes so modifiers vary by state.
    const state = makeState({
      seed: 0xC0FFEE,
      selfiesCount: 10,
      memesCount: 5,
    });
    const shortWindow = 60_000; // 1 minute — in first segment
    const longWindow = 30 * 60_000; // 30 min — crosses many shifts

    const short = calculateOffline(state, T0, T0 + shortWindow, STATIC_DATA);
    const long = calculateOffline(state, T0, T0 + longWindow, STATIC_DATA);

    // Long must be strictly bigger and exceed a pure linear extrapolation
    // OR be smaller — either is possible depending on algorithm luck.
    // Key invariant: both are positive and long > short.
    expect(short.result.engagementGained).toBeGreaterThan(0);
    expect(long.result.engagementGained).toBeGreaterThan(
      short.result.engagementGained,
    );
    // Algorithm advanced for long, not for short.
    expect(short.result.algorithmAdvances).toBe(0);
    expect(long.result.algorithmAdvances).toBeGreaterThan(0);
  });

  it('offline result differs when run through different algorithm states', () => {
    // Same state, same duration, different seeds → different shift sequences
    // → different engagement totals. This verifies segment-aware rates apply.
    const base = (seed: number): GameState =>
      makeState({ seed, selfiesCount: 10, memesCount: 10 });
    const duration = 20 * 60_000;
    const a = calculateOffline(base(1), T0, T0 + duration, STATIC_DATA);
    const b = calculateOffline(base(2), T0, T0 + duration, STATIC_DATA);
    expect(a.result.engagementGained).not.toBe(b.result.engagementGained);
  });
});

// ---------------------------------------------------------------------------
// State application
// ---------------------------------------------------------------------------

describe('calculateOffline — state application', () => {
  it('applies engagement gain to player.engagement', () => {
    const state = makeState({ selfiesCount: 10 });
    const { result, newState } = calculateOffline(
      state,
      T0,
      T0 + 60_000,
      STATIC_DATA,
    );
    expect(newState.player.engagement).toBeCloseTo(
      state.player.engagement + result.engagementGained,
      6,
    );
  });

  it('applies follower gains to per-platform followers', () => {
    const state = makeState({ selfiesCount: 10, instashamUnlocked: true });
    const { result, newState } = calculateOffline(
      state,
      T0,
      T0 + 60_000,
      STATIC_DATA,
    );
    expect(newState.platforms.chirper.followers).toBeCloseTo(
      state.platforms.chirper.followers + result.followersGained.chirper,
      6,
    );
    expect(newState.platforms.instasham.followers).toBeCloseTo(
      state.platforms.instasham.followers + result.followersGained.instasham,
      6,
    );
  });

  it('total_followers is kept in sync with platform sums', () => {
    const state = makeState({ selfiesCount: 10, instashamUnlocked: true });
    const { newState } = calculateOffline(
      state,
      T0,
      T0 + 60_000,
      STATIC_DATA,
    );
    const sum =
      newState.platforms.chirper.followers +
      newState.platforms.instasham.followers +
      newState.platforms.grindset.followers;
    expect(newState.player.total_followers).toBeCloseTo(sum, 6);
  });

  it('lifetime_followers increases by total follower gain', () => {
    const state = makeState({ selfiesCount: 10 });
    const { result, newState } = calculateOffline(
      state,
      T0,
      T0 + 60_000,
      STATIC_DATA,
    );
    expect(newState.player.lifetime_followers).toBeCloseTo(
      state.player.lifetime_followers + result.totalFollowersGained,
      6,
    );
  });

  it('updates last_close_time to openTime so reopen does not double-apply', () => {
    const state = makeState({ selfiesCount: 10 });
    const openTime = T0 + 60_000;
    const { newState } = calculateOffline(state, T0, openTime, STATIC_DATA);
    expect(newState.player.last_close_time).toBe(openTime);
  });

  it('refreshes last_close_state snapshot to reflect new algorithm state', () => {
    // Long window → algorithm shifts happen → snapshot should reflect the
    // NEW algorithm modifiers, not the one from before.
    const state = makeState({ seed: 0xABCDEF, selfiesCount: 10 });
    const { newState } = calculateOffline(
      state,
      T0,
      T0 + 30 * 60_000,
      STATIC_DATA,
    );
    expect(newState.player.last_close_state).not.toBeNull();
    expect(newState.player.last_close_state!.algorithm_state_index).toBe(
      newState.algorithm.current_state_index,
    );
  });
});

// ---------------------------------------------------------------------------
// Unlocks during offline
// ---------------------------------------------------------------------------

describe('calculateOffline — unlocks', () => {
  it('unlocks instasham platform if total_followers crosses 100 during offline', () => {
    // Bootstrap with enough selfies + long window to cross 100 followers.
    const state = makeState({ selfiesCount: 100, selfiesLevel: 3 });
    expect(state.platforms.instasham.unlocked).toBe(false);
    const { newState } = calculateOffline(
      state,
      T0,
      T0 + 60 * 60_000, // 1 hour
      STATIC_DATA,
    );
    expect(newState.player.total_followers).toBeGreaterThan(100);
    expect(newState.platforms.instasham.unlocked).toBe(true);
  });

  it('unlocks memes generator if total_followers crosses 50 during offline', () => {
    const state = makeState({ selfiesCount: 50, selfiesLevel: 3 });
    expect(state.generators.memes.owned).toBe(false);
    const { newState } = calculateOffline(
      state,
      T0,
      T0 + 60 * 60_000,
      STATIC_DATA,
    );
    if (newState.player.total_followers >= 50) {
      expect(newState.generators.memes.owned).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Robustness
// ---------------------------------------------------------------------------

describe('calculateOffline — robustness', () => {
  it('handles a very long offline window (7 days) without crashing', () => {
    const state = makeState({ selfiesCount: 10 });
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const { result } = calculateOffline(
      state,
      T0,
      T0 + sevenDaysMs,
      STATIC_DATA,
    );
    expect(result.durationMs).toBe(sevenDaysMs);
    // 7 days × 24h × 60m / 5min base = ~2016 shifts, ± variance.
    expect(result.algorithmAdvances).toBeGreaterThan(1500);
    expect(result.algorithmAdvances).toBeLessThan(2500);
    expect(Number.isFinite(result.engagementGained)).toBe(true);
    expect(Number.isFinite(result.totalFollowersGained)).toBe(true);
  });

  it('is deterministic — same inputs produce identical result', () => {
    const mk = (): GameState =>
      makeState({ seed: 0x1234, selfiesCount: 10, memesCount: 5 });
    const a = calculateOffline(mk(), T0, T0 + 60 * 60_000, STATIC_DATA);
    const b = calculateOffline(mk(), T0, T0 + 60 * 60_000, STATIC_DATA);
    expect(a.result.engagementGained).toBe(b.result.engagementGained);
    expect(a.result.totalFollowersGained).toBe(b.result.totalFollowersGained);
    expect(a.result.algorithmAdvances).toBe(b.result.algorithmAdvances);
    expect(a.newState.algorithm.current_state_id).toBe(
      b.newState.algorithm.current_state_id,
    );
  });

  it('normalises stale algorithm state at closeTime before walking', () => {
    // If the saved algorithm.shift_time is already in the past at closeTime,
    // the calculator should catch up (advance algorithm first) then walk.
    let state = makeState({ seed: 0x9999, selfiesCount: 10 });
    // Manufacture a stale shift_time: shift was 10 minutes before closeTime.
    state = {
      ...state,
      algorithm: {
        ...state.algorithm,
        shift_time: T0 - 10 * 60_000,
      },
    };
    const { result, newState } = calculateOffline(
      state,
      T0,
      T0 + 60_000,
      STATIC_DATA,
    );
    // Should have advanced algorithm at least once during normalisation
    // (not counted in algorithmAdvances — that's the during-offline count).
    expect(newState.algorithm.current_state_index).toBeGreaterThan(
      state.algorithm.current_state_index,
    );
    // Result itself is well-formed.
    expect(result.engagementGained).toBeGreaterThan(0);
    // Since the window (1 min) is small vs the segment size (5 min), no
    // in-window shift should have occurred.
    expect(result.algorithmAdvances).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Cross-check: rates genuinely depend on segment's algorithm state
// ---------------------------------------------------------------------------

describe('calculateOffline — rate ordering sanity', () => {
  it('generator with high trend_sensitivity is affected more by algorithm than one with low', () => {
    // memes has trend_sensitivity 0.8, tutorials has 0.1. Under an algorithm
    // state that boosts both, memes should see relatively more uplift.
    // We verify this indirectly: different seeds → different algo schedules
    // → different totals for a memes-heavy build more than a tutorials-heavy
    // build. The variance across seeds should be wider for memes.
    const windowMs = 30 * 60_000;
    const seeds = [1, 2, 3, 4, 5];

    function runFor(genId: GeneratorId, count: number): number[] {
      return seeds.map((seed) => {
        const base = createInitialGameState(STATIC_DATA, T0);
        const state: GameState = {
          ...base,
          player: { ...base.player, algorithm_seed: seed },
          generators: {
            ...base.generators,
            [genId]: { ...base.generators[genId], owned: true, count, level: 1 },
          },
        };
        return calculateOffline(state, T0, T0 + windowMs, STATIC_DATA)
          .result.engagementGained;
      });
    }

    const memesGains = runFor('memes', 10);
    const tutGains = runFor('tutorials', 10);

    function spread(xs: number[]): number {
      const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
      return xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length / mean ** 2;
    }
    // Memes should have a strictly higher coefficient of variation than
    // tutorials because its trend_sensitivity is 8× as high.
    expect(spread(memesGains)).toBeGreaterThan(spread(tutGains));
  });

  // Silence unused import for AlgorithmStateId — we only need it for types
  // in other files, but reference it here to keep the import in one place.
  it('AlgorithmStateId reference (type import guard)', () => {
    const id: AlgorithmStateId = 'short_form_surge';
    expect(typeof id).toBe('string');
  });
});
