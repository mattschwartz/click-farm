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
  ViralBurstConfig,
  ScandalStaticData,
  ScandalTypeId,
  ScandalTypeDef,
  KitItemDef,
  KitItemId,
} from '../types.ts';

// ---------------------------------------------------------------------------
// Generators — 7 base content types (selfies through viral_stunts)
// Unlock thresholds create a progressive arc. Balance values are provisional.
// ---------------------------------------------------------------------------

// Generator buy/upgrade costs follow two formulas:
//   buy:     base_buy_cost × buy_cost_multiplier^count_owned        (rounds up)
//   upgrade: base_upgrade_cost × levelMultiplier(currentLevel + 1)  (rounds up)
// The upgrade cost tracks reward 1:1 via levelMultiplier — see
// proposals/accepted/generator-level-growth-curves.md.
//
// Base buy costs are set so early-game payback is ~10s at level 1, matching
// the genre convention. Each generator tier costs ~10× the previous.
// Every generator caps at max_level: 10 (L=14 overflows MAX_SAFE_INTEGER).
// TODO(game-designer): all cost values are provisional — tune during balance
// pass (task #88).

const GENERATOR_DEFS: Record<GeneratorId, GeneratorDef> = {
  selfies: {
    id: 'selfies',
    base_engagement_rate: 1.0,
    follower_conversion_rate: 0.10,
    trend_sensitivity: 0.3,  // low — always somewhat relevant
    unlock_threshold: 0,
    base_buy_cost: 10,
    buy_cost_multiplier: 1.15,
    base_upgrade_cost: 100,
    max_level: 10,
  },
  memes: {
    id: 'memes',
    base_engagement_rate: 5.0,
    follower_conversion_rate: 0.08,
    trend_sensitivity: 0.8,  // high — very trend-sensitive
    unlock_threshold: 50,
    base_buy_cost: 100,
    buy_cost_multiplier: 1.15,
    base_upgrade_cost: 1_000,
    max_level: 10,
  },
  hot_takes: {
    id: 'hot_takes',
    base_engagement_rate: 12.0,
    follower_conversion_rate: 0.05,
    trend_sensitivity: 0.9,  // very high — peaks hard, tanks hard
    unlock_threshold: 200,
    base_buy_cost: 1_100,
    buy_cost_multiplier: 1.15,
    base_upgrade_cost: 11_000,
    max_level: 10,
  },
  tutorials: {
    id: 'tutorials',
    base_engagement_rate: 30.0,
    follower_conversion_rate: 0.07,
    trend_sensitivity: 0.1,  // nearly immune — steady, reliable, boring
    unlock_threshold: 1_000,
    base_buy_cost: 12_000,
    buy_cost_multiplier: 1.15,
    base_upgrade_cost: 120_000,
    max_level: 10,
  },
  livestreams: {
    id: 'livestreams',
    base_engagement_rate: 80.0,
    follower_conversion_rate: 0.09,
    trend_sensitivity: 0.6,  // moderate — benefits from trending but survives without
    unlock_threshold: 5_000,
    base_buy_cost: 130_000,
    buy_cost_multiplier: 1.15,
    base_upgrade_cost: 1_300_000,
    max_level: 10,
  },
  podcasts: {
    id: 'podcasts',
    base_engagement_rate: 150.0,
    follower_conversion_rate: 0.11,
    trend_sensitivity: 0.2,  // low — slow build, compounding returns
    unlock_threshold: 20_000,
    base_buy_cost: 1_400_000,
    buy_cost_multiplier: 1.15,
    base_upgrade_cost: 14_000_000,
    max_level: 10,
  },
  viral_stunts: {
    id: 'viral_stunts',
    base_engagement_rate: 500.0,
    follower_conversion_rate: 0.06,
    trend_sensitivity: 1.0,  // maximum — massive spikes, algorithm-dependent
    unlock_threshold: 100_000,
    base_buy_cost: 20_000_000,
    buy_cost_multiplier: 1.15,
    base_upgrade_cost: 200_000_000,
    max_level: 10,
  },
  // -------------------------------------------------------------------------
  // Post-prestige generators — unlocked only via Clout `generator_unlock`
  // upgrades. NO entry in unlockThresholds.generators (never follower-unlocked).
  // unlock_threshold here is set to Infinity for documentary clarity — the
  // checkGeneratorUnlocks pathway reads from unlockThresholds, not this field.
  //
  // Stats per clout-upgrade-menu.md (base_engagement_rate relative to
  // viral_stunts: 8× / 15× / 40×). Buy/upgrade costs continue the ~10× per-
  // tier ramp from the base generators.
  // TODO(game-designer): buy/upgrade costs are provisional — tune during
  // post-prestige balance pass.
  // -------------------------------------------------------------------------
  ai_slop: {
    id: 'ai_slop',
    base_engagement_rate: 4_000.0,   // 8× viral_stunts
    follower_conversion_rate: 0.6,
    trend_sensitivity: 0.1,           // nearly algorithm-immune — volume wins
    unlock_threshold: Infinity,
    base_buy_cost: 200_000_000,
    buy_cost_multiplier: 1.15,
    base_upgrade_cost: 2_000_000_000,
    max_level: 10,
  },
  deepfakes: {
    id: 'deepfakes',
    base_engagement_rate: 7_500.0,   // 15× viral_stunts
    follower_conversion_rate: 0.3,
    trend_sensitivity: 0.95,          // highest — volatile, algorithm-dependent
    unlock_threshold: Infinity,
    base_buy_cost: 2_000_000_000,
    buy_cost_multiplier: 1.15,
    base_upgrade_cost: 20_000_000_000,
    max_level: 10,
  },
  algorithmic_prophecy: {
    id: 'algorithmic_prophecy',
    base_engagement_rate: 20_000.0,  // 40× viral_stunts
    follower_conversion_rate: 0.5,
    trend_sensitivity: 0.5,
    unlock_threshold: Infinity,
    base_buy_cost: 20_000_000_000,
    buy_cost_multiplier: 1.15,
    base_upgrade_cost: 200_000_000_000,
    max_level: 10,
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
      // Post-prestige generators — neutral affinity across all platforms.
      // TODO(game-designer): tune during post-prestige balance pass.
      ai_slop: 1.0,
      deepfakes: 1.0,
      algorithmic_prophecy: 1.0,
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
      ai_slop: 1.0,
      deepfakes: 1.0,
      algorithmic_prophecy: 1.0,
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
      ai_slop: 1.0,
      deepfakes: 1.0,
      algorithmic_prophecy: 1.0,
    },
    unlock_threshold: 500,
  },
};

// ---------------------------------------------------------------------------
// Algorithm states — 5 states with distinct per-generator modifiers
// State names come from the architecture spec and core proposal.
// ---------------------------------------------------------------------------

const ALGORITHM_STATE_DEFS: Record<AlgorithmStateId, AlgorithmStateDef> = {
  // Post-prestige generators get a neutral 1.0 modifier in every state by
  // default. Their behavior comes from trend_sensitivity (ai_slop 0.1 →
  // nearly immune; deepfakes 0.95 → highly volatile; algorithmic_prophecy
  // 0.5 → moderate) applied against this base modifier.
  // TODO(game-designer): tune during post-prestige balance pass.
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
      ai_slop: 1.0,
      deepfakes: 1.0,
      algorithmic_prophecy: 1.0,
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
      ai_slop: 1.0,
      deepfakes: 1.0,
      algorithmic_prophecy: 1.0,
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
      ai_slop: 1.0,
      deepfakes: 1.0,
      algorithmic_prophecy: 1.0,
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
      ai_slop: 1.0,
      deepfakes: 1.0,
      algorithmic_prophecy: 1.0,
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
      ai_slop: 1.0,
      deepfakes: 1.0,
      algorithmic_prophecy: 1.0,
    },
  },
};

// ---------------------------------------------------------------------------
// Clout upgrades (permanent meta-upgrades that survive rebrand)
// ---------------------------------------------------------------------------

// Values per the accepted Clout Upgrade Menu proposal
// (.frames/sdlc/proposals/accepted/clout-upgrade-menu.md).
// `values` and `lookaheads` are cumulative — entry N is the effect AT level N+1.
const CLOUT_UPGRADE_DEFS: Record<UpgradeId, CloutUpgradeDef> = {
  engagement_boost: {
    id: 'engagement_boost',
    cost: [10, 30, 75],
    max_level: 3,
    effect: { type: 'engagement_multiplier', values: [1.5, 2.5, 5.0] },
  },
  algorithm_insight: {
    id: 'algorithm_insight',
    cost: [15, 40],
    max_level: 2,
    effect: { type: 'algorithm_insight', lookaheads: [1, 2] },
  },
  platform_headstart_instasham: {
    id: 'platform_headstart_instasham',
    cost: [20],
    max_level: 1,
    effect: { type: 'platform_headstart', platform_id: 'instasham' },
  },
  platform_headstart_grindset: {
    id: 'platform_headstart_grindset',
    cost: [50],
    max_level: 1,
    effect: { type: 'platform_headstart', platform_id: 'grindset' },
  },
  ai_slop_unlock: {
    id: 'ai_slop_unlock',
    cost: [25],
    max_level: 1,
    effect: { type: 'generator_unlock', generator_id: 'ai_slop' },
  },
  deepfakes_unlock: {
    id: 'deepfakes_unlock',
    cost: [60],
    max_level: 1,
    effect: { type: 'generator_unlock', generator_id: 'deepfakes' },
  },
  algorithmic_prophecy_unlock: {
    id: 'algorithmic_prophecy_unlock',
    cost: [100],
    max_level: 1,
    effect: { type: 'generator_unlock', generator_id: 'algorithmic_prophecy' },
  },
};

// ---------------------------------------------------------------------------
// Viral burst tuning
// Probabilities target: early 45-60 min, mid 20-30 min, late 15-20 min
// between events at 10 ticks/sec (100ms tick interval).
// All values are starting points — tune during balance pass without code changes.
// ---------------------------------------------------------------------------

const VIRAL_BURST_CONFIG: ViralBurstConfig = {
  minCooldownTicks: 9_000,       // 15 min at 100ms/tick (active-play only)
  baseProbabilityEarly: 0.000037, // ~1 viral / 45-60 min before tutorials
  baseProbabilityMid:   0.000067, // ~1 viral / 20-30 min after tutorials
  baseProbabilityLate:  0.000095, // ~1 viral / 15-20 min after viral_stunts
  algorithmBoostThreshold: 1.5,  // effective modifier required to boost
  algorithmBoostMultiplier: 2.0, // doubles frequency when algorithm is hot
  durationMsMin: 5_000,
  durationMsMax: 10_000,
  magnitudeBoostMin: 3.0,        // 3–5× normal engagement rate during viral
  magnitudeBoostMax: 5.0,
};

// ---------------------------------------------------------------------------
// Scandal system static data
// Increment rates are per-ms. Decay rates are per-ms.
// All numeric values are provisional — tune during balance pass.
// TODO(game-designer): review scandal thresholds and increment rates.
// ---------------------------------------------------------------------------

const SCANDAL_TYPE_DEFS: Record<ScandalTypeId, ScandalTypeDef> = {
  content_burnout: {
    id: 'content_burnout',
    scopeType: 'generator',
    applicableScopes: ['selfies', 'memes', 'hot_takes', 'tutorials', 'livestreams', 'podcasts', 'viral_stunts'],
    baseThreshold: 0.70,
    baseMagnitude: 0.08,
    // At 100% overconcentration (share - 0.70 = 0.30), fires in ~20 min at 0 followers.
    incrementRate: 7.7e-9,  // 0.70 / (0.30 * 20 * 60_000 ms)
    // Drains from 0.5 to 0 in ~10 min when balanced.
    decayRate: 8.3e-10,     // 0.5 / (10 * 60_000 ms)
    algorithmModifierKey: '',
  },
  platform_neglect: {
    id: 'platform_neglect',
    scopeType: 'platform',
    applicableScopes: ['chirper', 'instasham', 'grindset'],
    baseThreshold: 0.80,
    baseMagnitude: 0.07,
    // Increments by 1/NEGLECT_WINDOW per ms. Reaches 0.80 after ~24 min.
    incrementRate: 5.6e-7,  // 1 / (30 * 60_000 ms)  → 0.80 at 24 min
    decayRate: 0,            // does not decay — resets to 0 on post
    algorithmModifierKey: '',
  },
  hot_take_backlash: {
    id: 'hot_take_backlash',
    scopeType: 'generator',
    applicableScopes: ['hot_takes'],
    baseThreshold: 0.60,
    baseMagnitude: 0.09,
    // At 50% hot_takes share with max algorithm penalty (2×), fires in ~15 min.
    incrementRate: 1.3e-8,  // 0.60 / (0.5 * 2.0 * 15 * 60_000 ms)
    decayRate: 5.6e-10,     // 0.5 / (15 * 60_000 ms)
    algorithmModifierKey: 'hot_takes',
  },
  trend_chasing: {
    id: 'trend_chasing',
    scopeType: 'global',
    applicableScopes: ['*'],
    baseThreshold: 0.75,
    baseMagnitude: 0.07,
    // Incremented per generator purchase. Decays slowly over time.
    incrementRate: 0,       // purchase-driven; incrementRate unused for tick logic
    decayRate: 2.8e-10,     // drains from 0.75 to 0 in ~45 min
    algorithmModifierKey: '',
  },
  growth_scrutiny: {
    id: 'growth_scrutiny',
    scopeType: 'platform',
    applicableScopes: ['chirper', 'instasham', 'grindset'],
    baseThreshold: 0.65,
    baseMagnitude: 0.08,
    // At 80% platform share (0.80 - 0.60 = 0.20 overage), fires in ~25 min.
    incrementRate: 2.2e-8,  // 0.65 / (0.20 * 25 * 60_000 ms)
    decayRate: 5.6e-10,     // 0.5 / (15 * 60_000 ms)
    algorithmModifierKey: '',
  },
  fact_check: {
    id: 'fact_check',
    scopeType: 'generator',
    applicableScopes: ['podcasts', 'tutorials'],
    baseThreshold: 0.70,
    baseMagnitude: 0.06,
    // At 50% combined share with 3× empire magnifier, fires in ~30 min.
    incrementRate: 2.6e-9,  // 0.70 / (0.5 * 3.0 * 30 * 60_000 ms)
    decayRate: 4.6e-10,
    algorithmModifierKey: '',
  },
};

const SCANDAL_STATIC_DATA: ScandalStaticData = {
  types: SCANDAL_TYPE_DEFS,
  empireScaleCurve: {
    // empire_scale = 1 / (1 + total_followers / scaleConstant)
    // At 50k followers: scale = 0.5 (thresholds halved → fires twice as fast).
    scaleConstant: 50_000,
    // Below this count, all accumulator increments are zero (new accounts are safe).
    minFollowersToEnable: 1_000,
  },
  prResponse: {
    readBeatMs: 1_500,          // 1.5s comedic beat before slider activates
    decisionWindowMs: 12_000,   // 12s decision window
    maxMitigationRate: 0.65,    // max spend reduces loss to 35% of raw magnitude
  },
  riskLevelThresholds: {
    building: 0.4,  // value/threshold ≥ 0.4 → building
    high: 0.75,     // value/threshold ≥ 0.75 → high
  },
  triggerThresholds: {
    contentBurnoutShare: 0.70,    // one generator >70% of total output → content burnout
    growthScrutinyShare: 0.60,    // one platform >60% of total follower gain → scrutiny
  },
};

// ---------------------------------------------------------------------------
// Creator Kit items — per-run upgrades purchased with Engagement
// (architecture/creator-kit.md).
//
// Every numeric value below is PLACEHOLDER. Final balance is owned by
// game-designer (open questions #3, #4, #5 in creator-kit.md). Placeholders
// follow the guidance in task #74:
//   - 3 levels per item
//   - cost[] in Engagement, roughly calibrated against generator costs
//   - value arrays produce a visible-but-not-absurd effect at each level
//   - Phone has no value array (sequential semantics — level count IS the value)
// BALANCE: placeholder — all five item definitions below.
// ---------------------------------------------------------------------------

const CREATOR_KIT_ITEM_DEFS: Record<KitItemId, KitItemDef> = {
  // Camera — Engagement Boost analog (per-run, multiplicative)
  camera: {
    id: 'camera',
    max_level: 3, // BALANCE: placeholder
    cost: [500, 2_500, 12_000], // BALANCE: placeholder
    effect: {
      type: 'engagement_multiplier',
      values: [1.5, 2.5, 4.0], // BALANCE: placeholder — cumulative
    },
  },
  // Laptop — Algorithm Insight analog (additive lookahead stacking)
  laptop: {
    id: 'laptop',
    max_level: 3, // BALANCE: placeholder
    cost: [800, 4_000, 18_000], // BALANCE: placeholder
    effect: {
      type: 'algorithm_lookahead',
      lookaheads: [1, 2, 3], // BALANCE: placeholder — cumulative
    },
  },
  // Phone — Sequential platform head-start. Target is computed dynamically
  // from player state + platform declaration order, so no value array.
  phone: {
    id: 'phone',
    max_level: 3, // BALANCE: placeholder
    cost: [1_200, 5_500, 22_000], // BALANCE: placeholder
    effect: { type: 'platform_headstart_sequential' },
  },
  // Wardrobe — Follower conversion multiplier (new axis, no Clout analog)
  wardrobe: {
    id: 'wardrobe',
    max_level: 3, // BALANCE: placeholder
    cost: [600, 3_000, 14_000], // BALANCE: placeholder
    effect: {
      type: 'follower_conversion_multiplier',
      values: [1.25, 1.75, 2.5], // BALANCE: placeholder — cumulative
    },
  },
  // Mogging — Viral burst amplifier (multiplies rolled boost_factor)
  mogging: {
    id: 'mogging',
    max_level: 3, // BALANCE: placeholder
    cost: [1_000, 5_000, 20_000], // BALANCE: placeholder
    effect: {
      type: 'viral_burst_amplifier',
      values: [1.2, 1.5, 2.0], // BALANCE: placeholder — cumulative
    },
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
  creatorKitItems: CREATOR_KIT_ITEM_DEFS,
  unlockThresholds: {
    // Post-prestige generators (ai_slop, deepfakes, algorithmic_prophecy) are
    // intentionally absent — they are unlocked only via Clout `generator_unlock`
    // upgrades in applyRebrand, never by follower threshold. See
    // architecture/core-systems.md §CloutUpgrade.
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
  viralBurst: VIRAL_BURST_CONFIG,
  scandal: SCANDAL_STATIC_DATA,
};
