// Core game screen — the main surface the player interacts with during a
// normal session. Implements UX spec §§2–8, §9, and §11.
//
// Zones (per UX §2):
//   - Top bar (80px): Engagement + Followers
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
import type { OfflineResult } from '../offline/index.ts';
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
import { prevTrack, nextTrack, togglePlayPause, isMusicPlaying } from './sfx.ts';
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

interface GameScreenProps {
  /** Called once on mount with the offline result (or null if first session). */
  onOfflineResult?: (result: OfflineResult | null) => void;
}

export function GameScreen({ onOfflineResult }: GameScreenProps = {}) {
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

  // Notify parent of offline result on mount (for the start gate to show).
  useEffect(() => {
    onOfflineResult?.(offlineResult);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // fire once on mount

  // Settings — persisted separately from GameState, propagates reduceMotion
  // to <html data-reduce-motion> so CSS can mirror the OS media query.
  const {
    settings,
    setReduceMotion,
    setSound,
    toggleSound,
    setMusicVolume,
    setSfxVolume,
  } = useSettings();

  // Music player — sync UI with actual audio state. Poll at 250ms so mute
  // toggle, background-tab pause, and track-end transitions are reflected.
  const [musicPlaying, setMusicPlaying] = useState(() => isMusicPlaying());
  useEffect(() => {
    const t = window.setInterval(() => setMusicPlaying(isMusicPlaying()), 250);
    return () => window.clearInterval(t);
  }, []);

  const handlePrev = () => { prevTrack(); setMusicPlaying(true); };
  const handleNext = () => { nextTrack(); setMusicPlaying(true); };
  const handlePlayPause = () => { const playing = togglePlayPause(); setMusicPlaying(playing); };

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

  // ---------------------------------------------------------------------------
  // Offline modal moved to the App-level start gate (welcome back variant).
  // The standalone OfflineGainsModal is no longer rendered here.

  // Upgrade drawer open state — used to dim the platform panel per spec §1.
  const [upgradeDrawerOpen, setUpgradeDrawerOpen] = useState(false);

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
      <main className={`game-screen${viralPhase === 'peak' ? ' viral-zoom-pulse' : ''}`}>
        <TopBar
          engagement={state.player.engagement}
          engagementRate={effectiveEngagementRate}
          totalFollowers={state.player.total_followers}
          viralGold={viralPhase !== null}
          summaryBadge={summaryBadge}
          rebrandCount={state.player.rebrand_count}
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

      {/* Offline gains — initial load is handled by App-level start gate.
          Tab-return offline gains show here as an overlay on the running game. */}
      {offlineResult && offlineResult.durationMs > 60_000 && (
        <OfflineGainsModal result={offlineResult} onDismiss={clearOfflineResult} />
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
      {/* Floating bottom-left toolbar — mute + settings */}
      <div className="floating-toolbar">
        <span className="alpha-row">
          <span className="alpha-version">v0.1.0</span>
          <span className="alpha-label">ALPHA</span>
        </span>
        <button
          type="button"
          className="settings-gear-btn"
          onClick={toggleSound}
          aria-label={settings.sound ? 'Mute' : 'Unmute'}
          title={settings.sound ? 'Mute' : 'Unmute'}
        >
          {settings.sound ? '♪' : '♪'}
          {!settings.sound && <span className="mute-cross">╲</span>}
        </button>
        <button
          type="button"
          className="settings-gear-btn"
          onClick={() => setShowSettingsModal(true)}
          aria-label="Open Settings"
          title="Settings"
        >
          ⚙
        </button>
        <a
          href="https://github.com/mattschwartz/click-farm"
          target="_blank"
          rel="noopener noreferrer"
          className="settings-gear-btn github-link"
          aria-label="GitHub"
          title="GitHub"
        >
          <svg viewBox="0 0 16 16" width="22" height="22" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
        </a>
        {settings.sound && (
          <div className="music-player">
            <button
              type="button"
              className="music-player-btn"
              onClick={handlePrev}
              aria-label="Previous track"
              title="Previous track"
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                <path d="M3 2h2v12H3zM7 8l7-5v10z"/>
              </svg>
            </button>
            <button
              type="button"
              className="music-player-btn music-player-btn-play"
              onClick={handlePlayPause}
              aria-label={musicPlaying ? 'Pause' : 'Play'}
              title={musicPlaying ? 'Pause' : 'Play'}
            >
              {musicPlaying ? (
                <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                  <path d="M4 2h3v12H4zM9 2h3v12H9z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                  <path d="M4 2l10 6-10 6z"/>
                </svg>
              )}
            </button>
            <button
              type="button"
              className="music-player-btn"
              onClick={handleNext}
              aria-label="Next track"
              title="Next track"
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                <path d="M2 3l7 5-7 5zM11 2h2v12h-2z"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {showAmbientCopy && (
        <div className={`ambient-copy${ambientCopyFading ? ' ambient-copy-fading' : ''}`}>
          You are new again.
        </div>
      )}
    </>
  );
}
