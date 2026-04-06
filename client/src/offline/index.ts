// Offline calculator.
// Responsibility: compute the state delta between close and open using a
// single-pass multiplication of close-time production rates by elapsed time.
//
// With the algorithm weather system removed, there are no segment boundaries
// to walk — rates are constant across the offline window.
//
// Assumptions (per architecture spec §Assumptions #6):
//   - Offline is approximation, not simulation. Rates are computed once and
//     multiplied by elapsed time.
//   - No negative events fire while offline. Pure accumulation.
//   - Platform / generator unlocks checked once at the end of the offline
//     window — crossing a threshold mid-offline does not retroactively
//     redirect follower distribution for that window.

import type {
  GameState,
  GeneratorId,
  PlatformId,
  PlatformState,
  StaticData,
} from '../types.ts';
import {
  computeAllGeneratorEffectiveRates,
  computeSnapshot,
} from '../game-loop/index.ts';
import {
  checkPlatformUnlocks,
  computeFollowerDistribution,
} from '../platform/index.ts';
import { kitFollowerConversionBonus } from '../creator-kit/index.ts';
import { checkGeneratorUnlocks } from '../generator/index.ts';
import { syncTotalFollowers, clampEngagement } from '../model/index.ts';

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface OfflineResult {
  /** Total engagement gained. >= 0. */
  engagementGained: number;
  /** Followers gained per platform. All values >= 0. */
  followersGained: Record<PlatformId, number>;
  /** Sum of followersGained across all platforms. >= 0. */
  totalFollowersGained: number;
  /** Elapsed milliseconds between closeTime and openTime. */
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Empty result helper
// ---------------------------------------------------------------------------

function emptyResult(
  platforms: Record<PlatformId, PlatformState>,
  durationMs: number,
): OfflineResult {
  const followersGained = Object.fromEntries(
    (Object.keys(platforms) as PlatformId[]).map((id) => [id, 0]),
  ) as Record<PlatformId, number>;
  return {
    engagementGained: 0,
    followersGained,
    totalFollowersGained: 0,
    durationMs,
  };
}

// ---------------------------------------------------------------------------
// Core calculation — single-pass (no algorithm segments)
// ---------------------------------------------------------------------------

/**
 * Compute accumulated gains for an offline window. Returns both the
 * structured result (for player-facing summary) and the new GameState
 * with gains applied.
 *
 * Edge cases:
 *   - openTime <= closeTime -> empty result, state unchanged.
 *   - No generators producing -> engagement & followers stay at 0.
 */
export function calculateOffline(
  state: GameState,
  closeTime: number,
  openTime: number,
  staticData: StaticData,
): { result: OfflineResult; newState: GameState } {
  const durationMs = openTime - closeTime;
  if (durationMs <= 0) {
    return {
      result: emptyResult(state.platforms, Math.max(0, durationMs)),
      newState: state,
    };
  }

  const platformIds = Object.keys(state.platforms) as PlatformId[];

  // Compute rates from current state (rates are constant — no algorithm segments).
  const ratesPerSec = computeAllGeneratorEffectiveRates(state, staticData);

  // Engagement = sum(rates_per_sec) * seconds
  const durationSec = durationMs / 1000;
  let engagementGained = 0;
  for (const id of Object.keys(ratesPerSec) as GeneratorId[]) {
    engagementGained += (ratesPerSec[id] ?? 0) * durationSec;
  }

  // Follower distribution is computed from per-ms rates.
  const ratesPerMs: Partial<Record<GeneratorId, number>> = {};
  for (const id of Object.keys(ratesPerSec) as GeneratorId[]) {
    ratesPerMs[id] = (ratesPerSec[id] ?? 0) / 1000;
  }
  const distribution = computeFollowerDistribution(
    ratesPerMs,
    state.platforms,
    staticData,
  );
  // Wardrobe wraps the entire per-platform distribution (mirrors tick).
  const kitFollowerMult = kitFollowerConversionBonus(
    state.player.creator_kit,
    staticData,
  );
  // Audience Mood retention is frozen offline — apply the retention
  // value captured at closeTime as a constant scalar over the entire
  // offline window. See architecture/audience-mood.md §Integration —
  // Offline. No pressure advance while offline.
  const followersGained = Object.fromEntries(
    platformIds.map((id) => [id, 0]),
  ) as Record<PlatformId, number>;
  for (const id of platformIds) {
    const retention = state.platforms[id].retention;
    followersGained[id] =
      distribution.perPlatformRate[id] *
      kitFollowerMult *
      retention *
      durationMs;
  }

  // Apply gains to state.
  const totalFollowersGained = platformIds.reduce(
    (sum, id) => sum + followersGained[id],
    0,
  );

  const newPlatforms: Record<PlatformId, PlatformState> = { ...state.platforms };
  for (const id of platformIds) {
    if (followersGained[id] > 0) {
      newPlatforms[id] = {
        ...state.platforms[id],
        followers: state.platforms[id].followers + followersGained[id],
      };
    }
  }

  let newPlayer = {
    ...state.player,
    engagement: clampEngagement(state.player.engagement + engagementGained),
    lifetime_followers: state.player.lifetime_followers + totalFollowersGained,
  };
  // syncTotalFollowers recomputes total_followers from platforms.
  newPlayer = syncTotalFollowers(newPlayer, newPlatforms);

  // Run unlock checks using the post-offline totals.
  const postUnlockPlatforms = checkPlatformUnlocks(
    newPlatforms,
    newPlayer.total_followers,
    staticData,
  );
  const postUnlockGenerators = checkGeneratorUnlocks(
    state.generators,
    newPlayer.total_followers,
    staticData,
  );

  // Update last_close_time to openTime so a subsequent open doesn't
  // double-apply offline.
  const newState: GameState = {
    player: {
      ...newPlayer,
      last_close_time: openTime,
    },
    generators: postUnlockGenerators,
    platforms: postUnlockPlatforms,
    // viralBurst is always reset after an offline session — any in-progress
    // burst is stale and cannot be meaningfully resumed.
    viralBurst: { active_ticks_since_last: 0, active: null },
  };
  // Recompute snapshot so the stored per-second rates are fresh.
  const refreshedSnapshot = computeSnapshot(newState, staticData);
  const finalState: GameState = {
    ...newState,
    player: { ...newState.player, last_close_state: refreshedSnapshot },
  };

  return {
    result: {
      engagementGained,
      followersGained,
      totalFollowersGained,
      durationMs,
    },
    newState: finalState,
  };
}
