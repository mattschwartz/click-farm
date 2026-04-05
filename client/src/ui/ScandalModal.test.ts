// Tests for ScandalModal pure helpers (task #31).
// These cover the slider damage reduction calculation — the primary UI math.

import { describe, it, expect } from 'vitest';
import { computeProjectedLoss } from './ScandalModal.tsx';

describe('computeProjectedLoss — slider damage reduction', () => {
  it('returns maxLoss when spend is 0', () => {
    expect(computeProjectedLoss(1000, 300, 0, 5000)).toBe(1000);
  });

  it('returns minLoss when spend equals engagement balance', () => {
    expect(computeProjectedLoss(1000, 300, 5000, 5000)).toBe(300);
  });

  it('returns proportional loss at half spend', () => {
    // At half engagement: spendFraction=0.5 → loss = max - 0.5*(max-min)
    const projected = computeProjectedLoss(1000, 300, 2500, 5000);
    expect(projected).toBe(650); // 1000 - 0.5*(1000-300) = 650
  });

  it('clamps spend above engagement balance to minLoss', () => {
    // Spending more than balance → fraction capped at 1 → minLoss
    expect(computeProjectedLoss(1000, 300, 9999, 5000)).toBe(300);
  });

  it('returns maxLoss when engagement balance is zero', () => {
    expect(computeProjectedLoss(500, 150, 0, 0)).toBe(500);
  });

  it('returns 0 when maxLoss is 0', () => {
    expect(computeProjectedLoss(0, 0, 1000, 5000)).toBe(0);
  });
});
