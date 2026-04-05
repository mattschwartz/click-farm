// Rebrand Ceremony — Phase 1: Threshold Review
//
// UX spec: ux/prestige-rebrand-screen.md §4.1–4.2
//
// Phase 1 shows a clinical account of what resets and what persists.
// Cancel closes the modal and resumes the game loop (no state change).
// Continue calls onConfirm — the parent calls driver.rebrand() and
// resumes the game loop.
//
// Phases 2–4 are separate tasks (E4). This component only renders Phase 1.
//
// Game loop is paused while this modal is open (spec §4.1).
// The parent is responsible for calling pauseLoop / resumeLoop at the
// correct moments (open → pause, close/continue → resume).

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { GameState } from '../types.ts';
import type { GeneratorId, PlatformId, UpgradeId } from '../types.ts';
import { cloutForRebrand } from '../prestige/index.ts';
import { fmtCompact, fmtCompactInt } from './format.ts';
import { POST_PRESTIGE_GENERATORS } from './display.ts';

// ---------------------------------------------------------------------------
// Pure helpers — exported for testing
// ---------------------------------------------------------------------------

/** Clout that will be earned on rebrand from current state. */
export function cloutEarnedForReview(state: GameState): number {
  return cloutForRebrand(state.player.total_followers);
}

/** New Clout balance the player will have after the rebrand. */
export function newCloutBalanceForReview(state: GameState): number {
  return state.player.clout + cloutEarnedForReview(state);
}

export interface ResetItem {
  label: string;
  value: string;
}

/** Items to show in "What resets" — all values from current run state. */
export function buildResetItems(state: GameState): ResetItem[] {
  // Count generators owned (main-list only — post-prestige excluded per task #70).
  const ownedCount = (Object.keys(state.generators) as GeneratorId[]).filter(
    (id) => state.generators[id].owned && !POST_PRESTIGE_GENERATORS.includes(id),
  ).length;

  const unlockedPlatforms = (Object.keys(state.platforms) as PlatformId[]).filter(
    (id) => state.platforms[id].unlocked,
  ).length;

  return [
    { label: 'Engagement', value: fmtCompact(state.player.engagement) },
    { label: 'Generators owned', value: `${ownedCount} types` },
    { label: 'Platforms unlocked', value: `${unlockedPlatforms} platforms` },
    { label: 'Follower counts', value: 'all' },
  ];
}

export interface PersistItem {
  label: string;
  value: string;
}

/** Items to show in "What persists" — meta-state that survives the rebrand. */
export function buildPersistItems(state: GameState): PersistItem[] {
  const ownedUpgrades = (Object.keys(state.player.clout_upgrades) as UpgradeId[]).filter(
    (id) => state.player.clout_upgrades[id] > 0,
  ).length;

  return [
    { label: 'Clout', value: '' },
    { label: 'Clout upgrades', value: `${ownedUpgrades} owned` },
    { label: 'Lifetime followers', value: fmtCompactInt(state.player.lifetime_followers) },
    { label: 'Rebrand count', value: `→ ${state.player.rebrand_count + 1}` },
  ];
}

/** True when the player has followers and may rebrand. */
export function isEligibleToRebrand(state: GameState): boolean {
  // Eligibility threshold is a game-designer open question (spec §9).
  // Interim: any followers earned qualifies the player.
  return state.player.total_followers > 0;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface RebrandCeremonyModalProps {
  state: GameState;
  onCancel: () => void;
  onConfirm: () => void;
}

export function RebrandCeremonyModal({
  state,
  onCancel,
  onConfirm,
}: RebrandCeremonyModalProps) {
  const cloutEarned = cloutEarnedForReview(state);
  const newBalance = newCloutBalanceForReview(state);
  const resetItems = buildResetItems(state);
  const persistItems = buildPersistItems(state);

  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const continueBtnRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Focus Continue on open — the primary action.
  useEffect(() => {
    continueBtnRef.current?.focus();
  }, []);

  // Escape cancels.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  // Focus trap: Tab cycles between Cancel and Continue only.
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const focused = document.activeElement;
    if (e.shiftKey) {
      if (focused === cancelBtnRef.current) {
        continueBtnRef.current?.focus();
      } else {
        cancelBtnRef.current?.focus();
      }
    } else {
      if (focused === continueBtnRef.current) {
        cancelBtnRef.current?.focus();
      } else {
        continueBtnRef.current?.focus();
      }
    }
  }

  const modal = (
    <>
      {/* Backdrop — dims main screen to ~20% per spec §4.1. Backdrop click cancels. */}
      <div
        className="ceremony-overlay"
        ref={overlayRef}
        onClick={(e) => { if (e.target === overlayRef.current) onCancel(); }}
        aria-hidden="false"
      >
        <div
          className="ceremony-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Rebrand — Threshold Review"
          onKeyDown={handleKeyDown}
        >
          <p className="ceremony-headline">You are about to rebrand.</p>

          {/* Stat box */}
          <div className="ceremony-stat-box">
            <div className="ceremony-stat-row">
              <span className="ceremony-stat-label">Current followers</span>
              <span className="ceremony-stat-value">{fmtCompactInt(state.player.total_followers)}</span>
            </div>
            <div className="ceremony-stat-row">
              <span className="ceremony-stat-label">Clout earned</span>
              <span className="ceremony-stat-value ceremony-stat-positive">+{cloutEarned}</span>
            </div>
            <div className="ceremony-stat-row ceremony-stat-row-final">
              <span className="ceremony-stat-label">New Clout balance</span>
              <span className="ceremony-stat-value">{newBalance}</span>
            </div>
          </div>

          {/* Reset / Persist columns */}
          <div className="ceremony-columns">
            <div className="ceremony-column">
              <p className="ceremony-column-header">What resets</p>
              {resetItems.map((item) => (
                <div key={item.label} className="ceremony-column-row">
                  <span className="ceremony-col-bullet">▸</span>
                  <span className="ceremony-col-label">{item.label}</span>
                  {item.value && (
                    <span className="ceremony-col-value">{item.value}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="ceremony-column">
              <p className="ceremony-column-header">What persists</p>
              {persistItems.map((item) => (
                <div key={item.label} className="ceremony-column-row">
                  <span className="ceremony-col-bullet">▸</span>
                  <span className="ceremony-col-label">{item.label}</span>
                  {item.value && (
                    <span className="ceremony-col-value">{item.value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="ceremony-actions">
            <button
              ref={cancelBtnRef}
              className="ceremony-btn ceremony-btn-cancel"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              ref={continueBtnRef}
              className="ceremony-btn ceremony-btn-continue"
              onClick={onConfirm}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}
