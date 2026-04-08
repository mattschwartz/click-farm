// Offline calculator tests.
// Verifies single-pass gain accumulation for the offline window.

import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import '../test/decimal-matchers.ts';
import { calculateOffline } from './index.ts';
import { createInitialGameState } from '../model/index.ts';
import { STATIC_DATA } from '../static-data/index.ts';
import type { GameState } from '../types.ts';

const T0 = 1_000_000;

// ---------------------------------------------------------------------------
// Test fixture — a state with selfies owned and scaled so rates are nonzero.
// ---------------------------------------------------------------------------

function makeState(overrides?: {
  selfiesCount?: number;
  selfiesLevel?: number;
  picshiftUnlocked?: boolean;
  skrollUnlocked?: boolean;
  memesCount?: number;
}): GameState {
  const s: GameState = createInitialGameState(STATIC_DATA, T0);
  const selfiesCount = overrides?.selfiesCount ?? 10;
  const memesCount = overrides?.memesCount;
  return {
    ...s,
    generators: {
      ...s.generators,
      selfies: {
        ...s.generators.selfies,
        owned: true,
        count: selfiesCount,
        level: overrides?.selfiesLevel ?? 1,
        autoclicker_count: selfiesCount,
      },
      memes: memesCount
        ? { ...s.generators.memes, owned: true, count: memesCount, level: 1, autoclicker_count: memesCount }
        : s.generators.memes,
    },
    platforms: {
      ...s.platforms,
      picshift: {
        ...s.platforms.picshift,
        unlocked: overrides?.picshiftUnlocked ?? false,
      },
      skroll: {
        ...s.platforms.skroll,
        unlocked: overrides?.skrollUnlocked ?? false,
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
    expect(result.engagementGained).toEqualDecimal(0);
    expect(result.totalFollowersGained).toEqualDecimal(0);
    expect(result.durationMs).toBe(0);
    expect(newState).toBe(state);
  });

  it('returns empty result for negative elapsed (clock skew)', () => {
    const state = makeState();
    const { result, newState } = calculateOffline(state, T0, T0 - 1000, STATIC_DATA);
    expect(result.engagementGained).toEqualDecimal(0);
    expect(newState).toBe(state);
  });

  it('produces zero gains when no generators are producing', () => {
    const s0 = createInitialGameState(STATIC_DATA, T0);
    const { result, newState } = calculateOffline(
      s0,
      T0,
      T0 + 60_000,
      STATIC_DATA,
    );
    expect(result.engagementGained).toEqualDecimal(0);
    expect(result.totalFollowersGained).toEqualDecimal(0);
    expect(newState.player.engagement).toEqualDecimal(s0.player.engagement);
    expect(result.durationMs).toBe(60_000);
  });
});

// ---------------------------------------------------------------------------
// Single-pass accumulation
// ---------------------------------------------------------------------------

describe('calculateOffline — single-pass accumulation', () => {
  it('accumulates engagement at the constant rate for the full window', () => {
    const state = makeState({ selfiesCount: 10, selfiesLevel: 1 });
    const elapsedMs = 60_000;
    const { result } = calculateOffline(
      state,
      T0,
      T0 + elapsedMs,
      STATIC_DATA,
    );

    expect(result.engagementGained.gt(0)).toBe(true);
    expect(result.engagementGained.isFinite()).toBe(true);
  });

  it('scales linearly with duration', () => {
    const state = makeState({ selfiesCount: 10 });
    const half = calculateOffline(state, T0, T0 + 30_000, STATIC_DATA).result;
    const full = calculateOffline(state, T0, T0 + 60_000, STATIC_DATA).result;
    expect(full.engagementGained.toNumber()).toBeCloseTo(half.engagementGained.times(2).toNumber(), 6);
    expect(full.totalFollowersGained.toNumber()).toBeCloseTo(half.totalFollowersGained.times(2).toNumber(), 6);
  });

  it('distributes followers to unlocked platforms only', () => {
    const state = makeState({ selfiesCount: 10, picshiftUnlocked: true });
    const { result } = calculateOffline(
      state,
      T0,
      T0 + 60_000,
      STATIC_DATA,
    );
    expect(result.followersGained.chirper.gt(0)).toBe(true);
    expect(result.followersGained.picshift.gt(0)).toBe(true);
    expect(result.followersGained.skroll).toEqualDecimal(0);
    expect(result.followersGained.picshift.gt(result.followersGained.chirper)).toBe(true);
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
    expect(newState.player.engagement.toNumber()).toBeCloseTo(
      state.player.engagement.plus(result.engagementGained).toNumber(),
      6,
    );
  });

  it('applies follower gains to per-platform followers', () => {
    const state = makeState({ selfiesCount: 10, picshiftUnlocked: true });
    const { result, newState } = calculateOffline(
      state,
      T0,
      T0 + 60_000,
      STATIC_DATA,
    );
    expect(newState.platforms.chirper.followers.toNumber()).toBeCloseTo(
      state.platforms.chirper.followers.plus(result.followersGained.chirper).toNumber(),
      6,
    );
    expect(newState.platforms.picshift.followers.toNumber()).toBeCloseTo(
      state.platforms.picshift.followers.plus(result.followersGained.picshift).toNumber(),
      6,
    );
  });

  it('total_followers is kept in sync with platform sums', () => {
    const state = makeState({ selfiesCount: 10, picshiftUnlocked: true });
    const { newState } = calculateOffline(
      state,
      T0,
      T0 + 60_000,
      STATIC_DATA,
    );
    const sum = newState.platforms.chirper.followers
      .plus(newState.platforms.picshift.followers)
      .plus(newState.platforms.skroll.followers)
      .plus(newState.platforms.podpod.followers);
    expect(newState.player.total_followers.toNumber()).toBeCloseTo(sum.toNumber(), 6);
  });

  it('lifetime_followers increases by total follower gain', () => {
    const state = makeState({ selfiesCount: 10 });
    const { result, newState } = calculateOffline(
      state,
      T0,
      T0 + 60_000,
      STATIC_DATA,
    );
    expect(newState.player.lifetime_followers.toNumber()).toBeCloseTo(
      state.player.lifetime_followers.plus(result.totalFollowersGained).toNumber(),
      6,
    );
  });

  it('updates last_close_time to openTime so reopen does not double-apply', () => {
    const state = makeState({ selfiesCount: 10 });
    const openTime = T0 + 60_000;
    const { newState } = calculateOffline(state, T0, openTime, STATIC_DATA);
    expect(newState.player.last_close_time).toBe(openTime);
  });

  it('refreshes last_close_state snapshot', () => {
    const state = makeState({ selfiesCount: 10 });
    const { newState } = calculateOffline(
      state,
      T0,
      T0 + 30 * 60_000,
      STATIC_DATA,
    );
    expect(newState.player.last_close_state).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Unlocks during offline
// ---------------------------------------------------------------------------

describe('calculateOffline — unlocks', () => {
  it('unlocks picshift platform if total_followers crosses 100 during offline', () => {
    const state = makeState({ selfiesCount: 100, selfiesLevel: 3 });
    expect(state.platforms.picshift.unlocked).toBe(false);
    const { newState } = calculateOffline(
      state,
      T0,
      T0 + 60 * 60_000,
      STATIC_DATA,
    );
    expect(newState.player.total_followers.toNumber()).toBeGreaterThan(100);
    expect(newState.platforms.picshift.unlocked).toBe(true);
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
    if (newState.player.total_followers.toNumber() >= 50) {
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
    expect(result.engagementGained.isFinite()).toBe(true);
    expect(result.totalFollowersGained.isFinite()).toBe(true);
  });

  it('is deterministic — same inputs produce identical result', () => {
    const mk = (): GameState =>
      makeState({ selfiesCount: 10, memesCount: 5 });
    const a = calculateOffline(mk(), T0, T0 + 60 * 60_000, STATIC_DATA);
    const b = calculateOffline(mk(), T0, T0 + 60 * 60_000, STATIC_DATA);
    expect(a.result.engagementGained.eq(b.result.engagementGained)).toBe(true);
    expect(a.result.totalFollowersGained.eq(b.result.totalFollowersGained)).toBe(true);
  });

  it('allows engagement beyond MAX_SAFE_INTEGER — no ceiling', () => {
    const state: GameState = {
      ...makeState({ selfiesCount: 1_000_000, selfiesLevel: 10 }),
      player: {
        ...makeState().player,
        engagement: new Decimal(Number.MAX_SAFE_INTEGER).minus(1),
      },
    };
    const { newState } = calculateOffline(
      state,
      T0,
      T0 + 60 * 60 * 1000,
      STATIC_DATA,
    );
    // No clamp — Decimal allows values beyond MAX_SAFE_INTEGER
    expect(newState.player.engagement.gt(Number.MAX_SAFE_INTEGER)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Audience Mood — retention applied as a constant scalar offline (AC #12)
//
// Retention does NOT advance offline (neglect is frozen). The calculator
// multiplies per-platform follower accrual by the platform's retention
// value captured at closeTime, as a constant scalar over the entire window.
// ---------------------------------------------------------------------------

describe('calculateOffline — Audience Mood retention', () => {
  it('halving retention halves per-platform follower gain over the offline window', () => {
    const base = makeState({ selfiesCount: 10, selfiesLevel: 2 });
    const sFull: GameState = {
      ...base,
      platforms: {
        ...base.platforms,
        chirper: { ...base.platforms.chirper, retention: 1.0 },
      },
    };
    const sHalf: GameState = {
      ...base,
      platforms: {
        ...base.platforms,
        chirper: { ...base.platforms.chirper, retention: 0.5 },
      },
    };
    const { result: rFull } = calculateOffline(
      sFull, T0, T0 + 10 * 60 * 1000, STATIC_DATA,
    );
    const { result: rHalf } = calculateOffline(
      sHalf, T0, T0 + 10 * 60 * 1000, STATIC_DATA,
    );
    expect(rFull.followersGained.chirper.gt(0)).toBe(true);
    expect(rHalf.followersGained.chirper.toNumber()).toBeCloseTo(
      rFull.followersGained.chirper.times(0.5).toNumber(),
      6,
    );
  });

  it('retention does not advance offline (no neglect accumulation)', () => {
    const base = makeState({ selfiesCount: 10, selfiesLevel: 2 });
    const state: GameState = {
      ...base,
      platforms: {
        ...base.platforms,
        chirper: {
          ...base.platforms.chirper,
          retention: 0.7,
          neglect: 0.3,
        },
      },
    };
    const { newState } = calculateOffline(
      state, T0, T0 + 60 * 60 * 1000, STATIC_DATA,
    );
    expect(newState.platforms.chirper.retention).toBe(0.7);
    expect(newState.platforms.chirper.neglect).toBe(0.3);
  });
});
