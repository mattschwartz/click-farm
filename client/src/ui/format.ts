// Number and duration formatting helpers for the core game screen.
// Per UX spec §5.1, compact notation kicks in at ≥10,000: 12,480 → 12.4K.

/**
 * Compact-notation float: preserves 1 decimal for readability under 10k,
 * switches to K/M/B/T suffixes above. Used for the P0 engagement counter.
 */
export function fmtCompact(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000_000) return `${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  if (abs >= 1_000) return n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (abs >= 100) return n.toFixed(0);
  if (abs >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

/**
 * Integer compact formatting — followers are whole counts.
 * Same K/M/B/T rule at ≥10,000 per UX spec §5.2.
 */
export function fmtCompactInt(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const floored = Math.floor(n);
  const abs = Math.abs(floored);
  if (abs >= 1_000_000_000_000) return `${(floored / 1_000_000_000_000).toFixed(2)}T`;
  if (abs >= 1_000_000_000) return `${(floored / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(floored / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `${(floored / 1_000).toFixed(1)}K`;
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
