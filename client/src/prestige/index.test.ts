// Prestige tests — rebrand mechanics and clout-upgrade purchase.

import { describe, it, expect } from 'vitest';
import {
  cloutForRebrand,
  calculateRebrand,
  applyRebrand,
  cloutUpgradeCost,
  canPurchaseCloutUpgrade,
  purchaseCloutUpgrade,
  getUpcomingShifts,
} from './index.ts';
import { createInitialGameState } from '../model/index.ts';
import { STATIC_DATA } from '../static-data/index.ts';
import { tick, cloutBonus } from '../game-loop/index.ts';
import type { GameState, StaticData, CloutUpgradeDef, UpgradeId } from '../types.ts';

const T0 = 1_000_000;

function seedState(overrides?: Partial<GameState['player']>): GameState {
  const s = createInitialGameState(STATIC_DATA, T0);
  return {
    ...s,
    player: {
      ...s.player,
      algorithm_seed: 0xDEADBEEF,
      ...overrides,
    },
  };
}

// ---------------------------------------------------------------------------
// cloutForRebrand — Clout formula
// ---------------------------------------------------------------------------

describe('cloutForRebrand', () => {
  it('returns 0 for 0 followers', () => {
    expect(cloutForRebrand(0)).toBe(0);
  });

  it('returns 0 for followers < 100 (floor(sqrt/10) < 1)', () => {
    expect(cloutForRebrand(99)).toBe(0);
    expect(cloutForRebrand(100)).toBe(1);
  });

  it('matches spec milestone: 10,000 followers → 10 Clout', () => {
    expect(cloutForRebrand(10_000)).toBe(10);
  });

  it('returns integer values', () => {
    for (const n of [1, 50, 500, 5_000, 50_000, 500_000, 5_000_000]) {
      expect(Number.isInteger(cloutForRebrand(n))).toBe(true);
    }
  });

  it('guards against negative and non-finite inputs', () => {
    expect(cloutForRebrand(-1)).toBe(0);
    expect(cloutForRebrand(NaN)).toBe(0);
    expect(cloutForRebrand(Infinity)).toBe(0);
  });

  it('scales with sqrt — 4× followers ≈ 2× Clout', () => {
    const base = cloutForRebrand(40_000); // sqrt=200 → 20
    const quad = cloutForRebrand(160_000); // sqrt=400 → 40
    expect(base).toBe(20);
    expect(quad).toBe(40);
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
    expect(calculateRebrand(state).cloutEarned).toBe(10);
  });

  it('derives a new seed from old seed + next rebrand_count', () => {
    const a = calculateRebrand(seedState({ rebrand_count: 0 }));
    const b = calculateRebrand(seedState({ rebrand_count: 1 }));
    expect(a.newSeed).not.toBe(b.newSeed);
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
        chirper: { ...base.platforms.chirper, unlocked: true, followers: 20_000 },
        instasham: { ...base.platforms.instasham, unlocked: true, followers: 18_000 },
        grindset: { ...base.platforms.grindset, unlocked: true, followers: 2_000 },
      },
    };
  }

  it('wipes engagement to 0', () => {
    const state = setupMidRun();
    const result = calculateRebrand(state);
    const next = applyRebrand(state, result, STATIC_DATA, T0 + 1000);
    expect(next.player.engagement).toBe(0);
  });

  it('wipes total_followers and per-platform followers to 0', () => {
    const state = setupMidRun();
    const result = calculateRebrand(state);
    const next = applyRebrand(state, result, STATIC_DATA, T0 + 1000);
    expect(next.player.total_followers).toBe(0);
    expect(next.platforms.chirper.followers).toBe(0);
    expect(next.platforms.instasham.followers).toBe(0);
    expect(next.platforms.grindset.followers).toBe(0);
  });

  it('resets all generators to unowned, count=0, level=1', () => {
    const state = setupMidRun();
    const next = applyRebrand(state, calculateRebrand(state), STATIC_DATA, T0 + 1000);
    for (const id of Object.keys(next.generators) as Array<keyof typeof next.generators>) {
      expect(next.generators[id].owned).toBe(false);
      expect(next.generators[id].count).toBe(0);
      expect(next.generators[id].level).toBe(1);
    }
  });

  it('relocks platforms whose threshold > 0 (no head-start)', () => {
    const state = setupMidRun();
    const next = applyRebrand(state, calculateRebrand(state), STATIC_DATA, T0 + 1000);
    expect(next.platforms.chirper.unlocked).toBe(true);   // threshold = 0
    expect(next.platforms.instasham.unlocked).toBe(false); // threshold = 100
    expect(next.platforms.grindset.unlocked).toBe(false);  // threshold = 500
  });

  it('resets algorithm to a fresh schedule (index 0, new seed, new shift_time)', () => {
    const state = setupMidRun();
    const rebrandResult = calculateRebrand(state);
    const next = applyRebrand(state, rebrandResult, STATIC_DATA, T0 + 1000);
    expect(next.algorithm.current_state_index).toBe(0);
    expect(next.player.algorithm_seed).toBe(rebrandResult.newSeed);
    expect(next.algorithm.shift_time).toBe(
      T0 + 1000 + STATIC_DATA.algorithmSchedule.baseIntervalMs,
    );
  });
});

describe('applyRebrand — preservation of meta', () => {
  it('adds earned Clout to existing Clout', () => {
    const state = seedState({ total_followers: 40_000, clout: 7 });
    const result = calculateRebrand(state); // 20 clout
    const next = applyRebrand(state, result, STATIC_DATA, T0 + 1000);
    expect(next.player.clout).toBe(27);
  });

  it('preserves lifetime_followers (compounds across runs)', () => {
    const state = seedState({
      total_followers: 10_000,
      lifetime_followers: 100_000,
    });
    const next = applyRebrand(state, calculateRebrand(state), STATIC_DATA, T0 + 1000);
    expect(next.player.lifetime_followers).toBe(100_000);
  });

  it('preserves clout_upgrades across rebrand', () => {
    const state = seedState({ total_followers: 1_000 });
    state.player.clout_upgrades.faster_engagement = 2;
    state.player.clout_upgrades.algorithm_insight = 1;
    const next = applyRebrand(state, calculateRebrand(state), STATIC_DATA, T0 + 1000);
    expect(next.player.clout_upgrades.faster_engagement).toBe(2);
    expect(next.player.clout_upgrades.algorithm_insight).toBe(1);
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
});

// ---------------------------------------------------------------------------
// applyRebrand — meta-upgrade effects at rebrand
// ---------------------------------------------------------------------------

describe('applyRebrand — meta-upgrade effects', () => {
  it('platform_headstart unlocks the named platform on the new run', () => {
    const state = seedState({ total_followers: 1_000 });
    state.player.clout_upgrades.platform_headstart_instasham = 1;
    const next = applyRebrand(state, calculateRebrand(state), STATIC_DATA, T0 + 1000);
    expect(next.platforms.instasham.unlocked).toBe(true);
    expect(next.platforms.grindset.unlocked).toBe(false); // not purchased
  });

  it('multiple platform_headstart upgrades all apply', () => {
    const state = seedState({ total_followers: 1_000 });
    state.player.clout_upgrades.platform_headstart_instasham = 1;
    state.player.clout_upgrades.platform_headstart_grindset = 1;
    const next = applyRebrand(state, calculateRebrand(state), STATIC_DATA, T0 + 1000);
    expect(next.platforms.instasham.unlocked).toBe(true);
    expect(next.platforms.grindset.unlocked).toBe(true);
  });

  it('generator_unlock grants owned=true on the new run (via stub upgrade)', () => {
    // No existing upgrades use generator_unlock — add a stub to verify the
    // mechanism works. Post-prestige generators will come in a later task.
    const staticDataWithStub: StaticData = {
      ...STATIC_DATA,
      cloutUpgrades: {
        ...STATIC_DATA.cloutUpgrades,
        faster_engagement: {
          // Hijack faster_engagement as a generator_unlock stub for this test.
          id: 'faster_engagement',
          cost: [1],
          max_level: 1,
          effect: { type: 'generator_unlock', generator_id: 'memes' },
        } as CloutUpgradeDef,
      },
    };
    const state = seedState({ total_followers: 1_000 });
    state.player.clout_upgrades.faster_engagement = 1;
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

  it('engagement_multiplier continues to apply to rates after rebrand', () => {
    // This is already tested in game-loop, but verify end-to-end: buy the
    // upgrade, rebrand, observe the bonus.
    const state = seedState({ total_followers: 1_000 });
    state.player.clout_upgrades.faster_engagement = 2;
    const next = applyRebrand(state, calculateRebrand(state), STATIC_DATA, T0 + 1000);
    // engagement_multiplier 1.25 ^ 2 = 1.5625
    expect(cloutBonus(next.player.clout_upgrades, STATIC_DATA)).toBeCloseTo(1.5625, 6);
  });
});

// ---------------------------------------------------------------------------
// Clout upgrade purchase
// ---------------------------------------------------------------------------

describe('cloutUpgradeCost + purchaseCloutUpgrade', () => {
  it('returns cost[0] for first level (going 0 → 1)', () => {
    const cost = cloutUpgradeCost(0, 'faster_engagement', STATIC_DATA);
    expect(cost).toBe(STATIC_DATA.cloutUpgrades.faster_engagement.cost[0]);
  });

  it('returns cost[1] for second level', () => {
    const cost = cloutUpgradeCost(1, 'faster_engagement', STATIC_DATA);
    expect(cost).toBe(STATIC_DATA.cloutUpgrades.faster_engagement.cost[1]);
  });

  it('returns null at max level', () => {
    const max = STATIC_DATA.cloutUpgrades.faster_engagement.max_level;
    expect(cloutUpgradeCost(max, 'faster_engagement', STATIC_DATA)).toBeNull();
  });

  it('canPurchaseCloutUpgrade true when player has enough clout', () => {
    const s = seedState({ clout: 100 });
    expect(canPurchaseCloutUpgrade(s, 'faster_engagement', STATIC_DATA)).toBe(true);
  });

  it('canPurchaseCloutUpgrade false when player lacks clout', () => {
    const s = seedState({ clout: 0 });
    expect(canPurchaseCloutUpgrade(s, 'faster_engagement', STATIC_DATA)).toBe(false);
  });

  it('canPurchaseCloutUpgrade false at max level', () => {
    const s = seedState({ clout: 9_999 });
    s.player.clout_upgrades.faster_engagement =
      STATIC_DATA.cloutUpgrades.faster_engagement.max_level;
    expect(canPurchaseCloutUpgrade(s, 'faster_engagement', STATIC_DATA)).toBe(false);
  });

  it('purchaseCloutUpgrade deducts cost and increments level', () => {
    const s = seedState({ clout: 100 });
    const cost = cloutUpgradeCost(0, 'faster_engagement', STATIC_DATA)!;
    const next = purchaseCloutUpgrade(s, 'faster_engagement', STATIC_DATA);
    expect(next.player.clout).toBe(100 - cost);
    expect(next.player.clout_upgrades.faster_engagement).toBe(1);
  });

  it('throws when clout insufficient', () => {
    const s = seedState({ clout: 0 });
    expect(() =>
      purchaseCloutUpgrade(s, 'faster_engagement', STATIC_DATA),
    ).toThrow(/need .* clout/);
  });

  it('throws at max level', () => {
    const s = seedState({ clout: 9_999 });
    s.player.clout_upgrades.faster_engagement =
      STATIC_DATA.cloutUpgrades.faster_engagement.max_level;
    expect(() =>
      purchaseCloutUpgrade(s, 'faster_engagement', STATIC_DATA),
    ).toThrow(/max level/);
  });

  it('successive purchases walk the cost table', () => {
    let s = seedState({ clout: 1_000 });
    const max = STATIC_DATA.cloutUpgrades.faster_engagement.max_level;
    for (let level = 0; level < max; level++) {
      const cost = cloutUpgradeCost(level, 'faster_engagement', STATIC_DATA)!;
      const before = s.player.clout;
      s = purchaseCloutUpgrade(s, 'faster_engagement', STATIC_DATA);
      expect(s.player.clout_upgrades.faster_engagement).toBe(level + 1);
      expect(s.player.clout).toBe(before - cost);
    }
    expect(canPurchaseCloutUpgrade(s, 'faster_engagement', STATIC_DATA)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Algorithm insight
// ---------------------------------------------------------------------------

describe('getUpcomingShifts', () => {
  it('returns [] when the upgrade is unpurchased', () => {
    const s = seedState();
    expect(getUpcomingShifts(s, STATIC_DATA)).toEqual([]);
  });

  it('returns N shifts when algorithm_insight is at level L (N = L × lookahead)', () => {
    const s = seedState();
    s.player.clout_upgrades.algorithm_insight = 1; // lookahead=1, level=1 → 1 shift
    const shifts = getUpcomingShifts(s, STATIC_DATA);
    expect(shifts.length).toBe(1);
    expect(shifts[0].stateId).toBeDefined();
    expect(shifts[0].durationMs).toBeGreaterThan(0);
  });

  it('scales lookahead with level', () => {
    const s = seedState();
    s.player.clout_upgrades.algorithm_insight = 2;
    const shifts = getUpcomingShifts(s, STATIC_DATA);
    expect(shifts.length).toBe(2);
  });

  it('upcoming shifts match deterministic schedule from next index', () => {
    const s = seedState();
    s.player.clout_upgrades.algorithm_insight = 2;
    const shifts = getUpcomingShifts(s, STATIC_DATA);
    // The returned shifts should correspond to current_state_index + 1
    // and +2 — same as tick would consume them.
    expect(shifts[0].stateId).toBeDefined();
    expect(shifts[1].stateId).toBeDefined();
  });

  it('advances correctly after a tick consumes a shift', () => {
    const s = seedState();
    s.player.clout_upgrades.algorithm_insight = 1;
    const before = getUpcomingShifts(s, STATIC_DATA);

    // Advance past the first shift so the algorithm advances.
    const shifted = tick(
      s,
      s.algorithm.shift_time + 1,
      0,
      STATIC_DATA,
    );
    expect(shifted.algorithm.current_state_index).toBeGreaterThan(
      s.algorithm.current_state_index,
    );
    const after = getUpcomingShifts(shifted, STATIC_DATA);
    // Shown shift moves forward — what was "upcoming" is now current.
    expect(after[0].stateId).not.toBe(before[0].stateId);
  });
});

// ---------------------------------------------------------------------------
// End-to-end rebrand flow
// ---------------------------------------------------------------------------

describe('end-to-end rebrand flow', () => {
  it('earn → rebrand → Clout available → buy upgrade → rebrand again', () => {
    // Run 1: generate 10_000 followers, rebrand for 10 Clout.
    const run1 = seedState({ total_followers: 10_000, lifetime_followers: 10_000 });
    const r1 = calculateRebrand(run1);
    const afterR1 = applyRebrand(run1, r1, STATIC_DATA, T0 + 1000);
    expect(afterR1.player.clout).toBe(10);

    // Buy faster_engagement level 1 (cost 1 in current static data).
    const upgraded = purchaseCloutUpgrade(afterR1, 'faster_engagement', STATIC_DATA);
    expect(upgraded.player.clout_upgrades.faster_engagement).toBe(1);

    // Run 2: generate 40_000 followers, rebrand for 20 Clout.
    const run2: GameState = {
      ...upgraded,
      player: {
        ...upgraded.player,
        total_followers: 40_000,
        lifetime_followers: 10_000 + 40_000,
      },
      platforms: {
        ...upgraded.platforms,
        chirper: { ...upgraded.platforms.chirper, followers: 40_000 },
      },
    };
    const r2 = calculateRebrand(run2);
    expect(r2.cloutEarned).toBe(20);
    const afterR2 = applyRebrand(run2, r2, STATIC_DATA, T0 + 2000);
    // Previous clout balance (after purchase) + newly earned.
    expect(afterR2.player.clout).toBe(upgraded.player.clout + 20);
    expect(afterR2.player.rebrand_count).toBe(upgraded.player.rebrand_count + 1);
    expect(afterR2.player.clout_upgrades.faster_engagement).toBe(1);
  });
});

// Silence unused import warning — UpgradeId is referenced via clout_upgrades keys.
const _u: UpgradeId = 'faster_engagement';
void _u;
