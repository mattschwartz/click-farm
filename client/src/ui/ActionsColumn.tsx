// Actions Column — per-verb manual action ladder (UX spec manual-action-ladder.md).
//
// Replaces the single PostZone button with a per-verb ladder of live buttons
// and a ghost slot for the next unlockable verb. Layout:
//   1. Spotlight slot (most-recently-unlocked verb, sticky top on desktop)
//   2. Other live verbs (unlock order)
//   3. Ghost slot (next threshold-met-but-unowned verb)
//
// Each live button shows: verb icon, name, yield/tap, cooldown fill ring,
// automate-level badge, and pulse indicator.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameState, GeneratorId, StaticData } from '../types.ts';
import {
  verbCooldownMs,
  verbYieldPerTap,
  verbYieldPerAutoTap,
} from '../game-loop/index.ts';
import { playClick } from './sfx.ts';
import { GENERATOR_DISPLAY } from './display.ts';
import { fmtCompact } from './format.ts';
import { TieredNumber } from './TieredNumber.tsx';

// Verb icon images — imported via Vite so they resolve to hashed asset URLs.
import chirpImg from '../assets/chirp.png';
import selfieImg from '../assets/selfie.png';
import livestreamImg from '../assets/livestream.png';
import podcastImg from '../assets/podcast.png';
import viralStuntsImg from '../assets/viral-stunts.png';

const VERB_IMAGE: Partial<Record<string, string>> = {
  chirps: chirpImg,
  selfies: selfieImg,
  livestreams: livestreamImg,
  podcasts: podcastImg,
  viral_stunts: viralStuntsImg,
};

// ---------------------------------------------------------------------------
// Verb color lanes — per UX spec §11
// ---------------------------------------------------------------------------

const VERB_COLOR: Record<string, string> = {
  chirps: '#4d9ef0',
  selfies: '#e07040',
  livestreams: '#9a3adf',
  podcasts: '#5a6adf',
  viral_stunts: '#df3a5a',
};

/** Parse hex to "R, G, B" string for rgba() compositing. */
function hexToRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff}`;
}

/** Darken a hex color by a factor (0–1) for the bottom depth shadow. */
function darkenHex(hex: string, factor: number = 0.3): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 0xff) * (1 - factor));
  const g = Math.round(((n >> 8) & 0xff) * (1 - factor));
  const b = Math.round((n & 0xff) * (1 - factor));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// Manual-clickable ladder verbs in unlock order (proposal §14d).
const LADDER_VERBS: GeneratorId[] = [
  'chirps',
  'selfies',
  'livestreams',
  'podcasts',
  'viral_stunts',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute per-verb yield per tap (same formula as postClick's earned). */
// Yield and cooldown formulas are imported from game-loop (single source of
// truth — verbYieldPerTap, verbCooldownMs). No local copies.



// ---------------------------------------------------------------------------
// Ratio-scaled float sizing (proposal: ratio-scaled-manual-tap-floats)
// ---------------------------------------------------------------------------

/** Linearly interpolate between a and b by t (0–1). */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Clamp value to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Compute ratio-scaled inline styles for a verb float.
 * Returns fontSize (px) and color (HSL gold) based on tap significance.
 */
export function floatStyle(perClick: number, currentEngagement: number): { fontSize: number; color: string } {
  const ratio = perClick / Math.max(1, currentEngagement);
  const t = clamp((Math.log10(ratio) + 6) / 6, 0, 1);
  const fontSize = lerp(16, 32, t);
  return { fontSize, color: '#FFFFFF' };
}

// ---------------------------------------------------------------------------
// FloatItem for tap feedback
// ---------------------------------------------------------------------------

interface FloatItem {
  id: number;
  value: number;
  x: number; // % from left
  y: number; // % from top
  /** True for autoclicker-emitted floats (smaller, dimmer per §4.6). */
  isAutoclick?: boolean;
  /** For batched autoclicker floats (>8), the army size suffix. */
  batchCount?: number;
}

const FLOAT_TTL_MS = 2700; // slightly longer than the 2600ms CSS animation

// ---------------------------------------------------------------------------
// LiveVerbButton
// ---------------------------------------------------------------------------

interface LiveVerbButtonProps {
  verbId: GeneratorId;
  state: GameState;
  staticData: StaticData;
  isSpotlight: boolean;
  onClick: (verbId: GeneratorId) => void;
  showFloats?: boolean;
}

/** Density cap for individual autoclicker floats (§4.6). Above this, batch. */
const AUTO_FLOAT_DENSITY_CAP = 8;

function LiveVerbButton({ verbId, state, staticData, isSpotlight, onClick, showFloats = true }: LiveVerbButtonProps) {
  const genState = state.generators[verbId];
  const display = GENERATOR_DISPLAY[verbId];
  const color = VERB_COLOR[verbId] ?? display.color;
  const perTap = verbYieldPerTap(state.generators[verbId], state, staticData);
  const perAuto = verbYieldPerAutoTap(state.generators[verbId], state, staticData);
  const def = staticData.generators[verbId];
  const cdMs = verbCooldownMs(state.generators[verbId].level, def.base_event_rate);
  const lastTap = state.player.last_manual_click_at[verbId] ?? 0;

  // Cooldown progress (0 = just tapped, 1 = ready).
  // Use Date.now() at render time — re-renders at 10Hz via tick.
  const now = Date.now();
  const elapsed = now - lastTap;
  const progress = lastTap === 0 ? 1 : Math.min(1, elapsed / cdMs);
  const isReady = progress >= 1;

  // At the cooldown floor (<=100ms), stop animating — always ready.
  const atFloor = cdMs <= 100;

  // Float feedback (manual taps + autoclicker emissions)
  const [floats, setFloats] = useState<FloatItem[]>([]);
  const nextId = useRef(0);

  const btnRef = useRef<HTMLButtonElement>(null);

  // Badge pulse — fires on each autoclicker burst (§4.4).
  const [badgePulsing, setBadgePulsing] = useState(false);

  // Reduced-motion check — read from the html attribute set by useSettings.
  const prefersReducedMotion = typeof window !== 'undefined' &&
    (document.documentElement.getAttribute('data-reduce-motion') === 'true' ||
     window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  // ---------------------------------------------------------------------------
  // Autoclicker burst emission timer (§4.6)
  // Fires every 1/(level × base_event_rate) seconds when autoclicker_count > 0.
  // Level speeds up both manual taps and autoclicker bursts.
  // ---------------------------------------------------------------------------
  const autoCount = genState.autoclicker_count;
  const effectiveRate = genState.level * def.base_event_rate;
  const burstIntervalMs = effectiveRate > 0 ? 1000 / effectiveRate : Infinity;

  useEffect(() => {
    if (autoCount <= 0 || burstIntervalMs === Infinity) return;

    const emitBurst = () => {
      // Badge pulse on every burst (200ms scale 1.0→1.05→1.0).
      if (!prefersReducedMotion) {
        setBadgePulsing(true);
        window.setTimeout(() => setBadgePulsing(false), 200);
      }

      // Suppress floating numbers under reduced-motion (§9.5) or setting.
      if (prefersReducedMotion || !showFloats) return;

      const rect = btnRef.current?.getBoundingClientRect();
      const perAutoTap = perAuto;

      if (autoCount > AUTO_FLOAT_DENSITY_CAP) {
        // Batched float: +total ×N
        const total = perAutoTap * autoCount;
        const id = nextId.current++;
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 25;
        const x = 50 + (Math.cos(angle) * radius / (rect?.width ?? 320)) * 100;
        const y = 50 + (Math.sin(angle) * radius / (rect?.height ?? 80)) * 100;
        setFloats((prev) => [...prev, { id, value: total, x, y, isAutoclick: true, batchCount: autoCount }]);
        window.setTimeout(() => {
          setFloats((prev) => prev.filter((f) => f.id !== id));
        }, FLOAT_TTL_MS);
      } else {
        // Individual staggered floats: min(N × 60ms, 400ms) stagger window.
        const staggerMs = Math.min(autoCount * 60, 400);
        const perItemDelay = autoCount > 1 ? staggerMs / (autoCount - 1) : 0;
        for (let i = 0; i < autoCount; i++) {
          window.setTimeout(() => {
            const id = nextId.current++;
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 25;
            const x = 50 + (Math.cos(angle) * radius / (rect?.width ?? 320)) * 100;
            const y = 50 + (Math.sin(angle) * radius / (rect?.height ?? 80)) * 100;
            setFloats((prev) => [...prev, { id, value: perAutoTap, x, y, isAutoclick: true }]);
            window.setTimeout(() => {
              setFloats((prev) => prev.filter((f) => f.id !== id));
            }, FLOAT_TTL_MS);
          }, i * perItemDelay);
        }
      }
    };

    const interval = window.setInterval(emitBurst, burstIntervalMs);
    return () => window.clearInterval(interval);
  }, [autoCount, burstIntervalMs, perAuto, prefersReducedMotion, showFloats]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Only show float feedback if the cooldown gate will accept the tap.
    const cdNow = Date.now();
    const lastTapNow = state.player.last_manual_click_at[verbId] ?? 0;
    if (cdNow - lastTapNow < cdMs) return;

    playClick();
    onClick(verbId);
    const id = nextId.current++;

    // Position the float near the mouse cursor with random scatter.
    // Keyboard-triggered clicks have clientX/Y = 0 — fall back to center.
    const rect = btnRef.current?.getBoundingClientRect();
    const isKeyboard = e.clientX === 0 && e.clientY === 0;
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 25;
    let x = 50 + (Math.cos(angle) * radius / (rect?.width ?? 320)) * 100;
    let y = 50 + (Math.sin(angle) * radius / (rect?.height ?? 80)) * 100;
    if (!isKeyboard && rect) {
      x = ((e.clientX - rect.left + Math.cos(angle) * radius) / rect.width) * 100;
      y = ((e.clientY - rect.top + Math.sin(angle) * radius) / rect.height) * 100;
    }

    if (showFloats) {
      setFloats((prev) => [...prev, { id, value: perTap, x, y }]);
      window.setTimeout(() => {
        setFloats((prev) => prev.filter((f) => f.id !== id));
      }, FLOAT_TTL_MS);
    }
  }, [onClick, verbId, perTap, cdMs, state.player.last_manual_click_at, showFloats]);

  const fillHeight = atFloor ? 100 : progress * 100;

  // Autoclicker count for badge and aria — per §4.2 the badge shows army size.
  const autoCountForBadge = genState.autoclicker_count;

  return (
    <div className="verb-btn-wrap">
      <span className="verb-badge">+<TieredNumber value={perTap} /></span>
      <button
        ref={btnRef}
        className={`live-verb-btn${isSpotlight ? ' live-verb-spotlight' : ''}${isReady || atFloor ? ' live-verb-ready' : ' live-verb-cooldown'}`}
        style={{
          '--verb-color': color,
          '--verb-color-dark': darkenHex(color),
          '--verb-color-rgb': hexToRgb(color),
          '--cd-fill': `${fillHeight}%`,
        } as React.CSSProperties}
        onClick={handleClick}
        aria-label={`${display.name}, ${fmtCompact(perTap)} engagement per tap, cooldown ${Math.round(cdMs)}ms${autoCountForBadge > 0 ? `, ${autoCountForBadge} autoclickers` : ''}`}
      >

        {/* Background image — direct child so it positions relative to the button */}
        {VERB_IMAGE[verbId] && (
          <img className="verb-icon-img" src={VERB_IMAGE[verbId]} alt="" aria-hidden="true" />
        )}

        <span className="verb-header">
          {!VERB_IMAGE[verbId] && <span className="verb-icon">{display.icon}</span>}
          <span className="verb-name-group">
            <span className="verb-name">
              {display.name.toUpperCase()}
              {/* Autoclicker badge — shows army size (§4.2). Hidden when 0.
                  Pulses on each autoclicker burst (§4.4). */}
              {autoCountForBadge > 0 && (
                <span className={`verb-auto-badge${badgePulsing ? ' verb-auto-badge-pulse' : ''}`}>
                  {' '}×{autoCountForBadge}
                </span>
              )}
            </span>
          </span>
        </span>


      {(isReady || atFloor) && state.player.engagement === 0 && (
        <span className="verb-pulse">READY</span>
      )}

      {!isReady && !atFloor && cdMs > 500 && (
        <span className="verb-cooldown-timer">
          {((cdMs - elapsed) / 1000).toFixed(cdMs >= 10000 ? 0 : 1)}s
        </span>
      )}

    </button>

      {/* Float feedback — ratio-scaled size & brightness.
          Rendered outside the button to avoid overflow:hidden clipping.
          Autoclicker floats render at 80% size, 0.7 opacity (§4.6). */}
      {floats.map((f) => {
        const fs = floatStyle(f.value, state.player.engagement);
        const autoScale = f.isAutoclick && !f.batchCount ? 0.8 : 1;
        const autoOpacity = f.isAutoclick ? (f.batchCount ? 0.85 : 0.7) : 1;
        return (
          <span
            key={f.id}
            className={`verb-float${f.isAutoclick ? ' verb-float-auto' : ''}`}
            style={{
              left: `${f.x}%`,
              top: `${f.y}%`,
              fontSize: fs.fontSize * autoScale,
              color: fs.color,
              opacity: autoOpacity,
            }}
          >
            +{fmtCompact(f.value)}{f.batchCount ? <span className="float-multiplier"> ×{f.batchCount}</span> : ''}
          </span>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GhostSlot
// ---------------------------------------------------------------------------

interface GhostSlotProps {
  verbId: GeneratorId;
  threshold: number;
  canAfford: boolean;
  cost: number;
  isAwakened: boolean;
  onUnlock: (verbId: GeneratorId) => void;
}

function GhostSlot({ verbId, threshold, canAfford, cost, isAwakened, onUnlock }: GhostSlotProps) {
  const display = GENERATOR_DISPLAY[verbId];
  const color = VERB_COLOR[verbId] ?? display.color;

  const handleClick = useCallback(() => {
    if (isAwakened && canAfford) {
      onUnlock(verbId);
    }
  }, [isAwakened, canAfford, verbId, onUnlock]);

  if (!isAwakened) {
    // Promise state — silhouette, 0.35 opacity, not tappable.
    return (
      <div
        className="ghost-slot ghost-promise"
        aria-label={`${display.name} locked at ${threshold} followers`}
      >
        {VERB_IMAGE[verbId]
          ? <img className="ghost-icon-img" src={VERB_IMAGE[verbId]} alt="" aria-hidden="true" />
          : <span className="ghost-icon" style={{ color }}>{display.icon}</span>
        }
        <span className="ghost-info">
          <span className="ghost-name">{display.name.toUpperCase()}</span>
          <span className="ghost-condition">at {threshold.toLocaleString()} followers</span>
        </span>
      </div>
    );
  }

  // Awakened state — full opacity, 80px, tappable.
  return (
    <button
      className={`ghost-slot ghost-awakened${!canAfford ? ' ghost-disabled' : ''}`}
      onClick={handleClick}
      aria-label={`Unlock ${display.name} for ${cost} engagement`}
      style={{ '--verb-color': color } as React.CSSProperties}
    >
      {VERB_IMAGE[verbId]
        ? <img className="ghost-icon-img" src={VERB_IMAGE[verbId]} alt="" aria-hidden="true" />
        : <span className="ghost-icon">{display.icon}</span>
      }
      <span className="ghost-info">
        <span className="ghost-name">{display.name.toUpperCase()}</span>
        <span className={`ghost-cost${!canAfford ? ' ghost-cost-disabled' : ''}`}>
          Tap to unlock — {fmtCompact(cost)} engagement
        </span>
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// ActionsColumn
// ---------------------------------------------------------------------------

interface ActionsColumnProps {
  state: GameState;
  staticData: StaticData;
  onClickVerb: (verbId: GeneratorId) => void;
  showVerbFloats?: boolean;
}

export function ActionsColumn({ state, staticData, onClickVerb, showVerbFloats = true }: ActionsColumnProps) {
  // Owned ladder verbs (live buttons), sorted by cooldown ascending
  // (shortest cooldown at top, longest at bottom).
  const liveVerbs = useMemo(() =>
    LADDER_VERBS
      .filter((id) => state.generators[id].owned)
      .sort((a, b) => {
        const cdA = verbCooldownMs(state.generators[a].level, staticData.generators[a].base_event_rate);
        const cdB = verbCooldownMs(state.generators[b].level, staticData.generators[b].base_event_rate);
        return cdA - cdB;
      }),
    [state.generators, staticData],
  );

  // Ghost: next un-owned verb whose threshold is met (or whose threshold is
  // not yet met — show it as a promise).
  const ghostVerb = useMemo(() => {
    for (const id of LADDER_VERBS) {
      if (!state.generators[id].owned) return id;
    }
    return null; // full ladder
  }, [state.generators]);

  // Spotlight disabled — cooldown-sorted ordering makes position-based
  // spotlight meaningless. All verbs render in the scroll region.

  // Ghost eligibility
  const ghostThreshold = ghostVerb
    ? staticData.unlockThresholds.generators[ghostVerb] ?? Infinity
    : Infinity;
  const ghostAwakened = ghostVerb !== null && state.player.total_followers >= ghostThreshold;
  return (
    <section className="actions-column">
      <div className="actions-scroll-region">
        {liveVerbs.map((id) => (
          <LiveVerbButton
            key={id}
            verbId={id}
            state={state}
            staticData={staticData}
            isSpotlight={false}
            onClick={onClickVerb}
            showFloats={showVerbFloats}
          />
        ))}

        {/* Ghost slot */}
        {ghostVerb && (
          <GhostSlot
            verbId={ghostVerb}
            threshold={ghostThreshold}
            canAfford={false}
            cost={0}
            isAwakened={ghostAwakened}
            onUnlock={() => {}}
          />
        )}
      </div>
    </section>
  );
}
