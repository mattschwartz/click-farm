import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  save,
  load,
  clearSave,
  exportSaveJSON,
  importSaveJSON,
  migrate,
  migrateV1toV2,
  migrateV3toV4,
  migrateV4toV5,
  migrateV5toV6,
  migrateV6toV7,
  migrateV7toV8,
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

// Narrowing helper: fail loudly if load() didn't reach the `loaded` branch.
function expectLoaded(result: ReturnType<typeof load>) {
  if (result.kind !== 'loaded') {
    throw new Error(`expected kind=loaded, got kind=${result.kind}`);
  }
  return result.state;
}

describe('save and load', () => {
  it('round-trips game state through localStorage', () => {
    const state = createInitialGameState(STATIC_DATA, 0);
    save(state);
    const loaded = expectLoaded(load());

    expect(loaded.player.id).toBe(state.player.id);
    expect(loaded.player.engagement).toBe(state.player.engagement);
    expect(loaded.player.clout).toBe(state.player.clout);
  });

  it('preserves generator state', () => {
    const state = createInitialGameState(STATIC_DATA, 0);
    save(state);
    const loaded = expectLoaded(load());

    // selfies (threshold=0) starts owned per fresh-state rules.
    expect(loaded.generators.selfies.owned).toBe(true);
    expect(loaded.generators.selfies.count).toBe(0);
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
    const loaded = expectLoaded(load());

    expect(loaded.platforms.chirper.followers).toBe(1234);
    expect(loaded.platforms.instasham.followers).toBe(567);
    expect(loaded.platforms.grindset.followers).toBe(0);
  });

  it('preserves algorithm state', () => {
    const state = createInitialGameState(STATIC_DATA, 0);
    save(state);
    const loaded = expectLoaded(load());

    expect(loaded.algorithm.current_state_id).toBe(
      state.algorithm.current_state_id
    );
    expect(loaded.algorithm.current_state_index).toBe(
      state.algorithm.current_state_index
    );
  });

  it('sets player.last_close_time on save', () => {
    const now = 9_000_000;
    vi.setSystemTime(now);
    const state = createInitialGameState(STATIC_DATA, 0);
    save(state);
    const loaded = expectLoaded(load());

    expect(loaded.player.last_close_time).toBe(now);
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
    const loaded = expectLoaded(load());
    expect(loaded.viralBurst).toBeDefined();
    expect(loaded.viralBurst.active).toBeNull();
  });

  it('returns kind="none" when no save exists', () => {
    expect(load()).toEqual({ kind: 'none' });
  });

  it('returns kind="corrupt" on malformed JSON, carrying the parse error', () => {
    localStorage.setItem('click_farm_save', 'not-json{{{{');
    const result = load();
    expect(result.kind).toBe('corrupt');
    if (result.kind === 'corrupt') {
      expect(result.error).toBeInstanceOf(Error);
    }
  });

  it('returns kind="corrupt" when migrate throws (unknown version)', () => {
    localStorage.setItem(
      'click_farm_save',
      JSON.stringify({ version: 999, state: {} }),
    );
    const result = load();
    expect(result.kind).toBe('corrupt');
  });
});

// ---------------------------------------------------------------------------
// clearSave
// ---------------------------------------------------------------------------

describe('clearSave', () => {
  it('removes save data so load returns kind="none"', () => {
    const state = createInitialGameState(STATIC_DATA, 0);
    save(state);
    clearSave();
    expect(load()).toEqual({ kind: 'none' });
  });
});

// ---------------------------------------------------------------------------
// exportSaveJSON / importSaveJSON
// ---------------------------------------------------------------------------

describe('exportSaveJSON', () => {
  it('returns the raw localStorage payload after save()', () => {
    const state = createInitialGameState(STATIC_DATA, 0);
    save(state);
    const exported = exportSaveJSON();
    expect(exported).not.toBeNull();
    const parsed = JSON.parse(exported as string);
    expect(parsed.version).toBeTypeOf('number');
    expect(parsed.state).toBeDefined();
  });

  it('returns null when no save is present', () => {
    expect(exportSaveJSON()).toBeNull();
  });
});

describe('importSaveJSON', () => {
  it('round-trips: export then import reproduces loadable state', () => {
    const state = createInitialGameState(STATIC_DATA, 0);
    save(state);
    const json = exportSaveJSON();
    clearSave();
    expect(load()).toEqual({ kind: 'none' });
    const result = importSaveJSON(json as string);
    expect(result.ok).toBe(true);
    expect(load().kind).toBe('loaded');
  });

  it('rejects non-JSON input', () => {
    const result = importSaveJSON('{not json');
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/valid json/i);
  });

  it('rejects payloads without a version field', () => {
    const result = importSaveJSON(JSON.stringify({ state: {} }));
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/version/i);
  });

  it('rejects payloads without a state field', () => {
    const result = importSaveJSON(JSON.stringify({ version: 5 }));
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/state/i);
  });

  it('rejects payloads from a newer-than-supported version', () => {
    const state = createInitialGameState(STATIC_DATA, 0);
    const result = importSaveJSON(
      JSON.stringify({ version: 999, state }),
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/newer/i);
  });

  it('accepts older versioned payloads (load() handles migration)', () => {
    // v4 payload; importSaveJSON just writes it, migrate() runs on load
    const v4Payload = {
      version: 4,
      state: createInitialGameState(STATIC_DATA, 0),
    };
    const result = importSaveJSON(JSON.stringify(v4Payload));
    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// migrate
// ---------------------------------------------------------------------------

describe('migrate', () => {
  it('passes through current-version (v8) data unchanged', () => {
    const state = createInitialGameState(STATIC_DATA, 0);
    const data: SaveData = {
      version: 8,
      state,
      lastCloseTime: 0,
      lastCloseState: null,
    };
    const result = migrate(data);
    expect(result.version).toBe(8);
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
    expect(result.version).toBe(8);
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

  it('integrates with migrate() — a v4 save reaches current version via the chain', () => {
    const result = migrate(makeV4SaveData());
    expect(result.version).toBe(8);
    expect(result.state.player.creator_kit).toEqual({});
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

  it('integrates with migrate() — a v4 save reaches current version', () => {
    const result = migrate(makeV4SaveData());
    expect(result.version).toBe(8);
    expect(result.state.player.creator_kit).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// migrateV5toV6 — engagement + generator.level clamp (task #90)
// ---------------------------------------------------------------------------

describe('migrateV5toV6', () => {
  function makeV5SaveData(): SaveData {
    const state = createInitialGameState(STATIC_DATA, 0);
    return { version: 5, state, lastCloseTime: 0, lastCloseState: null };
  }

  it('bumps version from 5 to 6', () => {
    const result = migrateV5toV6(makeV5SaveData());
    expect(result.version).toBe(6);
  });

  it('clamps player.engagement = Infinity to MAX_SAFE_INTEGER', () => {
    const data = makeV5SaveData();
    data.state.player.engagement = Infinity;
    const result = migrateV5toV6(data);
    expect(result.state.player.engagement).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('clamps player.engagement > MAX_SAFE_INTEGER to MAX_SAFE_INTEGER', () => {
    const data = makeV5SaveData();
    data.state.player.engagement = Number.MAX_SAFE_INTEGER * 2;
    const result = migrateV5toV6(data);
    expect(result.state.player.engagement).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('coerces NaN engagement to MAX_SAFE_INTEGER', () => {
    // NaN is non-finite → treated as corrupt and pinned to the ceiling.
    const data = makeV5SaveData();
    data.state.player.engagement = NaN;
    const result = migrateV5toV6(data);
    expect(result.state.player.engagement).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('clamps a generator at level=50 to level=10', () => {
    const data = makeV5SaveData();
    data.state.generators.selfies.level = 50;
    const result = migrateV5toV6(data);
    expect(result.state.generators.selfies.level).toBe(10);
  });

  it('clamps every over-cap generator independently', () => {
    const data = makeV5SaveData();
    data.state.generators.selfies.level = 14;
    data.state.generators.memes.level = 25;
    data.state.generators.tutorials.level = 9; // under cap — untouched
    const result = migrateV5toV6(data);
    expect(result.state.generators.selfies.level).toBe(10);
    expect(result.state.generators.memes.level).toBe(10);
    expect(result.state.generators.tutorials.level).toBe(9);
  });

  it('passes through a valid v5 save unchanged', () => {
    const data = makeV5SaveData();
    data.state.player.engagement = 12_345;
    data.state.generators.selfies.level = 3;
    const result = migrateV5toV6(data);
    expect(result.state.player.engagement).toBe(12_345);
    expect(result.state.generators.selfies.level).toBe(3);
  });

  it('preserves all other player + generator fields', () => {
    const data = makeV5SaveData();
    data.state.player.clout = 99;
    data.state.player.engagement = Infinity;
    data.state.generators.selfies.level = 20;
    data.state.generators.selfies.count = 42;
    const result = migrateV5toV6(data);
    expect(result.state.player.clout).toBe(99);
    expect(result.state.generators.selfies.count).toBe(42);
  });

  it('integrates with migrate() — a v1 save reaches v8 via the full chain', () => {
    // Start with a v1-shaped save. Post-Scandals-removal, a V1 save cannot
    // have scandal fields (they were introduced in V3 and stripped in V7).
    const base = createInitialGameState(STATIC_DATA, 0);
    const v1State = {
      ...base,
      player: { ...base.player },
    } as unknown as SaveData['state'];
    // Corrupt engagement to verify the full chain still lands the clamp.
    (v1State.player as unknown as { engagement: number }).engagement = Infinity;
    const data: SaveData = {
      version: 1,
      state: v1State,
      lastCloseTime: 0,
      lastCloseState: null,
    };
    const result = migrate(data);
    expect(result.version).toBe(8);
    expect(result.state.player.engagement).toBe(Number.MAX_SAFE_INTEGER);
  });
});

// ---------------------------------------------------------------------------
// migrateV6toV7 — strip the Scandals system
// ---------------------------------------------------------------------------

describe('migrateV6toV7', () => {
  function makeV6SaveData(): SaveData {
    const base = createInitialGameState(STATIC_DATA, 0);
    // Simulate a V6 save by re-adding the pre-removal scandal fields.
    const stateWithScandal = {
      ...base,
      accumulators: [
        {
          scandal_type: 'content_burnout',
          scope_type: 'generator',
          scope_id: 'selfies',
          value: 0.42,
          base_threshold: 0.7,
          frozen: false,
        },
      ],
      scandalStateMachine: {
        state: 'normal',
        activeScandal: null,
        suppressedNotification: null,
        timerStartTime: null,
        timerDuration: 13_500,
        readBeatDuration: 1_500,
        pendingEngagementSpend: 0,
        lastResolution: null,
      },
      scandalSessionSnapshot: null,
    } as unknown as SaveData['state'];
    return {
      version: 6,
      state: stateWithScandal,
      lastCloseTime: 0,
      lastCloseState: null,
    };
  }

  it('bumps version from 6 to 7', () => {
    const result = migrateV6toV7(makeV6SaveData());
    expect(result.version).toBe(7);
  });

  it('strips state.accumulators', () => {
    const result = migrateV6toV7(makeV6SaveData());
    expect(
      (result.state as unknown as Record<string, unknown>).accumulators,
    ).toBeUndefined();
  });

  it('strips state.scandalStateMachine', () => {
    const result = migrateV6toV7(makeV6SaveData());
    expect(
      (result.state as unknown as Record<string, unknown>).scandalStateMachine,
    ).toBeUndefined();
  });

  it('strips state.scandalSessionSnapshot', () => {
    const result = migrateV6toV7(makeV6SaveData());
    expect(
      (result.state as unknown as Record<string, unknown>).scandalSessionSnapshot,
    ).toBeUndefined();
  });

  it('preserves every other GameState field (player, generators, platforms, algorithm, viralBurst)', () => {
    const data = makeV6SaveData();
    data.state.player.engagement = 4242;
    data.state.player.clout = 7;
    const result = migrateV6toV7(data);
    expect(result.state.player.id).toBe(data.state.player.id);
    expect(result.state.player.engagement).toBe(4242);
    expect(result.state.player.clout).toBe(7);
    expect(result.state.generators).toEqual(data.state.generators);
    expect(result.state.platforms).toEqual(data.state.platforms);
    expect(result.state.algorithm).toEqual(data.state.algorithm);
    expect(result.state.viralBurst).toEqual(data.state.viralBurst);
  });

  it('is idempotent on a save that already lacks scandal fields', () => {
    const base = createInitialGameState(STATIC_DATA, 0);
    const data: SaveData = {
      version: 6,
      state: base,
      lastCloseTime: 0,
      lastCloseState: null,
    };
    const result = migrateV6toV7(data);
    expect(result.version).toBe(7);
    expect(result.state.player.id).toBe(base.player.id);
  });
});

// ---------------------------------------------------------------------------
// migrateV7toV8 — initialise Audience Mood fields
// ---------------------------------------------------------------------------

describe('migrateV7toV8', () => {
  function makeV7SaveData(): SaveData {
    // A V7 save is a current-shape GameState MINUS the audience-mood fields
    // on each PlatformState. We build a V8-shape state then strip those
    // fields to simulate a save written by the V7 build.
    const base = createInitialGameState(STATIC_DATA, 0);
    const strippedPlatforms = Object.fromEntries(
      Object.keys(base.platforms).map((id) => {
        const { retention: _r, content_fatigue: _cf, neglect: _n, algorithm_misalignment: _am, ...rest } =
          base.platforms[id as keyof typeof base.platforms];
        void _r; void _cf; void _n; void _am;
        return [id, rest];
      }),
    ) as unknown as SaveData['state']['platforms'];
    return {
      version: 7,
      state: { ...base, platforms: strippedPlatforms },
      lastCloseTime: 0,
      lastCloseState: null,
    };
  }

  it('bumps version from 7 to 8', () => {
    const result = migrateV7toV8(makeV7SaveData());
    expect(result.version).toBe(8);
  });

  it('initialises retention=1.0 on every platform', () => {
    const result = migrateV7toV8(makeV7SaveData());
    for (const id of Object.keys(result.state.platforms) as Array<
      keyof typeof result.state.platforms
    >) {
      expect(result.state.platforms[id].retention).toBe(1.0);
    }
  });

  it('initialises content_fatigue to empty map on every platform', () => {
    const result = migrateV7toV8(makeV7SaveData());
    for (const id of Object.keys(result.state.platforms) as Array<
      keyof typeof result.state.platforms
    >) {
      expect(result.state.platforms[id].content_fatigue).toEqual({});
    }
  });

  it('initialises neglect=0 and algorithm_misalignment=0 on every platform', () => {
    const result = migrateV7toV8(makeV7SaveData());
    for (const id of Object.keys(result.state.platforms) as Array<
      keyof typeof result.state.platforms
    >) {
      expect(result.state.platforms[id].neglect).toBe(0);
      expect(result.state.platforms[id].algorithm_misalignment).toBe(0);
    }
  });

  it('preserves existing platform fields (unlocked, followers)', () => {
    const data = makeV7SaveData();
    const p = data.state.platforms.chirper as unknown as Record<string, unknown>;
    p.followers = 9999;
    p.unlocked = true;
    const result = migrateV7toV8(data);
    expect(result.state.platforms.chirper.followers).toBe(9999);
    expect(result.state.platforms.chirper.unlocked).toBe(true);
  });

  it('is idempotent on a save that already has audience-mood fields', () => {
    const base = createInitialGameState(STATIC_DATA, 0);
    const data: SaveData = {
      version: 7,
      state: base,
      lastCloseTime: 0,
      lastCloseState: null,
    };
    const result = migrateV7toV8(data);
    expect(result.version).toBe(8);
    expect(result.state.platforms.chirper.retention).toBe(1.0);
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
