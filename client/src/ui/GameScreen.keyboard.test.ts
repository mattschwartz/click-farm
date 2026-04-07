// Tests for GameScreen keyboard shortcuts.
// Tests the modal guard and B key handler logic (no jsdom — pure helpers only).

import { describe, it, expect } from 'vitest';
import { isModalBlocking, getBKeyAction } from './GameScreen.tsx';

describe('GameScreen — keyboard shortcut modal guard', () => {
  describe('isModalBlocking', () => {
    it('returns false when no modal is open', () => {
      expect(isModalBlocking(false, false, false, null)).toBe(false);
    });

    it('returns true when ceremony modal is open', () => {
      expect(isModalBlocking(true, false, false, null)).toBe(true);
    });

    it('returns true when shop modal is open', () => {
      expect(isModalBlocking(false, true, false, null)).toBe(true);
    });

    it('returns true when settings modal is open', () => {
      expect(isModalBlocking(false, false, true, null)).toBe(true);
    });

    it('returns true when offline modal is visible (durationMs > 60s)', () => {
      expect(isModalBlocking(false, false, false, { durationMs: 120_000 })).toBe(true);
    });

    it('returns false when offline result exists but duration is short (modal not shown)', () => {
      expect(isModalBlocking(false, false, false, { durationMs: 1_000 })).toBe(false);
      expect(isModalBlocking(false, false, false, { durationMs: 59_999 })).toBe(false);
    });

    it('returns true at the exact 60s boundary', () => {
      expect(isModalBlocking(false, false, false, { durationMs: 60_001 })).toBe(true);
    });

    it('returns true when any combination of modals is open', () => {
      expect(isModalBlocking(true, true, true, { durationMs: 120_000 })).toBe(true);
    });
  });

  describe('getBKeyAction', () => {
    it('returns ignore when a visible modal is open', () => {
      expect(getBKeyAction(true, false, false, null, false)).toBe('ignore');
      expect(getBKeyAction(false, true, false, null, false)).toBe('ignore');
      expect(getBKeyAction(false, false, true, null, false)).toBe('ignore');
      expect(getBKeyAction(false, false, false, { durationMs: 120_000 }, false)).toBe('ignore');
    });

    it('does NOT ignore when offline result has short duration', () => {
      expect(getBKeyAction(false, false, false, { durationMs: 5_000 }, false)).toBe('start');
    });

    it('returns start when no modals open and sweep is inactive', () => {
      expect(getBKeyAction(false, false, false, null, false)).toBe('start');
    });

    it('returns cancel when no modals open and sweep is active', () => {
      expect(getBKeyAction(false, false, false, null, true)).toBe('cancel');
    });

    it('prefers ignore (modal) over sweep state', () => {
      expect(getBKeyAction(true, false, false, null, true)).toBe('ignore');
    });
  });
});
