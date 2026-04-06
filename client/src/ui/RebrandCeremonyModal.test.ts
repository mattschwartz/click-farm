// Tests for RebrandCeremonyModal pure helpers (task #62).
//
// These test the data-derivation functions that drive the Phase 1 UI.
// Component rendering is not tested here (no jsdom env) — the pure helpers
// cover locked-state logic, tooltip math, and the modal data layout.

import { describe, it, expect } from 'vitest';
import {
  cloutEarnedForReview,
  newCloutBalanceForReview,
  buildResetItems,
  buildPersistItems,
  isEligibleToRebrand,
  isSkipVisible,
} from './RebrandCeremonyModal.tsx';
import { createInitialGameState } from '../model/index.ts';
import { STATIC_DATA } from '../static-data/index.ts';

// ---------------------------------------------------------------------------
// Minimal game state for tests
// ---------------------------------------------------------------------------

function makeState(overrides: {
  totalFollowers?: number;
  clout?: number;
  rebrandCount?: number;
  engagement?: number;
  lifetimeFollowers?: number;
  ownedGenerators?: string[];
  unlockedPlatforms?: string[];
  ownedUpgrades?: Record<string, number>;
} = {}) {
  const base = createInitialGameState(STATIC_DATA, 0);

  // Apply overrides to player
  const player = {
    ...base.player,
    total_followers: overrides.totalFollowers ?? 0,
    clout: overrides.clout ?? 0,
    rebrand_count: overrides.rebrandCount ?? 0,
    engagement: overrides.engagement ?? 0,
    lifetime_followers: overrides.lifetimeFollowers ?? 0,
    clout_upgrades: {
      ...base.player.clout_upgrades,
      ...(overrides.ownedUpgrades ?? {}),
    },
  };

  // Apply generator owned states
  const generators = { ...base.generators };
  if (overrides.ownedGenerators) {
    for (const id of overrides.ownedGenerators) {
      if (generators[id as keyof typeof generators]) {
        (generators[id as keyof typeof generators] as { owned: boolean }).owned = true;
      }
    }
  }

  // Apply platform unlocked states
  const platforms = { ...base.platforms };
  if (overrides.unlockedPlatforms) {
    for (const id of overrides.unlockedPlatforms) {
      if (platforms[id as keyof typeof platforms]) {
        (platforms[id as keyof typeof platforms] as { unlocked: boolean }).unlocked = true;
      }
    }
  }

  return { ...base, player, generators, platforms };
}

// ---------------------------------------------------------------------------
// isEligibleToRebrand
// ---------------------------------------------------------------------------

describe('isEligibleToRebrand', () => {
  it('returns false when total_followers is 0 (locked state)', () => {
    const state = makeState({ totalFollowers: 0 });
    expect(isEligibleToRebrand(state)).toBe(false);
  });

  it('returns true when total_followers > 0', () => {
    const state = makeState({ totalFollowers: 1 });
    expect(isEligibleToRebrand(state)).toBe(true);
  });

  it('returns true for large follower counts', () => {
    const state = makeState({ totalFollowers: 100_000 });
    expect(isEligibleToRebrand(state)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// cloutEarnedForReview
// ---------------------------------------------------------------------------

describe('cloutEarnedForReview', () => {
  it('returns 0 for 0 followers', () => {
    const state = makeState({ totalFollowers: 0 });
    expect(cloutEarnedForReview(state)).toBe(0);
  });

  it('returns floor(sqrt(10000)/10) = 10 for 10,000 followers', () => {
    const state = makeState({ totalFollowers: 10_000 });
    expect(cloutEarnedForReview(state)).toBe(10);
  });

  it('returns floor(sqrt(47230)/10) = 21 for 47,230 followers (spec example)', () => {
    const state = makeState({ totalFollowers: 47_230 });
    // floor(sqrt(47230)/10) = floor(217.3.../10) = floor(21.73...) = 21
    expect(cloutEarnedForReview(state)).toBe(21);
  });
});

// ---------------------------------------------------------------------------
// newCloutBalanceForReview
// ---------------------------------------------------------------------------

describe('newCloutBalanceForReview', () => {
  it('adds cloutEarned to current clout balance', () => {
    // 10,000 followers → +10 Clout; current clout = 42 → new balance = 52
    const state = makeState({ totalFollowers: 10_000, clout: 42 });
    expect(newCloutBalanceForReview(state)).toBe(52);
  });

  it('returns 0 when no followers and no existing clout', () => {
    const state = makeState({ totalFollowers: 0, clout: 0 });
    expect(newCloutBalanceForReview(state)).toBe(0);
  });

  it('preserves existing clout when no followers earned (zero clout awarded)', () => {
    const state = makeState({ totalFollowers: 0, clout: 5 });
    expect(newCloutBalanceForReview(state)).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// buildResetItems
// ---------------------------------------------------------------------------

describe('buildResetItems', () => {
  it('lists engagement, generators owned, platforms unlocked, follower counts', () => {
    const state = makeState();
    const items = buildResetItems(state);
    const labels = items.map((r) => r.label);
    expect(labels).toContain('Engagement');
    expect(labels).toContain('Generators owned');
    expect(labels).toContain('Platforms unlocked');
    expect(labels).toContain('Follower counts');
  });

  it('counts only main-list owned generators (not post-prestige)', () => {
    const state = makeState({ ownedGenerators: ['selfies', 'memes', 'ai_slop'] });
    const items = buildResetItems(state);
    const genItem = items.find((r) => r.label === 'Generators owned');
    // ai_slop is post-prestige and should be excluded from count.
    // chirps (from initial state, threshold=0) + selfies + memes = 3 main-list.
    expect(genItem?.value).toBe('3 types');
  });

  it('counts unlocked platforms', () => {
    const state = makeState({ unlockedPlatforms: ['chirper', 'picshift'] });
    const items = buildResetItems(state);
    const platItem = items.find((r) => r.label === 'Platforms unlocked');
    expect(platItem?.value).toBe('2 platforms');
  });

  it('follower counts row has value "all"', () => {
    const state = makeState();
    const items = buildResetItems(state);
    const followerItem = items.find((r) => r.label === 'Follower counts');
    expect(followerItem?.value).toBe('all');
  });
});

// ---------------------------------------------------------------------------
// buildPersistItems
// ---------------------------------------------------------------------------

describe('buildPersistItems', () => {
  it('lists Clout, Clout upgrades, Lifetime followers, Rebrand count', () => {
    const state = makeState();
    const items = buildPersistItems(state);
    const labels = items.map((r) => r.label);
    expect(labels).toContain('Clout');
    expect(labels).toContain('Clout upgrades');
    expect(labels).toContain('Lifetime followers');
    expect(labels).toContain('Rebrand count');
  });

  it('rebrand count value shows → next value', () => {
    const state = makeState({ rebrandCount: 2 });
    const items = buildPersistItems(state);
    const countItem = items.find((r) => r.label === 'Rebrand count');
    expect(countItem?.value).toBe('→ 3');
  });

  it('counts only clout upgrades with level > 0', () => {
    const state = makeState({
      ownedUpgrades: {
        engagement_boost: 2,
        platform_headstart_picshift: 1,
        platform_headstart_skroll: 0,
        ai_slop_unlock: 0,
        deepfakes_unlock: 0,
        algorithmic_prophecy_unlock: 0,
      },
    });
    const items = buildPersistItems(state);
    const upgradeItem = items.find((r) => r.label === 'Clout upgrades');
    // engagement_boost (2) and platform_headstart_picshift (1) → 2 owned
    expect(upgradeItem?.value).toBe('2 owned');
  });
});

// ---------------------------------------------------------------------------
// isSkipVisible
// ---------------------------------------------------------------------------

describe('isSkipVisible', () => {
  it('hides skip on first rebrand (count=0) until stanza index 2', () => {
    expect(isSkipVisible(0, 0)).toBe(false);
    expect(isSkipVisible(0, 1)).toBe(false);
    expect(isSkipVisible(0, 2)).toBe(true);
    expect(isSkipVisible(0, 3)).toBe(true);
  });

  it('shows skip immediately on subsequent rebrands (count > 0)', () => {
    expect(isSkipVisible(1, 0)).toBe(true);
    expect(isSkipVisible(1, 1)).toBe(true);
    expect(isSkipVisible(5, 0)).toBe(true);
    expect(isSkipVisible(100, 2)).toBe(true);
  });
});
