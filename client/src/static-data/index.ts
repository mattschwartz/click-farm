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
  CloutUpgradeDef,
  UpgradeId,
  ViralBurstConfig,
  KitItemDef,
  KitItemId,
  AudienceMoodStaticData,
} from '../types.ts';

// ---------------------------------------------------------------------------
// Generators — 8 base content types (chirps through viral_stunts)
// Unlock thresholds create a progressive arc. Balance values are provisional.
//
// base_event_yield × base_event_rate = passive engagement/sec at count=1,
// level=1. For the existing 7, this product preserves the old
// base_engagement_rate. See manual-action-ladder.md §14a/§14b/§OQ12.
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
  // Starter verb, unlocked at 0. Level-driven cooldown: 1/(level×1.0).
  // Retuned for faster early game: yield=0.5, rate=1.0 →
  // passive 0.5 eng/s at autoclicker_count=1, count=0 (preserved).
  // L1 cooldown = 1,000ms (1 tap/s). First autoclicker at ~15 taps/15s.
  chirps: {
    id: 'chirps',
    base_event_yield: 0.5,
    base_event_rate: 1.0,
    manual_clickable: true,
    follower_conversion_rate: 0.07,

    unlock_threshold: 0,
    base_buy_cost: 1.5,
    buy_cost_multiplier: 1.15,
    // Hand-tuned ~3× ramp: cheap start, trophy finish.
    upgrade_costs: [10, 30, 100, 300, 1_000, 3_000, 10_000, 30_000, 100_000],
    max_level: 10,
    base_autoclicker_cost: 5,
    autoclicker_cost_multiplier: 1.5,
  },
  // §14a — ladder verb. Retuned: yield=5.0, rate=0.2 → passive 1.0 eng/s
  // at autoclicker_count=1, count=0.
  // §14d — threshold moved from 0 → 100 (chirps takes the starter position).
  selfies: {
    id: 'selfies',
    base_event_yield: 250,
    base_event_rate: 0.2,
    manual_clickable: true,
    follower_conversion_rate: 0.10,

    unlock_threshold: 100,
    base_buy_cost: 10,
    buy_cost_multiplier: 1.15,
    upgrade_costs: [20, 60, 200, 600, 2_000, 6_000, 20_000, 60_000, 200_000],
    max_level: 10,
    base_autoclicker_cost: 50,
    autoclicker_cost_multiplier: 1.5,
  },
  // §14b — passive-only. yield=1, rate=5.0 (preserved).
  memes: {
    id: 'memes',
    base_event_yield: 3,
    base_event_rate: 5.0,
    manual_clickable: false,
    follower_conversion_rate: 0.08,

    unlock_threshold: 50,
    base_buy_cost: 100,
    buy_cost_multiplier: 1.15,
    upgrade_costs: [100, 300, 1_000, 3_000, 10_000, 30_000, 100_000, 300_000, 1_000_000],
    max_level: 10,
    base_autoclicker_cost: 0,    // passive-only — no manual tap
    autoclicker_cost_multiplier: 0,
  },
  // §14b — passive-only. yield=1, rate=12.0 (preserved).
  hot_takes: {
    id: 'hot_takes',
    base_event_yield: 2,
    base_event_rate: 12.0,
    manual_clickable: false,
    follower_conversion_rate: 0.05,

    unlock_threshold: 200,
    base_buy_cost: 1_100,
    buy_cost_multiplier: 1.15,
    upgrade_costs: [1_000, 3_000, 10_000, 30_000, 100_000, 300_000, 1_000_000, 3_000_000, 10_000_000],
    max_level: 10,
    base_autoclicker_cost: 0,    // passive-only — no manual tap
    autoclicker_cost_multiplier: 0,
  },
  // §14b — passive-only. yield=1, rate=30.0 (preserved).
  tutorials: {
    id: 'tutorials',
    base_event_yield: 2,
    base_event_rate: 30.0,
    manual_clickable: false,
    follower_conversion_rate: 0.07,

    unlock_threshold: 1_000,
    base_buy_cost: 12_000,
    buy_cost_multiplier: 1.15,
    upgrade_costs: [10_000, 30_000, 100_000, 300_000, 1_000_000, 3_000_000, 10_000_000, 30_000_000, 100_000_000],
    max_level: 10,
    base_autoclicker_cost: 0,    // passive-only — no manual tap
    autoclicker_cost_multiplier: 0,
  },
  // Ladder verb. Retuned: yield 800→16,000 (20× bump for late-unlock feel).
  // yield×rate = 1,600. L1 cooldown 10,000ms, L10 cooldown 1,000ms.
  livestreams: {
    id: 'livestreams',
    base_event_yield: 550_000,
    base_event_rate: 0.033,
    manual_clickable: true,
    follower_conversion_rate: 0.09,

    unlock_threshold: 5_000,
    base_buy_cost: 130_000,
    buy_cost_multiplier: 1.15,
    upgrade_costs: [100_000, 300_000, 1_000_000, 3_000_000, 10_000_000, 30_000_000, 100_000_000, 300_000_000, 1_000_000_000],
    max_level: 10,
    base_autoclicker_cost: 650_000,
    autoclicker_cost_multiplier: 1.5,
  },
  // Ladder verb. Retuned for wider cooldown gap vs livestreams.
  // yield=484,848, rate=0.033 → passive 16,000 (preserved).
  // L1 cooldown 30,303ms, L10 cooldown 3,030ms. ~3× slower than livestreams.
  // TODO(game-designer): buy/upgrade/autoclicker costs are provisional —
  // retune during balance pass (task #88) to match new output.
  podcasts: {
    id: 'podcasts',
    base_event_yield: 2_000_000,
    base_event_rate: 0.02,
    manual_clickable: true,
    follower_conversion_rate: 0.11,

    unlock_threshold: 20_000,
    base_buy_cost: 1_400_000,
    buy_cost_multiplier: 1.15,
    upgrade_costs: [1_000_000, 3_000_000, 10_000_000, 30_000_000, 100_000_000, 300_000_000, 1_000_000_000, 3_000_000_000, 10_000_000_000],
    max_level: 10,
    base_autoclicker_cost: 7_000_000,
    autoclicker_cost_multiplier: 1.5,
  },
  // Ladder verb. Retuned for wider cooldown gap vs podcasts.
  // yield=16,000,000, rate=0.01 → passive 160,000 (preserved).
  // L1 cooldown 100,000ms, L10 cooldown 10,000ms. ~3× slower than podcasts.
  // TODO(game-designer): buy/upgrade/autoclicker costs are provisional —
  // retune during balance pass (task #88) to match new output.
  viral_stunts: {
    id: 'viral_stunts',
    base_event_yield: 18_000_000,
    base_event_rate: 0.01,
    manual_clickable: true,
    follower_conversion_rate: 0.06,

    unlock_threshold: 100_000,
    base_buy_cost: 20_000_000,
    buy_cost_multiplier: 1.15,
    upgrade_costs: [10_000_000, 30_000_000, 100_000_000, 300_000_000, 1_000_000_000, 3_000_000_000, 10_000_000_000, 30_000_000_000, 100_000_000_000],
    max_level: 10,
    base_autoclicker_cost: 100_000_000,
    autoclicker_cost_multiplier: 1.5,
  },
  // -------------------------------------------------------------------------
  // Post-prestige generators — unlocked only via Clout `generator_unlock`
  // upgrades. NO entry in unlockThresholds.generators (never follower-unlocked).
  // unlock_threshold here is set to Infinity for documentary clarity — the
  // checkGeneratorUnlocks pathway reads from unlockThresholds, not this field.
  //
  // Stats relative to viral_stunts (8,000 eng/s base): 8× / 15× / 40×.
  // Retuned to match viral_stunts output bump. Passive-only (no manual tap).
  // TODO(game-designer): buy/upgrade costs are provisional — tune during
  // post-prestige balance pass (task #88).
  // -------------------------------------------------------------------------
  ai_slop: {
    id: 'ai_slop',
    base_event_yield: 1,
    base_event_rate: 1_280_000.0,    // 8× viral_stunts (8 × 160,000)
    manual_clickable: false,
    follower_conversion_rate: 0.6,

    unlock_threshold: Infinity,
    base_buy_cost: 200_000_000,
    buy_cost_multiplier: 1.15,
    upgrade_costs: [100_000_000, 300_000_000, 1_000_000_000, 3_000_000_000, 10_000_000_000, 30_000_000_000, 100_000_000_000, 300_000_000_000, 1_000_000_000_000],
    max_level: 10,
    base_autoclicker_cost: 0,    // post-prestige, passive-only
    autoclicker_cost_multiplier: 0,
  },
  deepfakes: {
    id: 'deepfakes',
    base_event_yield: 1,
    base_event_rate: 2_400_000.0,    // 15× viral_stunts (15 × 160,000)
    manual_clickable: false,
    follower_conversion_rate: 0.3,

    unlock_threshold: Infinity,
    base_buy_cost: 2_000_000_000,
    buy_cost_multiplier: 1.15,
    upgrade_costs: [1_000_000_000, 3_000_000_000, 10_000_000_000, 30_000_000_000, 100_000_000_000, 300_000_000_000, 1_000_000_000_000, 3_000_000_000_000, 10_000_000_000_000],
    max_level: 10,
    base_autoclicker_cost: 0,    // post-prestige, passive-only
    autoclicker_cost_multiplier: 0,
  },
  algorithmic_prophecy: {
    id: 'algorithmic_prophecy',
    base_event_yield: 1,
    base_event_rate: 6_400_000.0,    // 40× viral_stunts (40 × 160,000)
    manual_clickable: false,
    follower_conversion_rate: 0.5,

    unlock_threshold: Infinity,
    base_buy_cost: 20_000_000_000,
    buy_cost_multiplier: 1.15,
    upgrade_costs: [10_000_000_000, 30_000_000_000, 100_000_000_000, 300_000_000_000, 1_000_000_000_000, 3_000_000_000_000, 10_000_000_000_000, 30_000_000_000_000, 100_000_000_000_000],
    max_level: 10,
    base_autoclicker_cost: 0,    // post-prestige, passive-only
    autoclicker_cost_multiplier: 0,
  },
};

// ---------------------------------------------------------------------------
// Platforms — 4 at launch
// chirper: text/hot-takes platform (Twitter analog)
// picshift: photo/visual platform (Instagram analog) — renamed from instasham
// skroll: short-form video platform (TikTok analog) — renamed from grindset
// podpod: long-form audio platform (podcast aggregator analog)
// ---------------------------------------------------------------------------

const PLATFORM_DEFS: Record<PlatformId, PlatformDef> = {
  chirper: {
    id: 'chirper',
    content_affinity: {
      chirps: 1.5,             // §14c — tweet-native
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
  picshift: {
    id: 'picshift',
    content_affinity: {
      chirps: 1.0,             // §14c — neutral
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
  skroll: {
    id: 'skroll',
    content_affinity: {
      chirps: 0.6,             // §14c — too ephemeral
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
  // BALANCE: placeholder — all podpod values below. Game-designer owns final
  // content_affinity and unlock_threshold (task #131 open question #1).
  podpod: {
    id: 'podpod',
    content_affinity: {
      chirps: 0.5,
      selfies: 0.3,
      memes: 0.4,
      hot_takes: 0.8,
      tutorials: 1.5,
      livestreams: 0.9,
      podcasts: 2.0,           // home turf — podcast-native
      viral_stunts: 0.5,
      ai_slop: 1.0,
      deepfakes: 1.0,
      algorithmic_prophecy: 1.0,
    },
    unlock_threshold: 2_000,
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
  platform_headstart_picshift: {
    id: 'platform_headstart_picshift',
    cost: [20],
    max_level: 1,
    effect: { type: 'platform_headstart', platform_id: 'picshift' },
  },
  platform_headstart_skroll: {
    id: 'platform_headstart_skroll',
    cost: [50],
    max_level: 1,
    effect: { type: 'platform_headstart', platform_id: 'skroll' },
  },
  // BALANCE: placeholder cost — game-designer owns final value (task #131 OQ #1).
  platform_headstart_podpod: {
    id: 'platform_headstart_podpod',
    cost: [80],
    max_level: 1,
    effect: { type: 'platform_headstart', platform_id: 'podpod' },
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
  durationMsMin: 5_000,
  durationMsMax: 10_000,
  magnitudeBoostMin: 3.0,        // 3–5× normal engagement rate during viral
  magnitudeBoostMax: 5.0,
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
// Audience Mood tuning
//
// A "post" is a per-tick contribution from one owned generator (architect
// resolution 2026-04-05, see architecture/audience-mood.md). At 10 Hz, one
// continuously-posting generator fires 10 posts/second. Values below are
// PLACEHOLDERS from the architecture spec — game-designer owns the final
// magnitudes and will re-tune against the per-tick semantic.
// ---------------------------------------------------------------------------

const AUDIENCE_MOOD: AudienceMoodStaticData = {
  retention_floor: 0.4,
  degradation_threshold: 0.95,
  content_fatigue_per_post_same_gen: 0.08,                 // BALANCE: placeholder
  content_fatigue_decay_per_post_other_gen: 0.15,          // BALANCE: placeholder
  neglect_per_tick: 0.001,                                 // BALANCE: placeholder — full-neglect in ~100s
  neglect_reset_on_post: 1.0,                              // full reset on any post
  fatigue_weight: 0.5,                                     // BALANCE: placeholder
  neglect_weight: 0.5,                                     // BALANCE: placeholder
  composition_priority: ['content_fatigue', 'neglect'],
};

// ---------------------------------------------------------------------------
// Exported static data
// ---------------------------------------------------------------------------

export const STATIC_DATA: StaticData = {
  generators: GENERATOR_DEFS,
  platforms: PLATFORM_DEFS,
  cloutUpgrades: CLOUT_UPGRADE_DEFS,
  creatorKitItems: CREATOR_KIT_ITEM_DEFS,
  unlockThresholds: {
    // Post-prestige generators (ai_slop, deepfakes, algorithmic_prophecy) are
    // intentionally absent — they are unlocked only via Clout `generator_unlock`
    // upgrades in applyRebrand, never by follower threshold. See
    // architecture/core-systems.md §CloutUpgrade.
    generators: {
      chirps: GENERATOR_DEFS.chirps.unlock_threshold,
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
      picshift: PLATFORM_DEFS.picshift.unlock_threshold,
      skroll: PLATFORM_DEFS.skroll.unlock_threshold,
      podpod: PLATFORM_DEFS.podpod.unlock_threshold,
    },
  },
  viralBurst: VIRAL_BURST_CONFIG,
  audience_mood: AUDIENCE_MOOD,
};
