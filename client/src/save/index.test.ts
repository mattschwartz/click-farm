import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  save,
  load,
  clearSave,
  migrate,
  migrateV1toV2,
  migrateV3toV4,
  migrateV4toV5,
} from './index.ts';
import { createInitialGameState } from '../model/index.ts';
import { STATIC_DATA } from '../static-data/index.ts';
import type { KitEffect, SaveData } from '../types.ts';

// ---------------------------------------------------------------------------
// localStorage mock — no jsdom dependency required
// ---------------------------------------------------------------------------

function makeLocalStorageMock(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', makeLocalStorageMock());
});

// ---------------------------------------------------------------------------
// save / load round-trip
// ---------------------------------------------------------------------------

describe('save and load', () => {
  it('round-trips game state through localStorage', () => {
    const state = createInitialGameState(STATIC_DATA, 0);
    save(state);
    const loaded = load();

    expect(loaded).not.toBeNull();
    expect(loaded!.player.id).toBe(state.player.id);
    expect(loaded!.player.engagement).toBe(state.player.engagement);
    expect(loaded!.player.clout).toBe(state.player.clout);
  });

  it('preserves generator state', () => {
    const state = createInitialGameState(STATIC_DATA, 0);
    save(state);
    const loaded = load();

    // selfies (threshold=0) starts owned per fresh-state rules.
    expect(loaded!.generators.selfies.owned).toBe(true);
    expect(loaded!.generators.selfies.count).toBe(0);
  });

  it('preserves platform follower counts independently', () => {
    const state = createInitialGameState(STATIC_DATA, 0);
    const stateWithFollowers = {
      ...state,
      platforms: {
        ...state.platforms,
        chirper: { ...state.platforms.chirper, followers: 1234 },
        instasham: { ...state.platforms.instasham, followers: 567 },
      },
    };
    save(stateWithFollowers);
    const loaded = load();

    expect(loaded!.platforms.chirper.followers).toBe(1234);
    expect(loaded!.platforms.instasham.followers).toBe(567);
    expect(loaded!.platforms.grindset.followers).toBe(0);
  });

  it('preserves algorithm state', () => {
    const state = createInitialGameState(STATIC_DATA, 0);
    save(state);
    const loaded = load();

    expect(loaded!.algorithm.current_state_id).toBe(
      state.algorithm.current_state_id
    );
    expect(loaded!.algorithm.current_state_index).toBe(
      state.algorithm.current_state_index
    );
  });

  it('sets player.last_close_time on save', () => {
    const now = 9_000_000;
    vi.setSystemTime(now);
    const state = createInitialGameState(STATIC_DATA, 0);
    save(state);
    const loaded = load();

    expect(loaded!.player.last_close_time).toBe(now);
    vi.useRealTimers();
  });

  it('injects viralBurst when the field is absent in a v2 save', () => {
    // Simulates a save written as v2 before viralBurst was part of the schema.
    const state = createInitialGameState(STATIC_DATA, 0);
    const { viralBurst: _dropped, ...stateWithoutViral } = state as typeof state & { viralBurst?: unknown };
    const rawSave = JSON.stringify({
      version: 2,
      state: stateWithoutViral,
      lastCloseTime: null,
      lastCloseState: state.player.last_close_state,
    });
    localStorage.setItem('click_farm_save', rawSave);
    const loaded = load();
    expect(loaded).not.toBeNull();
    expect(loaded!.viralBurst).toBeDefined();
    expect(loaded!.viralBurst.active).toBeNull();
  });

  it('returns null when no save exists', () => {
    expect(load()).toBeNull();
  });

  it('returns null on corrupt save data', () => {
    localStorage.setItem('click_farm_save', 'not-json{{{{');
    expect(load()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// clearSave
// ---------------------------------------------------------------------------

describe('clearSave', () => {
  it('removes save data so load returns null', () => {
    const state = createInitialGameState(STATIC_DATA, 0);
    save(state);
    clearSave();
    expect(load()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// migrate
// ---------------------------------------------------------------------------

describe('migrate', () => {
  it('passes through current-version (v5) data unchanged', () => {
    const state = createInitialGameState(STATIC_DATA, 0);
    const data: SaveData = {
      version: 5,
      state,
      lastCloseTime: 0,
      lastCloseState: null,
    };
    const result = migrate(data);
    expect(result.version).toBe(5);
    expect(result.state.player.id).toBe(state.player.id);
  });

  it('throws on an unknown version', () => {
    const state = createInitialGameState(STATIC_DATA, 0);
    const data: SaveData = {
      version: 999,
      state,
      lastCloseTime: 0,
      lastCloseState: null,
    };
    expect(() => migrate(data)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// migrateV1toV2
// ---------------------------------------------------------------------------

describe('migrateV1toV2', () => {
  it('bumps version from 1 to 2', () => {
    const state = createInitialGameState(STATIC_DATA, 0);
    const v1Data = { version: 1, state, lastCloseTime: 0, lastCloseState: null } as SaveData;
    const result = migrateV1toV2(v1Data);
    expect(result.version).toBe(2);
  });

  it('injects viralBurst defaults when field is absent', () => {
    const state = createInitialGameState(STATIC_DATA, 0);
    // Strip viralBurst to simulate a V1 save without the field
    const { viralBurst: _, ...stateWithoutViral } = state;
    const v1Data = {
      version: 1,
      state: stateWithoutViral as SaveData['state'],
      lastCloseTime: 0,
      lastCloseState: null,
    };
    const result = migrateV1toV2(v1Data);
    expect(result.state.viralBurst).toEqual({
      active_ticks_since_last: 0,
      active: null,
    });
  });

  it('preserves all other state fields', () => {
    const state = createInitialGameState(STATIC_DATA, 0);
    const v1Data = { version: 1, state, lastCloseTime: 42, lastCloseState: null } as SaveData;
    const result = migrateV1toV2(v1Data);
    expect(result.state.player.id).toBe(state.player.id);
    expect(result.lastCloseTime).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// migrateV3toV4 — CloutUpgrade schema + post-prestige generator entries
// ---------------------------------------------------------------------------

describe('migrateV3toV4', () => {
  function makeV3SaveData(): SaveData {
    // Build a V3 state shape using the v4 createInitialGameState as a base,
    // then overwrite the fields that changed in v4 (clout_upgrades keys +
    // post-prestige generator entries) with their pre-v4 equivalents.
    const base = createInitialGameState(STATIC_DATA, 0);
    const { ai_slop: _a, deepfakes: _d, algorithmic_prophecy: _p, ...preV4Gens } =
      base.generators;
    const state = {
      ...base,
      generators: preV4Gens,
      player: {
        ...base.player,
        clout_upgrades: {
          faster_engagement: 2,
          algorithm_insight: 1,
          platform_headstart_chirper: 1,
          platform_headstart_instasham: 1,
          platform_headstart_grindset: 0,
        },
      },
    } as unknown as SaveData['state'];
    return { version: 3, state, lastCloseTime: 0, lastCloseState: null };
  }

  it('bumps version from 3 to 4', () => {
    const result = migrateV3toV4(makeV3SaveData());
    expect(result.version).toBe(4);
  });

  it('renames faster_engagement → engagement_boost, preserving level', () => {
    const result = migrateV3toV4(makeV3SaveData());
    expect(result.state.player.clout_upgrades.engagement_boost).toBe(2);
    expect(
      (result.state.player.clout_upgrades as Record<string, number>).faster_engagement,
    ).toBeUndefined();
  });

  it('clamps engagement_boost level to new max_level (3)', () => {
    const data = makeV3SaveData();
    (data.state.player.clout_upgrades as Record<string, number>).faster_engagement = 9;
    const result = migrateV3toV4(data);
    expect(result.state.player.clout_upgrades.engagement_boost).toBe(3);
  });

  it('drops platform_headstart_chirper (no-op upgrade)', () => {
    const result = migrateV3toV4(makeV3SaveData());
    expect(
      (result.state.player.clout_upgrades as Record<string, number>)
        .platform_headstart_chirper,
    ).toBeUndefined();
  });

  it('preserves algorithm_insight and other platform_headstart levels', () => {
    const result = migrateV3toV4(makeV3SaveData());
    expect(result.state.player.clout_upgrades.algorithm_insight).toBe(1);
    expect(result.state.player.clout_upgrades.platform_headstart_instasham).toBe(1);
    expect(result.state.player.clout_upgrades.platform_headstart_grindset).toBe(0);
  });

  it('adds new generator_unlock upgrade keys at level 0', () => {
    const result = migrateV3toV4(makeV3SaveData());
    expect(result.state.player.clout_upgrades.ai_slop_unlock).toBe(0);
    expect(result.state.player.clout_upgrades.deepfakes_unlock).toBe(0);
    expect(result.state.player.clout_upgrades.algorithmic_prophecy_unlock).toBe(0);
  });

  it('adds post-prestige GeneratorState entries (owned=false, level=1, count=0)', () => {
    const result = migrateV3toV4(makeV3SaveData());
    for (const id of ['ai_slop', 'deepfakes', 'algorithmic_prophecy'] as const) {
      const g = result.state.generators[id];
      expect(g).toBeDefined();
      expect(g.owned).toBe(false);
      expect(g.level).toBe(1);
      expect(g.count).toBe(0);
    }
  });

  it('integrates with migrate() — a v3 save reaches current version via the chain', () => {
    const result = migrate(makeV3SaveData());
    expect(result.version).toBe(5);
    expect(result.state.player.clout_upgrades.engagement_boost).toBe(2);
    expect(result.state.generators.ai_slop).toBeDefined();
    expect(result.state.player.creator_kit).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// migrateV4toV5 — Creator Kit foundation
// ---------------------------------------------------------------------------

describe('migrateV4toV5', () => {
  function makeV4SaveData(): SaveData {
    const base = createInitialGameState(STATIC_DATA, 0);
    // Simulate a v4 save by stripping creator_kit from the player.
    const { creator_kit: _ck, ...playerWithoutKit } = base.player as typeof base.player & { creator_kit?: unknown };
    const state = {
      ...base,
      player: playerWithoutKit,
    } as unknown as SaveData['state'];
    return { version: 4, state, lastCloseTime: 0, lastCloseState: null };
  }

  it('bumps version from 4 to 5', () => {
    const result = migrateV4toV5(makeV4SaveData());
    expect(result.version).toBe(5);
  });

  it('defaults player.creator_kit to empty object when absent', () => {
    const result = migrateV4toV5(makeV4SaveData());
    expect(result.state.player.creator_kit).toEqual({});
  });

  it('preserves player.creator_kit when already present', () => {
    const data = makeV4SaveData();
    (data.state.player as unknown as { creator_kit: Record<string, number> }).creator_kit = {
      camera: 2,
    };
    const result = migrateV4toV5(data);
    expect(result.state.player.creator_kit).toEqual({ camera: 2 });
  });

  it('preserves all other player fields', () => {
    const data = makeV4SaveData();
    data.state.player.clout = 42;
    data.state.player.rebrand_count = 3;
    const result = migrateV4toV5(data);
    expect(result.state.player.clout).toBe(42);
    expect(result.state.player.rebrand_count).toBe(3);
  });

  it('integrates with migrate() — a v4 save reaches v5', () => {
    const result = migrate(makeV4SaveData());
    expect(result.version).toBe(5);
    expect(result.state.player.creator_kit).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// KitEffect — type-level discriminator coverage
//
// This test is compile-time: if any discriminator is removed or renamed, the
// exhaustive switch's `never` assignment breaks the build. Verifies all five
// discriminators exist per architecture/creator-kit.md.
// ---------------------------------------------------------------------------

describe('KitEffect discriminators', () => {
  it('covers all five effect types exhaustively', () => {
    const tagOf = (e: KitEffect): string => {
      switch (e.type) {
        case 'engagement_multiplier': return 'camera';
        case 'algorithm_lookahead': return 'laptop';
        case 'platform_headstart_sequential': return 'phone';
        case 'follower_conversion_multiplier': return 'wardrobe';
        case 'viral_burst_amplifier': return 'mogging';
        default: {
          const _exhaustive: never = e;
          return _exhaustive;
        }
      }
    };
    const samples: KitEffect[] = [
      { type: 'engagement_multiplier', values: [1.1] },
      { type: 'algorithm_lookahead', lookaheads: [1] },
      { type: 'platform_headstart_sequential' },
      { type: 'follower_conversion_multiplier', values: [1.2] },
      { type: 'viral_burst_amplifier', values: [1.5] },
    ];
    expect(samples.map(tagOf)).toEqual([
      'camera', 'laptop', 'phone', 'wardrobe', 'mogging',
    ]);
  });
});
