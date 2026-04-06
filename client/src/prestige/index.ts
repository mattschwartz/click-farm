// Prestige module — the Rebrand.
//
// Responsibility: compute Clout earned at rebrand, apply the rebrand (reset a
// run while preserving meta), purchase Clout upgrades, and surface the
// algorithm lookahead granted by the algorithm_insight upgrade.
//
// Architecture contracts (core-systems.md §Prestige):
//   calculateRebrand(state) → { cloutEarned, newSeed }
//   applyRebrand(state, result) → GameState
//
// Clout formula (core-systems.md §Open Questions #1 — resolved):
//   clout_awarded = floor(sqrt(total_followers) / 10)
// Uses total_followers (current run), not lifetime_followers.
//
// What rebrand resets:
//   engagement, total_followers, platforms.{followers, unlocked}, generators
//   (owned, count, level), algorithm (new seed, new shift schedule)
// What rebrand preserves:
//   id, clout, lifetime_followers, clout_upgrades, last_close_time/state
// Meta-upgrade effects applied at rebrand:
//   platform_headstart → the named platform starts unlocked
//   generator_unlock   → the named generator starts owned at level 1

import type {
  AlgorithmState,
  AlgorithmStateId,
  GameState,
  GeneratorId,
  GeneratorState,
  KitItemId,
  PlatformId,
  PlatformState,
  Player,
  StaticData,
  UpgradeId,
  ViralBurstState,
} from '../types.ts';
import { deriveNewSeed, getShiftAtIndex, type ScheduledShift } from '../algorithm/index.ts';
import { createAlgorithmState, spendClout } from '../model/index.ts';
import { kitAlgorithmLookaheadBonus } from '../creator-kit/index.ts';

// ---------------------------------------------------------------------------
// Clout-from-followers formula
// ---------------------------------------------------------------------------

/**
 * Clout awarded for a rebrand given current total_followers.
 *
 *   clout = floor(sqrt(total_followers) / 10)
 *
 * Resolved 2026-04-04 (core-systems.md §Open Questions #1). First clean
 * milestone: 10,000 followers → 10 Clout.
 */
export function cloutForRebrand(totalFollowers: number): number {
  if (totalFollowers < 0 || !Number.isFinite(totalFollowers)) return 0;
  return Math.floor(Math.sqrt(totalFollowers) / 10);
}

// ---------------------------------------------------------------------------
// calculateRebrand
// ---------------------------------------------------------------------------

export interface RebrandResult {
  /** Clout awarded for this rebrand. ≥ 0. Integer. */
  cloutEarned: number;
  /** New algorithm seed for the post-rebrand run. */
  newSeed: number;
}

export function calculateRebrand(state: GameState): RebrandResult {
  const cloutEarned = cloutForRebrand(state.player.total_followers);
  const newSeed = deriveNewSeed(
    state.player.algorithm_seed,
    state.player.rebrand_count + 1,
  );
  return { cloutEarned, newSeed };
}

// ---------------------------------------------------------------------------
// Head-start helpers — read clout_upgrades to decide post-rebrand state
// ---------------------------------------------------------------------------

function platformsUnlockedByHeadstart(
  cloutUpgrades: Record<UpgradeId, number>,
  staticData: StaticData,
): Set<PlatformId> {
  const set = new Set<PlatformId>();
  for (const upgradeId of Object.keys(cloutUpgrades) as UpgradeId[]) {
    if (cloutUpgrades[upgradeId] <= 0) continue;
    const def = staticData.cloutUpgrades[upgradeId];
    if (def.effect.type === 'platform_headstart') {
      set.add(def.effect.platform_id);
    }
  }
  return set;
}

function generatorsUnlockedByCloutUpgrade(
  cloutUpgrades: Record<UpgradeId, number>,
  staticData: StaticData,
): Set<GeneratorId> {
  const set = new Set<GeneratorId>();
  for (const upgradeId of Object.keys(cloutUpgrades) as UpgradeId[]) {
    if (cloutUpgrades[upgradeId] <= 0) continue;
    const def = staticData.cloutUpgrades[upgradeId];
    if (def.effect.type === 'generator_unlock') {
      set.add(def.effect.generator_id);
    }
  }
  return set;
}

// ---------------------------------------------------------------------------
// applyRebrand — wipes the run, preserves meta
// ---------------------------------------------------------------------------

export function applyRebrand(
  state: GameState,
  result: RebrandResult,
  staticData: StaticData,
  now: number,
): GameState {
  const platformHeadstarts = platformsUnlockedByHeadstart(
    state.player.clout_upgrades,
    staticData,
  );
  const generatorUnlocks = generatorsUnlockedByCloutUpgrade(
    state.player.clout_upgrades,
    staticData,
  );

  // Reset platforms: unlocked iff threshold=0 OR head-start-granted.
  const platforms: Record<PlatformId, PlatformState> = Object.fromEntries(
    (Object.keys(state.platforms) as PlatformId[]).map((id) => {
      const threshold = staticData.unlockThresholds.platforms[id];
      const unlocked = threshold === 0 || platformHeadstarts.has(id);
      // Audience Mood reset — rebrand wipes per-run pressure state.
      return [id, {
        id,
        unlocked,
        followers: 0,
        retention: 1.0,
        content_fatigue: {},
        neglect: 0,
        algorithm_misalignment: 0,
      }];
    }),
  ) as Record<PlatformId, PlatformState>;

  // Reset generators: unowned + count=0 + level=1, except:
  // - generator_unlock upgrades which grant owned=true at level 1
  // - generators whose threshold is 0 (mirrors createInitialGameState and
  //   the platform reset above, preventing a post-rebrand buy-click race)
  const generators: Record<GeneratorId, GeneratorState> = Object.fromEntries(
    (Object.keys(state.generators) as GeneratorId[]).map((id) => {
      const threshold = staticData.unlockThresholds.generators[id];
      return [
        id,
        {
          id,
          owned: generatorUnlocks.has(id) || threshold === 0,
          level: 1,
          count: 0,
        },
      ];
    }),
  ) as Record<GeneratorId, GeneratorState>;

  // Fresh algorithm state from the new seed. Start at index 0, first state
  // in the list (matches createInitialGameState behaviour).
  const firstStateId = Object.keys(
    staticData.algorithmStates,
  )[0] as AlgorithmStateId;
  const algorithm: AlgorithmState = createAlgorithmState(
    firstStateId,
    0,
    staticData,
    now,
  );

  // Player: preserve meta, reset run state, add earned clout, bump count.
  // creator_kit is per-run (architecture/creator-kit.md §Rebrand) — wiped
  // here and MUST NOT appear in any preservation list.
  const player: Player = {
    ...state.player,
    engagement: 0,
    total_followers: 0,
    // lifetime_followers preserved (compounds across runs)
    clout: state.player.clout + result.cloutEarned,
    rebrand_count: state.player.rebrand_count + 1,
    algorithm_seed: result.newSeed,
    run_start_time: now,
    creator_kit: {} as Record<KitItemId, number>,
    // last_manual_click_at reset — per arch spec, cooldown timestamps are
    // meaningless after rebrand wipes generator count and level.
    last_manual_click_at: {} as Record<GeneratorId, number>,
    // last_close_time / last_close_state preserved — they reflect
    // serialization state, not run state.
  };

  // Reset viralBurst — any in-progress burst belongs to the previous run and
  // cannot be meaningfully resumed. Omitting this field leaves viralBurst
  // undefined on the returned state, which crashes doTick on the next tick.
  const viralBurst: ViralBurstState = {
    active_ticks_since_last: 0,
    active: null,
  };

  return {
    player,
    generators,
    platforms,
    algorithm,
    viralBurst,
  };
}

// ---------------------------------------------------------------------------
// Clout upgrade purchase
// ---------------------------------------------------------------------------

/**
 * Returns the Clout cost for the NEXT level of an upgrade, or null if the
 * upgrade is already at max level.
 */
export function cloutUpgradeCost(
  currentLevel: number,
  upgradeId: UpgradeId,
  staticData: StaticData,
): number | null {
  const def = staticData.cloutUpgrades[upgradeId];
  if (currentLevel >= def.max_level) return null;
  // cost[0] is the cost for level 1 (going from 0 → 1), etc.
  const nextCost = def.cost[currentLevel];
  if (nextCost === undefined) {
    throw new Error(
      `cloutUpgradeCost: cost table missing entry ${currentLevel} for ${upgradeId}`,
    );
  }
  return nextCost;
}

export function canPurchaseCloutUpgrade(
  state: GameState,
  upgradeId: UpgradeId,
  staticData: StaticData,
): boolean {
  const current = state.player.clout_upgrades[upgradeId] ?? 0;
  const cost = cloutUpgradeCost(current, upgradeId, staticData);
  if (cost === null) return false;
  return state.player.clout >= cost;
}

/**
 * Spend Clout to increment the named upgrade's level by 1. Throws on
 * insufficient Clout or max-level. Returns new GameState.
 *
 * Effect of the upgrade is NOT applied at purchase time — it's read at runtime
 * by the consumers (cloutBonus in game-loop, head-start logic in applyRebrand,
 * algorithm-insight lookahead in getUpcomingShifts).
 */
export function purchaseCloutUpgrade(
  state: GameState,
  upgradeId: UpgradeId,
  staticData: StaticData,
): GameState {
  const current = state.player.clout_upgrades[upgradeId] ?? 0;
  const cost = cloutUpgradeCost(current, upgradeId, staticData);
  if (cost === null) {
    throw new Error(
      `purchaseCloutUpgrade: '${upgradeId}' is already at max level`,
    );
  }
  if (state.player.clout < cost) {
    throw new Error(
      `purchaseCloutUpgrade: need ${cost} clout for '${upgradeId}', have ${state.player.clout}`,
    );
  }
  const player = spendClout(state.player, cost);
  return {
    ...state,
    player: {
      ...player,
      clout_upgrades: {
        ...player.clout_upgrades,
        [upgradeId]: current + 1,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Algorithm insight — reveal upcoming shifts
// ---------------------------------------------------------------------------

/**
 * Return up to N upcoming shifts, where N is the lookahead granted by the
 * algorithm_insight upgrade PLUS the kit `algorithm_lookahead` contribution
 * (Laptop). Level 0 everywhere → no lookahead → [].
 *
 * The per-level clout lookahead is read from `effect.lookaheads[level - 1]`
 * (each entry is the absolute number of shifts revealed at that level).
 * Multiple algorithm_insight upgrades stack additively, and Laptop adds to
 * the same sum — per architecture/creator-kit.md §Stacking Order (additive).
 */
export function getUpcomingShifts(
  state: GameState,
  staticData: StaticData,
): ScheduledShift[] {
  // Find all algorithm_insight upgrades and sum their contributions.
  let lookahead = 0;
  for (const upgradeId of Object.keys(state.player.clout_upgrades) as UpgradeId[]) {
    const level = state.player.clout_upgrades[upgradeId];
    if (level <= 0) continue;
    const def = staticData.cloutUpgrades[upgradeId];
    if (def.effect.type === 'algorithm_insight') {
      const n = def.effect.lookaheads[level - 1];
      if (n === undefined) {
        throw new Error(
          `getUpcomingShifts: upgrade '${upgradeId}' has no lookaheads[${level - 1}] ` +
            `for level ${level} (max_level ${def.max_level})`,
        );
      }
      lookahead += n;
    }
  }

  // Kit Laptop lookahead stacks ADDITIVELY with Clout algorithm_insight.
  lookahead += kitAlgorithmLookaheadBonus(state.player.creator_kit, staticData);

  if (lookahead <= 0) return [];

  const shifts: ScheduledShift[] = [];
  const seed = state.player.algorithm_seed;
  const currentIndex = state.algorithm.current_state_index;
  for (let i = 1; i <= lookahead; i++) {
    shifts.push(getShiftAtIndex(seed, currentIndex + i, staticData));
  }
  return shifts;
}
