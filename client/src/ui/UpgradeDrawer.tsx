// Upgrade Curve Drawer — UX spec: ux/upgrade-curve-drawer-spec.md
//
// Slides out from the right edge of a generator row, overlapping the platform
// column. Shows current level + 3 forward preview levels with costs and
// multipliers. Only the next level is actionable; +2 and +3 are preview only.
//
// Positioning: fixed to the viewport. anchorTop is the row's getBoundingClientRect().top,
// clamped so the drawer stays in-screen. Always right-aligned with a 16px margin.
//
// Backdrop: a full-screen transparent overlay handles outside-tap dismiss.
// Escape key also closes the drawer.

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GeneratorId, GeneratorState } from '../types.ts';
import type { StaticData } from '../types.ts';
import { generatorUpgradeCost } from '../generator/index.ts';
import { verbCooldownMs } from '../game-loop/index.ts';
import type { GeneratorDisplay } from './display.ts';
import { fmtCompact } from './format.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UpgradeDrawerProps {
  id: GeneratorId;
  generatorState: GeneratorState;
  display: GeneratorDisplay;
  staticData: StaticData;
  engagement: number;
  /** Viewport top of the triggering row (from getBoundingClientRect). */
  anchorTop: number;
  onUpgrade: () => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const DRAWER_HEIGHT = 280;
const DRAWER_CLOSE_DELAY_MS = 150;

export function UpgradeDrawer({
  id,
  generatorState,
  display,
  staticData,
  engagement,
  anchorTop,
  onUpgrade,
  onClose,
}: UpgradeDrawerProps) {
  // Closing animation state.
  const [closing, setClosing] = useState(false);

  // Clamp vertical position so the drawer never overflows the viewport.
  const clampedTop = Math.max(
    16,
    Math.min(anchorTop, window.innerHeight - DRAWER_HEIGHT - 16),
  );

  const triggerClose = useCallback(() => {
    setClosing(true);
    window.setTimeout(onClose, DRAWER_CLOSE_DELAY_MS);
  }, [onClose]);

  // Dismiss on Escape key. Registered once per open (dep: triggerClose).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') triggerClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [triggerClose]);

  // Focus the primary action button on open.
  const primaryBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    primaryBtnRef.current?.focus();
  }, []);

  const currentLevel = generatorState.level;
  const def = staticData.generators[id];
  const atMax = currentLevel >= def.max_level;

  // Level drives cooldown speed (task #132). Single source of truth: verbCooldownMs.
  const currentCooldown = verbCooldownMs(currentLevel, def.base_event_rate);

  // Compute next 3 levels. When the generator is at max_level, the preview
  // rows have nothing meaningful to show — clamp them off.
  const levels = atMax
    ? []
    : [1, 2, 3]
        .filter((offset) => currentLevel + offset <= def.max_level)
        .map((offset) => {
          const level = currentLevel + offset;
          const cooldown = verbCooldownMs(level, def.base_event_rate);
          const cost = generatorUpgradeCost(id, level - 1, staticData);
          return { level, cooldown, cost };
        });

  const nextLevel = levels[0];
  const canAfford = !atMax && nextLevel !== undefined && engagement >= nextLevel.cost;
  const shortfall = atMax || nextLevel === undefined ? 0 : nextLevel.cost - engagement;

  // Button shake animation when insufficient engagement is tapped.
  const [shaking, setShaking] = useState(false);

  function handleUpgradeClick() {
    if (atMax || nextLevel === undefined) {
      // Purchasing at cap is impossible — no-op (button should be disabled
      // but defensive guard prevents driver throws if the state races).
      return;
    }
    if (!canAfford) {
      setShaking(true);
      window.setTimeout(() => setShaking(false), 220);
      return;
    }

    // Decide close behavior BEFORE calling onUpgrade — we compute post-upgrade
    // state from current props, since by the time the setTimeout fires the
    // drawer will already have re-rendered against new props.
    //
    // Spec §4 step 6 / Decision #4 (ux/upgrade-curve-drawer-spec.md):
    //   - next level affordable → drawer stays open (preserves fast repeat loop)
    //   - next level NOT affordable → drawer closes (slide back right)
    //   - new level is max → drawer stays open in max-level state
    const postUpgradeEngagement = engagement - nextLevel.cost;
    // If there IS no next-next row, the player hit max with this upgrade —
    // keep the drawer open in the max-level state per §4 step 6.
    const hitMaxThisClick = currentLevel + 1 >= def.max_level;
    const canAffordAfterUpgrade =
      !hitMaxThisClick &&
      levels[1] !== undefined &&
      postUpgradeEngagement >= levels[1].cost;

    onUpgrade();

    if (!canAffordAfterUpgrade && !hitMaxThisClick) {
      // Close after brief delay (spec §4 step 6: t=100–250ms).
      // Re-render against new level already happens via prop update at t≈0.
      window.setTimeout(() => {
        setClosing(true);
        window.setTimeout(onClose, DRAWER_CLOSE_DELAY_MS);
      }, 80);
    }
    // else: drawer stays open; in-place re-render shows new level / cost / multi.
  }

  const style = {
    '--drawer-color': display.color,
    top: `${clampedTop}px`,
  } as React.CSSProperties;

  const drawer = (
    <>
      {/* Backdrop — transparent, full-screen, outside-tap dismisses drawer. */}
      <div
        className="upgrade-drawer-backdrop"
        onClick={triggerClose}
        aria-hidden
      />

      <div
        className={`upgrade-drawer${closing ? ' upgrade-drawer-closing' : ''}`}
        style={style}
        role="dialog"
        aria-label={`Upgrade ${display.name}`}
        aria-modal="true"
      >
        {/* Header */}
        <div className="upgrade-drawer-header">
          <div className="upgrade-drawer-title">Upgrade {display.name}</div>
          <div className="upgrade-drawer-current">
            Current: Level {currentLevel}&nbsp;&nbsp;({(currentCooldown / 1000).toFixed(1)}s cooldown)
          </div>
        </div>

        {/* Level rows */}
        <div className="upgrade-drawer-levels">
          {atMax && (
            <div className="upgrade-level-row action-row upgrade-level-max">
              <span className="upgrade-level-lv">MAX</span>
              <span className="upgrade-level-multi">{(currentCooldown / 1000).toFixed(1)}s</span>
              <span className="upgrade-level-cost">no further upgrades</span>
              <button
                ref={primaryBtnRef}
                className="upgrade-btn upgrade-btn-max"
                disabled
                aria-label={`${display.name} is at max level`}
              >
                MAX
              </button>
            </div>
          )}
          {levels.map((row, i) => {
            const isAction = i === 0;
            return (
              <div
                key={row.level}
                className={`upgrade-level-row${isAction ? ' action-row' : ' preview-row'}`}
              >
                <span className="upgrade-level-lv">Lv {row.level}</span>
                <span className="upgrade-level-multi">{(row.cooldown / 1000).toFixed(1)}s</span>
                <span className={`upgrade-level-cost${isAction && !canAfford ? ' insufficient' : ''}`}>
                  cost: {fmtCompact(row.cost)}
                </span>
                {isAction && (
                  <button
                    ref={primaryBtnRef}
                    className={`upgrade-btn${!canAfford ? ' insufficient' : ''}${shaking ? ' upgrade-btn-shake' : ''}`}
                    onClick={handleUpgradeClick}
                    aria-label={
                      canAfford
                        ? `Upgrade ${display.name} to level ${row.level}`
                        : `Cannot afford — need ${fmtCompact(shortfall)} more engagement`
                    }
                  >
                    Upgrade
                  </button>
                )}
              </div>
            );
          })}

          {/* Insufficient hint — shown below action row when player can't afford. */}
          {!canAfford && (
            <div className="upgrade-insufficient-hint">
              need {fmtCompact(shortfall)} more engagement
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="upgrade-drawer-footer">
          <button className="upgrade-close-btn" onClick={triggerClose}>
            Close
          </button>
        </div>
      </div>
    </>
  );

  return createPortal(drawer, document.body);
}
