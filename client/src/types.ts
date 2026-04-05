// All game entity types for Click Farm.
// Field specifications come from .frames/sdlc/architecture/core-systems.md.

// ---------------------------------------------------------------------------
// ID types
// 7 base generators per the accepted design proposal and the architecture
// spec (core-systems.md §Data Model → Generator).
// ---------------------------------------------------------------------------

export type GeneratorId =
  | 'selfies'
  | 'memes'
  | 'hot_takes'
  | 'tutorials'
  | 'livestreams'
  | 'podcasts'
  | 'viral_stunts';

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
  | 'faster_engagement'
  | 'algorithm_insight'
  | 'platform_headstart_chirper'
  | 'platform_headstart_instasham'
  | 'platform_headstart_grindset';

// ---------------------------------------------------------------------------
// UpgradeEffect — tagged union (architecture spec §CloutUpgrade)
// ---------------------------------------------------------------------------

export type UpgradeEffect =
  | { type: 'engagement_multiplier'; value: number }
  | { type: 'generator_unlock'; generator_id: GeneratorId }
  | { type: 'algorithm_insight'; lookahead: number }
  | { type: 'platform_headstart'; platform_id: PlatformId };

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
// Scandal system types
// ---------------------------------------------------------------------------

export type ScandalTypeId =
  | 'content_burnout'
  | 'platform_neglect'
  | 'hot_take_backlash'
  | 'trend_chasing'
  | 'growth_scrutiny'
  | 'fact_check';

/** Coarse risk signal exposed to the UI layer. */
export type RiskLevel = 'none' | 'building' | 'high';

/**
 * Tracks accumulated risk for a specific scandal type, scoped to a generator,
 * platform, or the whole empire. See scandal-system.md §RiskAccumulator.
 */
export interface RiskAccumulator {
  scandal_type: ScandalTypeId;
  scope_type: 'generator' | 'platform' | 'global';
  /** The generator_id or platform_id this accumulator is scoped to. Null for global. */
  scope_id: string | null;
  /** Current accumulated pressure. [0, 1]. Resets to 0 after firing. */
  value: number;
  /** Base threshold before empire scaling. */
  base_threshold: number;
  /** True while the player is offline. Accumulators do not advance when frozen. */
  frozen: boolean;
}

/**
 * A fired scandal event. Created when an accumulator crosses its threshold.
 * See scandal-system.md §ScandalEvent.
 */
export interface ScandalEvent {
  id: string;
  scandal_type: ScandalTypeId;
  target_platform: PlatformId;
  /** Fraction of platform followers to remove (before PR Response mitigation). [0.05, 0.15] */
  raw_magnitude: number;
  /** Set after PR Response resolves. Null while scandal is active. */
  final_magnitude: number | null;
  /** Engagement spent by the player on PR Response. */
  engagement_spent: number;
  /** Actual followers removed after all rules applied. Set on resolution. */
  followers_lost: number;
  /** Epoch ms when the scandal fired. */
  timestamp: number;
  /** True after PR Response window closes and damage is applied. */
  resolved: boolean;
}

/**
 * Snapshot of per-platform follower counts taken when the app is foregrounded.
 * Used to enforce the magnitude floor: no scandal can push a platform below
 * this level in the current session. Never persisted across sessions.
 *
 * See scandal-system.md §SessionSnapshot.
 */
export interface ScandalSessionSnapshot {
  /** Epoch ms when the snapshot was taken. */
  timestamp: number;
  /** Follower count per platform at snapshot time. */
  platform_followers: Record<PlatformId, number>;
}

/**
 * State machine for the PR Response flow.
 * See scandal-system.md §PR Response State Machine.
 */
export interface ScandalStateMachine {
  state: 'normal' | 'scandal_active' | 'resolving';
  activeScandal: ScandalEvent | null;
  /** Flavor text for a suppressed scandal — shown after primary resolves. */
  suppressedNotification: string | null;
  /** Epoch ms when the timer started (set on scandal_active entry). */
  timerStartTime: number | null;
  /** Total timer duration in ms (read beat + decision window). */
  timerDuration: number;
  /** Duration of the comedic read beat before the slider becomes active. */
  readBeatDuration: number;
  /** Engagement to spend on PR Response. Set by player (task #31) or 0 on auto-resolve. */
  pendingEngagementSpend: number;
}

// ---------------------------------------------------------------------------
// Scandal static data types
// ---------------------------------------------------------------------------

export interface ScandalTypeDef {
  id: ScandalTypeId;
  scopeType: 'generator' | 'platform' | 'global';
  /** Which generator_ids or platform_ids this applies to. ['*'] for global. */
  applicableScopes: string[];
  /** Base threshold before empire scaling. */
  baseThreshold: number;
  /** Base fraction of followers to remove. Clamped to [0.05, 0.15]. */
  baseMagnitude: number;
  /**
   * Per-ms accumulator increment rate when trigger condition is fully active.
   * Actual increment is scaled by the strength of the trigger condition.
   */
  incrementRate: number;
  /** Per-ms decay rate when trigger condition is absent (accumulators drain). */
  decayRate: number;
  /**
   * GeneratorId whose algorithm modifier amplifies this scandal's increment.
   * Empty string if algorithm state does not affect this type.
   */
  algorithmModifierKey: string;
}

export interface ScandalStaticData {
  types: Record<ScandalTypeId, ScandalTypeDef>;
  empireScaleCurve: {
    /** Denominator in empire_scale = 1 / (1 + followers / scaleConstant). */
    scaleConstant: number;
    /** Below this follower count, all accumulator increments are zeroed. */
    minFollowersToEnable: number;
  };
  prResponse: {
    /** Duration of read-beat (flavor text visible, slider inactive) in ms. */
    readBeatMs: number;
    /** Decision window in ms (after read beat, before auto-resolve). */
    decisionWindowMs: number;
    /** Max mitigation rate: spending max engagement reduces loss to (1 - maxMitigationRate). */
    maxMitigationRate: number;
  };
  riskLevelThresholds: {
    /** Accumulator value/threshold ratio at which risk becomes 'building'. */
    building: number;
    /** Accumulator value/threshold ratio at which risk becomes 'high'. */
    high: number;
  };
  /**
   * Trigger concentrations for tick-based accumulators.
   * These are the behavioral thresholds the increment formula uses internally.
   */
  triggerThresholds: {
    /** Generator output share above which Content Burnout increments. */
    contentBurnoutShare: number;
    /** Platform growth share above which Growth Scrutiny increments. */
    growthScrutinyShare: number;
  };
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
  /** Risk accumulators for all scandal types. Persisted in save. */
  accumulators: RiskAccumulator[];
  /** PR Response state machine. Persisted in save. */
  scandalStateMachine: ScandalStateMachine;
  /**
   * Follower snapshot taken on app foreground. Used for magnitude floor.
   * Not persisted meaningfully — driver overwrites on every open.
   */
  scandalSessionSnapshot: ScandalSessionSnapshot | null;
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
   * Each subsequent level costs 4× the previous: base_upgrade_cost × 4^(currentLevel - 1).
   *
   * Note: the design proposal mentions three upgrade tracks (quality, frequency,
   * platform optimization). The architecture spec consolidated these into a single
   * `level` field and `levelMultiplier`. If distinct tracks are reinstated, this
   * field will need to be replaced with per-track cost arrays.
   * TODO(game-designer): provisional — tune during balance pass.
   */
  base_upgrade_cost: number;
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
  unlockThresholds: {
    generators: Record<GeneratorId, number>;
    platforms: Record<PlatformId, number>;
  };
  viralBurst: ViralBurstConfig;
  scandal: ScandalStaticData;
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
