// Tests for GeneratorList pure helpers (task #69, extended in #89).

import { describe, it, expect } from 'vitest';
import {
  classifyLvlBtnState,
  shouldApplyManyReady,
  shouldFireMaxedArrival,
  MANY_READY_THRESHOLD,
} from './GeneratorList.tsx';

// Signature: classifyLvlBtnState(count, level, maxLevel, engagement, upgradeCost)

describe('classifyLvlBtnState', () => {
  it('returns dormant when no units are owned', () => {
    expect(classifyLvlBtnState(0, 1, 10, 100, 50)).toBe('dormant');
    expect(classifyLvlBtnState(0, 1, 10, 0, 0)).toBe('dormant');
  });

  it('treats negative counts as dormant (defensive)', () => {
    expect(classifyLvlBtnState(-1, 1, 10, 1000, 10)).toBe('dormant');
  });

  it('returns armed when owned but engagement < upgradeCost', () => {
    expect(classifyLvlBtnState(1, 1, 10, 49, 50)).toBe('armed');
    expect(classifyLvlBtnState(5, 1, 10, 0, 100)).toBe('armed');
  });

  it('returns ready when owned and engagement >= upgradeCost', () => {
    expect(classifyLvlBtnState(1, 1, 10, 50, 50)).toBe('ready');
    expect(classifyLvlBtnState(1, 1, 10, 1000, 50)).toBe('ready');
  });

  it('ready is inclusive at the exact cost', () => {
    // Spec: engagement >= upgradeCost. Equality must count as affordable.
    expect(classifyLvlBtnState(1, 1, 10, 42, 42)).toBe('ready');
  });

  it('count gate precedes affordability — a player with lots of engagement but no units is still dormant', () => {
    expect(classifyLvlBtnState(0, 1, 10, 999_999, 10)).toBe('dormant');
  });

  it('returns maxed when level >= maxLevel (task #89)', () => {
    expect(classifyLvlBtnState(1, 10, 10, 999_999, 50)).toBe('maxed');
    expect(classifyLvlBtnState(1, 11, 10, 0, 0)).toBe('maxed');
  });

  it('count gate precedes max check — no units, at level cap, still dormant', () => {
    // This can only happen post-prestige-rebrand (owned=true, count=0 scenarios)
    // or via save migration — we still prefer "dormant" because the row has
    // nothing to act on.
    expect(classifyLvlBtnState(0, 10, 10, 999_999, 50)).toBe('dormant');
  });

  it('max check precedes affordability — fully leveled stays maxed even if affordable', () => {
    expect(classifyLvlBtnState(1, 10, 10, 0, 50)).toBe('maxed');
  });
});

describe('shouldFireMaxedArrival (task #101)', () => {
  it('does not fire on mount — prev is null (save-loaded maxed row)', () => {
    // Mount guard: a generator that loaded from save already at max must
    // NOT celebrate — the player did not achieve the transition this session.
    expect(shouldFireMaxedArrival('maxed', null)).toBe(false);
  });

  it('fires on the live ready→maxed transition', () => {
    expect(shouldFireMaxedArrival('maxed', 'ready')).toBe(true);
  });

  it('fires on armed→maxed and dormant→maxed (defensive — would require a level jump)', () => {
    // Not expected in normal play, but the function should behave
    // consistently: any non-maxed prev → maxed triggers the celebration.
    expect(shouldFireMaxedArrival('maxed', 'armed')).toBe(true);
    expect(shouldFireMaxedArrival('maxed', 'dormant')).toBe(true);
  });

  it('does not re-fire when already maxed', () => {
    expect(shouldFireMaxedArrival('maxed', 'maxed')).toBe(false);
  });

  it('does not fire when current state is not maxed', () => {
    expect(shouldFireMaxedArrival('ready', 'armed')).toBe(false);
    expect(shouldFireMaxedArrival('armed', 'ready')).toBe(false);
    expect(shouldFireMaxedArrival('dormant', null)).toBe(false);
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
