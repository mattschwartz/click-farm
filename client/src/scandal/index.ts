// Scandal system module.
// Responsibility: risk accumulator lifecycle, scandal event firing and
// stacking suppression, PR Response state machine, magnitude calculation,
// session snapshot management, and risk level derivation for the UI.
//
// Architecture contract: scandal-system.md
// Design: proposals/accepted/scandals-and-follower-loss.md
//
// All functions are pure (state in → state out). No mutation. No I/O.

import type {
  GameState,
  GeneratorId,
  GeneratorState,
  PlatformId,
  PlatformState,
  RiskAccumulator,
  RiskLevel,
  ScandalEvent,
  ScandalSessionSnapshot,
  ScandalStateMachine,
  ScandalTypeId,
  StaticData,
} from '../types.ts';
import { mulberry32Step } from '../algorithm/index.ts';
import { getAlgorithmModifier } from '../algorithm/index.ts';

// ---------------------------------------------------------------------------
// Flavor text for suppressed scandal notifications.
// TODO(game-designer): review flavor text — provisional.
// ---------------------------------------------------------------------------

const SUPPRESSED_FLAVOR: Record<ScandalTypeId, string> = {
  content_burnout: '...and your audience noticed the repetitive content too',
  platform_neglect: '...and your followers on that platform noticed the silence',
  hot_take_backlash: '...and the hot take fallout was already building',
  trend_chasing: '...and your audience can tell you\'re pandering on top of it',
  growth_scrutiny: '...and people were already asking about your follower count',
  fact_check: '...and someone was already checking your sources',
};

// ---------------------------------------------------------------------------
// Fuzz derivation
// ---------------------------------------------------------------------------

/**
 * Derives a small fuzz offset for the given accumulator to prevent all
 * accumulators of the same type from firing in lockstep.
 *
 * Uses the run seed XOR-mixed with the accumulator index.
 * Returns a value in [0, 0.05 × effective_threshold].
 */
function getAccumulatorFuzz(
  runSeed: number,
  accumulatorIndex: number,
  effectiveThreshold: number,
): number {
  const mixed = (runSeed ^ (accumulatorIndex * 0x9E3779B9)) >>> 0;
  const { value } = mulberry32Step(mixed);
  return value * 0.05 * effectiveThreshold;
}

// ---------------------------------------------------------------------------
// Empire scale
// ---------------------------------------------------------------------------

/**
 * Returns the empire scale factor: a value in (0, 1] that decreases as the
 * player's follower count grows. Higher fame → lower thresholds → scandals
 * fire sooner.
 *
 *   empire_scale = 1 / (1 + total_followers / scaleConstant)
 *
 * Returns 1.0 below the minimum-followers-to-enable threshold so new accounts
 * are protected (empire_scale × Infinity = still never fires).
 */
export function empireScale(totalFollowers: number, staticData: StaticData): number {
  const { scaleConstant, minFollowersToEnable } = staticData.scandal.empireScaleCurve;
  if (totalFollowers < minFollowersToEnable) return 1.0; // not yet eligible
  return 1 / (1 + totalFollowers / scaleConstant);
}

/**
 * Returns the effective threshold for a given accumulator after empire scaling.
 * Returns Infinity when the player has not yet reached the minimum follower
 * count to enable the scandal system.
 */
export function computeEffectiveThreshold(
  acc: RiskAccumulator,
  totalFollowers: number,
  staticData: StaticData,
): number {
  const { minFollowersToEnable } = staticData.scandal.empireScaleCurve;
  if (totalFollowers < minFollowersToEnable) return Infinity;
  return acc.base_threshold * empireScale(totalFollowers, staticData);
}

// ---------------------------------------------------------------------------
// Risk level derivation
// ---------------------------------------------------------------------------

/**
 * Derives the coarse risk level for a single accumulator.
 *
 *   ratio = value / effective_threshold
 *   none:     ratio < building_threshold
 *   building: building_threshold ≤ ratio < high_threshold
 *   high:     ratio ≥ high_threshold
 */
export function computeRiskLevel(
  acc: RiskAccumulator,
  totalFollowers: number,
  staticData: StaticData,
): RiskLevel {
  const threshold = computeEffectiveThreshold(acc, totalFollowers, staticData);
  if (!isFinite(threshold) || threshold === 0) return 'none';
  const ratio = acc.value / threshold;
  const { building, high } = staticData.scandal.riskLevelThresholds;
  if (ratio >= high) return 'high';
  if (ratio >= building) return 'building';
  return 'none';
}

/**
 * Derives risk levels for all accumulators, keyed by "generator:{id}",
 * "platform:{id}", or "global". Multiple accumulators for the same key
 * (e.g. Content Burnout + Hot Take Backlash both scoped to hot_takes) are
 * merged by taking the higher of the two levels.
 */
export function computeAllRiskLevels(
  accumulators: RiskAccumulator[],
  totalFollowers: number,
  staticData: StaticData,
): Record<string, RiskLevel> {
  const LEVEL_ORDER: Record<RiskLevel, number> = { none: 0, building: 1, high: 2 };
  const result: Record<string, RiskLevel> = {};

  for (const acc of accumulators) {
    const key = acc.scope_type === 'global'
      ? 'global'
      : `${acc.scope_type}:${acc.scope_id}`;
    const level = computeRiskLevel(acc, totalFollowers, staticData);
    const existing = result[key];
    if (existing === undefined || LEVEL_ORDER[level] > LEVEL_ORDER[existing]) {
      result[key] = level;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Accumulator factory
// ---------------------------------------------------------------------------

/**
 * Creates a single accumulator for the given scandal type and scope.
 */
function makeAccumulator(
  scandalType: ScandalTypeId,
  scopeType: 'generator' | 'platform' | 'global',
  scopeId: string | null,
  staticData: StaticData,
): RiskAccumulator {
  return {
    scandal_type: scandalType,
    scope_type: scopeType,
    scope_id: scopeId,
    value: 0,
    base_threshold: staticData.scandal.types[scandalType].baseThreshold,
    frozen: false,
  };
}

/**
 * Creates the complete initial set of accumulators for the given game state.
 * Called at game start. Missing accumulators for not-yet-unlocked generators/
 * platforms are added by ensureAccumulators as they become available.
 */
export function createAccumulators(
  generators: Record<GeneratorId, GeneratorState>,
  platforms: Record<PlatformId, PlatformState>,
  staticData: StaticData,
): RiskAccumulator[] {
  const accs: RiskAccumulator[] = [];
  const types = staticData.scandal.types;

  for (const typeDef of Object.values(types)) {
    if (typeDef.scopeType === 'global') {
      accs.push(makeAccumulator(typeDef.id, 'global', null, staticData));
    } else if (typeDef.scopeType === 'generator') {
      for (const scopeId of typeDef.applicableScopes) {
        const gen = generators[scopeId as GeneratorId];
        if (gen?.owned) {
          accs.push(makeAccumulator(typeDef.id, 'generator', scopeId, staticData));
        }
      }
    } else if (typeDef.scopeType === 'platform') {
      for (const scopeId of typeDef.applicableScopes) {
        const platform = platforms[scopeId as PlatformId];
        if (platform?.unlocked) {
          accs.push(makeAccumulator(typeDef.id, 'platform', scopeId, staticData));
        }
      }
    }
  }

  return accs;
}

/**
 * Returns accumulators with any newly-needed ones added for generators that
 * are now owned or platforms that are now unlocked.
 *
 * Returns the same array reference when nothing changes to avoid unnecessary
 * re-renders.
 */
export function ensureAccumulators(
  accumulators: RiskAccumulator[],
  generators: Record<GeneratorId, GeneratorState>,
  platforms: Record<PlatformId, PlatformState>,
  staticData: StaticData,
): RiskAccumulator[] {
  const needed = createAccumulators(generators, platforms, staticData);
  const existing = new Set(
    accumulators.map((a) => `${a.scandal_type}:${a.scope_type}:${a.scope_id ?? 'global'}`),
  );

  let additions: RiskAccumulator[] = [];
  for (const acc of needed) {
    const key = `${acc.scandal_type}:${acc.scope_type}:${acc.scope_id ?? 'global'}`;
    if (!existing.has(key)) {
      additions.push(acc);
    }
  }

  return additions.length === 0 ? accumulators : [...accumulators, ...additions];
}

// ---------------------------------------------------------------------------
// Freeze / unfreeze
// ---------------------------------------------------------------------------

/** Set frozen = true on all accumulators. Called on save/close. */
export function freezeAccumulators(
  accumulators: RiskAccumulator[],
): RiskAccumulator[] {
  if (accumulators.every((a) => a.frozen)) return accumulators;
  return accumulators.map((a) => (a.frozen ? a : { ...a, frozen: true }));
}

/** Set frozen = false on all accumulators. Called on open/foreground. */
export function unfreezeAccumulators(
  accumulators: RiskAccumulator[],
): RiskAccumulator[] {
  if (accumulators.every((a) => !a.frozen)) return accumulators;
  return accumulators.map((a) => (a.frozen ? { ...a, frozen: false } : a));
}

// ---------------------------------------------------------------------------
// Accumulator update — tick-based (5 of 6 types)
// ---------------------------------------------------------------------------

/**
 * Computes the algorithm penalty factor for Hot Take Backlash.
 * The algorithm penalizes Hot Takes when its modifier < 1.0.
 * Penalty factor = 1 / modifier (so 0.5 modifier → 2.0 penalty).
 * Clamped to [1.0, 3.0] so a favorable algorithm doesn't suppress accrual.
 */
function hotTakePenaltyFactor(algorithm: GameState['algorithm']): number {
  const modifier = getAlgorithmModifier(algorithm, 'hot_takes');
  return Math.min(3.0, Math.max(1.0, 1 / modifier));
}

/**
 * Update a single accumulator based on tick data. Returns the updated
 * accumulator (same reference if no change).
 *
 * @param acc                    The accumulator to update
 * @param deltaMs                Tick duration
 * @param ratesPerMs             Per-generator rates (per-ms) this tick
 * @param totalRatePerMs         Sum of all generator rates (per-ms)
 * @param followersGained        Per-platform followers gained this tick
 * @param totalFollowersGained   Sum of followers gained across all platforms
 * @param totalFollowers         Current total followers (for empire scale)
 * @param algorithm              Current algorithm state
 * @param staticData             Balance data
 */
function updateSingleAccumulator(
  acc: RiskAccumulator,
  deltaMs: number,
  ratesPerMs: Partial<Record<GeneratorId, number>>,
  totalRatePerMs: number,
  followersGained: Partial<Record<PlatformId, number>>,
  totalFollowersGained: number,
  totalFollowers: number,
  algorithm: GameState['algorithm'],
  staticData: StaticData,
): RiskAccumulator {
  if (acc.frozen) return acc;

  const def = staticData.scandal.types[acc.scandal_type];
  const sd = staticData.scandal;
  let increment = 0;
  let newValue = acc.value;

  // Whether the empire has crossed the minimum threshold to enable the system.
  // Below the min, accumulators still exist but do not advance.
  if (totalFollowers < sd.empireScaleCurve.minFollowersToEnable) {
    return acc; // scandal system not yet active
  }

  switch (acc.scandal_type) {
    case 'content_burnout': {
      const genRate = ratesPerMs[acc.scope_id as GeneratorId] ?? 0;
      const share = totalRatePerMs > 0 ? genRate / totalRatePerMs : 0;
      const overShare = share - sd.triggerThresholds.contentBurnoutShare;
      if (overShare > 0) {
        increment = overShare * def.incrementRate * deltaMs;
        newValue = Math.min(1, acc.value + increment);
      } else {
        // Decay when balanced
        newValue = Math.max(0, acc.value - def.decayRate * deltaMs);
      }
      break;
    }

    case 'platform_neglect': {
      const gained = followersGained[acc.scope_id as PlatformId] ?? 0;
      if (gained > 0) {
        // Any post to this platform resets the accumulator.
        newValue = 0;
      } else {
        // Increment by elapsed time if the platform has followers to lose.
        // (A platform with no followers can't be "neglected" — nobody there to notice.)
        newValue = Math.min(1, acc.value + def.incrementRate * deltaMs);
      }
      break;
    }

    case 'hot_take_backlash': {
      const genRate = ratesPerMs['hot_takes'] ?? 0;
      const share = totalRatePerMs > 0 ? genRate / totalRatePerMs : 0;
      const penaltyFactor = hotTakePenaltyFactor(algorithm);
      if (share > 0) {
        increment = share * penaltyFactor * def.incrementRate * deltaMs;
        newValue = Math.min(1, acc.value + increment);
      } else {
        newValue = Math.max(0, acc.value - def.decayRate * deltaMs);
      }
      break;
    }

    case 'trend_chasing': {
      // Tick path: only decay. Trend Chasing is incremented on generator
      // purchase (see updateAccumulatorsOnPurchase), not here.
      newValue = Math.max(0, acc.value - def.decayRate * deltaMs);
      break;
    }

    case 'growth_scrutiny': {
      if (totalFollowersGained > 0) {
        const platformGained = followersGained[acc.scope_id as PlatformId] ?? 0;
        const share = platformGained / totalFollowersGained;
        const overShare = share - sd.triggerThresholds.growthScrutinyShare;
        if (overShare > 0) {
          increment = overShare * def.incrementRate * deltaMs;
          newValue = Math.min(1, acc.value + increment);
        } else {
          newValue = Math.max(0, acc.value - def.decayRate * deltaMs);
        }
      }
      break;
    }

    case 'fact_check': {
      const genRate = ratesPerMs[acc.scope_id as GeneratorId] ?? 0;
      const share = totalRatePerMs > 0 ? genRate / totalRatePerMs : 0;
      if (share > 0) {
        // Larger empires accumulate faster.
        const empireMagnifier = 1 + totalFollowers / sd.empireScaleCurve.scaleConstant;
        increment = share * empireMagnifier * def.incrementRate * deltaMs;
        newValue = Math.min(1, acc.value + increment);
      } else {
        newValue = Math.max(0, acc.value - def.decayRate * deltaMs);
      }
      break;
    }
  }

  if (newValue === acc.value) return acc;
  return { ...acc, value: newValue };
}

// ---------------------------------------------------------------------------
// Target platform selection
// ---------------------------------------------------------------------------

/**
 * Selects the target platform for a scandal event based on the accumulator
 * type and scope. See scandal-system.md §Target Platform Selection.
 */
export function selectTargetPlatform(
  acc: RiskAccumulator,
  platforms: Record<PlatformId, PlatformState>,
  staticData: StaticData,
): PlatformId {
  const unlockedIds = (Object.keys(platforms) as PlatformId[]).filter(
    (id) => platforms[id].unlocked,
  );

  if (acc.scope_type === 'platform') {
    // Per-platform accumulators: use the scoped platform directly.
    return acc.scope_id as PlatformId;
  }

  if (acc.scope_type === 'generator') {
    // Per-generator accumulators: highest content_affinity for this generator.
    const genId = acc.scope_id as GeneratorId;
    let best: PlatformId = unlockedIds[0] ?? 'chirper';
    let bestAffinity = 0;
    for (const id of unlockedIds) {
      const affinity = staticData.platforms[id].content_affinity[genId] ?? 0;
      if (affinity > bestAffinity) {
        bestAffinity = affinity;
        best = id;
      }
    }
    return best;
  }

  // Global: platform with the most followers.
  let best: PlatformId = unlockedIds[0] ?? 'chirper';
  let mostFollowers = -1;
  for (const id of unlockedIds) {
    if (platforms[id].followers > mostFollowers) {
      mostFollowers = platforms[id].followers;
      best = id;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Raw magnitude calculation
// ---------------------------------------------------------------------------

const RAW_MAGNITUDE_MIN = 0.05;
const RAW_MAGNITUDE_MAX = 0.15;

/**
 * Computes the raw magnitude (fraction of platform followers to remove) for
 * a scandal that just fired. Uses the accumulator value at fire time to scale
 * within the [0.05, 0.15] range.
 *
 *   raw = baseMagnitude × (1 + value_at_fire)
 *   clamped to [0.05, 0.15]
 */
export function computeRawMagnitude(
  acc: RiskAccumulator,
  staticData: StaticData,
): number {
  const def = staticData.scandal.types[acc.scandal_type];
  const raw = def.baseMagnitude * (1 + acc.value);
  return Math.max(RAW_MAGNITUDE_MIN, Math.min(RAW_MAGNITUDE_MAX, raw));
}

// ---------------------------------------------------------------------------
// Threshold check
// ---------------------------------------------------------------------------

interface FiredScandal {
  accumulator: RiskAccumulator;
  accumulatorIndex: number;
  targetPlatform: PlatformId;
  rawMagnitude: number;
}

/**
 * Checks all updated accumulators against their effective thresholds.
 * Returns the set of accumulators that fired (may be more than one if
 * multiple crossed simultaneously). The caller handles stacking suppression.
 */
function checkThresholds(
  accumulators: RiskAccumulator[],
  runSeed: number,
  totalFollowers: number,
  platforms: Record<PlatformId, PlatformState>,
  staticData: StaticData,
): FiredScandal[] {
  const fired: FiredScandal[] = [];

  for (let i = 0; i < accumulators.length; i++) {
    const acc = accumulators[i];
    if (acc.frozen) continue;

    const threshold = computeEffectiveThreshold(acc, totalFollowers, staticData);
    if (!isFinite(threshold)) continue;

    const fuzz = getAccumulatorFuzz(runSeed, i, threshold);
    if (acc.value > threshold + fuzz) {
      fired.push({
        accumulator: acc,
        accumulatorIndex: i,
        targetPlatform: selectTargetPlatform(acc, platforms, staticData),
        rawMagnitude: computeRawMagnitude(acc, staticData),
      });
    }
  }

  return fired;
}

// ---------------------------------------------------------------------------
// Accumulator update — public tick entry point
// ---------------------------------------------------------------------------

export interface TickAccumulatorResult {
  accumulators: RiskAccumulator[];
  /** Most severe fired scandal, or null if nothing fired. */
  firedScandal: ScandalEvent | null;
  /**
   * Flavor text for suppressed scandals (fired simultaneously but blocked
   * by stacking suppression). Appended to the ScandalStateMachine after
   * resolution of the primary.
   */
  suppressedNotification: string | null;
}

/**
 * Update all accumulators for one game loop tick, then check thresholds.
 *
 * Handles:
 * - All tick-driven scandal types (all except Trend Chasing)
 * - ensureAccumulators for newly unlocked generators/platforms
 * - Stacking suppression (most severe fires; rest suppressed + reset)
 *
 * @param accumulators    Current accumulator array
 * @param state           Game state at tick start (generators, platforms, algorithm)
 * @param deltaMs         Tick duration
 * @param ratesPerMs      Per-generator rates (per-ms) as computed in the tick
 * @param followersGained Per-platform followers gained this tick
 * @param now             Current epoch ms (for ScandalEvent timestamp)
 * @param staticData      Balance data
 * @param randomUUID      Injectable UUID factory for deterministic tests
 */
export function updateAccumulatorsOnTick(
  accumulators: RiskAccumulator[],
  state: GameState,
  deltaMs: number,
  ratesPerMs: Partial<Record<GeneratorId, number>>,
  followersGained: Partial<Record<PlatformId, number>>,
  now: number,
  staticData: StaticData,
  randomUUID: () => string = () => crypto.randomUUID(),
): TickAccumulatorResult {
  // Ensure accumulators exist for any newly-unlocked generators/platforms.
  let current = ensureAccumulators(
    accumulators,
    state.generators,
    state.platforms,
    staticData,
  );

  // Compute totals for share-based calculations.
  const totalRatePerMs = Object.values(ratesPerMs).reduce(
    (s, r) => s + (r ?? 0),
    0,
  );
  const totalFollowersGained = Object.values(followersGained).reduce(
    (s, f) => s + (f ?? 0),
    0,
  );

  // Update each accumulator.
  current = current.map((acc) =>
    updateSingleAccumulator(
      acc,
      deltaMs,
      ratesPerMs,
      totalRatePerMs,
      followersGained,
      totalFollowersGained,
      state.player.total_followers,
      state.algorithm,
      staticData,
    ),
  );

  // Check thresholds.
  const fired = checkThresholds(
    current,
    state.player.algorithm_seed,
    state.player.total_followers,
    state.platforms,
    staticData,
  );

  if (fired.length === 0) {
    return { accumulators: current, firedScandal: null, suppressedNotification: null };
  }

  // Stacking suppression: pick most severe (highest rawMagnitude), suppress rest.
  const sorted = [...fired].sort((a, b) => b.rawMagnitude - a.rawMagnitude);
  const primary = sorted[0];
  const suppressed = sorted.slice(1);

  // Reset all fired accumulators to 0.
  const indices = new Set(fired.map((f) => f.accumulatorIndex));
  current = current.map((acc, i) =>
    indices.has(i) ? { ...acc, value: 0 } : acc,
  );

  // Build the ScandalEvent for the primary.
  const firedScandal: ScandalEvent = {
    id: randomUUID(),
    scandal_type: primary.accumulator.scandal_type,
    target_platform: primary.targetPlatform,
    raw_magnitude: primary.rawMagnitude,
    final_magnitude: null,
    engagement_spent: 0,
    followers_lost: 0,
    timestamp: now,
    resolved: false,
  };

  // Collect suppressed notification text (most severe suppressed type).
  const suppressedNotification =
    suppressed.length > 0
      ? (SUPPRESSED_FLAVOR[suppressed[0].accumulator.scandal_type] ?? null)
      : null;

  return { accumulators: current, firedScandal, suppressedNotification };
}

// ---------------------------------------------------------------------------
// Accumulator update — purchase-driven (Trend Chasing only)
// ---------------------------------------------------------------------------

/**
 * Called by the driver after a generator is purchased or upgraded.
 * Updates the Trend Chasing accumulator based on how much the output
 * distribution shifted.
 *
 * @param accumulators  Current accumulators
 * @param prevState     Game state before the purchase
 * @param newState      Game state after the purchase
 * @param staticData    Balance data
 */
export function updateAccumulatorsOnPurchase(
  accumulators: RiskAccumulator[],
  prevState: GameState,
  newState: GameState,
  staticData: StaticData,
): RiskAccumulator[] {
  const trendAcc = accumulators.find(
    (a) => a.scandal_type === 'trend_chasing' && a.scope_type === 'global',
  );
  if (!trendAcc) return accumulators;
  if (trendAcc.frozen) return accumulators;

  // Compute output concentration before and after.
  // More concentrated output = more trend-chasing behaviour.
  // We measure shift as the change in dominant generator's share.
  function dominantShare(generators: GameState['generators']): number {
    const counts = Object.values(generators).map((g) => (g.owned ? g.count : 0));
    const total = counts.reduce((s, c) => s + c, 0);
    if (total === 0) return 0;
    const max = Math.max(...counts);
    return max / total;
  }

  const prevDominant = dominantShare(prevState.generators);
  const newDominant = dominantShare(newState.generators);
  const shift = Math.abs(newDominant - prevDominant);

  // Increment proportional to the mix shift.
  // A shift of 0.3 (30% change in dominant share) increments by ~0.15.
  const incrementAmount = shift * 0.5;
  if (incrementAmount === 0) return accumulators;

  const newValue = Math.min(1, trendAcc.value + incrementAmount);
  return accumulators.map((a) =>
    a === trendAcc ? { ...a, value: newValue } : a,
  );
}

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

/** Returns a default state machine (normal state, no active scandal). */
export function createDefaultStateMachine(staticData: StaticData): ScandalStateMachine {
  const pr = staticData.scandal.prResponse;
  return {
    state: 'normal',
    activeScandal: null,
    suppressedNotification: null,
    timerStartTime: null,
    timerDuration: pr.readBeatMs + pr.decisionWindowMs,
    readBeatDuration: pr.readBeatMs,
    pendingEngagementSpend: 0,
    lastResolution: null,
  };
}

/**
 * Transition the state machine when an accumulator fires.
 *
 * If state is 'normal': transitions to 'scandal_active' with the new event.
 * If state is already 'scandal_active' or 'resolving': suppresses the new
 * event (accumulator already reset to 0 by the caller; this records the
 * suppression text if not already set).
 */
export function onAccumulatorFire(
  sm: ScandalStateMachine,
  event: ScandalEvent,
  suppressedNotification: string | null,
  now: number,
): ScandalStateMachine {
  if (sm.state === 'normal') {
    return {
      ...sm,
      state: 'scandal_active',
      activeScandal: event,
      timerStartTime: now,
    };
  }
  // Already active — record suppressed notification if not already set.
  return suppressedNotification !== null && sm.suppressedNotification === null
    ? { ...sm, suppressedNotification }
    : sm;
}

/**
 * Transition the state machine to 'resolving' when the timer expires or the
 * player confirms. Sets the pending engagement spend.
 *
 * Called by the tick (auto-resolve on timer expiry) and by the driver
 * (player confirmation — task #31).
 */
export function onTimerExpire(sm: ScandalStateMachine): ScandalStateMachine {
  if (sm.state !== 'scandal_active') return sm;
  return { ...sm, state: 'resolving' };
}

/**
 * Player manually confirms the PR Response with a chosen engagement spend.
 * Sets pendingEngagementSpend and transitions to 'resolving'.
 * (Wired up by task #31.)
 */
export function onPlayerConfirm(
  sm: ScandalStateMachine,
  engagementSpent: number,
): ScandalStateMachine {
  if (sm.state !== 'scandal_active') return sm;
  return { ...sm, state: 'resolving', pendingEngagementSpend: engagementSpent };
}

// ---------------------------------------------------------------------------
// Scandal resolution
// ---------------------------------------------------------------------------

export interface ScandalResolutionResult {
  /** Final loss fraction after PR Response mitigation. */
  finalMagnitude: number;
  /** Actual followers removed per platform. */
  followersLost: Partial<Record<PlatformId, number>>;
  /** Updated scandal event with final values. */
  resolvedEvent: ScandalEvent;
}

/**
 * Compute the outcome of a scandal event after the PR Response window.
 *
 *   final_magnitude = raw_magnitude × (1 - mitigationRate)
 *   mitigationRate = (engagementSpent / maxCost) × maxMitigationRate
 *                    clamped to [0, maxMitigationRate]
 *
 * Magnitude floor: no scandal can push a platform below its session snapshot
 * value. This respects the "no negative offline events" design intent.
 *
 * @param scandal          The active ScandalEvent
 * @param engagementSpent  How much engagement the player committed
 * @param maxEngagement    Player's total engagement (used to compute maxCost)
 * @param snapshot         Follower counts at session start (magnitude floor)
 * @param platforms        Current platform states
 * @param staticData       Balance data
 */
export function resolveScandal(
  scandal: ScandalEvent,
  engagementSpent: number,
  maxEngagement: number,
  snapshot: ScandalSessionSnapshot | null,
  platforms: Record<PlatformId, PlatformState>,
  staticData: StaticData,
): ScandalResolutionResult {
  const { maxMitigationRate } = staticData.scandal.prResponse;

  // Max cost is set to the player's current engagement, capping the spend.
  // If player has 0 engagement, mitigation is also 0.
  const mitigationRate =
    maxEngagement > 0
      ? Math.min(maxMitigationRate, (engagementSpent / maxEngagement) * maxMitigationRate)
      : 0;

  const finalMagnitude = scandal.raw_magnitude * (1 - mitigationRate);

  const targetPlatform = scandal.target_platform;
  const platform = platforms[targetPlatform];
  if (!platform || !platform.unlocked) {
    return {
      finalMagnitude,
      followersLost: {},
      resolvedEvent: {
        ...scandal,
        final_magnitude: finalMagnitude,
        engagement_spent: engagementSpent,
        followers_lost: 0,
        resolved: true,
      },
    };
  }

  let rawFollowersLost = Math.floor(platform.followers * finalMagnitude);

  // Magnitude floor: cannot push below session snapshot.
  if (snapshot !== null) {
    const snapshotFollowers = snapshot.platform_followers[targetPlatform] ?? 0;
    const maxLoss = Math.max(0, platform.followers - snapshotFollowers);
    rawFollowersLost = Math.min(rawFollowersLost, maxLoss);
  }

  const followersLost: Partial<Record<PlatformId, number>> = {};
  if (rawFollowersLost > 0) {
    followersLost[targetPlatform] = rawFollowersLost;
  }

  return {
    finalMagnitude,
    followersLost,
    resolvedEvent: {
      ...scandal,
      final_magnitude: finalMagnitude,
      engagement_spent: engagementSpent,
      followers_lost: rawFollowersLost,
      resolved: true,
    },
  };
}

/**
 * Apply the resolution result to the current platforms, returning updated
 * platform states. Pure — does not mutate.
 */
export function applyFollowerLoss(
  platforms: Record<PlatformId, PlatformState>,
  followersLost: Partial<Record<PlatformId, number>>,
): Record<PlatformId, PlatformState> {
  let changed = false;
  const next = { ...platforms };

  for (const [platformIdStr, lost] of Object.entries(followersLost)) {
    const platformId = platformIdStr as PlatformId;
    if ((lost ?? 0) > 0) {
      next[platformId] = {
        ...next[platformId],
        followers: Math.max(0, next[platformId].followers - (lost ?? 0)),
      };
      changed = true;
    }
  }

  return changed ? next : platforms;
}

// ---------------------------------------------------------------------------
// Session snapshot
// ---------------------------------------------------------------------------

/**
 * Creates a fresh session snapshot from the current game state.
 * Called by the driver on app foreground/open.
 */
export function createScandalSessionSnapshot(
  state: GameState,
  now: number,
): ScandalSessionSnapshot {
  const platform_followers: Record<PlatformId, number> = {
    chirper: state.platforms.chirper.followers,
    instasham: state.platforms.instasham.followers,
    grindset: state.platforms.grindset.followers,
  };
  return { timestamp: now, platform_followers };
}

// ---------------------------------------------------------------------------
// UI state contract
// ---------------------------------------------------------------------------

export interface ScandalUIState {
  /** Risk indicator per key (generator:{id} | platform:{id} | global). */
  riskLevels: Record<string, RiskLevel>;

  /** Present when state is 'scandal_active'. */
  activeScandal: {
    type: ScandalTypeId;
    targetPlatform: PlatformId;
    /** Projected follower loss at current slider position (for task #31). */
    projectedLoss: number;
    maxLoss: number;
    minLoss: number;
    engagementBalance: number;
    timerRemaining: number;
    /** Total timer duration (ms) — needed to compute the drain fraction. */
    timerDuration: number;
    sliderActive: boolean;
  } | null;

  /** Set after resolution; cleared when the UI dismisses it. */
  lastResolution: {
    type: ScandalTypeId;
    platformAffected: PlatformId;
    followersLost: number;
    suppressedNotice: string | null;
  } | null;
}

/**
 * Derives the ScandalUIState from current game state.
 * Consumed by the UI layer — no side effects.
 */
export function computeScandalUIState(
  state: GameState,
  now: number,
  staticData: StaticData,
): ScandalUIState {
  const sm = state.scandalStateMachine;
  const riskLevels = computeAllRiskLevels(
    state.accumulators,
    state.player.total_followers,
    staticData,
  );

  let activeScandal: ScandalUIState['activeScandal'] = null;
  if (sm.state === 'scandal_active' && sm.activeScandal !== null) {
    const scandal = sm.activeScandal;
    const platform = state.platforms[scandal.target_platform];
    const currentFollowers = platform?.followers ?? 0;
    const maxLoss = Math.floor(currentFollowers * scandal.raw_magnitude);
    const minLoss = Math.floor(
      currentFollowers * scandal.raw_magnitude * (1 - staticData.scandal.prResponse.maxMitigationRate),
    );
    // projectedLoss at current pendingEngagementSpend (task #31 wires the slider).
    const mitigationRate =
      state.player.engagement > 0
        ? Math.min(
            staticData.scandal.prResponse.maxMitigationRate,
            (sm.pendingEngagementSpend / state.player.engagement) *
              staticData.scandal.prResponse.maxMitigationRate,
          )
        : 0;
    const projectedLoss = Math.floor(
      currentFollowers * scandal.raw_magnitude * (1 - mitigationRate),
    );

    const timerStartTime = sm.timerStartTime ?? now;
    const timerRemaining = Math.max(
      0,
      timerStartTime + sm.timerDuration - now,
    );
    const sliderActive =
      now >= timerStartTime + sm.readBeatDuration;

    activeScandal = {
      type: scandal.scandal_type,
      targetPlatform: scandal.target_platform,
      projectedLoss,
      maxLoss,
      minLoss,
      engagementBalance: state.player.engagement,
      timerRemaining,
      timerDuration: sm.timerDuration,
      sliderActive,
    };
  }

  const lastResolution = sm.lastResolution ?? null;
  return { riskLevels, activeScandal, lastResolution };
}
