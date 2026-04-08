// Tests for TopBar pure logic (task #66).
//
// Covers the RUN badge visibility predicate and text formatter. These helpers
// are imported from TopBar.tsx so a regression in production code is caught.

import { describe, it, expect } from 'vitest';
import '../i18n.ts'; // Initialize i18n so t() resolves against English locale.
import i18n from 'i18next';
import { shouldShowRunBadge, formatRunBadge } from './TopBar.tsx';

const t = i18n.t.bind(i18n);

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
    expect(formatRunBadge(0, t)).toBe('Rebrands +0');
    expect(formatRunBadge(1, t)).toBe('Rebrand +1');
    expect(formatRunBadge(2, t)).toBe('Rebrands +2');
    expect(formatRunBadge(10, t)).toBe('Rebrands +10');
  });
});
