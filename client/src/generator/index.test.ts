import { describe, it, expect } from 'vitest';
import {
  generatorBuyCost,
  generatorUpgradeCost,
  autoclickerBuyCost,
  checkGeneratorUnlocks,
  buyGenerator,
  upgradeGenerator,
  unlockGenerator,
  buyAutoclicker,
} from './index.ts';
import { STATIC_DATA } from '../static-data/index.ts';
import {
  createInitialGameState,
  createGeneratorState,
  earnEngagement,
} from '../model/index.ts';
import { computeGeneratorEffectiveRate } from '../game-loop/index.ts';
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
  autoclicker_count?: number,
): GameState {
  const base = createInitialGameState(STATIC_DATA, T0);
  return {
    ...base,
    player: earnEngagement(base.player, engagement),
    generators: {
      ...base.generators,
      [id]: {
        ...createGeneratorState(id),
        owned: true,
        count,
        level,
        // Default: autoclicker_count mirrors count for backward compat (task #132).
        autoclicker_count: autoclicker_count ?? count,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// generatorBuyCost
// ---------------------------------------------------------------------------

describe('generatorBuyCost', () => {
  it('returns the base cost when count is 0', () => {
    const cost = generatorBuyCost('selfies', 0, STATIC_DATA);
    expect(cost).toBe(STATIC_DATA.generators.selfies.base_buy_cost);
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
    const expected =
      def.base_buy_cost * Math.pow(def.buy_cost_multiplier, 5);
    expect(generatorBuyCost('selfies', 5, STATIC_DATA)).toBeCloseTo(expected);
  });

  it('is always positive', () => {
    for (const id of Object.keys(STATIC_DATA.generators) as (keyof typeof STATIC_DATA.generators)[]) {
      const cost = generatorBuyCost(id, 0, STATIC_DATA);
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
  it('returns the first entry in upgrade_costs at level 1', () => {
    const costs = STATIC_DATA.generators.selfies.upgrade_costs;
    expect(generatorUpgradeCost('selfies', 1, STATIC_DATA)).toBe(costs[0]);
  });

  it('returns correct entry for each level', () => {
    const costs = STATIC_DATA.generators.selfies.upgrade_costs;
    for (let l = 1; l <= costs.length; l++) {
      expect(generatorUpgradeCost('selfies', l, STATIC_DATA)).toBe(costs[l - 1]);
    }
  });

  it('increases monotonically with level', () => {
    for (let l = 1; l < 8; l++) {
      expect(
        generatorUpgradeCost('selfies', l + 1, STATIC_DATA),
      ).toBeGreaterThan(generatorUpgradeCost('selfies', l, STATIC_DATA));
    }
  });

  it('is always positive', () => {
    for (let l = 1; l <= 5; l++) {
      const cost = generatorUpgradeCost('selfies', l, STATIC_DATA);
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

  it('auto-unlocks selfies at threshold 100', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    const result = checkGeneratorUnlocks(state.generators, 100, STATIC_DATA);
    expect(result.selfies.owned).toBe(true);
  });

  it('auto-unlocks chirps at threshold 0 (chirps is manual_clickable but starts owned)', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    // chirps starts owned=true via createInitialGameState (threshold=0).
    expect(state.generators.chirps.owned).toBe(true);
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

  it('auto-unlocks passive-only generators in the correct progressive order', () => {
    // Only passive-only (manual_clickable=false) generators auto-unlock.
    // Manual-clickable ladder verbs require explicit unlockGenerator.
    const passiveThresholds = [
      { id: 'memes', threshold: 50 },
      { id: 'hot_takes', threshold: 200 },
      { id: 'tutorials', threshold: 1_000 },
    ] as const;

    for (const { id, threshold } of passiveThresholds) {
      const state = createInitialGameState(STATIC_DATA, T0);
      const result = checkGeneratorUnlocks(
        state.generators,
        threshold,
        STATIC_DATA,
      );
      expect(result[id].owned).toBe(true);
    }
  });

  it('auto-unlocks all generators when followers are high enough', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    const result = checkGeneratorUnlocks(state.generators, 5_000_000, STATIC_DATA);
    // All threshold-based generators auto-unlock
    expect(result.selfies.owned).toBe(true);
    expect(result.livestreams.owned).toBe(true);
    expect(result.podcasts.owned).toBe(true);
    expect(result.viral_stunts.owned).toBe(true);
    expect(result.memes.owned).toBe(true);
    expect(result.hot_takes.owned).toBe(true);
    expect(result.tutorials.owned).toBe(true);
    // Post-prestige generators still NOT auto-unlocked (no threshold entry)
    expect(result.ai_slop.owned).toBe(false);
    expect(result.deepfakes.owned).toBe(false);
    expect(result.algorithmic_prophecy.owned).toBe(false);
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
    expect(engagementBefore - state.player.engagement).toBeCloseTo(cost1);
  });

  it('newly-bought generator increases yield multiplier (1+count)', () => {
    // autoclicker_count=1 so there's baseline passive production
    const cost = generatorBuyCost('selfies', 0, STATIC_DATA);
    const state = stateWithOwnedGenerator('selfies', 0, 1, cost, 1);
    const rateBefore = computeGeneratorEffectiveRate(
      state.generators.selfies,
      state,
      STATIC_DATA,
    );
    const bought = buyGenerator(state, 'selfies', STATIC_DATA);
    // After buying, count=1 → yield multiplier (1+1)=2 vs (1+0)=1
    const rateAfter = computeGeneratorEffectiveRate(
      bought.generators.selfies,
      bought,
      STATIC_DATA,
    );
    expect(rateAfter).toBeCloseTo(rateBefore * 2, 6);
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

  it('cost increases between successive levels (~3× per level)', () => {
    const level1Cost = generatorUpgradeCost('selfies', 1, STATIC_DATA);
    const level2Cost = generatorUpgradeCost('selfies', 2, STATIC_DATA);
    expect(level2Cost).toBeGreaterThan(level1Cost);
    expect(level2Cost / level1Cost).toBeCloseTo(3, 0);
  });

  it('higher count increases effective engagement rate via (1+count) multiplier', () => {
    const state1 = stateWithOwnedGenerator('selfies', 1, 1, 0, 1);
    const state2 = stateWithOwnedGenerator('selfies', 3, 1, 0, 1);
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

  it('rate gain matches (1+count) ratio', () => {
    const state1 = stateWithOwnedGenerator('selfies', 1, 1, 0, 1);
    const state2 = stateWithOwnedGenerator('selfies', 3, 1, 0, 1);
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
    // (1+3)/(1+1) = 2.0
    expect(rate2 / rate1).toBeCloseTo((1 + 3) / (1 + 1), 6);
  });

  it('throws when generator is not yet unlocked', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    expect(() => upgradeGenerator(state, 'memes', STATIC_DATA)).toThrow(
      /not yet unlocked/,
    );
  });

  it('allows upgrade at count=0 (LVL UP valid before buying units)', () => {
    const cost = generatorUpgradeCost('selfies', 1, STATIC_DATA);
    const state = stateWithOwnedGenerator('selfies', 0, 1, cost);
    const next = upgradeGenerator(state, 'selfies', STATIC_DATA);
    expect(next.generators.selfies.level).toBe(2);
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

  it('chaining multiple upgrades advances level correctly', () => {
    // Fund the player with the exact sum of L1→L2, L2→L3, L3→L4 costs.
    const cost12 = generatorUpgradeCost('selfies', 1, STATIC_DATA);
    const cost23 = generatorUpgradeCost('selfies', 2, STATIC_DATA);
    const cost34 = generatorUpgradeCost('selfies', 3, STATIC_DATA);
    const totalCost = cost12 + cost23 + cost34 + 1;
    let state = stateWithOwnedGenerator('selfies', 0, 1, totalCost);
    state = upgradeGenerator(state, 'selfies', STATIC_DATA);
    state = upgradeGenerator(state, 'selfies', STATIC_DATA);
    state = upgradeGenerator(state, 'selfies', STATIC_DATA);
    expect(state.generators.selfies.level).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Generator unlocks in tick (integration)
// ---------------------------------------------------------------------------

import { tick } from '../game-loop/index.ts';

describe('tick — generator unlocks', () => {
  it('does NOT auto-unlock selfies on tick (manual_clickable, threshold 100)', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    // selfies is manual_clickable=true — checkGeneratorUnlocks skips it
    const next = tick(
      state,
      T0 + 100,
      100,
      STATIC_DATA,
    );
    expect(next.generators.selfies.owned).toBe(false);
  });

  it('unlocks memes once follower threshold is crossed', () => {
    // Give the state enough generators to cross the memes threshold (50 followers)
    // Use podcasts with massive count so it crosses 50 followers in one tick.
    const base = createInitialGameState(STATIC_DATA, T0);
    const state: GameState = {
      ...base,
      generators: {
        ...base.generators,
        podcasts: { ...base.generators.podcasts, owned: true, count: 500, level: 1, autoclicker_count: 500 },
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
    // No active generators → no followers → nothing auto-unlocks
    const next = tick(
      state,
      T0 + 100,
      100,
      STATIC_DATA,
    );
    expect(next.generators.memes.owned).toBe(false);
    expect(next.generators.hot_takes.owned).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// unlockGenerator (task #120)
// ---------------------------------------------------------------------------

describe('unlockGenerator', () => {
  it('flips owned=true and deducts base_buy_cost on success', () => {
    const base = createInitialGameState(STATIC_DATA, T0);
    const cost = STATIC_DATA.generators.selfies.base_buy_cost;
    const state: GameState = {
      ...base,
      player: {
        ...base.player,
        total_followers: 100, // meets selfies threshold
        engagement: cost + 100,
      },
    };
    const next = unlockGenerator(state, 'selfies', STATIC_DATA);
    expect(next.generators.selfies.owned).toBe(true);
    expect(next.player.engagement).toBeCloseTo(100, 6);
  });

  it('throws for passive-only generators', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    expect(() => unlockGenerator(state, 'memes', STATIC_DATA)).toThrow(
      /not manual-clickable/,
    );
  });

  it('throws when already owned', () => {
    const base = createInitialGameState(STATIC_DATA, T0);
    const state: GameState = {
      ...base,
      player: { ...base.player, total_followers: 100, engagement: 1000 },
      generators: {
        ...base.generators,
        selfies: { ...base.generators.selfies, owned: true },
      },
    };
    expect(() => unlockGenerator(state, 'selfies', STATIC_DATA)).toThrow(
      /already unlocked/,
    );
  });

  it('throws when threshold not met', () => {
    const base = createInitialGameState(STATIC_DATA, T0);
    const state: GameState = {
      ...base,
      player: { ...base.player, total_followers: 99, engagement: 1000 },
    };
    expect(() => unlockGenerator(state, 'selfies', STATIC_DATA)).toThrow(
      /threshold not met/,
    );
  });

  it('throws when player cannot afford', () => {
    const base = createInitialGameState(STATIC_DATA, T0);
    const state: GameState = {
      ...base,
      player: { ...base.player, total_followers: 100, engagement: 0 },
    };
    expect(() => unlockGenerator(state, 'selfies', STATIC_DATA)).toThrow(
      /cannot afford/,
    );
  });

  it('does not mutate the input state', () => {
    const base = createInitialGameState(STATIC_DATA, T0);
    const cost = STATIC_DATA.generators.selfies.base_buy_cost;
    const state: GameState = {
      ...base,
      player: { ...base.player, total_followers: 100, engagement: cost },
    };
    const snapshot = JSON.parse(JSON.stringify(state));
    unlockGenerator(state, 'selfies', STATIC_DATA);
    expect(state).toEqual(snapshot);
  });
});

// ---------------------------------------------------------------------------
// buyGenerator error message update for manual-clickable gens (task #120)
// ---------------------------------------------------------------------------

describe('buyGenerator — manual-clickable error message', () => {
  it('throws "must be unlocked first" for an unowned manual-clickable gen', () => {
    const base = createInitialGameState(STATIC_DATA, T0);
    // selfies is manual_clickable and starts unowned (threshold=100)
    expect(() => buyGenerator(base, 'selfies', STATIC_DATA)).toThrow(
      /must be unlocked first/,
    );
  });

  it('throws "check follower thresholds" for an unowned passive-only gen', () => {
    const base = createInitialGameState(STATIC_DATA, T0);
    // memes is manual_clickable=false and starts unowned
    expect(() => buyGenerator(base, 'memes', STATIC_DATA)).toThrow(
      /check follower thresholds/,
    );
  });
});

// ---------------------------------------------------------------------------
// Initial-state: fresh game starting set (task #120)
// ---------------------------------------------------------------------------

describe('initial state — new player starting set', () => {
  it('chirps starts owned (threshold=0)', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    expect(state.generators.chirps.owned).toBe(true);
  });

  it('selfies starts unowned (threshold=100, manual_clickable)', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    expect(state.generators.selfies.owned).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// autoclickerBuyCost
// ---------------------------------------------------------------------------

describe('autoclickerBuyCost', () => {
  it('returns base_autoclicker_cost at count=0', () => {
    const cost = autoclickerBuyCost('chirps', 0, STATIC_DATA);
    expect(cost).toBe(STATIC_DATA.generators.chirps.base_autoclicker_cost);
  });

  it('scales exponentially: base × autoclicker_cost_multiplier^count', () => {
    const def = STATIC_DATA.generators.chirps;
    const cost3 = autoclickerBuyCost('chirps', 3, STATIC_DATA);
    const expected = def.base_autoclicker_cost * Math.pow(def.autoclicker_cost_multiplier, 3);
    expect(cost3).toBeCloseTo(expected);
  });

  it('increases monotonically', () => {
    for (let i = 0; i < 5; i++) {
      expect(autoclickerBuyCost('chirps', i + 1, STATIC_DATA)).toBeGreaterThan(
        autoclickerBuyCost('chirps', i, STATIC_DATA),
      );
    }
  });

  it('throws on negative count', () => {
    expect(() => autoclickerBuyCost('chirps', -1, STATIC_DATA)).toThrow(
      /must be ≥ 0/,
    );
  });
});

// ---------------------------------------------------------------------------
// buyAutoclicker
// ---------------------------------------------------------------------------

describe('buyAutoclicker', () => {
  it('increments autoclicker_count by 1 and deducts cost', () => {
    const cost = autoclickerBuyCost('chirps', 0, STATIC_DATA);
    const state = stateWithOwnedGenerator('chirps', 0, 1, cost, 0);
    const next = buyAutoclicker(state, 'chirps', STATIC_DATA);
    expect(next.generators.chirps.autoclicker_count).toBe(1);
    expect(next.player.engagement).toBeCloseTo(0, 6);
  });

  it('deducts the correct escalated cost at higher counts', () => {
    const cost0 = autoclickerBuyCost('chirps', 0, STATIC_DATA);
    const cost1 = autoclickerBuyCost('chirps', 1, STATIC_DATA);
    const totalNeeded = cost0 + cost1 + 1;
    let state = stateWithOwnedGenerator('chirps', 0, 1, totalNeeded, 0);
    state = buyAutoclicker(state, 'chirps', STATIC_DATA);
    state = buyAutoclicker(state, 'chirps', STATIC_DATA);
    expect(state.generators.chirps.autoclicker_count).toBe(2);
    expect(state.player.engagement).toBeCloseTo(1, 6);
  });

  it('throws when generator is not manual_clickable', () => {
    const state = stateWithOwnedGenerator('memes', 1, 1, 1_000_000, 0);
    expect(() => buyAutoclicker(state, 'memes', STATIC_DATA)).toThrow(
      /not manual-clickable/,
    );
  });

  it('throws when generator is not yet unlocked', () => {
    const state = createInitialGameState(STATIC_DATA, T0);
    expect(() => buyAutoclicker(state, 'selfies', STATIC_DATA)).toThrow(
      /not yet unlocked/,
    );
  });

  it('throws when player cannot afford the cost', () => {
    const state = stateWithOwnedGenerator('chirps', 0, 1, 0, 0);
    expect(() => buyAutoclicker(state, 'chirps', STATIC_DATA)).toThrow(
      /cannot afford/,
    );
  });

  it('does not affect other generators', () => {
    const cost = autoclickerBuyCost('chirps', 0, STATIC_DATA);
    const state = stateWithOwnedGenerator('chirps', 0, 1, cost, 0);
    const next = buyAutoclicker(state, 'chirps', STATIC_DATA);
    expect(next.generators.selfies).toBe(state.generators.selfies);
    expect(next.generators.memes).toBe(state.generators.memes);
  });
});
