// Game loop module.
// Responsibility: execute the core tick (pure state -> state) and handle the
// manual click action. See .frames/sdlc/architecture/core-systems.md —
// "Game Loop Module" and "Game Loop Tick" interface contract.
//
// Pipeline per tick:
//   1. Compute per-generator effective engagement rate/ms.
//   2. Accumulate engagement over deltaMs into player.engagement.
//   3. Distribute followers across unlocked platforms via the follower
//      distribution formula; sync derived totals on Player.
//   4. Check platform unlocks against total_followers.
//   5. Advance Algorithm to account for any shifts up to `now`.
//
// All functions are pure. State in → new state out. No mutation.

import type {
  ActiveViralEvent,
  GameState,
  GeneratorId,
  GeneratorState,
  PlatformId,
  PlatformState,
  Player,
  SnapshotState,
  StaticData,
  UpgradeId,
  ViralBurstState,
} from '../types.ts';
import { advanceAlgorithm, getAlgorithmModifier } from '../algorithm/index.ts';
import {
  checkPlatformUnlocks,
  computeFollowerDistribution,
} from '../platform/index.ts';
import { checkGeneratorUnlocks } from '../generator/index.ts';
import { syncTotalFollowers } from '../model/index.ts';

// ---------------------------------------------------------------------------
// Tuning constants
// ---------------------------------------------------------------------------

/**
 * Base engagement produced per manual click ("one post").
 *
 * TODO(game-designer): This is a provisional tuning value. The architecture
 * spec defines generator formulas but does not specify a click formula. 1.0
 * mirrors the selfies base_engagement_rate, so hand-clicking is roughly
 * comparable to one unit of selfies-per-second. Revisit during balance pass.
 */
export const CLICK_BASE_ENGAGEMENT = 1.0;

/**
 * The generator whose algorithm modifier and trend_sensitivity are applied to
 * manual clicks. Selfies is the always-available starting generator, so the
 * click mechanic inherits its "feel".
 */
const CLICK_GENERATOR_ID: GeneratorId = 'selfies';

// ---------------------------------------------------------------------------
// Formula helpers
// ---------------------------------------------------------------------------

/**
 * Level multiplier for a generator's effective rate.
 * Resolved open question #2 (see core-systems.md §Open Questions):
 *   level_multiplier(level) = 2^(level² / 5)
 *
 * This is a super-exponential curve. Level 1 ≈ 1.149×, level 8 ≈ 7,225×.
 * Per-generator, independent. Denominator `5` is the single tuning knob.
 */
export function levelMultiplier(level: number): number {
  if (level < 1 || !Number.isFinite(level)) {
    throw new Error(`levelMultiplier: level must be ≥ 1 and finite, got ${level}`);
  }
  return Math.pow(2, (level * level) / 5);
}

/**
 * Clout bonus multiplier applied to all engagement rates.
 * Reads the `faster_engagement` upgrade level from `clout_upgrades` and raises
 * its effect value to that power. Other upgrade types (algorithm_insight,
 * platform_headstart, generator_unlock) do not affect engagement rate.
 *
 * Returns 1.0 (no bonus) if the upgrade is not purchased.
 */
export function cloutBonus(
  cloutUpgrades: Record<UpgradeId, number>,
  staticData: StaticData,
): number {
  let multiplier = 1.0;
  for (const upgradeId of Object.keys(cloutUpgrades) as UpgradeId[]) {
    const level = cloutUpgrades[upgradeId];
    if (level <= 0) continue;
    const def = staticData.cloutUpgrades[upgradeId];
    if (def.effect.type === 'engagement_multiplier') {
      multiplier *= Math.pow(def.effect.value, level);
    }
  }
  return multiplier;
}

/**
 * Folds trend_sensitivity into the raw algorithm state modifier.
 *
 *   effective = 1 + trend_sensitivity × (raw_modifier - 1)
 *
 * Interpolates between 1.0 (trend-immune) and the raw modifier (fully
 * trend-sensitive). trend_sensitivity=0 → always 1.0. trend_sensitivity=1 →
 * always the raw modifier. In between is a linear interpolation.
 */
export function effectiveAlgorithmModifier(
  rawModifier: number,
  trendSensitivity: number,
): number {
  return 1 + trendSensitivity * (rawModifier - 1);
}

// ---------------------------------------------------------------------------
// Per-generator effective rate
// ---------------------------------------------------------------------------

/**
 * Computes effective engagement rate (engagement per second) for a single
 * generator, accounting for count, level, algorithm state, trend sensitivity,
 * and clout bonus.
 *
 *   effective_rate = count × base_rate × level_multiplier(level)
 *                    × effective_algorithm_modifier × clout_bonus
 *
 * Returns 0 if the generator is not owned or count is 0.
 *
 * Note: platform affinity is NOT applied here — it belongs to the follower
 * distribution step (architecture spec §Engagement-to-Follower Conversion),
 * not the engagement-earned step.
 */
export function computeGeneratorEffectiveRate(
  generator: GeneratorState,
  state: GameState,
  staticData: StaticData,
): number {
  if (!generator.owned || generator.count <= 0) return 0;
  const def = staticData.generators[generator.id];
  const rawModifier = getAlgorithmModifier(state.algorithm, generator.id);
  const algoMod = effectiveAlgorithmModifier(rawModifier, def.trend_sensitivity);
  const clout = cloutBonus(state.player.clout_upgrades, staticData);
  return (
    generator.count *
    def.base_engagement_rate *
    levelMultiplier(generator.level) *
    algoMod *
    clout
  );
}

/**
 * Computes the effective engagement rate per second for every owned, active
 * generator. Returned map only contains entries for generators with rate > 0.
 */
export function computeAllGeneratorEffectiveRates(
  state: GameState,
  staticData: StaticData,
): Partial<Record<GeneratorId, number>> {
  const rates: Partial<Record<GeneratorId, number>> = {};
  for (const id of Object.keys(state.generators) as GeneratorId[]) {
    const rate = computeGeneratorEffectiveRate(
      state.generators[id],
      state,
      staticData,
    );
    if (rate > 0) rates[id] = rate;
  }
  return rates;
}

// ---------------------------------------------------------------------------
// Viral burst trigger — exported for deterministic unit testing
// ---------------------------------------------------------------------------

/**
 * Evaluates whether a viral burst should fire this tick.
 *
 * All three gates must pass:
 *   Gate 1 — cooldown: enough active-play ticks since the last viral.
 *   Gate 2 — probability: random roll < p_viral (adjusted by Gate 3).
 *   Gate 3 — algorithm affinity: top generator's effective modifier ≥ threshold
 *             doubles p_viral.
 *
 * Returns a fully-constructed `ActiveViralEvent` on trigger, or null otherwise.
 *
 * @param state      current game state (viralBurst.active must be null — caller
 *                   verifies this before calling)
 * @param staticData balance config
 * @param now        current epoch ms (becomes start_time on the event)
 * @param random     injectable PRNG, defaults to Math.random — inject for tests
 */
export function evaluateViralTrigger(
  state: GameState,
  staticData: StaticData,
  now: number,
  random: () => number = Math.random,
): ActiveViralEvent | null {
  const config = staticData.viralBurst;
  const { viralBurst, generators, platforms, algorithm } = state;

  // Gate 1 — cooldown (hard floor, active-play ticks only)
  if (viralBurst.active_ticks_since_last < config.minCooldownTicks) {
    return null;
  }

  // Require at least one generator producing — no viral from empty content farm
  const rates = computeAllGeneratorEffectiveRates(state, staticData);
  const rateEntries = Object.entries(rates) as [GeneratorId, number][];
  if (rateEntries.length === 0) return null;

  // Determine phase-based p_viral
  let p_viral: number;
  if (!generators.tutorials.owned) {
    p_viral = config.baseProbabilityEarly;
  } else if (!generators.viral_stunts.owned) {
    p_viral = config.baseProbabilityMid;
  } else {
    p_viral = config.baseProbabilityLate;
  }

  // Gate 3 — algorithm affinity boost (applied to p_viral before the roll)
  let topGenId: GeneratorId = rateEntries[0][0];
  let topRate = rateEntries[0][1];
  for (const [id, rate] of rateEntries) {
    if (rate > topRate) {
      topRate = rate;
      topGenId = id;
    }
  }
  const rawMod = getAlgorithmModifier(algorithm, topGenId);
  const topGenDef = staticData.generators[topGenId];
  const effectiveMod = effectiveAlgorithmModifier(rawMod, topGenDef.trend_sensitivity);
  if (effectiveMod > config.algorithmBoostThreshold) {
    p_viral *= config.algorithmBoostMultiplier;
  }

  // Gate 2 — probability roll
  if (random() >= p_viral) {
    return null;
  }

  // All gates passed — select source platform
  const unlockedPlatformIds = (Object.keys(platforms) as PlatformId[]).filter(
    (id) => platforms[id].unlocked,
  );
  if (unlockedPlatformIds.length === 0) return null;

  let sourcePlatformId = unlockedPlatformIds[0];
  let maxAffinity =
    staticData.platforms[sourcePlatformId].content_affinity[topGenId] ?? 0;
  for (const id of unlockedPlatformIds) {
    const affinity = staticData.platforms[id].content_affinity[topGenId] ?? 0;
    if (affinity > maxAffinity) {
      maxAffinity = affinity;
      sourcePlatformId = id;
    }
  }

  // Compute magnitude — amortized rate boost over the event window
  // total_engagement_rate_per_ms = sum of all generator rates (per-sec) / 1000
  const totalRatePerMs =
    rateEntries.reduce((sum, [, r]) => sum + r, 0) / 1000;
  const duration_ms = Math.floor(
    config.durationMsMin +
      random() * (config.durationMsMax - config.durationMsMin),
  );
  const boostFactor =
    config.magnitudeBoostMin +
    random() * (config.magnitudeBoostMax - config.magnitudeBoostMin);
  // During the viral: effective rate = normal_rate × boostFactor
  // Bonus = normal_rate × (boostFactor - 1) per ms
  const bonus_rate_per_ms = totalRatePerMs * (boostFactor - 1);
  const magnitude = bonus_rate_per_ms * duration_ms;

  return {
    source_generator_id: topGenId,
    source_platform_id: sourcePlatformId,
    start_time: now,
    duration_ms,
    magnitude,
    bonus_rate_per_ms,
  };
}

// ---------------------------------------------------------------------------
// Tick — the core state → state function
// ---------------------------------------------------------------------------

/**
 * Execute one game loop tick.
 *
 * NOTE(architect): The architecture spec declares
 *   `tick(state, deltaMs, staticData)` — but Algorithm shift advancement
 * requires an absolute `now` (shift_time is an epoch timestamp). This
 * signature extends the contract with `now` as a separate argument. Flag for
 * architect contract update.
 *
 * @param state      current game state
 * @param now        current epoch ms (for Algorithm shift advancement)
 * @param deltaMs    elapsed milliseconds since last tick
 * @param staticData balance data
 */
export function tick(
  state: GameState,
  now: number,
  deltaMs: number,
  staticData: StaticData,
): GameState {
  if (deltaMs < 0) {
    throw new Error(`tick: deltaMs must be ≥ 0, got ${deltaMs}`);
  }
  if (deltaMs === 0) {
    // No time elapsed — only advance algorithm against `now` in case a shift
    // boundary was crossed by other code paths.
    const algorithm = advanceAlgorithm(
      state.algorithm,
      state.player.algorithm_seed,
      now,
      staticData,
    );
    return algorithm === state.algorithm ? state : { ...state, algorithm };
  }

  // 1. Compute per-generator effective rates (per second).
  const ratesPerSec = computeAllGeneratorEffectiveRates(state, staticData);

  // 2. Convert to per-ms rates; sum total engagement earned in deltaMs.
  const ratesPerMs: Partial<Record<GeneratorId, number>> = {};
  let engagementEarned = 0;
  for (const id of Object.keys(ratesPerSec) as GeneratorId[]) {
    const perMs = (ratesPerSec[id] ?? 0) / 1000;
    ratesPerMs[id] = perMs;
    engagementEarned += perMs * deltaMs;
  }

  // 3. Add engagement to player.
  let player: Player = {
    ...state.player,
    engagement: state.player.engagement + engagementEarned,
  };

  // 4. Compute follower distribution for this tick.
  const distribution = computeFollowerDistribution(
    ratesPerMs,
    state.platforms,
    staticData,
  );

  // 5. Apply per-platform follower gains over deltaMs.
  let platforms = state.platforms;
  if (distribution.totalRate > 0) {
    const next: Record<PlatformId, PlatformState> = { ...state.platforms };
    for (const id of Object.keys(state.platforms) as PlatformId[]) {
      const gained = distribution.perPlatformRate[id] * deltaMs;
      if (gained > 0) {
        next[id] = {
          ...state.platforms[id],
          followers: state.platforms[id].followers + gained,
        };
      }
    }
    platforms = next;

    // 6. Sync derived totals on Player.
    const totalGained = distribution.totalRate * deltaMs;
    player = {
      ...player,
      total_followers: player.total_followers + totalGained,
      lifetime_followers: player.lifetime_followers + totalGained,
    };
  }

  // Keep derived total_followers consistent with platforms (defensive).
  player = syncTotalFollowers(player, platforms);

  // 7. Check platform unlocks using the freshly-synced total.
  platforms = checkPlatformUnlocks(platforms, player.total_followers, staticData);

  // 8. Check generator unlocks using the freshly-synced total.
  const generators = checkGeneratorUnlocks(
    state.generators,
    player.total_followers,
    staticData,
  );

  // 9. Advance algorithm shifts up to `now`.
  const algorithm = advanceAlgorithm(
    state.algorithm,
    player.algorithm_seed,
    now,
    staticData,
  );

  // 10. Advance active_ticks_since_last by 1 (active-play tick counter).
  let viralBurst: ViralBurstState = {
    ...state.viralBurst,
    active_ticks_since_last: state.viralBurst.active_ticks_since_last + 1,
  };

  // 11 / 12. Process active viral or evaluate trigger.
  if (viralBurst.active !== null) {
    if (now >= viralBurst.active.start_time + viralBurst.active.duration_ms) {
      // 11a. Viral expired — clear it.
      viralBurst = { ...viralBurst, active: null };
    } else {
      // 11b. Viral still running — apply bonus engagement on top of normal production.
      player = {
        ...player,
        engagement: player.engagement + viralBurst.active.bonus_rate_per_ms * deltaMs,
      };
    }
  } else {
    // 12. No active viral — evaluate trigger with the state assembled this tick.
    const triggerState: GameState = {
      player,
      generators,
      platforms,
      algorithm,
      viralBurst,
    };
    const event = evaluateViralTrigger(triggerState, staticData, now);
    if (event !== null) {
      viralBurst = { active_ticks_since_last: 0, active: event };
    }
  }

  return { player, generators, platforms, algorithm, viralBurst };
}

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

/**
 * Produce a SnapshotState from the current GameState. Aggregates the current
 * per-second engagement/follower rates and captures the algorithm index so
 * the offline calculator can walk the schedule from this point.
 *
 * Used by the driver when saving on close, and by the offline calculator on
 * the next open.
 */
export function computeSnapshot(
  state: GameState,
  staticData: StaticData,
): SnapshotState {
  const ratesPerSec = computeAllGeneratorEffectiveRates(state, staticData);
  let total_engagement_rate = 0;
  for (const id of Object.keys(ratesPerSec) as GeneratorId[]) {
    total_engagement_rate += ratesPerSec[id] ?? 0;
  }

  // Convert to per-ms, compute distribution, scale back to per-sec.
  const ratesPerMs: Partial<Record<GeneratorId, number>> = {};
  for (const id of Object.keys(ratesPerSec) as GeneratorId[]) {
    ratesPerMs[id] = (ratesPerSec[id] ?? 0) / 1000;
  }
  const distribution = computeFollowerDistribution(
    ratesPerMs,
    state.platforms,
    staticData,
  );

  // distribution rates are per-ms. Convert to per-sec for the snapshot.
  const platform_rates = Object.fromEntries(
    (Object.keys(state.platforms) as PlatformId[]).map((id) => [
      id,
      distribution.perPlatformRate[id] * 1000,
    ]),
  ) as Record<PlatformId, number>;

  const total_follower_rate = distribution.totalRate * 1000;

  return {
    total_engagement_rate,
    total_follower_rate,
    algorithm_state_index: state.algorithm.current_state_index,
    platform_rates,
  };
}

// ---------------------------------------------------------------------------
// Manual click — "Post" beat of the core loop
// ---------------------------------------------------------------------------

/**
 * Handle a manual click. Produces CLICK_BASE_ENGAGEMENT worth of engagement
 * modified by the current algorithm state (through selfies' trend_sensitivity)
 * and any clout_bonus.
 *
 * Does not produce followers directly — followers come from engagement flowing
 * through the tick pipeline.
 */
export function postClick(
  state: GameState,
  staticData: StaticData,
): GameState {
  const selfiesDef = staticData.generators[CLICK_GENERATOR_ID];
  const rawModifier = getAlgorithmModifier(state.algorithm, CLICK_GENERATOR_ID);
  const algoMod = effectiveAlgorithmModifier(
    rawModifier,
    selfiesDef.trend_sensitivity,
  );
  const clout = cloutBonus(state.player.clout_upgrades, staticData);

  const earned = CLICK_BASE_ENGAGEMENT * algoMod * clout;

  return {
    ...state,
    player: {
      ...state.player,
      engagement: state.player.engagement + earned,
    },
  };
}
