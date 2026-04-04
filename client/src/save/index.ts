// Save module.
// Responsibility: serialize/deserialize game state to/from localStorage,
// with versioned migrations. See core-systems.md — "Save Module".

import type { GameState, SaveData } from '../types.ts';

const STORAGE_KEY = 'click_farm_save';
const CURRENT_VERSION = 1;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Serialize game state to localStorage. Updates player.last_close_time. */
export function save(state: GameState): void {
  const now = Date.now();
  const stateWithClose: GameState = {
    ...state,
    player: {
      ...state.player,
      last_close_time: now,
    },
  };

  const data: SaveData = {
    version: CURRENT_VERSION,
    state: stateWithClose,
    lastCloseTime: now,
    lastCloseState: state.player.last_close_state,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** Deserialize and migrate save data. Returns null on missing or corrupt save. */
export function load(): GameState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Corrupt JSON — treat as no save
    return null;
  }

  const migrated = migrate(parsed as SaveData);
  return migrated.state;
}

/** Remove save data from localStorage. */
export function clearSave(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ---------------------------------------------------------------------------
// Migration chain
// Each case transforms the data from version N to N+1.
// Add a new case here whenever the save format changes.
// ---------------------------------------------------------------------------

export function migrate(data: SaveData): SaveData {
  // Future: reassign `current` as new version cases are added to the chain.
  // For now this is effectively a pass-through with a version guard.
  // eslint-disable-next-line prefer-const
  let current = data;

  // Version chain — add cases here as schema evolves:
  // if (current.version === 1) { current = migrateV1toV2(current); }

  if (current.version !== CURRENT_VERSION) {
    throw new Error(
      `save/migrate: unknown version ${String(current.version)} — expected ${CURRENT_VERSION}`
    );
  }

  return current;
}
