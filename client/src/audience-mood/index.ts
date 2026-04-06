// Audience Mood module.
// Responsibility: the retention multiplier + its two pressure accumulators
// (content_fatigue, neglect). See
// .frames/sdlc/architecture/audience-mood.md for the authoritative spec.
// Algorithm misalignment removed — proposals/accepted/20260406-remove-algorithm-weather-system.md.
//
// STACKING ORDER POSITION (per creator-kit.md §Stacking Order):
//   1. Base value                               (generator / platform / event)
//   2. Algorithm / situational modifiers        (algorithm state, trend sensitivity)
//   3. Clout effects (permanent)                (cloutBonus)
//   4. Kit effects (per-run)                    (kitEngagementBonus, kitFollowerConversionBonus)
//   5. Event effects                            (viral burst, …)
//   6. Audience-Mood retention                  ← HERE (platform-scoped, post follower-distribution)
//   7. Clamps
//
// Retention is a PLATFORM-SCOPED multiplier. It wraps the entire per-platform
// follower-gain sum after content-affinity weighting and before any viral
// burst amplifiers that apply to follower gain. One scalar multiply per
// platform per tick.
//
// "POST" SEMANTICS (architect resolution 2026-04-05):
//   A "post" is a per-tick contribution from one owned generator. Each tick,
//   for every owned generator with count > 0, we route one post to its
//   highest-affinity unlocked platform (tie-break: platform declaration
//   order). Generators with zero affinity on every unlocked platform produce
//   no post that tick. See architecture/audience-mood.md §Pressure Update
//   Cadences for the full derivation. Tuning knobs in
//   StaticData.audience_mood are scaled against this per-tick semantic —
//   game-designer re-tunes magnitudes at build time.
//
// Pure functions only. state → state. No side effects.
//
// AUTOCLICKERS_AFFECT_MOOD (task #134):
//   When true, autoclicker fires contribute to mood pressure — generators with
//   autoclicker_count > 0 but count = 0 still generate posts. When false, the
//   gate reverts to the old behavior (count <= 0 skips). Toggle without code
//   change if playtesting shows the pressure feels wrong.

/**
 * Killswitch: when true, autoclicker-only generators (count=0, ac>0)
 * contribute posts to audience mood. Set false to revert to pre-#132 gate.
 */
export const AUTOCLICKERS_AFFECT_MOOD = true;

/**
 * Whether a generator should be considered "producing" for mood purposes.
 * Exported so the killswitch behavior is directly testable.
 */
export function isGeneratorProducing(
  count: number,
  autoclickerCount: number,
  killswitch: boolean = AUTOCLICKERS_AFFECT_MOOD,
): boolean {
  return killswitch
    ? (count > 0 || autoclickerCount > 0)
    : (count > 0);
}

import type {
  GameState,
  GeneratorId,
  PlatformId,
  PlatformState,
  PressureId,
  StaticData,
} from '../types.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

// ---------------------------------------------------------------------------
// Pressure update — event-driven path (one post to one platform)
// ---------------------------------------------------------------------------

/**
 * Apply one "post" event's effect on a platform's pressures. Pure: returns
 * a new GameState with the target platform's pressures + retention updated.
 *
 * Contract (architecture/audience-mood.md §Pressure Update Cadences):
 *   content_fatigue[P][G]            += per_post_same_gen
 *   content_fatigue[P][G' for G'≠G]  -= decay_per_post_other_gen
 *   neglect[P]                       -= neglect_reset_on_post
 *   → recompute retention for this platform.
 *
 * All pressure values clamped to [0, 1].
 */
export function applyPostToPressures(
  state: GameState,
  staticData: StaticData,
  platformId: PlatformId,
  generatorId: GeneratorId,
): GameState {
  const cfg = staticData.audience_mood;
  const platform = state.platforms[platformId];
  if (platform === undefined) return state;

  // Content fatigue: bump same-gen, decay all other-gens.
  const newFatigue: Partial<Record<GeneratorId, number>> = { ...platform.content_fatigue };
  const prevSame = newFatigue[generatorId] ?? 0;
  newFatigue[generatorId] = clamp01(prevSame + cfg.content_fatigue_per_post_same_gen);
  for (const gId of Object.keys(newFatigue) as GeneratorId[]) {
    if (gId === generatorId) continue;
    newFatigue[gId] = clamp01(
      (newFatigue[gId] ?? 0) - cfg.content_fatigue_decay_per_post_other_gen,
    );
  }

  // Neglect: reset on post.
  const newNeglect = clamp01(platform.neglect - cfg.neglect_reset_on_post);

  const nextPlatform: PlatformState = {
    ...platform,
    content_fatigue: newFatigue,
    neglect: newNeglect,
  };

  // Recompute retention from the new pressures.
  const { retention } = recomputeRetention(nextPlatform, staticData);
  const finalPlatform: PlatformState = { ...nextPlatform, retention };

  return {
    ...state,
    platforms: { ...state.platforms, [platformId]: finalPlatform },
  };
}

// ---------------------------------------------------------------------------
// Tick-driven path — neglect accumulation
// ---------------------------------------------------------------------------

/**
 * Advance neglect on every unlocked platform by deltaTicks × per-tick-rate.
 * Clamped to [0, 1]. Retention for every unlocked platform is recomputed
 * afterwards so downstream reads see consistent values.
 *
 * IMPORTANT: offline-catchup path MUST NOT call this. Per architecture spec
 * §Pressure Update Cadences, neglect freezes while offline ("no negative
 * events offline" convention from the old Platform Neglect system).
 */
export function advanceNeglect(
  state: GameState,
  staticData: StaticData,
  deltaTicks: number,
): GameState {
  if (deltaTicks <= 0) return state;
  const cfg = staticData.audience_mood;
  const inc = cfg.neglect_per_tick * deltaTicks;
  if (inc <= 0) return state;

  const nextPlatforms: Record<PlatformId, PlatformState> = { ...state.platforms };
  let changed = false;
  for (const pid of Object.keys(state.platforms) as PlatformId[]) {
    const p = state.platforms[pid];
    if (!p.unlocked) continue;
    const newNeglect = clamp01(p.neglect + inc);
    if (newNeglect === p.neglect) continue;
    const updated: PlatformState = { ...p, neglect: newNeglect };
    const { retention } = recomputeRetention(updated, staticData);
    nextPlatforms[pid] = { ...updated, retention };
    changed = true;
  }
  if (!changed) return state;
  return { ...state, platforms: nextPlatforms };
}

// ---------------------------------------------------------------------------
// Composition — retention + dominant-pressure display
// ---------------------------------------------------------------------------

export interface RetentionComputation {
  /** Composed retention multiplier, clamped to [retention_floor, 1.0]. */
  retention: number;
  /**
   * Pressure whose individual drag is largest. `null` when retention is at
   * or above `degradation_threshold` — the UI strip is hidden anyway.
   */
  dominantPressure: PressureId | null;
  /**
   * Non-null only when `dominantPressure === 'content_fatigue'`, naming the
   * specific generator whose fatigue is driving the dominant drag.
   */
  dominantGenerator: GeneratorId | null;
}

/**
 * Compose `retention` and determine the dominant pressure for a single
 * platform. Pure — reads only the pressure fields + the tuning knobs.
 *
 * Composition formula (two-pressure system):
 *   retention = clamp(
 *     (1 - fatigue_mag * fw) * (1 - neglect_mag * nw),
 *     retention_floor, 1.0
 *   )
 *
 * Dominant = argmax(drag_*) with `composition_priority` as fixed tie-breaker.
 */
export function recomputeRetention(
  platformState: PlatformState,
  staticData: StaticData,
): RetentionComputation {
  const cfg = staticData.audience_mood;

  // fatigue magnitude = max over generators (worst generator on this platform)
  let fatigueMag = 0;
  let worstFatigueGen: GeneratorId | null = null;
  for (const gId of Object.keys(platformState.content_fatigue) as GeneratorId[]) {
    const v = platformState.content_fatigue[gId] ?? 0;
    if (v > fatigueMag) {
      fatigueMag = v;
      worstFatigueGen = gId;
    }
  }
  const neglectMag = platformState.neglect;

  const dragFatigue = fatigueMag * cfg.fatigue_weight;
  const dragNeglect = neglectMag * cfg.neglect_weight;

  const raw =
    (1 - dragFatigue) *
    (1 - dragNeglect);
  const retention = Math.max(cfg.retention_floor, Math.min(1.0, raw));

  // Dominant pressure: argmax with composition_priority tie-break.
  const dragByPressure: Record<PressureId, number> = {
    content_fatigue: dragFatigue,
    neglect: dragNeglect,
  };

  let best: PressureId = cfg.composition_priority[0];
  let bestDrag = dragByPressure[best];
  for (let i = 1; i < cfg.composition_priority.length; i++) {
    const p = cfg.composition_priority[i];
    if (dragByPressure[p] > bestDrag) {
      best = p;
      bestDrag = dragByPressure[p];
    }
  }

  // Hide the strip when retention is healthy — return null dominant.
  if (retention >= cfg.degradation_threshold || bestDrag <= 0) {
    return { retention, dominantPressure: null, dominantGenerator: null };
  }

  const dominantGenerator = best === 'content_fatigue' ? worstFatigueGen : null;
  return { retention, dominantPressure: best, dominantGenerator };
}

/**
 * Recompute retention for every platform. Called on save load after
 * migration so loaded `retention` values are normalised against the stored
 * pressures (protects against drift from hand-edited or corrupted saves).
 */
export function recomputeAllRetention(
  state: GameState,
  staticData: StaticData,
): GameState {
  const nextPlatforms: Record<PlatformId, PlatformState> = { ...state.platforms };
  let changed = false;
  for (const pid of Object.keys(state.platforms) as PlatformId[]) {
    const p = state.platforms[pid];
    const { retention } = recomputeRetention(p, staticData);
    if (retention !== p.retention) {
      nextPlatforms[pid] = { ...p, retention };
      changed = true;
    }
  }
  if (!changed) return state;
  return { ...state, platforms: nextPlatforms };
}

// ---------------------------------------------------------------------------
// Tick routing helper — "post" events per owned generator per tick
// ---------------------------------------------------------------------------

/**
 * For each owned generator with count > 0, select its target platform
 * (highest content_affinity among unlocked platforms, tie-break by platform
 * declaration order) and fire one applyPostToPressures call. Generators with
 * zero affinity on every unlocked platform are skipped.
 *
 * Called from the tick before follower distribution so the retention used
 * this tick reflects this tick's posts (matching the arch spec contract
 * "after post recorded, before follower distribution for that tick").
 */
export function applyTickPosts(
  state: GameState,
  staticData: StaticData,
): GameState {
  const platformIds = Object.keys(state.platforms) as PlatformId[];
  const unlockedIds = platformIds.filter((id) => state.platforms[id].unlocked);
  if (unlockedIds.length === 0) return state;

  let next = state;
  for (const gId of Object.keys(state.generators) as GeneratorId[]) {
    const g = state.generators[gId];
    if (!g.owned || !isGeneratorProducing(g.count, g.autoclicker_count)) continue;

    // Find highest-affinity unlocked platform (first-declared wins on tie).
    let target: PlatformId | null = null;
    let bestAffinity = 0;
    for (const pid of unlockedIds) {
      const aff = staticData.platforms[pid]?.content_affinity[gId] ?? 0;
      if (target === null && aff > 0) {
        target = pid;
        bestAffinity = aff;
        continue;
      }
      if (aff > bestAffinity) {
        target = pid;
        bestAffinity = aff;
      }
    }
    if (target === null) continue; // zero affinity everywhere → skip
    next = applyPostToPressures(next, staticData, target, gId);
  }
  return next;
}
