// Tests for the pure interpolateValue helper.
// The hook itself (useInterpolatedValue) wraps RAF + React state, which
// requires a browser environment to test; these tests cover the calculation
// logic that the hook delegates to.

import { describe, it, expect } from 'vitest';
import { interpolateValue } from './useInterpolatedValue.ts';

const TICK_MS = 100; // mirrors TICK_INTERVAL_MS

describe('interpolateValue', () => {
  it('returns lastValue unchanged when elapsed is 0', () => {
    expect(interpolateValue(500, 10, 0)).toBe(500);
  });

  it('advances value by ratePerSec × elapsed correctly', () => {
    // 10/sec × 50ms = +0.5
    expect(interpolateValue(100, 10, 50)).toBeCloseTo(100.5);
  });

  it('handles a 100ms elapsed at a 6.8/sec rate correctly', () => {
    // 6.8/sec × 100ms = +0.68
    expect(interpolateValue(1000, 6.8, 100)).toBeCloseTo(1000.68);
  });

  it('clamp=true caps elapsed at maxMs (default TICK_INTERVAL_MS)', () => {
    // Without clamp: 10/sec × 200ms = +2.0. With clamp at 100ms: +1.0.
    const unclamped = interpolateValue(100, 10, 200, false, TICK_MS);
    const clamped   = interpolateValue(100, 10, 200, true,  TICK_MS);
    expect(unclamped).toBeCloseTo(102);
    expect(clamped).toBeCloseTo(101);
  });

  it('clamp=false allows elapsed to exceed maxMs', () => {
    expect(interpolateValue(0, 10, 500, false, TICK_MS)).toBeCloseTo(5);
  });

  it('handles zero rate — value stays at lastValue regardless of elapsed', () => {
    expect(interpolateValue(999, 0, 1000)).toBe(999);
  });

  it('handles fractional rates below 1/sec', () => {
    // 0.4/sec × 600ms = +0.24
    expect(interpolateValue(12, 0.4, 600, false)).toBeCloseTo(12.24);
  });

  it('handles large rates (late-game)', () => {
    // 1_000_000/sec × 100ms = +100_000
    expect(interpolateValue(5_000_000, 1_000_000, 100)).toBeCloseTo(5_100_000);
  });

  it('clamp with custom maxMs', () => {
    // maxMs = 50: elapsed 200ms clamped to 50ms, so 10/sec × 50ms = +0.5
    expect(interpolateValue(100, 10, 200, true, 50)).toBeCloseTo(100.5);
  });
});
