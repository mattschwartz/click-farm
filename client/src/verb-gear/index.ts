// Verb Gear module.
//
// Responsibility: per-run per-verb equipment purchases. Each of the 5 manual
// verbs has one gear item with 3 levels, each providing ~10x yield multiplier.
// Purchases spend Engagement and increment the player's level for that item.
// Gear state is wiped on rebrand; see prestige module.
//
// Architecture contract (architecture/verb-gear.md §Interface Contracts):
//   verbGearMultiplier(generatorId, verbGear, staticData) -> number
//   verbGearCost(currentLevel, gearId, staticData) -> number | null
//   canPurchaseVerbGear(state, gearId, staticData) -> boolean
//   purchaseVerbGear(state, gearId, staticData) -> GameState

import type { GameState, GeneratorId, StaticData, VerbGearId } from '../types.ts';
import { spendEngagement } from '../model/index.ts';
import { autoclickerCap } from '../generator/index.ts';

// ---------------------------------------------------------------------------
// Multiplier — the only function the tick pipeline calls
// ---------------------------------------------------------------------------

/**
 * Returns the cumulative gear multiplier for a given generator. O(1) lookup.
 * Returns 1.0 when:
 *   - The generator has no gear item (passive-only, post-prestige)
 *   - The gear level is 0 (unpurchased)
 *
 * Folds in after Clout effects in the multiplicative chain per
 * architecture/verb-gear.md §Stacking Order (position §4).
 */
export function verbGearMultiplier(
  generatorId: GeneratorId,
  verbGear: Record<VerbGearId, number>,
  staticData: StaticData,
): number {
  const def = staticData.verbGear[generatorId as VerbGearId];
  if (!def) return 1.0;
  const level = verbGear[def.id] ?? 0;
  return level <= 0 ? 1.0 : def.multipliers[level - 1];
}

// ---------------------------------------------------------------------------
// Cost lookup
// ---------------------------------------------------------------------------

/**
 * Returns the Engagement cost for the NEXT level of a gear item, or null if
 * the item is already at max level. Mirrors cloutUpgradeCost.
 */
export function verbGearCost(
  currentLevel: number,
  gearId: VerbGearId,
  staticData: StaticData,
): number | null {
  const def = staticData.verbGear[gearId];
  if (def === undefined) {
    throw new Error(`verbGearCost: unknown gear item '${gearId}'`);
  }
  if (currentLevel >= def.max_level) return null;
  const nextCost = def.cost[currentLevel];
  if (nextCost === undefined) {
    throw new Error(
      `verbGearCost: cost table missing entry ${currentLevel} for '${gearId}'`,
    );
  }
  return nextCost;
}

// ---------------------------------------------------------------------------
// Affordability check — non-throwing gate for UI consumers
// ---------------------------------------------------------------------------

/**
 * Returns true if the player can purchase the next level of the named gear
 * item. Checks autoclicker cap gate, max level, and engagement balance.
 */
export function canPurchaseVerbGear(
  state: GameState,
  gearId: VerbGearId,
  staticData: StaticData,
): boolean {
  // Gear purchases require the verb's autoclicker count to be at cap.
  const gen = state.generators[gearId];
  if (!gen || gen.autoclicker_count < autoclickerCap()) return false;

  const current = state.player.verb_gear[gearId] ?? 0;
  const cost = verbGearCost(current, gearId, staticData);
  if (cost === null) return false;
  return state.player.engagement >= cost;
}

// ---------------------------------------------------------------------------
// Purchase handler
// ---------------------------------------------------------------------------

/**
 * Spend Engagement to increment the named gear item's level by 1. Throws on
 * invariant violations (autoclicker not capped, max level, insufficient
 * Engagement). Same throw-on-invariant-violation pattern as
 * purchaseCloutUpgrade.
 *
 * State is only mutated after all validation steps pass — rejected purchases
 * leave the caller's state reference untouched.
 */
export function purchaseVerbGear(
  state: GameState,
  gearId: VerbGearId,
  staticData: StaticData,
): GameState {
  // Step 1: Autoclicker cap gate (arch spec §purchaseVerbGear step 1).
  const gen = state.generators[gearId];
  if (!gen || gen.autoclicker_count < autoclickerCap()) {
    throw new Error(
      `purchaseVerbGear: '${gearId}' autoclicker_count (${gen?.autoclicker_count ?? 0}) ` +
        `is below cap (${autoclickerCap()}) — gear purchases require a capped HIRE track`,
    );
  }

  // Step 2: Max level check.
  const current = state.player.verb_gear[gearId] ?? 0;
  const cost = verbGearCost(current, gearId, staticData);
  if (cost === null) {
    throw new Error(
      `purchaseVerbGear: '${gearId}' is already at max level`,
    );
  }

  // Step 3: Engagement check.
  if (state.player.engagement < cost) {
    throw new Error(
      `purchaseVerbGear: need ${cost} engagement for '${gearId}', have ${state.player.engagement}`,
    );
  }

  // Step 4 & 5: Spend engagement, increment level.
  const player = spendEngagement(state.player, cost);
  return {
    ...state,
    player: {
      ...player,
      verb_gear: {
        ...player.verb_gear,
        [gearId]: current + 1,
      },
    },
  };
}
