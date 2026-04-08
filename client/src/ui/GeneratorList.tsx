// Generator list — ledger of content types with category dividers (UX §6).
//
// Four differentiators per UX §6.1: icon, semantic color, category badge
// shape, and stable ordering grouped under category dividers. Locked rows
// are shown at 3:1 contrast with their unlock threshold (§6.4).
//
// Per purchase-feedback-and-rate-visibility.md:
// - §2.2: Generator rate text weight promoted to 500.
// - §4.2: Unowned buy button is full-width with name + cost sub-label (≥180×64px).
// - §4.2: Buy button border glows on press; shake on insufficient funds.
// - §6.1: Owned badge filled + breathing glow at tick cadence.
// - §6.3: First-purchase transition: badge fill + sparkle + breathing begins.
// - §6.4: Count numeral pulses on additional purchases.

import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import type { GameState, GeneratorId, StaticData, VerbGearId } from '../types.ts';
import { canPurchaseVerbGear, verbGearCost } from '../verb-gear/index.ts';
import type { SweepItemType, SweepPurchaseEvent } from '../driver/index.ts';
import { playWow } from './sfx.ts';
import {
  autoclickerBuyCost,
  autoclickerCap,
  generatorBuyCost,
  generatorUpgradeCost,
} from '../generator/index.ts';
import {
  CATEGORY_ORDER,
  GENERATOR_DISPLAY,
  GENERATOR_ORDER,
  POST_PRESTIGE_GENERATORS,
  type GeneratorCategory,
} from './display.ts';
import { fmtCompact } from './format.ts';
import { TieredNumber } from './TieredNumber.tsx';

interface Props {
  state: GameState;
  staticData: StaticData;
  onBuy: (id: GeneratorId) => void;
  onUpgrade: (id: GeneratorId) => void;
  /** Purchase an autoclicker for a manual-clickable verb. */
  onBuyAutoclicker: (verbId: GeneratorId) => void;
  /** Purchase the next verb gear level for a manual-clickable verb. */
  onBuyVerbGear: (gearId: VerbGearId) => void;
  /** When set, the matching row gets a pulsing gold halo (UX §9.2 Phase 1–2). */
  viralGeneratorId?: GeneratorId | null;
  /** Whether an auto-buy sweep is currently running. */
  sweepActive: boolean;
  /** Whether at least one purchase is affordable right now (live). */
  sweepCanAfford: boolean;
  /** Start the auto-buy sweep. */
  onStartSweep: () => void;
  /** Cancel a running sweep. */
  onCancelSweep: () => void;
  /** Last sweep purchase event — triggers scale-pop on the matching button. */
  lastSweepPurchase: SweepPurchaseEvent | null;
  /** Monotonic counter — increments on each sweep purchase for re-trigger detection. */
  sweepPurchaseSeq: number;
}

// ---------------------------------------------------------------------------
// Pure helpers — exported for unit tests (task #69).
// ---------------------------------------------------------------------------

/**
 * Affordance states for the per-row SPEED button.
 *
 * - armed:   engagement < upgradeCost. Clickable, but the teased
 *            action is out of reach. Stillness communicates "not now."
 * - ready:   engagement >= upgradeCost. Breathes gold to pull
 *            the eye toward the button.
 * - maxed:   level >= max_level — the cap is hit, no further upgrade is
 *            possible. Shows "MAX" in place of cost. Task #89.
 *
 * See proposals/accepted/lvl-up-button-affordance-states.md and
 * proposals/accepted/generator-level-growth-curves.md.
 */
export type LvlBtnState = 'armed' | 'ready' | 'maxed';

export function classifyLvlBtnState(
  _count: number,
  level: number,
  maxLevel: number,
  engagement: number,
  upgradeCost: number,
): LvlBtnState {
  if (level >= maxLevel) return 'maxed';
  if (engagement >= upgradeCost) return 'ready';
  return 'armed';
}

/** Minimum number of simultaneously-ready rows to trigger de-escalation. */
export const MANY_READY_THRESHOLD = 4;

/**
 * Decide whether the one-shot maxed arrival celebration should fire on the
 * current render.
 *
 * Fires only on a live, in-session transition INTO 'maxed'. Specifically:
 *   - current state must be 'maxed'
 *   - prev state must be non-null (null = first render; mount guard — we
 *     do NOT celebrate generators that loaded from save already at max)
 *   - prev state must be something other than 'maxed'
 *
 * See ux/generator-max-level-state.md §4.1. Task #101.
 */
export function shouldFireMaxedArrival(
  current: LvlBtnState,
  prev: LvlBtnState | null,
): boolean {
  if (current !== 'maxed') return false;
  if (prev === null) return false;       // mount guard
  if (prev === 'maxed') return false;    // already maxed, no re-fire
  return true;
}

/** Duration of the arrival celebration, in ms (matches CSS keyframes). */
export const LVL_MAXED_ARRIVAL_MS = 600;

/**
 * Returns true when the generator-list should de-escalate ready-state
 * breathing because too many rows would flash at once. Threshold from spec.
 */
export function shouldApplyManyReady(readyCount: number): boolean {
  return readyCount >= MANY_READY_THRESHOLD;
}

// Breathing animation constants (per generator-badge-breathing proposal).
// Uniform 2.5s cadence, staggered by generator index so badges breathe
// organically rather than in sync. Rate-coupled cadence was considered and
// rejected — competing rhythms across 7 generators read as noise, not life.
const BREATHE_CYCLE_MS = 2500;
const BREATHE_TOTAL = GENERATOR_ORDER.length;

export function GeneratorList({ state, staticData, onBuy, onUpgrade, onBuyAutoclicker, onBuyVerbGear, viralGeneratorId, sweepActive, sweepCanAfford, onStartSweep, onCancelSweep, lastSweepPurchase, sweepPurchaseSeq }: Props) {
  // Build rows grouped by category in stable order.
  // Post-prestige generators (ai_slop, deepfakes, algorithmic_prophecy) are
  // excluded from the main list — they render in the Clout Shop modal instead.
  // Task #70: filter out post-prestige generators until Clout Shop ships.
  const byCategory = new Map<GeneratorCategory, GeneratorId[]>();
  for (const cat of CATEGORY_ORDER) byCategory.set(cat, []);
  for (const id of GENERATOR_ORDER) {
    if (POST_PRESTIGE_GENERATORS.includes(id)) continue;
    const display = GENERATOR_DISPLAY[id];
    byCategory.get(display.category)?.push(id);
  }

  // Count rows currently in the 'ready' state so the list can de-escalate
  // breathing intensity when 4+ rows would pulse simultaneously (spec §"Many
  // ready at once"). Iterates the same set the list renders — post-prestige
  // generators and locked rows are excluded.
  let readyCount = 0;
  for (const [cat, ids] of byCategory) {
    void cat;
    for (const id of ids) {
      const g = state.generators[id];
      if (!g?.owned || g.count <= 0) continue;
      const def = staticData.generators[id];
      if (g.level >= def.max_level) continue;
      const cost = generatorUpgradeCost(id, g.level, staticData);
      if (state.player.engagement >= cost) readyCount += 1;
    }
  }
  const manyReady = shouldApplyManyReady(readyCount);

  return (
    <section className={`generator-list${manyReady ? ' many-ready' : ''}`}>
      <BuyAllButton
        sweepActive={sweepActive}
        canAfford={sweepCanAfford}
        onStartSweep={onStartSweep}
        onCancelSweep={onCancelSweep}
        sweepPurchaseSeq={sweepPurchaseSeq}
      />
      {CATEGORY_ORDER.map((cat) => {
        const ids = byCategory.get(cat) ?? [];
        if (ids.length === 0) return null;
        return (
          <div key={cat}>
            {ids.map((id) => (
              <GeneratorRow
                key={id}
                id={id}
                state={state}
                staticData={staticData}
                onBuy={onBuy}
                onUpgrade={onUpgrade}
                onBuyAutoclicker={onBuyAutoclicker}
                onBuyVerbGear={onBuyVerbGear}
                viralHalo={viralGeneratorId === id}
                sweepHitType={lastSweepPurchase?.generatorId === id ? lastSweepPurchase.type : null}
                sweepHitCost={lastSweepPurchase?.generatorId === id ? lastSweepPurchase.cost : 0}
                sweepHitSeq={sweepPurchaseSeq}
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
  onBuyAutoclicker: (verbId: GeneratorId) => void;
  onBuyVerbGear: (gearId: VerbGearId) => void;
  /** True while this row is the viral burst source (UX §9.2 Phase 1–2). */
  viralHalo?: boolean;
  /** Which button (if any) was just hit by a sweep purchase on this row. */
  sweepHitType: SweepItemType | null;
  /** Cost of the sweep purchase (for the float label). */
  sweepHitCost: number;
  /** Monotonic counter — increments on every sweep purchase for re-trigger detection. */
  sweepHitSeq: number;
}

function GeneratorRow({
  id,
  state,
  staticData,
  onBuy,
  onUpgrade,
  onBuyAutoclicker,
  onBuyVerbGear,
  viralHalo,
  sweepHitType,
  sweepHitCost,
  sweepHitSeq,
}: RowProps) {
  const g = state.generators[id];
  const def = staticData.generators[id];
  const display = GENERATOR_DISPLAY[id];
  const threshold = staticData.unlockThresholds.generators[id] ?? 0;

  const thresholdMet = state.player.total_followers >= threshold;
  const isDiscovered = g.owned || thresholdMet;

  const style = { '--gen-color': display.color } as React.CSSProperties;

  // Row ref — used to read bounding rect for drawer anchor and sweep floats.
  // Declared before the sweep-hit effect so the ref is available.
  const rowRef = useRef<HTMLDivElement>(null);

  // Cost float — one at a time per row, used by both sweep and manual purchases.
  const [costFloat, setCostFloat] = useState<{ key: number; cost: number; top: number; right: number } | null>(null);
  const costFloatId = useRef(0);
  const costFloatTimer = useRef<number | null>(null);

  // Clean up any pending cost-float timeout on unmount.
  useEffect(() => {
    return () => {
      if (costFloatTimer.current !== null) {
        window.clearTimeout(costFloatTimer.current);
        costFloatTimer.current = null;
      }
    };
  }, []);

  const spawnCostFloat = (btnType: SweepItemType, cost: number) => {
    const btnSelector = btnType === 'buy' ? '.row-btn:not(.row-btn-upgrade)'
      : btnType === 'upgrade' ? '.row-btn-upgrade'
      : '.purchase-pill-auto';
    const btnEl = rowRef.current?.querySelector(btnSelector);
    const rect = (btnEl ?? rowRef.current)?.getBoundingClientRect();
    const key = costFloatId.current++;
    const top = rect ? rect.top - 4 : 0;
    const right = rect ? window.innerWidth - rect.right : 0;
    setCostFloat({ key, cost, top, right });
    if (costFloatTimer.current !== null) window.clearTimeout(costFloatTimer.current);
    costFloatTimer.current = window.setTimeout(() => {
      setCostFloat((prev) => prev?.key === key ? null : prev);
      costFloatTimer.current = null;
    }, 800);
  };

  // Sweep-hit animation — fires when a sweep purchase targets this row's
  // buy / upgrade / autoclicker button. Toggles a class for 64ms + spawns cost float.
  const [sweepHitBtn, setSweepHitBtn] = useState<SweepItemType | null>(null);
  const prevSweepSeq = useRef(0);
  useEffect(() => {
    if (sweepHitType && sweepHitSeq !== prevSweepSeq.current) {
      prevSweepSeq.current = sweepHitSeq;
      setSweepHitBtn(sweepHitType);
      const t = window.setTimeout(() => setSweepHitBtn(null), 64);
      spawnCostFloat(sweepHitType, sweepHitCost);
      return () => { window.clearTimeout(t); };
    }
  }, [sweepHitType, sweepHitCost, sweepHitSeq]);

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
  const [_countPulsing, setCountPulsing] = useState(false);
  useEffect(() => {
    if (g.owned && g.count > prevCount.current) {
      setCountPulsing(true);
      window.setTimeout(() => setCountPulsing(false), 400);
    }
    prevCount.current = g.count;
  }, [g.owned, g.count]);

  // Breathing phase offset: stagger each badge so they don't all peak together.
  // Negative delay starts each badge mid-cycle immediately on mount.
  const generatorIndex = GENERATOR_ORDER.indexOf(id);
  const breatheDelayMs = generatorIndex >= 0
    ? -Math.round((generatorIndex / BREATHE_TOTAL) * BREATHE_CYCLE_MS)
    : 0;

  // Lvl ↑ affordance state computed UNCONDITIONALLY so the hooks below can
  // depend on it without skipping on unowned/locked renders. classifyLvlBtnState
  // returns 'dormant' when count===0, which is correct for pre-owned rows.
  const upgradeCostUnconditional = g.level >= def.max_level ? Infinity : generatorUpgradeCost(id, g.level, staticData);
  const lvlStateUnconditional = classifyLvlBtnState(
    g.count,
    g.level,
    def.max_level,
    state.player.engagement,
    upgradeCostUnconditional,
  );

  // Maxed arrival celebration — one-shot (600ms) on the live ready→maxed
  // transition within a session. Mount guard: prevLvlState is null on the
  // first render, so generators loaded from save already at max do NOT fire.
  // Spec: ux/generator-max-level-state.md §4.
  //
  // IMPORTANT: these hooks MUST be declared before any early returns below,
  // so hook order stays stable across locked→discovered and unowned→owned
  // transitions. Rules of Hooks.
  const prevLvlState = useRef<LvlBtnState | null>(null);
  const [maxedArrival, setMaxedArrival] = useState(false);
  useEffect(() => {
    const prev = prevLvlState.current;
    if (shouldFireMaxedArrival(lvlStateUnconditional, prev)) {
      setMaxedArrival(true);
      const t = window.setTimeout(() => setMaxedArrival(false), LVL_MAXED_ARRIVAL_MS);
      prevLvlState.current = lvlStateUnconditional;
      return () => window.clearTimeout(t);
    }
    prevLvlState.current = lvlStateUnconditional;
  }, [lvlStateUnconditional]);

  if (!isDiscovered) {
    return (
      <div className="generator-row locked" style={style}>
        <div className="unlock-label">
          Unlocks at {threshold.toLocaleString()} followers
        </div>
      </div>
    );
  }

  if (!g.owned) {
    // Unowned, threshold met — show a full buy affordance per spec §4.2.
    // Manual-clickable gens route through unlock; passive gens through buy.
    const def = staticData.generators[id];
    const buyCost = def.manual_clickable ? def.base_buy_cost : generatorBuyCost(id, 0, staticData);
    const canBuy = state.player.engagement >= buyCost;
    const handleBuy = () => onBuy(id);
    const label = `Buy ${display.name}`;
    return (
      <div className="generator-row generator-row-unowned" style={style}>
        <div className="unowned-info">
          <div className="generator-name">{display.name}</div>
        </div>
        <BuyButton
          label={label}
          costLabel={`cost: ${fmtCompact(buyCost)} engagement`}
          canBuy={canBuy}
          onBuy={handleBuy}
        />
      </div>
    );
  }

  const buyCost = generatorBuyCost(id, g.count, staticData);
  const upgradeCost = upgradeCostUnconditional;
  const canBuy = state.player.engagement >= buyCost;
  // Autoclicker cost — only relevant for manual-clickable generators.
  const autoCost = def.manual_clickable ? autoclickerBuyCost(id, g.autoclicker_count, staticData) : 0;
  const canBuyAuto = def.manual_clickable && state.player.engagement >= autoCost;

  // Lvl ↑ button affordance state — spec tracks distinct visuals
  // (dormant / armed / ready / maxed) so players can tell at a glance
  // whether tapping the button opens a drawer they can act on.
  // Tasks #69 (three states) + #89 (MAX cap). Computed above early returns
  // so hook order stays stable.
  const lvlState = lvlStateUnconditional;
  const lvlDeficit = Math.max(0, upgradeCost - state.player.engagement);

  return (
    <div
      ref={rowRef}
      className={`generator-row${firstBuyAnim ? ' first-buy-anim' : ''}${viralHalo ? ' viral-halo' : ''}`}
      style={style}
    >
      <div className="generator-name">
        {display.name}
      </div>
      <div className="row-actions" onClick={(e) => e.stopPropagation()}>
        <CompactBuyButton
          costLabel={<TieredNumber value={buyCost} />}
          costText={fmtCompact(buyCost)}
          canBuy={canBuy}
          count={g.count}
          onBuy={() => { onBuy(id); spawnCostFloat('buy', buyCost); }}
          sweepHit={sweepHitBtn === 'buy'}
        />
        {/* SPEED — fires upgrade directly (task #150).
            Two affordance states:
              armed   (can't afford): greyed out
              ready   (affordable): gold breathing halo */}
        <SpeedButton
          lvlState={lvlState}
          maxedArrival={maxedArrival}
          breatheDelayMs={breatheDelayMs}
          canAfford={state.player.engagement >= upgradeCost}
          level={g.level}
          onUpgrade={() => { onUpgrade(id); spawnCostFloat('upgrade', upgradeCost); }}
          sweepHit={sweepHitBtn === 'upgrade'}
          title={
            lvlState === 'maxed'
                ? `${display.name} is at max level (L${g.level})`
                : lvlState === 'armed'
                  ? `Upgrade ${display.name} (L${g.level} → L${g.level + 1} costs ${fmtCompact(upgradeCost)}) — ${fmtCompact(lvlDeficit)} more engagement`
                  : `Upgrade ${display.name} (L${g.level} → L${g.level + 1} costs ${fmtCompact(upgradeCost)}) — ready`
          }
          ariaLabel={`Upgrade ${display.name}`}
          costLabel={lvlState === 'maxed' ? 'MAX' : <TieredNumber value={upgradeCost} />}
        />
        {/* AUTO pill — per generator-purchase-pills.md §2–3.
            Only rendered for manual-clickable generators. Pill shape: 44px
            min-width, 28px height, 14px border-radius. Three affordance
            states: affordable (verb-tinted), unaffordable (receded grey),
            maxed (not currently capped). */}
        {def.manual_clickable && (() => {
          const isSuperPhase = g.autoclicker_count >= autoclickerCap();
          const gearId = id as VerbGearId;
          const gearDef = staticData.verbGear[gearId];
          const gearLevel = state.player.verb_gear[gearId] ?? 0;
          const gearMaxed = !gearDef || gearLevel >= gearDef.max_level;
          const gearCost = gearMaxed ? null : verbGearCost(gearLevel, gearId, staticData);
          const canAffordGear = gearCost !== null && canPurchaseVerbGear(state, gearId, staticData);
          return (
            <AutoPill
              costLabel={isSuperPhase && !gearMaxed && gearCost !== null
                ? <TieredNumber value={gearCost} />
                : <TieredNumber value={autoCost} />
              }
              costText={isSuperPhase && !gearMaxed && gearCost !== null
                ? fmtCompact(gearCost)
                : fmtCompact(autoCost)
              }
              canBuy={isSuperPhase ? canAffordGear : canBuyAuto}
              isMaxed={isSuperPhase ? gearMaxed : false}
              autoclickerCount={g.autoclicker_count}
              verbColor={display.color}
              onBuy={isSuperPhase
                ? () => { onBuyVerbGear(gearId); spawnCostFloat('autoclicker', gearCost ?? 0); }
                : () => { onBuyAutoclicker(id); spawnCostFloat('autoclicker', autoCost); }
              }
              generatorName={display.name}
              sweepHit={sweepHitBtn === 'autoclicker'}
              isSuperPhase={isSuperPhase}
              gearName={gearDef?.name}
              gearMultiplier={!gearMaxed && gearDef ? gearDef.multipliers[gearLevel] : undefined}
              gearLevel={gearLevel}
            />
          );
        })()}
      </div>
      {/* Cost float — portalled to body to escape backdrop-filter containing block */}
      {costFloat && createPortal(
        <span
          key={costFloat.key}
          className="sweep-cost-float"
          style={{ top: costFloat.top, right: costFloat.right }}
        >
          &minus;{fmtCompact(costFloat.cost)}
        </span>,
        document.body,
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Auto pill — purchase button for autoclickers (generator-purchase-pills.md).

interface AutoPillProps {
  costLabel: React.ReactNode;
  costText: string;
  canBuy: boolean;
  isMaxed: boolean;
  autoclickerCount: number;
  verbColor: string;
  onBuy: () => void;
  generatorName: string;
  sweepHit?: boolean;
  /** True when autoclickers are at cap and the pill should show SUPER. */
  isSuperPhase?: boolean;
  /** Gear item display name (e.g. "Mechanical Keyboard"). */
  gearName?: string;
  /** Next gear multiplier (e.g. 10, 100, 1000). */
  gearMultiplier?: number;
  /** Current gear level (0 = unpurchased, 1-3 = purchased tiers). */
  gearLevel?: number;
}

/** Parse hex to "R, G, B" string for rgba() compositing. */
function hexToRgbPill(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff}`;
}

// ---------------------------------------------------------------------------
// Speed button — fires upgrade directly (task #150).

interface SpeedButtonProps {
  lvlState: LvlBtnState;
  maxedArrival: boolean;
  breatheDelayMs: number;
  canAfford: boolean;
  level: number;
  onUpgrade: () => void;
  sweepHit?: boolean;
  title: string;
  ariaLabel: string;
  costLabel: React.ReactNode;
}

function SpeedButton({
  lvlState,
  maxedArrival,
  breatheDelayMs,
  canAfford,
  level,
  onUpgrade,
  sweepHit,
  title,
  ariaLabel,
  costLabel,
}: SpeedButtonProps) {
  const [shaking, setShaking] = useState(false);
  const [glowing, setGlowing] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lvlState === 'maxed') return;
    if (!canAfford) {
      setShaking(true);
      window.setTimeout(() => setShaking(false), 200);
      return;
    }
    setGlowing(true);
    window.setTimeout(() => setGlowing(false), 200);
    onUpgrade();
  };

  return (
    <button
      className={`row-btn row-btn-upgrade row-btn-lvl-${lvlState}${lvlState === 'ready' ? ' gold-breathe' : ''}${maxedArrival ? ' lvl-maxed-arrival' : ''}${shaking ? ' row-btn-shake' : ''}${glowing ? ' row-btn-buy-glow' : ''}${sweepHit ? ' sweep-hit' : ''}`}
      onClick={handleClick}
      disabled={lvlState === 'maxed'}
      style={{ '--breathe-delay': `${breatheDelayMs}ms` } as React.CSSProperties}
      title={title}
      aria-label={ariaLabel}
    >
      <span className="label">
        {lvlState === 'ready' && (
          <span className="lvl-chevron" aria-hidden>▲</span>
        )}
        {lvlState === 'maxed' && (
          <span className="lvl-crown" aria-hidden>♛</span>
        )}
        {/* Two-span pattern: full label shown by default, abbr shown in sub-750px landscape. */}
        <span className="pill-label-full">SPEED{level > 1 ? ` +${level}` : ''}</span>
        <span className="pill-label-abbr">L</span>
      </span>
      {lvlState === 'armed' && (
        <span className="lvl-deficit-glyph" aria-hidden>⊖</span>
      )}
      <span className="row-btn-cost">{costLabel}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------

/** SUPER hold duration in ms. */
const SUPER_HOLD_MS = 750;

function AutoPill({ costLabel, costText, canBuy, isMaxed, autoclickerCount, verbColor, onBuy, generatorName, sweepHit, isSuperPhase, gearName, gearMultiplier, gearLevel = 0 }: AutoPillProps) {
  const [glowing, setGlowing] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [bursting, setBursting] = useState(false);
  const rgb = hexToRgbPill(verbColor);

  // Hold-to-buy for SUPER: press and hold for 3s to confirm purchase.
  // Progress 0..1 drives the escalating fire visual.
  const [holdProgress, setHoldProgress] = useState(0);
  const holdingRef = useRef(false);
  const holdStart = useRef(0);
  const holdRaf = useRef(0);
  const holdTimer = useRef<number | null>(null);
  const onBuyRef = useRef(onBuy);
  onBuyRef.current = onBuy;

  const cancelHold = () => {
    holdingRef.current = false;
    setHoldProgress(0);
    if (holdRaf.current) {
      cancelAnimationFrame(holdRaf.current);
      holdRaf.current = 0;
    }
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const tickHold = () => {
    if (!holdingRef.current) return;
    const elapsed = Date.now() - holdStart.current;
    const p = Math.min(1, elapsed / SUPER_HOLD_MS);
    setHoldProgress(p);
    if (p < 1) {
      holdRaf.current = requestAnimationFrame(tickHold);
    }
  };

  const startHold = () => {
    if (!canBuy || isMaxed) return;
    holdingRef.current = true;
    holdStart.current = Date.now();
    setHoldProgress(0);
    holdRaf.current = requestAnimationFrame(tickHold);
    // Fire purchase after hold duration.
    holdTimer.current = window.setTimeout(() => {
      holdingRef.current = false;
      setHoldProgress(0);
      playWow();
      setBursting(true);
      onBuyRef.current();
      // Expand 1.25x → shrink to 0 → reappear (single 500ms animation).
      window.setTimeout(() => setBursting(false), 500);
    }, SUPER_HOLD_MS);
  };

  useEffect(() => {
    return () => {
      if (holdRaf.current) cancelAnimationFrame(holdRaf.current);
      if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    };
  }, []);

  // Long-press (300ms) reveals cost popover in landscape — for HIRE only.
  const [costPopover, setCostPopover] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const popoverTimer = useRef<number | null>(null);

  const clearPopoverTimers = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (popoverTimer.current !== null) {
      window.clearTimeout(popoverTimer.current);
      popoverTimer.current = null;
    }
  };

  useEffect(() => {
    return () => clearPopoverTimers();
  }, []);

  const handleTouchStart = () => {
    if (isSuperPhase) return;
    clearPopoverTimers();
    longPressTimer.current = window.setTimeout(() => {
      longPressTimer.current = null;
      setCostPopover(true);
      if (popoverTimer.current !== null) window.clearTimeout(popoverTimer.current);
      popoverTimer.current = window.setTimeout(() => {
        setCostPopover(false);
        popoverTimer.current = null;
      }, 2000);
    }, 300);
  };

  const dismissPopover = () => {
    clearPopoverTimers();
    setCostPopover(false);
  };

  // SUPER hold: start on pointerdown, cancel on pointerup/leave/cancel.
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isSuperPhase || isMaxed) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    startHold();
  };

  const handlePointerUp = () => {
    if (holdingRef.current) cancelHold();
  };

  const handleClick = () => {
    if (isMaxed) return;
    // SUPER uses hold-to-buy — click is a no-op for SUPER.
    if (isSuperPhase) return;
    // Standard HIRE flow.
    if (!canBuy) {
      setShaking(true);
      window.setTimeout(() => setShaking(false), 200);
      return;
    }
    setGlowing(true);
    window.setTimeout(() => setGlowing(false), 120);
    onBuy();
  };

  // Keyboard: hold Space/Enter for 3s.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isSuperPhase || isMaxed || !canBuy) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!holdingRef.current) startHold();
    }
  };
  const handleKeyUp = (e: React.KeyboardEvent) => {
    if ((e.key === ' ' || e.key === 'Enter') && holdingRef.current) {
      cancelHold();
    }
  };

  // Determine pill mode.
  const superMaxed = isSuperPhase && isMaxed;
  const superActive = isSuperPhase && !isMaxed;
  const holding = holdProgress > 0;

  const superTierClass = gearLevel >= 2 ? ' super-tier-3' : gearLevel >= 1 ? ' super-tier-2' : ' super-tier-1';
  const stateClass = superMaxed
    ? ' purchase-pill-maxed purchase-pill-super-maxed'
    : canBuy
      ? ` purchase-pill-affordable purchase-pill-super${superTierClass}${holding ? ' purchase-pill-super-holding' : ''}`
      : ` purchase-pill-unaffordable purchase-pill-super${superTierClass}`;

  // SUPER label: level 0 (buying first) = "SUPER", level 1 (buying second) = "SUPER II", level 2 (buying third) = "SUPER III"
  const superTierLabel = gearLevel === 0 ? 'SUPER' : gearLevel === 1 ? 'SUPER II' : 'SUPER III';
  const superTierAbbr = gearLevel === 0 ? 'S' : gearLevel === 1 ? 'SII' : 'SIII';
  const labelText = superMaxed
    ? 'MAX'
    : superActive
      ? superTierLabel
      : `HIRE${autoclickerCount > 0 ? ` +${autoclickerCount}` : ''}`;
  const labelAbbr = superActive ? superTierAbbr : 'A';

  const ariaLabel = superMaxed
    ? `${generatorName} gear maxed, ${gearName ?? ''} level 3 of 3.`
    : superActive && canBuy
      ? `Super upgrade ${generatorName}, ${gearName ?? ''}, affordable, costs ${costText} engagement${gearMultiplier ? `, multiplier times ${gearMultiplier}` : ''}. Hold for 3 seconds to purchase.`
      : superActive
        ? `Super upgrade ${generatorName}, ${gearName ?? ''}, not affordable, costs ${costText} engagement.`
        : isMaxed
          ? `${generatorName} autoclickers maxed at ${autoclickerCount}`
          : canBuy
            ? `Autoclicker ${generatorName}, ${autoclickerCount} autoclickers, affordable, costs ${costText} engagement`
            : `Autoclicker ${generatorName}, ${autoclickerCount} autoclickers, not affordable, costs ${costText} engagement`;

  const title = superMaxed
    ? `${generatorName} — ${gearName ?? 'gear'} maxed`
    : superActive
      ? `${gearName ?? 'Super upgrade'} — hold to buy (${costText} eng)`
      : isMaxed
        ? `${generatorName} — max autoclickers (${autoclickerCount})`
        : `Buy autoclicker for ${costText} engagement`;

  // Inline style for hold progress — drives the fire fill and glow intensity.
  const holdStyle: React.CSSProperties | undefined =
    (!superMaxed && (superActive ? canBuy : (!isMaxed && canBuy)))
      ? {
          '--pill-color': verbColor,
          '--pill-color-rgb': rgb,
          ...(holding ? { '--hold-progress': holdProgress } as Record<string, unknown> : {}),
        } as React.CSSProperties
      : undefined;

  // --- Non-SUPER: render with identical markup + classes as SPEED button ---
  if (!isSuperPhase) {
    const hireLvlState = isMaxed ? 'maxed' : canBuy ? 'ready' : 'armed';
    return (
      <button
        className={`row-btn row-btn-upgrade row-btn-lvl-${hireLvlState}${hireLvlState === 'ready' ? ' gold-breathe' : ''}${shaking ? ' row-btn-shake' : ''}${glowing ? ' row-btn-buy-glow' : ''}${sweepHit ? ' sweep-hit' : ''}`}
        onClick={handleClick}
        disabled={isMaxed}
        aria-label={ariaLabel}
        title={title}
      >
        <span className="label">
          {hireLvlState === 'ready' && (
            <span className="lvl-chevron" aria-hidden>▲</span>
          )}
          {hireLvlState === 'maxed' && (
            <span className="lvl-crown" aria-hidden>♛</span>
          )}
          <span className="pill-label-full">{labelText}</span>
          <span className="pill-label-abbr">A</span>
        </span>
        {hireLvlState === 'armed' && (
          <span className="lvl-deficit-glyph" aria-hidden>⊖</span>
        )}
        <span className="row-btn-cost">{isMaxed ? 'MAX' : costLabel}</span>
      </button>
    );
  }

  // --- SUPER maxed: use identical platinum classes as SPEED maxed ---
  if (superMaxed) {
    return (
      <button
        className={`row-btn row-btn-upgrade row-btn-lvl-maxed${sweepHit ? ' sweep-hit' : ''}`}
        disabled
        aria-label={ariaLabel}
        title={title}
      >
        <span className="label">
          <span className="lvl-crown" aria-hidden>♛</span>
          <span className="pill-label-full">SUPER III</span>
          <span className="pill-label-abbr">SIII</span>
        </span>
        <span className="row-btn-cost">MAX</span>
      </button>
    );
  }

  // --- SUPER phase: purchase-pill markup with flame wreath ---
  return (
    <button
      className={`purchase-pill purchase-pill-auto${stateClass}${glowing ? ' purchase-pill-flash' : ''}${shaking ? ' purchase-pill-shake' : ''}${bursting ? ' super-burst' : ''}${sweepHit ? ' sweep-hit' : ''}`}
      style={holdStyle}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={dismissPopover}
      onTouchCancel={dismissPopover}
      disabled={superMaxed}
      aria-label={ariaLabel}
      title={title}
    >
      {/* Hold progress fill — fire bar rising from bottom */}
      {holding && (
        <span
          className="super-hold-fire"
          style={{ '--hold-progress': holdProgress } as React.CSSProperties}
          aria-hidden="true"
        />
      )}
      <span className="pill-label">
        {superMaxed && <span className="pill-crown" aria-hidden>♛</span>}
        <span className="pill-label-full">{labelText}</span>
        <span className="pill-label-abbr">{labelAbbr}</span>
      </span>
      <span className="pill-cost">{superMaxed ? 'MAX' : costLabel}</span>
      {/* Cost popover — SUPER shows gear name + cost + multiplier. */}
      {(holding || costPopover) && !isMaxed && (
        <span className="pill-cost-popover pill-cost-popover-super" aria-hidden="true">
          <span className="popover-gear-name">{gearName}</span>
          <span className="popover-gear-detail">{costText} eng {gearMultiplier ? `\u2192 \u00D7${gearMultiplier}` : ''}</span>
        </span>
      )}
    </button>
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
  costLabel: React.ReactNode;
  costText: string;
  canBuy: boolean;
  count: number;
  onBuy: () => void;
  sweepHit?: boolean;
}

function CompactBuyButton({ costLabel, costText, canBuy, count, onBuy, sweepHit }: CompactBuyButtonProps) {
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
      className={`row-btn${shaking ? ' row-btn-shake' : ''}${glowing ? ' row-btn-buy-glow' : ''}${!canBuy ? ' row-btn-disabled' : ''}${sweepHit ? ' sweep-hit' : ''}`}
      onClick={handleClick}
      aria-disabled={!canBuy}
      title={`Buy 1 unit for ${costText} engagement`}
    >
      <span className="label">
        {/* Two-span pattern: full label shown by default, abbr shown in sub-750px landscape. */}
        <span className="pill-label-full">POWER{count > 0 ? ` +${count}` : ''}</span>
        <span className="pill-label-abbr">B</span>
      </span>
      <span className="row-btn-cost">{costLabel}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// BuyAllButton helpers — exported for unit tests
// ---------------------------------------------------------------------------

/** Label text for the BUY ALL button — always 'RUSH BUY' (§7 ignition switch). */
export function buyAllLabel(_sweepActive: boolean): string {
  return 'RUSH BUY';
}

/** Whether the BUY ALL button should be disabled. */
export function buyAllDisabled(sweepActive: boolean, canAfford: boolean): boolean {
  return !sweepActive && !canAfford;
}

// ---------------------------------------------------------------------------
// BuyAllButton
// ---------------------------------------------------------------------------

interface BuyAllButtonProps {
  sweepActive: boolean;
  canAfford: boolean;
  onStartSweep: () => void;
  onCancelSweep: () => void;
  /** Monotonic counter — increments on each sweep purchase for pulse trigger. */
  sweepPurchaseSeq: number;
}

function BuyAllButton({ sweepActive, canAfford, onStartSweep, onCancelSweep, sweepPurchaseSeq }: BuyAllButtonProps) {
  const disabled = buyAllDisabled(sweepActive, canAfford);
  const label = buyAllLabel(sweepActive);
  const btnRef = useRef<HTMLButtonElement>(null);
  const prevSeq = useRef(0);

  // Purchase pulse — toggle buy-all-pulse class on each sweep purchase (§4).
  // Add class instantly (brightness spike via transition: 0ms), remove next
  // frame so the base 80ms ease-out transition decays the brightness back.
  useEffect(() => {
    if (sweepPurchaseSeq !== prevSeq.current && sweepActive) {
      prevSeq.current = sweepPurchaseSeq;
      const el = btnRef.current;
      if (!el) return;
      el.classList.add('buy-all-pulse');
      const raf = requestAnimationFrame(() => {
        el.classList.remove('buy-all-pulse');
      });
      return () => {
        cancelAnimationFrame(raf);
        el.classList.remove('buy-all-pulse');
      };
    }
  }, [sweepPurchaseSeq, sweepActive]);

  const handleDown = () => {
    if (disabled || sweepActive) return;
    onStartSweep();
  };

  const handleUp = () => {
    if (sweepActive) onCancelSweep();
  };

  // Keyboard: Space/Enter keydown starts, keyup stops (mirrors pointer hold).
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleDown();
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      handleUp();
    }
  };

  return (
    <button
      ref={btnRef}
      type="button"
      className={`buy-all-btn${sweepActive ? ' buy-all-btn-sweeping' : ''}${disabled ? ' buy-all-btn-empty' : ''}`}
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerLeave={handleUp}
      onPointerCancel={handleUp}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      disabled={disabled}
      aria-label={sweepActive ? 'Buying — release to stop' : 'Hold to rush buy all affordable upgrades'}
      title={sweepActive ? 'Release to stop' : 'Hold to rush buy'}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
