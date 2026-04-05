// Tests for CloutShopModal pure helpers (task #64).
//
// The modal itself is a React component that isn't rendered in these tests
// (no jsdom env) — only the pure helpers are exercised here.

import { describe, it, expect } from 'vitest';
import {
  formatCloutBalance,
  formatLevelIndicator,
  formatCostCell,
  isOneShot,
  getRowPurchaseState,
  buildRowData,
  buildCategorizedRows,
  isShopEmpty,
  isShopAllMaxed,
  CATEGORY_ORDER,
  UPGRADE_DISPLAY,
} from './CloutShopModal.tsx';
import { createInitialGameState } from '../model/index.ts';
import { STATIC_DATA } from '../static-data/index.ts';
import type { UpgradeId } from '../types.ts';

// ---------------------------------------------------------------------------
// Minimal game state builder
// ---------------------------------------------------------------------------

function makeState(overrides: {
  clout?: number;
  rebrandCount?: number;
  ownedUpgrades?: Partial<Record<UpgradeId, number>>;
} = {}) {
  const base = createInitialGameState(STATIC_DATA, 0);
  return {
    ...base,
    player: {
      ...base.player,
      clout: overrides.clout ?? 0,
      rebrand_count: overrides.rebrandCount ?? 0,
      clout_upgrades: {
        ...base.player.clout_upgrades,
        ...(overrides.ownedUpgrades ?? {}),
      },
    },
  };
}

// ---------------------------------------------------------------------------
// formatCloutBalance
// ---------------------------------------------------------------------------

describe('formatCloutBalance', () => {
  it('formats zero Clout', () => {
    expect(formatCloutBalance(0)).toBe('Clout: 0');
  });

  it('formats a typical Clout balance', () => {
    expect(formatCloutBalance(42)).toBe('Clout: 42');
  });

  it('formats large Clout balance without formatting (whole number)', () => {
    expect(formatCloutBalance(1000)).toBe('Clout: 1000');
  });
});

// ---------------------------------------------------------------------------
// isOneShot
// ---------------------------------------------------------------------------

describe('isOneShot', () => {
  it('returns true for single-level upgrades (headstart + generator unlocks)', () => {
    expect(isOneShot('platform_headstart_instasham', STATIC_DATA)).toBe(true);
    expect(isOneShot('platform_headstart_grindset', STATIC_DATA)).toBe(true);
    expect(isOneShot('ai_slop_unlock', STATIC_DATA)).toBe(true);
    expect(isOneShot('deepfakes_unlock', STATIC_DATA)).toBe(true);
    expect(isOneShot('algorithmic_prophecy_unlock', STATIC_DATA)).toBe(true);
  });

  it('returns false for multi-level upgrades', () => {
    expect(isOneShot('engagement_boost', STATIC_DATA)).toBe(false);
    expect(isOneShot('algorithm_insight', STATIC_DATA)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// formatLevelIndicator
// ---------------------------------------------------------------------------

describe('formatLevelIndicator', () => {
  it('formats "locked" for unpurchased one-shots', () => {
    expect(formatLevelIndicator(0, 1, true)).toBe('locked');
  });

  it('formats "owned" for purchased one-shots', () => {
    expect(formatLevelIndicator(1, 1, true)).toBe('owned');
  });

  it('formats "Lv N/M" for multi-level upgrades', () => {
    expect(formatLevelIndicator(0, 3, false)).toBe('Lv 0/3');
    expect(formatLevelIndicator(2, 3, false)).toBe('Lv 2/3');
    expect(formatLevelIndicator(3, 3, false)).toBe('Lv 3/3');
  });
});

// ---------------------------------------------------------------------------
// formatCostCell
// ---------------------------------------------------------------------------

describe('formatCostCell', () => {
  it('shows cost number when not at max', () => {
    expect(formatCostCell(15, false, false)).toBe('15');
    expect(formatCostCell(25, true, false)).toBe('25');
  });

  it('shows MAX for maxed multi-level upgrades', () => {
    expect(formatCostCell(null, false, true)).toBe('MAX');
  });

  it('shows ✓ for owned one-shots', () => {
    expect(formatCostCell(null, true, true)).toBe('✓');
  });
});

// ---------------------------------------------------------------------------
// getRowPurchaseState
// ---------------------------------------------------------------------------

describe('getRowPurchaseState', () => {
  it('returns affordable when player has enough Clout', () => {
    const state = makeState({ clout: 100 });
    expect(getRowPurchaseState(state, 'engagement_boost', STATIC_DATA)).toBe('affordable');
  });

  it('returns insufficient when player is short on Clout', () => {
    const state = makeState({ clout: 5 });
    // engagement_boost costs 10 at level 0
    expect(getRowPurchaseState(state, 'engagement_boost', STATIC_DATA)).toBe('insufficient');
  });

  it('returns maxed when upgrade is at max level', () => {
    const state = makeState({
      clout: 1000,
      ownedUpgrades: { engagement_boost: 3 }, // max_level = 3
    });
    expect(getRowPurchaseState(state, 'engagement_boost', STATIC_DATA)).toBe('maxed');
  });

  it('returns maxed when a one-shot is owned', () => {
    const state = makeState({
      clout: 1000,
      ownedUpgrades: { ai_slop_unlock: 1 },
    });
    expect(getRowPurchaseState(state, 'ai_slop_unlock', STATIC_DATA)).toBe('maxed');
  });
});

// ---------------------------------------------------------------------------
// buildRowData
// ---------------------------------------------------------------------------

describe('buildRowData', () => {
  it('builds row data for an unpurchased multi-level upgrade', () => {
    const state = makeState({ clout: 20 });
    const row = buildRowData(state, 'engagement_boost', STATIC_DATA);
    expect(row.upgradeId).toBe('engagement_boost');
    expect(row.currentLevel).toBe(0);
    expect(row.maxLevel).toBe(3);
    expect(row.nextCost).toBe(10);
    expect(row.oneShot).toBe(false);
    expect(row.atMax).toBe(false);
    expect(row.purchaseState).toBe('affordable');
    expect(row.levelLabel).toBe('Lv 0/3');
    expect(row.costLabel).toBe('10');
  });

  it('builds row data for a maxed one-shot (owned + ✓)', () => {
    const state = makeState({
      clout: 0,
      ownedUpgrades: { ai_slop_unlock: 1 },
    });
    const row = buildRowData(state, 'ai_slop_unlock', STATIC_DATA);
    expect(row.atMax).toBe(true);
    expect(row.oneShot).toBe(true);
    expect(row.purchaseState).toBe('maxed');
    expect(row.levelLabel).toBe('owned');
    expect(row.costLabel).toBe('✓');
  });

  it('builds row data for a maxed multi-level (MAX)', () => {
    const state = makeState({
      ownedUpgrades: { engagement_boost: 3 },
    });
    const row = buildRowData(state, 'engagement_boost', STATIC_DATA);
    expect(row.atMax).toBe(true);
    expect(row.levelLabel).toBe('Lv 3/3');
    expect(row.costLabel).toBe('MAX');
  });

  it('builds row data for a locked one-shot (locked + cost)', () => {
    const state = makeState({ clout: 10 });
    const row = buildRowData(state, 'ai_slop_unlock', STATIC_DATA);
    expect(row.levelLabel).toBe('locked');
    expect(row.costLabel).toBe('25');
    expect(row.purchaseState).toBe('insufficient');
  });
});

// ---------------------------------------------------------------------------
// buildCategorizedRows
// ---------------------------------------------------------------------------

describe('buildCategorizedRows', () => {
  it('produces categories in the fixed order ENGAGEMENT → UNLOCKS → INSIGHT', () => {
    const state = makeState();
    const result = buildCategorizedRows(state, STATIC_DATA);
    expect(result.map((g) => g.category)).toEqual(['ENGAGEMENT', 'UNLOCKS', 'INSIGHT']);
  });

  it('places the engagement_boost upgrade in the ENGAGEMENT category', () => {
    const state = makeState();
    const result = buildCategorizedRows(state, STATIC_DATA);
    const engagement = result.find((g) => g.category === 'ENGAGEMENT')!;
    expect(engagement.rows.some((r) => r.upgradeId === 'engagement_boost')).toBe(true);
  });

  it('merges generator_unlock and platform_headstart into UNLOCKS', () => {
    const state = makeState();
    const result = buildCategorizedRows(state, STATIC_DATA);
    const unlocks = result.find((g) => g.category === 'UNLOCKS')!;
    const ids = unlocks.rows.map((r) => r.upgradeId);
    expect(ids).toContain('ai_slop_unlock');
    expect(ids).toContain('deepfakes_unlock');
    expect(ids).toContain('algorithmic_prophecy_unlock');
    expect(ids).toContain('platform_headstart_instasham');
    expect(ids).toContain('platform_headstart_grindset');
  });

  it('places algorithm_insight in INSIGHT', () => {
    const state = makeState();
    const result = buildCategorizedRows(state, STATIC_DATA);
    const insight = result.find((g) => g.category === 'INSIGHT')!;
    expect(insight.rows.some((r) => r.upgradeId === 'algorithm_insight')).toBe(true);
  });

  it('sorts rows within a category by ascending cost', () => {
    const state = makeState();
    const result = buildCategorizedRows(state, STATIC_DATA);
    const unlocks = result.find((g) => g.category === 'UNLOCKS')!;
    // Costs: instasham=20, ai_slop=25, grindset=50, deepfakes=60, prophecy=100
    expect(unlocks.rows[0].upgradeId).toBe('platform_headstart_instasham');
    expect(unlocks.rows[1].upgradeId).toBe('ai_slop_unlock');
    expect(unlocks.rows[2].upgradeId).toBe('platform_headstart_grindset');
    expect(unlocks.rows[3].upgradeId).toBe('deepfakes_unlock');
    expect(unlocks.rows[4].upgradeId).toBe('algorithmic_prophecy_unlock');
  });

  it('sinks maxed rows to the bottom of their category', () => {
    const state = makeState({
      ownedUpgrades: { platform_headstart_instasham: 1 }, // maxed (cost was 20)
    });
    const result = buildCategorizedRows(state, STATIC_DATA);
    const unlocks = result.find((g) => g.category === 'UNLOCKS')!;
    // Instasham (cheapest) is now maxed, should move to bottom.
    expect(unlocks.rows[unlocks.rows.length - 1].upgradeId).toBe('platform_headstart_instasham');
  });
});

// ---------------------------------------------------------------------------
// isShopEmpty
// ---------------------------------------------------------------------------

describe('isShopEmpty', () => {
  it('returns true when clout=0 AND rebrand_count=0', () => {
    expect(isShopEmpty(makeState({ clout: 0, rebrandCount: 0 }))).toBe(true);
  });

  it('returns false when clout > 0', () => {
    expect(isShopEmpty(makeState({ clout: 5, rebrandCount: 0 }))).toBe(false);
  });

  it('returns false when rebrand_count > 0 (even if clout=0)', () => {
    expect(isShopEmpty(makeState({ clout: 0, rebrandCount: 1 }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isShopAllMaxed
// ---------------------------------------------------------------------------

describe('isShopAllMaxed', () => {
  it('returns false when no upgrades owned', () => {
    expect(isShopAllMaxed(makeState(), STATIC_DATA)).toBe(false);
  });

  it('returns false when some but not all upgrades are maxed', () => {
    const state = makeState({
      ownedUpgrades: { engagement_boost: 3 }, // only this one is maxed
    });
    expect(isShopAllMaxed(state, STATIC_DATA)).toBe(false);
  });

  it('returns true when every upgrade is at max_level', () => {
    const state = makeState({
      ownedUpgrades: {
        engagement_boost: 3,
        algorithm_insight: 2,
        platform_headstart_instasham: 1,
        platform_headstart_grindset: 1,
        ai_slop_unlock: 1,
        deepfakes_unlock: 1,
        algorithmic_prophecy_unlock: 1,
      },
    });
    expect(isShopAllMaxed(state, STATIC_DATA)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// UPGRADE_DISPLAY + CATEGORY_ORDER — metadata sanity checks
// ---------------------------------------------------------------------------

describe('UPGRADE_DISPLAY metadata', () => {
  it('has an entry for every UpgradeId in static data', () => {
    for (const id of Object.keys(STATIC_DATA.cloutUpgrades) as UpgradeId[]) {
      expect(UPGRADE_DISPLAY[id]).toBeDefined();
      expect(UPGRADE_DISPLAY[id].name).toBeTruthy();
      expect(UPGRADE_DISPLAY[id].icon).toBeTruthy();
      expect(UPGRADE_DISPLAY[id].description).toBeTruthy();
    }
  });

  it('assigns every upgrade to one of the three known categories', () => {
    for (const id of Object.keys(UPGRADE_DISPLAY) as UpgradeId[]) {
      expect(CATEGORY_ORDER).toContain(UPGRADE_DISPLAY[id].category);
    }
  });
});
