// Tests for GameScreen keyboard shortcuts.
// Tests the B key handler for sweep start/cancel (no jsdom — behavioral tests only).

import { describe, it, expect } from 'vitest';
import { shouldIgnoreBKey, getBKeyAction } from './GameScreen.tsx';

describe('GameScreen — B key keyboard shortcut', () => {
  describe('shouldIgnoreBKey', () => {
    it('returns false when no modal is open', () => {
      expect(shouldIgnoreBKey(false, false, false, null)).toBe(false);
    });

    it('returns true when ceremony modal is open', () => {
      expect(shouldIgnoreBKey(true, false, false, null)).toBe(true);
    });

    it('returns true when shop modal is open', () => {
      expect(shouldIgnoreBKey(false, true, false, null)).toBe(true);
    });

    it('returns true when settings modal is open', () => {
      expect(shouldIgnoreBKey(false, false, true, null)).toBe(true);
    });

    it('returns true when offline result is pending', () => {
      expect(shouldIgnoreBKey(false, false, false, { durationMs: 1000 })).toBe(
        true,
      );
    });

    it('returns true when any combination of modals is open', () => {
      expect(shouldIgnoreBKey(true, true, true, { durationMs: 1000 })).toBe(
        true,
      );
    });
  });

  describe('getBKeyAction', () => {
    it('returns ignore when any modal is open', () => {
      expect(
        getBKeyAction(true, false, false, null, false),
      ).toBe('ignore');
      expect(
        getBKeyAction(false, true, false, null, false),
      ).toBe('ignore');
      expect(
        getBKeyAction(false, false, true, null, false),
      ).toBe('ignore');
      expect(
        getBKeyAction(false, false, false, { durationMs: 1000 }, false),
      ).toBe('ignore');
    });

    it('returns start when no modals open and sweep is inactive', () => {
      expect(getBKeyAction(false, false, false, null, false)).toBe('start');
    });

    it('returns cancel when no modals open and sweep is active', () => {
      expect(getBKeyAction(false, false, false, null, true)).toBe('cancel');
    });

    it('prefers ignore (modal) over sweep state', () => {
      // Even if sweep is active, modal takes precedence
      expect(
        getBKeyAction(true, false, false, null, true),
      ).toBe('ignore');
    });
  });
});
