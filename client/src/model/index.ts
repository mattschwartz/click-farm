// Model module.
// Responsibility: entity factory functions and currency operations.
// All operations return new state objects — no mutation.

import type {
  Player,
  GeneratorState,
  PlatformState,
  AlgorithmState,
  GameState,
  GeneratorId,
  PlatformId,
  AlgorithmStateId,
  StaticData,
  UpgradeId,
} from '../types.ts';
import {
  createAccumulators,
  createDefaultStateMachine,
} from '../scandal/index.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_GENERATOR_IDS: GeneratorId[] = [
  'selfies',
  'memes',
  'hot_takes',
  'tutorials',
  'livestreams',
  'podcasts',
  'viral_stunts',
];

const ALL_PLATFORM_IDS: PlatformId[] = ['chirper', 'instasham', 'grindset'];

// ---------------------------------------------------------------------------
// Player factory
// ---------------------------------------------------------------------------

export function createPlayer(seed: number, now: number = Date.now()): Player {
  const allUpgradeIds: UpgradeId[] = [
    'faster_engagement',
    'algorithm_insight',
    'platform_headstart_chirper',
    'platform_headstart_instasham',
    'platform_headstart_grindset',
  ];
  const clout_upgrades = Object.fromEntries(
    allUpgradeIds.map((id) => [id, 0])
  ) as Record<UpgradeId, number>;

  return {
    id: crypto.randomUUID(),
    engagement: 0,
    clout: 0,
    total_followers: 0,
    lifetime_followers: 0,
    rebrand_count: 0,
    clout_upgrades,
    algorithm_seed: seed,
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
    followers: 0,
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
  // Seed from crypto so it's different each run
  const seed = Math.floor(Math.random() * 2 ** 32);
  const player = createPlayer(seed, now);

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

  // Start on the first algorithm state in the list
  const firstStateId = Object.keys(staticData.algorithmStates)[0] as AlgorithmStateId;
  const algorithm = createAlgorithmState(firstStateId, 0, staticData, now);

  const viralBurst = { active_ticks_since_last: 0, active: null };

  // Initialize scandal state.
  const accumulators = createAccumulators(generators, platforms, staticData);
  const scandalStateMachine = createDefaultStateMachine(staticData);

  return {
    player,
    generators,
    platforms,
    algorithm,
    viralBurst,
    accumulators,
    scandalStateMachine,
    scandalSessionSnapshot: null, // driver sets this on open/foreground
  };
}

// ---------------------------------------------------------------------------
// AlgorithmState factory
// ---------------------------------------------------------------------------

export function createAlgorithmState(
  stateId: AlgorithmStateId,
  stateIndex: number,
  staticData: StaticData,
  now: number = Date.now()
): AlgorithmState {
  const def = staticData.algorithmStates[stateId];
  return {
    current_state_id: stateId,
    current_state_index: stateIndex,
    shift_time: now + staticData.algorithmSchedule.baseIntervalMs,
    state_modifiers: { ...def.state_modifiers },
  };
}

// ---------------------------------------------------------------------------
// Currency operations — engagement
// All return a new Player; no mutation. Throw on constraint violations.
// ---------------------------------------------------------------------------

export function earnEngagement(player: Player, amount: number): Player {
  if (amount < 0) {
    throw new Error(`earnEngagement: amount must be ≥ 0, got ${amount}`);
  }
  return { ...player, engagement: player.engagement + amount };
}

export function spendEngagement(player: Player, amount: number): Player {
  if (amount < 0) {
    throw new Error(`spendEngagement: amount must be ≥ 0, got ${amount}`);
  }
  if (player.engagement < amount) {
    throw new Error(
      `spendEngagement: insufficient engagement — have ${player.engagement}, need ${amount}`
    );
  }
  return { ...player, engagement: player.engagement - amount };
}

export function canAffordEngagement(player: Player, amount: number): boolean {
  return player.engagement >= amount;
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
  amount: number
): { platform: PlatformState; player: Player } {
  if (amount < 0) {
    throw new Error(`earnFollowers: amount must be ≥ 0, got ${amount}`);
  }
  if (!platformState.unlocked) {
    throw new Error(
      `earnFollowers: platform '${platformState.id}' is not unlocked`
    );
  }
  const newPlatform: PlatformState = {
    ...platformState,
    followers: platformState.followers + amount,
  };
  // Note: total_followers is derived and must be synced via syncTotalFollowers().
  // This function only updates lifetime_followers.
  const newPlayer: Player = {
    ...player,
    lifetime_followers: player.lifetime_followers + amount,
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
    (sum, id) => sum + platforms[id].followers,
    0
  );
  return { ...player, total_followers: total };
}
