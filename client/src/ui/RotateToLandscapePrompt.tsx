// Rotate-to-landscape prompt for phones in portrait mode.
//
// Displays a fullscreen overlay when viewport is ≤767px and orientation is
// portrait. Blocks interaction with the game beneath. Game loop continues
// ticking. Overlay disappears when device rotates to landscape.
//
// Per ux/mobile-layout.md §13, adapted to landscape-only strategy.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Detects if the current viewport matches mobile portrait (≤767px width,
 * portrait orientation). Called at render time and via orientation change
 * listener.
 */
function isPhonePortrait(): boolean {
  if (typeof window === 'undefined') return false;
  // Check if media query matches: small viewport AND portrait
  return window.matchMedia('(max-width: 767px) and (orientation: portrait)').matches;
}

export function RotateToLandscapePrompt() {
  const [shouldShow, setShouldShow] = useState(isPhonePortrait);

  useEffect(() => {
    // Update state immediately if already in portrait
    setShouldShow(isPhonePortrait());

    // Listen for orientation/resize changes
    const mq = window.matchMedia('(max-width: 767px) and (orientation: portrait)');
    const handleChange = (e: MediaQueryListEvent) => {
      setShouldShow(e.matches);
    };

    // Modern browsers use addEventListener, fallback to addListener
    if (mq.addEventListener) {
      mq.addEventListener('change', handleChange);
    } else {
      // Deprecated but needed for older iOS Safari
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
      aria-label="Rotate device to landscape"
    >
      <div className="rotate-to-landscape-content">
        {/* Rotate icon — svg based on Material Design rotate_right */}
        <svg
          className="rotate-icon"
          viewBox="0 0 24 24"
          width="80"
          height="80"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Circular arrow forming a rotation symbol */}
          <path d="M 3 8 Q 3 4 7 4 L 10 4" />
          <path d="M 10 1 L 10 7 L 4 7" />
          <path d="M 21 11 A 8 8 0 0 0 7 9" />
        </svg>

        {/* Text prompt */}
        <h1 className="rotate-text">Rotate to landscape</h1>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
