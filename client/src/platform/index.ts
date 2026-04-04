// Platform module.
// Responsibility: platform unlock checks, content affinity lookups, and the
// follower distribution formula (arch spec §Engagement-to-Follower Conversion).
// All functions are pure — no mutation.

import type {
  PlatformState,
  PlatformId,
  GeneratorId,
  StaticData,
} from '../types.ts';

// ---------------------------------------------------------------------------
// Affinity lookup
//
// Reads content_affinity from static data. Returns 1.0 (neutral) when the
// generator has no affinity entry — safe for future generators added to data.
// ---------------------------------------------------------------------------

/**
 * Returns the content affinity multiplier for a generator on a platform.
 * Falls back to 1.0 if the platform or generator has no entry.
 */
export function getPlatformAffinity(
  platformId: PlatformId,
  generatorId: GeneratorId,
  staticData: StaticData
): number {
  return staticData.platforms[platformId]?.content_affinity[generatorId] ?? 1.0;
}

// ---------------------------------------------------------------------------
// Platform unlock checks
//
// Compares total_followers against each locked platform's unlock threshold.
// Returns a new map only when something changed; otherwise returns the same
// reference so callers can use reference equality to skip re-renders.
// ---------------------------------------------------------------------------

/**
 * Returns an updated platforms map with any newly-unlocked platforms based on
 * the current total follower count. Pure — does not mutate the input.
 */
export function checkPlatformUnlocks(
  platforms: Record<PlatformId, PlatformState>,
  totalFollowers: number,
  staticData: StaticData
): Record<PlatformId, PlatformState> {
  let changed = false;
  const next: Record<PlatformId, PlatformState> = { ...platforms };

  for (const id of Object.keys(platforms) as PlatformId[]) {
    if (!platforms[id].unlocked) {
      const threshold = staticData.unlockThresholds.platforms[id];
      if (totalFollowers >= threshold) {
        next[id] = { ...platforms[id], unlocked: true };
        changed = true;
      }
    }
  }

  return changed ? next : platforms;
}

// ---------------------------------------------------------------------------
// Follower distribution
//
// Architecture spec formula (§Engagement-to-Follower Conversion):
//
//   followers_per_platform = Σ_g(rate[g] × conv[g] × affinity[p][g])
//                            ─────────────────────────────────────────
//                                       total_affinity_weight
//
// The denominator is the sum of all per-platform scores across unlocked
// platforms, normalising so the total followers earned == base follower rate
// (Σ_g(rate[g] × conv[g])). Each unlocked platform receives a proportional
// share weighted by how well its affinities match the active generators.
//
// With one platform unlocked it receives 100 % of followers regardless of
// affinity values. As more platforms unlock, each earns a share.
// ---------------------------------------------------------------------------

export interface FollowerDistribution {
  /** Followers earned per ms on each platform. 0 for locked platforms. */
  perPlatformRate: Record<PlatformId, number>;
  /** Total followers per ms across all platforms (= Σ perPlatformRate). */
  totalRate: number;
}

/**
 * Compute how many followers are earned per ms on each unlocked platform.
 *
 * @param generatorEffectiveRates  engagement earned per ms per generator,
 *   already accounting for level, count, algorithm modifier, etc.
 *   Only include generators that are active (count > 0 and owned).
 * @param platforms  current platform states
 * @param staticData  static config
 */
export function computeFollowerDistribution(
  generatorEffectiveRates: Partial<Record<GeneratorId, number>>,
  platforms: Record<PlatformId, PlatformState>,
  staticData: StaticData
): FollowerDistribution {
  const unlockedIds = (Object.keys(platforms) as PlatformId[]).filter(
    (id) => platforms[id].unlocked
  );

  // Initialise all platforms to 0 (locked platforms stay 0).
  const perPlatformRate = Object.fromEntries(
    (Object.keys(platforms) as PlatformId[]).map((id) => [id, 0])
  ) as Record<PlatformId, number>;

  if (unlockedIds.length === 0) {
    return { perPlatformRate, totalRate: 0 };
  }

  const entries = Object.entries(generatorEffectiveRates) as [GeneratorId, number][];

  // Base follower rate: Σ_g(engagement_rate[g] × follower_conversion_rate[g])
  let baseRate = 0;
  for (const [genId, engagementRate] of entries) {
    baseRate += engagementRate * staticData.generators[genId].follower_conversion_rate;
  }

  if (baseRate === 0) {
    return { perPlatformRate, totalRate: 0 };
  }

  // Raw affinity score per unlocked platform
  const rawScores: Partial<Record<PlatformId, number>> = {};
  let totalRaw = 0;

  for (const platformId of unlockedIds) {
    let score = 0;
    for (const [genId, engagementRate] of entries) {
      const conv = staticData.generators[genId].follower_conversion_rate;
      const affinity = getPlatformAffinity(platformId, genId, staticData);
      score += engagementRate * conv * affinity;
    }
    rawScores[platformId] = score;
    totalRaw += score;
  }

  // Distribute base rate proportionally by raw affinity score.
  // If totalRaw is 0 (all affinities are 0), split evenly.
  let totalRate = 0;
  for (const platformId of unlockedIds) {
    const share = totalRaw > 0
      ? (rawScores[platformId] ?? 0) / totalRaw
      : 1 / unlockedIds.length;
    perPlatformRate[platformId] = baseRate * share;
    totalRate += perPlatformRate[platformId];
  }

  return { perPlatformRate, totalRate };
}
