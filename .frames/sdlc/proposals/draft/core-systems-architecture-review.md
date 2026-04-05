---
name: Core Systems Architecture Review
description: Eight fragilities surfaced by an architect walk-through of the client core modules — schema-evolution risk, swallowed errors, stale architecture doc, dual-write fields, unused persistent fields, scattered polymorphism, and event-emission shape.
author: architect
status: draft
reviewers: [engineer]
---

# Proposal: Core Systems Architecture Review

## Problem

An architect walk-through of the client core modules — `driver`, `game-loop`, `offline`, `save`, `prestige`, `model`, `platform`, `generator`, `static-data`, and the `core-systems.md` architecture doc — surfaced eight fragilities. None are active bugs. They are load-bearing assumptions, duplicated work, and deferred decisions that will cost more the longer they sit.

The engineer annotated several of these directly in the source (`NOTE(architect):`, `TODO(engineer):`, "flagged to the architect"). These annotations have been sitting unaddressed, and the architecture doc is now actively misleading — it describes a contract the code no longer satisfies.

This proposal groups all eight findings so the engineer can review the whole picture, then react per item. Resolutions that are architect-authority-only are stated as decisions; items requiring engineer input are framed as open questions.

## Proposal

### 1. Enum-closure brittleness

**Observation.** Every collection is shaped as `Record<EnumId, X>` where `EnumId` is a closed union (`GeneratorId`, `PlatformId`, `UpgradeId`, `AlgorithmStateId`). Adding a new member requires edits at 7+ sites: the TS union in `types.ts`, three hand-maintained arrays in `model/index.ts` (`ALL_GENERATOR_IDS`, `ALL_PLATFORM_IDS`, `allUpgradeIds`), every static data record that keys by the enum (`content_affinity`, `state_modifiers`, `unlockThresholds.{generators,platforms}`), and — critically — every existing save file.

**Impact.** Loading an old save after adding `podcasts_v2` yields `state.generators.podcasts_v2 === undefined`. The next tick crashes at `.owned`. There is no migration to catch this. Coupled with finding #2, enum-closure is a save-compatibility time bomb.

**Resolution (architect).** Keep the closed-enum type pattern — it is genuinely useful for exhaustiveness. But introduce a `hydrate` step in `save/load()` that, after parsing, fills any missing enum keys with the default factory output (`createGeneratorState`, `createPlatformState`, `createPlayer` clout_upgrades). This makes adding a new member a one-version bump with zero crash risk. The hydrate step is mechanical — it walks the current enum lists and fills gaps.

### 2. Empty migration chain

**Observation.** `save/index.ts` has `CURRENT_VERSION = 2` but `migrate()` is a no-op pass-through with only a version guard. There is no exercised migration path. A save stamped `version: 1` throws immediately.

**Impact.** First real schema change ships with an untested migration. Mistakes at this layer are hard to recover from — once shipped, the migration runs on every player's save on every load.

**Resolution (architect).** (a) Document the policy: version bumps require a migration case, even if the case is identity. (b) Add a v1→v2 no-op case now so the chain has an exercised path. (c) Pair every future field addition with (i) a migration case and (ii) a hydrate step per #1. This is documentation + a harness, not a redesign.

### 3. Swallowed errors in the driver

**Observation.** Two `catch {}` blocks in `driver/index.ts`:
- Line 158: corrupt `load()` → silently falls through to fresh initial state. Player's save is gone, no log, no UI signal.
- Line 222: `save()` quota-exceeded → silently swallowed, annotated `TODO(engineer): surface a soft warning to the UI when quota is hit`.

**Impact.** The first is worst: a transient JSON parse bug wipes the save with no trace. This violates the "never swallow errors silently" principle stated in `ARCHITECTURE.md`.

**Resolution (architect).** Add a `saveErrorListener` channel on `GameDriver` alongside `onViralBurst`. Emits typed error events: `{ kind: 'load_corrupt' | 'save_quota' | 'save_unknown', details?: string }`. The `useGame` hook surfaces them to local state; the UI chooses rendering. The driver never swallows — either emit an error or log to console (dev only).

**Engineer task to file on acceptance**: wire the channel and make `load()` failures distinguishable from "no save exists" (return a result type, not null).

### 4. Contract drift in core-systems.md

**Observation.** The engineer left three explicit "your spec is stale" annotations in the code:
- `types.ts:8` — spec says 6 generators; code has 7 (`viral_stunts`)
- `game-loop/index.ts:295` — `tick(state, deltaMs, staticData)` in spec; code is `tick(state, now, deltaMs, staticData)` because shift advancement needs absolute time
- `offline/index.ts:18` — `calculateOffline(snapshot, closeTime, openTime, seed, staticData)` in spec; code takes full `GameState` because per-segment recomputation needs per-generator `trend_sensitivity`

**Impact.** The architecture doc actively misleads the next reader. Per the architect role file: "a stale architecture doc is worse than no doc."

**Resolution (architect).** This is architect-owned hygiene. Update `core-systems.md` to reflect the true signatures: 7 generators, `tick(state, now, deltaMs, staticData)`, and `calculateOffline(state, closeTime, openTime, staticData)` with a rationale section explaining why the snapshot-only signature was insufficient. This is a follow-up architect task.

### 5. `total_followers` dual-write

**Observation.** `Player.total_followers` is labelled "derived field — keep in sync." It is maintained via **two code paths inside the same tick**:
- `game-loop/index.ts:371` — incremented by `totalGained` each tick
- `game-loop/index.ts:377` — immediately recomputed from `platforms` via `syncTotalFollowers()`

`model/earnFollowers` also writes both sides. The incremental update is redundant work that exists only because a future writer might forget the sync.

**Impact.** "Consistent by accident." Anyone adding a new follower-earning path has to remember both sides, or the defensive sync has to run after it. Silent drift is the failure mode.

**Resolution (architect).** Make `total_followers` purely derived. Remove the incremental update in `tick()`, rely on `syncTotalFollowers` as the single source of truth. Document that `total_followers` MUST NOT be written directly — only via `syncTotalFollowers`. `lifetime_followers` stays incremental (it has no derivation source since it survives rebrand).

**Engineer task to file on acceptance**: consolidate the write path.

### 6. `SnapshotState` stored but unread

**Observation.** `last_close_state` is written on every save, refreshed after offline calc, persisted in the save envelope, and migrated forward — but `calculateOffline` ignores it. The code comment at `offline/index.ts:11-18` states this explicitly: "The snapshot is still stored — reserved for future use."

**Impact.** Every save path maintains a field nobody reads. Storage tax + consistency tax for no benefit.

**Resolution (architect).** Remove `SnapshotState` from the save envelope. If server-side validation is introduced later, compute it on demand from the recomputed state at the validation boundary. Reviving a currently-unused field is cheaper than maintaining one indefinitely.

**Engineer task to file on acceptance**: remove the field, add a migration case.

### 7. `UpgradeEffect` polymorphism scatter

**Observation.** `UpgradeEffect` is a discriminated union with four variants. Their handlers live in four different functions across two files:

| Variant | Handler |
|---|---|
| `engagement_multiplier` | `game-loop/cloutBonus` |
| `platform_headstart` | `prestige/platformsUnlockedByHeadstart` |
| `generator_unlock` | `prestige/generatorsUnlockedByCloutUpgrade` |
| `algorithm_insight` | `prestige/getUpcomingShifts` |

None use a `default` branch that throws. Each handler silently ignores unfamiliar effect types.

**Impact.** Adding a fifth effect type requires knowing all four sites. The failure mode for incomplete implementation is silent non-application, not a compile error or crash.

**Resolution (architect).** This is a polymorphism-scatter problem, but a centralized registry would be premature (see Actions Column OQ3 — we have 4 variants and realistically will have 6–8 ever). Instead, add exhaustiveness guards: each handler switches on `effect.type` with an `assertNever(effect)` default. TypeScript enforces completion at compile time in each site; adding a variant produces four compile errors that point to each site.

**Engineer task to file on acceptance**: introduce `assertNever` helper, convert each handler to an exhaustive switch with an unreachable default.

### 8. Event emission via state-diff

**Observation.** The driver detects viral burst start by diffing `prevViralActive === null` against `next.viralBurst.active !== null`. It works because virals never fire back-to-back in one tick. But it establishes a precedent: every future active event (brand deals, scandals, PR responses, Actions-column members) needs its own state-diff hook in the driver.

**Impact.** This pattern scales poorly. With 3+ event types, the driver's `doTick` becomes a growing diff-ladder. Related to Actions Column OQ3 and upcoming viral-burst tasks (#50, #51) that will add the second event type — now is the last cheap moment to establish the pattern.

**Resolution (architect).** Extend `tick()` return to include an optional `events: GameEvent[]` field alongside the new state. `GameEvent` is a tagged union (`{type: 'viral_started', payload: ViralBurstPayload} | {type: 'platform_unlocked', platform_id: PlatformId} | …`). The driver emits events from the tick's event list rather than diffing state. This is **not** a pub/sub bus — it is a per-tick event list that the driver dispatches synchronously to typed listener channels.

**Engineer input needed.** This changes `tick()`'s signature and adds a dispatcher pattern to the driver. Open question below.

## References

1. `client/src/types.ts` — data model, enum unions, TODOs
2. `client/src/driver/index.ts` — swallowed errors, viral state-diff, singleton driver
3. `client/src/game-loop/index.ts` — dual-write, tick signature drift, viral trigger
4. `client/src/offline/index.ts` — signature drift, unused snapshot commentary
5. `client/src/save/index.ts` — empty migration chain
6. `client/src/model/index.ts` — syncTotalFollowers, enum array duplication
7. `client/src/prestige/index.ts` — three UpgradeEffect handlers
8. `.frames/sdlc/architecture/core-systems.md` — stale contracts
9. `.frames/sdlc/proposals/draft/actions-column.md` — OQ3 (polymorphism scatter / registry pattern)

## Open Questions

1. **Event-list pattern on `tick()` — worth the signature change before viral burst ships?** Finding #8 proposes extending `tick()` to return events alongside state. Tasks #50/#51 (viral burst) are the last tasks that will ship before the event count grows. Engineer: is this worth doing now, or do we accept the state-diff pattern for one more event and revisit when the third is added? **Owner: engineer**

2. **Hydrate-on-load vs. strict migration for enum additions.** Finding #1 proposes a hydrate step that fills missing enum keys after load. Alternative: require every enum addition to ship its own explicit migration case that inserts the new keys. Hydrate is cheaper and safer (no per-addition migration boilerplate); strict migrations are more auditable. Engineer: preference? **Owner: engineer**

3. **`SnapshotState` removal — any reason to keep it?** Finding #6 proposes deleting the field. Engineer: is there a client-side use I missed (debug tooling, future offline approximation path)? **Owner: engineer**

4. **`assertNever` pattern vs. centralized handler dispatch.** Finding #7 proposes scattered-but-exhaustive handlers. If the engineer prefers a single dispatch module (all effects applied in one place), say so — that is a viable alternative with different tradeoffs. **Owner: engineer**
