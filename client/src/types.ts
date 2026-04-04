// All game entity types for Click Farm.
// Field specifications come from .frames/sdlc/architecture/core-systems.md.

// ---------------------------------------------------------------------------
// ID types
// NOTE: GeneratorId includes 3 named types from the architecture spec
// (selfies, memes, hot_takes) plus 3 provisional names. The game designer
// should confirm the full set via task #33 / follow-on design work.
// ---------------------------------------------------------------------------

export type GeneratorId =
  | 'selfies'
  | 'memes'
  | 'hot_takes'
  | 'reaction_posts'
  | 'vlogs'
  | 'collabs';

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
  /** Sum of all platform follower counts. Derived field — keep in sync. ≥ 0. */
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
// GameState — the complete in-memory state passed to the tick function
// ---------------------------------------------------------------------------

export interface GameState {
  player: Player;
  generators: Record<GeneratorId, GeneratorState>;
  platforms: Record<PlatformId, PlatformState>;
  algorithm: AlgorithmState;
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
  /** Total followers required to unlock. */
  unlock_threshold: number;
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
