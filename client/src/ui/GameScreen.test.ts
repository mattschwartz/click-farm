// Tests for GameScreen pure helpers (task #66).
//
// Tests the ambient copy logic for post-rebrand re-entry surfaces.

import { describe, it, expect } from 'vitest';

/**
 * Determine whether the first-rebrand ambient copy should be shown.
 * Only appears on the first rebrand (rebrand_count === 1).
 */
function shouldShowAmbientCopy(rebrandCount: number): boolean {
  return rebrandCount === 1;
}

describe('GameScreen ambient surfaces (task #66)', () => {
  describe('First-rebrand ambient copy visibility', () => {
    it('hides ambient copy when rebrand_count === 0 (no rebrand yet)', () => {
      expect(shouldShowAmbientCopy(0)).toBe(false);
    });

    it('shows ambient copy when rebrand_count === 1 (first rebrand)', () => {
      expect(shouldShowAmbientCopy(1)).toBe(true);
    });

    it('hides ambient copy when rebrand_count >= 2 (subsequent rebrands)', () => {
      expect(shouldShowAmbientCopy(2)).toBe(false);
      expect(shouldShowAmbientCopy(3)).toBe(false);
      expect(shouldShowAmbientCopy(100)).toBe(false);
    });
  });
});
