// ScandalModal — PR Response modal (UX spec from scandals-and-follower-loss.md §4).
//
// Shown when scandalStateMachine.state === 'scandal_active'.
//
// Layout:
//   - Timer bar draining across top of card
//   - Scandal name + flavor text (read beat: ~1-2s, slider inactive)
//   - Damage bar: max loss → projected loss → min loss
//   - Engagement spend slider (inactive during read beat)
//   - Follower balance + Confirm button
//
// The slider value is held in local React state. On confirm (or when the
// game loop auto-resolves on timer expiry), the spend amount is committed
// via driver.confirmPR(). The game loop applies damage on the next tick.

import { useEffect, useRef, useState } from 'react';
import type { ScandalUIState } from '../scandal/index.ts';
import { SCANDAL_DISPLAY, PLATFORM_DISPLAY } from './display.ts';
import { fmtCompactInt } from './format.ts';

interface Props {
  activeScandal: NonNullable<ScandalUIState['activeScandal']>;
  onConfirm: (engagementSpent: number) => void;
}

export function ScandalModal({ activeScandal, onConfirm }: Props) {
  const {
    type,
    targetPlatform,
    maxLoss,
    minLoss,
    engagementBalance,
    timerRemaining,
    timerDuration,
    sliderActive,
  } = activeScandal;

  const display = SCANDAL_DISPLAY[type];
  const platformDisplay = PLATFORM_DISPLAY[targetPlatform];

  // Local slider state — starts at 0 (no spend).
  const [spendAmount, setSpendAmount] = useState(0);
  const confirmedRef = useRef(false);

  // Reset slider when a new scandal fires (type or targetPlatform changes).
  useEffect(() => {
    setSpendAmount(0);
    confirmedRef.current = false;
  }, [type, targetPlatform]);

  // Projected loss at current slider position.
  const projectedLoss = computeProjectedLoss(
    maxLoss,
    minLoss,
    spendAmount,
    engagementBalance,
  );

  const timerFraction = timerDuration > 0 ? timerRemaining / timerDuration : 0;
  const timerUrgent = timerFraction < 0.25;

  const handleConfirm = () => {
    if (confirmedRef.current) return;
    confirmedRef.current = true;
    onConfirm(spendAmount);
  };

  return (
    <div className="scandal-overlay" aria-modal role="dialog" aria-label="PR Response">
      <div className="scandal-card">
        {/* Timer bar — drains left to right */}
        <div className="scandal-timer-track">
          <div
            className={`scandal-timer-bar${timerUrgent ? ' urgent' : ''}`}
            style={{ width: `${Math.max(0, timerFraction * 100).toFixed(1)}%` }}
          />
        </div>

        <div className="scandal-card-body">
          {/* Header */}
          <div className="scandal-header">
            <span className="scandal-name">{display.name}</span>
            <span className="scandal-platform">
              {platformDisplay.icon} {platformDisplay.name}
            </span>
          </div>

          {/* Flavor text — comedic read beat */}
          <p className="scandal-flavor">{display.flavorText}</p>

          {/* Damage visualization */}
          <div className="scandal-damage-section">
            <div className="scandal-damage-label">
              Projected loss: <strong>{fmtCompactInt(projectedLoss)}</strong> followers
            </div>
            <div className="scandal-damage-bar-track">
              {/* Max loss (red zone baseline) */}
              <div className="scandal-damage-max" />
              {/* Projected loss (shrinks with slider) */}
              <div
                className="scandal-damage-projected"
                style={{
                  width: maxLoss > 0
                    ? `${(projectedLoss / maxLoss * 100).toFixed(1)}%`
                    : '0%',
                }}
              />
            </div>
            <div className="scandal-damage-range">
              <span className="damage-min">min {fmtCompactInt(minLoss)}</span>
              <span className="damage-max">max {fmtCompactInt(maxLoss)}</span>
            </div>
          </div>

          {/* Engagement spend slider */}
          <div className={`scandal-spend-section${!sliderActive ? ' inactive' : ''}`}>
            <label className="scandal-spend-label">
              Spend Engagement on damage control
              {!sliderActive && (
                <span className="read-beat-hint"> (reading…)</span>
              )}
            </label>
            <input
              type="range"
              className="scandal-slider"
              min={0}
              max={engagementBalance}
              step={Math.max(1, Math.floor(engagementBalance / 100))}
              value={spendAmount}
              onChange={(e) => setSpendAmount(Number(e.target.value))}
              disabled={!sliderActive}
              aria-label="Engagement to spend on PR Response"
            />
            <div className="scandal-spend-row">
              <span className="spend-amount">{fmtCompactInt(spendAmount)} engagement</span>
              <span className="spend-balance">
                Balance: {fmtCompactInt(engagementBalance)}
              </span>
            </div>
          </div>

          {/* Confirm button */}
          <button
            className="scandal-confirm-btn"
            onClick={handleConfirm}
            disabled={!sliderActive}
          >
            {spendAmount > 0
              ? `Spend ${fmtCompactInt(spendAmount)} engagement`
              : 'Accept damage (no spend)'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resolution aftermath card
// ---------------------------------------------------------------------------

interface AftermathProps {
  resolution: NonNullable<ScandalUIState['lastResolution']>;
  onDismiss: () => void;
}

export function ScandalAftermathCard({ resolution, onDismiss }: AftermathProps) {
  const { type, platformAffected, followersLost, suppressedNotice } = resolution;
  const display = SCANDAL_DISPLAY[type];
  const platformDisplay = PLATFORM_DISPLAY[platformAffected];

  return (
    <div className="scandal-aftermath" role="alert">
      <div className="aftermath-header">
        <span className="aftermath-name">{display.name}</span>
        <span className="aftermath-platform">
          {platformDisplay.icon} {platformDisplay.name}
        </span>
      </div>
      <div className="aftermath-loss">
        −{fmtCompactInt(followersLost)} followers
      </div>
      {suppressedNotice && (
        <p className="aftermath-suppressed">{suppressedNotice}</p>
      )}
      <button className="aftermath-dismiss" onClick={onDismiss}>
        Understood
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute projected follower loss given the slider position.
 * Mirrors the mitigation calculation in computeScandalUIState.
 */
export function computeProjectedLoss(
  maxLoss: number,
  minLoss: number,
  spendAmount: number,
  engagementBalance: number,
): number {
  if (engagementBalance <= 0 || maxLoss <= 0) return maxLoss;
  // spendFraction: 0 → no mitigation (full loss), 1 → max mitigation (min loss)
  const spendFraction = Math.min(1, spendAmount / engagementBalance);
  return Math.round(maxLoss - spendFraction * (maxLoss - minLoss));
}
