// Algorithm module.
// Responsibility: seeded PRNG (Mulberry32), deterministic shift schedule
// generation, and time-based algorithm state advancement.
// See core-systems.md — "Seeded PRNG for Algorithm Shifts".

import type {
  AlgorithmState,
  AlgorithmStateId,
  StaticData,
} from '../types.ts';

// ---------------------------------------------------------------------------
// Mulberry32 PRNG
// A fast, good-quality 32-bit PRNG. Given the same seed, produces the same
// sequence every time. This is the property that makes offline calculation
// and debugging possible.
//
// Returns both the random value in [0, 1) and the next seed so callers can
// chain steps without re-seeding.
// ---------------------------------------------------------------------------

export interface PrngResult {
  /** Random float in [0, 1). */
  value: number;
  /** Seed to pass to the next mulberry32Step call. */
  nextSeed: number;
}

export function mulberry32Step(seed: number): PrngResult {
  const s = (seed + 0x6D2B79F5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return {
    value: ((t ^ (t >>> 14)) >>> 0) / 4294967296,
    nextSeed: s,
  };
}

// ---------------------------------------------------------------------------
// Shift schedule
//
// Each shift at index N consumes 2 PRNG values derived from the run seed:
//   step N*2     → which algorithm state
//   step N*2 + 1 → how long it lasts (base ± variance)
//
// Walking from the run seed each time is O(N) in the shift index, but shift
// indices realistically stay under ~2000 even for week-long offline sessions
// at 5-minute intervals. The simplicity is worth it.
// ---------------------------------------------------------------------------

export interface ScheduledShift {
  stateId: AlgorithmStateId;
  durationMs: number;
}

/**
 * Deterministically compute the algorithm state and duration for a given
 * shift index from the run's seed.
 */
export function getShiftAtIndex(
  runSeed: number,
  shiftIndex: number,
  staticData: StaticData
): ScheduledShift {
  // Walk the PRNG to position shiftIndex * 2
  let seed = runSeed;
  const steps = shiftIndex * 2;
  for (let i = 0; i < steps; i++) {
    seed = mulberry32Step(seed).nextSeed;
  }

  // Step 1: pick algorithm state
  const stateRng = mulberry32Step(seed);
  // Step 2: pick duration
  const durationRng = mulberry32Step(stateRng.nextSeed);

  const stateIds = Object.keys(staticData.algorithmStates) as AlgorithmStateId[];
  const stateId = stateIds[Math.floor(stateRng.value * stateIds.length)];

  const { baseIntervalMs, varianceMs } = staticData.algorithmSchedule;
  // Map duration value [0, 1) → [base - variance, base + variance)
  const durationMs = Math.round(
    baseIntervalMs + (durationRng.value * 2 - 1) * varianceMs
  );

  return { stateId, durationMs };
}

// ---------------------------------------------------------------------------
// State advancement
//
// Applies all algorithm shifts that would have occurred between the stored
// shift_time and `now`. Called by:
//   - The game loop tick (with a small deltaMs — usually 0 or 1 shifts)
//   - The offline calculator (potentially many shifts)
// ---------------------------------------------------------------------------

/**
 * Advance the algorithm state to account for all shifts that have occurred
 * up to `now`. Returns the updated AlgorithmState. Pure — does not mutate.
 */
export function advanceAlgorithm(
  algorithm: AlgorithmState,
  runSeed: number,
  now: number,
  staticData: StaticData
): AlgorithmState {
  let current = algorithm;

  // Each iteration handles one completed shift
  while (now >= current.shift_time) {
    const nextIndex = current.current_state_index + 1;
    const shift = getShiftAtIndex(runSeed, nextIndex, staticData);
    const def = staticData.algorithmStates[shift.stateId];

    current = {
      current_state_id: shift.stateId,
      current_state_index: nextIndex,
      // Next shift starts from the end of this one, not from `now`,
      // so that drift doesn't accumulate over long offline periods.
      shift_time: current.shift_time + shift.durationMs,
      state_modifiers: { ...def.state_modifiers },
    };
  }

  return current;
}

// ---------------------------------------------------------------------------
// Modifier query
//
// Convenience function for the game loop and generators to read the current
// modifier for a specific generator without digging into AlgorithmState.
// ---------------------------------------------------------------------------

/**
 * Returns the current algorithm modifier for the given generator ID.
 * Returns 1.0 (neutral) if the generator has no modifier in the current state.
 */
export function getAlgorithmModifier(
  algorithm: AlgorithmState,
  generatorId: string
): number {
  return (algorithm.state_modifiers as Record<string, number>)[generatorId] ?? 1.0;
}

// ---------------------------------------------------------------------------
// Seed derivation
//
// New seed on rebrand: derived from the old seed and rebrand count so that
// each run's algorithm schedule is different but still deterministic.
// ---------------------------------------------------------------------------

/**
 * Derive the algorithm seed for a new run after a rebrand.
 * Deterministic: same old seed + rebrand count always produces the same new seed.
 */
export function deriveNewSeed(oldSeed: number, rebrandCount: number): number {
  // Mix old seed with rebrand count using a step of the PRNG
  const mixed = (oldSeed ^ (rebrandCount * 0x9E3779B9)) >>> 0;
  return mulberry32Step(mixed).nextSeed;
}
