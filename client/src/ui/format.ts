// Number and duration formatting helpers for the core game screen.
// Per UX spec §5.1, compact notation kicks in at ≥10,000: 12,480 → 12.4K.

import type Decimal from 'decimal.js';

/** Accept either a native number or a decimal.js Decimal. */
type NumericInput = Decimal | number;

/** Safely convert a NumericInput to a native number for display formatting. */
function toNum(n: NumericInput): number {
  return typeof n === 'number' ? n : n.toNumber();
}

/** Check if a NumericInput is a Decimal instance (has .toNumber method). */
function isDecimal(n: NumericInput): n is Decimal {
  return typeof n !== 'number';
}

// ---------------------------------------------------------------------------
// Suffix table — each entry is [threshold, divisor, suffix, decimals].
// Threshold: minimum abs value to enter this tier.
// Divisor: what to divide by before formatting (may differ from threshold).
// Ordered descending so the first match wins.
// Extends to Vg (10^63); anything below 10k falls through to the sub-K path.
// 3-char suffixes use 0 decimals to stay within the 7-char display cap.
// ---------------------------------------------------------------------------
const TIERS: ReadonlyArray<readonly [number, number, string, number]> = [
  [1e63, 1e63, 'Vg',  2],  // vigintillion
  [1e60, 1e60, 'Nod', 0],  // novemdecillion
  [1e57, 1e57, 'Ocd', 0],  // octodecillion
  [1e54, 1e54, 'Spd', 0],  // septendecillion
  [1e51, 1e51, 'Sxd', 0],  // sexdecillion
  [1e48, 1e48, 'Qid', 0],  // quindecillion
  [1e45, 1e45, 'Qad', 0],  // quattuordecillion
  [1e42, 1e42, 'Td',  2],  // tredecillion
  [1e39, 1e39, 'Dd',  2],  // duodecillion
  [1e36, 1e36, 'Ud',  2],  // undecillion
  [1e33, 1e33, 'Dc',  2],  // decillion
  [1e30, 1e30, 'No',  2],  // nonillion
  [1e27, 1e27, 'Oc',  2],  // octillion
  [1e24, 1e24, 'Sp',  2],  // septillion
  [1e21, 1e21, 'Sx',  2],  // sextillion
  [1e18, 1e18, 'Qi',  2],  // quintillion
  [1e15, 1e15, 'Qa',  2],  // quadrillion
  [1e12, 1e12, 'T',   2],
  [1e9,  1e9,  'B',   2],
  [1e6,  1e6,  'M',   2],
  [1e4,  1e3,  'K',   1],  // kicks in at ≥10,000, divides by 1,000 (UX §5.1)
];

function applyTier(value: number, abs: number): string | null {
  for (const [threshold, divisor, suffix, decimals] of TIERS) {
    if (abs >= threshold) {
      return `${(value / divisor).toFixed(decimals)}${suffix}`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Structured output for tier-colored rendering
// ---------------------------------------------------------------------------

/** CSS variable name for each suffix tier. */
const TIER_COLOR_VAR: Record<string, string> = {
  K:   'var(--tier-k)',
  M:   'var(--tier-m)',
  B:   'var(--tier-b)',
  T:   'var(--tier-t)',
  Qa:  'var(--tier-qa)',
  Qi:  'var(--tier-qi)',
  Sx:  'var(--tier-sx)',
  Sp:  'var(--tier-sp)',
  Oc:  'var(--tier-oc)',
  No:  'var(--tier-no)',
  Dc:  'var(--tier-dc)',
  Ud:  'var(--tier-ud)',
  Dd:  'var(--tier-dd)',
  Td:  'var(--tier-td)',
  Qad: 'var(--tier-qad)',
  Qid: 'var(--tier-qid)',
  Sxd: 'var(--tier-sxd)',
  Spd: 'var(--tier-spd)',
  Ocd: 'var(--tier-ocd)',
  Nod: 'var(--tier-nod)',
  Vg:  'var(--tier-vg)',
};

export interface TieredParts {
  /** The numeric portion (e.g. "422.39"). */
  number: string;
  /** The suffix (e.g. "M"), or empty string if below K threshold. */
  suffix: string;
  /** CSS color variable for the suffix, or null if no suffix. */
  color: string | null;
}

function applyTierStructured(value: number, abs: number): TieredParts | null {
  for (const [threshold, divisor, suffix, decimals] of TIERS) {
    if (abs >= threshold) {
      return {
        number: (value / divisor).toFixed(decimals),
        suffix,
        color: TIER_COLOR_VAR[suffix] ?? null,
      };
    }
  }
  return null;
}

/**
 * Overflow formatting for values beyond the tier table (≥1e66).
 * For Decimal inputs, uses Decimal.toExponential to preserve precision.
 * For number inputs, uses native toExponential.
 */
function fmtOverflow(n: NumericInput, abs: number): string {
  if (isDecimal(n)) return n.toExponential(2);
  return abs.toExponential(2);
}

/**
 * Structured compact format — returns separate number and suffix parts
 * so the rendering layer can color the suffix by tier.
 */
export function fmtCompactParts(n: NumericInput): TieredParts {
  const num = toNum(n);
  if (!Number.isFinite(num)) return { number: '—', suffix: '', color: null };
  const abs = Math.abs(num);
  if (abs >= 1e66) return { number: fmtOverflow(n, abs), suffix: '', color: null };

  const tiered = applyTierStructured(num, abs);
  if (tiered !== null) return tiered;

  let s: string;
  if (abs >= 1_000) s = num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  else if (abs >= 100) s = num.toFixed(0);
  else if (abs >= 10) s = num.toFixed(1);
  else s = num.toFixed(2);
  return { number: s, suffix: '', color: null };
}

/** Structured integer compact format (floors the input). */
export function fmtCompactIntParts(n: NumericInput): TieredParts {
  const num = toNum(n);
  if (!Number.isFinite(num)) return { number: '—', suffix: '', color: null };
  const floored = Math.floor(num);
  const abs = Math.abs(floored);
  if (abs >= 1e66) return { number: fmtOverflow(n, abs), suffix: '', color: null };

  const tiered = applyTierStructured(floored, abs);
  if (tiered !== null) return tiered;

  return { number: floored.toLocaleString(), suffix: '', color: null };
}

/**
 * Compact-notation float: preserves 1 decimal for readability under 10k,
 * switches to K/M/B/T/Qa/… suffixes above. Used for the P0 engagement counter.
 * Falls back to clean exponential notation for values beyond Vg (10^63).
 */
export function fmtCompact(n: NumericInput): string {
  const num = toNum(n);
  if (!Number.isFinite(num)) return '—';
  const abs = Math.abs(num);

  // Beyond tier table (≥1e66): clean exponential
  if (abs >= 1e66) return fmtOverflow(n, abs);

  const tiered = applyTier(num, abs);
  if (tiered !== null) return tiered;

  if (abs >= 1_000) return num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (abs >= 100) return num.toFixed(0);
  if (abs >= 10) return num.toFixed(1);
  return num.toFixed(2);
}

/**
 * Integer compact formatting — followers and Clout are whole counts.
 * Same K/M/B/T/Qa/… rule at ≥10,000 per UX spec §5.2.
 * Falls back to clean exponential notation for values beyond Vg (10^63).
 */
export function fmtCompactInt(n: NumericInput): string {
  const num = toNum(n);
  if (!Number.isFinite(num)) return '—';
  const floored = Math.floor(num);
  const abs = Math.abs(floored);

  // Beyond tier table (≥1e66): clean exponential
  if (abs >= 1e66) return fmtOverflow(n, abs);

  const tiered = applyTier(floored, abs);
  if (tiered !== null) return tiered;

  return floored.toLocaleString();
}

/** Rate formatting for sub-labels — `+18.0/s` or `+1.2K/s`.
 *  Per game-screen-hud-refinements §4.2: rates append `/s`, deltas prefix `+`. */
export function fmtRate(n: NumericInput): string {
  const num = toNum(n);
  if (!Number.isFinite(num) || num <= 0) return '0/s';
  return `+${fmtCompact(num)}/s`;
}

/** Human-friendly elapsed duration for the offline modal. */
export function fmtDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}
