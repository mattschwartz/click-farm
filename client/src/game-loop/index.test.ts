import { describe, it, expect } from 'vitest';
import {
  tick,
  postClick,
  levelMultiplier,
  cloutBonus,
  effectiveAlgorithmModifier,
  computeGeneratorEffectiveRate,
  computeAllGeneratorEffectiveRates,
  computeSnapshot,
  CLICK_BASE_ENGAGEMENT,
} from './index.ts';
import { STATIC_DATA } from '../static-data/index.ts';
import {
  createInitialGameState,
  createGeneratorState,
} from '../model/index.ts';
import type { GameState, GeneratorId, PlatformId } from '../types.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const T0 = 1_700_000_000_000;

/**
 * Build a deterministic game state with a known algorithm state and the given
 * generator owned + configured. `algorithm.shift_time` is far in the future to
 * keep tests insensitive to algorithm shift advancement.
 */
function stateWithGenerator(
  id: GeneratorId,
  count: number,
  level: number = 1,
): GameState {
  const base = createInitialGameState(STATIC_DATA, T0);
  return {
    ...base,
    generators: {
      ...base.generators,
      [id]: { ...createGeneratorState(id), owned: true, count, level },
    },
    algorithm: { ...base.algorithm, shift_time: T0 + 10_000_000 },
    player: { ...base.player, algorithm_seed: 0xDEADBEEF },
  };
}

/** Sum all platform follower counts. */
function totalPlatformFollowers(platforms: GameState['platforms']): number {
  return (Object.keys(platforms) as PlatformId[])
    .reduce((sum, id) => sum + platforms[id].followers, 0);
}

// ---------------------------------------------------------------------------
// levelMultiplier
// ---------------------------------------------------------------------------

describe('levelMultiplier', () => {
  it('matches 2^(level² / 5) at a known value', () => {
    // level 5 → 2^(25/5) = 2^5 = 32
    expect(levelMultiplier(5)).toBeCloseTo(32, 10);
  });

  it('is monotonically increasing', () => {
    for (let l = 1; l < 10; l++) {
      expect(levelMultiplier(l + 1)).toBeGreaterThan(levelMultiplier(l));
    }
  });

  it('rejects levels below 1', () => {
    expect(() => levelMultiplier(0)).toThrow();
    expect(() => levelMultiplier(-1)).toThrow();
  });

  it('rejects non-finite input', () => {
    expect(() => levelMultiplier(Infinity)).toThrow();
    expect(() => levelMultiplier(NaN)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// effectiveAlgorithmModifier
// ---------------------------------------------------------------------------

describe('effectiveAlgorithmModifier', () => {
  it('returns 1.0 when trend_sensitivity is 0, regardless of raw modifier', () => {
    expect(effectiveAlgorithmModifier(2.0, 0)).toBe(1.0);
    expect(effectiveAlgorithmModifier(0.5, 0)).toBe(1.0);
  });

  it('returns the raw modifier when trend_sensitivity is 1', () => {
    expect(effectiveAlgorithmModifier(2.0, 1)).toBe(2.0);
    expect(effectiveAlgorithmModifier(0.5, 1)).toBe(0.5);
  });

  it('linearly interpolates between 1.0 and raw modifier', () => {
    expect(effectiveAlgorithmModifier(2.0, 0.5)).toBeCloseTo(1.5, 10);
    expect(effectiveAlgorithmModifier(0.6, 0.5)).toBeCloseTo(0.8, 10);
  });
});

// ---------------------------------------------------------------------------
// cloutBonus
// ---------------------------------------------------------------------------

describe('cloutBonus', () => {
  it('is 1.0 when no upgrades are purchased', () => {
    const upgrades = {
      faster_engagement: 0,
      algorithm_insight: 0,
      platform_headstart_chirper: 0,
      platform_headstart_instasham: 0,
      platform_headstart_grindset: 0,
    };
    expect(cloutBonus(upgrades, STATIC_DATA)).toBe(1.0);
  });

  it('raises the faster_engagement multiplier to the purchased level', () => {
    // faster_engagement value: 1.25
    const upgrades = {
      faster_engagement: 3,
      algorithm_insight: 0,
      platform_headstart_chirper: 0,
      platform_headstart_instasham: 0,
      platform_headstart_grindset: 0,
    };
    expect(cloutBonus(upgrades, STATIC_DATA)).toBeCloseTo(Math.pow(1.25, 3), 10);
  });

  it('ignores non-engagement upgrade types', () => {
    const upgrades = {
      faster_engagement: 0,
      algorithm_insight: 2, // not an engagement_multiplier
      platform_headstart_chirper: 1,
      platform_headstart_instasham: 0,
      platform_headstart_grindset: 0,
    };
    expect(cloutBonus(upgrades, STATIC_DATA)).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// computeGeneratorEffectiveRate
// ---------------------------------------------------------------------------

describe('computeGeneratorEffectiveRate', () => {
  it('returns 0 when generator is not owned', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    const rate = computeGeneratorEffectiveRate(
      state.generators.selfies,
      state,
      STATIC_DATA,
    );
    expect(rate).toBe(0);
  });

  it('returns 0 when count is 0', () => {
    const state = stateWithGenerator('selfies', 0);
    const rate = computeGeneratorEffectiveRate(
      state.generators.selfies,
      state,
      STATIC_DATA,
    );
    expect(rate).toBe(0);
  });

  it('applies count, base rate, level, algorithm modifier, and clout', () => {
    const state = stateWithGenerator('selfies', 2, 1);
    // base: count=2 × base_rate=1.0 × levelMultiplier(1)=2^0.2 × algo_mod × clout=1
    // need to compute algo_mod from whatever state the initial algorithm is in
    const selfiesDef = STATIC_DATA.generators.selfies;
    const firstAlgoStateId = Object.keys(STATIC_DATA.algorithmStates)[0];
    const rawMod =
      STATIC_DATA.algorithmStates[
        firstAlgoStateId as keyof typeof STATIC_DATA.algorithmStates
      ].state_modifiers.selfies;
    const algoMod = effectiveAlgorithmModifier(
      rawMod,
      selfiesDef.trend_sensitivity,
    );
    const expected = 2 * 1.0 * levelMultiplier(1) * algoMod * 1.0;
    const rate = computeGeneratorEffectiveRate(
      state.generators.selfies,
      state,
      STATIC_DATA,
    );
    expect(rate).toBeCloseTo(expected, 6);
  });
});

// ---------------------------------------------------------------------------
// computeAllGeneratorEffectiveRates
// ---------------------------------------------------------------------------

describe('computeAllGeneratorEffectiveRates', () => {
  it('returns empty map when no generators are owned', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    const rates = computeAllGeneratorEffectiveRates(state, STATIC_DATA);
    expect(Object.keys(rates)).toHaveLength(0);
  });

  it('only includes generators with rate > 0', () => {
    const base = stateWithGenerator('selfies', 3, 1);
    const state: GameState = {
      ...base,
      generators: {
        ...base.generators,
        memes: { ...base.generators.memes, owned: true, count: 0 },
      },
    };
    const rates = computeAllGeneratorEffectiveRates(state, STATIC_DATA);
    expect(rates.selfies).toBeGreaterThan(0);
    expect(rates.memes).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// tick — engagement accumulation
// ---------------------------------------------------------------------------

describe('tick — engagement', () => {
  it('accumulates engagement over deltaMs from a single generator', () => {
    const state = stateWithGenerator('selfies', 1, 1);
    const ratePerSec = computeGeneratorEffectiveRate(
      state.generators.selfies,
      state,
      STATIC_DATA,
    );
    // deltaMs = 1000 → 1 second → one full ratePerSec worth of engagement
    const next = tick(state, T0 + 1000, 1000, STATIC_DATA);
    expect(next.player.engagement).toBeCloseTo(ratePerSec, 6);
  });

  it('is a no-op on engagement when no generators are owned', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    state.player.engagement = 42;
    // algorithm shift_time is in the future, won't advance
    const next = tick(
      { ...state, algorithm: { ...state.algorithm, shift_time: T0 + 10_000_000 } },
      T0 + 500,
      500,
      STATIC_DATA,
    );
    expect(next.player.engagement).toBe(42);
  });

  it('scales linearly with deltaMs', () => {
    const state = stateWithGenerator('selfies', 2, 3);
    const one = tick(state, T0 + 100, 100, STATIC_DATA);
    const ten = tick(state, T0 + 1000, 1000, STATIC_DATA);
    expect(ten.player.engagement).toBeCloseTo(one.player.engagement * 10, 6);
  });

  it('produces more engagement from a trend-sensitive generator in a boosted state', () => {
    // memes trend_sensitivity = 0.8; algorithm boost varies by state.
    // We compare two otherwise-identical states but override the algorithm
    // state_modifiers directly on the GameState to isolate the effect.
    const state = stateWithGenerator('memes', 1, 1);
    const boosted: GameState = {
      ...state,
      algorithm: {
        ...state.algorithm,
        state_modifiers: { ...state.algorithm.state_modifiers, memes: 2.0 },
      },
    };
    const neutral: GameState = {
      ...state,
      algorithm: {
        ...state.algorithm,
        state_modifiers: { ...state.algorithm.state_modifiers, memes: 1.0 },
      },
    };
    const boostedNext = tick(boosted, T0 + 1000, 1000, STATIC_DATA);
    const neutralNext = tick(neutral, T0 + 1000, 1000, STATIC_DATA);
    expect(boostedNext.player.engagement).toBeGreaterThan(
      neutralNext.player.engagement,
    );
  });

  it('trend-immune generator is unaffected by algorithm state', () => {
    // Tutorials have trend_sensitivity = 0.1 (close to immune).
    // Manually set sensitivity to 0 by using a generator override approach:
    // we exercise the formula via effectiveAlgorithmModifier directly.
    expect(effectiveAlgorithmModifier(2.0, 0)).toBe(1.0);
    expect(effectiveAlgorithmModifier(0.5, 0)).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// tick — follower distribution
// ---------------------------------------------------------------------------

describe('tick — followers', () => {
  it('distributes followers to the one unlocked platform with full share', () => {
    // Only chirper starts unlocked (threshold 0). instasham=100, grindset=500.
    const state = stateWithGenerator('selfies', 10, 1);
    const next = tick(state, T0 + 1000, 1000, STATIC_DATA);

    // total_followers === chirper.followers; other platforms stay at 0.
    expect(next.platforms.chirper.followers).toBeGreaterThan(0);
    expect(next.platforms.instasham.followers).toBe(0);
    expect(next.platforms.grindset.followers).toBe(0);
    expect(next.player.total_followers).toBeCloseTo(
      next.platforms.chirper.followers,
      6,
    );
  });

  it('lifetime_followers and total_followers both increment by total gained', () => {
    const state = stateWithGenerator('selfies', 10, 1);
    const next = tick(state, T0 + 1000, 1000, STATIC_DATA);
    const total = totalPlatformFollowers(next.platforms);
    expect(next.player.total_followers).toBeCloseTo(total, 6);
    expect(next.player.lifetime_followers).toBeCloseTo(total, 6);
  });

  it('distributes across multiple unlocked platforms by affinity weight', () => {
    const base = stateWithGenerator('selfies', 100, 1);
    // Unlock instasham manually for this test
    const state: GameState = {
      ...base,
      platforms: {
        ...base.platforms,
        instasham: { ...base.platforms.instasham, unlocked: true },
      },
    };
    const next = tick(state, T0 + 1000, 1000, STATIC_DATA);
    // selfies affinity: chirper=0.8, instasham=2.0 → instasham earns more
    expect(next.platforms.instasham.followers).toBeGreaterThan(
      next.platforms.chirper.followers,
    );
    expect(next.platforms.chirper.followers).toBeGreaterThan(0);
  });

  it('earns zero followers when no generators are active', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    const next = tick(
      { ...state, algorithm: { ...state.algorithm, shift_time: T0 + 10_000_000 } },
      T0 + 1000,
      1000,
      STATIC_DATA,
    );
    expect(next.player.total_followers).toBe(0);
    expect(next.platforms.chirper.followers).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// tick — platform unlocks
// ---------------------------------------------------------------------------

describe('tick — platform unlocks', () => {
  it('unlocks instasham once total_followers crosses its threshold', () => {
    // instasham threshold = 100. Use a ton of generators to cross it in 1s.
    const state = stateWithGenerator('podcasts', 100, 5);
    expect(state.platforms.instasham.unlocked).toBe(false);

    const next = tick(state, T0 + 1000, 1000, STATIC_DATA);

    expect(next.player.total_followers).toBeGreaterThan(100);
    expect(next.platforms.instasham.unlocked).toBe(true);
    // grindset (threshold 500) may or may not be unlocked — depends on rate
  });

  it('does not unlock platforms below their threshold', () => {
    const state = stateWithGenerator('selfies', 1, 1);
    const next = tick(state, T0 + 100, 100, STATIC_DATA);
    // tiny production — instasham should remain locked
    expect(next.platforms.instasham.unlocked).toBe(false);
    expect(next.platforms.grindset.unlocked).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// tick — algorithm advancement
// ---------------------------------------------------------------------------

describe('tick — algorithm', () => {
  it('advances the algorithm when now >= shift_time', () => {
    const base = stateWithGenerator('selfies', 1, 1);
    // Set shift_time to happen within deltaMs
    const state: GameState = {
      ...base,
      algorithm: { ...base.algorithm, shift_time: T0 + 500 },
    };
    const next = tick(state, T0 + 1000, 1000, STATIC_DATA);
    expect(next.algorithm.current_state_index).toBeGreaterThan(
      state.algorithm.current_state_index,
    );
  });

  it('does not advance the algorithm before shift_time', () => {
    const state = stateWithGenerator('selfies', 1, 1);
    const next = tick(state, T0 + 100, 100, STATIC_DATA);
    expect(next.algorithm.current_state_index).toBe(
      state.algorithm.current_state_index,
    );
  });

  it('deltaMs=0 still advances algorithm if shift boundary was crossed', () => {
    const base = stateWithGenerator('selfies', 1, 1);
    const state: GameState = {
      ...base,
      algorithm: { ...base.algorithm, shift_time: T0 - 1 },
    };
    const next = tick(state, T0, 0, STATIC_DATA);
    expect(next.algorithm.current_state_index).toBeGreaterThan(
      state.algorithm.current_state_index,
    );
    // Engagement unchanged — deltaMs is 0
    expect(next.player.engagement).toBe(state.player.engagement);
  });
});

// ---------------------------------------------------------------------------
// tick — purity & guards
// ---------------------------------------------------------------------------

describe('tick — purity & guards', () => {
  it('does not mutate the input state', () => {
    const state = stateWithGenerator('selfies', 5, 2);
    const snapshot = JSON.parse(JSON.stringify(state));
    tick(state, T0 + 1000, 1000, STATIC_DATA);
    expect(state).toEqual(snapshot);
  });

  it('throws on negative deltaMs', () => {
    const state = stateWithGenerator('selfies', 1, 1);
    expect(() => tick(state, T0, -1, STATIC_DATA)).toThrow();
  });

  it('full pipeline end-to-end produces consistent state', () => {
    const state = stateWithGenerator('selfies', 10, 3);
    const next = tick(state, T0 + 2000, 2000, STATIC_DATA);

    // Engagement increased
    expect(next.player.engagement).toBeGreaterThan(0);
    // Followers increased
    expect(next.player.total_followers).toBeGreaterThan(0);
    // Totals consistent
    const platformSum = totalPlatformFollowers(next.platforms);
    expect(next.player.total_followers).toBeCloseTo(platformSum, 6);
    // Lifetime >= total_followers (never decreases)
    expect(next.player.lifetime_followers).toBeGreaterThanOrEqual(
      next.player.total_followers,
    );
  });
});

// ---------------------------------------------------------------------------
// postClick
// ---------------------------------------------------------------------------

describe('postClick', () => {
  it('adds engagement on a click', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    const next = postClick(state, STATIC_DATA);
    expect(next.player.engagement).toBeGreaterThan(state.player.engagement);
  });

  it('click engagement scales with CLICK_BASE_ENGAGEMENT × algo_mod × clout', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    const selfiesDef = STATIC_DATA.generators.selfies;
    const rawMod = state.algorithm.state_modifiers.selfies;
    const algoMod = effectiveAlgorithmModifier(
      rawMod,
      selfiesDef.trend_sensitivity,
    );
    const expected = CLICK_BASE_ENGAGEMENT * algoMod * 1.0;
    const next = postClick(state, STATIC_DATA);
    expect(next.player.engagement - state.player.engagement).toBeCloseTo(
      expected,
      10,
    );
  });

  it('applies clout_bonus (faster_engagement) to click output', () => {
    const base = createInitialGameState(STATIC_DATA, T0);
    const state: GameState = {
      ...base,
      player: {
        ...base.player,
        clout_upgrades: { ...base.player.clout_upgrades, faster_engagement: 2 },
      },
    };
    const boosted = postClick(state, STATIC_DATA);
    const baseline = postClick(base, STATIC_DATA);
    const boostedGain = boosted.player.engagement - state.player.engagement;
    const baselineGain = baseline.player.engagement - base.player.engagement;
    expect(boostedGain).toBeCloseTo(baselineGain * Math.pow(1.25, 2), 10);
  });

  it('does not mutate the input state', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    const snapshot = JSON.parse(JSON.stringify(state));
    postClick(state, STATIC_DATA);
    expect(state).toEqual(snapshot);
  });

  it('does not directly produce followers', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    const next = postClick(state, STATIC_DATA);
    expect(next.player.total_followers).toBe(0);
    expect(next.platforms.chirper.followers).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeSnapshot
// ---------------------------------------------------------------------------

describe('computeSnapshot', () => {
  it('produces zero rates for an empty initial state', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    const snap = computeSnapshot(state, STATIC_DATA);
    expect(snap.total_engagement_rate).toBe(0);
    expect(snap.total_follower_rate).toBe(0);
    expect(snap.platform_rates.chirper).toBe(0);
    expect(snap.platform_rates.instasham).toBe(0);
    expect(snap.platform_rates.grindset).toBe(0);
  });

  it('captures current algorithm_state_index', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    const snap = computeSnapshot(state, STATIC_DATA);
    expect(snap.algorithm_state_index).toBe(state.algorithm.current_state_index);
  });

  it('rates are expressed per second, matching tick accumulation over 1s', () => {
    const state = stateWithGenerator('selfies', 10, 2);
    const snap = computeSnapshot(state, STATIC_DATA);
    const oneSec = tick(state, T0 + 1000, 1000, STATIC_DATA);
    expect(oneSec.player.engagement).toBeCloseTo(snap.total_engagement_rate, 6);
    expect(oneSec.player.total_followers).toBeCloseTo(snap.total_follower_rate, 6);
  });

  it('platform_rates sum equals total_follower_rate', () => {
    const base = stateWithGenerator('selfies', 10, 1);
    const state: GameState = {
      ...base,
      platforms: {
        ...base.platforms,
        instasham: { ...base.platforms.instasham, unlocked: true },
      },
    };
    const snap = computeSnapshot(state, STATIC_DATA);
    const sum =
      snap.platform_rates.chirper
      + snap.platform_rates.instasham
      + snap.platform_rates.grindset;
    expect(sum).toBeCloseTo(snap.total_follower_rate, 6);
  });
});
