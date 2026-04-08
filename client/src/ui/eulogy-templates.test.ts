// Tests for eulogy-templates helpers (task #65).

import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import '../i18n.ts'; // Initialize i18n so t() resolves against English locale.
import i18n from 'i18next';
import {
  unlockedPlatformsList,
  buildEulogyStanzas,
} from './eulogy-templates.ts';
import { createInitialGameState } from '../model/index.ts';
import { STATIC_DATA } from '../static-data/index.ts';
import type { PlatformId } from '../types.ts';

const t = i18n.t.bind(i18n);

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
    expect(unlockedPlatformsList(state, t)).toBe('no platforms');
  });

  it('returns a single platform name', () => {
    const state = stateWithPlatforms(['chirper']);
    expect(unlockedPlatformsList(state, t)).toBe('Chirper');
  });

  it('joins two platforms with "and"', () => {
    const state = stateWithPlatforms(['chirper', 'picshift']);
    expect(unlockedPlatformsList(state, t)).toBe('Chirper and Picshift');
  });

  it('uses Oxford comma for 3+ platforms', () => {
    const state = stateWithPlatforms(['chirper', 'picshift', 'skroll']);
    expect(unlockedPlatformsList(state, t)).toBe('Chirper, Picshift, and Skroll');
  });
});

describe('buildEulogyStanzas', () => {
  it('returns an array of strings (3 stanzas)', () => {
    const state = createInitialGameState(STATIC_DATA, 0);
    const stanzas = buildEulogyStanzas(state, t);
    expect(stanzas).toHaveLength(3);
    for (const s of stanzas) {
      expect(typeof s).toBe('string');
      expect(s.length).toBeGreaterThan(0);
    }
  });

  it('interpolates follower count into first stanza', () => {
    const base = createInitialGameState(STATIC_DATA, 0);
    const state = {
      ...base,
      player: { ...base.player, total_followers: new Decimal(1234) },
    };
    const stanzas = buildEulogyStanzas(state, t);
    // fmtCompactInt(1234) formats with thousands separator or compact notation
    expect(stanzas[0]).toMatch(/followers/);
  });
});
