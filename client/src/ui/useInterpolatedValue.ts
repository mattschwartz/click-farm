// useInterpolatedValue — RAF-based predictive interpolation for display values
// that update at game-loop tick cadence (100ms / 10Hz).
//
// Problem: a raw engagement counter jumps visibly 10×/sec and sits still
// between ticks. This hook smooths the display by predicting forward from the
// last known ground-truth value using the current rate, so the UI updates at
// ~60fps instead of 10fps. When the next real tick arrives, the display snaps
// to the true value. Because prediction uses the same rate as the game loop,
// snap-delta is within rounding error — imperceptible at 100ms intervals.
//
// Design decisions (from engagement-counter-interpolation proposal):
// 1. Standalone hook (not inlined in TopBar) — more testable and reusable.
// 2. `clamp` parameter prevents over-prediction when a rate spike resolves
//    within one tick. Enabled by default.

import { useEffect, useRef, useState } from 'react';
import { TICK_INTERVAL_MS } from '../driver/index.ts';

// ---------------------------------------------------------------------------
// Pure calculation — extracted for unit testability without React or RAF.
// ---------------------------------------------------------------------------

/**
 * Computes the predicted display value at `elapsedMs` milliseconds past the
 * last known ground-truth value.
 *
 * @param lastValue  - ground-truth value from the most recent game tick
 * @param ratePerSec - how fast the value is growing (engagement/sec)
 * @param elapsedMs  - wall-clock milliseconds elapsed since the last tick
 * @param clamp      - if true, caps elapsed at `maxMs` to prevent over-shoot
 * @param maxMs      - the tick interval used as the clamp ceiling
 */
export function interpolateValue(
  lastValue: number,
  ratePerSec: number,
  elapsedMs: number,
  clamp = true,
  maxMs: number = TICK_INTERVAL_MS,
): number {
  const effectiveMs = clamp ? Math.min(elapsedMs, maxMs) : elapsedMs;
  return lastValue + ratePerSec * (effectiveMs / 1000);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns a smoothly interpolated version of `value` that updates at ~60fps.
 *
 * @param value      - ground-truth value (from game tick)
 * @param ratePerSec - current growth rate per second
 * @param clamp      - whether to cap prediction at one tick interval
 */
export function useInterpolatedValue(
  value: number,
  ratePerSec: number,
  clamp = true,
): number {
  // Refs hold the most recent anchor — always current without re-triggering effects.
  const lastValue = useRef(value);
  const lastTime = useRef(performance.now());

  const [displayValue, setDisplayValue] = useState(value);

  // Update anchor when the ground-truth value changes (game tick boundary).
  useEffect(() => {
    lastValue.current = value;
    lastTime.current = performance.now();
  }, [value]);

  // Re-anchor time when rate changes so the interpolator doesn't over-predict
  // from a stale anchor using the new (higher/lower) rate. Without this,
  // a rate jump causes the prediction to leap ahead of the next ground-truth
  // tick, producing a visible twitch backward when the real value arrives.
  useEffect(() => {
    lastTime.current = performance.now();
  }, [ratePerSec]);

  // RAF loop — runs continuously while mounted, re-creates when rate changes.
  // Capturing ratePerSec and clamp in the closure is correct: the effect
  // re-runs (cancels + restarts) when either changes, so the closure is always
  // up-to-date. lastValue / lastTime are refs — always current.
  useEffect(() => {
    let handle: number;

    const frame = () => {
      const elapsedMs = performance.now() - lastTime.current;
      setDisplayValue(
        interpolateValue(lastValue.current, ratePerSec, elapsedMs, clamp),
      );
      handle = requestAnimationFrame(frame);
    };

    handle = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(handle);
  }, [ratePerSec, clamp]);

  return displayValue;
}
