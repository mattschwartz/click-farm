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
//
// All functions are pure. State in → new state out. No mutation.

import Decimal from 'decimal.js';
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
import {
  checkPlatformUnlocks,
  computeFollowerDistribution,
} from '../platform/index.ts';
import { checkGeneratorUnlocks } from '../generator/index.ts';
import { syncTotalFollowers, clampEngagement } from '../model/index.ts';
import { advanceNeglect, applyTickPosts } from '../audience-mood/index.ts';
import { verbGearMultiplier } from '../verb-gear/index.ts';

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
 * upgrade types (platform_headstart, generator_unlock) do not affect
 * engagement rate.
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

// ---------------------------------------------------------------------------
// Per-generator effective rate
// ---------------------------------------------------------------------------

/**
 * Computes effective engagement rate (engagement per second) for a single
 * generator's PASSIVE production, driven by autoclicker_count.
 *
 *   effective_rate = autoclicker_count × level × base_event_rate × base_event_yield
 *                    × (1 + count)^count_exponent × clout_bonus × kit_bonus
 *
 * Level-driven-cooldown refactor (task #132):
 *   - `autoclicker_count` drives passive production (was `count`)
 *   - `(1 + count)^count_exponent` is the yield multiplier from the BUY track
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
): Decimal {
  if (!generator.owned || generator.autoclicker_count <= 0) return new Decimal(0);
  const def = staticData.generators[generator.id];
  const clout = cloutBonus(state.player.clout_upgrades, staticData);
  const gear = verbGearMultiplier(generator.id, state.player.verb_gear, staticData);
  return new Decimal(generator.autoclicker_count)
    .times(generator.level)
    .times(def.base_event_rate)
    .times(def.base_event_yield)
    .times(Decimal.pow(1 + generator.count, def.count_exponent))
    .times(clout)
    .times(gear);
}

/**
 * Computes the effective engagement rate per second for every owned, active
 * generator. Returned map only contains entries for generators with rate > 0.
 */
export function computeAllGeneratorEffectiveRates(
  state: GameState,
  staticData: StaticData,
): Partial<Record<GeneratorId, Decimal>> {
  const rates: Partial<Record<GeneratorId, Decimal>> = {};
  for (const id of Object.keys(state.generators) as GeneratorId[]) {
    const rate = computeGeneratorEffectiveRate(
      state.generators[id],
      state,
      staticData,
    );
    if (rate.gt(0)) rates[id] = rate;
  }
  return rates;
}

// ---------------------------------------------------------------------------
// Viral burst trigger — exported for deterministic unit testing
// ---------------------------------------------------------------------------

/**
 * Evaluates whether a viral burst should fire this tick.
 *
 * Both gates must pass:
 *   Gate 1 — cooldown: enough active-play ticks since the last viral.
 *   Gate 2 — probability: random roll < p_viral.
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
  const { viralBurst, generators, platforms } = state;

  // Gate 1 — cooldown (hard floor, active-play ticks only)
  if (viralBurst.active_ticks_since_last < config.minCooldownTicks) {
    return null;
  }

  // Require at least one generator producing — no viral from empty content farm
  const rates = computeAllGeneratorEffectiveRates(state, staticData);
  const rateEntries = Object.entries(rates) as [GeneratorId, Decimal][];
  if (rateEntries.length === 0) return null;

  // Determine phase-based p_viral
  let p_viral: number;
  if (!generators.tutorials.owned) {
    p_viral = config.baseProbabilityEarly;
  } else if (!generators.mogging.owned) {
    p_viral = config.baseProbabilityMid;
  } else {
    p_viral = config.baseProbabilityLate;
  }

  // Gate 2 — probability roll
  if (random() >= p_viral) {
    return null;
  }

  // Find top generator for source selection
  let topGenId: GeneratorId = rateEntries[0][0];
  let topRate: Decimal = rateEntries[0][1];
  for (const [id, rate] of rateEntries) {
    if (rate.gt(topRate)) {
      topRate = rate;
      topGenId = id;
    }
  }

  // Select source platform — highest affinity for the top generator
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
  const totalRatePerMs = rateEntries
    .reduce((sum: Decimal, [, r]) => sum.plus(r), new Decimal(0))
    .div(1000);
  const duration_ms = Math.floor(
    config.durationMsMin +
      random() * (config.durationMsMax - config.durationMsMin),
  );
  const boostFactor =
    config.magnitudeBoostMin +
    random() * (config.magnitudeBoostMax - config.magnitudeBoostMin);
  // During the viral: effective rate = normal_rate × boostFactor
  // Bonus = normal_rate × (boostFactor - 1) per ms
  const bonus_rate_per_ms = totalRatePerMs.times(boostFactor - 1);
  const magnitude = bonus_rate_per_ms.times(duration_ms);

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
 * @param state      current game state
 * @param now        current epoch ms
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
    return state;
  }

  // 1. Compute per-generator effective rates (per second).
  const ratesPerSec = computeAllGeneratorEffectiveRates(state, staticData);

  // 2. Convert to per-ms Decimal rates; sum total engagement earned in deltaMs.
  const ratesPerMs: Partial<Record<GeneratorId, Decimal>> = {};
  let engagementEarned = new Decimal(0);
  for (const id of Object.keys(ratesPerSec) as GeneratorId[]) {
    const perMs = (ratesPerSec[id] ?? new Decimal(0)).div(1000);
    ratesPerMs[id] = perMs;
    engagementEarned = engagementEarned.plus(perMs.times(deltaMs));
  }

  // 3. Add engagement to player.
  let player: Player = {
    ...state.player,
    engagement: clampEngagement(state.player.engagement.plus(engagementEarned)),
    lifetime_engagement: clampEngagement(state.player.lifetime_engagement.plus(engagementEarned)),
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

  // 5. Apply per-platform follower gains over deltaMs.
  //    Audience Mood retention enters here — per-platform multiplier applied
  //    AFTER content-affinity distribution (platform-scoped, step 6 in the
  //    stacking-order chain declared in audience-mood/index.ts module header).
  let platforms = platformsWithMood;
  if (distribution.totalRate.gt(0)) {
    const next: Record<PlatformId, PlatformState> = { ...platformsWithMood };
    for (const id of Object.keys(platformsWithMood) as PlatformId[]) {
      const retention = platformsWithMood[id].retention;
      const gained = distribution.perPlatformRate[id]
        .times(retention)
        .times(deltaMs);
      if (gained.gt(0)) {
        next[id] = {
          ...platformsWithMood[id],
          followers: platformsWithMood[id].followers.plus(gained),
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
  if (player.total_followers.gt(oldTotal)) {
    player = {
      ...player,
      lifetime_followers:
        player.lifetime_followers.plus(player.total_followers.minus(oldTotal)),
    };
  }

  // 7. Check platform unlocks using the freshly-synced total.
  platforms = checkPlatformUnlocks(platforms, player.total_followers.toNumber(), staticData);

  // 8. Check generator unlocks using the freshly-synced total.
  const generators = checkGeneratorUnlocks(
    state.generators,
    player.total_followers.toNumber(),
    staticData,
  );

  // 9. Advance active_ticks_since_last by 1 (active-play tick counter).
  let viralBurst: ViralBurstState = {
    ...state.viralBurst,
    active_ticks_since_last: state.viralBurst.active_ticks_since_last + 1,
  };

  // 10 / 11. Process active viral or evaluate trigger.
  if (viralBurst.active !== null) {
    if (now >= viralBurst.active.start_time + viralBurst.active.duration_ms) {
      // 10a. Viral expired — clear it.
      viralBurst = { ...viralBurst, active: null };
    } else {
      // 10b. Viral still running — apply bonus engagement on top of normal production.
      player = {
        ...player,
        engagement: clampEngagement(player.engagement.plus(viralBurst.active.bonus_rate_per_ms.times(deltaMs))),
      };
    }
  } else {
    // 11. No active viral — evaluate trigger with the state assembled this tick.
    const triggerState: GameState = {
      player,
      generators,
      platforms,
      viralBurst,
    };
    const event = evaluateViralTrigger(triggerState, staticData, now);
    if (event !== null) {
      viralBurst = { active_ticks_since_last: 0, active: event };
    }
  }

  return { player, generators, platforms, viralBurst };
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
  const ZERO = new Decimal(0);
  const ratesPerSec = computeAllGeneratorEffectiveRates(state, staticData);
  let total_engagement_rate = ZERO;
  for (const id of Object.keys(ratesPerSec) as GeneratorId[]) {
    total_engagement_rate = total_engagement_rate.plus(ratesPerSec[id] ?? ZERO);
  }

  // Convert to per-ms, compute distribution, scale back to per-sec.
  const ratesPerMs: Partial<Record<GeneratorId, Decimal>> = {};
  for (const id of Object.keys(ratesPerSec) as GeneratorId[]) {
    ratesPerMs[id] = (ratesPerSec[id] ?? ZERO).div(1000);
  }
  const distribution = computeFollowerDistribution(
    ratesPerMs,
    state.platforms,
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
      distribution.perPlatformRate[id]
        .times(state.platforms[id].retention)
        .times(1000),
    ]),
  ) as Record<PlatformId, Decimal>;

  let total_follower_rate = ZERO;
  for (const id of Object.keys(state.platforms) as PlatformId[]) {
    total_follower_rate = total_follower_rate.plus(platform_rates[id]);
  }

  return {
    total_engagement_rate,
    total_follower_rate,
    platform_rates,
  };
}

// ---------------------------------------------------------------------------
// Manual click helpers — single source of truth for cooldown + yield formulas
// ---------------------------------------------------------------------------

/**
 * Cooldown in ms for a manual tap on a verb. Level drives speed.
 * Floor of 50ms prevents infinite-speed tapping at very high levels.
 *
 *   cooldown = max(50, 1000 / (level × base_event_rate))
 */
export function verbCooldownMs(
  level: number,
  baseEventRate: number,
): number {
  return Math.max(50, 1000 / (level * baseEventRate));
}

/**
 * Engagement earned from a single manual tap. BUY count drives yield.
 *
 *   earned = base_event_yield × (1 + count)^count_exponent × (1 + autoclicker_count) × clout × gear
 */
export function verbYieldPerTap(
  generator: GeneratorState,
  state: GameState,
  staticData: StaticData,
): Decimal {
  const def = staticData.generators[generator.id];
  const clout = cloutBonus(state.player.clout_upgrades, staticData);
  const gear = verbGearMultiplier(generator.id, state.player.verb_gear, staticData);
  return new Decimal(def.base_event_yield)
    .times(Decimal.pow(1 + generator.count, def.count_exponent))
    .times(1 + generator.autoclicker_count)
    .times(clout)
    .times(gear);
}

/**
 * Engagement per single autoclicker fire. Same formula as manual tap:
 *
 *   earned = base_event_yield × (1 + count)^count_exponent × (1 + autoclicker_count) × clout × gear
 */
export function verbYieldPerAutoTap(
  generator: GeneratorState,
  state: GameState,
  staticData: StaticData,
): Decimal {
  return verbYieldPerTap(generator, state, staticData);
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

  // Cooldown gate via extracted helper (single source of truth).
  const cooldown = verbCooldownMs(genState.level, def.base_event_rate);
  if (now - (state.player.last_manual_click_at[verbId] ?? 0) < cooldown) {
    return state;
  }

  const earned = verbYieldPerTap(genState, state, staticData);

  return {
    ...state,
    player: {
      ...state.player,
      engagement: clampEngagement(state.player.engagement.plus(earned)),
      lifetime_engagement: clampEngagement(state.player.lifetime_engagement.plus(earned)),
      has_started_run: true,
      last_manual_click_at: {
        ...state.player.last_manual_click_at,
        [verbId]: now,
      },
    },
  };
}
