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
 *   cost = ceil(base_buy_cost × buy_cost_multiplier^currentCount)
 *
 * Standard clicker scaling: each additional unit costs slightly more than the
 * last. The ceil keeps costs whole numbers for clean UI display.
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
  return Math.ceil(
    def.base_buy_cost * Math.pow(def.buy_cost_multiplier, currentCount),
  );
}

/**
 * Engagement cost to upgrade a generator from its current level to level+1.
 *
 *   cost = ceil(base_upgrade_cost × 4^(currentLevel - 1))
 *
 * Each upgrade level costs 4× the previous, reflecting the super-exponential
 * power gain of the level multiplier curve (2^(level²/5)).
 *
 * Note: the design proposal mentions three upgrade tracks (quality, frequency,
 * platform optimization). The architecture spec consolidated these into a single
 * `level` field and `levelMultiplier`. This function implements the consolidated
 * model. If distinct tracks are reinstated, this will need to become per-track.
 *
 * TODO(game-designer): provisional formula and base values — tune during balance pass.
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
  return Math.ceil(def.base_upgrade_cost * Math.pow(4, currentLevel - 1));
}

// ---------------------------------------------------------------------------
// Generator unlock checks
// ---------------------------------------------------------------------------

/**
 * Returns an updated generators map with any newly-unlocked generators based
 * on the current total follower count. A generator becomes available in the
 * shop (owned=true) once total_followers meets its unlock_threshold.
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
      `buyGenerator: generator '${generatorId}' is not yet unlocked`,
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
 * balance. Higher levels multiply output via `levelMultiplier(level)`.
 *
 * Throws if:
 * - The generator is not yet unlocked (owned=false).
 * - The generator has no units purchased (count=0). Upgrading a generator with
 *   no units is a no-op from a gameplay perspective, so it is disallowed to
 *   prevent silent engagement drain.
 * - The player cannot afford the cost.
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

  if (gen.count <= 0) {
    throw new Error(
      `upgradeGenerator: generator '${generatorId}' has no units — buy at least one first`,
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
