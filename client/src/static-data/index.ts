// Static data module.
// Responsibility: balance values — generator stats, platform affinities,
// algorithm states, upgrade costs, unlock thresholds. Data-only, no runtime
// logic. See core-systems.md — "Static Data Module".
//
// PROVISIONAL: Generator names/counts and numeric values are placeholders
// pending final game design. The architecture spec names selfies, memes, and
// hot_takes; the remaining 3 (reaction_posts, vlogs, collabs) and all numeric
// values are subject to change by the game designer.

import type {
  StaticData,
  GeneratorDef,
  GeneratorId,
  PlatformDef,
  PlatformId,
  AlgorithmStateDef,
  AlgorithmStateId,
  CloutUpgradeDef,
  UpgradeId,
} from '../types.ts';

// ---------------------------------------------------------------------------
// Generators — 6 base content types
// ---------------------------------------------------------------------------

const GENERATOR_DEFS: Record<GeneratorId, GeneratorDef> = {
  selfies: {
    id: 'selfies',
    base_engagement_rate: 1.0,
    follower_conversion_rate: 0.10,
    trend_sensitivity: 0.4,
    unlock_threshold: 0,
  },
  memes: {
    id: 'memes',
    base_engagement_rate: 5.0,
    follower_conversion_rate: 0.08,
    trend_sensitivity: 0.7,
    unlock_threshold: 50,
  },
  hot_takes: {
    id: 'hot_takes',
    base_engagement_rate: 15.0,
    follower_conversion_rate: 0.05,
    trend_sensitivity: 0.9,
    unlock_threshold: 200,
  },
  reaction_posts: {
    id: 'reaction_posts',
    base_engagement_rate: 40.0,
    follower_conversion_rate: 0.04,
    trend_sensitivity: 0.6,
    unlock_threshold: 1_000,
  },
  vlogs: {
    id: 'vlogs',
    base_engagement_rate: 100.0,
    follower_conversion_rate: 0.06,
    trend_sensitivity: 0.3,
    unlock_threshold: 5_000,
  },
  collabs: {
    id: 'collabs',
    base_engagement_rate: 300.0,
    follower_conversion_rate: 0.08,
    trend_sensitivity: 0.4,
    unlock_threshold: 25_000,
  },
};

// ---------------------------------------------------------------------------
// Platforms — 3 at launch
// ---------------------------------------------------------------------------

const PLATFORM_DEFS: Record<PlatformId, PlatformDef> = {
  chirper: {
    id: 'chirper',
    content_affinity: {
      selfies: 0.8,
      memes: 1.5,
      hot_takes: 2.0,
      reaction_posts: 1.2,
      vlogs: 0.5,
      collabs: 0.8,
    },
    unlock_threshold: 0,
  },
  instasham: {
    id: 'instasham',
    content_affinity: {
      selfies: 2.0,
      memes: 1.0,
      hot_takes: 0.5,
      reaction_posts: 0.8,
      vlogs: 1.5,
      collabs: 1.2,
    },
    unlock_threshold: 100,
  },
  grindset: {
    id: 'grindset',
    content_affinity: {
      selfies: 0.5,
      memes: 0.6,
      hot_takes: 0.8,
      reaction_posts: 1.0,
      vlogs: 1.5,
      collabs: 2.0,
    },
    unlock_threshold: 500,
  },
};

// ---------------------------------------------------------------------------
// Algorithm states
// ---------------------------------------------------------------------------

const ALGORITHM_STATE_DEFS: Record<AlgorithmStateId, AlgorithmStateDef> = {
  short_form_surge: {
    id: 'short_form_surge',
    state_modifiers: {
      selfies: 1.2,
      memes: 1.8,
      hot_takes: 1.6,
      reaction_posts: 1.4,
      vlogs: 0.6,
      collabs: 0.7,
    },
  },
  authenticity_era: {
    id: 'authenticity_era',
    state_modifiers: {
      selfies: 1.8,
      memes: 0.7,
      hot_takes: 0.5,
      reaction_posts: 0.8,
      vlogs: 2.0,
      collabs: 1.3,
    },
  },
  engagement_bait: {
    id: 'engagement_bait',
    state_modifiers: {
      selfies: 0.8,
      memes: 1.4,
      hot_takes: 2.0,
      reaction_posts: 1.8,
      vlogs: 0.7,
      collabs: 0.6,
    },
  },
  nostalgia_wave: {
    id: 'nostalgia_wave',
    state_modifiers: {
      selfies: 1.5,
      memes: 1.7,
      hot_takes: 0.8,
      reaction_posts: 1.0,
      vlogs: 1.2,
      collabs: 0.8,
    },
  },
  corporate_takeover: {
    id: 'corporate_takeover',
    state_modifiers: {
      selfies: 0.7,
      memes: 0.6,
      hot_takes: 0.9,
      reaction_posts: 1.1,
      vlogs: 1.5,
      collabs: 2.0,
    },
  },
};

// ---------------------------------------------------------------------------
// Clout upgrades (permanent meta-upgrades that survive rebrand)
// ---------------------------------------------------------------------------

const CLOUT_UPGRADE_DEFS: Record<UpgradeId, CloutUpgradeDef> = {
  faster_engagement: {
    id: 'faster_engagement',
    cost: [1, 3, 8, 20, 50],
    max_level: 5,
    effect: { type: 'engagement_multiplier', value: 1.25 },
  },
  algorithm_insight: {
    id: 'algorithm_insight',
    cost: [2, 6],
    max_level: 2,
    effect: { type: 'algorithm_insight', lookahead: 1 },
  },
  platform_headstart_chirper: {
    id: 'platform_headstart_chirper',
    cost: [5],
    max_level: 1,
    effect: { type: 'platform_headstart', platform_id: 'chirper' },
  },
  platform_headstart_instasham: {
    id: 'platform_headstart_instasham',
    cost: [5],
    max_level: 1,
    effect: { type: 'platform_headstart', platform_id: 'instasham' },
  },
  platform_headstart_grindset: {
    id: 'platform_headstart_grindset',
    cost: [5],
    max_level: 1,
    effect: { type: 'platform_headstart', platform_id: 'grindset' },
  },
};

// ---------------------------------------------------------------------------
// Exported static data
// ---------------------------------------------------------------------------

export const STATIC_DATA: StaticData = {
  generators: GENERATOR_DEFS,
  platforms: PLATFORM_DEFS,
  algorithmStates: ALGORITHM_STATE_DEFS,
  algorithmSchedule: {
    baseIntervalMs: 5 * 60 * 1_000, // 5 minutes
    varianceMs: 60 * 1_000,         // ±1 minute
  },
  cloutUpgrades: CLOUT_UPGRADE_DEFS,
  unlockThresholds: {
    generators: {
      selfies: GENERATOR_DEFS.selfies.unlock_threshold,
      memes: GENERATOR_DEFS.memes.unlock_threshold,
      hot_takes: GENERATOR_DEFS.hot_takes.unlock_threshold,
      reaction_posts: GENERATOR_DEFS.reaction_posts.unlock_threshold,
      vlogs: GENERATOR_DEFS.vlogs.unlock_threshold,
      collabs: GENERATOR_DEFS.collabs.unlock_threshold,
    },
    platforms: {
      chirper: PLATFORM_DEFS.chirper.unlock_threshold,
      instasham: PLATFORM_DEFS.instasham.unlock_threshold,
      grindset: PLATFORM_DEFS.grindset.unlock_threshold,
    },
  },
};
