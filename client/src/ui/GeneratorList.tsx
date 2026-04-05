// Generator list — ledger of content types with category dividers (UX §6).
//
// Four differentiators per UX §6.1: icon, semantic color, category badge
// shape, and stable ordering grouped under category dividers. Locked rows
// are shown at 3:1 contrast with their unlock threshold (§6.4).
//
// Modifier chips reflect the effective algorithm multiplier (raw state
// modifier folded with the generator's trend_sensitivity — this is the
// number the player actually feels in their rates).
//
// Per purchase-feedback-and-rate-visibility.md:
// - §2.2: Generator rate text weight promoted to 500.
// - §4.2: Unowned buy button is full-width with name + cost sub-label (≥180×64px).
// - §4.2: Buy button border glows on press; shake on insufficient funds.
// - §6.1: Owned badge filled + breathing glow at tick cadence.
// - §6.3: First-purchase transition: badge fill + sparkle + breathing begins.
// - §6.4: Count numeral pulses on additional purchases.

import { useEffect, useRef, useState } from 'react';
import type { GameState, GeneratorId, StaticData } from '../types.ts';
import {
  generatorBuyCost,
  generatorUpgradeCost,
} from '../generator/index.ts';
import {
  computeGeneratorEffectiveRate,
  effectiveAlgorithmModifier,
} from '../game-loop/index.ts';
import { getAlgorithmModifier } from '../algorithm/index.ts';
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  GENERATOR_DISPLAY,
  GENERATOR_ORDER,
  type GeneratorCategory,
} from './display.ts';
import { fmtCompact } from './format.ts';

interface Props {
  state: GameState;
  staticData: StaticData;
  onBuy: (id: GeneratorId) => void;
  onUpgrade: (id: GeneratorId) => void;
}

const BADGE_SHAPE: Record<GeneratorCategory, string> = {
  starter: 'shape-circle',
  mid: 'shape-hexagon',
  late: 'shape-diamond',
};

// Breathing animation constants (per generator-badge-breathing proposal).
// Uniform 2.5s cadence, staggered by generator index so badges breathe
// organically rather than in sync. Rate-coupled cadence was considered and
// rejected — competing rhythms across 7 generators read as noise, not life.
const BREATHE_CYCLE_MS = 2500;
const BREATHE_TOTAL = GENERATOR_ORDER.length;

export function GeneratorList({ state, staticData, onBuy, onUpgrade }: Props) {
  // Track modifier pulses — when the algorithm state index changes, each
  // affected row pulses once (UX §4.4).
  const [pulseKey, setPulseKey] = useState(0);
  const prevIndex = useRef(state.algorithm.current_state_index);
  useEffect(() => {
    if (state.algorithm.current_state_index !== prevIndex.current) {
      prevIndex.current = state.algorithm.current_state_index;
      setPulseKey((k) => k + 1);
    }
  }, [state.algorithm.current_state_index]);

  // Build rows grouped by category in stable order.
  const byCategory = new Map<GeneratorCategory, GeneratorId[]>();
  for (const cat of CATEGORY_ORDER) byCategory.set(cat, []);
  for (const id of GENERATOR_ORDER) {
    const display = GENERATOR_DISPLAY[id];
    byCategory.get(display.category)?.push(id);
  }

  return (
    <section className="generator-list">
      {CATEGORY_ORDER.map((cat) => {
        const ids = byCategory.get(cat) ?? [];
        if (ids.length === 0) return null;
        return (
          <div key={cat}>
            <div className="category-divider">{CATEGORY_LABEL[cat]}</div>
            {ids.map((id) => (
              <GeneratorRow
                key={id}
                id={id}
                state={state}
                staticData={staticData}
                onBuy={onBuy}
                onUpgrade={onUpgrade}
                pulseKey={pulseKey}
              />
            ))}
          </div>
        );
      })}
    </section>
  );
}

// ---------------------------------------------------------------------------

interface RowProps {
  id: GeneratorId;
  state: GameState;
  staticData: StaticData;
  onBuy: (id: GeneratorId) => void;
  onUpgrade: (id: GeneratorId) => void;
  pulseKey: number;
}

function GeneratorRow({
  id,
  state,
  staticData,
  onBuy,
  onUpgrade,
  pulseKey,
}: RowProps) {
  const g = state.generators[id];
  const def = staticData.generators[id];
  const display = GENERATOR_DISPLAY[id];
  const threshold = staticData.unlockThresholds.generators[id] ?? 0;

  const thresholdMet = state.player.total_followers >= threshold;
  const isDiscovered = g.owned || thresholdMet;

  const rawMod = getAlgorithmModifier(state.algorithm, id);
  const effMod = effectiveAlgorithmModifier(rawMod, def.trend_sensitivity);

  const rate = computeGeneratorEffectiveRate(g, state, staticData);

  const badgeShape = BADGE_SHAPE[display.category];
  const style = { '--gen-color': display.color } as React.CSSProperties;

  // First-purchase animation — fires once when owned transitions false → true.
  const prevOwned = useRef(g.owned);
  const [firstBuyAnim, setFirstBuyAnim] = useState(false);
  useEffect(() => {
    if (g.owned && !prevOwned.current) {
      setFirstBuyAnim(true);
      const t = window.setTimeout(() => setFirstBuyAnim(false), 600);
      prevOwned.current = true;
      return () => window.clearTimeout(t);
    }
    prevOwned.current = g.owned;
  }, [g.owned]);

  // Count numeral pulse — fires when count increases on an owned generator.
  const prevCount = useRef(g.count);
  const [countPulsing, setCountPulsing] = useState(false);
  useEffect(() => {
    if (g.owned && g.count > prevCount.current) {
      setCountPulsing(true);
      const t = window.setTimeout(() => setCountPulsing(false), 400);
    }
    prevCount.current = g.count;
  }, [g.owned, g.count]);

  // Breathing phase offset: stagger each badge so they don't all peak together.
  // Negative delay starts each badge mid-cycle immediately on mount.
  const generatorIndex = GENERATOR_ORDER.indexOf(id);
  const breatheDelayMs = generatorIndex >= 0
    ? -Math.round((generatorIndex / BREATHE_TOTAL) * BREATHE_CYCLE_MS)
    : 0;

  if (!isDiscovered) {
    return (
      <div className="generator-row locked" style={style}>
        <div className={`badge hollow ${badgeShape}`} />
        <div className="unlock-label">
          Unlocks at {threshold.toLocaleString()} followers
        </div>
      </div>
    );
  }

  if (!g.owned) {
    // Unowned, threshold met — show a full buy affordance per spec §4.2.
    const buyCost = generatorBuyCost(id, 0, staticData);
    const canBuy = state.player.engagement >= buyCost;
    return (
      <div className="generator-row generator-row-unowned" style={style}>
        <div className={`badge hollow ${badgeShape}`}>{display.icon}</div>
        <div className="unowned-info">
          <div className="generator-name">{display.name}</div>
          <ModifierChip value={effMod} pulseKey={pulseKey} />
        </div>
        <BuyButton
          label={`Buy ${display.name}`}
          costLabel={`cost: ${fmtCompact(buyCost)} engagement`}
          canBuy={canBuy}
          onBuy={() => onBuy(id)}
        />
      </div>
    );
  }

  const buyCost = generatorBuyCost(id, g.count, staticData);
  const upgradeCost = generatorUpgradeCost(id, g.level, staticData);
  const canBuy = state.player.engagement >= buyCost;
  const canUpgrade = state.player.engagement >= upgradeCost;

  return (
    <div
      className={`generator-row${firstBuyAnim ? ' first-buy-anim' : ''}`}
      style={style}
    >
      <div
        className={`badge ${badgeShape}${g.owned ? ' badge-owned' : ''}`}
        style={g.owned ? { '--breathe-delay': `${breatheDelayMs}ms` } as React.CSSProperties : undefined}
      >
        {display.icon}
      </div>
      <div className="generator-name">
        {display.name} <span className="generator-level">L{g.level}</span>
      </div>
      <div className={`generator-count${countPulsing ? ' count-pulse' : ''}`}>
        ×{g.count}
      </div>
      <div className="generator-rate">{fmtCompact(rate)}/s</div>
      <ModifierChip value={effMod} pulseKey={pulseKey} />
      <div className="row-actions">
        <CompactBuyButton
          costLabel={fmtCompact(buyCost)}
          canBuy={canBuy}
          onBuy={() => onBuy(id)}
        />
        <button
          className="row-btn"
          onClick={() => onUpgrade(id)}
          disabled={!canUpgrade}
          title={`Upgrade to L${g.level + 1} for ${fmtCompact(upgradeCost)} engagement`}
        >
          <span className="label">Lvl ↑</span>
          {fmtCompact(upgradeCost)}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Buy button — full-spec anatomy for first purchase (§4.2).

interface BuyButtonProps {
  label: string;
  costLabel: string;
  canBuy: boolean;
  onBuy: () => void;
}

function BuyButton({ label, costLabel, canBuy, onBuy }: BuyButtonProps) {
  const [shaking, setShaking] = useState(false);
  const [glowing, setGlowing] = useState(false);

  const handleClick = () => {
    if (!canBuy) {
      setShaking(true);
      window.setTimeout(() => setShaking(false), 200);
      return;
    }
    setGlowing(true);
    window.setTimeout(() => setGlowing(false), 200);
    onBuy();
  };

  return (
    <button
      className={`buy-btn${!canBuy ? ' buy-btn-disabled' : ''}${shaking ? ' buy-btn-shake' : ''}${glowing ? ' buy-btn-glow' : ''}`}
      onClick={handleClick}
      aria-disabled={!canBuy}
      // Not using `disabled` so we can intercept click for shake feedback.
    >
      <span className="buy-btn-label">{label}</span>
      <span className={`buy-btn-cost${!canBuy ? ' buy-btn-cost-amber' : ''}`}>
        {costLabel}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Compact buy button — for owned rows (additional purchase, §6.4).

interface CompactBuyButtonProps {
  costLabel: string;
  canBuy: boolean;
  onBuy: () => void;
}

function CompactBuyButton({ costLabel, canBuy, onBuy }: CompactBuyButtonProps) {
  const [shaking, setShaking] = useState(false);
  const [glowing, setGlowing] = useState(false);

  const handleClick = () => {
    if (!canBuy) {
      setShaking(true);
      window.setTimeout(() => setShaking(false), 200);
      return;
    }
    setGlowing(true);
    window.setTimeout(() => setGlowing(false), 200);
    onBuy();
  };

  return (
    <button
      className={`row-btn${shaking ? ' row-btn-shake' : ''}${glowing ? ' row-btn-buy-glow' : ''}${!canBuy ? ' row-btn-disabled' : ''}`}
      onClick={handleClick}
      aria-disabled={!canBuy}
      title={`Buy 1 unit for ${costLabel} engagement`}
    >
      <span className="label">Buy</span>
      {costLabel}
    </button>
  );
}

// ---------------------------------------------------------------------------

interface ChipProps {
  value: number;
  pulseKey: number;
}

function ModifierChip({ value, pulseKey }: ChipProps) {
  const [pulsing, setPulsing] = useState(false);
  useEffect(() => {
    if (pulseKey === 0) return; // don't pulse on initial render
    setPulsing(true);
    const t = window.setTimeout(() => setPulsing(false), 400);
    return () => window.clearTimeout(t);
  }, [pulseKey]);

  // Per UX §4.5: green for boosted (>1.0), amber for penalized (<1.0),
  // neutral for ≈ 1.0. We treat within ±2% as neutral.
  const kind =
    value > 1.02 ? 'boost' : value < 0.98 ? 'penalty' : 'neutral';
  const arrow = kind === 'boost' ? '▲' : kind === 'penalty' ? '▼' : '—';
  return (
    <span
      className={`modifier-chip ${kind}${pulsing ? ' pulse' : ''}`}
      aria-label={`algorithm modifier ${value.toFixed(2)}x`}
    >
      {arrow} ×{value.toFixed(2)}
    </span>
  );
}
