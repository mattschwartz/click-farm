// All game entity types for Click Farm.
// Field specifications come from .frames/sdlc/architecture/core-systems.md.

// ---------------------------------------------------------------------------
// ID types
// 7 base generators per the accepted design proposal and the architecture
// spec (core-systems.md §Data Model → Generator).
// ---------------------------------------------------------------------------

export type GeneratorId =
  // 8 base generators (unlocked progressively via follower thresholds)
  | 'chirps'
  | 'selfies'
  | 'memes'
  | 'hot_takes'
  | 'tutorials'
  | 'livestreams'
  | 'podcasts'
  | 'viral_stunts'
  // 3 post-prestige generators (unlocked only via Clout `generator_unlock`
  // upgrades; no entry in unlockThresholds.generators).
  | 'ai_slop'
  | 'deepfakes'
  | 'algorithmic_prophecy';

export type PlatformId = 'chirper' | 'picshift' | 'skroll' | 'podpod';

// Audience Mood pressure families. See architecture/audience-mood.md §Data Model.
// Algorithm misalignment removed — proposals/accepted/20260406-remove-algorithm-weather-system.md.
export type PressureId = 'content_fatigue' | 'neglect';

export type UpgradeId =
  | 'engagement_boost'
  | 'platform_headstart_picshift'
  | 'platform_headstart_skroll'
  | 'platform_headstart_podpod'
  | 'ai_slop_unlock'
  | 'deepfakes_unlock'
  | 'algorithmic_prophecy_unlock';

// ---------------------------------------------------------------------------
// UpgradeEffect — tagged union (architecture spec §CloutUpgrade)
// Per-level arrays for effects whose magnitude varies by level; the array is
// indexed by `level - 1`. Single-level effects (generator_unlock,
// platform_headstart) take the target id directly.
// ---------------------------------------------------------------------------

export type UpgradeEffect =
  | { type: 'engagement_multiplier'; values: number[] }
  | { type: 'generator_unlock'; generator_id: GeneratorId }
  | { type: 'platform_headstart'; platform_id: PlatformId };

// ---------------------------------------------------------------------------
// Creator Kit — per-run upgrades purchased with Engagement, wiped on rebrand
// (architecture/creator-kit.md)
// ---------------------------------------------------------------------------

export type KitItemId =
  | 'camera'
  | 'phone'
  | 'wardrobe'
  | 'mogging';

/**
 * KitEffect — tagged union of the five Creator Kit effect types.
 *
 * Per-level `values` / `lookaheads` arrays are length = `max_level`, indexed
 * by `level - 1`, storing the CUMULATIVE effect at that level (same
 * convention as CloutUpgradeDef).
 *
 * `platform_headstart_sequential` has no per-level array: the target
 * platform is computed dynamically at purchase/run-start time by walking
 * StaticData.platforms in declaration order and skipping platforms already
 * head-started by Clout upgrades.
 *
 * See architecture/creator-kit.md §Interface Contracts.
 */
export type KitEffect =
  | { type: 'engagement_multiplier'; values: number[] }
  | { type: 'platform_headstart_sequential' }
  | { type: 'follower_conversion_multiplier'; values: number[] }
  | { type: 'viral_burst_amplifier'; values: number[] };

export interface KitItemDef {
  id: KitItemId;
  /** Maximum purchasable level. ≥ 1. */
  max_level: number;
  /** Engagement cost per level, ascending. Length = max_level. */
  cost: number[];
  effect: KitEffect;
}

// ---------------------------------------------------------------------------
// SnapshotState — captured on close, used by offline calculator
// ---------------------------------------------------------------------------

export interface SnapshotState {
  /** Aggregate engagement/sec at time of close. ≥ 0. */
  total_engagement_rate: number;
  /** Aggregate followers/sec at time of close. ≥ 0. */
  total_follower_rate: number;
  /** Per-platform follower earn rate at close. */
  platform_rates: Record<PlatformId, number>;
}

// ---------------------------------------------------------------------------
// Player — save root; owns all mutable game state
// ---------------------------------------------------------------------------

export interface Player {
  /** UUID, generated on first launch. Immutable. */
  id: string;
  /** Workhorse currency. ≥ 0. */
  engagement: number;
  /** Prestige currency. ≥ 0. Integer. */
  clout: number;
  /** DERIVED — never write directly, use syncTotalFollowers(). Sum of all platform follower counts. ≥ 0. */
  total_followers: number;
  /** Total followers ever earned across all runs. Never resets. ≥ 0. */
  lifetime_followers: number;
  /** Number of completed rebrands. ≥ 0. */
  rebrand_count: number;
  /** Purchased permanent meta-upgrades. Values ≥ 0. Survives rebrand. */
  clout_upgrades: Record<UpgradeId, number>;
  /**
   * Per-run Creator Kit purchases. Keys are KitItemIds, values are current
   * level ≥ 0 and ≤ item's max_level. **Wiped on rebrand.**
   * See architecture/creator-kit.md.
   */
  creator_kit: Record<KitItemId, number>;
  /** Epoch ms when the current run began. */
  run_start_time: number;
  /**
   * Epoch ms of the last manual click per generator, for cooldown gating.
   * Missing keys read as 0 (never clicked). See manual-action-ladder.md.
   */
  last_manual_click_at: Record<GeneratorId, number>;
  /** Epoch ms when the player last closed the game. Null on first session. */
  last_close_time: number | null;
  /** Production snapshot at last close. Used for offline calc. Null on first session. */
  last_close_state: SnapshotState | null;
}

// ---------------------------------------------------------------------------
// GeneratorState — mutable player state for a single content type
// ---------------------------------------------------------------------------

export interface GeneratorState {
  id: GeneratorId;
  /** Whether the player has unlocked this generator. */
  owned: boolean;
  /** Upgrade level. ≥ 1 when owned. */
  level: number;
  /** Number of this generator purchased (BUY track — yield multiplier). ≥ 0. */
  count: number;
  /**
   * Number of autoclickers purchased (passive production units). ≥ 0.
   * Drives passive rate: autoclicker_count × base_event_rate × base_event_yield × (1 + count).
   * See proposals/accepted/manual-action-ladder.md §level-driven-cooldown.
   */
  autoclicker_count: number;
}

// ---------------------------------------------------------------------------
// PlatformState — mutable player state for a single platform
// ---------------------------------------------------------------------------

export interface PlatformState {
  id: PlatformId;
  /** Whether the player has access to this platform. */
  unlocked: boolean;
  /** Platform-specific follower count. ≥ 0. Independent of other platforms. */
  followers: number;
  // -------------------------------------------------------------------------
  // Audience Mood — retention multiplier + pressure accumulators.
  // See architecture/audience-mood.md §Data Model.
  //
  // `retention` is a DERIVED field recomputed from the three pressures via
  // recomputeRetention(). Persisted for save-load UI convenience; authoritative
  // source is the pressure fields. Clamped to [retention_floor, 1.0].
  //
  // A "post" here is per-tick contribution from one owned generator — see
  // architect resolution 2026-04-05. The tuning knobs in
  // StaticData.audience_mood are scaled against that per-tick semantic.
  // -------------------------------------------------------------------------
  /** Derived retention multiplier. [retention_floor, 1.0]. Default 1.0. */
  retention: number;
  /**
   * Per-generator fatigue on this platform. Each value ∈ [0, 1]. Partial —
   * missing keys read as 0, matching the "map<GeneratorId, float>" spec
   * in architecture/audience-mood.md §Data Model.
   */
  content_fatigue: Partial<Record<GeneratorId, number>>;
  /** Time-since-last-post accumulator. [0, 1]. */
  neglect: number;
}

// ---------------------------------------------------------------------------
// ViralBurst — transient state for the viral burst event
// ---------------------------------------------------------------------------

export interface ViralBurstState {
  /** Active-play ticks accumulated since the last viral ended (or run start). */
  active_ticks_since_last: number;
  /** Non-null while a viral burst is in progress. Never persisted across saves. */
  active: ActiveViralEvent | null;
}

export interface ActiveViralEvent {
  source_generator_id: GeneratorId;
  source_platform_id: PlatformId;
  /** Epoch ms when the viral started. */
  start_time: number;
  /** Total duration of the event (ms). 5000–10000. */
  duration_ms: number;
  /** Total bonus engagement the event produces above normal production. */
  magnitude: number;
  /** Precomputed: magnitude / duration_ms. Applied per ms in tick. */
  bonus_rate_per_ms: number;
}

/** Payload fired to UI subscribers at the moment of trigger. Internal fields stripped. */
export interface ViralBurstPayload {
  source_generator_id: GeneratorId;
  source_platform_id: PlatformId;
  duration_ms: number;
  magnitude: number;
}

// ---------------------------------------------------------------------------
// GameState — the complete in-memory state passed to the tick function
// ---------------------------------------------------------------------------

export interface GameState {
  player: Player;
  generators: Record<GeneratorId, GeneratorState>;
  platforms: Record<PlatformId, PlatformState>;
  viralBurst: ViralBurstState;
}

// ---------------------------------------------------------------------------
// Static data types — balance config, loaded once at startup
// ---------------------------------------------------------------------------

export interface GeneratorDef {
  id: GeneratorId;
  /**
   * Engagement produced per event (manual tap or passive tick).
   * Scaled by level_multiplier(level) — the Upgrade track.
   * See proposals/accepted/manual-action-ladder.md §OQ12.
   */
  base_event_yield: number;
  /**
   * Events per second (passive rate per unit).
   * Scaled by count — the Automate track.
   * Manual cooldown derived as 1 / (max(1, count) × base_event_rate).
   */
  base_event_rate: number;
  /**
   * Whether the player can manually tap this generator in the Actions column.
   * true for ladder verbs (chirps, selfies, livestreams, podcasts, viral_stunts).
   * false for passive-only generators (memes, hot_takes, tutorials) and
   * post-prestige generators (ai_slop, deepfakes, algorithmic_prophecy).
   */
  manual_clickable: boolean;
  /** Fraction of engagement that converts to followers. (0, 1]. */
  follower_conversion_rate: number;
  /** Total followers required to unlock (appear in the shop). */
  unlock_threshold: number;
  /**
   * Engagement cost to buy the first unit.
   * Subsequent units cost more: base_buy_cost × buy_cost_multiplier^count_owned.
   * TODO(game-designer): provisional values — tune during balance pass.
   */
  base_buy_cost: number;
  /**
   * Cost multiplier per additional unit already owned.
   * Industry standard for clicker games: 1.15 gives a gentle but compounding curve.
   * TODO(game-designer): provisional — tune during balance pass.
   */
  buy_cost_multiplier: number;
  /**
   * Hand-tuned cost table for each level upgrade. Index 0 = cost of L1→L2,
   * index 1 = cost of L2→L3, etc. Length must equal max_level - 1.
   * TODO(game-designer): provisional — tune during balance pass (task #88).
   */
  upgrade_costs: number[];
  /**
   * Maximum upgradable level for this generator. Hard cap — the L=10
   * ceiling from the growth-curves proposal prevents runaway multipliers
   * (L=14 overflows Number.MAX_SAFE_INTEGER under the full effect stack).
   */
  max_level: number;
  /**
   * Engagement cost to buy the first autoclicker unit.
   * Subsequent units cost more: base_autoclicker_cost × autoclicker_cost_multiplier^autoclicker_count.
   * 0 for passive-only and post-prestige generators (not manual-clickable).
   * See proposals/accepted/manual-action-ladder.md §level-driven-cooldown OQ5.
   */
  base_autoclicker_cost: number;
  /**
   * Cost escalation per autoclicker purchased. Higher = steeper curve.
   * Separate from buy_cost_multiplier so BUY and autoclicker costs scale independently.
   */
  autoclicker_cost_multiplier: number;
}

export interface PlatformDef {
  id: PlatformId;
  /** Per-generator output multiplier for this platform. Values [0.5, 2.0]. */
  content_affinity: Record<GeneratorId, number>;
  /** Total followers required to unlock. */
  unlock_threshold: number;
}

export interface CloutUpgradeDef {
  id: UpgradeId;
  /** Clout cost per level, ascending. */
  cost: number[];
  /** Maximum purchasable level. ≥ 1. */
  max_level: number;
  effect: UpgradeEffect;
}

// Audience Mood tuning knobs. See architecture/audience-mood.md §Static data.
// A "post" is a per-tick contribution from one owned generator (architect
// resolution 2026-04-05). Per-post values are scaled against that semantic —
// e.g. 0.08/post at 10 Hz = 0.8/sec of same-generator fatigue from one
// continuously-posting generator. All values below are PLACEHOLDERS —
// game-designer tunes at build time.
export interface AudienceMoodStaticData {
  /** Lower bound on retention multiplier. Target [0.3, 0.5]. */
  retention_floor: number;
  /** Retention level below which the mood strip is shown (UI contract). */
  degradation_threshold: number;
  /** Fatigue accumulation on a same-generator post to a platform. */
  content_fatigue_per_post_same_gen: number;
  /** Fatigue decay on other generators when any generator posts. */
  content_fatigue_decay_per_post_other_gen: number;
  /** Neglect accumulated per tick when a platform receives no posts. */
  neglect_per_tick: number;
  /** Neglect removed on any post to a platform. 1.0 = full reset. */
  neglect_reset_on_post: number;
  /** Weight on fatigue magnitude in the retention composition formula. [0,1]. */
  fatigue_weight: number;
  /** Weight on neglect magnitude. [0,1]. */
  neglect_weight: number;
  /** Tie-breaker ordering for dominant-pressure display. First wins on tie. */
  composition_priority: [PressureId, PressureId];
}

export interface ViralBurstConfig {
  /** Active-play ticks before a viral can fire again. At 100ms/tick, 9000 = 15 min. */
  minCooldownTicks: number;
  /** Per-tick fire probability before tutorials are unlocked (~45–60 min between virals). */
  baseProbabilityEarly: number;
  /** Per-tick fire probability mid-game (~20–30 min between virals). */
  baseProbabilityMid: number;
  /** Per-tick fire probability late-game (~15–20 min between virals). */
  baseProbabilityLate: number;
  /** Minimum viral burst duration in ms. */
  durationMsMin: number;
  /** Maximum viral burst duration in ms. */
  durationMsMax: number;
  /** Minimum engagement rate multiplier during viral (3× normal). */
  magnitudeBoostMin: number;
  /** Maximum engagement rate multiplier during viral (5× normal). */
  magnitudeBoostMax: number;
}

export interface StaticData {
  generators: Record<GeneratorId, GeneratorDef>;
  platforms: Record<PlatformId, PlatformDef>;
  cloutUpgrades: Record<UpgradeId, CloutUpgradeDef>;
  /**
   * Static definitions for Creator Kit items. Balance values (max_level,
   * cost[], effect values) are owned by game-designer and populated in a
   * separate task. See architecture/creator-kit.md.
   */
  creatorKitItems: Record<KitItemId, KitItemDef>;
  unlockThresholds: {
    /**
     * Total followers required to unlock a generator. Post-prestige
     * generators (unlocked only via `generator_unlock` Clout upgrades) are
     * absent from this map by design — a missing entry means "never
     * follower-unlocked". See architecture/core-systems.md §CloutUpgrade.
     */
    generators: Partial<Record<GeneratorId, number>>;
    platforms: Record<PlatformId, number>;
  };
  viralBurst: ViralBurstConfig;
  /**
   * Audience Mood tuning knobs — see AudienceMoodStaticData. All values are
   * placeholders; game-designer tunes at build time.
   */
  audience_mood: AudienceMoodStaticData;
}

// ---------------------------------------------------------------------------
// SaveData — localStorage envelope
// ---------------------------------------------------------------------------

export interface SaveData {
  /** Schema version for migration chain. */
  version: number;
  state: GameState;
  /** Epoch ms when the game was last saved. */
  lastCloseTime: number;
  /** Production snapshot at last save. Null on first session. */
  lastCloseState: SnapshotState | null;
}
