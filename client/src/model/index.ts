// Model module.
// Responsibility: entity factory functions and currency operations.
// All operations return new state objects — no mutation.

import Decimal from 'decimal.js';
import type {
  Player,
  GeneratorState,
  PlatformState,
  GameState,
  GeneratorId,
  PlatformId,
  StaticData,
  UpgradeId,
  VerbGearId,
} from '../types.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_GENERATOR_IDS: GeneratorId[] = [
  'chirps',
  'selfies',
  'memes',
  'hot_takes',
  'tutorials',
  'livestreams',
  'podcasts',
  'mogging',
  // Post-prestige — present in state but owned=false until a Clout
  // `generator_unlock` upgrade is purchased.
  'ai_slop',
  'deepfakes',
  'algorithmic_prophecy',
];

const ALL_PLATFORM_IDS: PlatformId[] = ['chirper', 'picshift', 'skroll', 'podpod'];

// ---------------------------------------------------------------------------
// Player factory
// ---------------------------------------------------------------------------

export function createPlayer(now: number = Date.now()): Player {
  const allUpgradeIds: UpgradeId[] = [
    'engagement_boost',
    'platform_headstart_picshift',
    'platform_headstart_skroll',
    'platform_headstart_podpod',
    'ai_slop_unlock',
    'deepfakes_unlock',
    'algorithmic_prophecy_unlock',
  ];
  const clout_upgrades = Object.fromEntries(
    allUpgradeIds.map((id) => [id, 0])
  ) as Record<UpgradeId, number>;

  return {
    id: typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    engagement: new Decimal(0),
    clout: 0,
    total_followers: new Decimal(0),
    lifetime_followers: new Decimal(0),
    lifetime_engagement: new Decimal(0),
    has_started_run: false,
    rebrand_count: 0,
    clout_upgrades,
    verb_gear: {} as Record<VerbGearId, number>,
    last_manual_click_at: {} as Record<GeneratorId, number>,
    run_start_time: now,
    last_close_time: null,
    last_close_state: null,
  };
}

// ---------------------------------------------------------------------------
// Generator factory
// ---------------------------------------------------------------------------

export function createGeneratorState(
  id: GeneratorId,
  owned: boolean = false,
): GeneratorState {
  return {
    id,
    owned,
    level: 1,
    count: 0,
    autoclicker_count: 0,
  };
}

// ---------------------------------------------------------------------------
// Platform factory
// ---------------------------------------------------------------------------

export function createPlatformState(
  id: PlatformId,
  unlocked: boolean = false
): PlatformState {
  return {
    id,
    unlocked,
    followers: new Decimal(0),
    // Audience Mood — healthy defaults. See architecture/audience-mood.md.
    retention: 1.0,
    content_fatigue: {},
    neglect: 0,
  };
}

// ---------------------------------------------------------------------------
// Initial GameState factory
// The first platform (chirper) starts unlocked (unlock_threshold = 0).
// ---------------------------------------------------------------------------

export function createInitialGameState(
  staticData: StaticData,
  now: number = Date.now()
): GameState {
  const player = createPlayer(now);

  // Mark generators owned if their threshold is 0 — mirrors the platform
  // logic below and prevents a fresh-start race where the UI offers a buy
  // button for a threshold-met generator before the first tick can flip
  // owned=true via checkGeneratorUnlocks.
  const generators = Object.fromEntries(
    ALL_GENERATOR_IDS.map((id) => {
      const threshold = staticData.unlockThresholds.generators[id];
      return [id, createGeneratorState(id, threshold === 0)];
    })
  ) as Record<GeneratorId, GeneratorState>;

  // Unlock platforms whose threshold is 0 at game start
  const platforms = Object.fromEntries(
    ALL_PLATFORM_IDS.map((id) => {
      const threshold = staticData.unlockThresholds.platforms[id];
      return [id, createPlatformState(id, threshold === 0)];
    })
  ) as Record<PlatformId, PlatformState>;

  const viralBurst = { active_ticks_since_last: 0, active: null };

  return {
    player,
    generators,
    platforms,
    viralBurst,
  };
}

// ---------------------------------------------------------------------------
// Currency operations — engagement
// All return a new Player; no mutation. Throw on constraint violations.
// ---------------------------------------------------------------------------

/**
 * Clamp an engagement value into the valid range. Every write to
 * `player.engagement` MUST route through this helper. NaN and negative
 * values coerce to 0. No upper ceiling — the number does not stop going up.
 */
export function clampEngagement(value: Decimal): Decimal {
  if (value.isNaN()) return new Decimal(0);
  if (!value.isFinite()) return new Decimal(0);
  if (value.isNegative()) return new Decimal(0);
  return value;
}

export function earnEngagement(player: Player, amount: Decimal): Player {
  if (amount.isNegative()) {
    throw new Error(`earnEngagement: amount must be ≥ 0, got ${amount}`);
  }
  return {
    ...player,
    engagement: clampEngagement(player.engagement.plus(amount)),
  };
}

export function spendEngagement(player: Player, amount: Decimal): Player {
  if (amount.isNegative()) {
    throw new Error(`spendEngagement: amount must be ≥ 0, got ${amount}`);
  }
  if (player.engagement.lt(amount)) {
    throw new Error(
      `spendEngagement: insufficient engagement — have ${player.engagement}, need ${amount}`
    );
  }
  return { ...player, engagement: player.engagement.minus(amount) };
}

export function canAffordEngagement(player: Player, amount: Decimal): boolean {
  return player.engagement.gte(amount);
}

// ---------------------------------------------------------------------------
// Currency operations — clout
// ---------------------------------------------------------------------------

export function earnClout(player: Player, amount: number): Player {
  if (amount < 0) {
    throw new Error(`earnClout: amount must be ≥ 0, got ${amount}`);
  }
  if (!Number.isInteger(amount)) {
    throw new Error(`earnClout: clout must be an integer, got ${amount}`);
  }
  return { ...player, clout: player.clout + amount };
}

export function spendClout(player: Player, amount: number): Player {
  if (amount < 0) {
    throw new Error(`spendClout: amount must be ≥ 0, got ${amount}`);
  }
  if (!Number.isInteger(amount)) {
    throw new Error(`spendClout: clout must be an integer, got ${amount}`);
  }
  if (player.clout < amount) {
    throw new Error(
      `spendClout: insufficient clout — have ${player.clout}, need ${amount}`
    );
  }
  return { ...player, clout: player.clout - amount };
}

export function canAffordClout(player: Player, amount: number): boolean {
  return player.clout >= amount;
}

// ---------------------------------------------------------------------------
// Follower operations
// Followers live on PlatformState; total_followers on Player is the derived sum.
// ---------------------------------------------------------------------------

export function earnFollowers(
  platformState: PlatformState,
  player: Player,
  amount: Decimal
): { platform: PlatformState; player: Player } {
  if (amount.isNegative()) {
    throw new Error(`earnFollowers: amount must be ≥ 0, got ${amount}`);
  }
  if (!platformState.unlocked) {
    throw new Error(
      `earnFollowers: platform '${platformState.id}' is not unlocked`
    );
  }
  const newPlatform: PlatformState = {
    ...platformState,
    followers: platformState.followers.plus(amount),
  };
  // Note: total_followers is derived and must be synced via syncTotalFollowers().
  // This function only updates lifetime_followers.
  const newPlayer: Player = {
    ...player,
    lifetime_followers: player.lifetime_followers.plus(amount),
  };
  return { platform: newPlatform, player: newPlayer };
}

// Recomputes player.total_followers from the platforms map.
// Call after any batch follower update to ensure consistency.
export function syncTotalFollowers(
  player: Player,
  platforms: Record<PlatformId, PlatformState>
): Player {
  const total = ALL_PLATFORM_IDS.reduce(
    (sum: Decimal, id) => sum.plus(platforms[id].followers),
    new Decimal(0)
  );
  return { ...player, total_followers: total };
}
