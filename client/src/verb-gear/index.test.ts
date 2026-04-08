import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import '../test/decimal-matchers.ts';
import {
  verbGearMultiplier,
  verbGearCost,
  canPurchaseVerbGear,
  purchaseVerbGear,
} from './index.ts';
import { createInitialGameState } from '../model/index.ts';
import { STATIC_DATA } from '../static-data/index.ts';
import type { GameState, GeneratorId, VerbGearId } from '../types.ts';

const T0 = 1_000_000;

function seedState(overrides?: {
  engagement?: number;
  verb_gear?: Partial<Record<VerbGearId, number>>;
  autoclicker_count?: number;
}): GameState {
  const base = createInitialGameState(STATIC_DATA, T0);
  // Give chirps ownership and optionally set autoclicker_count.
  const autoCount = overrides?.autoclicker_count ?? 12;
  const state: GameState = {
    ...base,
    generators: {
      ...base.generators,
      chirps: {
        ...base.generators.chirps,
        owned: true,
        count: 1,
        level: 1,
        autoclicker_count: autoCount,
      },
      selfies: {
        ...base.generators.selfies,
        owned: true,
        count: 1,
        level: 1,
        autoclicker_count: autoCount,
      },
    },
    player: {
      ...base.player,
      engagement: new Decimal(overrides?.engagement ?? 0),
      verb_gear: (overrides?.verb_gear ?? {}) as Record<VerbGearId, number>,
    },
  };
  return state;
}

// ---------------------------------------------------------------------------
// verbGearMultiplier
// ---------------------------------------------------------------------------

describe('verbGearMultiplier', () => {
  it('returns 1.0 for a manual verb with no gear purchased', () => {
    const result = verbGearMultiplier(
      'chirps',
      {} as Record<VerbGearId, number>,
      STATIC_DATA,
    );
    expect(result).toBe(1.0);
  });

  it('returns 1.0 for a manual verb at gear level 0', () => {
    const result = verbGearMultiplier(
      'chirps',
      { chirps: 0 } as Record<VerbGearId, number>,
      STATIC_DATA,
    );
    expect(result).toBe(1.0);
  });

  it('returns cumulative multiplier at level 1', () => {
    const result = verbGearMultiplier(
      'chirps',
      { chirps: 1 } as Record<VerbGearId, number>,
      STATIC_DATA,
    );
    expect(result).toBe(1_234);
  });

  it('returns cumulative multiplier at level 2', () => {
    const result = verbGearMultiplier(
      'chirps',
      { chirps: 2 } as Record<VerbGearId, number>,
      STATIC_DATA,
    );
    expect(result).toBe(1_522_756);
  });

  it('returns cumulative multiplier at level 3 (max)', () => {
    const result = verbGearMultiplier(
      'chirps',
      { chirps: 3 } as Record<VerbGearId, number>,
      STATIC_DATA,
    );
    expect(result).toBe(1_879_080_904);
  });

  it('returns 1.0 for passive-only generators (memes)', () => {
    const result = verbGearMultiplier(
      'memes',
      { chirps: 3 } as Record<VerbGearId, number>,
      STATIC_DATA,
    );
    expect(result).toBe(1.0);
  });

  it('returns 1.0 for passive-only generators (hot_takes)', () => {
    expect(
      verbGearMultiplier(
        'hot_takes',
        { chirps: 3 } as Record<VerbGearId, number>,
        STATIC_DATA,
      ),
    ).toBe(1.0);
  });

  it('returns 1.0 for passive-only generators (tutorials)', () => {
    expect(
      verbGearMultiplier(
        'tutorials',
        { chirps: 3 } as Record<VerbGearId, number>,
        STATIC_DATA,
      ),
    ).toBe(1.0);
  });

  it('returns 1.0 for post-prestige generators', () => {
    const postPrestige: GeneratorId[] = ['ai_slop', 'deepfakes', 'algorithmic_prophecy'];
    for (const id of postPrestige) {
      expect(
        verbGearMultiplier(
          id,
          { chirps: 3 } as Record<VerbGearId, number>,
          STATIC_DATA,
        ),
      ).toBe(1.0);
    }
  });

  it('returns correct multiplier per-verb independently', () => {
    const gear = { chirps: 1, selfies: 2 } as Record<VerbGearId, number>;
    expect(verbGearMultiplier('chirps', gear, STATIC_DATA)).toBe(1_234);
    expect(verbGearMultiplier('selfies', gear, STATIC_DATA)).toBe(1_522_756);
    expect(verbGearMultiplier('livestreams', gear, STATIC_DATA)).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// verbGearCost
// ---------------------------------------------------------------------------

describe('verbGearCost', () => {
  it('returns L1 cost at level 0', () => {
    expect(verbGearCost(0, 'chirps', STATIC_DATA)).toEqualDecimal(2e9);
  });

  it('returns L2 cost at level 1', () => {
    expect(verbGearCost(1, 'chirps', STATIC_DATA)).toEqualDecimal(2e12);
  });

  it('returns L3 cost at level 2', () => {
    expect(verbGearCost(2, 'chirps', STATIC_DATA)).toEqualDecimal(2e15);
  });

  it('returns null at max level', () => {
    expect(verbGearCost(3, 'chirps', STATIC_DATA)).toBeNull();
  });

  it('throws for unknown gear id', () => {
    expect(() => verbGearCost(0, 'bogus' as VerbGearId, STATIC_DATA)).toThrow(
      /unknown gear item/,
    );
  });

  it('costs are different per verb', () => {
    expect(verbGearCost(0, 'chirps', STATIC_DATA)).toEqualDecimal(2e9);
    expect(verbGearCost(0, 'selfies', STATIC_DATA)).toEqualDecimal(20e9);
    expect(verbGearCost(0, 'livestreams', STATIC_DATA)).toEqualDecimal(200e9);
    expect(verbGearCost(0, 'podcasts', STATIC_DATA)).toEqualDecimal(2e12);
    expect(verbGearCost(0, 'viral_stunts', STATIC_DATA)).toEqualDecimal(20e12);
  });
});

// ---------------------------------------------------------------------------
// canPurchaseVerbGear
// ---------------------------------------------------------------------------

describe('canPurchaseVerbGear', () => {
  it('returns true when autoclickers at cap, level 0, and enough engagement', () => {
    const state = seedState({ engagement: 2e9, autoclicker_count: 12 });
    expect(canPurchaseVerbGear(state, 'chirps', STATIC_DATA)).toBe(true);
  });

  it('returns false when autoclickers below cap', () => {
    const state = seedState({ engagement: 2e9, autoclicker_count: 5 });
    expect(canPurchaseVerbGear(state, 'chirps', STATIC_DATA)).toBe(false);
  });

  it('returns false when at max level', () => {
    const state = seedState({ engagement: 1e18, verb_gear: { chirps: 3 }, autoclicker_count: 12 });
    expect(canPurchaseVerbGear(state, 'chirps', STATIC_DATA)).toBe(false);
  });

  it('returns false when insufficient engagement', () => {
    const state = seedState({ engagement: 1, autoclicker_count: 12 });
    expect(canPurchaseVerbGear(state, 'chirps', STATIC_DATA)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// purchaseVerbGear
// ---------------------------------------------------------------------------

describe('purchaseVerbGear', () => {
  it('increments gear level and deducts engagement', () => {
    const state = seedState({ engagement: 2e9, autoclicker_count: 12 });
    const next = purchaseVerbGear(state, 'chirps', STATIC_DATA);
    expect(next.player.verb_gear.chirps).toBe(1);
    expect(next.player.engagement).toEqualDecimal(0);
  });

  it('increments from level 1 to level 2', () => {
    const state = seedState({
      engagement: 2e12,
      verb_gear: { chirps: 1 },
      autoclicker_count: 12,
    });
    const next = purchaseVerbGear(state, 'chirps', STATIC_DATA);
    expect(next.player.verb_gear.chirps).toBe(2);
    expect(next.player.engagement).toEqualDecimal(0);
  });

  it('throws when autoclicker_count < 12', () => {
    const state = seedState({ engagement: 2e9, autoclicker_count: 5 });
    expect(() => purchaseVerbGear(state, 'chirps', STATIC_DATA)).toThrow(
      /below cap/,
    );
  });

  it('throws when at max level', () => {
    const state = seedState({
      engagement: 1e18,
      verb_gear: { chirps: 3 },
      autoclicker_count: 12,
    });
    expect(() => purchaseVerbGear(state, 'chirps', STATIC_DATA)).toThrow(
      /max level/,
    );
  });

  it('throws when insufficient engagement', () => {
    const state = seedState({ engagement: 1, autoclicker_count: 12 });
    expect(() => purchaseVerbGear(state, 'chirps', STATIC_DATA)).toThrow(
      /need.*engagement/,
    );
  });

  it('does not affect other verb gear levels', () => {
    const state = seedState({
      engagement: 2e9,
      verb_gear: { selfies: 2 },
      autoclicker_count: 12,
    });
    const next = purchaseVerbGear(state, 'chirps', STATIC_DATA);
    expect(next.player.verb_gear.selfies).toBe(2);
    expect(next.player.verb_gear.chirps).toBe(1);
  });
});
