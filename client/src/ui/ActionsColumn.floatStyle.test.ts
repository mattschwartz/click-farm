// Tests for ratio-scaled manual tap float styling.
// Spec: proposals/accepted/20260406-ratio-scaled-manual-tap-floats.md
// Note: color is currently hardcoded to '#FFFFFF' — size scaling is active.

import { describe, it, expect } from 'vitest';
import { floatStyle } from './ActionsColumn.tsx';

describe('floatStyle', () => {
  it('returns t=1.0 (max size) when engagement <= 1 (first tap)', () => {
    const result = floatStyle(10, 0);
    expect(result.fontSize).toBe(32);
    expect(result.color).toBe('#FFFFFF');
  });

  it('returns t=1.0 when perClick equals currentEngagement', () => {
    const result = floatStyle(500, 500);
    expect(result.fontSize).toBe(32);
    expect(result.color).toBe('#FFFFFF');
  });

  it('returns t=0.0 (min size) at ratio 1e-6', () => {
    // ratio = 1 / 1_000_000 = 1e-6 → log10 = -6 → t = (-6+6)/6 = 0
    const result = floatStyle(1, 1_000_000);
    expect(result.fontSize).toBe(16);
  });

  it('clamps t at 0 for ratios below 1e-6', () => {
    const result = floatStyle(1, 1_000_000_000);
    expect(result.fontSize).toBe(16);
  });

  it('clamps t at 1 for ratios above 1.0', () => {
    // perClick > engagement — still caps at t=1
    const result = floatStyle(1000, 1);
    expect(result.fontSize).toBe(32);
  });

  it('returns midpoint values at ratio 0.001 (t ≈ 0.5)', () => {
    // ratio = 1/1000 = 0.001 → log10 = -3 → t = (-3+6)/6 = 0.5
    const result = floatStyle(1, 1000);
    expect(result.fontSize).toBe(24); // lerp(16, 32, 0.5)
  });

  it('uses max(1, engagement) floor — engagement of 0 does not cause division by zero', () => {
    const result = floatStyle(5, 0);
    // ratio = 5/1 = 5 → log10(5) ≈ 0.699 → t = (0.699+6)/6 ≈ 1.116 → clamped to 1
    expect(result.fontSize).toBe(32);
  });

  it('scales continuously between floor and ceiling', () => {
    // ratio = 0.01 → log10 = -2 → t = (-2+6)/6 = 4/6 ≈ 0.6667
    const result = floatStyle(1, 100);
    const expectedT = 4 / 6;
    const expectedSize = 16 + (32 - 16) * expectedT;
    expect(result.fontSize).toBeCloseTo(expectedSize, 5);
  });
});
