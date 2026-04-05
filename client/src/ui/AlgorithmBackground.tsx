// Ambient weather background layer for the Algorithm state.
// Per UX spec §4.2–§4.3: mood palette + motion drift + instability
// intensification in the final 20% of the shift interval.
//
// This is an animated CSS gradient — a stand-in for a proper particle
// system. The visual grammar (mood direction, motion speed, instability
// scaling) is intact; follow-up is a ux-designer pass on particle fidelity.

import type { AlgorithmState } from '../types.ts';
import { ALGORITHM_MOOD } from './display.ts';

/** Fraction of the interval (trailing edge) at which instability engages. */
const INSTABILITY_FRACTION = 0.2;
/** Speed multiplier at t-0 (shift moment). UX §4.3 says ×1.4. */
const INSTABILITY_SPEED_MAX = 1.4;

interface Props {
  algorithm: AlgorithmState;
  now: number;
  /**
   * Approximate duration of the current algorithm interval, in ms. Derived
   * from the static algorithm schedule (base ± variance). Used to compute
   * how close we are to the next shift.
   */
  intervalMs: number;
}

export function AlgorithmBackground({ algorithm, now, intervalMs }: Props) {
  const mood = ALGORITHM_MOOD[algorithm.current_state_id];
  // Defensive: unknown state → flat neutral background.
  if (!mood) {
    return <div className="algorithm-background" style={{ background: '#0b0d12' }} />;
  }

  // Compute where we are in the interval. shift_time is when the NEXT shift
  // fires — so (shift_time - now) is the remaining time.
  const remaining = Math.max(0, algorithm.shift_time - now);
  const elapsed = Math.max(0, intervalMs - remaining);
  const progress = intervalMs > 0 ? Math.min(1, elapsed / intervalMs) : 0;

  // Instability intensifies over the final INSTABILITY_FRACTION of the
  // interval. Below that threshold, speed is baseline.
  const instabilityStart = 1 - INSTABILITY_FRACTION;
  const unstable = progress >= instabilityStart;
  const instabilityFactor = unstable
    ? (progress - instabilityStart) / INSTABILITY_FRACTION
    : 0;
  const speedMultiplier = 1 + (INSTABILITY_SPEED_MAX - 1) * instabilityFactor;
  const currentCycle = mood.cycleSeconds / speedMultiplier;

  return (
    <div
      className={`algorithm-background${unstable ? ' instability' : ''}`}
      style={
        {
          backgroundImage: mood.background,
          '--mood-cycle': `${currentCycle.toFixed(2)}s`,
        } as React.CSSProperties
      }
    />
  );
}
