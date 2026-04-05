import { describe, it, expect } from 'vitest';
import {
  generatorBuyCost,
  generatorUpgradeCost,
  checkGeneratorUnlocks,
  buyGenerator,
  upgradeGenerator,
} from './index.ts';
import { STATIC_DATA } from '../static-data/index.ts';
import {
  createInitialGameState,
  createGeneratorState,
  earnEngagement,
} from '../model/index.ts';
import { levelMultiplier, computeGeneratorEffectiveRate } from '../game-loop/index.ts';
import type { GameState } from '../types.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const T0 = 1_700_000_000_000;

/**
 * Build a game state with a specific generator unlocked (owned) and configured.
 * Player starts with `engagement` already credited so purchase tests can run
 * without manually pre-loading funds.
 */
function stateWithOwnedGenerator(
  id: Parameters<typeof createGeneratorState>[0],
  count: number,
  level: number = 1,
  engagement: number = 0,
): GameState {
  const base = createInitialGameState(STATIC_DATA, T0);
  return {
    ...base,
    player: earnEngagement(base.player, engagement),
    generators: {
      ...base.generators,
      [id]: { ...createGeneratorState(id), owned: true, count, level },
    },
  };
}

// ---------------------------------------------------------------------------
// generatorBuyCost
// ---------------------------------------------------------------------------

describe('generatorBuyCost', () => {
  it('returns the base cost when count is 0', () => {
    const cost = generatorBuyCost('selfies', 0, STATIC_DATA);
    expect(cost).toBe(Math.ceil(STATIC_DATA.generators.selfies.base_buy_cost));
  });

  it('increases monotonically with each unit owned', () => {
    for (let n = 0; n < 10; n++) {
      expect(generatorBuyCost('selfies', n + 1, STATIC_DATA)).toBeGreaterThan(
        generatorBuyCost('selfies', n, STATIC_DATA),
      );
    }
  });

  it('applies buy_cost_multiplier per unit owned', () => {
    const def = STATIC_DATA.generators.selfies;
    const expected = Math.ceil(
      def.base_buy_cost * Math.pow(def.buy_cost_multiplier, 5),
    );
    expect(generatorBuyCost('selfies', 5, STATIC_DATA)).toBe(expected);
  });

  it('is always a positive integer (ceil)', () => {
    for (const id of Object.keys(STATIC_DATA.generators) as (keyof typeof STATIC_DATA.generators)[]) {
      const cost = generatorBuyCost(id, 0, STATIC_DATA);
      expect(Number.isInteger(cost)).toBe(true);
      expect(cost).toBeGreaterThan(0);
    }
  });

  it('throws on negative count', () => {
    expect(() => generatorBuyCost('selfies', -1, STATIC_DATA)).toThrow();
  });

  it('later generators cost significantly more than earlier ones', () => {
    const selfiesCost = generatorBuyCost('selfies', 0, STATIC_DATA);
    const viralCost = generatorBuyCost('viral_stunts', 0, STATIC_DATA);
    expect(viralCost).toBeGreaterThan(selfiesCost * 1000);
  });
});

// ---------------------------------------------------------------------------
// generatorUpgradeCost
// ---------------------------------------------------------------------------

describe('generatorUpgradeCost', () => {
  // Formula (per proposals/accepted/generator-level-growth-curves.md):
  //   cost(currentLevel) = ceil(base × levelMultiplier(currentLevel + 1))
  //   levelMultiplier(L) = 2^(L² / 5)
  it('matches the levelMultiplier formula at level 1 (cost to reach L2)', () => {
    const base = STATIC_DATA.generators.selfies.base_upgrade_cost;
    const expected = Math.ceil(base * Math.pow(2, (2 * 2) / 5));
    expect(generatorUpgradeCost('selfies', 1, STATIC_DATA)).toBe(expected);
  });

  it('matches the super-exponential curve at several levels', () => {
    const base = STATIC_DATA.generators.selfies.base_upgrade_cost;
    for (const currentLevel of [1, 2, 3, 5, 9]) {
      const target = currentLevel + 1;
      const expected = Math.ceil(base * Math.pow(2, (target * target) / 5));
      expect(generatorUpgradeCost('selfies', currentLevel, STATIC_DATA)).toBe(
        expected,
      );
    }
  });

  it('doubles from cost(L) to cost(L+1) at the formula ratio', () => {
    // cost(L+1)/cost(L) = 2^(((L+2)² - (L+1)²)/5) = 2^((2L+3)/5)
    // For L=1 → 2^1 = 2; for L=2 → 2^(7/5) ≈ 2.639; for L=3 → 2^(9/5) ≈ 3.482
    const c1 = generatorUpgradeCost('selfies', 1, STATIC_DATA);
    const c2 = generatorUpgradeCost('selfies', 2, STATIC_DATA);
    // Tolerance: ceil rounding can introduce up to 1 unit of drift. At these
    // magnitudes the relative error is << 1%.
    expect(c2 / c1).toBeCloseTo(2, 1);
  });

  it('increases monotonically with level', () => {
    for (let l = 1; l < 8; l++) {
      expect(
        generatorUpgradeCost('selfies', l + 1, STATIC_DATA),
      ).toBeGreaterThan(generatorUpgradeCost('selfies', l, STATIC_DATA));
    }
  });

  it('is always a positive integer (ceil)', () => {
    for (let l = 1; l <= 5; l++) {
      const cost = generatorUpgradeCost('selfies', l, STATIC_DATA);
      expect(Number.isInteger(cost)).toBe(true);
      expect(cost).toBeGreaterThan(0);
    }
  });

  it('throws when level is less than 1', () => {
    expect(() => generatorUpgradeCost('selfies', 0, STATIC_DATA)).toThrow();
    expect(() => generatorUpgradeCost('selfies', -1, STATIC_DATA)).toThrow();
  });

  it('throws on non-finite level', () => {
    expect(() => generatorUpgradeCost('selfies', Infinity, STATIC_DATA)).toThrow();
    expect(() => generatorUpgradeCost('selfies', NaN, STATIC_DATA)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// checkGeneratorUnlocks
// ---------------------------------------------------------------------------

describe('checkGeneratorUnlocks', () => {
  it('does not unlock any generator when followers are below all thresholds', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    // selfies threshold is 0 — it unlocks at game start; others need followers
    const result = checkGeneratorUnlocks(state.generators, 0, STATIC_DATA);
    expect(result.memes.owned).toBe(false);
    expect(result.hot_takes.owned).toBe(false);
  });

  it('unlocks selfies immediately (threshold 0)', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    const result = checkGeneratorUnlocks(state.generators, 0, STATIC_DATA);
    expect(result.selfies.owned).toBe(true);
  });

  it('unlocks memes when total_followers meets its threshold', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    const threshold = STATIC_DATA.unlockThresholds.generators.memes!; // 50
    const result = checkGeneratorUnlocks(state.generators, threshold, STATIC_DATA);
    expect(result.memes.owned).toBe(true);
  });

  it('does not unlock memes when one follower short of threshold', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    const threshold = STATIC_DATA.unlockThresholds.generators.memes!;
    const result = checkGeneratorUnlocks(
      state.generators,
      threshold - 1,
      STATIC_DATA,
    );
    expect(result.memes.owned).toBe(false);
  });

  it('unlocks generators in the correct progressive order', () => {
    const thresholds = [
      { id: 'selfies', threshold: 0 },
      { id: 'memes', threshold: 50 },
      { id: 'hot_takes', threshold: 200 },
      { id: 'tutorials', threshold: 1_000 },
      { id: 'livestreams', threshold: 5_000 },
      { id: 'podcasts', threshold: 20_000 },
      { id: 'viral_stunts', threshold: 100_000 },
    ] as const;

    for (const { id, threshold } of thresholds) {
      const state = createInitialGameState(STATIC_DATA, T0);
      const result = checkGeneratorUnlocks(
        state.generators,
        threshold,
        STATIC_DATA,
      );
      expect(result[id].owned).toBe(true);
    }
  });

  it('unlocks multiple generators simultaneously when followers are high', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    const result = checkGeneratorUnlocks(state.generators, 100_000, STATIC_DATA);
    expect(result.selfies.owned).toBe(true);
    expect(result.memes.owned).toBe(true);
    expect(result.hot_takes.owned).toBe(true);
    expect(result.tutorials.owned).toBe(true);
    expect(result.livestreams.owned).toBe(true);
    expect(result.podcasts.owned).toBe(true);
    expect(result.viral_stunts.owned).toBe(true);
  });

  it('does not reset already-owned generators', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    const withSelfies = {
      ...state.generators,
      selfies: { ...state.generators.selfies, owned: true, count: 5 },
    };
    const result = checkGeneratorUnlocks(withSelfies, 0, STATIC_DATA);
    // selfies should stay owned and count should be preserved
    expect(result.selfies.owned).toBe(true);
    expect(result.selfies.count).toBe(5);
  });

  it('returns the same reference when nothing changes', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    // No generators are owned, total_followers < all thresholds except selfies
    // Make all generators owned so nothing needs to change
    const allOwned = Object.fromEntries(
      Object.entries(state.generators).map(([id, gen]) => [
        id,
        { ...gen, owned: true },
      ]),
    ) as typeof state.generators;
    const result = checkGeneratorUnlocks(allOwned, 0, STATIC_DATA);
    expect(result).toBe(allOwned);
  });

  it('returns a new reference when something unlocks', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    const result = checkGeneratorUnlocks(state.generators, 100, STATIC_DATA);
    // selfies (threshold 0) and memes (threshold 50) both unlock
    expect(result).not.toBe(state.generators);
  });

  it('does not mutate the input generators map', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    const snapshot = JSON.parse(JSON.stringify(state.generators));
    checkGeneratorUnlocks(state.generators, 100_000, STATIC_DATA);
    expect(state.generators).toEqual(snapshot);
  });
});

// ---------------------------------------------------------------------------
// buyGenerator
// ---------------------------------------------------------------------------

describe('buyGenerator', () => {
  it('increments count by 1', () => {
    const cost = generatorBuyCost('selfies', 0, STATIC_DATA);
    const state = stateWithOwnedGenerator('selfies', 0, 1, cost);
    const next = buyGenerator(state, 'selfies', STATIC_DATA);
    expect(next.generators.selfies.count).toBe(1);
  });

  it('deducts the correct cost from engagement', () => {
    const cost = generatorBuyCost('selfies', 0, STATIC_DATA);
    const state = stateWithOwnedGenerator('selfies', 0, 1, cost + 500);
    const next = buyGenerator(state, 'selfies', STATIC_DATA);
    expect(next.player.engagement).toBeCloseTo(500, 6);
  });

  it('successive purchases cost progressively more', () => {
    let state = stateWithOwnedGenerator('selfies', 0, 1, 1_000_000);
    const cost0 = generatorBuyCost('selfies', 0, STATIC_DATA);
    state = buyGenerator(state, 'selfies', STATIC_DATA);
    const cost1 = generatorBuyCost('selfies', 1, STATIC_DATA);
    expect(cost1).toBeGreaterThan(cost0);
    // confirm second purchase uses the higher cost
    const engagementBefore = state.player.engagement;
    state = buyGenerator(state, 'selfies', STATIC_DATA);
    expect(engagementBefore - state.player.engagement).toBe(cost1);
  });

  it('newly-bought generator produces engagement in the tick', () => {
    const cost = generatorBuyCost('selfies', 0, STATIC_DATA);
    const state = stateWithOwnedGenerator('selfies', 0, 1, cost);
    const bought = buyGenerator(state, 'selfies', STATIC_DATA);
    // After buying, count=1 and owned=true → rate > 0
    const rate = computeGeneratorEffectiveRate(
      bought.generators.selfies,
      bought,
      STATIC_DATA,
    );
    expect(rate).toBeGreaterThan(0);
  });

  it('throws when generator is not yet unlocked', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    // memes starts unowned (threshold=50 followers)
    expect(() => buyGenerator(state, 'memes', STATIC_DATA)).toThrow(
      /not yet unlocked/,
    );
  });

  it('throws when player cannot afford the cost', () => {
    const state = stateWithOwnedGenerator('selfies', 0, 1, 0);
    expect(() => buyGenerator(state, 'selfies', STATIC_DATA)).toThrow(
      /cannot afford/,
    );
  });

  it('does not mutate the input state', () => {
    const cost = generatorBuyCost('selfies', 0, STATIC_DATA);
    const state = stateWithOwnedGenerator('selfies', 0, 1, cost);
    const snapshot = JSON.parse(JSON.stringify(state));
    buyGenerator(state, 'selfies', STATIC_DATA);
    expect(state).toEqual(snapshot);
  });

  it('does not affect other generators', () => {
    const cost = generatorBuyCost('selfies', 0, STATIC_DATA);
    const state = stateWithOwnedGenerator('selfies', 0, 1, cost);
    const next = buyGenerator(state, 'selfies', STATIC_DATA);
    expect(next.generators.memes).toBe(state.generators.memes);
    expect(next.generators.tutorials).toBe(state.generators.tutorials);
  });
});

// ---------------------------------------------------------------------------
// upgradeGenerator
// ---------------------------------------------------------------------------

describe('upgradeGenerator', () => {
  it('increments level by 1', () => {
    const cost = generatorUpgradeCost('selfies', 1, STATIC_DATA);
    const state = stateWithOwnedGenerator('selfies', 1, 1, cost);
    const next = upgradeGenerator(state, 'selfies', STATIC_DATA);
    expect(next.generators.selfies.level).toBe(2);
  });

  it('deducts the correct cost from engagement', () => {
    const cost = generatorUpgradeCost('selfies', 1, STATIC_DATA);
    const state = stateWithOwnedGenerator('selfies', 1, 1, cost + 999);
    const next = upgradeGenerator(state, 'selfies', STATIC_DATA);
    expect(next.player.engagement).toBeCloseTo(999, 6);
  });

  it('cost(L+1) is ~2× cost(L) at the low end of the curve', () => {
    // From the super-exponential formula 2^(L²/5):
    //   ratio(1→2) = 2^((9-4)/5) = 2^1 = 2
    const level1Cost = generatorUpgradeCost('selfies', 1, STATIC_DATA);
    const level2Cost = generatorUpgradeCost('selfies', 2, STATIC_DATA);
    expect(level2Cost / level1Cost).toBeCloseTo(2, 1);
  });

  it('higher level increases effective engagement rate', () => {
    const state1 = stateWithOwnedGenerator('selfies', 1, 1, 0);
    const state2 = stateWithOwnedGenerator('selfies', 1, 2, 0);
    const rate1 = computeGeneratorEffectiveRate(
      state1.generators.selfies,
      state1,
      STATIC_DATA,
    );
    const rate2 = computeGeneratorEffectiveRate(
      state2.generators.selfies,
      state2,
      STATIC_DATA,
    );
    expect(rate2).toBeGreaterThan(rate1);
  });

  it('rate gain matches levelMultiplier ratio', () => {
    const state1 = stateWithOwnedGenerator('selfies', 1, 1, 0);
    const state2 = stateWithOwnedGenerator('selfies', 1, 2, 0);
    const rate1 = computeGeneratorEffectiveRate(
      state1.generators.selfies,
      state1,
      STATIC_DATA,
    );
    const rate2 = computeGeneratorEffectiveRate(
      state2.generators.selfies,
      state2,
      STATIC_DATA,
    );
    const expectedRatio = levelMultiplier(2) / levelMultiplier(1);
    expect(rate2 / rate1).toBeCloseTo(expectedRatio, 6);
  });

  it('throws when generator is not yet unlocked', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    expect(() => upgradeGenerator(state, 'memes', STATIC_DATA)).toThrow(
      /not yet unlocked/,
    );
  });

  it('throws when generator has no units purchased', () => {
    const state = stateWithOwnedGenerator('selfies', 0, 1, 1_000_000);
    expect(() => upgradeGenerator(state, 'selfies', STATIC_DATA)).toThrow(
      /no units/,
    );
  });

  it('throws when player cannot afford the upgrade', () => {
    const state = stateWithOwnedGenerator('selfies', 1, 1, 0);
    expect(() => upgradeGenerator(state, 'selfies', STATIC_DATA)).toThrow(
      /cannot afford/,
    );
  });

  it('throws when generator is already at max_level (task #89)', () => {
    const maxLvl = STATIC_DATA.generators.selfies.max_level;
    const state = stateWithOwnedGenerator('selfies', 1, maxLvl, 1e18);
    expect(() => upgradeGenerator(state, 'selfies', STATIC_DATA)).toThrow(
      /max level/,
    );
  });

  it('throws when generator level exceeds max_level (defensive)', () => {
    const maxLvl = STATIC_DATA.generators.selfies.max_level;
    const state = stateWithOwnedGenerator('selfies', 1, maxLvl + 5, 1e18);
    expect(() => upgradeGenerator(state, 'selfies', STATIC_DATA)).toThrow(
      /max level/,
    );
  });

  it('does not mutate the input state', () => {
    const cost = generatorUpgradeCost('selfies', 1, STATIC_DATA);
    const state = stateWithOwnedGenerator('selfies', 1, 1, cost);
    const snapshot = JSON.parse(JSON.stringify(state));
    upgradeGenerator(state, 'selfies', STATIC_DATA);
    expect(state).toEqual(snapshot);
  });

  it('does not affect other generators', () => {
    const cost = generatorUpgradeCost('selfies', 1, STATIC_DATA);
    const state = stateWithOwnedGenerator('selfies', 1, 1, cost);
    const next = upgradeGenerator(state, 'selfies', STATIC_DATA);
    expect(next.generators.memes).toBe(state.generators.memes);
    expect(next.generators.tutorials).toBe(state.generators.tutorials);
  });

  it('chaining multiple upgrades compounds the level multiplier', () => {
    // Fund the player with the exact sum of L1→L2, L2→L3, L3→L4 costs.
    const cost12 = generatorUpgradeCost('selfies', 1, STATIC_DATA);
    const cost23 = generatorUpgradeCost('selfies', 2, STATIC_DATA);
    const cost34 = generatorUpgradeCost('selfies', 3, STATIC_DATA);
    const totalCost = cost12 + cost23 + cost34 + 1;
    let state = stateWithOwnedGenerator('selfies', 1, 1, totalCost);
    state = upgradeGenerator(state, 'selfies', STATIC_DATA);
    state = upgradeGenerator(state, 'selfies', STATIC_DATA);
    state = upgradeGenerator(state, 'selfies', STATIC_DATA);
    expect(state.generators.selfies.level).toBe(4);

    const rate = computeGeneratorEffectiveRate(
      state.generators.selfies,
      state,
      STATIC_DATA,
    );
    const baseState = stateWithOwnedGenerator('selfies', 1, 1, 0);
    const baseRate = computeGeneratorEffectiveRate(
      baseState.generators.selfies,
      baseState,
      STATIC_DATA,
    );
    const expectedRatio = levelMultiplier(4) / levelMultiplier(1);
    expect(rate / baseRate).toBeCloseTo(expectedRatio, 6);
  });
});

// ---------------------------------------------------------------------------
// Generator unlocks in tick (integration)
// ---------------------------------------------------------------------------

import { tick } from '../game-loop/index.ts';

describe('tick — generator unlocks', () => {
  it('unlocks selfies immediately (threshold 0) on first tick', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    // selfies threshold is 0; should unlock on first tick even with 0 followers
    const next = tick(
      { ...state, algorithm: { ...state.algorithm, shift_time: T0 + 10_000_000 } },
      T0 + 100,
      100,
      STATIC_DATA,
    );
    expect(next.generators.selfies.owned).toBe(true);
  });

  it('unlocks memes once follower threshold is crossed', () => {
    // Give the state enough generators to cross the memes threshold (50 followers)
    // Use podcasts with massive count so it crosses 50 followers in one tick.
    const base = createInitialGameState(STATIC_DATA, T0);
    const state: GameState = {
      ...base,
      algorithm: { ...base.algorithm, shift_time: T0 + 10_000_000 },
      generators: {
        ...base.generators,
        podcasts: { ...base.generators.podcasts, owned: true, count: 500, level: 1 },
      },
    };
    const next = tick(state, T0 + 1000, 1000, STATIC_DATA);
    expect(next.player.total_followers).toBeGreaterThan(
      STATIC_DATA.unlockThresholds.generators.memes!,
    );
    expect(next.generators.memes.owned).toBe(true);
  });

  it('does not unlock generators until their threshold is met', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    // No active generators → no followers → only selfies (threshold 0) unlocks
    const next = tick(
      { ...state, algorithm: { ...state.algorithm, shift_time: T0 + 10_000_000 } },
      T0 + 100,
      100,
      STATIC_DATA,
    );
    expect(next.generators.memes.owned).toBe(false);
    expect(next.generators.hot_takes.owned).toBe(false);
  });
});
