// All game entity types for Click Farm.
// Field specifications come from .frames/sdlc/architecture/core-systems.md.

// ---------------------------------------------------------------------------
// ID types
// 7 base generators per the accepted design proposal and the architecture
// spec (core-systems.md §Data Model → Generator).
// ---------------------------------------------------------------------------

export type GeneratorId =
  // 7 base generators (unlocked progressively via follower thresholds)
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

export type PlatformId = 'chirper' | 'instasham' | 'grindset';

// Algorithm state names from the spec (short_form_surge, authenticity_era,
// engagement_bait) plus 2 provisional additions.
export type AlgorithmStateId =
  | 'short_form_surge'
  | 'authenticity_era'
  | 'engagement_bait'
  | 'nostalgia_wave'
  | 'corporate_takeover';

export type UpgradeId =
  | 'engagement_boost'
  | 'algorithm_insight'
  | 'platform_headstart_instasham'
  | 'platform_headstart_grindset'
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
  | { type: 'algorithm_insight'; lookaheads: number[] }
  | { type: 'platform_headstart'; platform_id: PlatformId };

// ---------------------------------------------------------------------------
// Creator Kit — per-run upgrades purchased with Engagement, wiped on rebrand
// (architecture/creator-kit.md)
// ---------------------------------------------------------------------------

export type KitItemId =
  | 'camera'
  | 'laptop'
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
  | { type: 'algorithm_lookahead'; lookaheads: number[] }
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
  /** Algorithm position at close. ≥ 0. */
  algorithm_state_index: number;
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
  /** Seed for the PRNG driving Algorithm shifts. Immutable per run. */
  algorithm_seed: number;
  /** Epoch ms when the current run began. */
  run_start_time: number;
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
  /** Number of this generator purchased. ≥ 0. */
  count: number;
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
}

// ---------------------------------------------------------------------------
// AlgorithmState — the shifting modifier driving which strategies perform best
// ---------------------------------------------------------------------------

export interface AlgorithmState {
  /** Active algorithm state. */
  current_state_id: AlgorithmStateId;
  /** Position in the seeded shift schedule. ≥ 0. */
  current_state_index: number;
  /** Epoch ms when the next shift occurs. */
  shift_time: number;
  /** Per-generator multiplier for the current state. Values typically [0.5, 2.0]. */
  state_modifiers: Record<GeneratorId, number>;
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
  algorithm: AlgorithmState;
  viralBurst: ViralBurstState;
}

// ---------------------------------------------------------------------------
// Static data types — balance config, loaded once at startup
// ---------------------------------------------------------------------------

export interface GeneratorDef {
  id: GeneratorId;
  /** Engagement per second per unit at level 1. */
  base_engagement_rate: number;
  /** Fraction of engagement that converts to followers. (0, 1]. */
  follower_conversion_rate: number;
  /** How much Algorithm state affects output. [0, 1]. */
  trend_sensitivity: number;
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
   * Engagement cost to upgrade from level 1 → 2.
   * Subsequent levels track the reward curve 1:1 via `levelMultiplier`:
   *   cost(L→L+1) = ceil(base_upgrade_cost × levelMultiplier(L+1))
   * See proposals/accepted/generator-level-growth-curves.md.
   * TODO(game-designer): provisional — tune during balance pass (task #88).
   */
  base_upgrade_cost: number;
  /**
   * Maximum upgradable level for this generator. Hard cap — the L=10
   * ceiling from the growth-curves proposal prevents runaway multipliers
   * (L=14 overflows Number.MAX_SAFE_INTEGER under the full effect stack).
   */
  max_level: number;
}

export interface PlatformDef {
  id: PlatformId;
  /** Per-generator output multiplier for this platform. Values [0.5, 2.0]. */
  content_affinity: Record<GeneratorId, number>;
  /** Total followers required to unlock. */
  unlock_threshold: number;
}

export interface AlgorithmStateDef {
  id: AlgorithmStateId;
  /** Per-generator multiplier when this state is active. Values typically [0.5, 2.0]. */
  state_modifiers: Record<GeneratorId, number>;
}

export interface CloutUpgradeDef {
  id: UpgradeId;
  /** Clout cost per level, ascending. */
  cost: number[];
  /** Maximum purchasable level. ≥ 1. */
  max_level: number;
  effect: UpgradeEffect;
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
  /** If top generator's effective algorithm modifier exceeds this, p_viral is boosted. */
  algorithmBoostThreshold: number;
  /** Multiplier applied to p_viral when the algorithm boost threshold is met. */
  algorithmBoostMultiplier: number;
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
  algorithmStates: Record<AlgorithmStateId, AlgorithmStateDef>;
  algorithmSchedule: {
    /** Base time between Algorithm shifts, in ms. */
    baseIntervalMs: number;
    /** ± fuzz range added to baseIntervalMs, in ms. */
    varianceMs: number;
  };
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
