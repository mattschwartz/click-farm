// Tests for CreatorKitPanel pure helpers (task #81).
//
// The React component itself is not rendered here — no jsdom harness. Only
// the exported pure helpers (peek signal, active-count, purchase-state,
// level-indicator, display metadata) are exercised.

import { describe, it, expect } from 'vitest';
import {
  countActiveKitItems,
  getKitRowPurchaseState,
  isPeekSignalActive,
  formatKitLevelIndicator,
  KIT_ITEM_DISPLAY,
  KIT_ITEM_ORDER,
} from './CreatorKitPanel.tsx';
import { createInitialGameState } from '../model/index.ts';
import { STATIC_DATA } from '../static-data/index.ts';
import type { GameState, KitItemId } from '../types.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState(overrides: {
  engagement?: number;
  creatorKit?: Partial<Record<KitItemId, number>>;
} = {}): GameState {
  const base = createInitialGameState(STATIC_DATA, 0);
  return {
    ...base,
    player: {
      ...base.player,
      engagement: overrides.engagement ?? 0,
      creator_kit: {
        ...base.player.creator_kit,
        ...(overrides.creatorKit ?? {}),
      } as Record<KitItemId, number>,
    },
  };
}

// ---------------------------------------------------------------------------
// countActiveKitItems
// ---------------------------------------------------------------------------

describe('countActiveKitItems', () => {
  it('returns 0 for empty kit', () => {
    expect(countActiveKitItems({} as Record<KitItemId, number>)).toBe(0);
  });

  it('returns 0 when all items are at L0', () => {
    expect(
      countActiveKitItems(
        { camera: 0, laptop: 0, phone: 0, wardrobe: 0, mogging: 0 },
      ),
    ).toBe(0);
  });

  it('counts items at L1+', () => {
    expect(
      countActiveKitItems(
        { camera: 1, laptop: 0, phone: 2, wardrobe: 0, mogging: 3 },
      ),
    ).toBe(3);
  });

  it('counts all five when every item is owned', () => {
    expect(
      countActiveKitItems(
        { camera: 1, laptop: 1, phone: 1, wardrobe: 1, mogging: 1 },
      ),
    ).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// getKitRowPurchaseState
// ---------------------------------------------------------------------------

describe('getKitRowPurchaseState', () => {
  it('returns "max" when nextCost is null', () => {
    expect(getKitRowPurchaseState(999_999, null)).toBe('max');
  });

  it('returns "affordable" when engagement >= cost', () => {
    expect(getKitRowPurchaseState(500, 500)).toBe('affordable');
    expect(getKitRowPurchaseState(501, 500)).toBe('affordable');
  });

  it('returns "unaffordable" when engagement < cost', () => {
    expect(getKitRowPurchaseState(499, 500)).toBe('unaffordable');
    expect(getKitRowPurchaseState(0, 500)).toBe('unaffordable');
  });
});

// ---------------------------------------------------------------------------
// isPeekSignalActive
// ---------------------------------------------------------------------------

describe('isPeekSignalActive', () => {
  it('returns false when engagement is zero and nothing owned', () => {
    const state = makeState({ engagement: 0 });
    expect(isPeekSignalActive(state, STATIC_DATA)).toBe(false);
  });

  it('returns true at exactly the cheapest item cost threshold', () => {
    // Find the cheapest cost[0] across all kit items.
    const minFirstCost = Math.min(
      ...KIT_ITEM_ORDER.map((id) => STATIC_DATA.creatorKitItems[id].cost[0]),
    );
    const state = makeState({ engagement: minFirstCost });
    expect(isPeekSignalActive(state, STATIC_DATA)).toBe(true);
  });

  it('returns false one under the cheapest threshold', () => {
    const minFirstCost = Math.min(
      ...KIT_ITEM_ORDER.map((id) => STATIC_DATA.creatorKitItems[id].cost[0]),
    );
    const state = makeState({ engagement: minFirstCost - 1 });
    expect(isPeekSignalActive(state, STATIC_DATA)).toBe(false);
  });

  it('returns false when every item is at max level', () => {
    const creatorKit: Partial<Record<KitItemId, number>> = {};
    for (const id of KIT_ITEM_ORDER) {
      creatorKit[id] = STATIC_DATA.creatorKitItems[id].max_level;
    }
    const state = makeState({ engagement: 999_999_999, creatorKit });
    expect(isPeekSignalActive(state, STATIC_DATA)).toBe(false);
  });

  it('only considers items that are not yet maxed', () => {
    // Max out every item except the most expensive one, set engagement
    // below the cheapest remaining level cost → should be false.
    // Simpler case: max out everything EXCEPT camera, set engagement
    // slightly below camera.cost[current] threshold.
    const cameraDef = STATIC_DATA.creatorKitItems.camera;
    const creatorKit: Partial<Record<KitItemId, number>> = {
      camera: 0,
    };
    for (const id of KIT_ITEM_ORDER) {
      if (id === 'camera') continue;
      creatorKit[id] = STATIC_DATA.creatorKitItems[id].max_level;
    }
    // Just under camera's L0→L1 cost — should be false.
    const belowState = makeState({
      engagement: cameraDef.cost[0] - 1,
      creatorKit,
    });
    expect(isPeekSignalActive(belowState, STATIC_DATA)).toBe(false);
    // At camera's L0→L1 cost — should be true.
    const atState = makeState({
      engagement: cameraDef.cost[0],
      creatorKit,
    });
    expect(isPeekSignalActive(atState, STATIC_DATA)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// formatKitLevelIndicator
// ---------------------------------------------------------------------------

describe('formatKitLevelIndicator', () => {
  it('shows "L0 → L1" at level 0', () => {
    expect(formatKitLevelIndicator(0, 3)).toBe('L0 → L1');
  });

  it('shows "L2 → L3" at level 2 with max 3', () => {
    expect(formatKitLevelIndicator(2, 3)).toBe('L2 → L3');
  });

  it('shows "MAX" when currentLevel === maxLevel', () => {
    expect(formatKitLevelIndicator(3, 3)).toBe('MAX');
  });

  it('shows "MAX" when currentLevel > maxLevel (defensive)', () => {
    expect(formatKitLevelIndicator(4, 3)).toBe('MAX');
  });
});

// ---------------------------------------------------------------------------
// Display metadata coverage
// ---------------------------------------------------------------------------

describe('KIT_ITEM_DISPLAY', () => {
  it('has an entry for every KitItemId', () => {
    for (const id of KIT_ITEM_ORDER) {
      expect(KIT_ITEM_DISPLAY[id]).toBeDefined();
    }
  });

  it('flavor copy is ≤45 characters (UX §7 format constraint)', () => {
    for (const id of KIT_ITEM_ORDER) {
      expect(KIT_ITEM_DISPLAY[id].flavor.length).toBeLessThanOrEqual(45);
    }
  });

  it('order matches the static-data declaration order', () => {
    const staticOrder = Object.keys(
      STATIC_DATA.creatorKitItems,
    ) as KitItemId[];
    expect([...KIT_ITEM_ORDER]).toEqual(staticOrder);
  });
});
