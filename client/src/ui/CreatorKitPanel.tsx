// Creator Kit panel — collapsible per-run upgrade menu per ux/creator-kit-panel.md.
//
// Pure helpers are exported alongside the component so they can be covered by
// unit tests (the UI test harness here is pure-logic only — no jsdom).
//
// Visual intent (UX §3.3): smaller type scale, 40px rows, no left-edge stripe,
// no fill — the panel MUST NOT compete with the generator list for first
// glance. See the spec for exact sizing.
//
// Peek-signal (UX §5) is driven by isPeekSignalActive(...) and rendered by
// the TopBar plus a left-edge stripe on the collapsed strip (§2.2).

import { useState } from 'react';
import type { GameState, KitItemId, StaticData } from '../types.ts';
import { kitItemCost } from '../creator-kit/index.ts';
import { fmtCompactInt } from './format.ts';

// ---------------------------------------------------------------------------
// Display metadata — §6 (icons) and §7 (flavor copy) from the UX spec.
// Provisional emoji glyphs per the existing UI convention (see display.ts).
// ---------------------------------------------------------------------------

export interface KitItemDisplay {
  /** Human-facing name. */
  name: string;
  /** Provisional icon glyph. */
  icon: string;
  /** ≤45-char flavor line, muted italic. */
  flavor: string;
}

export const KIT_ITEM_DISPLAY: Record<KitItemId, KitItemDisplay> = {
  camera: {
    name: 'Camera',
    icon: '📷',
    flavor: 'Better glass. Better content. Allegedly.',
  },
  laptop: {
    name: 'Laptop',
    icon: '💻',
    flavor: "You're analyzing trends. Definitely.",
  },
  phone: {
    name: 'Phone',
    icon: '📱',
    flavor: 'Always connected. Always online. Always.',
  },
  wardrobe: {
    name: 'Wardrobe',
    icon: '👔',
    flavor: 'Dress like a creator. Become one.',
  },
  mogging: {
    name: 'Mogging',
    icon: '💪',
    flavor: "When going viral isn't enough.",
  },
};

// Static declaration order — iteration of Record<KitItemId, ...> should not
// be relied on in dense code. This is the order the panel renders rows in.
export const KIT_ITEM_ORDER: readonly KitItemId[] = [
  'camera',
  'laptop',
  'phone',
  'wardrobe',
  'mogging',
] as const;

// ---------------------------------------------------------------------------
// Pure helpers (exported for unit tests)
// ---------------------------------------------------------------------------

/** Count of kit items currently owned at L1 or above. Used by the collapsed
 * header's "N active" annotation (§2.1). */
export function countActiveKitItems(
  creatorKit: Record<KitItemId, number>,
): number {
  let n = 0;
  for (const id of Object.keys(creatorKit) as KitItemId[]) {
    const level = creatorKit[id];
    if (level !== undefined && level > 0) n++;
  }
  return n;
}

export type KitRowPurchaseState = 'affordable' | 'unaffordable' | 'max';

/** Affordance state of the purchase button on a single kit row (§3.2). */
export function getKitRowPurchaseState(
  engagement: number,
  nextCost: number | null,
): KitRowPurchaseState {
  if (nextCost === null) return 'max';
  return engagement >= nextCost ? 'affordable' : 'unaffordable';
}

/**
 * Peek-signal trigger condition (§5.1):
 *   active iff Engagement ≥ min(nextLevelCost for items where level < max)
 *
 * Returns false when every item is at max level (nothing left to buy) or
 * when the player can't afford the cheapest upgrade.
 */
export function isPeekSignalActive(
  state: GameState,
  staticData: StaticData,
): boolean {
  let minCost: number | null = null;
  for (const id of KIT_ITEM_ORDER) {
    const level = state.player.creator_kit[id] ?? 0;
    const cost = kitItemCost(level, id, staticData);
    if (cost === null) continue; // item at max
    if (minCost === null || cost < minCost) minCost = cost;
  }
  if (minCost === null) return false; // everything maxed
  return state.player.engagement >= minCost;
}

/**
 * Row-level indicator text shown above the cost. Examples:
 *   "L0 → L1", "L2 → L3", "MAX"
 */
export function formatKitLevelIndicator(
  currentLevel: number,
  maxLevel: number,
): string {
  if (currentLevel >= maxLevel) return 'MAX';
  return `L${currentLevel} → L${currentLevel + 1}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  state: GameState;
  staticData: StaticData;
  onBuy: (id: KitItemId) => void;
  /**
   * Initial expanded state. Default false (collapsed) per UX §4.4 — every
   * load defaults to collapsed. Within-session expanded persistence is the
   * parent's responsibility; this component is uncontrolled but accepts an
   * initial value so the parent can hydrate from sessionStorage if desired.
   */
  initialExpanded?: boolean;
}

export function CreatorKitPanel({
  state,
  staticData,
  onBuy,
  initialExpanded = false,
}: Props) {
  const [expanded, setExpanded] = useState(initialExpanded);

  const peekActive = isPeekSignalActive(state, staticData);
  const activeCount = countActiveKitItems(state.player.creator_kit);

  const toggle = () => setExpanded((v) => !v);

  const onHeaderKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <section
      className={`kit-panel${expanded ? ' kit-panel-expanded' : ''}${peekActive ? ' kit-panel-peek' : ''}`}
      aria-label="Creator Kit"
    >
      <div
        role="button"
        tabIndex={0}
        className="kit-header"
        onClick={toggle}
        onKeyDown={onHeaderKey}
        aria-expanded={expanded}
        aria-label={
          expanded
            ? 'Creator Kit, expanded. Press Enter to collapse.'
            : `Creator Kit, ${activeCount} items active, collapsed. Press Enter to expand.`
        }
      >
        <span className="kit-header-icon" aria-hidden>🎒</span>
        <span className="kit-header-label">CREATOR KIT</span>
        {activeCount > 0 && !expanded && (
          <span className="kit-active-count">{activeCount} active</span>
        )}
        <span className={`kit-chevron${expanded ? ' open' : ''}`} aria-hidden>
          ⌄
        </span>
      </div>

      {expanded && (
        <div className="kit-rows">
          {KIT_ITEM_ORDER.map((id) => (
            <KitRow
              key={id}
              itemId={id}
              state={state}
              staticData={staticData}
              onBuy={onBuy}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

interface KitRowProps {
  itemId: KitItemId;
  state: GameState;
  staticData: StaticData;
  onBuy: (id: KitItemId) => void;
}

function KitRow({ itemId, state, staticData, onBuy }: KitRowProps) {
  const def = staticData.creatorKitItems[itemId];
  const display = KIT_ITEM_DISPLAY[itemId];
  const currentLevel = state.player.creator_kit[itemId] ?? 0;
  const nextCost = kitItemCost(currentLevel, itemId, staticData);
  const purchaseState = getKitRowPurchaseState(
    state.player.engagement,
    nextCost,
  );
  const levelIndicator = formatKitLevelIndicator(currentLevel, def.max_level);

  const purchaseLabel =
    purchaseState === 'affordable'
      ? `${display.name}, Level ${currentLevel} to ${currentLevel + 1}. Cost: ${nextCost} Engagement. Press Enter to purchase.`
      : purchaseState === 'unaffordable'
        ? `${display.name}, Level ${currentLevel} to ${currentLevel + 1}. Cost: ${nextCost} Engagement. Not enough Engagement.`
        : `${display.name}, Max level.`;

  return (
    <div className={`kit-row kit-row-${purchaseState}`}>
      <span className="kit-row-icon" aria-hidden>{display.icon}</span>
      <div className="kit-row-text">
        <div className="kit-row-top">
          <span className="kit-row-name">{display.name}</span>
          <span className="kit-row-flavor">{display.flavor}</span>
        </div>
        <div className="kit-row-bottom">
          <span className="kit-row-level">{levelIndicator}</span>
          {nextCost !== null && (
            <span className="kit-row-cost">{fmtCompactInt(nextCost)} eng</span>
          )}
        </div>
      </div>
      {purchaseState !== 'max' && (
        <button
          type="button"
          className="kit-row-buy"
          onClick={() => onBuy(itemId)}
          disabled={purchaseState === 'unaffordable'}
          aria-label={purchaseLabel}
          title={purchaseLabel}
        >
          ▲
        </button>
      )}
    </div>
  );
}
