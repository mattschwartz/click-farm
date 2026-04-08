// Offline gains modal — the "return" beat (UX §11).
// Generous, non-guilting. Numbers count up from zero over 800ms; the CTA
// is interactive throughout so impatient players can dismiss instantly.

import { useEffect, useState } from 'react';
import Decimal from 'decimal.js';
import type { OfflineResult } from '../offline/index.ts';
import { fmtCompact, fmtCompactInt, fmtDuration } from './format.ts';
import { PLATFORM_DISPLAY, PLATFORM_ORDER } from './display.ts';

interface Props {
  result: OfflineResult;
  onDismiss: () => void;
}

const COUNT_UP_MS = 800;
const FRAMES = 30;

export function OfflineGainsModal({ result, onDismiss }: Props) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const interval = window.setInterval(() => {
      frame++;
      setProgress(Math.min(1, frame / FRAMES));
      if (frame >= FRAMES) window.clearInterval(interval);
    }, COUNT_UP_MS / FRAMES);
    return () => window.clearInterval(interval);
  }, [result]);

  return (
    <div
      className="offline-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      <div className="offline-modal" role="dialog" aria-modal="true">
        <h2>Welcome back.</h2>
        <div className="away">You were away for {fmtDuration(result.durationMs)}.</div>

        <div className="gain-row">
          <span>Engagement earned</span>
          <span className="value">
            {fmtCompact(result.engagementGained.times(progress))}
          </span>
        </div>
        {PLATFORM_ORDER.map((id) => {
          const n = result.followersGained[id] ?? new Decimal(0);
          if (n.lte(0)) return null;
          return (
            <div key={id} className="gain-row">
              <span>{PLATFORM_DISPLAY[id].name} followers</span>
              <span className="value">+{fmtCompactInt(n.times(progress))}</span>
            </div>
          );
        })}

        <button className="dismiss-btn" onClick={onDismiss}>
          Nice.
        </button>
      </div>
    </div>
  );
}
