// Offline calculator.
// Responsibility: compute the state delta between close and open, walking the
// seeded Algorithm shift schedule segment-by-segment.
//
// Architecture contract (core-systems.md §Offline Calculator):
//   "For each segment between shifts, apply the production rates for that
//    Algorithm state. Sum the gains across all segments."
//
// Signature: calculateOffline(state, closeTime, openTime, staticData) — takes
// the full GameState, not just SnapshotState. Segment-aware calculation needs
// per-generator trend_sensitivity to recompute rates under each algorithm
// segment; an aggregate-rate snapshot cannot be re-weighted. See core-systems.md
// §Interface Contracts → Offline Calculator for the rationale. SnapshotState
// is retained on the save for forward compatibility but is not read here.
//
// Assumptions (per architecture spec §Assumptions #6):
//   - Offline is approximation, not simulation. Rates are computed once per
//     algorithm segment and multiplied by segment duration.
//   - No negative events fire while offline (proposal §8). Pure accumulation.
//   - Platform / generator unlocks checked once at the end of the offline
//     window — crossing a threshold mid-offline does not retroactively
//     redirect follower distribution for that window.

import type {
  AlgorithmState,
  AlgorithmStateId,
  GameState,
  GeneratorId,
  PlatformId,
  PlatformState,
  StaticData,
} from '../types.ts';
import {
  advanceAlgorithm,
  getShiftAtIndex,
} from '../algorithm/index.ts';
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
import { syncTotalFollowers } from '../model/index.ts';

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface OfflineResult {
  /** Total engagement gained across all segments. ≥ 0. */
  engagementGained: number;
  /** Followers gained per platform. All values ≥ 0. */
  followersGained: Record<PlatformId, number>;
  /** Sum of followersGained across all platforms. ≥ 0. */
  totalFollowersGained: number;
  /** Number of algorithm shifts that occurred during the offline window. */
  algorithmAdvances: number;
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
    algorithmAdvances: 0,
    durationMs,
  };
}

// ---------------------------------------------------------------------------
// Core walker
// ---------------------------------------------------------------------------

/**
 * Compute accumulated gains for an offline window, segmenting by algorithm
 * shifts. Returns both the structured result (for player-facing summary) and
 * the new GameState with gains applied.
 *
 * Edge cases:
 *   - openTime ≤ closeTime → empty result, state unchanged.
 *   - No generators producing → algorithm still advances, engagement &
 *     followers stay at 0.
 *   - Very long offline windows → O(N) in number of shifts. At base_interval
 *     ~5 min this is ~288 shifts per day. A month offline = ~8,640 iterations.
 *     Still cheap.
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

  const seed = state.player.algorithm_seed;
  const platformIds = Object.keys(state.platforms) as PlatformId[];

  // Step 1: normalize algorithm state to closeTime. The saved shift_time may
  // already be in the past (shift due but not yet applied), so catch up.
  let algorithmState: AlgorithmState = advanceAlgorithm(
    state.algorithm,
    seed,
    closeTime,
    staticData,
  );
  const startIndex = algorithmState.current_state_index;

  // Accumulators
  let engagementGained = 0;
  const followersGained = Object.fromEntries(
    platformIds.map((id) => [id, 0]),
  ) as Record<PlatformId, number>;

  // Step 2: walk segments.
  let t = closeTime;
  while (t < openTime) {
    const segmentEnd = Math.min(algorithmState.shift_time, openTime);
    const segmentDurationMs = segmentEnd - t;

    if (segmentDurationMs > 0) {
      // Build a temporary state with the current segment's algorithm state so
      // computeAllGeneratorEffectiveRates applies the right modifiers.
      const tmpState: GameState = { ...state, algorithm: algorithmState };
      const ratesPerSec = computeAllGeneratorEffectiveRates(tmpState, staticData);

      // Engagement = sum(rates_per_sec) × seconds
      const segmentSec = segmentDurationMs / 1000;
      for (const id of Object.keys(ratesPerSec) as GeneratorId[]) {
        engagementGained += (ratesPerSec[id] ?? 0) * segmentSec;
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
      for (const id of platformIds) {
        followersGained[id] +=
          distribution.perPlatformRate[id] * kitFollowerMult * segmentDurationMs;
      }
    }

    t = segmentEnd;
    if (t < openTime) {
      // Advance to the next algorithm state.
      const nextIndex = algorithmState.current_state_index + 1;
      const shift = getShiftAtIndex(seed, nextIndex, staticData);
      const def = staticData.algorithmStates[shift.stateId as AlgorithmStateId];
      algorithmState = {
        current_state_id: shift.stateId,
        current_state_index: nextIndex,
        shift_time: algorithmState.shift_time + shift.durationMs,
        state_modifiers: { ...def.state_modifiers },
      };
    }
  }

  const algorithmAdvances = algorithmState.current_state_index - startIndex;

  // Step 3: apply gains to state.
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
    engagement: state.player.engagement + engagementGained,
    lifetime_followers: state.player.lifetime_followers + totalFollowersGained,
  };
  // syncTotalFollowers recomputes total_followers from platforms.
  newPlayer = syncTotalFollowers(newPlayer, newPlatforms);

  // Step 4: run unlock checks using the post-offline totals.
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

  // Step 5: update last_close_state snapshot on the new state so the *next*
  // save cycle starts fresh — and refresh last_close_time to openTime so a
  // subsequent open doesn't double-apply offline.
  const newState: GameState = {
    player: {
      ...newPlayer,
      last_close_time: openTime,
    },
    generators: postUnlockGenerators,
    platforms: postUnlockPlatforms,
    algorithm: algorithmState,
    // viralBurst is always reset after an offline session — any in-progress
    // burst is stale and cannot be meaningfully resumed.
    viralBurst: { active_ticks_since_last: 0, active: null },
  };
  // Recompute snapshot so the stored per-second rates reflect the now-current
  // algorithm state (otherwise it'd be stale from close).
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
      algorithmAdvances,
      durationMs,
    },
    newState: finalState,
  };
}
