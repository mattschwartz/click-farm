// Top bar — Engagement (P0) + Followers (P1).
// Per UX spec §2 and §5.
//
// Per purchase-feedback-and-rate-visibility.md:
// - §2.1: Rate is promoted to P0 weight — 20px/500 with P1 contrast.
// - §3:   Engagement counter is smoothed via RAF interpolation at ~60fps
//         so it never batches between 100ms game ticks.
// - §5.1: Rate display flares (scale + color shift) when rate changes.
// - §5.2: Delta readout appears inline for 800ms on rate change.

import { useEffect, useRef, useState } from 'react';
import { fmtCompactInt } from './format.ts';
import { TieredNumber } from './TieredNumber.tsx';
import { useInterpolatedValue } from './useInterpolatedValue.ts';
import faviconSrc from '../assets/favicon.png';
import engagementIconSrc from '../assets/engagement-icon.png';

interface Props {
  engagement: number;
  engagementRate: number;
  totalFollowers: number;
  /** When true, counter numerals crossfade to viral gold (UX §9.2 Phase 1). */
  viralGold?: boolean;
  /** Summary badge shown after burst ends: "VIRAL +N" (UX §9.2 Phase 3). */
  summaryBadge?: { magnitude: number; fading: boolean } | null;
  /** Rebrand count — drives RUN N badge appearance (UX §5, task #66). */
  rebrandCount?: number;
}

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
  engagement,
  engagementRate,
  totalFollowers,
  viralGold,
  summaryBadge,
  rebrandCount = 0,
}: Props) {
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

  return (
    <header className="top-bar">
      <img src={faviconSrc} alt="Click Farm" className="top-bar-icon" />
      <div className="top-bar-title-group">
        <span className="top-bar-title">Click Farm</span>
        {badgeShown && (
          <span className="run-badge">{formatRunBadge(rebrandCount)}</span>
        )}
      </div>

      <div className="engagement-slot">
        <div className={`engagement-value${viralGold ? ' viral-gold' : ''}`}>
          <TieredNumber value={displayedEngagement} />
          <img src={engagementIconSrc} alt="" className="engagement-icon" aria-hidden="true" />
        </div>
        {summaryBadge && (
          <div className={`viral-summary-badge${summaryBadge.fading ? ' fading' : ''}`}>
            VIRAL +{fmtCompactInt(summaryBadge.magnitude)}
          </div>
        )}
      </div>

    </header>
  );
}
