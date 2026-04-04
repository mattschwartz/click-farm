// Static data module.
// Responsibility: balance values — generator stats, platform affinities,
// algorithm states, upgrade costs, unlock thresholds. Data-only, no runtime
// logic. See core-systems.md — "Static Data Module".
//
// Generator IDs and flavor come from the accepted design proposal (Section 3).
// Numeric balance values are provisional — the game designer will tune these
// once the game loop is playable.

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
// Generators — 7 base content types (selfies through viral_stunts)
// Unlock thresholds create a progressive arc. Balance values are provisional.
// ---------------------------------------------------------------------------

const GENERATOR_DEFS: Record<GeneratorId, GeneratorDef> = {
  selfies: {
    id: 'selfies',
    base_engagement_rate: 1.0,
    follower_conversion_rate: 0.10,
    trend_sensitivity: 0.3,  // low — always somewhat relevant
    unlock_threshold: 0,
  },
  memes: {
    id: 'memes',
    base_engagement_rate: 5.0,
    follower_conversion_rate: 0.08,
    trend_sensitivity: 0.8,  // high — very trend-sensitive
    unlock_threshold: 50,
  },
  hot_takes: {
    id: 'hot_takes',
    base_engagement_rate: 12.0,
    follower_conversion_rate: 0.05,
    trend_sensitivity: 0.9,  // very high — peaks hard, tanks hard
    unlock_threshold: 200,
  },
  tutorials: {
    id: 'tutorials',
    base_engagement_rate: 30.0,
    follower_conversion_rate: 0.07,
    trend_sensitivity: 0.1,  // nearly immune — steady, reliable, boring
    unlock_threshold: 1_000,
  },
  livestreams: {
    id: 'livestreams',
    base_engagement_rate: 80.0,
    follower_conversion_rate: 0.09,
    trend_sensitivity: 0.6,  // moderate — benefits from trending but survives without
    unlock_threshold: 5_000,
  },
  podcasts: {
    id: 'podcasts',
    base_engagement_rate: 150.0,
    follower_conversion_rate: 0.11,
    trend_sensitivity: 0.2,  // low — slow build, compounding returns
    unlock_threshold: 20_000,
  },
  viral_stunts: {
    id: 'viral_stunts',
    base_engagement_rate: 500.0,
    follower_conversion_rate: 0.06,
    trend_sensitivity: 1.0,  // maximum — massive spikes, algorithm-dependent
    unlock_threshold: 100_000,
  },
};

// ---------------------------------------------------------------------------
// Platforms — 3 at launch
// chirper: text/hot-takes platform (Twitter analog)
// instasham: photo/visual platform (Instagram analog)
// grindset: professional/evergreen platform (LinkedIn analog)
// ---------------------------------------------------------------------------

const PLATFORM_DEFS: Record<PlatformId, PlatformDef> = {
  chirper: {
    id: 'chirper',
    content_affinity: {
      selfies: 0.8,
      memes: 1.6,
      hot_takes: 2.0,
      tutorials: 0.7,
      livestreams: 1.2,
      podcasts: 0.6,
      viral_stunts: 1.5,
    },
    unlock_threshold: 0,
  },
  instasham: {
    id: 'instasham',
    content_affinity: {
      selfies: 2.0,
      memes: 1.2,
      hot_takes: 0.5,
      tutorials: 0.8,
      livestreams: 1.5,
      podcasts: 0.7,
      viral_stunts: 1.8,
    },
    unlock_threshold: 100,
  },
  grindset: {
    id: 'grindset',
    content_affinity: {
      selfies: 0.5,
      memes: 0.5,
      hot_takes: 0.7,
      tutorials: 2.0,
      livestreams: 1.0,
      podcasts: 1.8,
      viral_stunts: 0.6,
    },
    unlock_threshold: 500,
  },
};

// ---------------------------------------------------------------------------
// Algorithm states — 5 states with distinct per-generator modifiers
// State names come from the architecture spec and core proposal.
// ---------------------------------------------------------------------------

const ALGORITHM_STATE_DEFS: Record<AlgorithmStateId, AlgorithmStateDef> = {
  short_form_surge: {
    id: 'short_form_surge',
    state_modifiers: {
      selfies: 1.2,
      memes: 1.8,
      hot_takes: 1.6,
      tutorials: 0.6,
      livestreams: 1.3,
      podcasts: 0.5,
      viral_stunts: 1.4,
    },
  },
  authenticity_era: {
    id: 'authenticity_era',
    state_modifiers: {
      selfies: 1.8,
      memes: 0.7,
      hot_takes: 0.5,
      tutorials: 1.4,
      livestreams: 2.0,
      podcasts: 1.5,
      viral_stunts: 0.6,
    },
  },
  engagement_bait: {
    id: 'engagement_bait',
    state_modifiers: {
      selfies: 0.8,
      memes: 1.5,
      hot_takes: 2.0,
      tutorials: 0.7,
      livestreams: 1.2,
      podcasts: 0.6,
      viral_stunts: 1.8,
    },
  },
  nostalgia_wave: {
    id: 'nostalgia_wave',
    state_modifiers: {
      selfies: 1.5,
      memes: 1.7,
      hot_takes: 0.8,
      tutorials: 1.2,
      livestreams: 0.9,
      podcasts: 1.4,
      viral_stunts: 0.7,
    },
  },
  corporate_takeover: {
    id: 'corporate_takeover',
    state_modifiers: {
      selfies: 0.7,
      memes: 0.6,
      hot_takes: 0.9,
      tutorials: 2.0,
      livestreams: 1.0,
      podcasts: 2.0,
      viral_stunts: 0.5,
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
      tutorials: GENERATOR_DEFS.tutorials.unlock_threshold,
      livestreams: GENERATOR_DEFS.livestreams.unlock_threshold,
      podcasts: GENERATOR_DEFS.podcasts.unlock_threshold,
      viral_stunts: GENERATOR_DEFS.viral_stunts.unlock_threshold,
    },
    platforms: {
      chirper: PLATFORM_DEFS.chirper.unlock_threshold,
      instasham: PLATFORM_DEFS.instasham.unlock_threshold,
      grindset: PLATFORM_DEFS.grindset.unlock_threshold,
    },
  },
};
