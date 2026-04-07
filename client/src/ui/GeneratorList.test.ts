// Tests for GeneratorList pure helpers (task #69, extended in #89).

import { describe, it, expect } from 'vitest';
import {
  classifyLvlBtnState,
  shouldApplyManyReady,
  shouldFireMaxedArrival,
  MANY_READY_THRESHOLD,
  buyAllLabel,
  buyAllDisabled,
} from './GeneratorList.tsx';

// Signature: classifyLvlBtnState(count, level, maxLevel, engagement, upgradeCost)

describe('classifyLvlBtnState', () => {
  it('returns armed when engagement < upgradeCost', () => {
    expect(classifyLvlBtnState(1, 1, 10, 49, 50)).toBe('armed');
    expect(classifyLvlBtnState(5, 1, 10, 0, 100)).toBe('armed');
  });

  it('returns armed even at count=0 (SPEED not gated by POWER)', () => {
    expect(classifyLvlBtnState(0, 1, 10, 0, 50)).toBe('armed');
  });

  it('returns ready when engagement >= upgradeCost', () => {
    expect(classifyLvlBtnState(1, 1, 10, 50, 50)).toBe('ready');
    expect(classifyLvlBtnState(1, 1, 10, 1000, 50)).toBe('ready');
  });

  it('returns ready at count=0 if affordable', () => {
    expect(classifyLvlBtnState(0, 1, 10, 999_999, 10)).toBe('ready');
  });

  it('ready is inclusive at the exact cost', () => {
    expect(classifyLvlBtnState(1, 1, 10, 42, 42)).toBe('ready');
  });

  it('returns maxed when level >= maxLevel (task #89)', () => {
    expect(classifyLvlBtnState(1, 10, 10, 999_999, 50)).toBe('maxed');
    expect(classifyLvlBtnState(1, 11, 10, 0, 0)).toBe('maxed');
  });

  it('returns maxed at count=0 if at level cap', () => {
    expect(classifyLvlBtnState(0, 10, 10, 999_999, 50)).toBe('maxed');
  });

  it('max check precedes affordability — fully leveled stays maxed even if affordable', () => {
    expect(classifyLvlBtnState(1, 10, 10, 0, 50)).toBe('maxed');
  });
});

describe('shouldFireMaxedArrival (task #101)', () => {
  it('does not fire on mount — prev is null (save-loaded maxed row)', () => {
    expect(shouldFireMaxedArrival('maxed', null)).toBe(false);
  });

  it('fires on the live ready→maxed transition', () => {
    expect(shouldFireMaxedArrival('maxed', 'ready')).toBe(true);
  });

  it('fires on armed→maxed (defensive — would require a level jump)', () => {
    expect(shouldFireMaxedArrival('maxed', 'armed')).toBe(true);
  });

  it('does not re-fire when already maxed', () => {
    expect(shouldFireMaxedArrival('maxed', 'maxed')).toBe(false);
  });

  it('does not fire when current state is not maxed', () => {
    expect(shouldFireMaxedArrival('ready', 'armed')).toBe(false);
    expect(shouldFireMaxedArrival('armed', 'ready')).toBe(false);
    expect(shouldFireMaxedArrival('ready', 'maxed')).toBe(false);
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

// ---------------------------------------------------------------------------
// BuyAllButton helpers — label and disabled state
// ---------------------------------------------------------------------------

describe('buyAllLabel', () => {
  it('returns STOP when sweep is active', () => {
    expect(buyAllLabel(true, 0)).toBe('STOP');
    expect(buyAllLabel(true, 5)).toBe('STOP');
  });

  it('returns BUY ALL (N) when idle', () => {
    expect(buyAllLabel(false, 0)).toBe('BUY ALL (0)');
    expect(buyAllLabel(false, 3)).toBe('BUY ALL (3)');
    expect(buyAllLabel(false, 12)).toBe('BUY ALL (12)');
  });
});

describe('buyAllDisabled', () => {
  it('is disabled when idle and previewCount === 0', () => {
    expect(buyAllDisabled(false, 0)).toBe(true);
  });

  it('is enabled when idle and previewCount > 0', () => {
    expect(buyAllDisabled(false, 1)).toBe(false);
    expect(buyAllDisabled(false, 10)).toBe(false);
  });

  it('is enabled when sweeping (STOP is tappable), even at count 0', () => {
    expect(buyAllDisabled(true, 0)).toBe(false);
    expect(buyAllDisabled(true, 5)).toBe(false);
  });
});
