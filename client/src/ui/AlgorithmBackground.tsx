// Ambient weather background layer for the Algorithm state.
// Per UX spec §4.2-§4.3: mood palette + motion drift + instability
// intensification in the final 20% of the shift interval.
//
// Renders two layers:
//   1. .algorithm-background — CSS-animated gradient drift (currently
//      neutralised to --surface-canvas on light mode; dark-mode retrofit
//      restores the painted gradient).
//   2. .algorithm-vignette — radial edge wash whose color and opacity are
//      bound to the current algorithm state via CSS tokens. Instability
//      scales opacity; viral burst overrides color.
//
// Architecture: visual-theming.md §Mood-Edge Binding Mechanism
// Proposal:     algorithm-mood-visibility.md

import { useEffect } from 'react';
import type { AlgorithmState } from '../types.ts';
import { ALGORITHM_MOOD } from './display.ts';

/** Fraction of the interval (trailing edge) at which instability engages. */
const INSTABILITY_FRACTION = 0.2;
/** Speed multiplier at t-0 (shift moment). UX §4.3 says x1.4. */
const INSTABILITY_SPEED_MAX = 1.4;

// ---------------------------------------------------------------------------
// Viral burst phase for the vignette override.
// Phase timing is owned by upstream state (GameScreen), not the vignette.
// ---------------------------------------------------------------------------

export interface ViralBurstOverride {
  /** Hex color — platform affinity accent. */
  color: string;
  /** Phase of the burst event. */
  phase: 'entering' | 'peak' | 'exiting';
}

interface Props {
  algorithm: AlgorithmState;
  now: number;
  /**
   * Approximate duration of the current algorithm interval, in ms. Derived
   * from the static algorithm schedule (base +/- variance). Used to compute
   * how close we are to the next shift.
   */
  intervalMs: number;
  /** When true, bumps background saturation +20% for viral burst Phase 1/2. */
  viralActive?: boolean;
  /** When set, the vignette overrides mood color with the burst color. */
  viralBurst?: ViralBurstOverride;
}

export function AlgorithmBackground({
  algorithm,
  now,
  intervalMs,
  viralActive,
  viralBurst,
}: Props) {
  const mood = ALGORITHM_MOOD[algorithm.current_state_id];

  // --- Data-attribute binding: drive CSS mood tokens ---
  // Per arch spec: AlgorithmBackground writes
  // document.documentElement.dataset.algorithmState so that :root[data-algorithm-state]
  // selectors in tokens.css resolve the correct --mood-color-edge / --mood-edge-opacity.
  useEffect(() => {
    document.documentElement.dataset.algorithmState =
      algorithm.current_state_id;
    return () => {
      delete document.documentElement.dataset.algorithmState;
    };
  }, [algorithm.current_state_id]);

  // Defensive: unknown state -> flat neutral background, no vignette.
  if (!mood) {
    return (
      <div
        className="algorithm-background"
        style={{ background: 'var(--surface-canvas, #FAF8F5)' }}
      />
    );
  }

  // --- Interval progress & instability ---
  const remaining = Math.max(0, algorithm.shift_time - now);
  const elapsed = Math.max(0, intervalMs - remaining);
  const progress = intervalMs > 0 ? Math.min(1, elapsed / intervalMs) : 0;

  const instabilityStart = 1 - INSTABILITY_FRACTION;
  const unstable = progress >= instabilityStart;
  const instabilityFactor = unstable
    ? (progress - instabilityStart) / INSTABILITY_FRACTION
    : 0;
  const speedMultiplier = 1 + (INSTABILITY_SPEED_MAX - 1) * instabilityFactor;
  const currentCycle = mood.cycleSeconds / speedMultiplier;

  const viralClass = viralActive ? ' viral-saturation' : '';

  // --- Vignette opacity ---
  // effectiveOpacity = baseOpacity * (1 + 0.2 * instabilityFactor)
  const baseOpacity = mood.moodEdgeOpacity;
  const effectiveOpacity = baseOpacity * (1 + 0.2 * instabilityFactor);

  // --- Vignette style ---
  // When a viral burst is active, override the gradient color with the
  // platform-affinity color via inline style (recommended path per arch spec).
  // Otherwise, let the CSS var(--mood-color-edge) drive the gradient.
  let vignetteStyle: React.CSSProperties;
  let vignetteTransition: string;

  if (viralBurst) {
    const burstColor = viralBurst.color;
    vignetteStyle = {
      background: `radial-gradient(ellipse 120% 100% at 50% 50%, transparent 40%, ${burstColor} 100%)`,
      opacity: effectiveOpacity,
    };
    // Phase-specific transition durations per spec:
    // entering: 300ms, peak: inherit (CSS default), exiting: 400ms
    if (viralBurst.phase === 'entering') {
      vignetteTransition = 'background 300ms ease-in-out, opacity 400ms ease-in-out';
    } else if (viralBurst.phase === 'exiting') {
      vignetteTransition = 'background 400ms ease-in-out, opacity 400ms ease-in-out';
    } else {
      vignetteTransition = 'background 400ms ease-in-out, opacity 400ms ease-in-out';
    }
    vignetteStyle.transition = vignetteTransition;
  } else {
    vignetteStyle = { opacity: effectiveOpacity };
  }

  return (
    <>
      <div
        className={`algorithm-background${unstable ? ' instability' : ''}${viralClass}`}
        style={
          {
            '--mood-cycle': `${currentCycle.toFixed(2)}s`,
          } as React.CSSProperties
        }
      />
      <div
        className={`algorithm-vignette${viralBurst?.phase === 'peak' ? ' vignette-pulse' : ''}`}
        style={vignetteStyle}
        aria-hidden="true"
      />
    </>
  );
}
