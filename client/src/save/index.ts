// Save module.
// Responsibility: serialize/deserialize game state to/from localStorage,
// with versioned migrations. See core-systems.md — "Save Module".

import type {
  GameState,
  GeneratorId,
  GeneratorState,
  RiskAccumulator,
  SaveData,
  ScandalStateMachine,
  UpgradeId,
  ViralBurstState,
} from '../types.ts';

const STORAGE_KEY = 'click_farm_save';
const CURRENT_VERSION = 4;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Serialize game state to localStorage. Updates player.last_close_time.
 * `now` is injectable so the driver can stamp close time from its own clock
 * (keeps save time consistent with driver.now() for offline calc). Defaults
 * to Date.now().
 */
export function save(state: GameState, now: number = Date.now()): void {
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
  const gameState = migrated.state;

  // Always ensure viralBurst is present — a v2 save written before the field
  // existed will be missing it entirely and would crash doTick on load.
  // Also always clear active: an in-progress viral from a previous session is
  // stale and cannot be safely resumed.
  const viralBurst: ViralBurstState = gameState.viralBurst ?? {
    active_ticks_since_last: 0,
    active: null,
  };
  return {
    ...gameState,
    viralBurst: { ...viralBurst, active: null },
    // Ensure scandal fields are present. Driver sets real values on open.
    accumulators: gameState.accumulators ?? [],
    scandalStateMachine: {
      state: 'normal' as const,
      activeScandal: null,
      suppressedNotification: null,
      timerStartTime: null,
      timerDuration: 13_500,
      readBeatDuration: 1_500,
      pendingEngagementSpend: 0,
      lastResolution: null,
      // Spread existing sm values over the defaults, so new fields default to
      // null while existing fields are preserved.
      ...(gameState.scandalStateMachine ?? {}),
      // Always reset active state on load — in-flight scandals don't survive restarts.
      state: 'normal' as const,
      activeScandal: null,
      timerStartTime: null,
      pendingEngagementSpend: 0,
    },
    scandalSessionSnapshot: null, // always reset — driver repopulates on open
  };
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

/**
 * Migrate a V1 save (no viralBurst field) to V2.
 * Injects the correct default for viralBurst so the rest of the pipeline can
 * assume GameState always has the field.
 */
export function migrateV1toV2(data: SaveData): SaveData {
  const oldState = data.state as GameState & { viralBurst?: ViralBurstState };
  const viralBurst: ViralBurstState = oldState.viralBurst ?? {
    active_ticks_since_last: 0,
    active: null,
  };
  return {
    ...data,
    version: 2,
    state: { ...oldState, viralBurst },
  };
}

/**
 * Migrate a V2 save (no scandal fields) to V3.
 * Injects empty accumulators and a default state machine. The driver will
 * populate accumulators via ensureAccumulators on the first tick.
 */
export function migrateV2toV3(data: SaveData): SaveData {
  const oldState = data.state as GameState & {
    accumulators?: RiskAccumulator[];
    scandalStateMachine?: ScandalStateMachine;
  };
  // Default state machine: normal state, no active scandal, timer config 0
  // (driver will set real values from staticData on first open).
  const defaultSm: ScandalStateMachine = {
    state: 'normal',
    activeScandal: null,
    suppressedNotification: null,
    timerStartTime: null,
    timerDuration: 13_500, // readBeatMs + decisionWindowMs defaults
    readBeatDuration: 1_500,
    pendingEngagementSpend: 0,
    lastResolution: null,
  };
  return {
    ...data,
    version: 3,
    state: {
      ...oldState,
      accumulators: oldState.accumulators ?? [],
      scandalStateMachine: oldState.scandalStateMachine ?? defaultSm,
      scandalSessionSnapshot: null, // driver always overwrites on open
    },
  };
}

/**
 * Migrate a V3 save to V4 — CloutUpgrade schema migration.
 *
 * Task #63: the CloutUpgrade menu changed shape:
 *   - `faster_engagement` → renamed to `engagement_boost` (level preserved)
 *   - `platform_headstart_chirper` → removed (chirper is starter platform;
 *     its threshold is 0 so a head-start is meaningless)
 *   - New `generator_unlock` upgrades introduced: `ai_slop_unlock`,
 *     `deepfakes_unlock`, `algorithmic_prophecy_unlock` (all default to 0)
 *   - New post-prestige generators in the GeneratorState map:
 *     `ai_slop`, `deepfakes`, `algorithmic_prophecy` (all owned=false)
 *
 * The stored level from `faster_engagement` is preserved on `engagement_boost`
 * even though the effect semantics changed (pow(1.25, L) → values[L-1]).
 * Players with level > 3 will be clamped to max_level (3) by the consumer.
 */
export function migrateV3toV4(data: SaveData): SaveData {
  const oldState = data.state as GameState & {
    player: GameState['player'] & {
      clout_upgrades: Record<string, number>;
    };
    generators: Record<string, GeneratorState>;
  };

  // 1) Migrate clout_upgrades: rename + remove + add new at 0.
  const oldUpgrades = oldState.player.clout_upgrades ?? {};
  const engagementBoostLevel = Math.min(
    oldUpgrades.faster_engagement ?? 0,
    3, // new max_level for engagement_boost
  );
  const newUpgrades: Record<UpgradeId, number> = {
    engagement_boost: engagementBoostLevel,
    algorithm_insight: oldUpgrades.algorithm_insight ?? 0,
    platform_headstart_instasham: oldUpgrades.platform_headstart_instasham ?? 0,
    platform_headstart_grindset: oldUpgrades.platform_headstart_grindset ?? 0,
    ai_slop_unlock: 0,
    deepfakes_unlock: 0,
    algorithmic_prophecy_unlock: 0,
  };

  // 2) Ensure post-prestige GeneratorState entries exist.
  const postPrestige: GeneratorId[] = ['ai_slop', 'deepfakes', 'algorithmic_prophecy'];
  const generators = { ...oldState.generators } as Record<GeneratorId, GeneratorState>;
  for (const id of postPrestige) {
    if (generators[id] === undefined) {
      generators[id] = { id, owned: false, level: 1, count: 0 };
    }
  }

  return {
    ...data,
    version: 4,
    state: {
      ...oldState,
      generators,
      player: {
        ...oldState.player,
        clout_upgrades: newUpgrades,
      },
    },
  };
}

export function migrate(data: SaveData): SaveData {
  let current = data;

  if (current.version === 1) {
    current = migrateV1toV2(current);
  }

  if (current.version === 2) {
    current = migrateV2toV3(current);
  }

  if (current.version === 3) {
    current = migrateV3toV4(current);
  }

  if (current.version !== CURRENT_VERSION) {
    throw new Error(
      `save/migrate: unknown version ${String(current.version)} — expected ${CURRENT_VERSION}`
    );
  }

  return current;
}
