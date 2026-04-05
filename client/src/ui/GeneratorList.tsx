// Generator list — ledger of content types with category dividers (UX §6).
//
// Four differentiators per UX §6.1: icon, semantic color, category badge
// shape, and stable ordering grouped under category dividers. Locked rows
// are shown at 3:1 contrast with their unlock threshold (§6.4).
//
// Modifier chips reflect the effective algorithm multiplier (raw state
// modifier folded with the generator's trend_sensitivity — this is the
// number the player actually feels in their rates).

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

  // Does the player know this generator exists at all? We show owned rows
  // at full opacity, and rows whose threshold has not been met at 3:1.
  // Rows whose threshold has been met but not yet bought appear at full
  // opacity so the "buy" affordance is unmistakable.
  const thresholdMet = state.player.total_followers >= threshold;
  const isDiscovered = g.owned || thresholdMet;

  const rawMod = getAlgorithmModifier(state.algorithm, id);
  const effMod = effectiveAlgorithmModifier(rawMod, def.trend_sensitivity);

  const rate = computeGeneratorEffectiveRate(g, state, staticData);

  const badgeShape = BADGE_SHAPE[display.category];
  const style = { '--gen-color': display.color } as React.CSSProperties;

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
    // Threshold met but not bought yet → show buy affordance.
    const buyCost = generatorBuyCost(id, 0, staticData);
    const canBuy = state.player.engagement >= buyCost;
    return (
      <div className="generator-row" style={style}>
        <div className={`badge hollow ${badgeShape}`}>{display.icon}</div>
        <div className="generator-name">{display.name}</div>
        <div className="generator-count">×0</div>
        <div className="generator-rate">—</div>
        <ModifierChip value={effMod} pulseKey={pulseKey} />
        <div className="row-actions">
          <button
            className="row-btn"
            onClick={() => onBuy(id)}
            disabled={!canBuy}
            title={`Buy for ${fmtCompact(buyCost)} engagement`}
          >
            <span className="label">Buy</span>
            {fmtCompact(buyCost)}
          </button>
        </div>
      </div>
    );
  }

  const buyCost = generatorBuyCost(id, g.count, staticData);
  const upgradeCost = generatorUpgradeCost(id, g.level, staticData);
  const canBuy = state.player.engagement >= buyCost;
  const canUpgrade = state.player.engagement >= upgradeCost;

  return (
    <div className="generator-row" style={style}>
      <div className={`badge ${badgeShape}`}>{display.icon}</div>
      <div className="generator-name">
        {display.name} <span style={{ opacity: 0.55, fontSize: 11 }}>L{g.level}</span>
      </div>
      <div className="generator-count">×{g.count}</div>
      <div className="generator-rate">{fmtCompact(rate)}/s</div>
      <ModifierChip value={effMod} pulseKey={pulseKey} />
      <div className="row-actions">
        <button
          className="row-btn"
          onClick={() => onBuy(id)}
          disabled={!canBuy}
          title={`Buy 1 unit for ${fmtCompact(buyCost)} engagement`}
        >
          <span className="label">Buy</span>
          {fmtCompact(buyCost)}
        </button>
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
