// Top bar — Click Farm title + Engagement counter.
// Per UX spec §2 and §5.
//
// Engagement counter is smoothed via RAF interpolation at ~60fps
// so it never batches between 100ms game ticks.

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fmtCompactInt } from './format.ts';
import { TieredNumber } from './TieredNumber.tsx';
import { useInterpolatedValue } from './useInterpolatedValue.ts';
import faviconSrc from '../assets/favicon.png';
import engagementIconSrc from '../assets/engagement-icon.png';

/** Detect touch-primary devices. */
const IS_TOUCH: boolean =
  typeof window !== 'undefined' &&
  window.matchMedia('(pointer: coarse)').matches;

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
 * Format the run badge text — displays the rebrand count.
 * Uses i18next plural resolution: passes `count` so i18next selects
 * the correct plural form for the active locale (e.g. Russian has
 * one/few/many/other).
 */
export function formatRunBadge(rebrandCount: number, t: (key: string, opts?: Record<string, unknown>) => string): string {
  return t('runBadge', { count: rebrandCount });
}

export function TopBar({
  engagement,
  engagementRate,
  totalFollowers,
  viralGold,
  summaryBadge,
  rebrandCount = 0,
}: Props) {
  const { t } = useTranslation('ui');
  const GAME_NAME = IS_TOUCH ? t('gameName.touch') : t('gameName.desktop');
  // Track follower decreases for a brief red flash (UX §5.2 of core spec).
  const [_decreased, setDecreased] = useState(false);
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
  const [_rateFlaring, setRateFlaring] = useState(false);
  const [_rateDelta, setRateDelta] = useState<number | null>(null);
  const [_rateDeltaDir, setRateDeltaDir] = useState<'positive' | 'negative'>(
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

  // Set the document/tab title to match ("Tap Farm" on touch devices).
  useEffect(() => {
    document.title = GAME_NAME;
  }, []);

  return (
    <header className="top-bar">
      <img src={faviconSrc} alt={GAME_NAME} className="top-bar-icon" />
      <div className="top-bar-title-group">
        <span className="top-bar-title">{GAME_NAME}</span>
        {badgeShown && (
          <span className="run-badge"><span className="run-badge-crown" aria-hidden>♛</span> {formatRunBadge(rebrandCount, t)}</span>
        )}
      </div>

      <div className="engagement-slot">
        <div className={`engagement-value${viralGold ? ' viral-gold' : ''}`}>
          <TieredNumber value={displayedEngagement} />
          <img src={engagementIconSrc} alt="" className="engagement-icon" aria-hidden="true" />
          {/* Inline rate + followers stack — hidden on desktop, shown in landscape. */}
          <span className="engagement-meta-stack">
            <span className="engagement-rate-inline">
              +<TieredNumber value={engagementRate} />/s
            </span>
            <span className="engagement-followers-inline">
              {fmtCompactInt(totalFollowers)} {t('topBar.followers')}
            </span>
          </span>
          <span className="engagement-tooltip">
            {t('topBar.engagement')}
            <span className="tooltip-rate">+<TieredNumber value={engagementRate} />/s</span>
          </span>
        </div>
        {summaryBadge && (
          <div className={`viral-summary-badge${summaryBadge.fading ? ' fading' : ''}`}>
            {t('topBar.viral', { magnitude: fmtCompactInt(summaryBadge.magnitude) })}
          </div>
        )}
      </div>

    </header>
  );
}
