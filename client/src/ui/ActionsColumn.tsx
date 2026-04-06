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

import { useCallback, useMemo, useRef, useState } from 'react';
import type { GameState, GeneratorId, StaticData } from '../types.ts';
import {
  levelMultiplier,
  effectiveAlgorithmModifier,
  cloutBonus,
} from '../game-loop/index.ts';
import { getAlgorithmModifier } from '../algorithm/index.ts';
import { kitEngagementBonus } from '../creator-kit/index.ts';
import { GENERATOR_DISPLAY } from './display.ts';
import { fmtCompact } from './format.ts';

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
function yieldPerTap(
  verbId: GeneratorId,
  state: GameState,
  staticData: StaticData,
): number {
  const def = staticData.generators[verbId];
  const genState = state.generators[verbId];
  const rawMod = getAlgorithmModifier(state.algorithm, verbId);
  const algoMod = effectiveAlgorithmModifier(rawMod, def.trend_sensitivity);
  const clout = cloutBonus(state.player.clout_upgrades, staticData);
  const kit = kitEngagementBonus(state.player.creator_kit, staticData);
  return def.base_event_yield * levelMultiplier(genState.level) * algoMod * clout * kit;
}

/** Cooldown in ms for a verb at its current count. */
function cooldownMs(verbId: GeneratorId, state: GameState, staticData: StaticData): number {
  const def = staticData.generators[verbId];
  const count = state.generators[verbId].count;
  return 1000 / (Math.max(1, count) * def.base_event_rate);
}

// ---------------------------------------------------------------------------
// FloatItem for tap feedback
// ---------------------------------------------------------------------------

interface FloatItem {
  id: number;
  value: number;
  offsetX: number;
}

const FLOAT_TTL_MS = 500;
const STACK_OFFSET_MAX_PX = 30;

// ---------------------------------------------------------------------------
// LiveVerbButton
// ---------------------------------------------------------------------------

interface LiveVerbButtonProps {
  verbId: GeneratorId;
  state: GameState;
  staticData: StaticData;
  isSpotlight: boolean;
  onClick: (verbId: GeneratorId) => void;
}

function LiveVerbButton({ verbId, state, staticData, isSpotlight, onClick }: LiveVerbButtonProps) {
  const genState = state.generators[verbId];
  const display = GENERATOR_DISPLAY[verbId];
  const color = VERB_COLOR[verbId] ?? display.color;
  const perTap = yieldPerTap(verbId, state, staticData);
  const cdMs = cooldownMs(verbId, state, staticData);
  const lastTap = state.player.last_manual_click_at[verbId] ?? 0;

  // Cooldown progress (0 = just tapped, 1 = ready).
  // Use Date.now() at render time — re-renders at 10Hz via tick.
  const now = Date.now();
  const elapsed = now - lastTap;
  const progress = lastTap === 0 ? 1 : Math.min(1, elapsed / cdMs);
  const isReady = progress >= 1;

  // At the cooldown floor (<=100ms), stop animating — always ready.
  const atFloor = cdMs <= 100;

  // Float feedback
  const [floats, setFloats] = useState<FloatItem[]>([]);
  const nextId = useRef(0);

  const handleClick = useCallback(() => {
    // Only show float feedback if the cooldown gate will accept the tap.
    // Mirror the engine's gate: cooldownMs = 1000 / (max(1, count) × rate).
    const cdNow = Date.now();
    const lastTapNow = state.player.last_manual_click_at[verbId] ?? 0;
    if (cdNow - lastTapNow < cdMs) return; // cooldown — no feedback

    onClick(verbId);
    const id = nextId.current++;
    const offsetX = (Math.random() - 0.5) * STACK_OFFSET_MAX_PX;
    setFloats((prev) => [...prev, { id, value: perTap, offsetX }]);
    window.setTimeout(() => {
      setFloats((prev) => prev.filter((f) => f.id !== id));
    }, FLOAT_TTL_MS);
  }, [onClick, verbId, perTap, cdMs, state.player.last_manual_click_at]);

  const fillHeight = atFloor ? 100 : progress * 100;

  return (
    <button
      className={`live-verb-btn${isSpotlight ? ' live-verb-spotlight' : ''}${isReady || atFloor ? ' live-verb-ready' : ' live-verb-cooldown'}`}
      style={{
        '--verb-color': color,
        '--verb-color-rgb': hexToRgb(color),
        '--cd-fill': `${fillHeight}%`,
      } as React.CSSProperties}
      onClick={handleClick}
      aria-label={`${display.name}, ${fmtCompact(perTap)} engagement per tap, cooldown ${Math.round(cdMs)}ms`}
    >

      <span className="verb-header">
        <span className="verb-icon">{display.icon}</span>
        <span className="verb-name">{display.name.toUpperCase()}</span>
        {genState.count > 0 && (
          <span className="verb-badge" style={{ color, backgroundColor: `${color}40` }}>
            x{genState.count}
          </span>
        )}
      </span>

      <span className="verb-data">
        <span className="verb-yield">{fmtCompact(perTap)} eng/tap</span>
        {(isReady || atFloor) && (
          <span className="verb-pulse" style={{ backgroundColor: color }}>
            {lastTap === 0 ? 'ready' : ''}
          </span>
        )}
      </span>

      {/* Float feedback */}
      {floats.map((f) => (
        <span
          key={f.id}
          className="verb-float"
          style={{ left: `calc(50% + ${f.offsetX}px)` }}
        >
          +{fmtCompact(f.value)}
        </span>
      ))}
    </button>
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
        <span className="ghost-icon" style={{ color }}>{display.icon}</span>
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
      <span className="ghost-icon">{display.icon}</span>
      <span className="ghost-info">
        <span className="ghost-name">{display.name.toUpperCase()}</span>
        <span className={`ghost-cost${!canAfford ? ' ghost-cost-disabled' : ''}`}>
          Tap to unlock — {cost} engagement
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
  onUnlockVerb: (verbId: GeneratorId) => void;
}

export function ActionsColumn({ state, staticData, onClickVerb, onUnlockVerb }: ActionsColumnProps) {
  // Owned ladder verbs (live buttons), sorted by cooldown ascending
  // (shortest cooldown at top, longest at bottom).
  const liveVerbs = useMemo(() =>
    LADDER_VERBS
      .filter((id) => state.generators[id].owned)
      .sort((a, b) => {
        const cdA = 1000 / (Math.max(1, state.generators[a].count) * staticData.generators[a].base_event_rate);
        const cdB = 1000 / (Math.max(1, state.generators[b].count) * staticData.generators[b].base_event_rate);
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
  const ghostCost = ghostVerb ? staticData.generators[ghostVerb].base_buy_cost : 0;
  const ghostCanAfford = ghostVerb !== null && state.player.engagement >= ghostCost;

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
          />
        ))}

        {/* Ghost slot */}
        {ghostVerb && (
          <GhostSlot
            verbId={ghostVerb}
            threshold={ghostThreshold}
            canAfford={ghostCanAfford}
            cost={ghostCost}
            isAwakened={ghostAwakened}
            onUnlock={onUnlockVerb}
          />
        )}
      </div>
    </section>
  );
}
