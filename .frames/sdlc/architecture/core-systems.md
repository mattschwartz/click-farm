# Core Systems Architecture

> **Scope:** Defines the data model, component boundaries, interface contracts, and technology decisions for Click Farm's core game systems — the Post → Engage → Grow loop, generators, the Algorithm, platforms, economy, offline calculation, and prestige.

> **Not in scope:** Scandal/follower-loss event system (see `.frames/sdlc/architecture/scandal-system.md` when available), visual/UX implementation details, specific tuning values.

---

## Data Model

### Player

The root entity. One per save file. Owns all game state.

| Field | Type | Constraints | Where | Notes |
|-------|------|-------------|-------|-------|
| `id` | `string (uuid)` | unique, immutable | both | Generated on first launch |
| `engagement` | `float` | ≥ 0 | both | Workhorse currency. Fast faucet, fast drain |
| `clout` | `int` | ≥ 0 | both | Prestige currency. Earned only via rebrand |
| `total_followers` | `int` | ≥ 0, derived | both | Sum of all platform follower counts. Used for unlock checks and empire scaling |
| `lifetime_followers` | `int` | ≥ 0 | both | Never resets. Tracks total followers ever earned across all runs. Used for Clout calculation at rebrand |
| `rebrand_count` | `int` | ≥ 0 | both | Number of completed rebrands |
| `clout_upgrades` | `map<upgrade_id, int>` | values ≥ 0 | both | Purchased permanent meta-upgrades. Survives rebrand |
| `algorithm_seed` | `int` | immutable per run | both | Seed for the PRNG that drives Algorithm shifts. New seed on rebrand |
| `run_start_time` | `timestamp` | | both | When the current run began (rebrand or first play) |
| `last_close_time` | `timestamp` | nullable | both | When the player last closed the game. Null on first session |
| `last_close_state` | `SnapshotState` | nullable | both | Production rates and algorithm index at close. Used for offline calculation |

**Ownership:** The Player entity is the save root. All mutations flow through the game loop on the client. The server (if/when introduced) receives snapshots for validation or leaderboards — it does not own live game state.

### Generator

Content types that produce Engagement. Unlocked progressively by follower thresholds.

| Field | Type | Constraints | Where | Notes |
|-------|------|-------------|-------|-------|
| `id` | `string (enum)` | one of defined generator types | both | e.g. `selfies`, `memes`, `hot_takes`, etc. |
| `owned` | `bool` | | both | Whether the player has unlocked this generator |
| `level` | `int` | ≥ 1 when owned | both | Upgrade level. Increases base rates |
| `count` | `int` | ≥ 0 | both | Number of this generator purchased (quantity) |
| `base_engagement_rate` | `float` | > 0, from static data | client | Engagement per second per unit at level 1 |
| `follower_conversion_rate` | `float` | (0, 1], from static data | client | Fraction of engagement that converts to followers |
| `trend_sensitivity` | `float` | [0, 1], from static data | client | How much the Algorithm state affects output. 0 = immune, 1 = fully affected |
| `unlock_threshold` | `int` | from static data | client | Total followers required to unlock |

**Static vs. dynamic:** `base_engagement_rate`, `follower_conversion_rate`, `trend_sensitivity`, and `unlock_threshold` come from a static data table (balance config). `owned`, `level`, and `count` are mutable player state.

**Effective engagement rate formula:**
```
effective_rate = count × base_engagement_rate × level_multiplier(level) × algorithm_modifier(trend_sensitivity, current_algorithm_state) × clout_bonus(clout_upgrades)
```

### Platform

Parallel progression tracks. Each has an independent follower count and content affinity.

| Field | Type | Constraints | Where | Notes |
|-------|------|-------------|-------|-------|
| `id` | `string (enum)` | one of defined platforms | both | e.g. `chirper`, `instasham`, `grindset` |
| `unlocked` | `bool` | | both | Whether the player has access |
| `followers` | `int` | ≥ 0 | both | Platform-specific follower count |
| `content_affinity` | `map<generator_id, float>` | values in [0.5, 2.0], from static data | client | Multiplier per generator type on this platform |
| `unlock_threshold` | `int` | from static data | client | Total followers required to unlock |

**Platform follower distribution:** When followers are earned, they are distributed across unlocked platforms weighted by `content_affinity` match with the generators producing engagement. This is not even splitting — a photo-heavy platform earns more followers when the player is running Selfies.

**3 platforms at launch:** Per architect review on the core proposal.

### AlgorithmState

The shifting modifier that changes which strategies perform best.

| Field | Type | Constraints | Where | Notes |
|-------|------|-------------|-------|-------|
| `current_state_id` | `string (enum)` | one of defined algorithm states | both | e.g. `short_form_surge`, `authenticity_era`, `engagement_bait` |
| `current_state_index` | `int` | ≥ 0 | both | Position in the seeded shift schedule |
| `shift_time` | `timestamp` | | both | When the next shift occurs |
| `state_modifiers` | `map<generator_id, float>` | values typically in [0.5, 2.0], from static data | client | Per-generator multiplier for the current state |

**The shift schedule is deterministic.** Given a seed, the full sequence of (state, duration) pairs is reproducible. See Technology Decisions for the PRNG spec.

### SnapshotState

Captured when the player closes the game. Used for offline calculation.

| Field | Type | Constraints | Where | Notes |
|-------|------|-------------|-------|-------|
| `total_engagement_rate` | `float` | ≥ 0 | both | Aggregate engagement/sec at time of close |
| `total_follower_rate` | `float` | ≥ 0 | both | Aggregate followers/sec at time of close |
| `algorithm_state_index` | `int` | ≥ 0 | both | Algorithm position at close |
| `platform_rates` | `map<platform_id, float>` | | both | Per-platform follower earn rate at close |

### CloutUpgrade

Static definition of a permanent meta-upgrade purchased with Clout.

| Field | Type | Constraints | Where | Notes |
|-------|------|-------------|-------|-------|
| `id` | `string (enum)` | unique | both | e.g. `faster_engagement`, `algorithm_insight`, `platform_headstart` |
| `cost` | `int[]` | per level, ascending | client | Clout cost for each level |
| `max_level` | `int` | ≥ 1 | client | Maximum purchasable level |
| `effect` | `UpgradeEffect` | | client | What the upgrade does (typed union, see below) |

**UpgradeEffect** is a tagged union:
- `{ type: "engagement_multiplier", value: float }` — multiplies all engagement rates
- `{ type: "generator_unlock", generator_id: string }` — unlocks a post-prestige generator
- `{ type: "algorithm_insight", lookahead: int }` — reveals upcoming Algorithm shifts
- `{ type: "platform_headstart", platform_id: string }` — platform starts unlocked on new runs

---

## Component Boundaries

### Client (Node.js / Browser)

**Responsibility:** Owns the live game loop, all real-time state mutation, rendering, and player interaction.

The client is the authority for all gameplay. This is a single-player game. There is no server-authoritative game state during play. The client:
- Runs the game loop (tick → calculate rates → update currencies → check unlocks)
- Manages all entity state in memory during play
- Executes the Algorithm shift schedule via seeded PRNG
- Calculates offline gains on open
- Persists save state to local storage
- Renders UI

### Server (deferred)

**Status:** Deferred at launch. Not being built. This section documents the extension point for when social/multi-device features are committed to.

**Responsibility (when built):** Provides optional services that the client cannot handle alone — save backup, leaderboards, seed issuance (if social features are added later).

The server is **not required for the game to function.** The game is fully playable offline and client-only. The server is a future-proofing boundary, not a launch dependency. Revisit when one of these is committed: leaderboards, cross-device cloud saves, or shared/community algorithm seeds.

If/when the server is introduced:
- Receives save snapshots for cloud backup
- Issues algorithm seeds (for consistent cross-player Algorithm schedules if leaderboards exist)
- Validates save state for leaderboard integrity
- Does NOT run the game loop, does NOT own authoritative game state during play

### Static Data Module

**Responsibility:** Defines all balance values — generator stats, platform affinities, algorithm states, upgrade costs, unlock thresholds.

This is a data-only module, not a runtime service. It is loaded by the client at startup. Changes to balance values require only editing the static data — no code changes to the game loop.

Expressed as JSON or TypeScript constants. Imported by the game loop and UI.

### Game Loop Module

**Responsibility:** Executes the core tick — calculates production rates, updates currencies, processes follower distribution, checks unlock conditions, advances the Algorithm.

One tick per frame (or at a fixed interval, e.g. 100ms). The tick is a pure function of current state + elapsed time → new state. Side effects (save, render) happen outside the tick.

### Save Module

**Responsibility:** Serializes/deserializes game state to/from local storage. Handles versioning for save format migrations.

The save format is JSON. Save on a timer (every 30s) and on close. Load on open. The save module owns the schema version and migration logic — when the save format changes between versions, this module transforms old saves to the new format.

### Offline Calculator

**Responsibility:** Computes the state delta between close and open.

On open: read `last_close_time` and `last_close_state`. Calculate elapsed time. Apply production rates from the snapshot. Advance the Algorithm schedule (deterministic from seed). Distribute gains. No negative events.

This is a one-shot calculation, not a simulation. It produces a delta that is applied to the current state.

---

## Interface Contracts

### Game Loop → Static Data

```typescript
interface StaticData {
  generators: Record<GeneratorId, GeneratorDef>;
  platforms: Record<PlatformId, PlatformDef>;
  algorithmStates: Record<AlgorithmStateId, AlgorithmStateDef>;
  algorithmSchedule: {
    baseIntervalMs: number;     // base time between shifts
    varianceMs: number;         // ± fuzz range
  };
  cloutUpgrades: Record<UpgradeId, CloutUpgradeDef>;
  unlockThresholds: {
    generators: Record<GeneratorId, number>;   // total followers to unlock
    platforms: Record<PlatformId, number>;     // total followers to unlock
  };
}
```

### Game Loop Tick

```typescript
interface GameState {
  player: Player;
  generators: Record<GeneratorId, GeneratorState>;
  platforms: Record<PlatformId, PlatformState>;
  algorithm: AlgorithmState;
}

// Pure function. No side effects.
function tick(state: GameState, deltaMs: number, staticData: StaticData): GameState;
```

The tick function:
1. Computes effective engagement rate per generator (base × level × count × algorithm modifier × clout bonus × platform affinity)
2. Sums total engagement earned in `deltaMs`
3. Adds engagement to `player.engagement`
4. Computes follower conversion (engagement × conversion rates, distributed across platforms by affinity weighting)
5. Checks unlock conditions (generators, platforms)
6. Advances Algorithm if `shift_time` has passed — computes next state from seed

### Save Module

```typescript
interface SaveData {
  version: number;
  state: GameState;
  lastCloseTime: number;       // epoch ms
  lastCloseState: SnapshotState;
}

function save(state: GameState): void;        // serialize to localStorage
function load(): GameState | null;            // deserialize, migrate if needed
function migrate(data: SaveData): SaveData;   // version migration chain
```

### Offline Calculator

```typescript
interface OfflineResult {
  engagementGained: number;
  followersGained: Record<PlatformId, number>;
  algorithmAdvances: number;      // how many shifts occurred while offline
  newAlgorithmState: AlgorithmState;
}

function calculateOffline(
  snapshot: SnapshotState,
  closeTime: number,
  openTime: number,
  seed: number,
  staticData: StaticData
): OfflineResult;
```

**Offline calculation is segmented by Algorithm shifts.** The production rates change when the Algorithm shifts, so the calculator must:
1. Walk the shift schedule from `closeTime` to `openTime`
2. For each segment between shifts, apply the production rates for that Algorithm state
3. Sum the gains across all segments

This is why the snapshot includes `algorithm_state_index` — it tells the calculator where to start walking the schedule.

### Prestige (Rebrand)

```typescript
interface RebrandResult {
  cloutEarned: number;
  newSeed: number;
}

function calculateRebrand(state: GameState): RebrandResult;
function applyRebrand(state: GameState, result: RebrandResult): GameState;
```

`calculateRebrand` computes Clout earned from `lifetime_followers` (current run contribution). `applyRebrand` resets engagement, generators (to unowned), platforms (to locked, minus headstarts), follower counts to zero, increments `rebrand_count`, applies new seed, preserves `clout` and `clout_upgrades`.

### Client → Server (future)

```
POST /api/save    — upload save snapshot for cloud backup
GET  /api/save    — download latest save snapshot
POST /api/seed    — request a new algorithm seed (for social features)
POST /api/score   — submit leaderboard score with save hash for validation
```

These are not required for launch. Defined here so the save format and state shape are designed with future serialization in mind.

---

## Coupling Analysis

### Generator ↔ Algorithm

**Dependency:** Generator effective rate depends on current Algorithm state via `trend_sensitivity × algorithm_modifier`.

**Interface:** The game loop reads `algorithm.state_modifiers[generator_id]` and `generator.trend_sensitivity` and multiplies them. Neither system calls the other directly. The game loop is the orchestrator.

**What breaks if this changes:** If Algorithm modifiers change shape (e.g., from per-generator to per-category), the tick function's rate calculation changes. Contained to one formula in the tick.

### Generator ↔ Platform

**Dependency:** Platform `content_affinity` modifies generator output on that platform. Follower distribution depends on which generators are active and which platforms are unlocked.

**Interface:** The tick reads `platform.content_affinity[generator_id]` when distributing followers. The platform does not know about generators directly — affinity is a static data lookup.

**What breaks if this changes:** If follower distribution logic changes (e.g., player-directed instead of affinity-weighted), the tick's distribution step changes. Contained to one step in the tick.

### Offline Calculator ↔ Algorithm

**Dependency:** Offline gains must account for Algorithm shifts that occurred while the player was away. The calculator walks the seeded shift schedule.

**Interface:** The calculator uses the same PRNG + schedule logic as the live game loop. Both derive from `StaticData.algorithmSchedule` and the player's `algorithm_seed`.

**What breaks if this changes:** If the shift schedule logic changes, both the live tick and the offline calculator must be updated. **This is the tightest coupling in the system.** Mitigation: extract the shift schedule walker into a shared function used by both.

### Save Module ↔ Everything

**Dependency:** The save module serializes `GameState`, which includes all entities. Any structural change to any entity requires a save migration.

**Interface:** The save module treats `GameState` as an opaque blob with a version number. Migrations are a linear chain: v1 → v2 → v3 → ... Each migration is a pure function `SaveData → SaveData`.

**What breaks if this changes:** Adding/removing/renaming fields requires a migration. This is the expected cost and is manageable with the version chain pattern.

### Prestige ↔ State

**Dependency:** Rebrand touches nearly every entity — resets generators, platforms, followers, engagement. Preserves clout, clout_upgrades, lifetime stats.

**Interface:** `applyRebrand` is a single function that takes the full state and returns a new full state. The reset logic is explicit — each field is either preserved or reset, listed in the function.

**What breaks if this changes:** Adding a new entity raises the question: does it survive rebrand? This must be answered explicitly for every new entity. The function's explicit field list makes this visible.

---

## Technology Decisions

### Seeded PRNG for Algorithm Shifts

**Decision:** Use a seeded pseudo-random number generator to determine the Algorithm shift schedule.

**Implementation:** A simple, fast PRNG — Mulberry32 or similar. The seed is a 32-bit integer. The PRNG is called to produce:
1. The next Algorithm state (index into the state list)
2. The duration variance for the next shift (base interval ± variance)

The same seed produces the same sequence every time. This means:
- Algorithm behavior is deterministic and reproducible
- Works fully offline — no server polling
- Offline calculator can walk the schedule without simulating
- Debuggable — given a seed, you can reproduce any player's Algorithm history

**New seed on rebrand.** Each prestige run gets a fresh seed (derived from the old seed + rebrand count), so the Algorithm feels different each run.

### Persistence: Local Storage + JSON

**Decision:** Save game state to browser `localStorage` as JSON.

**Rationale:** The game is single-player, client-authoritative. No database is needed. localStorage is synchronous, available in all browsers, and persists across sessions. JSON is human-readable for debugging.

**Limits:** localStorage is typically 5-10MB per origin. A save file for this game should be well under 100KB. If save size grows beyond localStorage limits (unlikely), IndexedDB is the fallback — same serialization format, different storage API.

**Save frequency:** Every 30 seconds on a timer + on page `beforeunload`. The save module debounces to avoid write contention.

### State Management: Plain State Object + Immutable Tick

**Decision:** Game state is a plain JavaScript/TypeScript object. The tick function takes state in, returns new state out. No reactive state library for game logic.

**Rationale:** The game loop is a pure function. Reactive state management (Redux, Zustand, signals) adds overhead and indirection for what is fundamentally `state → state`. The UI layer may use a reactive binding to render (e.g., React state, Svelte stores), but the game loop itself is framework-agnostic.

**The boundary:** Game loop produces state. UI layer subscribes to state changes and renders. The UI does not mutate game state directly — it dispatches actions (click, buy, rebrand) that the game loop processes on the next tick.

### Engagement-to-Follower Conversion

**Decision:** Followers are earned continuously as a fraction of engagement production, not as a separate spend action.

**Formula:**
```
followers_per_platform_per_tick = Σ (generator_effective_rate × generator.follower_conversion_rate × platform.content_affinity[generator_id]) / total_affinity_weight
```

This means every generator contributes to every unlocked platform proportionally. The player doesn't choose where followers go — the content mix and platform affinities determine distribution. This is intentional: the strategic lever is "which generators to invest in" and "which platforms to unlock," not micro-managing follower allocation.

### Client Framework

**Decision: Vite + React + TypeScript.** Chosen for solo-developer familiarity and ecosystem maturity on a long-lived project of modest complexity. The game loop remains framework-agnostic by design — React is the view-layer binding, nothing more.

**Constraint:** The game loop must not import from React. The dependency is one-way: UI → game loop, never reverse. The game loop is a pure `state → state` function consumed by React components via hooks/context.

---

## Open Questions

1. ~~**Clout-to-follower scaling curve for rebrand.**~~ **Resolved 2026-04-04:** `clout_awarded = floor(sqrt(total_followers) / 10)`. Uses `total_followers` (current run, resets on rebrand) — not `lifetime_followers`. Divisor `10` is the single tuning knob. First clean milestone: 10,000 followers → 10 Clout (assumes first-tier upgrade costs ~10 Clout). See `.frames/sdlc/proposals/draft/clout-to-follower-scaling-curve.md` for full rationale and value table. Note: `calculateRebrand` comment should be updated to clarify it uses `total_followers`.

2. ~~**Level multiplier curve.**~~ **Resolved 2026-04-04:** Super-exponential curve — `level_multiplier(level) = 2^(level² / 5)`. Per-generator, independent. Typical run ceiling is level 7–8 (891×–7,225×); levels 9–10 are post-prestige territory (75k×–1M×). The denominator `5` is the single tuning knob. See `.frames/sdlc/proposals/draft/level-multiplier-curve.md` for full rationale and value table.

3. ~~**Server scope and timeline.**~~ **Resolved 2026-04-04:** Deferred at launch. Not being built. Revisit when leaderboards, cross-device cloud saves, or shared algorithm seeds become committed features.

---

## Assumptions

1. **Single-player, client-authoritative.** The game does not need server validation for core gameplay. If multiplayer or competitive features are added, the server boundary is already defined, but the client remains the live authority. **Load-bearing: if this changes, the entire state ownership model changes.**

2. **No real-money transactions.** Per the accepted design proposal. No payment system, no server-side purchase validation. **Load-bearing: if this changes, the client-authoritative model is no longer safe.**

3. **Browser target.** The game runs in a web browser. localStorage is available. The game loop runs in the main thread (no Web Workers needed at current scale). **If this changes to native/mobile, the persistence layer changes but the game loop does not.**

4. **3 platforms at launch.** Per architect review. The platform system is designed to support N platforms — adding a 4th requires only a new entry in static data, not structural changes.

5. **Algorithm states are a fixed set per seed.** The shift schedule cycles through a defined list of states. Adding a new Algorithm state is a static data change. Removing one requires a migration for saves that reference it.

6. **Offline calculation is approximation, not simulation.** The offline calculator does not replay every tick — it applies aggregate rates per Algorithm segment. This means offline gains may differ slightly from what active play would have produced. This is acceptable and standard for the genre. **Load-bearing: if exact parity with active play is required, the offline calculator becomes dramatically more complex.**
