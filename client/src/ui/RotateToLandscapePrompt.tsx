// Rotate-to-landscape prompt for phones in portrait mode.
//
// Displays a fullscreen frosted-glass overlay when viewport is <=767px and
// orientation is portrait. The game renders behind it — verb button colors
// bleed through the translucent surface, giving the player a taste of what's
// there. Blocks all interaction. Game loop continues ticking.
//
// z-index sits above ALL modals (offline gains, shop, settings, ceremony)
// so the prompt is never buried behind a welcome-back modal on load.
//
// Per ux/mobile-layout.md §13, adapted to landscape-only strategy.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import faviconSrc from '../assets/favicon-sm.png';

/**
 * Detects if the current viewport matches mobile portrait (<=767px width,
 * portrait orientation).
 */
function isPhonePortrait(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 767px) and (orientation: portrait)').matches;
}

export function RotateToLandscapePrompt() {
  const { t } = useTranslation('ui');
  const [shouldShow, setShouldShow] = useState(isPhonePortrait);

  useEffect(() => {
    setShouldShow(isPhonePortrait());

    const mq = window.matchMedia('(max-width: 767px) and (orientation: portrait)');
    const handleChange = (e: MediaQueryListEvent) => {
      setShouldShow(e.matches);
    };

    if (mq.addEventListener) {
      mq.addEventListener('change', handleChange);
    } else {
      mq.addListener(handleChange);
    }

    return () => {
      if (mq.removeEventListener) {
        mq.removeEventListener('change', handleChange);
      } else {
        mq.removeListener(handleChange);
      }
    };
  }, []);

  if (!shouldShow) return null;

  const overlay = (
    <div
      className="rotate-to-landscape-overlay"
      role="alert"
      aria-label={t('rotate.heading')}
    >
      <div className="rotate-to-landscape-content">
        {/* Phone silhouette tilting from portrait -> landscape with a
            curved rotation arrow. Stroke-only for a clean, modern feel. */}
        <svg
          className="rotate-icon"
          viewBox="0 0 96 64"
          width="120"
          height="80"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Phone body — portrait rectangle, tilted 45deg toward landscape */}
          <g transform="rotate(-45 32 32)">
            <rect x="20" y="8" width="24" height="48" rx="4" />
            {/* Home indicator line */}
            <line x1="28" y1="50" x2="36" y2="50" strokeWidth="2" strokeLinecap="round" />
          </g>
          {/* Curved rotation arrow — clear of phone body */}
          <g transform="translate(-3 -5) rotate(-20 62 27)">
            <path d="M 62 6 A 24 24 0 0 1 67 42" />
            <polyline points="63,37 67,42 71,37" transform="rotate(23 67 42)" />
          </g>
        </svg>

        <h1 className="rotate-text">{t('rotate.heading')}</h1>
        <p className="rotate-subtext">{t('rotate.subtext')}</p>

        <img
          className="rotate-favicon"
          src={faviconSrc}
          alt={t('rotate.title')}
          draggable={false}
        />
        <p className="rotate-title">{t('rotate.title')}</p>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
