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
 *   cost = ceil(base_upgrade_cost × levelMultiplier(currentLevel + 1))
 *
 * Cost tracks reward 1:1 via the level-multiplier curve (2^(level²/5)), so a
 * tier's base seed value is what scales the whole ladder. This was the
 * originally-accepted formula; it was temporarily replaced with 4^(L-1) and
 * is restored here per proposals/accepted/generator-level-growth-curves.md.
 *
 * Duplicates the `levelMultiplier` formula from game-loop to avoid a
 * circular import. If this ever drifts, the canonical source is
 * `game-loop/index.ts::levelMultiplier`.
 *
 * TODO(game-designer): base seed values are provisional — tune in task #88.
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
  const targetLevel = currentLevel + 1;
  // Mirror of levelMultiplier's clamp for belt-and-braces safety.
  const clamped = Math.min(20, Math.max(1, targetLevel));
  const multiplier = Math.pow(2, (clamped * clamped) / 5);
  return Math.ceil(def.base_upgrade_cost * multiplier);
}

/**
 * Engagement cost to buy the next autoclicker for a generator.
 *
 *   cost = ceil(base_autoclicker_cost × buy_cost_multiplier^currentAutoclickerCount)
 *
 * Same exponential escalation as BUY. Only meaningful for manual_clickable
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
  return Math.ceil(
    def.base_autoclicker_cost * Math.pow(def.buy_cost_multiplier, currentAutoclickerCount),
  );
}

// ---------------------------------------------------------------------------
// Generator unlock checks
// ---------------------------------------------------------------------------

/**
 * Returns an updated generators map with any newly-unlocked generators based
 * on the current total follower count.
 *
 * Behavior splits by `manual_clickable` (per manual-action-ladder arch spec):
 *   - `manual_clickable: false` (passive-only): threshold-met → owned=true
 *     (today's behavior, unchanged).
 *   - `manual_clickable: true` (ladder verbs): threshold-met does NOT auto-flip
 *     owned. The player must pay the Unlock cost via `unlockGenerator`. The UI
 *     shows a ghost slot when threshold-met && !owned.
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
        // Manual-clickable generators require an explicit Unlock purchase —
        // threshold-met only makes them eligible (ghost-slot visible in UI).
        if (staticData.generators[id].manual_clickable) continue;
        next[id] = { ...generators[id], owned: true };
        changed = true;
      }
    }
  }

  return changed ? next : generators;
}

/**
 * Whether a manual-clickable generator is eligible for the Unlock purchase.
 * Pure derived view — no state mutation.
 */
export function canUnlockGenerator(
  verbId: GeneratorId,
  state: GameState,
  staticData: StaticData,
): boolean {
  const def = staticData.generators[verbId];
  if (!def.manual_clickable) return false;
  if (state.generators[verbId].owned) return false;
  const threshold = staticData.unlockThresholds.generators[verbId];
  return threshold !== undefined && state.player.total_followers >= threshold;
}

/**
 * Unlock a manual-clickable generator. Pays the Unlock cost (base_buy_cost per
 * D1 resolution) and flips owned=true.
 *
 * Throws if:
 * - The generator is not manual_clickable (passive-only gens use buyGenerator).
 * - The generator is already owned (already unlocked).
 * - The follower threshold is not yet met.
 * - The player cannot afford the Unlock cost.
 *
 * Pure — returns a new GameState; does not mutate the input.
 */
export function unlockGenerator(
  state: GameState,
  verbId: GeneratorId,
  staticData: StaticData,
): GameState {
  const def = staticData.generators[verbId];

  if (!def.manual_clickable) {
    throw new Error(
      `unlockGenerator: generator '${verbId}' is not manual-clickable — use buyGenerator for passive generators`,
    );
  }

  const gen = state.generators[verbId];

  if (gen.owned) {
    throw new Error(
      `unlockGenerator: generator '${verbId}' is already unlocked`,
    );
  }

  const threshold = staticData.unlockThresholds.generators[verbId];
  if (threshold === undefined || state.player.total_followers < threshold) {
    throw new Error(
      `unlockGenerator: generator '${verbId}' threshold not met — ` +
        `need ${threshold ?? '(no threshold)'} followers, have ${state.player.total_followers}`,
    );
  }

  // Unlock cost reuses base_buy_cost per D1 resolution (A2 assumption).
  const cost = def.base_buy_cost;

  if (!canAffordEngagement(state.player, cost)) {
    throw new Error(
      `unlockGenerator: cannot afford to unlock '${verbId}' — ` +
        `cost ${cost}, have ${state.player.engagement}`,
    );
  }

  return {
    ...state,
    player: spendEngagement(state.player, cost),
    generators: {
      ...state.generators,
      [verbId]: { ...gen, owned: true },
    },
  };
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
    const def = staticData.generators[generatorId];
    throw new Error(
      def.manual_clickable
        ? `buyGenerator: generator '${generatorId}' must be unlocked first — use unlockGenerator`
        : `buyGenerator: generator '${generatorId}' is not yet unlocked — check follower thresholds`,
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
