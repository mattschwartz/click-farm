import { describe, it, expect, beforeEach, vi } from 'vitest';
import { save, load, clearSave, migrate, migrateV1toV2 } from './index.ts';
import { createInitialGameState } from '../model/index.ts';
import { STATIC_DATA } from '../static-data/index.ts';
import type { SaveData } from '../types.ts';

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
  it('passes through current-version (v3) data unchanged', () => {
    const state = createInitialGameState(STATIC_DATA, 0);
    const data: SaveData = {
      version: 3,
      state,
      lastCloseTime: 0,
      lastCloseState: null,
    };
    const result = migrate(data);
    expect(result.version).toBe(3);
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
