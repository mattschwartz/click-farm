// Tests for GeneratorList pure helpers (task #69).

import { describe, it, expect } from 'vitest';
import {
  classifyLvlBtnState,
  shouldApplyManyReady,
  MANY_READY_THRESHOLD,
} from './GeneratorList.tsx';

describe('classifyLvlBtnState', () => {
  it('returns dormant when no units are owned', () => {
    expect(classifyLvlBtnState(0, 100, 50)).toBe('dormant');
    expect(classifyLvlBtnState(0, 0, 0)).toBe('dormant');
  });

  it('treats negative counts as dormant (defensive)', () => {
    expect(classifyLvlBtnState(-1, 1000, 10)).toBe('dormant');
  });

  it('returns armed when owned but engagement < upgradeCost', () => {
    expect(classifyLvlBtnState(1, 49, 50)).toBe('armed');
    expect(classifyLvlBtnState(5, 0, 100)).toBe('armed');
  });

  it('returns ready when owned and engagement >= upgradeCost', () => {
    expect(classifyLvlBtnState(1, 50, 50)).toBe('ready');
    expect(classifyLvlBtnState(1, 1000, 50)).toBe('ready');
  });

  it('ready is inclusive at the exact cost', () => {
    // Spec: engagement >= upgradeCost. Equality must count as affordable.
    expect(classifyLvlBtnState(1, 42, 42)).toBe('ready');
  });

  it('count gate precedes affordability — a player with lots of engagement but no units is still dormant', () => {
    expect(classifyLvlBtnState(0, 999_999, 10)).toBe('dormant');
  });
});

describe('shouldApplyManyReady', () => {
  it('threshold is 4', () => {
    expect(MANY_READY_THRESHOLD).toBe(4);
  });

  it('returns false below threshold', () => {
    expect(shouldApplyManyReady(0)).toBe(false);
    expect(shouldApplyManyReady(1)).toBe(false);
    expect(shouldApplyManyReady(3)).toBe(false);
  });

  it('returns true at and above threshold', () => {
    expect(shouldApplyManyReady(4)).toBe(true);
    expect(shouldApplyManyReady(5)).toBe(true);
    expect(shouldApplyManyReady(99)).toBe(true);
  });
});
