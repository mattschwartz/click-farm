// Tests for eulogy-templates helpers (task #65).

import { describe, it, expect } from 'vitest';
import {
  unlockedPlatformsList,
  currentAlgorithmStateName,
  buildEulogyStanzas,
} from './eulogy-templates.ts';
import { createInitialGameState } from '../model/index.ts';
import { STATIC_DATA } from '../static-data/index.ts';
import type { PlatformId } from '../types.ts';

function stateWithPlatforms(ids: PlatformId[]) {
  const base = createInitialGameState(STATIC_DATA, 0);
  const platforms = { ...base.platforms };
  // Lock all first, then unlock the requested set.
  for (const id of Object.keys(platforms) as PlatformId[]) {
    (platforms[id] as { unlocked: boolean }).unlocked = false;
  }
  for (const id of ids) {
    (platforms[id] as { unlocked: boolean }).unlocked = true;
  }
  return { ...base, platforms };
}

describe('unlockedPlatformsList', () => {
  it('returns "no platforms" when none unlocked', () => {
    const state = stateWithPlatforms([]);
    expect(unlockedPlatformsList(state)).toBe('no platforms');
  });

  it('returns a single platform name', () => {
    const state = stateWithPlatforms(['chirper']);
    expect(unlockedPlatformsList(state)).toBe('Chirper');
  });

  it('joins two platforms with "and"', () => {
    const state = stateWithPlatforms(['chirper', 'picshift']);
    expect(unlockedPlatformsList(state)).toBe('Chirper and PicShift');
  });

  it('uses Oxford comma for 3+ platforms', () => {
    const state = stateWithPlatforms(['chirper', 'picshift', 'skroll']);
    expect(unlockedPlatformsList(state)).toBe('Chirper, PicShift, and Skroll');
  });
});

describe('currentAlgorithmStateName', () => {
  it('returns the name of the current algorithm state', () => {
    const state = createInitialGameState(STATIC_DATA, 0);
    const result = currentAlgorithmStateName(state);
    // Should be a non-empty string that matches some mood name.
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe('an unknown state');
  });
});

describe('buildEulogyStanzas', () => {
  it('returns an array of strings (4 placeholder stanzas)', () => {
    const state = createInitialGameState(STATIC_DATA, 0);
    const stanzas = buildEulogyStanzas(state);
    expect(stanzas).toHaveLength(4);
    for (const s of stanzas) {
      expect(typeof s).toBe('string');
      expect(s.length).toBeGreaterThan(0);
    }
  });

  it('interpolates follower count into first stanza', () => {
    const base = createInitialGameState(STATIC_DATA, 0);
    const state = {
      ...base,
      player: { ...base.player, total_followers: 1234 },
    };
    const stanzas = buildEulogyStanzas(state);
    // fmtCompactInt(1234) formats with thousands separator or compact notation
    expect(stanzas[0]).toMatch(/followers/);
  });
});
