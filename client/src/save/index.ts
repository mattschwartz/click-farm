// Save module.
// Responsibility: serialize/deserialize game state to/from localStorage,
// with versioned migrations. See core-systems.md — "Save Module".

import type {
  GameState,
  GeneratorId,
  GeneratorState,
  KitItemId,
  PlatformId,
  PlatformState,
  SaveData,
  UpgradeId,
  ViralBurstState,
} from '../types.ts';
import { recomputeAllRetention } from '../audience-mood/index.ts';
import { STATIC_DATA } from '../static-data/index.ts';

const STORAGE_KEY = 'click_farm_save';
const CURRENT_VERSION = 10;

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

/**
 * Discriminated result of a load() attempt. The `corrupt` variant carries the
 * underlying Error so the driver can fan it out to onSaveError listeners and
 * the UI can explain why the save couldn't be restored. Task #55.
 */
export type LoadResult =
  | { kind: 'none' }
  | { kind: 'loaded'; state: GameState }
  | { kind: 'corrupt'; error: Error };

/**
 * Deserialize and migrate save data. Returns a discriminated result:
 *   - `{ kind: 'none' }`     — no save in localStorage (fresh slot)
 *   - `{ kind: 'loaded' }`   — save parsed, migrated, and restored
 *   - `{ kind: 'corrupt' }`  — save exists but failed to parse or migrate
 *
 * Corrupt saves are NOT wiped here — the caller decides whether to preserve
 * the bad blob (so the player/devs can recover it) or clear it and move on.
 */
export function load(): LoadResult {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return { kind: 'none' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { kind: 'corrupt', error };
  }

  let migrated: SaveData;
  try {
    migrated = migrate(parsed as SaveData);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { kind: 'corrupt', error };
  }
  const gameState = migrated.state;

  // Always ensure viralBurst is present — a v2 save written before the field
  // existed will be missing it entirely and would crash doTick on load.
  // Also always clear active: an in-progress viral from a previous session is
  // stale and cannot be safely resumed.
  const viralBurst: ViralBurstState = gameState.viralBurst ?? {
    active_ticks_since_last: 0,
    active: null,
  };
  // Audience Mood: recompute retention on every platform from the loaded
  // pressure values (normalises any drift from hand-edited saves, and gives
  // the UI a correct retention value to render immediately on load).
  // Architecture/audience-mood.md §Save-Schema Migration §Load-path recomputation.
  const stateWithViral: GameState = {
    ...gameState,
    viralBurst: { ...viralBurst, active: null },
  };
  const normalised = recomputeAllRetention(stateWithViral, STATIC_DATA);
  return { kind: 'loaded', state: normalised };
}

/** Remove save data from localStorage. */
export function clearSave(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ---------------------------------------------------------------------------
// Export / Import (ux/settings-screen.md §5)
// ---------------------------------------------------------------------------

/**
 * Returns the raw JSON string for the current save, or null if no save
 * exists. The string is the same payload that `save()` wrote — a
 * serialized `SaveData` object including `version`.
 */
export function exportSaveJSON(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export interface ImportResult {
  ok: boolean;
  /** On failure, a short reason the UI can surface. */
  reason?: string;
}

/**
 * Validate a JSON string and write it to the save slot if it looks like
 * a SaveData payload. The next `load()` call runs it through the full
 * migration chain, so older versions are accepted as long as they're
 * structurally a SaveData envelope.
 *
 * Does NOT reload state into the driver — the caller is expected to
 * force a page reload (or re-create the driver) to pick up the new save.
 */
export function importSaveJSON(json: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    return {
      ok: false,
      reason: `Not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  if (parsed === null || typeof parsed !== 'object') {
    return { ok: false, reason: 'Save payload is not an object.' };
  }
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.version !== 'number') {
    return { ok: false, reason: 'Save payload is missing a numeric version.' };
  }
  if (obj.version > CURRENT_VERSION) {
    return {
      ok: false,
      reason: `Save version ${obj.version} is newer than this build supports (max ${CURRENT_VERSION}).`,
    };
  }
  if (obj.state === undefined || obj.state === null) {
    return { ok: false, reason: 'Save payload is missing a `state` field.' };
  }
  try {
    localStorage.setItem(STORAGE_KEY, json);
  } catch (err) {
    return {
      ok: false,
      reason: `Failed to write save: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  return { ok: true };
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
 * Migrate a V2 save to V3.
 *
 * V3 historically introduced the Scandals system (accumulators +
 * scandalStateMachine + scandalSessionSnapshot on GameState). The Scandals
 * system was removed in V7 — see proposals/accepted/remove-scandals-interim.md.
 * This migration is now a structural no-op (version bump only): any scandal
 * fields that a legacy V2 save gains here are stripped by migrateV6toV7.
 */
export function migrateV2toV3(data: SaveData): SaveData {
  return {
    ...data,
    version: 3,
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
  // Type is Record<string, number> rather than Record<UpgradeId, number>
  // because this migration produces the V4 shape — later migrations (V9→V10)
  // will remap keys like platform_headstart_instasham → picshift.
  const newUpgrades: Record<string, number> = {
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

/**
 * Migrate a V4 save to V5 — Creator Kit foundation.
 *
 * Task #73: `player.creator_kit` is introduced as a per-run map of
 * KitItemId → level. Existing saves default to an empty kit. The field is
 * wiped on rebrand (see prestige/applyRebrand), so defaulting to `{}` is
 * always correct on load.
 */
export function migrateV4toV5(data: SaveData): SaveData {
  const oldState = data.state as GameState & {
    player: GameState['player'] & {
      creator_kit?: Record<KitItemId, number>;
    };
  };
  return {
    ...data,
    version: 5,
    state: {
      ...oldState,
      player: {
        ...oldState.player,
        creator_kit:
          oldState.player.creator_kit ?? ({} as Record<KitItemId, number>),
      },
    },
  };
}

/**
 * Migrate a V5 save to V6 — one-time data repair for the pre-clamp overflow
 * bug (task #90 / proposals/accepted/generator-level-growth-curves.md).
 *
 * Before task #89 shipped runtime clamps, two bugs could corrupt saves:
 *   1) `player.engagement` could overflow to Infinity once per-unit rate × clout
 *      × level multiplier × tick delta produced a non-finite sum. Once Infinity
 *      is persisted, JSON.stringify writes `null` and load fails.
 *   2) A generator's `level` could exceed the new max_level=10 cap because
 *      the cap didn't exist yet — at L~14 the multiplier stack overflows.
 *
 * Both are silent data repairs. Per game-designer final review, this is NOT
 * earned progress — at those magnitudes floats had already rounded to even
 * and the player was not meaningfully accumulating anything. No player-facing
 * "your save was repaired" UI. A console.warn carries diagnostic trace for
 * devs investigating bug reports.
 *
 * max_level is hardcoded to 10 here rather than read from StaticData to keep
 * migrations decoupled from evolving static-data tuning. If the cap ever
 * moves, a new migration ships with it.
 */
export function migrateV5toV6(data: SaveData): SaveData {
  const oldState = data.state as GameState;
  const MAX_LEVEL = 10;

  // Clamp engagement — NaN / Infinity / >MAX_SAFE_INTEGER all pinned to MAX_SAFE_INTEGER.
  // Negative / missing values fall through unchanged (runtime code handles those).
  const rawEngagement = oldState.player.engagement;
  let clampedEngagement = rawEngagement;
  const needsEngagementClamp =
    !Number.isFinite(rawEngagement) || rawEngagement > Number.MAX_SAFE_INTEGER;
  if (needsEngagementClamp) {
    clampedEngagement = Number.MAX_SAFE_INTEGER;
    // eslint-disable-next-line no-console
    console.warn(
      `[save migrate V5→V6] clamped player.engagement: ${String(rawEngagement)} → ${Number.MAX_SAFE_INTEGER}`,
    );
  }

  // Clamp each generator's level to MAX_LEVEL.
  const newGenerators: Record<GeneratorId, GeneratorState> = { ...oldState.generators };
  for (const id of Object.keys(oldState.generators) as GeneratorId[]) {
    const gen = oldState.generators[id];
    if (gen.level > MAX_LEVEL) {
      // eslint-disable-next-line no-console
      console.warn(
        `[save migrate V5→V6] clamped generators.${id}.level: ${gen.level} → ${MAX_LEVEL}`,
      );
      newGenerators[id] = { ...gen, level: MAX_LEVEL };
    }
  }

  return {
    ...data,
    version: 6,
    state: {
      ...oldState,
      generators: newGenerators,
      player: {
        ...oldState.player,
        engagement: clampedEngagement,
      },
    },
  };
}

/**
 * Migrate a V6 save to V7 — strip the Scandals system.
 *
 * The Scandals system was removed from the client in the interim build
 * (proposals/accepted/remove-scandals-interim.md). Saves written under V3–V6
 * carry `state.accumulators`, `state.scandalStateMachine`, and
 * `state.scandalSessionSnapshot`. This migration deletes those fields so the
 * save envelope matches the current GameState shape. Silent repair — no
 * player-facing notice.
 */
export function migrateV6toV7(data: SaveData): SaveData {
  const oldState = data.state as GameState & {
    accumulators?: unknown;
    scandalStateMachine?: unknown;
    scandalSessionSnapshot?: unknown;
  };
  const {
    accumulators: _a,
    scandalStateMachine: _sm,
    scandalSessionSnapshot: _snap,
    ...cleanState
  } = oldState;
  void _a;
  void _sm;
  void _snap;
  return {
    ...data,
    version: 7,
    state: cleanState as GameState,
  };
}

/**
 * Migrate a V7 save to V8 — initialise Audience Mood fields on every
 * platform. See .frames/sdlc/architecture/audience-mood.md §Save-Schema
 * Migration. Defaults represent a "healthy audience": retention = 1.0 and
 * every pressure at 0/empty.
 *
 * The retention field IS written here (not left undefined) so downstream
 * code never reads `undefined * N` when applying retention. The load path
 * runs `recomputeAllRetention` immediately after migration, which is a
 * no-op against these healthy defaults but guards against future migrations
 * that may seed the pressure fields non-trivially.
 */
export function migrateV7toV8(data: SaveData): SaveData {
  const oldState = data.state as GameState;
  const platformIds = Object.keys(oldState.platforms) as PlatformId[];
  const newPlatforms: Record<PlatformId, PlatformState> = {
    ...oldState.platforms,
  };
  for (const id of platformIds) {
    const p = oldState.platforms[id] as PlatformState & {
      retention?: number;
      content_fatigue?: Partial<Record<GeneratorId, number>>;
      neglect?: number;
      algorithm_misalignment?: number;
    };
    newPlatforms[id] = {
      ...p,
      retention: p.retention ?? 1.0,
      content_fatigue: p.content_fatigue ?? {},
      neglect: p.neglect ?? 0,
      algorithm_misalignment: p.algorithm_misalignment ?? 0,
    };
  }
  return {
    ...data,
    version: 8,
    state: { ...oldState, platforms: newPlatforms },
  };
}

/**
 * Migrate a V8 save to V9 — manual-action-ladder engine refactor.
 *
 * Seeds two new fields:
 *   1. `player.last_manual_click_at = {}` — empty record, no prior clicks.
 *   2. `generators.chirps` — new starter generator (threshold=0 → owned=true,
 *      level=1, count=0).
 *
 * See proposals/accepted/manual-action-ladder.md and task #119.
 */
export function migrateV8toV9(data: SaveData): SaveData {
  const oldState = data.state as GameState & {
    player: GameState['player'] & {
      last_manual_click_at?: Record<string, number>;
    };
    generators: Record<string, GeneratorState>;
  };

  const generators = { ...oldState.generators } as Record<GeneratorId, GeneratorState>;
  if (generators.chirps === undefined) {
    generators.chirps = { id: 'chirps', owned: true, level: 1, count: 0 };
  }

  return {
    ...data,
    version: 9,
    state: {
      ...oldState,
      generators,
      player: {
        ...oldState.player,
        last_manual_click_at:
          oldState.player.last_manual_click_at ??
          ({} as Record<GeneratorId, number>),
      },
    },
  };
}

/**
 * Migrate a V9 save to V10 — platform renames + new platform podpod.
 *
 * Task #131: instasham→picshift, grindset→skroll. podpod added as a 4th
 * platform. Clout upgrade keys renamed to match.
 *
 * - `state.platforms`: keys remapped, ids updated; podpod seeded (locked,
 *   0 followers, healthy audience mood defaults).
 * - `state.player.clout_upgrades`: headstart keys remapped; podpod headstart
 *   seeded at 0.
 * - Snapshot `platform_rates`: keys remapped; podpod seeded at 0.
 */
export function migrateV9toV10(data: SaveData): SaveData {
  const oldState = data.state as GameState & {
    platforms: Record<string, PlatformState>;
    player: GameState['player'] & {
      clout_upgrades: Record<string, number>;
      last_close_state: {
        platform_rates: Record<string, number>;
        [k: string]: unknown;
      } | null;
    };
  };

  // 1) Remap platforms: instasham→picshift, grindset→skroll, seed podpod.
  const oldPlatforms = oldState.platforms;
  const newPlatforms: Record<PlatformId, PlatformState> = {
    chirper: oldPlatforms.chirper as PlatformState,
    picshift: { ...(oldPlatforms.instasham as PlatformState), id: 'picshift' as PlatformId },
    skroll: { ...(oldPlatforms.grindset as PlatformState), id: 'skroll' as PlatformId },
    podpod: {
      id: 'podpod' as PlatformId,
      unlocked: false,
      followers: 0,
      retention: 1.0,
      content_fatigue: {},
      neglect: 0,
      algorithm_misalignment: 0,
    },
  };

  // 2) Remap clout_upgrades.
  const oldUpgrades = oldState.player.clout_upgrades;
  const newUpgrades: Record<UpgradeId, number> = {
    engagement_boost: oldUpgrades.engagement_boost ?? 0,
    algorithm_insight: oldUpgrades.algorithm_insight ?? 0,
    platform_headstart_picshift: oldUpgrades.platform_headstart_instasham ?? 0,
    platform_headstart_skroll: oldUpgrades.platform_headstart_grindset ?? 0,
    platform_headstart_podpod: 0,
    ai_slop_unlock: oldUpgrades.ai_slop_unlock ?? 0,
    deepfakes_unlock: oldUpgrades.deepfakes_unlock ?? 0,
    algorithmic_prophecy_unlock: oldUpgrades.algorithmic_prophecy_unlock ?? 0,
  };

  // 3) Remap snapshot platform_rates if present.
  let newCloseState = oldState.player.last_close_state;
  if (newCloseState) {
    const oldRates = newCloseState.platform_rates;
    newCloseState = {
      ...newCloseState,
      platform_rates: {
        chirper: oldRates.chirper ?? 0,
        picshift: oldRates.instasham ?? 0,
        skroll: oldRates.grindset ?? 0,
        podpod: 0,
      },
    };
  }

  // Also remap the top-level lastCloseState on SaveData if present.
  let newLastCloseState = data.lastCloseState;
  if (newLastCloseState) {
    const oldTopRates = (newLastCloseState as { platform_rates: Record<string, number> }).platform_rates;
    newLastCloseState = {
      ...newLastCloseState,
      platform_rates: {
        chirper: oldTopRates.chirper ?? 0,
        picshift: oldTopRates.instasham ?? 0,
        skroll: oldTopRates.grindset ?? 0,
        podpod: 0,
      } as Record<PlatformId, number>,
    };
  }

  return {
    ...data,
    version: 10,
    lastCloseState: newLastCloseState,
    state: {
      ...oldState,
      platforms: newPlatforms,
      player: {
        ...oldState.player,
        clout_upgrades: newUpgrades,
        last_close_state: newCloseState as GameState['player']['last_close_state'],
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

  if (current.version === 4) {
    current = migrateV4toV5(current);
  }

  if (current.version === 5) {
    current = migrateV5toV6(current);
  }

  if (current.version === 6) {
    current = migrateV6toV7(current);
  }

  if (current.version === 7) {
    current = migrateV7toV8(current);
  }

  if (current.version === 8) {
    current = migrateV8toV9(current);
  }

  if (current.version === 9) {
    current = migrateV9toV10(current);
  }

  if (current.version !== CURRENT_VERSION) {
    throw new Error(
      `save/migrate: unknown version ${String(current.version)} — expected ${CURRENT_VERSION}`
    );
  }

  return current;
}
