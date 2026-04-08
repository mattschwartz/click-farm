// Prestige tests — rebrand mechanics and clout-upgrade purchase.

import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import '../test/decimal-matchers.ts';
import {
  cloutForRebrand,
  calculateRebrand,
  applyRebrand,
  cloutUpgradeCost,
  canPurchaseCloutUpgrade,
  purchaseCloutUpgrade,
} from './index.ts';
import { createInitialGameState } from '../model/index.ts';
import { STATIC_DATA } from '../static-data/index.ts';
import { cloutBonus } from '../game-loop/index.ts';
import type { GameState, StaticData, CloutUpgradeDef, UpgradeId } from '../types.ts';

const T0 = 1_000_000;

function seedState(overrides?: Omit<Partial<GameState['player']>, 'total_followers' | 'lifetime_followers' | 'lifetime_engagement' | 'engagement'> & {
  total_followers?: number;
  lifetime_followers?: number;
  lifetime_engagement?: number;
  engagement?: number;
}): GameState {
  const s = createInitialGameState(STATIC_DATA, T0);
  // Separate Decimal fields from the rest to avoid type conflicts
  const { total_followers, lifetime_followers, lifetime_engagement, engagement, ...rest } = overrides ?? {};
  const player: GameState['player'] = {
    ...s.player,
    ...rest,
    ...(total_followers !== undefined ? { total_followers: new Decimal(total_followers) } : {}),
    ...(lifetime_followers !== undefined ? { lifetime_followers: new Decimal(lifetime_followers) } : {}),
    ...(lifetime_engagement !== undefined ? { lifetime_engagement: new Decimal(lifetime_engagement) } : {}),
    ...(engagement !== undefined ? { engagement: new Decimal(engagement) } : {}),
  };
  return { ...s, player };
}

// ---------------------------------------------------------------------------
// cloutForRebrand — Clout formula
// ---------------------------------------------------------------------------

describe('cloutForRebrand', () => {
  it('returns 0 for 0 followers', () => {
    expect(cloutForRebrand(new Decimal(0))).toBe(0);
  });

  it('returns 0 for followers ≤ 0', () => {
    expect(cloutForRebrand(new Decimal(-1))).toBe(0);
    expect(cloutForRebrand(new Decimal(0))).toBe(0);
  });

  it('returns floor(log10(f) * 3) for known values', () => {
    // log10(10) = 1 → 1 * 3 = 3
    expect(cloutForRebrand(new Decimal(10))).toBe(3);
    // log10(100) = 2 → 2 * 3 = 6
    expect(cloutForRebrand(new Decimal(100))).toBe(6);
    // log10(1000) = 3 → 3 * 3 = 9
    expect(cloutForRebrand(new Decimal(1000))).toBe(9);
    // log10(10_000) = 4 → 4 * 3 = 12
    expect(cloutForRebrand(new Decimal(10_000))).toBe(12);
  });

  it('returns integer values', () => {
    for (const n of [1, 50, 500, 5_000, 50_000, 500_000, 5_000_000]) {
      expect(Number.isInteger(cloutForRebrand(new Decimal(n)))).toBe(true);
    }
  });

  it('guards against negative and NaN inputs', () => {
    expect(cloutForRebrand(new Decimal(-1))).toBe(0);
    expect(cloutForRebrand(new Decimal(NaN))).toBe(0);
  });

  it('scales logarithmically — 10× followers adds 3 Clout', () => {
    const base = cloutForRebrand(new Decimal(10_000));  // log10=4 → 12
    const tenX = cloutForRebrand(new Decimal(100_000)); // log10=5 → 15
    expect(tenX - base).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// calculateRebrand — pure computation
// ---------------------------------------------------------------------------

describe('calculateRebrand', () => {
  it('returns Clout based on current total_followers only (not lifetime)', () => {
    const state = seedState({
      total_followers: 10_000,
      lifetime_followers: 50_000, // higher, but shouldn't count
    });
    // log10(10_000) = 4 → 4 * 3 = 12
    expect(calculateRebrand(state).cloutEarned).toBe(12);
  });

  it('is deterministic — same state in, same result out', () => {
    const s = seedState({ total_followers: 250_000 });
    const a = calculateRebrand(s);
    const b = calculateRebrand(s);
    expect(a).toEqual(b);
  });
});

// ---------------------------------------------------------------------------
// applyRebrand — reset + preserve contract
// ---------------------------------------------------------------------------

describe('applyRebrand — reset completeness', () => {
  function setupMidRun(): GameState {
    // A state mid-run with engagement, generators, platforms, non-zero followers.
    const base = seedState({
      total_followers: 40_000,
      lifetime_followers: 60_000,
      engagement: 12_345.67,
      clout: 5,
      rebrand_count: 2,
    });
    return {
      ...base,
      generators: {
        ...base.generators,
        selfies: { ...base.generators.selfies, owned: true, level: 4, count: 30 },
        memes: { ...base.generators.memes, owned: true, level: 2, count: 12 },
        hot_takes: { ...base.generators.hot_takes, owned: true, level: 1, count: 5 },
      },
      platforms: {
        ...base.platforms,
        chirper: { ...base.platforms.chirper, unlocked: true, followers: new Decimal(20_000) },
        picshift: { ...base.platforms.picshift, unlocked: true, followers: new Decimal(18_000) },
        skroll: { ...base.platforms.skroll, unlocked: true, followers: new Decimal(2_000) },
      },
    };
  }

  it('wipes engagement to 0', () => {
    const state = setupMidRun();
    const result = calculateRebrand(state);
    const next = applyRebrand(state, result, STATIC_DATA, T0 + 1000);
    expect(next.player.engagement).toEqualDecimal(0);
  });

  it('wipes total_followers and per-platform followers to 0', () => {
    const state = setupMidRun();
    const result = calculateRebrand(state);
    const next = applyRebrand(state, result, STATIC_DATA, T0 + 1000);
    expect(next.player.total_followers).toEqualDecimal(0);
    expect(next.platforms.chirper.followers).toEqualDecimal(0);
    expect(next.platforms.picshift.followers).toEqualDecimal(0);
    expect(next.platforms.skroll.followers).toEqualDecimal(0);
  });

  it('resets generators: count=0, level=1, and owned only for threshold=0 (mirrors fresh start)', () => {
    const state = setupMidRun();
    const next = applyRebrand(state, calculateRebrand(state), STATIC_DATA, T0 + 1000);
    for (const id of Object.keys(next.generators) as Array<keyof typeof next.generators>) {
      const threshold = STATIC_DATA.unlockThresholds.generators[id];
      expect(next.generators[id].owned).toBe(threshold === 0);
      expect(next.generators[id].count).toBe(0);
      expect(next.generators[id].level).toBe(1);
    }
  });

  it('relocks platforms whose threshold > 0 (no head-start)', () => {
    const state = setupMidRun();
    const next = applyRebrand(state, calculateRebrand(state), STATIC_DATA, T0 + 1000);
    expect(next.platforms.chirper.unlocked).toBe(true);   // threshold = 0
    expect(next.platforms.picshift.unlocked).toBe(false); // threshold = 100
    expect(next.platforms.skroll.unlocked).toBe(false);  // threshold = 15_000
  });

  it('resets viralBurst to a clean default (prevents doTick crash on next tick)', () => {
    const state = setupMidRun();
    // Simulate an in-progress viral burst at the moment of rebrand.
    const withActive = {
      ...state,
      viralBurst: {
        active_ticks_since_last: 42,
        active: {
          source_generator_id: 'selfies' as const,
          source_platform_id: 'chirper' as const,
          start_time: T0,
          duration_ms: 5000,
          magnitude: new Decimal(10),
          bonus_rate_per_ms: new Decimal(1),
        },
      },
    };
    const next = applyRebrand(withActive, calculateRebrand(withActive), STATIC_DATA, T0 + 1000);
    expect(next.viralBurst).toBeDefined();
    expect(next.viralBurst.active).toBeNull();
    expect(next.viralBurst.active_ticks_since_last).toBe(0);
  });

});

describe('applyRebrand — preservation of meta', () => {
  it('adds earned Clout to existing Clout', () => {
    const state = seedState({ total_followers: 40_000, clout: 7 });
    const result = calculateRebrand(state); // log10(40000)*3 = 4.602*3 = floor(13.806) = 13
    const next = applyRebrand(state, result, STATIC_DATA, T0 + 1000);
    expect(next.player.clout).toBe(7 + 13);
  });

  it('preserves lifetime_followers (compounds across runs)', () => {
    const state = seedState({
      total_followers: 10_000,
      lifetime_followers: 100_000,
    });
    const next = applyRebrand(state, calculateRebrand(state), STATIC_DATA, T0 + 1000);
    expect(next.player.lifetime_followers).toEqualDecimal(100_000);
  });

  it('preserves clout_upgrades across rebrand', () => {
    const state = seedState({ total_followers: 1_000 });
    state.player.clout_upgrades.engagement_boost = 2;
    const next = applyRebrand(state, calculateRebrand(state), STATIC_DATA, T0 + 1000);
    expect(next.player.clout_upgrades.engagement_boost).toBe(2);
  });

  it('preserves player.id across rebrand', () => {
    const state = seedState({ total_followers: 1_000 });
    const originalId = state.player.id;
    const next = applyRebrand(state, calculateRebrand(state), STATIC_DATA, T0 + 1000);
    expect(next.player.id).toBe(originalId);
  });

  it('increments rebrand_count by 1', () => {
    const state = seedState({ total_followers: 1_000, rebrand_count: 3 });
    const next = applyRebrand(state, calculateRebrand(state), STATIC_DATA, T0 + 1000);
    expect(next.player.rebrand_count).toBe(4);
  });

  it('resets run_start_time to now', () => {
    const state = seedState({ total_followers: 1_000 });
    const next = applyRebrand(state, calculateRebrand(state), STATIC_DATA, T0 + 5_000);
    expect(next.player.run_start_time).toBe(T0 + 5_000);
  });

  it('wipes verb_gear — per-run gear does NOT survive rebrand', () => {
    const state = seedState({ total_followers: 1_000 });
    (state.player.verb_gear as Record<string, number>).chirps = 2;
    (state.player.verb_gear as Record<string, number>).selfies = 1;
    const next = applyRebrand(state, calculateRebrand(state), STATIC_DATA, T0 + 1000);
    expect(next.player.verb_gear).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// applyRebrand — meta-upgrade effects at rebrand
// ---------------------------------------------------------------------------

describe('applyRebrand — meta-upgrade effects', () => {
  it('platform_headstart unlocks the named platform on the new run', () => {
    const state = seedState({ total_followers: 1_000 });
    state.player.clout_upgrades.platform_headstart_picshift = 1;
    const next = applyRebrand(state, calculateRebrand(state), STATIC_DATA, T0 + 1000);
    expect(next.platforms.picshift.unlocked).toBe(true);
    expect(next.platforms.skroll.unlocked).toBe(false); // not purchased
  });

  it('multiple platform_headstart upgrades all apply', () => {
    const state = seedState({ total_followers: 1_000 });
    state.player.clout_upgrades.platform_headstart_picshift = 1;
    state.player.clout_upgrades.platform_headstart_skroll = 1;
    const next = applyRebrand(state, calculateRebrand(state), STATIC_DATA, T0 + 1000);
    expect(next.platforms.picshift.unlocked).toBe(true);
    expect(next.platforms.skroll.unlocked).toBe(true);
  });

  it('generator_unlock grants owned=true on the new run (via stub upgrade)', () => {
    // No existing upgrades use generator_unlock — add a stub to verify the
    // mechanism works. Post-prestige generators will come in a later task.
    const staticDataWithStub: StaticData = {
      ...STATIC_DATA,
      cloutUpgrades: {
        ...STATIC_DATA.cloutUpgrades,
        engagement_boost: {
          // Hijack engagement_boost as a generator_unlock stub for this test.
          id: 'engagement_boost',
          cost: [1],
          max_level: 1,
          effect: { type: 'generator_unlock', generator_id: 'memes' },
        } as CloutUpgradeDef,
      },
    };
    const state = seedState({ total_followers: 1_000 });
    state.player.clout_upgrades.engagement_boost = 1;
    const next = applyRebrand(
      state,
      calculateRebrand(state),
      staticDataWithStub,
      T0 + 1000,
    );
    expect(next.generators.memes.owned).toBe(true);
    expect(next.generators.memes.level).toBe(1);
    expect(next.generators.memes.count).toBe(0);
  });

  it('ai_slop_unlock grants owned=true on ai_slop after rebrand (real upgrade)', () => {
    const state = seedState({ total_followers: 1_000 });
    state.player.clout_upgrades.ai_slop_unlock = 1;
    const next = applyRebrand(state, calculateRebrand(state), STATIC_DATA, T0 + 1000);
    expect(next.generators.ai_slop.owned).toBe(true);
    expect(next.generators.ai_slop.level).toBe(1);
    expect(next.generators.ai_slop.count).toBe(0);
    // Un-purchased post-prestige generators remain locked.
    expect(next.generators.deepfakes.owned).toBe(false);
    expect(next.generators.algorithmic_prophecy.owned).toBe(false);
  });

  it('engagement_multiplier continues to apply to rates after rebrand', () => {
    // This is already tested in game-loop, but verify end-to-end: buy the
    // upgrade, rebrand, observe the bonus.
    const state = seedState({ total_followers: 1_000 });
    state.player.clout_upgrades.engagement_boost = 2;
    const next = applyRebrand(state, calculateRebrand(state), STATIC_DATA, T0 + 1000);
    // engagement_boost level 2 → values[1] = 2.5
    expect(cloutBonus(next.player.clout_upgrades, STATIC_DATA)).toBeCloseTo(2.5, 6);
  });
});

// ---------------------------------------------------------------------------
// Clout upgrade purchase
// ---------------------------------------------------------------------------

describe('cloutUpgradeCost + purchaseCloutUpgrade', () => {
  it('returns cost[0] for first level (going 0 → 1)', () => {
    const cost = cloutUpgradeCost(0, 'engagement_boost', STATIC_DATA);
    expect(cost).toBe(STATIC_DATA.cloutUpgrades.engagement_boost.cost[0]);
  });

  it('returns cost[1] for second level', () => {
    const cost = cloutUpgradeCost(1, 'engagement_boost', STATIC_DATA);
    expect(cost).toBe(STATIC_DATA.cloutUpgrades.engagement_boost.cost[1]);
  });

  it('returns null at max level', () => {
    const max = STATIC_DATA.cloutUpgrades.engagement_boost.max_level;
    expect(cloutUpgradeCost(max, 'engagement_boost', STATIC_DATA)).toBeNull();
  });

  it('canPurchaseCloutUpgrade true when player has enough clout', () => {
    const s = seedState({ clout: 100 });
    expect(canPurchaseCloutUpgrade(s, 'engagement_boost', STATIC_DATA)).toBe(true);
  });

  it('canPurchaseCloutUpgrade false when player lacks clout', () => {
    const s = seedState({ clout: 0 });
    expect(canPurchaseCloutUpgrade(s, 'engagement_boost', STATIC_DATA)).toBe(false);
  });

  it('canPurchaseCloutUpgrade false at max level', () => {
    const s = seedState({ clout: 9_999 });
    s.player.clout_upgrades.engagement_boost =
      STATIC_DATA.cloutUpgrades.engagement_boost.max_level;
    expect(canPurchaseCloutUpgrade(s, 'engagement_boost', STATIC_DATA)).toBe(false);
  });

  it('purchaseCloutUpgrade deducts cost and increments level', () => {
    const s = seedState({ clout: 100 });
    const cost = cloutUpgradeCost(0, 'engagement_boost', STATIC_DATA)!;
    const next = purchaseCloutUpgrade(s, 'engagement_boost', STATIC_DATA);
    expect(next.player.clout).toBe(100 - cost);
    expect(next.player.clout_upgrades.engagement_boost).toBe(1);
  });

  it('throws when clout insufficient', () => {
    const s = seedState({ clout: 0 });
    expect(() =>
      purchaseCloutUpgrade(s, 'engagement_boost', STATIC_DATA),
    ).toThrow(/need .* clout/);
  });

  it('throws at max level', () => {
    const s = seedState({ clout: 9_999 });
    s.player.clout_upgrades.engagement_boost =
      STATIC_DATA.cloutUpgrades.engagement_boost.max_level;
    expect(() =>
      purchaseCloutUpgrade(s, 'engagement_boost', STATIC_DATA),
    ).toThrow(/max level/);
  });

  it('successive purchases walk the cost table', () => {
    let s = seedState({ clout: 1_000 });
    const max = STATIC_DATA.cloutUpgrades.engagement_boost.max_level;
    for (let level = 0; level < max; level++) {
      const cost = cloutUpgradeCost(level, 'engagement_boost', STATIC_DATA)!;
      const before = s.player.clout;
      s = purchaseCloutUpgrade(s, 'engagement_boost', STATIC_DATA);
      expect(s.player.clout_upgrades.engagement_boost).toBe(level + 1);
      expect(s.player.clout).toBe(before - cost);
    }
    expect(canPurchaseCloutUpgrade(s, 'engagement_boost', STATIC_DATA)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// End-to-end rebrand flow
// ---------------------------------------------------------------------------

describe('end-to-end rebrand flow', () => {
  it('earn → rebrand → Clout available → buy upgrade → rebrand again', () => {
    // Run 1: generate 10_000 followers, rebrand. log10(10000)*3 = 12 Clout.
    const run1 = seedState({ total_followers: 10_000, lifetime_followers: 10_000 });
    const r1 = calculateRebrand(run1);
    const afterR1 = applyRebrand(run1, r1, STATIC_DATA, T0 + 1000);
    expect(afterR1.player.clout).toBe(12);

    // Buy engagement_boost level 1 (cost 1 in current static data).
    const upgraded = purchaseCloutUpgrade(afterR1, 'engagement_boost', STATIC_DATA);
    expect(upgraded.player.clout_upgrades.engagement_boost).toBe(1);

    // Run 2: generate 40_000 followers, rebrand. log10(40000)*3 = floor(13.806) = 13 Clout.
    const run2: GameState = {
      ...upgraded,
      player: {
        ...upgraded.player,
        total_followers: new Decimal(40_000),
        lifetime_followers: new Decimal(10_000 + 40_000),
      },
      platforms: {
        ...upgraded.platforms,
        chirper: { ...upgraded.platforms.chirper, followers: new Decimal(40_000) },
      },
    };
    const r2 = calculateRebrand(run2);
    expect(r2.cloutEarned).toBe(13);
    const afterR2 = applyRebrand(run2, r2, STATIC_DATA, T0 + 2000);
    // Previous clout balance (after purchase) + newly earned.
    expect(afterR2.player.clout).toBe(upgraded.player.clout + 13);
    expect(afterR2.player.rebrand_count).toBe(upgraded.player.rebrand_count + 1);
    expect(afterR2.player.clout_upgrades.engagement_boost).toBe(1);
  });
});

// Silence unused import warning — UpgradeId is referenced via clout_upgrades keys.
const _u: UpgradeId = 'engagement_boost';
void _u;
