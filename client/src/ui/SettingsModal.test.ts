// Tests for SettingsModal pure helpers.

import { describe, it, expect } from 'vitest';
import { formatExportFilename } from './formatExportFilename.ts';

describe('formatExportFilename', () => {
  it('produces a filesystem-safe ISO timestamp', () => {
    // Jan 2 2026 12:34:56 UTC
    const t = Date.UTC(2026, 0, 2, 12, 34, 56, 789);
    const name = formatExportFilename(3, t);
    expect(name).toBe('click-farm-save-3-2026-01-02T12-34-56.json');
  });

  it('includes the rebrand count', () => {
    const t = Date.UTC(2026, 5, 15, 0, 0, 0);
    expect(formatExportFilename(0, t)).toContain('click-farm-save-0-');
    expect(formatExportFilename(42, t)).toContain('click-farm-save-42-');
  });

  it('ends with .json', () => {
    expect(formatExportFilename(0, Date.now()).endsWith('.json')).toBe(true);
  });

  it('uses filesystem-safe separators (no colons, spaces in timestamp portion)', () => {
    const name = formatExportFilename(5, Date.UTC(2026, 0, 1, 0, 0, 0));
    // Strip the .json suffix before checking — the extension's dot is fine.
    const stem = name.replace(/\.json$/, '');
    expect(stem).not.toMatch(/[:\s]/);
    expect(stem).not.toContain('.');
  });
});
