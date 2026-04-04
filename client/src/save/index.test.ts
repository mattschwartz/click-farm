import { describe, it, expect, beforeEach, vi } from 'vitest';
import { save, load, clearSave, migrate } from './index.ts';
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

    expect(loaded!.generators.selfies.owned).toBe(false);
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
  it('passes through current-version data unchanged', () => {
    const state = createInitialGameState(STATIC_DATA, 0);
    const data: SaveData = {
      version: 1,
      state,
      lastCloseTime: 0,
      lastCloseState: null,
    };
    const result = migrate(data);
    expect(result.version).toBe(1);
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
