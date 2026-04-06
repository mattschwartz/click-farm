// Top bar — Algorithm state label + Engagement (P0) + Followers (P1).
// Per UX spec §2 and §5. The algorithm label plays a 1.2s slide-out /
// slide-in transition when current_state_index advances (§4.4).
//
// Per purchase-feedback-and-rate-visibility.md:
// - §2.1: Rate is promoted to P0 weight — 20px/500 with P1 contrast.
// - §3:   Engagement counter is smoothed via RAF interpolation at ~60fps
//         so it never batches between 100ms game ticks.
// - §5.1: Rate display flares (scale + color shift) when rate changes.
// - §5.2: Delta readout appears inline for 800ms on rate change.

import { useEffect, useRef, useState } from 'react';
import type { AlgorithmState } from '../types.ts';
import { ALGORITHM_MOOD } from './display.ts';
import { fmtCompact, fmtCompactInt, fmtRate } from './format.ts';
import { useInterpolatedValue } from './useInterpolatedValue.ts';

interface Props {
  algorithm: AlgorithmState;
  engagement: number;
  engagementRate: number;
  totalFollowers: number;
  /** When true, counter numerals crossfade to viral gold (UX §9.2 Phase 1). */
  viralGold?: boolean;
  /** Summary badge shown after burst ends: "VIRAL +N" (UX §9.2 Phase 3). */
  summaryBadge?: { magnitude: number; fading: boolean } | null;
  /** Rebrand count — drives RUN N badge appearance (UX §5, task #66). */
  rebrandCount?: number;
  /** Called when the gear icon is tapped. Opens Settings modal (§1). */
  onOpenSettings?: () => void;
}

type TransitionPhase = 'idle' | 'exiting' | 'entering';

// Minimum rate delta that triggers a flare — filters floating-point noise.
const RATE_FLARE_THRESHOLD = 0.005;

/**
 * Whether the RUN badge should be visible.
 * Shown after the first rebrand (rebrand_count >= 1). Task #66, UX §5.
 */
export function shouldShowRunBadge(rebrandCount: number): boolean {
  return rebrandCount > 0;
}

/**
 * Format the RUN badge text — displays the current run number (rebrand_count + 1).
 */
export function formatRunBadge(rebrandCount: number): string {
  return `RUN ${rebrandCount + 1}`;
}

export function TopBar({
  algorithm,
  engagement,
  engagementRate,
  totalFollowers,
  viralGold,
  summaryBadge,
  rebrandCount = 0,
  onOpenSettings: _onOpenSettings,
}: Props) {
  // Track algorithm state transitions — when current_state_index changes,
  // we slide the old label out and the new one in (UX §4.4, 1.2s total).
  const [displayedStateId, setDisplayedStateId] = useState(
    algorithm.current_state_id,
  );
  const [phase, setPhase] = useState<TransitionPhase>('idle');
  const prevIndex = useRef(algorithm.current_state_index);

  useEffect(() => {
    if (algorithm.current_state_index === prevIndex.current) return;
    prevIndex.current = algorithm.current_state_index;
    const newId = algorithm.current_state_id;
    setPhase('exiting');
    const t1 = window.setTimeout(() => {
      setDisplayedStateId(newId);
      setPhase('entering');
    }, 200);
    const t2 = window.setTimeout(() => {
      setPhase('idle');
    }, 600);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [algorithm.current_state_index, algorithm.current_state_id]);

  // Track follower decreases for a brief red flash (UX §5.2 of core spec).
  const [decreased, setDecreased] = useState(false);
  const prevFollowers = useRef(totalFollowers);
  useEffect(() => {
    if (totalFollowers < prevFollowers.current) {
      setDecreased(true);
      const t = window.setTimeout(() => setDecreased(false), 200);
      prevFollowers.current = totalFollowers;
      return () => window.clearTimeout(t);
    }
    prevFollowers.current = totalFollowers;
  }, [totalFollowers]);

  // Rate flare — fires when engagementRate changes meaningfully (§5.1).
  // Positive delta = success color (green-gold), negative = penalty (amber-red).
  const prevRate = useRef(engagementRate);
  const [rateFlaring, setRateFlaring] = useState(false);
  const [rateDelta, setRateDelta] = useState<number | null>(null);
  const [rateDeltaDir, setRateDeltaDir] = useState<'positive' | 'negative'>(
    'positive',
  );

  useEffect(() => {
    const delta = engagementRate - prevRate.current;
    if (Math.abs(delta) > RATE_FLARE_THRESHOLD) {
      prevRate.current = engagementRate;
      setRateDelta(delta);
      setRateDeltaDir(delta >= 0 ? 'positive' : 'negative');
      setRateFlaring(true);
      const t1 = window.setTimeout(() => setRateFlaring(false), 400);
      const t2 = window.setTimeout(() => setRateDelta(null), 800);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      };
    }
    prevRate.current = engagementRate;
  }, [engagementRate]);

  // Smooth the engagement counter at ~60fps via RAF interpolation (§3).
  const displayedEngagement = useInterpolatedValue(engagement, engagementRate);

  // RUN badge fade-in on first appearance (task #66, UX §5).
  const [badgeShown, setBadgeShown] = useState(shouldShowRunBadge(rebrandCount));
  useEffect(() => {
    if (shouldShowRunBadge(rebrandCount) && !badgeShown) {
      setBadgeShown(true);
    }
  }, [rebrandCount, badgeShown]);

  const mood = ALGORITHM_MOOD[displayedStateId];

  return (
    <header className="top-bar">
      <img src="/favicon.png" alt="Click Farm" className="top-bar-icon" />
      <div className="algo-label">
        <div className="name-slot">
          <span className={`name ${phase === 'exiting' ? 'exiting' : phase === 'entering' ? 'entering' : ''}`}>
            {mood?.name ?? displayedStateId}
          </span>
          {badgeShown && (
            <span className="run-badge">{formatRunBadge(rebrandCount)}</span>
          )}
        </div>
        <div className="tagline">{mood?.tagline ?? ''}</div>
      </div>

      <div className="engagement-slot">
        <div className={`engagement-value${viralGold ? ' viral-gold' : ''}`}>
          {fmtCompact(displayedEngagement)}
        </div>
        {summaryBadge && (
          <div className={`viral-summary-badge${summaryBadge.fading ? ' fading' : ''}`}>
            VIRAL +{fmtCompactInt(summaryBadge.magnitude)}
          </div>
        )}
        <div className={`engagement-rate${rateFlaring ? ` rate-flare-${rateDeltaDir}` : ''}`}>
          {fmtRate(engagementRate)}
          {rateDelta !== null && (
            <span className={`rate-delta rate-delta-${rateDeltaDir}`}>
              {rateDelta >= 0 ? '+' : ''}{fmtCompact(rateDelta)}/s
            </span>
          )}
        </div>
      </div>

      <div className="followers-slot">
        <div className="followers-label">followers</div>
        <div className={`followers-value${decreased ? ' decreased' : ''}`}>
          {fmtCompactInt(totalFollowers)}
        </div>
      </div>

    </header>
  );
}
