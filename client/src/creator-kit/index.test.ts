import { describe, it, expect } from 'vitest';
import {
  kitItemCost,
  canPurchaseKitItem,
  purchaseKitItem,
  kitEngagementBonus,
  kitFollowerConversionBonus,
  kitAlgorithmLookaheadBonus,
} from './index.ts';
import { createInitialGameState } from '../model/index.ts';
import { STATIC_DATA } from '../static-data/index.ts';
import type { GameState, KitItemId, PlatformId } from '../types.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function seed(engagement: number): GameState {
  const state = createInitialGameState(STATIC_DATA, 0);
  return {
    ...state,
    player: { ...state.player, engagement },
  };
}

// ---------------------------------------------------------------------------
// kitItemCost
// ---------------------------------------------------------------------------

describe('kitItemCost', () => {
  it('returns the cost for the next level (level 0 → cost[0])', () => {
    const expected = STATIC_DATA.creatorKitItems.camera.cost[0];
    expect(kitItemCost(0, 'camera', STATIC_DATA)).toBe(expected);
  });

  it('returns the cost for each subsequent level', () => {
    const def = STATIC_DATA.creatorKitItems.laptop;
    for (let level = 0; level < def.max_level; level++) {
      expect(kitItemCost(level, 'laptop', STATIC_DATA)).toBe(def.cost[level]);
    }
  });

  it('returns null when the item is at max level', () => {
    const max = STATIC_DATA.creatorKitItems.camera.max_level;
    expect(kitItemCost(max, 'camera', STATIC_DATA)).toBeNull();
  });

  it('throws on unknown item id', () => {
    expect(() =>
      kitItemCost(0, 'ghost' as unknown as KitItemId, STATIC_DATA),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// canPurchaseKitItem
// ---------------------------------------------------------------------------

describe('canPurchaseKitItem', () => {
  it('returns true when the player can afford the next level', () => {
    const cost = STATIC_DATA.creatorKitItems.camera.cost[0];
    const state = seed(cost);
    expect(canPurchaseKitItem(state, 'camera', STATIC_DATA)).toBe(true);
  });

  it('returns false when the player cannot afford the next level', () => {
    const cost = STATIC_DATA.creatorKitItems.camera.cost[0];
    const state = seed(cost - 1);
    expect(canPurchaseKitItem(state, 'camera', STATIC_DATA)).toBe(false);
  });

  it('returns false when the item is at max level (regardless of balance)', () => {
    const max = STATIC_DATA.creatorKitItems.mogging.max_level;
    const state: GameState = {
      ...seed(999_999),
      player: {
        ...seed(999_999).player,
        creator_kit: { mogging: max } as GameState['player']['creator_kit'],
      },
    };
    expect(canPurchaseKitItem(state, 'mogging', STATIC_DATA)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// purchaseKitItem — successful purchases
// ---------------------------------------------------------------------------

describe('purchaseKitItem — success path', () => {
  it('increments the item level from 0 to 1 on first purchase', () => {
    const cost = STATIC_DATA.creatorKitItems.camera.cost[0];
    const state = seed(cost);
    const next = purchaseKitItem(state, 'camera', STATIC_DATA);
    expect(next.player.creator_kit.camera).toBe(1);
  });

  it('increments from an existing level correctly', () => {
    const def = STATIC_DATA.creatorKitItems.laptop;
    // Start at level 1, buy level 2 — cost is def.cost[1].
    const state: GameState = {
      ...seed(def.cost[1]),
      player: {
        ...seed(def.cost[1]).player,
        creator_kit: { laptop: 1 } as GameState['player']['creator_kit'],
      },
    };
    const next = purchaseKitItem(state, 'laptop', STATIC_DATA);
    expect(next.player.creator_kit.laptop).toBe(2);
  });

  it('decrements engagement by exactly the cost of the next level', () => {
    const cost = STATIC_DATA.creatorKitItems.wardrobe.cost[0];
    const state = seed(cost + 1_000);
    const next = purchaseKitItem(state, 'wardrobe', STATIC_DATA);
    expect(next.player.engagement).toBe(1_000);
  });

  it('returns a new state object — does not mutate the input', () => {
    const cost = STATIC_DATA.creatorKitItems.camera.cost[0];
    const state = seed(cost);
    const before = JSON.stringify(state);
    purchaseKitItem(state, 'camera', STATIC_DATA);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('leaves other kit items untouched', () => {
    const cost = STATIC_DATA.creatorKitItems.camera.cost[0];
    const state: GameState = {
      ...seed(cost + 9_999),
      player: {
        ...seed(cost + 9_999).player,
        creator_kit: { laptop: 2 } as GameState['player']['creator_kit'],
      },
    };
    const next = purchaseKitItem(state, 'camera', STATIC_DATA);
    expect(next.player.creator_kit.laptop).toBe(2);
    expect(next.player.creator_kit.camera).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// purchaseKitItem — rejection paths
// ---------------------------------------------------------------------------

describe('purchaseKitItem — rejection paths', () => {
  it('throws when the item is already at max level', () => {
    const max = STATIC_DATA.creatorKitItems.camera.max_level;
    const state: GameState = {
      ...seed(999_999),
      player: {
        ...seed(999_999).player,
        creator_kit: { camera: max } as GameState['player']['creator_kit'],
      },
    };
    expect(() => purchaseKitItem(state, 'camera', STATIC_DATA)).toThrow(
      /max level/i,
    );
  });

  it('throws when the player cannot afford the next level', () => {
    const cost = STATIC_DATA.creatorKitItems.camera.cost[0];
    const state = seed(cost - 1);
    expect(() => purchaseKitItem(state, 'camera', STATIC_DATA)).toThrow(
      /engagement/i,
    );
  });

  it('does not spend engagement when rejected for insufficient funds', () => {
    const cost = STATIC_DATA.creatorKitItems.camera.cost[0];
    const state = seed(cost - 1);
    try {
      purchaseKitItem(state, 'camera', STATIC_DATA);
    } catch {
      // expected
    }
    expect(state.player.engagement).toBe(cost - 1);
  });

  it('does not increment level when rejected for max level', () => {
    const max = STATIC_DATA.creatorKitItems.camera.max_level;
    const state: GameState = {
      ...seed(999_999),
      player: {
        ...seed(999_999).player,
        creator_kit: { camera: max } as GameState['player']['creator_kit'],
      },
    };
    try {
      purchaseKitItem(state, 'camera', STATIC_DATA);
    } catch {
      // expected
    }
    expect(state.player.creator_kit.camera).toBe(max);
  });
});

// ---------------------------------------------------------------------------
// purchaseKitItem — afterPurchase hook (post-purchase extension point)
// ---------------------------------------------------------------------------

describe('purchaseKitItem — afterPurchase hook', () => {
  it('invokes the hook with the post-purchase state, item id, and new level', () => {
    const cost = STATIC_DATA.creatorKitItems.phone.cost[0];
    const state = seed(cost);
    let observed: { itemId: KitItemId; newLevel: number; engagement: number } | null = null;
    purchaseKitItem(state, 'phone', STATIC_DATA, {
      afterPurchase: (s, itemId, newLevel) => {
        observed = {
          itemId,
          newLevel,
          engagement: s.player.engagement,
        };
        return s;
      },
    });
    expect(observed).not.toBeNull();
    expect(observed!.itemId).toBe('phone');
    expect(observed!.newLevel).toBe(1);
    expect(observed!.engagement).toBe(0); // cost was fully spent
  });

  it('returns the state produced by the hook', () => {
    const cost = STATIC_DATA.creatorKitItems.phone.cost[0];
    const state = seed(cost + 500);
    const next = purchaseKitItem(state, 'phone', STATIC_DATA, {
      afterPurchase: (s) => ({
        ...s,
        player: { ...s.player, engagement: s.player.engagement + 100 },
      }),
    });
    expect(next.player.engagement).toBe(500 + 100);
  });

  it('does not invoke the hook when the purchase is rejected', () => {
    const state = seed(0); // can't afford anything
    let called = false;
    try {
      purchaseKitItem(state, 'camera', STATIC_DATA, {
        afterPurchase: (s) => {
          called = true;
          return s;
        },
      });
    } catch {
      // expected
    }
    expect(called).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Effect bonus helpers — kitEngagementBonus / kitFollowerConversionBonus
// ---------------------------------------------------------------------------

describe('kitEngagementBonus', () => {
  it('returns 1.0 for an empty kit', () => {
    expect(
      kitEngagementBonus({} as Record<KitItemId, number>, STATIC_DATA),
    ).toBe(1.0);
  });

  it('returns 1.0 when camera is at level 0', () => {
    expect(
      kitEngagementBonus(
        { camera: 0 } as Record<KitItemId, number>,
        STATIC_DATA,
      ),
    ).toBe(1.0);
  });

  it('returns camera.values[level-1] at each level', () => {
    const def = STATIC_DATA.creatorKitItems.camera;
    if (def.effect.type !== 'engagement_multiplier') throw new Error('bad def');
    for (let level = 1; level <= def.max_level; level++) {
      expect(
        kitEngagementBonus(
          { camera: level } as Record<KitItemId, number>,
          STATIC_DATA,
        ),
      ).toBeCloseTo(def.effect.values[level - 1], 10);
    }
  });

  it('ignores items whose effect is not engagement_multiplier', () => {
    // Mogging, Wardrobe, Laptop, Phone — all non-engagement effects.
    expect(
      kitEngagementBonus(
        { mogging: 2, wardrobe: 2, laptop: 2, phone: 2 } as Record<KitItemId, number>,
        STATIC_DATA,
      ),
    ).toBe(1.0);
  });
});

describe('kitFollowerConversionBonus', () => {
  it('returns 1.0 for an empty kit', () => {
    expect(
      kitFollowerConversionBonus({} as Record<KitItemId, number>, STATIC_DATA),
    ).toBe(1.0);
  });

  it('returns 1.0 when wardrobe is at level 0', () => {
    expect(
      kitFollowerConversionBonus(
        { wardrobe: 0 } as Record<KitItemId, number>,
        STATIC_DATA,
      ),
    ).toBe(1.0);
  });

  it('returns wardrobe.values[level-1] at each level', () => {
    const def = STATIC_DATA.creatorKitItems.wardrobe;
    if (def.effect.type !== 'follower_conversion_multiplier') throw new Error('bad def');
    for (let level = 1; level <= def.max_level; level++) {
      expect(
        kitFollowerConversionBonus(
          { wardrobe: level } as Record<KitItemId, number>,
          STATIC_DATA,
        ),
      ).toBeCloseTo(def.effect.values[level - 1], 10);
    }
  });

  it('ignores items whose effect is not follower_conversion_multiplier', () => {
    expect(
      kitFollowerConversionBonus(
        { camera: 2, mogging: 2, laptop: 2, phone: 2 } as Record<KitItemId, number>,
        STATIC_DATA,
      ),
    ).toBe(1.0);
  });
});

describe('kitAlgorithmLookaheadBonus', () => {
  it('returns 0 for an empty kit', () => {
    expect(
      kitAlgorithmLookaheadBonus({} as Record<KitItemId, number>, STATIC_DATA),
    ).toBe(0);
  });

  it('returns 0 when laptop is at level 0', () => {
    expect(
      kitAlgorithmLookaheadBonus(
        { laptop: 0 } as Record<KitItemId, number>,
        STATIC_DATA,
      ),
    ).toBe(0);
  });

  it('returns laptop.lookaheads[level-1] at each level', () => {
    const def = STATIC_DATA.creatorKitItems.laptop;
    if (def.effect.type !== 'algorithm_lookahead') throw new Error('bad def');
    for (let level = 1; level <= def.max_level; level++) {
      expect(
        kitAlgorithmLookaheadBonus(
          { laptop: level } as Record<KitItemId, number>,
          STATIC_DATA,
        ),
      ).toBe(def.effect.lookaheads[level - 1]);
    }
  });

  it('ignores items whose effect is not algorithm_lookahead', () => {
    expect(
      kitAlgorithmLookaheadBonus(
        { camera: 2, wardrobe: 2, mogging: 2, phone: 2 } as Record<KitItemId, number>,
        STATIC_DATA,
      ),
    ).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Phone sequential head-start (applied inside purchaseKitItem)
// ---------------------------------------------------------------------------

describe('purchaseKitItem — Phone sequential head-start', () => {
  const phoneCost0 = STATIC_DATA.creatorKitItems.phone.cost[0];
  const phoneCost1 = STATIC_DATA.creatorKitItems.phone.cost[1];
  const platformIdsInOrder = Object.keys(
    STATIC_DATA.platforms,
  ) as PlatformId[];

  it('L1 with no Clout head-starts → unlocks the first still-locked platform (picshift)', () => {
    const state = seed(phoneCost0);
    // Sanity: initial state has chirper unlocked (threshold=0), others locked.
    expect(state.platforms.chirper.unlocked).toBe(true);
    expect(state.platforms.picshift.unlocked).toBe(false);
    expect(state.platforms.skroll.unlocked).toBe(false);

    const next = purchaseKitItem(state, 'phone', STATIC_DATA);
    expect(next.player.creator_kit.phone).toBe(1);
    expect(next.platforms.picshift.unlocked).toBe(true);
    // Grindset still locked — Phone L1 only unlocks one platform.
    expect(next.platforms.skroll.unlocked).toBe(false);
  });

  it('L1 with Clout head-start covering platform[1] → unlocks the next still-locked (skroll)', () => {
    // Simulate rebrand-time Clout head-start by pre-unlocking picshift.
    const base = seed(phoneCost0);
    const state: GameState = {
      ...base,
      platforms: {
        ...base.platforms,
        picshift: { ...base.platforms.picshift, unlocked: true },
      },
    };

    const next = purchaseKitItem(state, 'phone', STATIC_DATA);
    expect(next.platforms.picshift.unlocked).toBe(true);
    expect(next.platforms.skroll.unlocked).toBe(true);
  });

  it('L2 via two sequential purchases → unlocks the first two still-locked platforms in order', () => {
    const state = seed(phoneCost0 + phoneCost1);

    const afterFirst = purchaseKitItem(state, 'phone', STATIC_DATA);
    expect(afterFirst.player.creator_kit.phone).toBe(1);
    expect(afterFirst.platforms.picshift.unlocked).toBe(true);
    expect(afterFirst.platforms.skroll.unlocked).toBe(false);

    const afterSecond = purchaseKitItem(afterFirst, 'phone', STATIC_DATA);
    expect(afterSecond.player.creator_kit.phone).toBe(2);
    expect(afterSecond.platforms.picshift.unlocked).toBe(true);
    expect(afterSecond.platforms.skroll.unlocked).toBe(true);
  });

  it('is Inert when all platforms are already unlocked (engagement spent, level incremented, no platform change)', () => {
    const base = seed(phoneCost0 + 1_234);
    const state: GameState = {
      ...base,
      platforms: Object.fromEntries(
        platformIdsInOrder.map((pid) => [
          pid,
          { ...base.platforms[pid], unlocked: true },
        ]),
      ) as typeof base.platforms,
    };

    const next = purchaseKitItem(state, 'phone', STATIC_DATA);
    expect(next.player.creator_kit.phone).toBe(1);
    expect(next.player.engagement).toBe(1_234); // cost spent
    // All platforms remain unlocked; nothing else flipped.
    for (const pid of platformIdsInOrder) {
      expect(next.platforms[pid].unlocked).toBe(true);
    }
  });

  it('iterates in static-declaration order (chirper → picshift → skroll)', () => {
    // Regression guard: if the first platform were locked somehow, Phone
    // would unlock it before touching later ones.
    const base = seed(phoneCost0);
    const state: GameState = {
      ...base,
      platforms: {
        ...base.platforms,
        chirper: { ...base.platforms.chirper, unlocked: false },
      },
    };

    const next = purchaseKitItem(state, 'phone', STATIC_DATA);
    expect(next.platforms.chirper.unlocked).toBe(true);
    expect(next.platforms.picshift.unlocked).toBe(false);
  });
});
