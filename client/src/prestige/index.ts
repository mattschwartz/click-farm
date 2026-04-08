// Prestige module — the Rebrand.
//
// Responsibility: compute Clout earned at rebrand, apply the rebrand (reset a
// run while preserving meta), and purchase Clout upgrades.
//
// Architecture contracts (core-systems.md §Prestige):
//   calculateRebrand(state) → { cloutEarned }
//   applyRebrand(state, result) → GameState
//
// Clout formula (core-systems.md §Open Questions #1 — resolved):
//   clout_awarded = floor(sqrt(total_followers) / 10)
// Uses total_followers (current run), not lifetime_followers.
//
// What rebrand resets:
//   engagement, total_followers, platforms.{followers, unlocked}, generators
//   (owned, count, level)
// What rebrand preserves:
//   id, clout, lifetime_followers, clout_upgrades, last_close_time/state
// Meta-upgrade effects applied at rebrand:
//   platform_headstart → the named platform starts unlocked
//   generator_unlock   → the named generator starts owned at level 1

import Decimal from 'decimal.js';
import type {
  GameState,
  GeneratorId,
  GeneratorState,
  PlatformId,
  PlatformState,
  Player,
  StaticData,
  UpgradeId,
  VerbGearId,
  ViralBurstState,
} from '../types.ts';
import { spendClout } from '../model/index.ts';

// ---------------------------------------------------------------------------
// Clout-from-followers formula
// ---------------------------------------------------------------------------

/**
 * Clout awarded for a rebrand given current total_followers.
 *
 *   clout = floor(log10(total_followers) × k)
 *
 * Log10-based formula per Decimal.js migration proposal §9.
 * Provisional k=3. Returns 0 for followers ≤ 0.
 */
export function cloutForRebrand(totalFollowers: Decimal): number {
  if (totalFollowers.lte(0) || totalFollowers.isNaN()) return 0;
  const k = 3;
  return Math.floor(totalFollowers.log(10).times(k).toNumber());
}

// ---------------------------------------------------------------------------
// calculateRebrand
// ---------------------------------------------------------------------------

export interface RebrandResult {
  /** Clout awarded for this rebrand. >= 0. Integer. */
  cloutEarned: number;
}

/**
 * Whether the player can rebrand right now.
 * Gate: viral_stunts must be unlocked (owned) before rebrand is available.
 */
export function canRebrand(state: GameState): boolean {
  return state.generators.viral_stunts.owned;
}

export function calculateRebrand(state: GameState): RebrandResult {
  const cloutEarned = cloutForRebrand(state.player.total_followers);
  return { cloutEarned };
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
        followers: new Decimal(0),
        retention: 1.0,
        content_fatigue: {},
        neglect: 0,
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
          autoclicker_count: 0,
        },
      ];
    }),
  ) as Record<GeneratorId, GeneratorState>;

  // Player: preserve meta, reset run state, add earned clout, bump count.
  const player: Player = {
    ...state.player,
    engagement: new Decimal(0),
    total_followers: new Decimal(0),
    has_started_run: false,
    // lifetime_followers preserved (compounds across runs)
    clout: state.player.clout + result.cloutEarned,
    rebrand_count: state.player.rebrand_count + 1,
    run_start_time: now,
    // verb_gear is per-run (architecture/verb-gear.md §Rebrand) — wiped
    // here and MUST NOT appear in any preservation list.
    verb_gear: {} as Record<VerbGearId, number>,
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
 * by the consumers (cloutBonus in game-loop, head-start logic in applyRebrand).
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

