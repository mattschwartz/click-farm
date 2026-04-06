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
import { syncTotalFollowers, clampEngagement } from '../model/index.ts';
import {
  kitEngagementBonus,
  kitFollowerConversionBonus,
  kitViralBurstAmplifier,
} from '../creator-kit/index.ts';
import { advanceNeglect, applyTickPosts } from '../audience-mood/index.ts';

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
 *
 * Input is silently clamped to [1, 20] before Math.pow — this is belt-and-
 * braces for corrupted saves and any future code path that forgets the
 * max_level cap. Clamping is preferred over throwing here because this is
 * called from tick hot-paths and a throw would freeze the game loop.
 * NaN / ±Infinity fall back to 1 (no multiplier) rather than propagating.
 */
export function levelMultiplier(level: number): number {
  const safe = Number.isFinite(level) ? level : 1;
  const clamped = Math.min(20, Math.max(1, safe));
  return Math.pow(2, (clamped * clamped) / 5);
}

/**
 * Clout bonus multiplier applied to all engagement rates.
 *
 * Reads every `engagement_multiplier` clout-upgrade's per-level `values` array
 * and takes `values[level - 1]` as the cumulative multiplier at that level.
 * Multiple engagement-multiplier upgrades stack multiplicatively. Other
 * upgrade types (algorithm_insight, platform_headstart, generator_unlock) do
 * not affect engagement rate.
 *
 * Returns 1.0 (no bonus) if no engagement_multiplier upgrade is purchased.
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
      const value = def.effect.values[level - 1];
      if (value === undefined) {
        throw new Error(
          `cloutBonus: upgrade '${upgradeId}' has no values[${level - 1}] ` +
            `for level ${level} (max_level ${def.max_level})`,
        );
      }
      multiplier *= value;
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
 * generator's PASSIVE production, driven by autoclicker_count.
 *
 *   effective_rate = autoclicker_count × base_event_rate × base_event_yield
 *                    × (1 + count)
 *                    × effective_algorithm_modifier × clout_bonus × kit_bonus
 *
 * Level-driven-cooldown refactor (task #132):
 *   - `autoclicker_count` drives passive production (was `count`)
 *   - `(1 + count)` is the yield multiplier from the BUY track (was `levelMultiplier(level)`)
 *   - `level` now drives manual cooldown speed, not passive rate
 *
 * Returns 0 if the generator is not owned or autoclicker_count is 0.
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
  if (!generator.owned || generator.autoclicker_count <= 0) return 0;
  const def = staticData.generators[generator.id];
  const rawModifier = getAlgorithmModifier(state.algorithm, generator.id);
  const algoMod = effectiveAlgorithmModifier(rawModifier, def.trend_sensitivity);
  const clout = cloutBonus(state.player.clout_upgrades, staticData);
  // Kit effects fold in AFTER Clout per architecture/creator-kit.md §Stacking
  // Order (§3 clout → §4 kit). Camera is the only item in this chain today.
  const kit = kitEngagementBonus(state.player.creator_kit, staticData);
  return (
    generator.autoclicker_count *
    def.base_event_rate *
    def.base_event_yield *
    (1 + generator.count) *
    algoMod *
    clout *
    kit
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
  // Roll the raw boost factor, then apply Mogging's kit amplifier per
  // architecture/creator-kit.md §Integration Points §6. Level 0 → 1.0, no-op.
  const boostFactorRaw =
    config.magnitudeBoostMin +
    random() * (config.magnitudeBoostMax - config.magnitudeBoostMin);
  const kitAmplifier = kitViralBurstAmplifier(
    state.player.creator_kit,
    staticData,
  );
  const boostFactor = boostFactorRaw * kitAmplifier;
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
 * Execute one game loop tick. Pure state → state.
 *
 * Contract: core-systems.md §Interface Contracts → Game Loop Tick.
 * `now` is separate from `deltaMs` because Algorithm shift advancement is
 * driven by absolute epoch timestamps (`shift_time`), not elapsed deltas.
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
    engagement: clampEngagement(state.player.engagement + engagementEarned),
  };

  // 3a. Audience Mood pressure update (architect resolution 2026-04-05).
  //   A "post" is a per-tick contribution from one owned generator. Advance
  //   neglect for all unlocked platforms (tick delta, measured in ticks),
  //   then fire one post event per owned generator → its highest-affinity
  //   unlocked platform. This updates retention BEFORE follower
  //   distribution, so this tick's follower gain scales by this tick's mood.
  //   Offline catchup MUST NOT call advanceNeglect — the offline path in
  //   offline/index.ts applies retention as a constant scalar instead.
  const deltaTicks = deltaMs / 100; // tick cadence = 100 ms
  let moodState: GameState = advanceNeglect(state, staticData, deltaTicks);
  moodState = applyTickPosts(moodState, staticData);
  const platformsWithMood = moodState.platforms;

  // 4. Compute follower distribution for this tick.
  const distribution = computeFollowerDistribution(
    ratesPerMs,
    platformsWithMood,
    staticData,
  );

  // 4a. Wardrobe — kit follower_conversion_multiplier wraps the entire
  // per-platform follower sum (architecture/creator-kit.md §Integration
  // Points §3). Applied after computeFollowerDistribution so the platform
  // module stays decoupled from kit state.
  const kitFollowerMult = kitFollowerConversionBonus(
    state.player.creator_kit,
    staticData,
  );

  // 5. Apply per-platform follower gains over deltaMs.
  //    Audience Mood retention enters here — per-platform multiplier applied
  //    AFTER content-affinity distribution and kit follower-conversion
  //    (platform-scoped, step 6 in the stacking-order chain declared in
  //    audience-mood/index.ts module header).
  let platforms = platformsWithMood;
  if (distribution.totalRate > 0) {
    const next: Record<PlatformId, PlatformState> = { ...platformsWithMood };
    for (const id of Object.keys(platformsWithMood) as PlatformId[]) {
      const retention = platformsWithMood[id].retention;
      const gained =
        distribution.perPlatformRate[id] * kitFollowerMult * retention * deltaMs;
      if (gained > 0) {
        next[id] = {
          ...platformsWithMood[id],
          followers: platformsWithMood[id].followers + gained,
        };
      }
    }
    platforms = next;
  }

  // 6. Sync derived total_followers, then accumulate lifetime_followers as the
  //    delta of the platform-sum. Deriving lifetime from the platform-sum
  //    delta (rather than from a parallel running accumulator) keeps the
  //    invariant `lifetime_followers ≥ Σ platform.followers` tight to
  //    float precision — parallel accumulators diverge by ULPs over long
  //    runs (Σ_t Σ_p vs Σ_p Σ_t under non-associative float add).
  const oldTotal = player.total_followers;
  player = syncTotalFollowers(player, platforms);
  if (player.total_followers > oldTotal) {
    player = {
      ...player,
      lifetime_followers:
        player.lifetime_followers + (player.total_followers - oldTotal),
    };
  }

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
        engagement: clampEngagement(player.engagement + viralBurst.active.bonus_rate_per_ms * deltaMs),
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

  // Wardrobe multiplies the entire per-platform distribution (see tick).
  const kitFollowerMult = kitFollowerConversionBonus(
    state.player.creator_kit,
    staticData,
  );

  // distribution rates are per-ms. Convert to per-sec for the snapshot.
  // Audience Mood retention folded in per-platform — retention does NOT
  // advance offline (architecture/audience-mood.md §Integration — Offline),
  // so baking it into the snapshot as a constant scalar gives the offline
  // calculator the right multiplier for the entire window.
  const platform_rates = Object.fromEntries(
    (Object.keys(state.platforms) as PlatformId[]).map((id) => [
      id,
      distribution.perPlatformRate[id] *
        kitFollowerMult *
        state.platforms[id].retention *
        1000,
    ]),
  ) as Record<PlatformId, number>;

  let total_follower_rate = 0;
  for (const id of Object.keys(state.platforms) as PlatformId[]) {
    total_follower_rate += platform_rates[id];
  }

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
 * Handle a manual click on the given verb (generator).
 *
 * Level-driven-cooldown refactor (task #132):
 *   - Cooldown: `Math.max(50, 1000 / (level × base_event_rate))`
 *     Level drives speed — higher level = faster taps.
 *   - Earned: `base_event_yield × (1 + count) × algoMod × clout × kit`
 *     BUY count drives yield multiplier (was levelMultiplier).
 *
 * Returns state unchanged (silent no-op) when:
 *   - The generator is not manual_clickable
 *   - The cooldown gate rejects (tap too soon)
 *
 * Does not produce followers directly — followers come from engagement flowing
 * through the tick pipeline.
 *
 * @param now Injectable clock, defaults to Date.now(). Used for cooldown gate.
 */
export function postClick(
  state: GameState,
  staticData: StaticData,
  verbId: GeneratorId,
  now: number = Date.now(),
): GameState {
  const def = staticData.generators[verbId];

  // Gate A: reject non-manual generators (silent no-op).
  if (!def.manual_clickable) return state;

  const genState = state.generators[verbId];

  // Gate B: reject unowned generators (verb not yet Unlocked).
  if (!genState.owned) return state;

  // Cooldown gate: level drives tap speed. Floor of 50ms prevents
  // infinite-speed tapping at very high levels.
  const cooldownMs =
    Math.max(50, 1000 / (genState.level * def.base_event_rate));
  if (now - (state.player.last_manual_click_at[verbId] ?? 0) < cooldownMs) {
    return state;
  }

  const rawModifier = getAlgorithmModifier(state.algorithm, verbId);
  const algoMod = effectiveAlgorithmModifier(
    rawModifier,
    def.trend_sensitivity,
  );
  const clout = cloutBonus(state.player.clout_upgrades, staticData);
  const kit = kitEngagementBonus(state.player.creator_kit, staticData);

  // BUY count drives yield: (1 + count) so even at count=0 the player
  // earns base yield from manual taps.
  const earned = def.base_event_yield * (1 + genState.count) *
    algoMod * clout * kit;

  return {
    ...state,
    player: {
      ...state.player,
      engagement: clampEngagement(state.player.engagement + earned),
      last_manual_click_at: {
        ...state.player.last_manual_click_at,
        [verbId]: now,
      },
    },
  };
}
