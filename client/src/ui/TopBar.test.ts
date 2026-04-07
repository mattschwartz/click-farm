// Tests for TopBar pure logic (task #66).
//
// Covers the RUN badge visibility predicate and text formatter. These helpers
// are imported from TopBar.tsx so a regression in production code is caught.

import { describe, it, expect } from 'vitest';
import { shouldShowRunBadge, formatRunBadge } from './TopBar.tsx';

describe('TopBar RUN badge logic', () => {
  it('hides badge when rebrand_count === 0', () => {
    expect(shouldShowRunBadge(0)).toBe(false);
  });

  it('shows badge when rebrand_count === 1', () => {
    expect(shouldShowRunBadge(1)).toBe(true);
  });

  it('shows badge for subsequent rebrands (rebrand_count >= 2)', () => {
    expect(shouldShowRunBadge(2)).toBe(true);
    expect(shouldShowRunBadge(5)).toBe(true);
    expect(shouldShowRunBadge(100)).toBe(true);
  });

  it('formats rebrand badge text correctly', () => {
    expect(formatRunBadge(0)).toBe('0 Rebrands');
    expect(formatRunBadge(1)).toBe('1 Rebrand');
    expect(formatRunBadge(2)).toBe('2 Rebrands');
    expect(formatRunBadge(10)).toBe('10 Rebrands');
  });
});
