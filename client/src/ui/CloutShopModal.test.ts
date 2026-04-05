// Tests for CloutShopModal pure helpers (task #62).
//
// The shop modal is a shell in this task — the purchase flow and upgrade list
// land in task #64. Only the helper function for balance display is tested.

import { describe, it, expect } from 'vitest';
import { formatCloutBalance } from './CloutShopModal.tsx';

describe('formatCloutBalance', () => {
  it('formats zero Clout', () => {
    expect(formatCloutBalance(0)).toBe('Clout: 0');
  });

  it('formats a typical Clout balance', () => {
    expect(formatCloutBalance(42)).toBe('Clout: 42');
  });

  it('formats large Clout balance without formatting (whole number)', () => {
    expect(formatCloutBalance(1000)).toBe('Clout: 1000');
  });
});
