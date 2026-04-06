// Clout Shop — full modal with upgrade list + purchase flow (task #64).
//
// UX spec: ux/prestige-rebrand-screen.md §3
//
// Surface: ~720×560px, centered, 30% backdrop, game loop KEEPS running.
// Categories (fixed order): ENGAGEMENT → UNLOCKS → INSIGHT.
// Within a category, rows sort by ascending cost (next-affordable near top).
//
// Purchase flow: tap ⬆ → button depress (CSS :active) → row pulse (250ms) →
// balance tick-down (400ms, rAF) → row state updates.
//
// Insufficient Clout: button at 3:1 contrast, amber cost, shake on tap (200ms).
// No sound yet (audio pipeline not wired).
//
// Reduce Motion: disables row pulse, balance tick-down (instant), and shake.
// Visual state signals (amber cost, ✓/MAX/locked text) still present.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GameState, StaticData, UpgradeId } from '../types.ts';
import { cloutUpgradeCost } from '../prestige/index.ts';
import { STATIC_DATA } from '../static-data/index.ts';

// ---------------------------------------------------------------------------
// Display metadata — colocated with the component per UX-presentation pattern
// ---------------------------------------------------------------------------

export type ShopCategory = 'ENGAGEMENT' | 'UNLOCKS' | 'INSIGHT';

export const CATEGORY_ORDER: readonly ShopCategory[] = [
  'ENGAGEMENT',
  'UNLOCKS',
  'INSIGHT',
] as const;

export interface UpgradeDisplay {
  name: string;
  icon: string;
  description: string;
  category: ShopCategory;
}

export const UPGRADE_DISPLAY: Record<UpgradeId, UpgradeDisplay> = {
  engagement_boost: {
    name: 'Engagement Boost',
    icon: '📈',
    description: 'Multiplies all engagement output. Stacks with Algorithm.',
    category: 'ENGAGEMENT',
  },
  algorithm_insight: {
    name: 'Algorithm Insight',
    icon: '🔮',
    description: 'Reveal upcoming Algorithm shifts before they arrive.',
    category: 'INSIGHT',
  },
  platform_headstart_picshift: {
    name: 'PicShift Head Start',
    icon: '📸',
    description: 'Start each run with PicShift already unlocked.',
    category: 'UNLOCKS',
  },
  platform_headstart_skroll: {
    name: 'Skroll Head Start',
    icon: '📱',
    description: 'Start each run with Skroll already unlocked.',
    category: 'UNLOCKS',
  },
  platform_headstart_podpod: {
    name: 'PodPod Head Start',
    icon: '🎧',
    description: 'Start each run with PodPod already unlocked.',
    category: 'UNLOCKS',
  },
  ai_slop_unlock: {
    name: 'AI Slop',
    icon: '🤖',
    description: 'Unlock AI Slop as a post-prestige generator.',
    category: 'UNLOCKS',
  },
  deepfakes_unlock: {
    name: 'Deepfakes',
    icon: '🎭',
    description: 'Unlock Deepfakes as a post-prestige generator.',
    category: 'UNLOCKS',
  },
  algorithmic_prophecy_unlock: {
    name: 'Algorithmic Prophecy',
    icon: '🧿',
    description: 'Unlock Algorithmic Prophecy as a post-prestige generator.',
    category: 'UNLOCKS',
  },
};

// ---------------------------------------------------------------------------
// Pure helpers — exported for testing (spec §3.3, §3.4, §3.6)
// ---------------------------------------------------------------------------

/** Formatted Clout balance label for the shop header. */
export function formatCloutBalance(clout: number): string {
  return `Clout: ${clout}`;
}

/** True for single-level one-shots (headstarts, generator unlocks). */
export function isOneShot(upgradeId: UpgradeId, staticData: StaticData): boolean {
  return staticData.cloutUpgrades[upgradeId].max_level === 1;
}

/** Level indicator text per spec §3.3. */
export function formatLevelIndicator(
  currentLevel: number,
  maxLevel: number,
  oneShot: boolean,
): string {
  if (oneShot) {
    return currentLevel >= 1 ? 'owned' : 'locked';
  }
  return `Lv ${currentLevel}/${maxLevel}`;
}

/** Cost cell text per spec §3.3: number, 'MAX', or '✓'. */
export function formatCostCell(
  nextCost: number | null,
  oneShot: boolean,
  atMax: boolean,
): string {
  if (!atMax) return `${nextCost}`;
  return oneShot ? '✓' : 'MAX';
}

export type RowPurchaseState =
  | 'affordable'
  | 'insufficient'
  | 'maxed';

/** Purchase-affordance state for the row's ⬆ button. */
export function getRowPurchaseState(
  state: GameState,
  upgradeId: UpgradeId,
  staticData: StaticData,
): RowPurchaseState {
  const current = state.player.clout_upgrades[upgradeId] ?? 0;
  const nextCost = cloutUpgradeCost(current, upgradeId, staticData);
  if (nextCost === null) return 'maxed';
  return state.player.clout >= nextCost ? 'affordable' : 'insufficient';
}

/** All row data the UI needs to render one row. */
export interface RowData {
  upgradeId: UpgradeId;
  display: UpgradeDisplay;
  currentLevel: number;
  maxLevel: number;
  nextCost: number | null;
  oneShot: boolean;
  atMax: boolean;
  purchaseState: RowPurchaseState;
  levelLabel: string;
  costLabel: string;
}

export function buildRowData(
  state: GameState,
  upgradeId: UpgradeId,
  staticData: StaticData,
): RowData {
  const display = UPGRADE_DISPLAY[upgradeId];
  const def = staticData.cloutUpgrades[upgradeId];
  const currentLevel = state.player.clout_upgrades[upgradeId] ?? 0;
  const nextCost = cloutUpgradeCost(currentLevel, upgradeId, staticData);
  const oneShot = isOneShot(upgradeId, staticData);
  const atMax = currentLevel >= def.max_level;
  const purchaseState = getRowPurchaseState(state, upgradeId, staticData);
  return {
    upgradeId,
    display,
    currentLevel,
    maxLevel: def.max_level,
    nextCost,
    oneShot,
    atMax,
    purchaseState,
    levelLabel: formatLevelIndicator(currentLevel, def.max_level, oneShot),
    costLabel: formatCostCell(nextCost, oneShot, atMax),
  };
}

/**
 * Returns rows grouped by category, sorted within each category by
 * ascending cost (next-affordable near top). Per spec §3.4.
 *
 * A row's "sort cost" is the next-purchase cost; maxed rows sort to the end.
 */
export function buildCategorizedRows(
  state: GameState,
  staticData: StaticData,
): { category: ShopCategory; rows: RowData[] }[] {
  const allIds = Object.keys(UPGRADE_DISPLAY) as UpgradeId[];
  const rowsByCategory = new Map<ShopCategory, RowData[]>();
  for (const cat of CATEGORY_ORDER) rowsByCategory.set(cat, []);

  for (const id of allIds) {
    const row = buildRowData(state, id, staticData);
    rowsByCategory.get(row.display.category)!.push(row);
  }

  // Sort each category by ascending cost; maxed rows sink to the bottom.
  for (const rows of rowsByCategory.values()) {
    rows.sort((a, b) => {
      const aKey = a.atMax ? Number.POSITIVE_INFINITY : (a.nextCost ?? 0);
      const bKey = b.atMax ? Number.POSITIVE_INFINITY : (b.nextCost ?? 0);
      return aKey - bKey;
    });
  }

  return CATEGORY_ORDER.map((category) => ({
    category,
    rows: rowsByCategory.get(category)!,
  }));
}

/** True when the player has never rebranded AND has zero Clout (spec §3.6). */
export function isShopEmpty(state: GameState): boolean {
  return state.player.clout === 0 && state.player.rebrand_count === 0;
}

/** True when every upgrade is at max level (spec §3.6). */
export function isShopAllMaxed(
  state: GameState,
  staticData: StaticData,
): boolean {
  const allIds = Object.keys(UPGRADE_DISPLAY) as UpgradeId[];
  return allIds.every((id) => {
    const current = state.player.clout_upgrades[id] ?? 0;
    return current >= staticData.cloutUpgrades[id].max_level;
  });
}

// ---------------------------------------------------------------------------
// Animation constants
// ---------------------------------------------------------------------------

const BALANCE_TICK_MS = 400;
const ROW_PULSE_MS = 250;
const SHAKE_MS = 200;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface CloutShopModalProps {
  state: GameState;
  onClose: () => void;
  onPurchase: (upgradeId: UpgradeId) => void;
}

export function CloutShopModal({ state, onClose, onPurchase }: CloutShopModalProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useRef(prefersReducedMotion()).current;

  // Derived data
  const clout = state.player.clout;
  const empty = isShopEmpty(state);
  const allMaxed = isShopAllMaxed(state, STATIC_DATA);
  const categorized = buildCategorizedRows(state, STATIC_DATA);

  // Animated clout display — ticks down from previous balance on purchase.
  const [displayClout, setDisplayClout] = useState(clout);
  const prevCloutRef = useRef(clout);

  useEffect(() => {
    const prev = prevCloutRef.current;
    prevCloutRef.current = clout;
    if (clout === prev) return;
    if (reducedMotion || clout >= prev) {
      // Instant update on Reduce Motion or when Clout goes UP (e.g. rebrand).
      setDisplayClout(clout);
      return;
    }
    // Tick DOWN over BALANCE_TICK_MS with ease-out.
    const start = performance.now();
    const delta = prev - clout;
    let raf = 0;
    const step = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(1, elapsed / BALANCE_TICK_MS);
      const eased = 1 - (1 - t) * (1 - t); // ease-out quad
      setDisplayClout(Math.round(prev - delta * eased));
      if (t < 1) raf = requestAnimationFrame(step);
      else setDisplayClout(clout);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [clout, reducedMotion]);

  // Row animation tracking — per-row transient classes for pulse + shake.
  const [pulsingRow, setPulsingRow] = useState<UpgradeId | null>(null);
  const [shakingRow, setShakingRow] = useState<UpgradeId | null>(null);

  function triggerRowPulse(id: UpgradeId) {
    if (reducedMotion) return;
    setPulsingRow(id);
    window.setTimeout(() => setPulsingRow((v) => (v === id ? null : v)), ROW_PULSE_MS);
  }

  function triggerRowShake(id: UpgradeId) {
    if (reducedMotion) return;
    setShakingRow(id);
    window.setTimeout(() => setShakingRow((v) => (v === id ? null : v)), SHAKE_MS);
  }

  // Focus the × close button on open.
  useEffect(() => {
    closeBtnRef.current?.focus();
  }, []);

  // Esc closes.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Focus trap within modal.
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Tab') return;
    const root = modalRef.current;
    if (!root) return;
    const focusable = root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target !== overlayRef.current) return;
    onClose();
  }

  function handleRowAction(row: RowData) {
    if (row.purchaseState === 'maxed') return;
    if (row.purchaseState === 'insufficient') {
      triggerRowShake(row.upgradeId);
      return;
    }
    triggerRowPulse(row.upgradeId);
    onPurchase(row.upgradeId);
  }

  const modal = (
    <div
      ref={overlayRef}
      className="shop-overlay"
      onClick={handleBackdropClick}
      aria-hidden="false"
    >
      <div
        ref={modalRef}
        className="shop-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Rebrand Upgrades"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="shop-header">
          <span className="shop-title">Rebrand Upgrades</span>
          <button
            ref={closeBtnRef}
            className="shop-close-btn"
            onClick={onClose}
            aria-label="Close Rebrand Upgrades"
          >
            ×
          </button>
        </div>

        {/* Clout balance — P0 contrast, animates down on purchase. */}
        <div className="shop-balance" aria-live="polite">
          {formatCloutBalance(displayClout)}
        </div>

        {/* Empty-state header copy, above the categories. */}
        {empty && (
          <p className="shop-empty-hint">
            Earn Clout by rebranding. Your first rebrand is ahead.
          </p>
        )}

        {/* Categories */}
        <div className="shop-categories">
          {categorized.map(({ category, rows }) => (
            <div key={category} className="shop-category">
              <div className="shop-category-header">{category}</div>
              <div className="shop-category-rows">
                {rows.map((row) => (
                  <ShopRow
                    key={row.upgradeId}
                    row={row}
                    pulsing={pulsingRow === row.upgradeId}
                    shaking={shakingRow === row.upgradeId}
                    onAction={() => handleRowAction(row)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* All-maxed footer. */}
        {allMaxed && (
          <p className="shop-all-maxed">
            You&rsquo;ve mastered the system. Rebrand to reset the stage.
          </p>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

// ---------------------------------------------------------------------------
// Row subcomponent
// ---------------------------------------------------------------------------

function ShopRow({
  row,
  pulsing,
  shaking,
  onAction,
}: {
  row: RowData;
  pulsing: boolean;
  shaking: boolean;
  onAction: () => void;
}) {
  const state = row.purchaseState;
  const rowClasses = [
    'shop-row',
    `shop-row-${state}`,
    row.atMax ? 'shop-row-atmax' : '',
    pulsing ? 'shop-row-pulsing' : '',
    shaking ? 'shop-row-shaking' : '',
  ].filter(Boolean).join(' ');

  const costClasses = [
    'shop-row-cost',
    state === 'insufficient' ? 'shop-row-cost-insufficient' : '',
    row.atMax ? 'shop-row-cost-max' : '',
  ].filter(Boolean).join(' ');

  // Tooltip content for ⬆ button context.
  const buttonAriaLabel = row.atMax
    ? row.oneShot
      ? `${row.display.name} — owned`
      : `${row.display.name} — max level`
    : state === 'insufficient'
      ? `Purchase ${row.display.name} (need ${row.nextCost} Clout)`
      : `Purchase ${row.display.name} for ${row.nextCost} Clout`;

  return (
    <div className={rowClasses}>
      <span className="shop-row-icon" aria-hidden="true">{row.display.icon}</span>
      <div className="shop-row-text">
        <div className="shop-row-name">{row.display.name}</div>
        <div className="shop-row-desc">{row.display.description}</div>
      </div>
      <div className="shop-row-level">{row.levelLabel}</div>
      <div className={costClasses}>{row.costLabel}</div>
      {row.atMax ? (
        <div className="shop-row-btn-placeholder" aria-hidden="true" />
      ) : (
        <button
          className={`shop-row-btn shop-row-btn-${state}`}
          onClick={onAction}
          aria-label={buttonAriaLabel}
        >
          ⬆
        </button>
      )}
    </div>
  );
}
