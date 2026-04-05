// Number and duration formatting helpers for the core game screen.
// Per UX spec §5.1, compact notation kicks in at ≥10,000: 12,480 → 12.4K.

// ---------------------------------------------------------------------------
// Suffix table — each entry is [threshold, divisor, suffix, decimals].
// Threshold: minimum abs value to enter this tier.
// Divisor: what to divide by before formatting (may differ from threshold).
// Ordered descending so the first match wins.
// Extends to Dc (10^33); anything below 10k falls through to the sub-K path.
// ---------------------------------------------------------------------------
const TIERS: ReadonlyArray<readonly [number, number, string, number]> = [
  [1e33, 1e33, 'Dc', 2],  // decillion
  [1e30, 1e30, 'No', 2],  // nonillion
  [1e27, 1e27, 'Oc', 2],  // octillion
  [1e24, 1e24, 'Sp', 2],  // septillion
  [1e21, 1e21, 'Sx', 2],  // sextillion
  [1e18, 1e18, 'Qi', 2],  // quintillion
  [1e15, 1e15, 'Qa', 2],  // quadrillion
  [1e12, 1e12, 'T',  2],
  [1e9,  1e9,  'B',  2],
  [1e6,  1e6,  'M',  2],
  [1e4,  1e3,  'K',  1],  // kicks in at ≥10,000, divides by 1,000 (UX §5.1)
];

function applyTier(value: number, abs: number): string | null {
  for (const [threshold, divisor, suffix, decimals] of TIERS) {
    if (abs >= threshold) {
      return `${(value / divisor).toFixed(decimals)}${suffix}`;
    }
  }
  return null;
}

/**
 * Compact-notation float: preserves 1 decimal for readability under 10k,
 * switches to K/M/B/T/Qa/… suffixes above. Used for the P0 engagement counter.
 * Falls back to clean exponential notation (e.g. 1.41e+151) for values beyond Dc (10^33).
 */
export function fmtCompact(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);

  // Beyond Dc range (≥1e36 would read "1000.00Dc"): clean exponential instead of raw JS toString
  if (abs >= 1e36) return n.toExponential(2);

  const tiered = applyTier(n, abs);
  if (tiered !== null) return tiered;

  if (abs >= 1_000) return n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (abs >= 100) return n.toFixed(0);
  if (abs >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

/**
 * Integer compact formatting — followers and Clout are whole counts.
 * Same K/M/B/T/Qa/… rule at ≥10,000 per UX spec §5.2.
 * Falls back to clean exponential notation (e.g. 1.41e+151) for values beyond Dc (10^33).
 */
export function fmtCompactInt(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const floored = Math.floor(n);
  const abs = Math.abs(floored);

  // Beyond Dc range (≥1e36 would read "1000.00Dc"): clean exponential instead of raw JS toString
  if (abs >= 1e36) return floored.toExponential(2);

  const tiered = applyTier(floored, abs);
  if (tiered !== null) return tiered;

  return floored.toLocaleString();
}

/** Rate formatting for sub-labels — `+18/sec` or `+1.2K/sec`. */
export function fmtRate(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0/sec';
  return `+${fmtCompact(n)}/sec`;
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
