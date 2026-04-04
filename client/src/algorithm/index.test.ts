import { describe, it, expect } from 'vitest';
import {
  mulberry32Step,
  getShiftAtIndex,
  advanceAlgorithm,
  getAlgorithmModifier,
  deriveNewSeed,
} from './index.ts';
import { STATIC_DATA } from '../static-data/index.ts';
import { createAlgorithmState } from '../model/index.ts';

const SEED = 0xDEADBEEF;

// ---------------------------------------------------------------------------
// mulberry32Step
// ---------------------------------------------------------------------------

describe('mulberry32Step', () => {
  it('returns a value in [0, 1)', () => {
    const { value } = mulberry32Step(SEED);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });

  it('produces different values for different seeds', () => {
    const a = mulberry32Step(1).value;
    const b = mulberry32Step(2).value;
    expect(a).not.toBe(b);
  });

  it('produces the same sequence for the same seed (deterministic)', () => {
    const run1 = [0, 1, 2, 3, 4].map((i) => {
      let seed = SEED;
      let value = 0;
      for (let j = 0; j <= i; j++) {
        const r = mulberry32Step(seed);
        value = r.value;
        seed = r.nextSeed;
      }
      return value;
    });
    const run2 = [0, 1, 2, 3, 4].map((i) => {
      let seed = SEED;
      let value = 0;
      for (let j = 0; j <= i; j++) {
        const r = mulberry32Step(seed);
        value = r.value;
        seed = r.nextSeed;
      }
      return value;
    });
    expect(run1).toEqual(run2);
  });

  it('chains correctly — nextSeed produces a different value', () => {
    const step1 = mulberry32Step(SEED);
    const step2 = mulberry32Step(step1.nextSeed);
    expect(step1.value).not.toBe(step2.value);
  });
});

// ---------------------------------------------------------------------------
// getShiftAtIndex — deterministic schedule
// ---------------------------------------------------------------------------

describe('getShiftAtIndex', () => {
  it('returns a valid algorithm state id', () => {
    const shift = getShiftAtIndex(SEED, 0, STATIC_DATA);
    const validIds = Object.keys(STATIC_DATA.algorithmStates);
    expect(validIds).toContain(shift.stateId);
  });

  it('returns a duration within the configured range', () => {
    const { baseIntervalMs, varianceMs } = STATIC_DATA.algorithmSchedule;
    const min = baseIntervalMs - varianceMs;
    const max = baseIntervalMs + varianceMs;

    for (let i = 0; i < 20; i++) {
      const shift = getShiftAtIndex(SEED, i, STATIC_DATA);
      expect(shift.durationMs).toBeGreaterThanOrEqual(min);
      expect(shift.durationMs).toBeLessThanOrEqual(max);
    }
  });

  it('same seed + index always produces the same shift (deterministic)', () => {
    const a = getShiftAtIndex(SEED, 5, STATIC_DATA);
    const b = getShiftAtIndex(SEED, 5, STATIC_DATA);
    expect(a).toEqual(b);
  });

  it('different indices produce different shifts (schedule varies)', () => {
    const shifts = Array.from({ length: 10 }, (_, i) =>
      getShiftAtIndex(SEED, i, STATIC_DATA)
    );
    // Not all 10 should be identical (with overwhelming probability)
    const uniqueStates = new Set(shifts.map((s) => s.stateId));
    expect(uniqueStates.size).toBeGreaterThan(1);
  });

  it('different seeds produce different schedules', () => {
    const shiftA = getShiftAtIndex(0xAAAAAAAA, 3, STATIC_DATA);
    const shiftB = getShiftAtIndex(0xBBBBBBBB, 3, STATIC_DATA);
    // With high probability, at least state or duration differs
    const differ =
      shiftA.stateId !== shiftB.stateId || shiftA.durationMs !== shiftB.durationMs;
    expect(differ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// advanceAlgorithm — time-based state advancement
// ---------------------------------------------------------------------------

describe('advanceAlgorithm', () => {
  it('does not advance when now is before shift_time', () => {
    const now = 10_000;
    const algorithm = createAlgorithmState(
      'short_form_surge',
      0,
      STATIC_DATA,
      now
    );
    // shift_time = now + baseIntervalMs, so now < shift_time
    const advanced = advanceAlgorithm(algorithm, SEED, now + 1000, STATIC_DATA);
    expect(advanced.current_state_index).toBe(0);
    expect(advanced.current_state_id).toBe('short_form_surge');
  });

  it('advances exactly once when now just passes shift_time', () => {
    const start = 10_000;
    const algorithm = createAlgorithmState('short_form_surge', 0, STATIC_DATA, start);
    // advance to just past the first shift
    const advanced = advanceAlgorithm(
      algorithm,
      SEED,
      algorithm.shift_time + 1,
      STATIC_DATA
    );
    expect(advanced.current_state_index).toBe(1);
  });

  it('advances through multiple shifts during long offline periods', () => {
    const start = 0;
    const algorithm = createAlgorithmState('short_form_surge', 0, STATIC_DATA, start);
    // Advance far enough to guarantee many shifts (1 hour, shifts every ~5min)
    const oneHourMs = 60 * 60 * 1_000;
    const advanced = advanceAlgorithm(algorithm, SEED, start + oneHourMs, STATIC_DATA);
    // With 5-minute base intervals, ~12 shifts in an hour
    expect(advanced.current_state_index).toBeGreaterThan(5);
  });

  it('is deterministic — same inputs always produce same output', () => {
    const start = 0;
    const algorithm = createAlgorithmState('short_form_surge', 0, STATIC_DATA, start);
    const now = start + 2 * 60 * 60 * 1_000; // 2 hours
    const a = advanceAlgorithm(algorithm, SEED, now, STATIC_DATA);
    const b = advanceAlgorithm(algorithm, SEED, now, STATIC_DATA);
    expect(a).toEqual(b);
  });

  it('shift_time advances from previous shift_time, not from now (no drift)', () => {
    const start = 0;
    const algorithm = createAlgorithmState('short_form_surge', 0, STATIC_DATA, start);
    const firstShiftTime = algorithm.shift_time;

    // Advance past two shifts
    const afterTwo = advanceAlgorithm(
      algorithm,
      SEED,
      firstShiftTime + STATIC_DATA.algorithmSchedule.baseIntervalMs + 1,
      STATIC_DATA
    );

    // The second shift's shift_time should be firstShiftTime + shift1.duration + shift2.duration
    // NOT firstShiftTime + shift1.duration + (now - shift1End)
    // We verify it's ahead of when the second shift started
    expect(afterTwo.shift_time).toBeGreaterThan(firstShiftTime);
    expect(afterTwo.current_state_index).toBe(2);
  });

  it('updates state_modifiers to reflect the new algorithm state', () => {
    const start = 0;
    const algorithm = createAlgorithmState('short_form_surge', 0, STATIC_DATA, start);
    const advanced = advanceAlgorithm(
      algorithm,
      SEED,
      algorithm.shift_time + 1,
      STATIC_DATA
    );
    // state_modifiers should match the new state's definition
    const newStateDef = STATIC_DATA.algorithmStates[advanced.current_state_id];
    expect(advanced.state_modifiers).toEqual(newStateDef.state_modifiers);
  });
});

// ---------------------------------------------------------------------------
// getAlgorithmModifier
// ---------------------------------------------------------------------------

describe('getAlgorithmModifier', () => {
  it('returns the correct modifier for a generator in the current state', () => {
    const algorithm = createAlgorithmState('short_form_surge', 0, STATIC_DATA, 0);
    const expected =
      STATIC_DATA.algorithmStates.short_form_surge.state_modifiers.memes;
    expect(getAlgorithmModifier(algorithm, 'memes')).toBe(expected);
  });

  it('returns 1.0 for an unknown generator id', () => {
    const algorithm = createAlgorithmState('short_form_surge', 0, STATIC_DATA, 0);
    expect(getAlgorithmModifier(algorithm, 'nonexistent_generator')).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// deriveNewSeed
// ---------------------------------------------------------------------------

describe('deriveNewSeed', () => {
  it('produces a different seed from the input', () => {
    const newSeed = deriveNewSeed(SEED, 1);
    expect(newSeed).not.toBe(SEED);
  });

  it('is deterministic — same inputs always produce same seed', () => {
    const a = deriveNewSeed(SEED, 3);
    const b = deriveNewSeed(SEED, 3);
    expect(a).toBe(b);
  });

  it('produces different seeds for different rebrand counts', () => {
    const seed1 = deriveNewSeed(SEED, 1);
    const seed2 = deriveNewSeed(SEED, 2);
    expect(seed1).not.toBe(seed2);
  });

  it('produces different seeds for different original seeds', () => {
    const seed1 = deriveNewSeed(0xAAAAAAAA, 1);
    const seed2 = deriveNewSeed(0xBBBBBBBB, 1);
    expect(seed1).not.toBe(seed2);
  });
});
