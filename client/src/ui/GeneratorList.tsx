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

import { useEffect, useRef, useState } from 'react';
import type { GameState, GeneratorId, StaticData } from '../types.ts';
import {
  autoclickerBuyCost,
  generatorBuyCost,
  generatorUpgradeCost,
} from '../generator/index.ts';
import {
  computeGeneratorEffectiveRate,
} from '../game-loop/index.ts';
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  GENERATOR_DISPLAY,
  GENERATOR_ORDER,
  POST_PRESTIGE_GENERATORS,
  type GeneratorCategory,
} from './display.ts';
import { fmtCompact } from './format.ts';
import { UpgradeDrawer } from './UpgradeDrawer.tsx';

interface Props {
  state: GameState;
  staticData: StaticData;
  onBuy: (id: GeneratorId) => void;
  onUpgrade: (id: GeneratorId) => void;
  /** Unlock a manual-clickable generator (pays base_buy_cost, flips owned). */
  onUnlock: (id: GeneratorId) => void;
  /** Purchase an autoclicker for a manual-clickable verb. */
  onBuyAutoclicker: (verbId: GeneratorId) => void;
  /** When set, the matching row gets a pulsing gold halo (UX §9.2 Phase 1–2). */
  viralGeneratorId?: GeneratorId | null;
  /**
   * Called when the upgrade drawer opens or closes. Parent uses this to dim
   * the platform panel while the drawer is open (per UX spec §1).
   */
  onDrawerOpenChange?: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Pure helpers — exported for unit tests (task #69).
// ---------------------------------------------------------------------------

/**
 * Affordance states for the per-row Lvl ↑ button.
 *
 * - dormant: count===0 — the row has no units to upgrade yet. Disabled.
 * - armed:   count>0 but engagement < upgradeCost. Clickable, but the teased
 *            action is out of reach. Stillness communicates "not now."
 * - ready:   count>0 and engagement >= upgradeCost. Breathes gold to pull
 *            the eye toward the drawer.
 * - maxed:   level >= max_level — the cap is hit, no further upgrade is
 *            possible. Shows "MAX" in place of cost. Task #89.
 *
 * See proposals/accepted/lvl-up-button-affordance-states.md and
 * proposals/accepted/generator-level-growth-curves.md.
 */
export type LvlBtnState = 'dormant' | 'armed' | 'ready' | 'maxed';

export function classifyLvlBtnState(
  count: number,
  level: number,
  maxLevel: number,
  engagement: number,
  upgradeCost: number,
): LvlBtnState {
  if (count <= 0) return 'dormant';
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

export function GeneratorList({ state, staticData, onBuy, onUpgrade, onUnlock, onBuyAutoclicker, viralGeneratorId, onDrawerOpenChange }: Props) {
  // Upgrade drawer state — only one open at a time.
  const [openDrawerId, setOpenDrawerId] = useState<GeneratorId | null>(null);
  const [drawerAnchorTop, setDrawerAnchorTop] = useState<number>(0);

  const handleOpenDrawer = (id: GeneratorId, anchorTop: number) => {
    setOpenDrawerId(id);
    setDrawerAnchorTop(anchorTop);
  };

  const handleCloseDrawer = () => {
    setOpenDrawerId(null);
  };

  // Notify parent when drawer open state changes so it can dim the platform panel.
  const prevDrawerOpen = useRef(false);
  useEffect(() => {
    const isOpen = openDrawerId !== null;
    if (isOpen !== prevDrawerOpen.current) {
      prevDrawerOpen.current = isOpen;
      onDrawerOpenChange?.(isOpen);
    }
  }, [openDrawerId, onDrawerOpenChange]);

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
                onUnlock={onUnlock}
                onBuyAutoclicker={onBuyAutoclicker}
                viralHalo={viralGeneratorId === id}
                isDrawerOpen={openDrawerId === id}
                onOpenDrawer={handleOpenDrawer}
              />
            ))}
          </div>
        );
      })}

      {/* Upgrade drawer — portal-rendered over the platform column. */}
      {openDrawerId && (
        <UpgradeDrawer
          id={openDrawerId}
          generatorState={state.generators[openDrawerId]}
          display={GENERATOR_DISPLAY[openDrawerId]}
          staticData={staticData}
          engagement={state.player.engagement}
          anchorTop={drawerAnchorTop}
          onUpgrade={() => onUpgrade(openDrawerId)}
          onClose={handleCloseDrawer}
        />
      )}
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
  onUnlock: (id: GeneratorId) => void;
  onBuyAutoclicker: (verbId: GeneratorId) => void;
  /** True while this row is the viral burst source (UX §9.2 Phase 1–2). */
  viralHalo?: boolean;
  /** True while this generator's upgrade drawer is open. */
  isDrawerOpen?: boolean;
  /**
   * Called when the player taps the row or the ⬆ affordance to open the
   * upgrade drawer. Passes viewport-relative anchorTop of the row.
   */
  onOpenDrawer?: (id: GeneratorId, anchorTop: number) => void;
}

function GeneratorRow({
  id,
  state,
  staticData,
  onBuy,
  onUnlock,
  onUpgrade,
  onBuyAutoclicker,
  viralHalo,
  isDrawerOpen,
  onOpenDrawer,
}: RowProps) {
  const g = state.generators[id];
  const def = staticData.generators[id];
  const display = GENERATOR_DISPLAY[id];
  const threshold = staticData.unlockThresholds.generators[id] ?? 0;

  const thresholdMet = state.player.total_followers >= threshold;
  const isDiscovered = g.owned || thresholdMet;

  const rate = computeGeneratorEffectiveRate(g, state, staticData);

  const badgeShape = BADGE_SHAPE[display.category];
  const style = { '--gen-color': display.color } as React.CSSProperties;

  // Row ref — used to read bounding rect for drawer anchor. Declared here
  // (before any early returns) so hook order stays stable across the
  // unowned → owned transition. React's Rules of Hooks require every hook
  // to run on every render in the same order.
  const rowRef = useRef<HTMLDivElement>(null);

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
  const upgradeCostUnconditional = generatorUpgradeCost(id, g.level, staticData);
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
    const handleBuy = () => def.manual_clickable ? onUnlock(id) : onBuy(id);
    const label = def.manual_clickable ? `Unlock ${display.name}` : `Buy ${display.name}`;
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
  // Upgrading requires at least one unit. This can be 0 post-rebrand when a
  // generator_unlock head-start grants owned=true without any units.
  const canOpenDrawer = g.count > 0;

  // Lvl ↑ button affordance state — spec tracks distinct visuals
  // (dormant / armed / ready / maxed) so players can tell at a glance
  // whether tapping the button opens a drawer they can act on.
  // Tasks #69 (three states) + #89 (MAX cap). Computed above early returns
  // so hook order stays stable.
  const lvlState = lvlStateUnconditional;
  const lvlDeficit = Math.max(0, upgradeCost - state.player.engagement);

  const openDrawer = () => {
    if (!canOpenDrawer) return;
    if (!onOpenDrawer) return;
    const rect = rowRef.current?.getBoundingClientRect();
    onOpenDrawer(id, rect?.top ?? 100);
  };

  const drawerOpenClass = isDrawerOpen ? ' drawer-open' : '';
  return (
    <div
      ref={rowRef}
      className={`generator-row${firstBuyAnim ? ' first-buy-anim' : ''}${viralHalo ? ' viral-halo' : ''}${drawerOpenClass}`}
      style={style}
      onClick={openDrawer}
      role={canOpenDrawer ? 'button' : undefined}
      tabIndex={canOpenDrawer ? 0 : undefined}
      onKeyDown={canOpenDrawer ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDrawer();
        }
      } : undefined}
      aria-expanded={canOpenDrawer ? isDrawerOpen : undefined}
      aria-label={canOpenDrawer ? `${display.name} — tap to view upgrade options` : undefined}
    >
      <div className="generator-name">
        {display.name}
      </div>
      <div className="row-actions" onClick={(e) => e.stopPropagation()}>
        <CompactBuyButton
          costLabel={fmtCompact(buyCost)}
          canBuy={canBuy}
          onBuy={() => onBuy(id)}
        />
        {/* SPEED — fires upgrade directly (task #150).
            Three affordance states per task #69:
              dormant (count===0): disabled placeholder
              armed   (owned, can't afford): still, amber deficit glyph
              ready   (owned, affordable): gold breathing halo */}
        <SpeedButton
          lvlState={lvlState}
          maxedArrival={maxedArrival}
          isDrawerOpen={isDrawerOpen}
          breatheDelayMs={breatheDelayMs}
          canAfford={state.player.engagement >= upgradeCost}
          onUpgrade={() => onUpgrade(id)}
          title={
            lvlState === 'dormant'
              ? `Buy at least one ${display.name} before upgrading`
              : lvlState === 'maxed'
                ? `${display.name} is at max level (L${g.level})`
                : lvlState === 'armed'
                  ? `Upgrade ${display.name} (L${g.level} → L${g.level + 1} costs ${fmtCompact(upgradeCost)}) — ${fmtCompact(lvlDeficit)} more engagement`
                  : `Upgrade ${display.name} (L${g.level} → L${g.level + 1} costs ${fmtCompact(upgradeCost)}) — ready`
          }
          ariaLabel={`Upgrade ${display.name}`}
          costLabel={lvlState === 'maxed' ? 'MAX' : fmtCompact(upgradeCost)}
        />
        {/* AUTO pill — per generator-purchase-pills.md §2–3.
            Only rendered for manual-clickable generators. Pill shape: 44px
            min-width, 28px height, 14px border-radius. Three affordance
            states: affordable (verb-tinted), unaffordable (receded grey),
            maxed (not currently capped). */}
        {def.manual_clickable && (
          <AutoPill
            costLabel={fmtCompact(autoCost)}
            canBuy={canBuyAuto}
            autoclickerCount={g.autoclicker_count}
            verbColor={display.color}
            onBuy={() => onBuyAutoclicker(id)}
            generatorName={display.name}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Auto pill — purchase button for autoclickers (generator-purchase-pills.md).

interface AutoPillProps {
  costLabel: string;
  canBuy: boolean;
  autoclickerCount: number;
  verbColor: string;
  onBuy: () => void;
  generatorName: string;
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
  isDrawerOpen?: boolean;
  breatheDelayMs: number;
  canAfford: boolean;
  onUpgrade: () => void;
  title: string;
  ariaLabel: string;
  costLabel: string;
}

function SpeedButton({
  lvlState,
  maxedArrival,
  isDrawerOpen,
  breatheDelayMs,
  canAfford,
  onUpgrade,
  title,
  ariaLabel,
  costLabel,
}: SpeedButtonProps) {
  const [shaking, setShaking] = useState(false);
  const [glowing, setGlowing] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lvlState === 'dormant' || lvlState === 'maxed') return;
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
      className={`row-btn row-btn-upgrade row-btn-lvl-${lvlState}${isDrawerOpen ? ' active' : ''}${maxedArrival ? ' lvl-maxed-arrival' : ''}${shaking ? ' row-btn-shake' : ''}${glowing ? ' row-btn-buy-glow' : ''}`}
      onClick={handleClick}
      disabled={lvlState === 'dormant' || lvlState === 'maxed'}
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
        SPEED
      </span>
      {lvlState === 'armed' && (
        <span className="lvl-deficit-glyph" aria-hidden>⊖</span>
      )}
      {costLabel}
    </button>
  );
}

// ---------------------------------------------------------------------------

function AutoPill({ costLabel, canBuy, autoclickerCount, verbColor, onBuy, generatorName }: AutoPillProps) {
  const [glowing, setGlowing] = useState(false);
  const rgb = hexToRgbPill(verbColor);

  const handleClick = () => {
    if (!canBuy) return; // no-op, no shake (per pills spec §5.3)
    setGlowing(true);
    window.setTimeout(() => setGlowing(false), 120);
    onBuy();
  };

  return (
    <button
      className={`purchase-pill purchase-pill-auto${canBuy ? ' purchase-pill-affordable' : ' purchase-pill-unaffordable'}${glowing ? ' purchase-pill-flash' : ''}`}
      style={canBuy ? {
        '--pill-color': verbColor,
        '--pill-color-rgb': rgb,
      } as React.CSSProperties : undefined}
      onClick={handleClick}
      aria-label={
        canBuy
          ? `Autoclicker ${generatorName}, ${autoclickerCount} autoclickers, affordable, costs ${costLabel} engagement`
          : `Autoclicker ${generatorName}, ${autoclickerCount} autoclickers, not affordable, costs ${costLabel} engagement`
      }
      title={`Buy autoclicker for ${costLabel} engagement`}
    >
      <span className="pill-label">HIRE{autoclickerCount > 0 ? ` ×${autoclickerCount}` : ''}</span>
      <span className="pill-cost">{costLabel}</span>
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
      <span className="label">POWER</span>
      {costLabel}
    </button>
  );
}

// ---------------------------------------------------------------------------
