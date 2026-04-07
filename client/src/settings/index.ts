// Settings module.
//
// Responsibility: persist user-facing preferences (reduce time pressure,
// reduce motion, sound) to localStorage in a separate key from the game
// save. Settings are NOT part of GameState — they are a per-device
// preference layer orthogonal to the simulation.
//
// Architecture: mirrors the save module's shape (versioned, JSON-encoded),
// but lives in its own storage key so settings survive a save wipe and
// don't need to round-trip through the game-state migration chain.
//
// See ux/settings-screen.md for the authoritative behavior spec.

const STORAGE_KEY = 'click_farm_settings';
const CURRENT_VERSION = 1;

// ---------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------

export interface Settings {
  /**
   * Dormant — previously doubled the scandal decision window. Retained as
   * a schema field (no UI toggle) until a future feature wires it back in.
   * See proposals/accepted/remove-scandals-interim.md AC #13.
   */
  reduceTimePressure: boolean;
  /**
   * Replaces decorative motion with static alternatives per §3.3. This
   * value overlays the OS `prefers-reduced-motion` preference — once set,
   * the user's explicit choice wins regardless of OS state.
   */
  reduceMotion: boolean;
  /** Master audio toggle per §4.1. */
  sound: boolean;
  /** Music volume 0–100. Default 30. */
  musicVolume: number;
  /** SFX volume 0–100. Default 50. */
  sfxVolume: number;
  /** Whether floating numbers appear on verb action buttons. Default true. */
  showVerbFloats: boolean;
}

interface StoredSettings {
  version: number;
  settings: Settings;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/**
 * Pure factory for default settings. `osReduceMotion` is an injected value
 * so tests can exercise the OS-preference seed without touching the DOM.
 *
 * Per ux/settings-screen.md §8 OQ#1: on first launch, reduceMotion seeds
 * from the OS `prefers-reduced-motion` query, then allows user override.
 */
export function getDefaultSettings(osReduceMotion = false): Settings {
  return {
    reduceTimePressure: false,
    reduceMotion: osReduceMotion,
    sound: true,
    musicVolume: 30,
    sfxVolume: 50,
    showVerbFloats: true,
  };
}

/**
 * Reads the browser's prefers-reduced-motion media query. Returns false in
 * non-browser environments (tests, SSR).
 */
export function readOsReduceMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

/**
 * Load settings from localStorage. Returns defaults (seeded from OS
 * preference) when no settings are persisted or the stored payload is
 * malformed. Missing fields are filled from defaults — a forward-compatible
 * migration for new toggles added in future versions.
 */
export function loadSettings(osReduceMotion = readOsReduceMotion()): Settings {
  const defaults = getDefaultSettings(osReduceMotion);
  if (typeof localStorage === 'undefined') return defaults;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return defaults;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaults;
  }

  if (
    parsed === null ||
    typeof parsed !== 'object' ||
    !('settings' in parsed) ||
    typeof (parsed as StoredSettings).settings !== 'object'
  ) {
    return defaults;
  }

  const stored = (parsed as StoredSettings).settings as Partial<Settings>;
  return {
    reduceTimePressure:
      typeof stored.reduceTimePressure === 'boolean'
        ? stored.reduceTimePressure
        : defaults.reduceTimePressure,
    reduceMotion:
      typeof stored.reduceMotion === 'boolean'
        ? stored.reduceMotion
        : defaults.reduceMotion,
    sound:
      typeof stored.sound === 'boolean' ? stored.sound : defaults.sound,
    musicVolume:
      typeof stored.musicVolume === 'number' ? stored.musicVolume : defaults.musicVolume,
    sfxVolume:
      typeof stored.sfxVolume === 'number' ? stored.sfxVolume : defaults.sfxVolume,
    showVerbFloats:
      typeof stored.showVerbFloats === 'boolean' ? stored.showVerbFloats : defaults.showVerbFloats,
  };
}

/** Write settings to localStorage. No-op outside a browser. */
export function saveSettings(settings: Settings): void {
  if (typeof localStorage === 'undefined') return;
  const payload: StoredSettings = {
    version: CURRENT_VERSION,
    settings,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore quota errors — settings are non-essential and can re-seed.
  }
}

/** Remove settings from localStorage. Primarily used by Reset Game. */
export function clearSettings(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
