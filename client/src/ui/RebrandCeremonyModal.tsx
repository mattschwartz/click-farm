// Rebrand Ceremony — 4 phases (tasks #62 Phase 1, #65 Phases 2–4).
//
// UX spec: ux/prestige-rebrand-screen.md §4
//
// Phase 1 (Threshold Review): clinical account of what resets/persists.
//   Cancel closes modal + resumes loop; Continue → Phase 2.
//
// Phase 2 (Eulogy): 3–4 satirical stanzas fade in sequentially, bg desaturates.
//   Skip link hidden until 3rd stanza on first rebrand. On the final stanza,
//   playback stops and the skip link becomes a highlighted "Continue" — the
//   player must click it to advance to Phase 3. Backdrop/Esc cancels.
//
// Phase 3 (Commit): "Become someone new." + one 280×80 Rebrand button.
//   Tap calls onConfirm() (driver.rebrand()) and advances to Phase 4.
//   No visible Cancel; backdrop/Esc cancels.
//
// Phase 4 (Dissolution → Rebirth): dissolution animations play, state is
//   already committed. NO cancellation. Calls onComplete() when done.
//
// Total runtime: ~8s first rebrand (unskipped), ~5s subsequent (eulogy skipped).
// Game loop is paused for the entire ceremony (parent's responsibility).

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GameState, GeneratorId, PlatformId, UpgradeId } from '../types.ts';
import { cloutForRebrand } from '../prestige/index.ts';
import { fmtCompact, fmtCompactInt } from './format.ts';
import { POST_PRESTIGE_GENERATORS } from './display.ts';
import { buildEulogyStanzas } from './eulogy-templates.ts';

// ---------------------------------------------------------------------------
// Pure helpers — exported for testing (Phase 1 data + ceremony logic)
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
  highlight?: boolean;
}

/** Items to show in "What persists" — meta-state that survives the rebrand. */
export function buildPersistItems(state: GameState): PersistItem[] {
  const ownedUpgrades = (Object.keys(state.player.clout_upgrades) as UpgradeId[]).filter(
    (id) => state.player.clout_upgrades[id] > 0,
  ).length;

  return [
    { label: 'Clout', value: '' },
    { label: 'Clout upgrades', value: `${ownedUpgrades} owned` },
    { label: 'Lifetime followers', value: fmtCompactInt(state.player.lifetime_followers), highlight: true },
    { label: 'Lifetime engagement', value: fmtCompactInt(state.player.lifetime_engagement), highlight: true },
    { label: 'Rebrand count', value: `→ ${state.player.rebrand_count + 1}` },
  ];
}

/** True when the player has unlocked viral_stunts and may rebrand. */
export function isEligibleToRebrand(state: GameState): boolean {
  return state.generators.viral_stunts.owned;
}

/**
 * Skip link visibility for Phase 2. On the first rebrand (rebrand_count 0 →
 * 1) the skip is hidden until the 3rd stanza appears, protecting the first
 * experience. On subsequent rebrands skip is visible immediately.
 *
 * Per spec §4.3.
 *
 * @param rebrandCount Current (pre-rebrand) rebrand_count
 * @param currentStanzaIndex 0-based index of the currently-visible stanza
 */
export function isSkipVisible(rebrandCount: number, currentStanzaIndex: number): boolean {
  if (rebrandCount > 0) return true; // subsequent rebrands show skip immediately
  return currentStanzaIndex >= 2; // first rebrand: skip at 3rd stanza (index 2)
}

// ---------------------------------------------------------------------------
// Timing constants
// ---------------------------------------------------------------------------

// Phase 2 — Eulogy timings (spec §4.3)
const STANZA_FADE_MS = 600;
const STANZA_LINGER_MS = 1000; // time between stanza-start and next stanza-start beyond fade-in → actually total display per stanza
const STANZA_STEP_MS = STANZA_FADE_MS + STANZA_LINGER_MS; // 1600ms between stanza onsets

// Phase 4 — Dissolution + Rebirth timings (spec §4.5)
const DISSOLUTION_TICK_MS = 1000; // counters fall to zero over 1s
const DISSOLUTION_END_MS = 2000;  // dissolution "half" ends at 2000ms
const HELD_SILENCE_END_MS = 2400; // 400ms held silence
const REBIRTH_FADE_END_MS = 3500; // total Phase 4 duration

// Reduced motion: shorter, simpler Phase 4
const RM_DISSOLUTION_TICK_MS = 1000; // single fade to zero — same length, cleaner feel
const RM_REBIRTH_FADE_END_MS = 2400; // compressed but preserves timing beats

// ---------------------------------------------------------------------------
// Reduced motion detection
// ---------------------------------------------------------------------------

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ---------------------------------------------------------------------------
// Phase type
// ---------------------------------------------------------------------------

type Phase = 1 | 2 | 3 | 4;

interface DissolutionSnapshot {
  engagement: number;
  followers: number;
  rebrandCountBefore: number;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface RebrandCeremonyModalProps {
  state: GameState;
  /** Called when the player cancels from Phase 1, 2, or 3. */
  onCancel: () => void;
  /** Called at Phase 3 commit — performs the rebrand (driver.rebrand()). */
  onConfirm: () => void;
  /** Called when Phase 4 finishes — parent should close modal + resume loop. */
  onComplete: () => void;
}

export function RebrandCeremonyModal({
  state,
  onCancel,
  onConfirm,
  onComplete,
}: RebrandCeremonyModalProps) {
  const [phase, setPhase] = useState<Phase>(1);
  // Snapshot pre-rebrand counters at Phase 3 tap, so Phase 4 can animate
  // them down visually. After onConfirm() fires, state will be fresh.
  const [snapshot, setSnapshot] = useState<DissolutionSnapshot | null>(null);
  const reducedMotion = useRef(prefersReducedMotion()).current;

  // Escape cancels (Phases 1, 2, 3 only).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (phase === 4) return; // Phase 4 non-cancellable
      onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, onCancel]);

  // Handle transition from Phase 3 → Phase 4: snapshot + rebrand + advance.
  // Stable identity — parent (GameScreen) re-renders every 1s due to its
  // clock interval, so any inline callback passed into child phases would
  // retrigger their effects and cancel their timers, freezing the ceremony.
  const handleCommit = useCallback(() => {
    // Snapshot BEFORE calling onConfirm — once rebrand fires, state is fresh.
    setSnapshot({
      engagement: state.player.engagement,
      followers: state.player.total_followers,
      rebrandCountBefore: state.player.rebrand_count,
    });
    onConfirm();
    setPhase(4);
  }, [state.player.engagement, state.player.total_followers, state.player.rebrand_count, onConfirm]);

  const goToPhase2 = useCallback(() => setPhase(2), []);
  const goToPhase3 = useCallback(() => setPhase(3), []);

  // Backdrop-click cancels on Phases 1–3 only.
  function handleBackdropClick(e: React.MouseEvent) {
    if (phase === 4) return;
    // Only when the click target IS the backdrop itself (not a child).
    if (e.target !== e.currentTarget) return;
    onCancel();
  }

  const modal = (
    <div
      className="ceremony-overlay"
      onClick={handleBackdropClick}
      aria-hidden="false"
    >
      {phase === 1 && (
        <Phase1Review
          state={state}
          onCancel={onCancel}
          onContinue={goToPhase2}
        />
      )}
      {phase === 2 && (
        <Phase2Eulogy
          state={state}
          reducedMotion={reducedMotion}
          onSkip={goToPhase3}
        />
      )}
      {phase === 3 && (
        <Phase3Commit onCommit={handleCommit} />
      )}
      {phase === 4 && snapshot && (
        <Phase4Dissolution
          snapshot={snapshot}
          reducedMotion={reducedMotion}
          onComplete={onComplete}
        />
      )}
    </div>
  );

  return createPortal(modal, document.body);
}

// ---------------------------------------------------------------------------
// Phase 1 — Threshold Review (spec §4.2)
// ---------------------------------------------------------------------------

function Phase1Review({
  state,
  onCancel,
  onContinue,
}: {
  state: GameState;
  onCancel: () => void;
  onContinue: () => void;
}) {
  const cloutEarned = cloutEarnedForReview(state);
  const newBalance = newCloutBalanceForReview(state);
  const resetItems = buildResetItems(state);
  const persistItems = buildPersistItems(state);

  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const continueBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    continueBtnRef.current?.focus();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const focused = document.activeElement;
    if (e.shiftKey) {
      if (focused === cancelBtnRef.current) continueBtnRef.current?.focus();
      else cancelBtnRef.current?.focus();
    } else {
      if (focused === continueBtnRef.current) cancelBtnRef.current?.focus();
      else continueBtnRef.current?.focus();
    }
  }

  return (
    <div
      className="ceremony-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Rebrand — Threshold Review"
      onKeyDown={handleKeyDown}
    >
      <button
        className="ceremony-close-btn"
        onClick={onCancel}
        aria-label="Cancel rebrand"
      >
        ×
      </button>
      <p className="ceremony-headline">You are about to rebrand.</p>

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
            <div key={item.label} className={`ceremony-column-row${item.highlight ? ' ceremony-column-row-highlight' : ''}`}>
              <span className="ceremony-col-bullet">▸</span>
              <span className="ceremony-col-label">{item.label}</span>
              {item.value && (
                <span className={`ceremony-col-value${item.highlight ? ' ceremony-col-value-highlight' : ''}`}>{item.value}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="ceremony-actions">
        <button
          ref={cancelBtnRef}
          className="ceremony-btn ceremony-btn-cancel ceremony-btn-cancel-bottom"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          ref={continueBtnRef}
          className="ceremony-btn ceremony-btn-continue"
          onClick={onContinue}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase 2 — Eulogy (spec §4.3)
// ---------------------------------------------------------------------------

function Phase2Eulogy({
  state,
  reducedMotion,
  onSkip,
}: {
  state: GameState;
  reducedMotion: boolean;
  onSkip: () => void;
}) {
  const stanzas = useRef(buildEulogyStanzas(state)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const rebrandCount = state.player.rebrand_count;

  // Sequential stanza advance. On the final stanza, we stop and wait for the
  // player to click Continue (the skip button is re-labelled) — no auto-advance.
  useEffect(() => {
    if (currentIndex >= stanzas.length - 1) return; // final stanza: wait for click
    const t = window.setTimeout(() => {
      setCurrentIndex((i) => i + 1);
    }, STANZA_STEP_MS);
    return () => window.clearTimeout(t);
  }, [currentIndex, stanzas.length]);

  const onFinalStanza = currentIndex >= stanzas.length - 1;
  const showSkip = onFinalStanza || isSkipVisible(rebrandCount, currentIndex);

  // Background desaturation progresses as stanzas advance (spec §4.3).
  // 0% → 40% over the full Phase 2 duration.
  const desatProgress = reducedMotion
    ? 0.4 // instant per Reduce Motion spec §7
    : Math.min(0.4, (currentIndex / Math.max(1, stanzas.length - 1)) * 0.4);

  return (
    <div
      className="ceremony-modal ceremony-modal-eulogy"
      role="dialog"
      aria-modal="true"
      aria-label="Rebrand — Eulogy"
      style={
        {
          '--eulogy-desat': desatProgress.toFixed(2),
        } as React.CSSProperties
      }
    >
      <div className="eulogy-stanzas" aria-live="polite">
        {stanzas.slice(0, currentIndex + 1).map((stanza, i) => (
          <p
            key={i}
            className={`eulogy-stanza${i === currentIndex ? ' eulogy-stanza-active' : ''}`}
          >
            {stanza}
          </p>
        ))}
      </div>
      {showSkip && (
        <button
          className={`eulogy-skip-btn${onFinalStanza ? ' eulogy-skip-btn-continue' : ''}`}
          onClick={onSkip}
          aria-label={onFinalStanza ? 'Continue' : 'Skip eulogy'}
        >
          {onFinalStanza ? 'Continue' : 'Skip'}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase 3 — Commit (spec §4.4)
// ---------------------------------------------------------------------------

function Phase3Commit({ onCommit }: { onCommit: () => void }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pressing, setPressing] = useState(false);

  useEffect(() => {
    btnRef.current?.focus();
  }, []);

  function handleClick() {
    setPressing(true);
    // Button scales 0.96 for 80ms per spec §4.4, then advances.
    window.setTimeout(() => {
      onCommit();
    }, 80);
  }

  return (
    <div
      className="ceremony-modal ceremony-modal-commit"
      role="dialog"
      aria-modal="true"
      aria-label="Rebrand — Commit"
    >
      <p className="commit-headline">Become someone new.</p>
      <button
        ref={btnRef}
        className={`commit-btn${pressing ? ' commit-btn-pressing' : ''}`}
        onClick={handleClick}
      >
        Rebrand
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase 4 — Dissolution → Rebirth (spec §4.5) — non-cancellable
// ---------------------------------------------------------------------------

function Phase4Dissolution({
  snapshot,
  reducedMotion,
  onComplete,
}: {
  snapshot: DissolutionSnapshot;
  reducedMotion: boolean;
  onComplete: () => void;
}) {
  // Animated display values — tick from snapshot down to zero.
  const [displayEng, setDisplayEng] = useState(snapshot.engagement);
  const [displayFol, setDisplayFol] = useState(snapshot.followers);
  const [stage, setStage] = useState<'dissolving' | 'wash' | 'rebirth'>('dissolving');

  // Tick-down animation (rAF driven).
  useEffect(() => {
    const tickMs = reducedMotion ? RM_DISSOLUTION_TICK_MS : DISSOLUTION_TICK_MS;
    const start = performance.now();
    let raf = 0;
    const step = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(1, elapsed / tickMs);
      // ease-in: t^2 (spec §4.5 says ease-in for counter dissolution)
      const eased = t * t;
      setDisplayEng(Math.round(snapshot.engagement * (1 - eased)));
      setDisplayFol(Math.round(snapshot.followers * (1 - eased)));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [snapshot.engagement, snapshot.followers, reducedMotion]);

  // Stage transitions drive the CSS wash + rebirth fade.
  useEffect(() => {
    const washStart = reducedMotion ? RM_DISSOLUTION_TICK_MS : DISSOLUTION_END_MS;
    const rebirthStart = reducedMotion
      ? RM_DISSOLUTION_TICK_MS + 400
      : HELD_SILENCE_END_MS;
    const total = reducedMotion ? RM_REBIRTH_FADE_END_MS : REBIRTH_FADE_END_MS;

    const t1 = window.setTimeout(() => setStage('wash'), washStart);
    const t2 = window.setTimeout(() => setStage('rebirth'), rebirthStart);
    const t3 = window.setTimeout(onComplete, total);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [reducedMotion, onComplete]);

  const runNumber = snapshot.rebrandCountBefore + 2;

  return (
    <div
      className={`ceremony-modal ceremony-modal-dissolution ceremony-stage-${stage}${reducedMotion ? ' ceremony-reduced-motion' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Rebranding"
    >
      {/* aria-live announcement for screen readers */}
      <div className="sr-only" aria-live="assertive">
        Rebranding. Run {runNumber} beginning.
      </div>

      <div className="dissolution-counters" aria-hidden="true">
        <div className="dissolution-counter">
          <span className="dissolution-counter-value">{fmtCompactInt(displayEng)}</span>
          <span className="dissolution-counter-label">engagement</span>
        </div>
        <div className="dissolution-counter">
          <span className="dissolution-counter-value">{fmtCompactInt(displayFol)}</span>
          <span className="dissolution-counter-label">followers</span>
        </div>
      </div>
    </div>
  );
}
