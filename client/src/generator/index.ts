// Generator module.
// Responsibility: generator unlock checks, cost calculations, and purchase /
// upgrade actions. All functions are pure — no mutation.
// See core-systems.md §Generator, §Game Loop Tick, and §Interface Contracts.

import type {
  GameState,
  GeneratorId,
  GeneratorState,
  StaticData,
} from '../types.ts';
import { canAffordEngagement, spendEngagement } from '../model/index.ts';

// ---------------------------------------------------------------------------
// Cost formulas
// ---------------------------------------------------------------------------

/**
 * Engagement cost to buy the next unit of a generator.
 *
 *   cost = base_buy_cost × buy_cost_multiplier^currentCount
 *
 * Standard clicker scaling: each additional unit costs slightly more than the
 * last. Full precision — no rounding.
 *
 * TODO(game-designer): provisional formula and base values — tune during balance pass.
 */
export function generatorBuyCost(
  generatorId: GeneratorId,
  currentCount: number,
  staticData: StaticData,
): number {
  if (currentCount < 0) {
    throw new Error(
      `generatorBuyCost: currentCount must be ≥ 0, got ${currentCount}`,
    );
  }
  const def = staticData.generators[generatorId];
  return (
    def.base_buy_cost * Math.pow(def.buy_cost_multiplier, currentCount)
  );
}

/**
 * Engagement cost to upgrade a generator from its current level to level+1.
 *
 * Uses a hand-tuned lookup table (upgrade_costs on GeneratorDef) instead of
 * a formula. Each generator has 9 entries (L1→L2 through L9→L10).
 * Roughly ~3× per level within a tier, ~10× between tiers.
 */
export function generatorUpgradeCost(
  generatorId: GeneratorId,
  currentLevel: number,
  staticData: StaticData,
): number {
  if (currentLevel < 1 || !Number.isFinite(currentLevel)) {
    throw new Error(
      `generatorUpgradeCost: currentLevel must be ≥ 1 and finite, got ${currentLevel}`,
    );
  }
  const def = staticData.generators[generatorId];
  const index = currentLevel - 1; // L1→L2 is index 0
  if (index >= def.upgrade_costs.length) {
    throw new Error(
      `generatorUpgradeCost: no cost defined for level ${currentLevel}→${currentLevel + 1} on '${generatorId}'`,
    );
  }
  return def.upgrade_costs[index];
}

/**
 * Engagement cost to buy the next autoclicker for a generator.
 *
 *   cost = base_autoclicker_cost × autoclicker_cost_multiplier^currentAutoclickerCount
 *
 * Steeper escalation than BUY. Only meaningful for manual_clickable
 * generators (passive-only generators have base_autoclicker_cost = 0).
 */
export function autoclickerBuyCost(
  generatorId: GeneratorId,
  currentAutoclickerCount: number,
  staticData: StaticData,
): number {
  if (currentAutoclickerCount < 0) {
    throw new Error(
      `autoclickerBuyCost: currentAutoclickerCount must be ≥ 0, got ${currentAutoclickerCount}`,
    );
  }
  const def = staticData.generators[generatorId];
  return (
    def.base_autoclicker_cost * Math.pow(def.autoclicker_cost_multiplier, currentAutoclickerCount)
  );
}

/**
 * Maximum autoclickers per generator. Flat cap — does not scale with rebrand.
 */
export function autoclickerCap(): number {
  return 12;
}

// ---------------------------------------------------------------------------
// Generator unlock checks
// ---------------------------------------------------------------------------

/**
 * Returns an updated generators map with any newly-unlocked generators based
 * on the current total follower count.
 *
 * All generators auto-unlock when the follower threshold is met — no purchase
 * required. The player's first decision is what to invest in, not whether to
 * unlock. Post-prestige generators (no entry in unlockThresholds) are unaffected
 * — they still unlock only via Clout upgrades.
 *
 * Returns the same reference when nothing changes so callers can use reference
 * equality to skip unnecessary re-renders.
 */
export function checkGeneratorUnlocks(
  generators: Record<GeneratorId, GeneratorState>,
  totalFollowers: number,
  staticData: StaticData,
): Record<GeneratorId, GeneratorState> {
  let changed = false;
  const next: Record<GeneratorId, GeneratorState> = { ...generators };

  for (const id of Object.keys(generators) as GeneratorId[]) {
    if (!generators[id].owned) {
      const threshold = staticData.unlockThresholds.generators[id];
      // Missing entry = generator is never unlocked by follower threshold
      // (e.g. post-prestige generators, which unlock via Clout upgrades).
      if (threshold !== undefined && totalFollowers >= threshold) {
        next[id] = { ...generators[id], owned: true };
        changed = true;
      }
    }
  }

  return changed ? next : generators;
}


// ---------------------------------------------------------------------------
// Purchase actions
// ---------------------------------------------------------------------------

/**
 * Buy one unit of a generator, spending Engagement from the player's balance.
 *
 * Throws if:
 * - The generator is not yet unlocked (owned=false) — check follower thresholds.
 * - The player cannot afford the cost.
 *
 * Pure — returns a new GameState; does not mutate the input.
 */
export function buyGenerator(
  state: GameState,
  generatorId: GeneratorId,
  staticData: StaticData,
): GameState {
  const gen = state.generators[generatorId];

  if (!gen.owned) {
    throw new Error(
      `buyGenerator: generator '${generatorId}' is not yet unlocked — check follower thresholds`,
    );
  }

  const cost = generatorBuyCost(generatorId, gen.count, staticData);

  if (!canAffordEngagement(state.player, cost)) {
    throw new Error(
      `buyGenerator: cannot afford '${generatorId}' — ` +
        `cost ${cost}, have ${state.player.engagement}`,
    );
  }

  return {
    ...state,
    player: spendEngagement(state.player, cost),
    generators: {
      ...state.generators,
      [generatorId]: { ...gen, count: gen.count + 1 },
    },
  };
}

/**
 * Upgrade a generator to the next level, spending Engagement from the player's
 * balance. Level drives manual cooldown speed (level-driven-cooldown refactor).
 *
 * Throws if:
 * - The generator is not yet unlocked (owned=false).
 * - The generator is already at max level.
 * - The player cannot afford the cost.
 *
 * LVL UP is valid at count=0 — the player taps faster at base yield before
 * buying any units. The old count<=0 guard was removed in task #132.
 *
 * Pure — returns a new GameState; does not mutate the input.
 */
export function upgradeGenerator(
  state: GameState,
  generatorId: GeneratorId,
  staticData: StaticData,
): GameState {
  const gen = state.generators[generatorId];

  if (!gen.owned) {
    throw new Error(
      `upgradeGenerator: generator '${generatorId}' is not yet unlocked`,
    );
  }

  const def = staticData.generators[generatorId];
  if (gen.level >= def.max_level) {
    throw new Error(
      `upgradeGenerator: generator '${generatorId}' is at max level (${def.max_level})`,
    );
  }

  const cost = generatorUpgradeCost(generatorId, gen.level, staticData);

  if (!canAffordEngagement(state.player, cost)) {
    throw new Error(
      `upgradeGenerator: cannot afford upgrade for '${generatorId}' — ` +
        `cost ${cost}, have ${state.player.engagement}`,
    );
  }

  return {
    ...state,
    player: spendEngagement(state.player, cost),
    generators: {
      ...state.generators,
      [generatorId]: { ...gen, level: gen.level + 1 },
    },
  };
}

/**
 * Buy one autoclicker for a manual-clickable generator, spending Engagement.
 *
 * Throws if:
 * - The generator is not manual_clickable (passive-only generators don't have autoclickers).
 * - The generator is not yet unlocked (owned=false).
 * - The player cannot afford the cost.
 *
 * Pure — returns a new GameState; does not mutate the input.
 */
export function buyAutoclicker(
  state: GameState,
  generatorId: GeneratorId,
  staticData: StaticData,
): GameState {
  const def = staticData.generators[generatorId];

  if (!def.manual_clickable) {
    throw new Error(
      `buyAutoclicker: generator '${generatorId}' is not manual-clickable`,
    );
  }

  const gen = state.generators[generatorId];

  if (!gen.owned) {
    throw new Error(
      `buyAutoclicker: generator '${generatorId}' is not yet unlocked`,
    );
  }

  const hireCap = autoclickerCap();
  if (gen.autoclicker_count >= hireCap) {
    throw new Error(
      `buyAutoclicker: generator '${generatorId}' is at hire cap (${hireCap})`,
    );
  }

  const cost = autoclickerBuyCost(generatorId, gen.autoclicker_count, staticData);

  if (!canAffordEngagement(state.player, cost)) {
    throw new Error(
      `buyAutoclicker: cannot afford autoclicker for '${generatorId}' — ` +
        `cost ${cost}, have ${state.player.engagement}`,
    );
  }

  return {
    ...state,
    player: spendEngagement(state.player, cost),
    generators: {
      ...state.generators,
      [generatorId]: { ...gen, autoclicker_count: gen.autoclicker_count + 1 },
    },
  };
}
