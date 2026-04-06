// Core game screen — the main surface the player interacts with during a
// normal session. Implements UX spec §§2–8, §9, and §11.
//
// Zones (per UX §2):
//   - Top bar (80px): Algorithm state + Engagement + Followers
//   - Post zone (left, 320px): click-to-post button
//   - Generators (center, flex): ledger with category dividers
//   - Platforms (right, 280px): 3 cards with follower counts
//
// Viral burst choreography (UX §9): phase is derived from
// GameState.viralBurst.active at render time — no duplicate state. Visual
// effects (gold counter, generator halo, platform illumination, particle
// drift, vignette pulse, zoom) are driven by CSS classes.
//
// Not yet wired:
//   - Sound design (click cue, shift swell, viral signature) — no audio
//     pipeline exists yet.
//   - Upgrade drawer with 3-level preview (UX §6.3) — follow-up UX task.

import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useGame } from './useGame.ts';
import { STATIC_DATA } from '../static-data/index.ts';
import {
  computeAllGeneratorEffectiveRates,
} from '../game-loop/index.ts';
import { cloutForRebrand } from '../prestige/index.ts';
import type { ActiveViralEvent, GeneratorId } from '../types.ts';
import { AlgorithmBackground } from './AlgorithmBackground.tsx';
import { TopBar } from './TopBar.tsx';
import { ActionsColumn } from './ActionsColumn.tsx';
import { GeneratorList } from './GeneratorList.tsx';
import { PlatformPanel } from './PlatformPanel.tsx';
import { OfflineGainsModal } from './OfflineGainsModal.tsx';
import { RebrandCeremonyModal, isEligibleToRebrand } from './RebrandCeremonyModal.tsx';
import { CloutShopModal } from './CloutShopModal.tsx';
import { CreatorKitPanel } from './CreatorKitPanel.tsx';
import { SettingsModal } from './SettingsModal.tsx';
import { useSettings } from './useSettings.ts';
import { PLATFORM_DISPLAY } from './display.ts';
import { fmtCompactInt } from './format.ts';
import './GameScreen.css';

// ---------------------------------------------------------------------------
// Viral burst phase helpers (UX §9.2)
// ---------------------------------------------------------------------------

/** Visual phases for the viral burst event. */
type ViralPhase = 'build' | 'peak' | 'decay' | null;

/**
 * Derives the current viral phase from the active event. Called at render
 * time — game ticks at 10Hz ensure phase transitions resolve within 100ms.
 *
 * Phase boundaries:
 *   Build:  0–1500ms
 *   Peak:   1500ms – (duration_ms − 1000ms)
 *   Decay:  last 1000ms
 */
function getViralPhase(active: ActiveViralEvent | null): ViralPhase {
  if (!active) return null;
  const elapsed = Date.now() - active.start_time;
  const decayStart = active.duration_ms - 1000;
  if (elapsed < 1500) return 'build';
  if (elapsed < decayStart) return 'peak';
  return 'decay';
}

// Pre-computed particle layout — deterministic positions so we don't call
// Math.random() inside a component body. Particles start in the generator
// zone (~35–52% from left on a 1280px canvas) and drift rightward toward
// the platform panel. Vary vertically to fill the screen height.
const VIRAL_PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: 35 + (i % 5) * 4,          // 35, 39, 43, 47, 51 (generator zone)
  y: 15 + Math.round((i * 37) % 64), // 15–79% vertically
  delay: Math.round((i * 13) % 150) / 100,  // 0–1.49s stagger
  duration: 85 + (i % 4) * 20,  // 85–145 (÷100 = 0.85–1.45s)
}));

/**
 * Whether the first-rebrand ambient copy should be shown.
 * Only appears on the first rebrand (rebrand_count === 1). Task #66, UX §5.
 */
export function shouldShowAmbientCopy(rebrandCount: number): boolean {
  return rebrandCount === 1;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function GameScreen() {
  const {
    state,
    click,
    buy,
    upgrade,
    unlock,
    buyAutoclicker,
    offlineResult,
    clearOfflineResult,
    rebrand,
    pauseLoop,
    resumeLoop,
    buyCloutUpgrade,
    buyKitItem,
    saveError,
    clearSaveError,
    resetGame,
  } = useGame();

  // Settings — persisted separately from GameState, propagates reduceMotion
  // to <html data-reduce-motion> so CSS can mirror the OS media query.
  const {
    settings,
    setReduceMotion,
    setSound,
    setMusicVolume,
    setSfxVolume,
  } = useSettings();

  // Render-time derived values --------------------------------------------
  const engagementRate = useMemo(() => {
    const rates = computeAllGeneratorEffectiveRates(state, STATIC_DATA);
    let total = 0;
    for (const id of Object.keys(rates) as GeneratorId[]) {
      total += rates[id] ?? 0;
    }
    return total;
  }, [state]);

  // Per-verb yield preview is now computed per-button inside ActionsColumn.

  // ---------------------------------------------------------------------------
  // Viral burst orchestration (UX §9)
  // ---------------------------------------------------------------------------

  const viralActive = state.viralBurst.active;
  // Phase is derived at render time — no extra state needed.
  const viralPhase = getViralPhase(viralActive);

  // Summary badge: capture magnitude when the event ends (active → null).
  // This is UI-only state — the magnitude is no longer accessible from the
  // engine state once active is cleared.
  const prevViralRef = useRef<ActiveViralEvent | null>(null);
  const [summaryBadge, setSummaryBadge] = useState<{
    magnitude: number;
    fading: boolean;
  } | null>(null);

  useEffect(() => {
    const prev = prevViralRef.current;
    const curr = viralActive;
    prevViralRef.current = curr;
    if (prev !== null && curr === null) {
      // Burst just ended — show the summary badge.
      setSummaryBadge({ magnitude: prev.magnitude, fading: false });
      const t1 = window.setTimeout(
        () => setSummaryBadge((b) => (b ? { ...b, fading: true } : null)),
        1500,
      );
      const t2 = window.setTimeout(() => setSummaryBadge(null), 1900);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      };
    }
  }, [viralActive]);

  // Effective engagement rate: base generator rate + viral bonus.
  // This drives the tick-rate drama — useInterpolatedValue in TopBar sees the
  // full rate and extrapolates at 60fps, producing the counter acceleration
  // described in UX §9.3.
  const viralBonusRatePerSec = viralActive
    ? viralActive.bonus_rate_per_ms * 1000
    : 0;
  const effectiveEngagementRate = engagementRate + viralBonusRatePerSec;

  // Vignette color for the edge glow during viral (UX §9.2 Phase 2).
  const vignetteColor = viralActive
    ? PLATFORM_DISPLAY[viralActive.source_platform_id].accent
    : null;

  // ---------------------------------------------------------------------------
  // Modal visibility — only show if meaningful time elapsed (> 60s per §11).
  const [showOffline, setShowOffline] = useState(
    () => offlineResult !== null && offlineResult.durationMs > 60_000,
  );
  useEffect(() => {
    if (offlineResult && offlineResult.durationMs > 60_000) {
      setShowOffline(true);
    }
  }, [offlineResult]);

  // Upgrade drawer open state — used to dim the platform panel per spec §1.
  const [upgradeDrawerOpen, setUpgradeDrawerOpen] = useState(false);

  // Approximate algorithm interval from static schedule — used for
  // instability scaling (we don't have the exact current-interval value
  // available; base ± variance is close enough for visual intent).
  const intervalMs = STATIC_DATA.algorithmSchedule.baseIntervalMs;

  // Live `now` for the instability computation. Tick once a second — we
  // only need coarse resolution to scale animation speed.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  // Prestige cluster — two-button affordance bottom-right (spec §2.1–2.3).
  // Replaces the old single rebrand-corner button and window.confirm.
  const rebrandPreview = cloutForRebrand(state.player.total_followers);
  const prestigeEligible = isEligibleToRebrand(state);

  // Modal visibility state.
  const [showCeremonyModal, setShowCeremonyModal] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Global Esc shortcut — opens Settings when no modal is open (§1). Each
  // modal owns its own Esc-to-close handler; this listener bails out when
  // any modal is visible so it doesn't double-handle.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (
        showCeremonyModal ||
        showShopModal ||
        showSettingsModal ||
        offlineResult !== null
      ) {
        return;
      }
      e.preventDefault();
      setShowSettingsModal(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    showCeremonyModal,
    showShopModal,
    showSettingsModal,
    offlineResult,
  ]);

  // Refs for returning focus to the triggering button on modal close.
  const rebrandBtnRef = useRef<HTMLButtonElement>(null);
  const upgradesBtnRef = useRef<HTMLButtonElement>(null);

  // First-rebrand ambient copy (task #66, UX §5).
  // Show 'You are new again.' top-right on first rebrand (rebrand_count === 1),
  // fade in 600ms, hold 4s, fade out 600ms, then dismiss.
  const [showAmbientCopy, setShowAmbientCopy] = useState(false);
  const [ambientCopyFading, setAmbientCopyFading] = useState(false);
  const ambientCopyShownRef = useRef(false);

  useEffect(() => {
    if (shouldShowAmbientCopy(state.player.rebrand_count) && !ambientCopyShownRef.current) {
      ambientCopyShownRef.current = true;
      setShowAmbientCopy(true);
      // Hold for 4s, then fade out for 600ms
      const t1 = window.setTimeout(() => {
        setAmbientCopyFading(true);
      }, 4000);
      const t2 = window.setTimeout(() => {
        setShowAmbientCopy(false);
        setAmbientCopyFading(false);
      }, 4600);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      };
    }
  }, [state.player.rebrand_count]);

  // Upgrades button — opens Clout Shop shell.
  const handleUpgradesClick = () => {
    setShowShopModal(true);
  };

  const handleShopClose = () => {
    setShowShopModal(false);
    upgradesBtnRef.current?.focus();
  };

  // Rebrand button — opens Rebrand Ceremony (Phase 1) and pauses the game loop.
  const handleRebrandClick = () => {
    if (!prestigeEligible) return;
    pauseLoop();
    setShowCeremonyModal(true);
  };

  const handleCeremonyCancel = useCallback(() => {
    setShowCeremonyModal(false);
    resumeLoop();
    rebrandBtnRef.current?.focus();
  }, [resumeLoop]);

  const handleCeremonyConfirm = useCallback(() => {
    // Phase 3 commit — perform the rebrand. Modal stays open for Phase 4.
    rebrand();
  }, [rebrand]);

  const handleCeremonyComplete = useCallback(() => {
    // Phase 4 finished — close modal, resume loop, return focus.
    setShowCeremonyModal(false);
    resumeLoop();
    rebrandBtnRef.current?.focus();
  }, [resumeLoop]);

  return (
    <>
      <AlgorithmBackground
        algorithm={state.algorithm}
        now={now}
        intervalMs={intervalMs}
        viralActive={viralPhase !== null}
        viralBurst={
          viralPhase !== null && vignetteColor
            ? {
                color: vignetteColor,
                phase:
                  viralPhase === 'build'
                    ? 'entering'
                    : viralPhase === 'decay'
                      ? 'exiting'
                      : 'peak',
              }
            : undefined
        }
      />

      <main className={`game-screen${viralPhase === 'peak' ? ' viral-zoom-pulse' : ''}`}>
        <TopBar
          algorithm={state.algorithm}
          engagement={state.player.engagement}
          engagementRate={effectiveEngagementRate}
          totalFollowers={state.player.total_followers}
          viralGold={viralPhase !== null}
          summaryBadge={summaryBadge}
          rebrandCount={state.player.rebrand_count}
          onOpenSettings={() => setShowSettingsModal(true)}
        />

        {saveError && (
          <div className="save-error-banner" role="alert">
            <span className="save-error-banner-text">
              {saveError.kind === 'load_corrupt'
                ? 'Your save could not be read — starting a fresh run.'
                : saveError.kind === 'save_quota'
                  ? 'Browser storage is full — progress is in memory only.'
                  : 'Save failed — progress is in memory only.'}
            </span>
            <button
              type="button"
              className="save-error-banner-close"
              onClick={clearSaveError}
              aria-label="Dismiss save error"
            >
              ×
            </button>
          </div>
        )}

        <div className="game-body">
          <ActionsColumn
            state={state}
            staticData={STATIC_DATA}
            onClickVerb={click}
            onUnlockVerb={unlock}
          />
          <div className="generator-column">
            <GeneratorList
              state={state}
              staticData={STATIC_DATA}
              onBuy={buy}
              onUpgrade={upgrade}
              onUnlock={unlock}
              onBuyAutoclicker={buyAutoclicker}
              viralGeneratorId={viralActive?.source_generator_id ?? null}
              onDrawerOpenChange={setUpgradeDrawerOpen}
            />
            <CreatorKitPanel
              state={state}
              staticData={STATIC_DATA}
              onBuy={buyKitItem}
            />
          </div>
          <PlatformPanel
            state={state}
            staticData={STATIC_DATA}
            viralPlatformId={viralActive?.source_platform_id ?? null}
            drawerDimmed={upgradeDrawerOpen}
          />
        </div>
      </main>

      {/* Viral particle burst — Phase 2 (Peak) only. Particles drift from the
          generator zone (~35–52% left) toward the platform panel (~75%+).
          Disabled under prefers-reduced-motion and the in-game Reduce Motion
          toggle when settings (#48) ships. */}
      {viralPhase === 'peak' && (
        <div className="viral-particles-overlay" aria-hidden>
          {VIRAL_PARTICLES.map((p) => (
            <div
              key={p.id}
              className="viral-particle"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                '--pd': `${p.delay}s`,
                '--pdur': `${(p.duration / 100).toFixed(2)}s`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {showOffline && offlineResult && (
        <OfflineGainsModal
          result={offlineResult}
          onDismiss={() => {
            setShowOffline(false);
            clearOfflineResult();
          }}
        />
      )}

      {/* Prestige cluster — bottom-right, two buttons, visually grouped.
          Both buttons render at 3:1 contrast when locked (spec §2.1). */}
      <div className="prestige-cluster">
        <button
          ref={upgradesBtnRef}
          className={`prestige-btn prestige-btn-upgrades${!prestigeEligible ? ' prestige-btn-locked' : ''}`}
          onClick={handleUpgradesClick}
          title={`${fmtCompactInt(state.player.clout)} Clout`}
          aria-label={`Rebrand Upgrades — ${fmtCompactInt(state.player.clout)} Clout`}
        >
          ⚙ Upgrades
        </button>
        <button
          ref={rebrandBtnRef}
          className={`prestige-btn prestige-btn-rebrand${!prestigeEligible ? ' prestige-btn-locked' : ''}`}
          onClick={handleRebrandClick}
          disabled={!prestigeEligible}
          title={
            prestigeEligible
              ? `Rebrand → +${fmtCompactInt(rebrandPreview)} Clout`
              : 'Earn followers first'
          }
          aria-label={
            prestigeEligible
              ? `Rebrand — earn ${fmtCompactInt(rebrandPreview)} Clout`
              : 'Rebrand locked — earn followers first'
          }
        >
          ↻ Rebrand
        </button>
      </div>

      {/* Clout Shop — game loop continues ticking (spec §3.1). */}
      {showShopModal && (
        <CloutShopModal
          state={state}
          onClose={handleShopClose}
          onPurchase={buyCloutUpgrade}
        />
      )}

      {/* Rebrand Ceremony Phase 1 — game loop is paused while open (spec §4.1). */}
      {showCeremonyModal && (
        <RebrandCeremonyModal
          state={state}
          onCancel={handleCeremonyCancel}
          onConfirm={handleCeremonyConfirm}
          onComplete={handleCeremonyComplete}
        />
      )}

      {/* Settings modal — game loop continues ticking. Esc closes. */}
      {showSettingsModal && (
        <SettingsModal
          settings={settings}
          onSetReduceMotion={setReduceMotion}
          onSetSound={setSound}
          onSetMusicVolume={setMusicVolume}
          onSetSfxVolume={setSfxVolume}
          rebrandCount={state.player.rebrand_count}
          onClose={() => setShowSettingsModal(false)}
          onResetRequested={() => {
            // Clear the save and stop the driver (disables any late-firing
            // save from timers / beforeunload / effect cleanup), then hard
            // reload — the driver re-initialises from empty localStorage.
            resetGame();
            if (typeof window !== 'undefined') window.location.reload();
          }}
          onImportApplied={() => {
            // Same rationale as reset — force a reload so the driver
            // picks up the imported save.
            if (typeof window !== 'undefined') window.location.reload();
          }}
        />
      )}

      {/* First-rebrand ambient copy (task #66, UX §5) — top-right, 600ms fade-in,
          4s hold, 600ms fade-out. Never shown after rebrand_count >= 2. */}
      {showAmbientCopy && (
        <div className={`ambient-copy${ambientCopyFading ? ' ambient-copy-fading' : ''}`}>
          You are new again.
        </div>
      )}
    </>
  );
}
