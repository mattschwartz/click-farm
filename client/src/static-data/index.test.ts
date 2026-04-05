import { describe, it, expect } from 'vitest';
import { STATIC_DATA } from './index.ts';
import type { KitItemId } from '../types.ts';

// ---------------------------------------------------------------------------
// Creator Kit static data — structural invariants (task #74)
// Balance values are placeholders owned by game-designer; these tests check
// only the structural guarantees the rest of the code depends on.
// ---------------------------------------------------------------------------

describe('STATIC_DATA.creatorKitItems', () => {
  const expectedIds: KitItemId[] = [
    'camera',
    'laptop',
    'phone',
    'wardrobe',
    'mogging',
  ];

  it('contains exactly the five expected item ids', () => {
    const keys = Object.keys(STATIC_DATA.creatorKitItems).sort();
    expect(keys).toEqual([...expectedIds].sort());
  });

  it('each item id field matches its record key', () => {
    for (const id of expectedIds) {
      expect(STATIC_DATA.creatorKitItems[id].id).toBe(id);
    }
  });

  it('each cost[] has length === max_level', () => {
    for (const id of expectedIds) {
      const def = STATIC_DATA.creatorKitItems[id];
      expect(def.cost.length).toBe(def.max_level);
    }
  });

  it('each value/lookahead array (if present) has length === max_level', () => {
    for (const id of expectedIds) {
      const def = STATIC_DATA.creatorKitItems[id];
      switch (def.effect.type) {
        case 'engagement_multiplier':
        case 'follower_conversion_multiplier':
        case 'viral_burst_amplifier':
          expect(def.effect.values.length).toBe(def.max_level);
          break;
        case 'algorithm_lookahead':
          expect(def.effect.lookaheads.length).toBe(def.max_level);
          break;
        case 'platform_headstart_sequential':
          // no value array — sequential semantics
          break;
      }
    }
  });

  it('cost[] is strictly ascending per item', () => {
    for (const id of expectedIds) {
      const { cost } = STATIC_DATA.creatorKitItems[id];
      for (let i = 1; i < cost.length; i++) {
        expect(cost[i]).toBeGreaterThan(cost[i - 1]);
      }
    }
  });

  it('value/lookahead arrays are non-decreasing (monotonic cumulative effect)', () => {
    for (const id of expectedIds) {
      const { effect } = STATIC_DATA.creatorKitItems[id];
      const arr =
        effect.type === 'algorithm_lookahead'
          ? effect.lookaheads
          : effect.type === 'platform_headstart_sequential'
            ? null
            : effect.values;
      if (arr === null) continue;
      for (let i = 1; i < arr.length; i++) {
        expect(arr[i]).toBeGreaterThanOrEqual(arr[i - 1]);
      }
    }
  });

  it('each item has the correct effect type for its role', () => {
    expect(STATIC_DATA.creatorKitItems.camera.effect.type).toBe('engagement_multiplier');
    expect(STATIC_DATA.creatorKitItems.laptop.effect.type).toBe('algorithm_lookahead');
    expect(STATIC_DATA.creatorKitItems.phone.effect.type).toBe('platform_headstart_sequential');
    expect(STATIC_DATA.creatorKitItems.wardrobe.effect.type).toBe('follower_conversion_multiplier');
    expect(STATIC_DATA.creatorKitItems.mogging.effect.type).toBe('viral_burst_amplifier');
  });
});
