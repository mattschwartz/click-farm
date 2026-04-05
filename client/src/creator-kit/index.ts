// Creator Kit module.
//
// Responsibility: per-run kit item purchases (Camera, Laptop, Phone,
// Wardrobe, Mogging). Purchases spend Engagement and increment the player's
// level for that item. Kit state is wiped on rebrand; see prestige module.
//
// Architecture contract (architecture/creator-kit.md §Purchase):
//   kitItemCost(currentLevel, itemId, staticData) → number | null
//   canPurchaseKitItem(state, itemId, staticData) → boolean
//   purchaseKitItem(state, itemId, staticData, options?) → GameState
//
// The purchase handler follows the same throw-on-invariant-violation pattern
// as purchaseCloutUpgrade (prestige/index.ts). A structured `options` bag is
// accepted so the mid-run Phone head-start (task #78) can layer a
// post-purchase hook in without rewriting this handler.

import type { GameState, KitItemId, StaticData } from '../types.ts';
import { spendEngagement } from '../model/index.ts';

// ---------------------------------------------------------------------------
// Cost lookup
// ---------------------------------------------------------------------------

/**
 * Returns the Engagement cost for the NEXT level of a kit item, or null if
 * the item is already at max level. Mirrors cloutUpgradeCost.
 */
export function kitItemCost(
  currentLevel: number,
  itemId: KitItemId,
  staticData: StaticData,
): number | null {
  const def = staticData.creatorKitItems[itemId];
  if (def === undefined) {
    throw new Error(`kitItemCost: unknown kit item '${itemId}'`);
  }
  if (currentLevel >= def.max_level) return null;
  // cost[0] is the cost for level 1 (going from 0 → 1), etc.
  const nextCost = def.cost[currentLevel];
  if (nextCost === undefined) {
    throw new Error(
      `kitItemCost: cost table missing entry ${currentLevel} for '${itemId}'`,
    );
  }
  return nextCost;
}

// ---------------------------------------------------------------------------
// Affordability check — non-throwing gate for UI consumers
// ---------------------------------------------------------------------------

export function canPurchaseKitItem(
  state: GameState,
  itemId: KitItemId,
  staticData: StaticData,
): boolean {
  const current = state.player.creator_kit[itemId] ?? 0;
  const cost = kitItemCost(current, itemId, staticData);
  if (cost === null) return false;
  return state.player.engagement >= cost;
}

// ---------------------------------------------------------------------------
// Purchase handler
// ---------------------------------------------------------------------------

/**
 * Optional hooks applied after level increment but before the GameState is
 * returned. Used by task #78 (Phone mid-run head-start) to re-run the
 * sequential head-start pass when Phone's level advances.
 */
export interface PurchaseKitOptions {
  /**
   * Applied after engagement has been spent and the item's level has been
   * incremented. Receives the new state, the item id that was just
   * purchased, and the new level. Returns the (possibly further-mutated)
   * state.
   *
   * MUST be deterministic and side-effect-free beyond the returned state.
   */
  afterPurchase?: (
    state: GameState,
    itemId: KitItemId,
    newLevel: number,
  ) => GameState;
}

/**
 * Spend Engagement to increment the named kit item's level by 1. Throws on
 * insufficient Engagement or max-level (invariant-violation pattern shared
 * with purchaseCloutUpgrade).
 *
 * State is only mutated after both validation steps pass — rejected
 * purchases leave the caller's state reference untouched.
 */
export function purchaseKitItem(
  state: GameState,
  itemId: KitItemId,
  staticData: StaticData,
  options: PurchaseKitOptions = {},
): GameState {
  const current = state.player.creator_kit[itemId] ?? 0;
  const cost = kitItemCost(current, itemId, staticData);
  if (cost === null) {
    throw new Error(
      `purchaseKitItem: '${itemId}' is already at max level`,
    );
  }
  if (state.player.engagement < cost) {
    throw new Error(
      `purchaseKitItem: need ${cost} engagement for '${itemId}', have ${state.player.engagement}`,
    );
  }

  const player = spendEngagement(state.player, cost);
  const newLevel = current + 1;
  const nextState: GameState = {
    ...state,
    player: {
      ...player,
      creator_kit: {
        ...player.creator_kit,
        [itemId]: newLevel,
      },
    },
  };

  if (options.afterPurchase) {
    return options.afterPurchase(nextState, itemId, newLevel);
  }
  return nextState;
}
