// TieredNumber — renders a compact number with the suffix colored by tier.
// The number portion stays in inherited text color; the suffix gets the
// tier color from tokens.css (--tier-k through --tier-vg).

import type Decimal from 'decimal.js';
import type { TieredParts } from './format.ts';
import { fmtCompactParts, fmtCompactIntParts } from './format.ts';

interface Props {
  /** Pre-computed parts, OR pass `value` to compute inline. */
  parts?: TieredParts;
  /** Raw number — used when `parts` is not provided. Uses fmtCompactParts. */
  value?: Decimal | number;
  /** Use integer formatting (fmtCompactIntParts) instead of float. */
  int?: boolean;
  /** Optional prefix (e.g. "+"). */
  prefix?: string;
  /** Optional suffix appended after the tier suffix (e.g. "/s"). */
  after?: string;
}

export function TieredNumber({ parts, value, int, prefix, after }: Props) {
  const p = parts ?? (value !== undefined
    ? (int ? fmtCompactIntParts(value) : fmtCompactParts(value))
    : { number: '—', suffix: '', color: null });

  return (
    <>
      {prefix}{p.number}
      {p.suffix && (
        <span style={p.color ? { color: p.color } : undefined}>{p.suffix}</span>
      )}
      {after}
    </>
  );
}
