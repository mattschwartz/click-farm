// Tests for the settings module — defaults, persistence, OS-pref seed.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDefaultSettings,
  loadSettings,
  saveSettings,
  clearSettings,
} from './index.ts';

// Minimal localStorage shim — vitest's default env doesn't include DOM,
// but localStorage is available via jsdom in some configs. These tests
// manage their own in-memory shim to stay environment-agnostic.
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length(): number { return this.map.size; }
  clear(): void { this.map.clear(); }
  getItem(key: string): string | null { return this.map.get(key) ?? null; }
  setItem(key: string, value: string): void { this.map.set(key, value); }
  removeItem(key: string): void { this.map.delete(key); }
  key(i: number): string | null { return Array.from(this.map.keys())[i] ?? null; }
}

beforeEach(() => {
  // Install a fresh storage for each test.
  (globalThis as unknown as { localStorage: Storage }).localStorage =
    new MemoryStorage();
});

describe('getDefaultSettings', () => {
  it('returns baseline defaults when no OS preference is given', () => {
    const s = getDefaultSettings();
    expect(s.reduceTimePressure).toBe(false);
    expect(s.reduceMotion).toBe(false);
    expect(s.sound).toBe(true);
  });

  it('seeds reduceMotion from the OS preference', () => {
    expect(getDefaultSettings(true).reduceMotion).toBe(true);
    expect(getDefaultSettings(false).reduceMotion).toBe(false);
  });

  it('does not seed other toggles from the OS preference', () => {
    const s = getDefaultSettings(true);
    expect(s.reduceTimePressure).toBe(false);
    expect(s.sound).toBe(true);
  });
});

describe('loadSettings', () => {
  it('returns defaults when no settings are persisted', () => {
    expect(loadSettings(false)).toEqual(getDefaultSettings(false));
  });

  it('honors OS-pref seed when storage is empty', () => {
    expect(loadSettings(true).reduceMotion).toBe(true);
  });

  it('returns defaults when storage contains malformed JSON', () => {
    localStorage.setItem('click_farm_settings', '{not json');
    expect(loadSettings(false)).toEqual(getDefaultSettings(false));
  });

  it('returns defaults when payload is missing settings key', () => {
    localStorage.setItem('click_farm_settings', JSON.stringify({ version: 1 }));
    expect(loadSettings(false)).toEqual(getDefaultSettings(false));
  });

  it('round-trips a saved payload', () => {
    const chosen = {
      reduceTimePressure: true,
      reduceMotion: true,
      sound: false,
      musicVolume: 30,
      sfxVolume: 50,
      showVerbFloats: true,
    };
    saveSettings(chosen);
    expect(loadSettings(false)).toEqual(chosen);
  });

  it('forward-migrates: missing fields fall back to defaults', () => {
    localStorage.setItem(
      'click_farm_settings',
      JSON.stringify({
        version: 1,
        settings: { reduceMotion: true }, // only one field
      }),
    );
    const loaded = loadSettings(false);
    expect(loaded.reduceMotion).toBe(true);
    expect(loaded.reduceTimePressure).toBe(false);
    expect(loaded.sound).toBe(true);
  });

  it('explicit user choice wins over OS preference', () => {
    // User previously turned OFF reduceMotion even though OS says ON.
    saveSettings({
      reduceTimePressure: false,
      reduceMotion: false,
      sound: true,
      musicVolume: 30,
      sfxVolume: 50,
      showVerbFloats: true,
    });
    // OS pref is true, but the saved explicit false should win.
    expect(loadSettings(true).reduceMotion).toBe(false);
  });
});

describe('saveSettings', () => {
  it('persists values that loadSettings can read back', () => {
    saveSettings({ reduceTimePressure: true, reduceMotion: true, sound: false, musicVolume: 30, sfxVolume: 50, showVerbFloats: true });
    const raw = localStorage.getItem('click_farm_settings');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as {
      version: number;
      settings: unknown;
    };
    expect(parsed.version).toBe(1);
  });
});

describe('clearSettings', () => {
  it('removes the stored key', () => {
    saveSettings({ reduceTimePressure: false, reduceMotion: true, sound: true, musicVolume: 30, sfxVolume: 50, showVerbFloats: true });
    expect(localStorage.getItem('click_farm_settings')).not.toBeNull();
    clearSettings();
    expect(localStorage.getItem('click_farm_settings')).toBeNull();
  });
});
