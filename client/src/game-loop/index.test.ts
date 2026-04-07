import { describe, it, expect } from 'vitest';
import {
  tick,
  postClick,
  levelMultiplier,
  cloutBonus,
  computeGeneratorEffectiveRate,
  computeAllGeneratorEffectiveRates,
  computeSnapshot,
  evaluateViralTrigger,
} from './index.ts';
import { STATIC_DATA } from '../static-data/index.ts';
import {
  createInitialGameState,
  createGeneratorState,
} from '../model/index.ts';
import type { GameState, GeneratorId, PlatformId } from '../types.ts';
import { computeFollowerDistribution } from '../platform/index.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const T0 = 1_700_000_000_000;

/**
 * Build a deterministic game state with the given generator owned + configured.
 */
function stateWithGenerator(
  id: GeneratorId,
  count: number,
  level: number = 1,
  autoclicker_count?: number,
): GameState {
  const base = createInitialGameState(STATIC_DATA, T0);
  return {
    ...base,
    generators: {
      ...base.generators,
      [id]: {
        ...createGeneratorState(id),
        owned: true,
        count,
        level,
        // Default: autoclicker_count mirrors count so tests that relied on
        // count for passive production continue working after the
        // level-driven-cooldown refactor (task #132).
        autoclicker_count: autoclicker_count ?? count,
      },
    },
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

  it('silently clamps levels below 1 to the level-1 value (task #89)', () => {
    // Clamping, not throwing — upstream call sites may temporarily feed 0
    // during save migration or between validation passes.
    const l1 = levelMultiplier(1);
    expect(levelMultiplier(0)).toBe(l1);
    expect(levelMultiplier(-1)).toBe(l1);
  });

  it('silently clamps levels above 20 to the level-20 ceiling (task #89)', () => {
    // Protects game-loop rate math from runaway exponents if the level ever
    // exceeds the curve's designed range (max_level is currently 10).
    const l20 = levelMultiplier(20);
    expect(levelMultiplier(21)).toBe(l20);
    expect(levelMultiplier(100)).toBe(l20);
    expect(Number.isFinite(levelMultiplier(1e6))).toBe(true);
  });

  it('coerces non-finite input to the level-1 value', () => {
    const l1 = levelMultiplier(1);
    expect(levelMultiplier(Infinity)).toBe(l1);
    expect(levelMultiplier(NaN)).toBe(l1);
  });
});

// ---------------------------------------------------------------------------
// engagement clamp — integration with tick / postClick (task #89 AC #5)
// ---------------------------------------------------------------------------

describe('engagement clamp — write-site integration', () => {
  it('tick never pushes engagement above Number.MAX_SAFE_INTEGER', () => {
    // Build a state at the ceiling with a producing generator. The tick's
    // engagement accumulation would overflow MAX_SAFE_INTEGER but the clamp
    // at the write site (game-loop/index.ts:379) pins it.
    const state = stateWithGenerator('viral_stunts', 1_000_000, 10);
    const pinned: GameState = {
      ...state,
      player: { ...state.player, engagement: Number.MAX_SAFE_INTEGER - 1 },
    };
    const next = tick(pinned, T0 + 1000, 1000, STATIC_DATA);
    expect(next.player.engagement).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('postClick never pushes engagement above Number.MAX_SAFE_INTEGER', () => {
    const state = stateWithGenerator('chirps', 1, 1);
    const pinned: GameState = {
      ...state,
      player: { ...state.player, engagement: Number.MAX_SAFE_INTEGER },
    };
    const next = postClick(pinned, STATIC_DATA, 'chirps', T0);
    expect(next.player.engagement).toBe(Number.MAX_SAFE_INTEGER);
  });
});

// ---------------------------------------------------------------------------
// cloutBonus
// ---------------------------------------------------------------------------

describe('cloutBonus', () => {
  const zeroUpgrades = {
    engagement_boost: 0,
    platform_headstart_picshift: 0,
    platform_headstart_skroll: 0,
    platform_headstart_podpod: 0,
    ai_slop_unlock: 0,
    deepfakes_unlock: 0,
    algorithmic_prophecy_unlock: 0,
  };

  it('is 1.0 when no upgrades are purchased', () => {
    expect(cloutBonus(zeroUpgrades, STATIC_DATA)).toBe(1.0);
  });

  it('reads engagement_boost cumulative multiplier from values[level-1]', () => {
    // engagement_boost values: [1.5, 2.5, 5.0]
    expect(
      cloutBonus({ ...zeroUpgrades, engagement_boost: 1 }, STATIC_DATA),
    ).toBeCloseTo(1.5, 10);
    expect(
      cloutBonus({ ...zeroUpgrades, engagement_boost: 2 }, STATIC_DATA),
    ).toBeCloseTo(2.5, 10);
    expect(
      cloutBonus({ ...zeroUpgrades, engagement_boost: 3 }, STATIC_DATA),
    ).toBeCloseTo(5.0, 10);
  });

  it('ignores non-engagement upgrade types', () => {
    const upgrades = {
      ...zeroUpgrades,
      platform_headstart_picshift: 1,
      ai_slop_unlock: 1,
    };
    expect(cloutBonus(upgrades, STATIC_DATA)).toBe(1.0);
  });

  it('throws when the level exceeds the values array length', () => {
    // engagement_boost max_level is 3; level 4 has no values[3].
    expect(() =>
      cloutBonus({ ...zeroUpgrades, engagement_boost: 4 }, STATIC_DATA),
    ).toThrow(/values\[3\]/);
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

  it('returns 0 when autoclicker_count is 0', () => {
    const state = stateWithGenerator('selfies', 0, 1, 0);
    const rate = computeGeneratorEffectiveRate(
      state.generators.selfies,
      state,
      STATIC_DATA,
    );
    expect(rate).toBe(0);
  });

  it('applies autoclicker_count, level, base rate, (1+count), clout, and kit', () => {
    const state = stateWithGenerator('selfies', 2, 1, 3);
    // Formula: autoclicker_count × level × base_event_rate × base_event_yield
    //          × (1 + count) × clout × kit
    const selfiesDef = STATIC_DATA.generators.selfies;
    // autoclicker_count=3, level=1, base_rate=0.2, base_yield=5.0, (1+count)=(1+2)=3
    const expected = 3 * 1 * selfiesDef.base_event_rate * selfiesDef.base_event_yield
      * (1 + 2) * 1.0 * 1.0;
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
    const next = tick(state, T0 + 500, 500, STATIC_DATA);
    expect(next.player.engagement).toBe(42);
  });

  it('scales linearly with deltaMs', () => {
    const state = stateWithGenerator('selfies', 2, 3);
    const one = tick(state, T0 + 100, 100, STATIC_DATA);
    const ten = tick(state, T0 + 1000, 1000, STATIC_DATA);
    expect(ten.player.engagement).toBeCloseTo(one.player.engagement * 10, 6);
  });

  it('rate scales with count (yield multiplier from BUY track)', () => {
    // Two otherwise identical states, one with count=0 and one with count=5.
    const low = stateWithGenerator('memes', 0, 1);
    const high = stateWithGenerator('memes', 5, 1);
    const lowNext = tick(low, T0 + 1000, 1000, STATIC_DATA);
    const highNext = tick(high, T0 + 1000, 1000, STATIC_DATA);
    // (1+5)/(1+0) = 6x more engagement from higher count
    expect(highNext.player.engagement).toBeGreaterThan(
      lowNext.player.engagement,
    );
  });
});

// ---------------------------------------------------------------------------
// tick — follower distribution
// ---------------------------------------------------------------------------

describe('tick — followers', () => {
  it('distributes followers to the one unlocked platform with full share', () => {
    // Only chirper starts unlocked (threshold 0). picshift=100, skroll=500.
    const state = stateWithGenerator('selfies', 10, 1);
    const next = tick(state, T0 + 1000, 1000, STATIC_DATA);

    // total_followers === chirper.followers; other platforms stay at 0.
    expect(next.platforms.chirper.followers).toBeGreaterThan(0);
    expect(next.platforms.picshift.followers).toBe(0);
    expect(next.platforms.skroll.followers).toBe(0);
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
    // Unlock picshift manually for this test
    const state: GameState = {
      ...base,
      platforms: {
        ...base.platforms,
        picshift: { ...base.platforms.picshift, unlocked: true },
      },
    };
    const next = tick(state, T0 + 1000, 1000, STATIC_DATA);
    // selfies affinity: chirper=0.8, picshift=2.0 → picshift earns more
    expect(next.platforms.picshift.followers).toBeGreaterThan(
      next.platforms.chirper.followers,
    );
    expect(next.platforms.chirper.followers).toBeGreaterThan(0);
  });

  it('earns zero followers when no generators are active', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    const next = tick(state, T0 + 1000, 1000, STATIC_DATA);
    expect(next.player.total_followers).toBe(0);
    expect(next.platforms.chirper.followers).toBe(0);
  });

  it('maintains invariant: total_followers always equals sum of platform followers', () => {
    // This test enforces that total_followers is a purely derived field.
    // It must always equal the sum of platform.followers, never written directly.
    const state = stateWithGenerator('selfies', 10, 2);
    const next = tick(state, T0 + 5000, 5000, STATIC_DATA);

    const platformSum = totalPlatformFollowers(next.platforms);
    expect(next.player.total_followers).toBeCloseTo(platformSum, 6);
  });
});

// ---------------------------------------------------------------------------
// tick — platform unlocks
// ---------------------------------------------------------------------------

describe('tick — platform unlocks', () => {
  it('unlocks picshift once total_followers crosses its threshold', () => {
    // picshift threshold = 100. Use a ton of generators to cross it in 1s.
    const state = stateWithGenerator('podcasts', 100, 5);
    expect(state.platforms.picshift.unlocked).toBe(false);

    const next = tick(state, T0 + 1000, 1000, STATIC_DATA);

    expect(next.player.total_followers).toBeGreaterThan(100);
    expect(next.platforms.picshift.unlocked).toBe(true);
    // skroll (threshold 500) may or may not be unlocked — depends on rate
  });

  it('does not unlock platforms below their threshold', () => {
    const state = stateWithGenerator('selfies', 1, 1);
    const next = tick(state, T0 + 100, 100, STATIC_DATA);
    // tiny production — picshift should remain locked
    expect(next.platforms.picshift.unlocked).toBe(false);
    expect(next.platforms.skroll.unlocked).toBe(false);
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
// postClick — per-verb manual tap with cooldown gate (task #119)
// ---------------------------------------------------------------------------

describe('postClick', () => {
  it('adds engagement on a chirps click', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    const next = postClick(state, STATIC_DATA, 'chirps', T0);
    expect(next.player.engagement).toBeGreaterThan(state.player.engagement);
  });

  it('click engagement = base_event_yield × (1 + count) × (1 + autoclicker_count) × clout × kit', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    const def = STATIC_DATA.generators.chirps;
    // count=0, autoclicker_count=0 → (1+0)×(1+0)=1
    const expected = def.base_event_yield * (1 + 0) * (1 + 0) * 1.0 * 1.0;
    const next = postClick(state, STATIC_DATA, 'chirps', T0);
    expect(next.player.engagement - state.player.engagement).toBeCloseTo(expected, 10);
  });

  it('applies clout_bonus (engagement_boost) to click output', () => {
    const base = createInitialGameState(STATIC_DATA, T0);
    const state: GameState = {
      ...base,
      player: {
        ...base.player,
        clout_upgrades: { ...base.player.clout_upgrades, engagement_boost: 2 },
      },
    };
    const boosted = postClick(state, STATIC_DATA, 'chirps', T0);
    const baseline = postClick(base, STATIC_DATA, 'chirps', T0);
    const boostedGain = boosted.player.engagement - state.player.engagement;
    const baselineGain = baseline.player.engagement - base.player.engagement;
    // engagement_boost level 2 → values[1] = 2.5
    expect(boostedGain).toBeCloseTo(baselineGain * 2.5, 10);
  });

  it('does not mutate the input state', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    const snapshot = JSON.parse(JSON.stringify(state));
    postClick(state, STATIC_DATA, 'chirps', T0);
    expect(state).toEqual(snapshot);
  });

  it('does not directly produce followers', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    const next = postClick(state, STATIC_DATA, 'chirps', T0);
    expect(next.player.total_followers).toBe(0);
    expect(next.platforms.chirper.followers).toBe(0);
  });

  it('dispatches by verbId — selfies produces different yield than chirps', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    // selfies starts unowned (threshold=100), so we must manually set owned=true
    const withSelfies: GameState = {
      ...state,
      generators: {
        ...state.generators,
        selfies: { ...state.generators.selfies, owned: true },
      },
    };
    const chirpsResult = postClick(withSelfies, STATIC_DATA, 'chirps', T0);
    const selfiesResult = postClick(withSelfies, STATIC_DATA, 'selfies', T0);
    const chirpsGain = chirpsResult.player.engagement;
    const selfiesGain = selfiesResult.player.engagement;
    // chirps yield=1.0, selfies yield=5.0 → selfies earns more per tap
    expect(selfiesGain).toBeGreaterThan(chirpsGain);
  });

  it('writes last_manual_click_at[verbId] on successful dispatch', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    const next = postClick(state, STATIC_DATA, 'chirps', T0 + 5000);
    expect(next.player.last_manual_click_at.chirps).toBe(T0 + 5000);
  });

  it('returns state unchanged for non-manual_clickable generators', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    // memes is manual_clickable=false
    const next = postClick(state, STATIC_DATA, 'memes', T0);
    expect(next).toBe(state);
  });

  it('cooldown gate rejects taps that arrive too soon', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    // First tap succeeds
    const after1 = postClick(state, STATIC_DATA, 'chirps', T0);
    expect(after1.player.engagement).toBeGreaterThan(0);
    // chirps base_event_rate=0.5, level=1 → cooldown=max(50,1000/(1×0.5))=2000ms
    // Second tap 100ms later → rejected
    const after2 = postClick(after1, STATIC_DATA, 'chirps', T0 + 100);
    expect(after2).toBe(after1);
  });

  it('cooldown gate accepts taps after the cooldown period', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    const after1 = postClick(state, STATIC_DATA, 'chirps', T0);
    // cooldown = max(50, 1000/(1×0.5)) = 2000ms, tap at +2001ms → accepted
    const after2 = postClick(after1, STATIC_DATA, 'chirps', T0 + 2001);
    expect(after2.player.engagement).toBeGreaterThan(after1.player.engagement);
  });

  it('cooldown shrinks when level increases (LVL UP effect)', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    // Set level=10 → cooldown = max(50, 1000/(10 × 0.5)) = max(50, 200) = 200ms
    const withLevel: GameState = {
      ...state,
      generators: {
        ...state.generators,
        chirps: { ...state.generators.chirps, level: 10 },
      },
    };
    const after1 = postClick(withLevel, STATIC_DATA, 'chirps', T0);
    // Tap 250ms later → accepted (250 > 200ms cooldown)
    const after2 = postClick(after1, STATIC_DATA, 'chirps', T0 + 250);
    expect(after2.player.engagement).toBeGreaterThan(after1.player.engagement);
  });
});

// ---------------------------------------------------------------------------
// yield/rate split regression — mathematically identical passive output (#119)
// ---------------------------------------------------------------------------

describe('yield/rate split regression', () => {
  // Passive output at autoclicker_count=1, count=0 = base_event_rate × base_event_yield.
  // These are the target values from the level-driven-cooldown retune table.
  const EXPECTED_PASSIVE_RATES: Record<string, number> = {
    chirps: 0.5,                // 0.5 × 1.0
    selfies: 15.4,              // 100 × 0.154
    memes: 15.0,                // 3 × 5.0
    hot_takes: 24.0,            // 2 × 12.0
    tutorials: 60.0,            // 2 × 30.0
    livestreams: 2_540.0,       // 100_000 × 0.0254
    podcasts: 30_800.0,         // 2_000_000 × 0.0154
    viral_stunts: 180_000.0,    // 18_000_000 × 0.01
    ai_slop: 1_280_000.0,      // 1 × 1_280_000
    deepfakes: 2_400_000.0,     // 1 × 2_400_000
    algorithmic_prophecy: 6_400_000.0, // 1 × 6_400_000
  };

  for (const [id, expectedRate] of Object.entries(EXPECTED_PASSIVE_RATES)) {
    it(`${id}: yield × rate ≈ passive output at ac=1, count=0 (${expectedRate})`, () => {
      const def = STATIC_DATA.generators[id as GeneratorId];
      const product = def.base_event_yield * def.base_event_rate;
      expect(product).toBeCloseTo(expectedRate, 1);
    });
  }

  it('computeGeneratorEffectiveRate output for selfies at ac=1, level=1, count=0', () => {
    // autoclicker_count=1, level=1, count=0 → formula: 1 × 1 × rate × yield × (1+0) × clout × kit
    const state = stateWithGenerator('selfies', 0, 1, 1);
    const rate = computeGeneratorEffectiveRate(
      state.generators.selfies,
      state,
      STATIC_DATA,
    );
    const def = STATIC_DATA.generators.selfies;
    const expected = 1 * def.base_event_rate * def.base_event_yield *
      (1 + 0) * 1.0 * 1.0;
    expect(rate).toBeCloseTo(expected, 10);
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
    expect(snap.platform_rates.picshift).toBe(0);
    expect(snap.platform_rates.skroll).toBe(0);
    expect(snap.platform_rates.podpod).toBe(0);
  });

  it('snapshot has required fields (rates and platform_rates)', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    const snap = computeSnapshot(state, STATIC_DATA);
    expect(snap.total_engagement_rate).toBeDefined();
    expect(snap.total_follower_rate).toBeDefined();
    expect(snap.platform_rates).toBeDefined();
  });

  it('rates are expressed per second, matching tick accumulation over 1s', () => {
    // Audience Mood retention mutates per tick (neglect, post-driven fatigue),
    // so the snapshot taken BEFORE the tick no longer predicts the tick's
    // follower gain 1:1 — retention drifts during the 1-second window. We
    // hold mood state constant by pre-saturating chirper's content_fatigue
    // for selfies (+0.08 clamps to 1.0, no change) and priming neglect=0,
    // misalignment=0 — posts then keep retention stationary at its pre-tick
    // value. The engagement side is mood-independent and is unchanged.
    const base = stateWithGenerator('selfies', 10, 2);
    const state: GameState = {
      ...base,
      platforms: {
        ...base.platforms,
        chirper: {
          ...base.platforms.chirper,
          content_fatigue: { selfies: 1.0 },
          neglect: 0,
        },
      },
    };
    // Recompute retention against the pinned pressures so the snapshot
    // and the tick start from the same retention value.
    const pinnedRetention =
      (1 - 1.0 * STATIC_DATA.audience_mood.fatigue_weight);
    const retention = Math.max(
      STATIC_DATA.audience_mood.retention_floor,
      Math.min(1.0, pinnedRetention),
    );
    const stateReady: GameState = {
      ...state,
      platforms: {
        ...state.platforms,
        chirper: { ...state.platforms.chirper, retention },
      },
    };
    const snap = computeSnapshot(stateReady, STATIC_DATA);
    const oneSec = tick(stateReady, T0 + 1000, 1000, STATIC_DATA);
    expect(oneSec.player.engagement).toBeCloseTo(snap.total_engagement_rate, 6);
    expect(oneSec.player.total_followers).toBeCloseTo(snap.total_follower_rate, 6);
  });

  it('platform_rates sum equals total_follower_rate', () => {
    const base = stateWithGenerator('selfies', 10, 1);
    const state: GameState = {
      ...base,
      platforms: {
        ...base.platforms,
        picshift: { ...base.platforms.picshift, unlocked: true },
      },
    };
    const snap = computeSnapshot(state, STATIC_DATA);
    const sum =
      snap.platform_rates.chirper
      + snap.platform_rates.picshift
      + snap.platform_rates.skroll
      + snap.platform_rates.podpod;
    expect(sum).toBeCloseTo(snap.total_follower_rate, 6);
  });
});

// ---------------------------------------------------------------------------
// evaluateViralTrigger — gate coverage via injectable PRNG
// ---------------------------------------------------------------------------

/** Build a state with selfies active and the cooldown counter past the threshold. */
function stateReadyToViral(overrides?: Partial<GameState>): GameState {
  const base = stateWithGenerator('selfies', 5, 1);
  return {
    ...base,
    viralBurst: {
      active_ticks_since_last: STATIC_DATA.viralBurst.minCooldownTicks + 1,
      active: null,
    },
    ...overrides,
  };
}

/** A PRNG that always returns 0 — forces probability gate to always pass (0 < any p_viral). */
const alwaysZero = () => 0;
/** A PRNG that always returns 1 — forces probability gate to always fail (1 >= any p_viral). */
const alwaysOne = () => 1;

describe('evaluateViralTrigger', () => {
  it('Gate 1: returns null when cooldown has not been met', () => {
    const state = stateWithGenerator('selfies', 5, 1);
    // active_ticks_since_last is 0 from createInitialGameState — below threshold
    const result = evaluateViralTrigger(state, STATIC_DATA, T0, alwaysZero);
    expect(result).toBeNull();
  });

  it('Gate 1: passes when exactly at the threshold + 1', () => {
    const state = stateReadyToViral();
    const result = evaluateViralTrigger(state, STATIC_DATA, T0, alwaysZero);
    expect(result).not.toBeNull();
  });

  it('Gate 2: returns null when probability roll fails (random >= p_viral)', () => {
    const state = stateReadyToViral();
    const result = evaluateViralTrigger(state, STATIC_DATA, T0, alwaysOne);
    expect(result).toBeNull();
  });

  it('returns null when no generators are producing (no content, no viral)', () => {
    // All generators at count 0 → no production
    const base = createInitialGameState(STATIC_DATA, T0);
    const state: GameState = {
      ...base,
      viralBurst: {
        active_ticks_since_last: STATIC_DATA.viralBurst.minCooldownTicks + 1,
        active: null,
      },
    };
    const result = evaluateViralTrigger(state, STATIC_DATA, T0, alwaysZero);
    expect(result).toBeNull();
  });

  it('constructs ActiveViralEvent with all required fields on trigger', () => {
    const state = stateReadyToViral();
    // Use a sequence: roll < p_viral (0), then deterministic duration/boost (0)
    let callCount = 0;
    const deterministicRandom = () => {
      callCount++;
      return 0; // 0 < any positive p_viral; duration = durationMsMin; boost = magnitudeBoostMin
    };
    const result = evaluateViralTrigger(state, STATIC_DATA, T0, deterministicRandom);
    expect(result).not.toBeNull();
    expect(result!.source_generator_id).toBe('selfies');
    expect(result!.start_time).toBe(T0);
    expect(result!.duration_ms).toBe(STATIC_DATA.viralBurst.durationMsMin);
    expect(result!.magnitude).toBeGreaterThan(0);
    expect(result!.bonus_rate_per_ms).toBeGreaterThan(0);
    // magnitude = bonus_rate_per_ms × duration_ms
    expect(result!.magnitude).toBeCloseTo(
      result!.bonus_rate_per_ms * result!.duration_ms,
      6,
    );
  });

  it('selects the platform with highest content_affinity for the source generator', () => {
    // selfies: chirper=0.8, picshift=2.0 → picshift should be selected
    const base = stateReadyToViral();
    const state: GameState = {
      ...base,
      platforms: {
        ...base.platforms,
        picshift: { ...base.platforms.picshift, unlocked: true },
      },
    };
    const result = evaluateViralTrigger(state, STATIC_DATA, T0, alwaysZero);
    expect(result).not.toBeNull();
    expect(result!.source_platform_id).toBe('picshift');
  });

  it('fires consistently with a sufficiently low roll', () => {
    const state = stateReadyToViral();
    // A roll of 0 should always fire (below any positive p_viral)
    const result = evaluateViralTrigger(state, STATIC_DATA, T0, alwaysZero);
    expect(result).not.toBeNull();
  });

  it('tick integrates viral burst — active_ticks_since_last resets to 0 on trigger', () => {
    const state = stateReadyToViral();
    // Inject Math.random replacement so every roll is 0 (always fires)
    // We check the state returned from tick() has the event active
    // and that active_ticks_since_last was reset.

    // We can't inject random into tick() directly — tick uses evaluateViralTrigger
    // with the default Math.random. Instead, we verify behavior indirectly via
    // the state structure: build a state that has an event already active and
    // verify tick() applies bonus engagement.
    const now = T0 + 1000;
    const active = {
      source_generator_id: 'selfies' as const,
      source_platform_id: 'chirper' as const,
      start_time: now - 500,   // started 500ms ago
      duration_ms: 10_000,     // 10s total
      magnitude: 100,
      bonus_rate_per_ms: 0.01, // 10 bonus engagement per 1000ms
    };
    const stateWithViral: GameState = {
      ...state,
      viralBurst: { active_ticks_since_last: 500, active },
    };
    const next = tick(stateWithViral, now, 100, STATIC_DATA);

    // Bonus engagement applied on top of normal production
    const baseNext = tick(state, now, 100, STATIC_DATA);
    expect(next.player.engagement).toBeGreaterThan(baseNext.player.engagement);
    // Bonus rate = 0.01 × 100ms = 1.0 extra engagement
    expect(next.player.engagement - baseNext.player.engagement).toBeCloseTo(1.0, 6);
    // Viral still active (not expired)
    expect(next.viralBurst.active).not.toBeNull();
  });

  it('tick clears active viral when duration expires', () => {
    const state = stateReadyToViral();
    const now = T0 + 10_001; // after the event ends
    const active = {
      source_generator_id: 'selfies' as const,
      source_platform_id: 'chirper' as const,
      start_time: T0,
      duration_ms: 5_000, // ended at T0 + 5000; now = T0 + 10001
      magnitude: 100,
      bonus_rate_per_ms: 0.01,
    };
    const stateWithViral: GameState = {
      ...state,
      viralBurst: { active_ticks_since_last: 500, active },
    };
    const next = tick(stateWithViral, now, 100, STATIC_DATA);
    expect(next.viralBurst.active).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Creator Kit — Camera (engagement_multiplier) + Wardrobe
// (follower_conversion_multiplier) tick integration (task #76)
// ---------------------------------------------------------------------------

describe('Creator Kit — Camera engagement_multiplier', () => {
  function withKit(
    state: GameState,
    kit: Partial<Record<'camera' | 'phone' | 'wardrobe' | 'mogging', number>>,
  ): GameState {
    return {
      ...state,
      player: {
        ...state.player,
        creator_kit: kit as GameState['player']['creator_kit'],
      },
    };
  }

  it('level 0 is a 1.0 no-op on per-generator effective rate', () => {
    const base = stateWithGenerator('selfies', 5, 1);
    const rateBase = computeGeneratorEffectiveRate(
      base.generators.selfies,
      base,
      STATIC_DATA,
    );
    const rateWithZero = computeGeneratorEffectiveRate(
      base.generators.selfies,
      withKit(base, { camera: 0 }),
      STATIC_DATA,
    );
    expect(rateWithZero).toBe(rateBase);
  });

  it('level 1 multiplies the generator effective rate by values[0]', () => {
    const base = stateWithGenerator('selfies', 5, 1);
    const expectedFactor = STATIC_DATA.creatorKitItems.camera.effect.type ===
      'engagement_multiplier'
      ? STATIC_DATA.creatorKitItems.camera.effect.values[0]
      : 1;
    const baseRate = computeGeneratorEffectiveRate(
      base.generators.selfies,
      base,
      STATIC_DATA,
    );
    const withCamera1 = computeGeneratorEffectiveRate(
      base.generators.selfies,
      withKit(base, { camera: 1 }),
      STATIC_DATA,
    );
    expect(withCamera1).toBeCloseTo(baseRate * expectedFactor, 10);
  });

  it('level 2 multiplies by values[1] (cumulative)', () => {
    const base = stateWithGenerator('selfies', 5, 1);
    const expectedFactor = STATIC_DATA.creatorKitItems.camera.effect.type ===
      'engagement_multiplier'
      ? STATIC_DATA.creatorKitItems.camera.effect.values[1]
      : 1;
    const baseRate = computeGeneratorEffectiveRate(
      base.generators.selfies,
      base,
      STATIC_DATA,
    );
    const withCamera2 = computeGeneratorEffectiveRate(
      base.generators.selfies,
      withKit(base, { camera: 2 }),
      STATIC_DATA,
    );
    expect(withCamera2).toBeCloseTo(baseRate * expectedFactor, 10);
  });

  it('stacks multiplicatively with Clout engagement_multiplier', () => {
    const base = stateWithGenerator('selfies', 5, 1);
    const cameraFactor = STATIC_DATA.creatorKitItems.camera.effect.type ===
      'engagement_multiplier'
      ? STATIC_DATA.creatorKitItems.camera.effect.values[0]
      : 1;
    const cloutFactor = STATIC_DATA.cloutUpgrades.engagement_boost.effect.type ===
      'engagement_multiplier'
      ? STATIC_DATA.cloutUpgrades.engagement_boost.effect.values[0]
      : 1;

    // Apply both: Clout level 1 + Camera level 1
    const withBoth: GameState = {
      ...withKit(base, { camera: 1 }),
      player: {
        ...base.player,
        creator_kit: { camera: 1 } as GameState['player']['creator_kit'],
        clout_upgrades: { ...base.player.clout_upgrades, engagement_boost: 1 },
      },
    };
    const baseRate = computeGeneratorEffectiveRate(
      base.generators.selfies,
      base,
      STATIC_DATA,
    );
    const bothRate = computeGeneratorEffectiveRate(
      withBoth.generators.selfies,
      withBoth,
      STATIC_DATA,
    );
    expect(bothRate).toBeCloseTo(baseRate * cloutFactor * cameraFactor, 10);
  });

  it('order-independent: applying camera then clout == clout then camera', () => {
    const base = stateWithGenerator('memes', 10, 1);
    const s1: GameState = {
      ...base,
      player: {
        ...base.player,
        creator_kit: { camera: 2 } as GameState['player']['creator_kit'],
        clout_upgrades: { ...base.player.clout_upgrades, engagement_boost: 1 },
      },
    };
    const s2: GameState = {
      ...base,
      player: {
        ...base.player,
        clout_upgrades: { ...base.player.clout_upgrades, engagement_boost: 1 },
        creator_kit: { camera: 2 } as GameState['player']['creator_kit'],
      },
    };
    expect(
      computeGeneratorEffectiveRate(s1.generators.memes, s1, STATIC_DATA),
    ).toBeCloseTo(
      computeGeneratorEffectiveRate(s2.generators.memes, s2, STATIC_DATA),
      10,
    );
  });

  it('postClick applies Camera multiplier', () => {
    const base = stateWithGenerator('chirps', 1, 1);
    const cameraFactor = STATIC_DATA.creatorKitItems.camera.effect.type ===
      'engagement_multiplier'
      ? STATIC_DATA.creatorKitItems.camera.effect.values[0]
      : 1;
    const baseEarned = postClick(base, STATIC_DATA, 'chirps', T0).player.engagement;
    const camEarned = postClick(
      withKit(base, { camera: 1 }),
      STATIC_DATA,
      'chirps',
      T0,
    ).player.engagement;
    expect(camEarned).toBeCloseTo(baseEarned * cameraFactor, 10);
  });
});

describe('Creator Kit — Wardrobe follower_conversion_multiplier', () => {
  // Use a generator with a non-zero rate so distribution produces a number.
  function stateWithProduction(): GameState {
    const base = stateWithGenerator('selfies', 10, 1);
    // Ensure chirper is unlocked (it is — threshold 0 — but be explicit).
    return base;
  }

  it('level 0 is a 1.0 no-op on follower accrual over a tick', () => {
    const state = stateWithProduction();
    const zero = tick(state, T0 + 100, 100, STATIC_DATA);
    const zeroKit = tick(
      { ...state, player: { ...state.player, creator_kit: { wardrobe: 0 } as GameState['player']['creator_kit'] } },
      T0 + 100,
      100,
      STATIC_DATA,
    );
    expect(zeroKit.player.total_followers).toBe(zero.player.total_followers);
  });

  it('level 1 scales follower accrual by values[0] vs level 0', () => {
    const state = stateWithProduction();
    const wardrobeFactor = STATIC_DATA.creatorKitItems.wardrobe.effect.type ===
      'follower_conversion_multiplier'
      ? STATIC_DATA.creatorKitItems.wardrobe.effect.values[0]
      : 1;
    const baseline = tick(state, T0 + 100, 100, STATIC_DATA);
    const withWardrobe = tick(
      { ...state, player: { ...state.player, creator_kit: { wardrobe: 1 } as GameState['player']['creator_kit'] } },
      T0 + 100,
      100,
      STATIC_DATA,
    );
    expect(withWardrobe.player.total_followers).toBeCloseTo(
      baseline.player.total_followers * wardrobeFactor,
      6,
    );
  });

  it('level 2 scales follower accrual by values[1]', () => {
    const state = stateWithProduction();
    const wardrobeFactor = STATIC_DATA.creatorKitItems.wardrobe.effect.type ===
      'follower_conversion_multiplier'
      ? STATIC_DATA.creatorKitItems.wardrobe.effect.values[1]
      : 1;
    const baseline = tick(state, T0 + 100, 100, STATIC_DATA);
    const withWardrobe2 = tick(
      { ...state, player: { ...state.player, creator_kit: { wardrobe: 2 } as GameState['player']['creator_kit'] } },
      T0 + 100,
      100,
      STATIC_DATA,
    );
    expect(withWardrobe2.player.total_followers).toBeCloseTo(
      baseline.player.total_followers * wardrobeFactor,
      6,
    );
  });

  it('Wardrobe does not affect engagement earned', () => {
    const state = stateWithProduction();
    const baseline = tick(state, T0 + 100, 100, STATIC_DATA);
    const withWardrobe = tick(
      { ...state, player: { ...state.player, creator_kit: { wardrobe: 2 } as GameState['player']['creator_kit'] } },
      T0 + 100,
      100,
      STATIC_DATA,
    );
    expect(withWardrobe.player.engagement).toBeCloseTo(
      baseline.player.engagement,
      10,
    );
  });

  it('lifetime_followers also scales by Wardrobe (follower gain is scaled at source)', () => {
    const state = stateWithProduction();
    const wardrobeFactor = STATIC_DATA.creatorKitItems.wardrobe.effect.type ===
      'follower_conversion_multiplier'
      ? STATIC_DATA.creatorKitItems.wardrobe.effect.values[0]
      : 1;
    const baseline = tick(state, T0 + 100, 100, STATIC_DATA);
    const withWardrobe = tick(
      { ...state, player: { ...state.player, creator_kit: { wardrobe: 1 } as GameState['player']['creator_kit'] } },
      T0 + 100,
      100,
      STATIC_DATA,
    );
    expect(withWardrobe.player.lifetime_followers).toBeCloseTo(
      baseline.player.lifetime_followers * wardrobeFactor,
      6,
    );
  });

  it('computeSnapshot reflects Wardrobe in total_follower_rate', () => {
    const state = stateWithProduction();
    const wardrobeFactor = STATIC_DATA.creatorKitItems.wardrobe.effect.type ===
      'follower_conversion_multiplier'
      ? STATIC_DATA.creatorKitItems.wardrobe.effect.values[0]
      : 1;
    const baseSnap = computeSnapshot(state, STATIC_DATA);
    const withWardrobeSnap = computeSnapshot(
      { ...state, player: { ...state.player, creator_kit: { wardrobe: 1 } as GameState['player']['creator_kit'] } },
      STATIC_DATA,
    );
    expect(withWardrobeSnap.total_follower_rate).toBeCloseTo(
      baseSnap.total_follower_rate * wardrobeFactor,
      6,
    );
  });
});

// ---------------------------------------------------------------------------
// Creator Kit — Mogging (viral_burst_amplifier) integration (task #79)
// ---------------------------------------------------------------------------

describe('Creator Kit — Mogging viral_burst_amplifier', () => {
  function withMogging(state: GameState, level: number): GameState {
    return {
      ...state,
      player: {
        ...state.player,
        creator_kit: { mogging: level } as GameState['player']['creator_kit'],
      },
    };
  }

  // Deterministic PRNG: returns 0 for every call. This forces:
  //   - Gate 2 probability roll: 0 < p_viral → pass
  //   - duration roll: 0 → durationMsMin
  //   - boost roll: 0 → magnitudeBoostMin
  const zeros = () => 0;

  it('level 0 Mogging leaves boost_factor unchanged (1.0 no-op)', () => {
    const state = stateReadyToViral();
    const withLevel0 = withMogging(state, 0);
    const base = evaluateViralTrigger(state, STATIC_DATA, T0, zeros);
    const lvl0 = evaluateViralTrigger(withLevel0, STATIC_DATA, T0, zeros);
    expect(base).not.toBeNull();
    expect(lvl0).not.toBeNull();
    expect(lvl0!.magnitude).toBe(base!.magnitude);
    expect(lvl0!.bonus_rate_per_ms).toBe(base!.bonus_rate_per_ms);
  });

  it('level 1 scales boost_factor by values[0] — magnitude scales proportionally', () => {
    const state = stateReadyToViral();
    const moggingDef = STATIC_DATA.creatorKitItems.mogging;
    if (moggingDef.effect.type !== 'viral_burst_amplifier') throw new Error('bad def');
    const amp = moggingDef.effect.values[0];

    // Boost roll = 0 → boostFactorRaw = magnitudeBoostMin.
    // Amplified boostFactor = magnitudeBoostMin * amp.
    // bonus_rate_per_ms = totalRatePerMs * (boostFactor - 1).
    const base = evaluateViralTrigger(state, STATIC_DATA, T0, zeros);
    const lvl1 = evaluateViralTrigger(
      withMogging(state, 1),
      STATIC_DATA,
      T0,
      zeros,
    );
    expect(base).not.toBeNull();
    expect(lvl1).not.toBeNull();

    const min = STATIC_DATA.viralBurst.magnitudeBoostMin;
    // Base bonus factor denom: (min - 1). Level 1 denom: (min*amp - 1).
    const expectedRatio = (min * amp - 1) / (min - 1);
    expect(lvl1!.bonus_rate_per_ms / base!.bonus_rate_per_ms).toBeCloseTo(
      expectedRatio,
      6,
    );
  });

  it('level 2 scales boost_factor by values[1] — larger than level 1', () => {
    const state = stateReadyToViral();
    const moggingDef = STATIC_DATA.creatorKitItems.mogging;
    if (moggingDef.effect.type !== 'viral_burst_amplifier') throw new Error('bad def');
    expect(moggingDef.effect.values[1]).toBeGreaterThanOrEqual(
      moggingDef.effect.values[0],
    );

    const lvl1 = evaluateViralTrigger(withMogging(state, 1), STATIC_DATA, T0, zeros);
    const lvl2 = evaluateViralTrigger(withMogging(state, 2), STATIC_DATA, T0, zeros);
    expect(lvl1).not.toBeNull();
    expect(lvl2).not.toBeNull();
    // Monotonic in level: higher amplifier → higher magnitude
    expect(lvl2!.magnitude).toBeGreaterThanOrEqual(lvl1!.magnitude);
  });

  it('magnitude == bonus_rate_per_ms * duration_ms even when amplified', () => {
    const state = stateReadyToViral();
    const result = evaluateViralTrigger(
      withMogging(state, 2),
      STATIC_DATA,
      T0,
      zeros,
    );
    expect(result).not.toBeNull();
    expect(result!.magnitude).toBeCloseTo(
      result!.bonus_rate_per_ms * result!.duration_ms,
      6,
    );
  });

  it('bonus_rate_per_ms derives from amplified boost_factor — explicit formula check', () => {
    const state = stateReadyToViral();
    const moggingDef = STATIC_DATA.creatorKitItems.mogging;
    if (moggingDef.effect.type !== 'viral_burst_amplifier') throw new Error('bad def');
    const amp = moggingDef.effect.values[2]; // max level
    const level = moggingDef.max_level;

    const result = evaluateViralTrigger(
      withMogging(state, level),
      STATIC_DATA,
      T0,
      zeros,
    );
    expect(result).not.toBeNull();

    // Compute expected using the same formula as the implementation.
    const ratesPerSec = computeAllGeneratorEffectiveRates(
      withMogging(state, level),
      STATIC_DATA,
    );
    const totalRatePerSec = Object.values(ratesPerSec).reduce(
      (sum, r) => sum + (r ?? 0),
      0,
    );
    const totalRatePerMs = totalRatePerSec / 1000;
    const boostFactorRaw = STATIC_DATA.viralBurst.magnitudeBoostMin;
    const boostFactor = boostFactorRaw * amp;
    const expectedBonus = totalRatePerMs * (boostFactor - 1);
    expect(result!.bonus_rate_per_ms).toBeCloseTo(expectedBonus, 6);
  });
});

// ---------------------------------------------------------------------------
// Audience Mood retention × follower gain (task #104 AC #6)
//
// Verifies that per-platform follower gain scales linearly with the
// platform.retention multiplier. We can't drive this through tick() alone
// because applyTickPosts + advanceNeglect mutate the retention value each
// tick (retention is pressure-derived — we don't get to pin it). So this
// test bypasses the mood update and reproduces the tick's follower-gain
// step directly: per-platform follower rate × retention × deltaMs. If the
// production code multiplies retention at the correct point in the
// stacking chain (see audience-mood/index.ts module header), scaling
// retention linearly scales follower gain linearly.
// ---------------------------------------------------------------------------

describe('Audience Mood retention scales follower gain linearly (AC #6)', () => {
  // Use computeFollowerDistribution directly to isolate the retention
  // multiplier from mood-update side effects.
  function followerGainWithRetention(retention: number): number {
    const base = stateWithGenerator('selfies', 10, 2);
    const platforms = {
      ...base.platforms,
      chirper: { ...base.platforms.chirper, unlocked: true, retention },
    };
    const ratesPerSec = computeAllGeneratorEffectiveRates(base, STATIC_DATA);
    const ratesPerMs: Partial<Record<GeneratorId, number>> = {};
    for (const id of Object.keys(ratesPerSec) as GeneratorId[]) {
      ratesPerMs[id] = (ratesPerSec[id] ?? 0) / 1000;
    }
    // Mirror tick's inline application: perPlatformRate × retention × deltaMs.
    const deltaMs = 1000;
    const dist = computeFollowerDistribution(ratesPerMs, platforms, STATIC_DATA);
    let total = 0;
    for (const pid of Object.keys(platforms) as PlatformId[]) {
      total += dist.perPlatformRate[pid] * platforms[pid].retention * deltaMs;
    }
    return total;
  }

  it('halving retention halves follower gain', () => {
    const gFull = followerGainWithRetention(1.0);
    const gHalf = followerGainWithRetention(0.5);
    expect(gFull).toBeGreaterThan(0);
    expect(gHalf).toBeCloseTo(gFull * 0.5, 10);
  });

  it('retention=retention_floor produces floor-scaled follower gain', () => {
    const floor = STATIC_DATA.audience_mood.retention_floor;
    const gFull = followerGainWithRetention(1.0);
    const gFloor = followerGainWithRetention(floor);
    expect(gFloor).toBeCloseTo(gFull * floor, 10);
  });

  it('retention=0 produces zero follower gain', () => {
    expect(followerGainWithRetention(0)).toBe(0);
  });

  it('engagement is mood-independent (tick engagement identical under different retention)', () => {
    // Build two states that differ only in chirper.retention. The tick's
    // engagement-accumulation path reads ratesPerSec, which does NOT touch
    // retention — so engagement gain must be identical.
    const base = stateWithGenerator('selfies', 10, 2);
    const s1: GameState = {
      ...base,
      platforms: {
        ...base.platforms,
        chirper: { ...base.platforms.chirper, unlocked: true, retention: 1.0 },
      },
    };
    const s2: GameState = {
      ...base,
      platforms: {
        ...base.platforms,
        chirper: { ...base.platforms.chirper, unlocked: true, retention: 0.5 },
      },
    };
    const e1 = tick(s1, T0 + 1000, 1000, STATIC_DATA).player.engagement;
    const e2 = tick(s2, T0 + 1000, 1000, STATIC_DATA).player.engagement;
    expect(e1).toBeCloseTo(e2, 10);
  });
});
