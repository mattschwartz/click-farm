# Manual Action Ladder Architecture

> **Scope:** Defines the data-model delta, interface contracts, coupling surfaces, and migration contract for the Manual Action Ladder — the refactor that turns the single Post button into a per-verb ladder of manual-clickable generators, splits `base_engagement_rate` into yield × rate, and introduces a three-state lifecycle (Unlock → Upgrade → Automate) over the existing `GeneratorState`.

> **Not in scope:** Balance values (owned by game-designer — see `proposals/accepted/manual-action-ladder.md` §14 and task #115), Actions-column UX anatomy (owned by ux-designer, tracked in task #118 / UX ladder spec), late-game content arc above viral_stunts.

> **Source:** `.frames/sdlc/proposals/accepted/manual-action-ladder.md` (accepted, status: implementation). Architect's OQ11/12/13 resolutions and re-review are load-bearing. §12 "What This Locks In" is the canonical surface contract; this spec formalizes the implementation boundaries the proposal does not name.

---

## Data Model

### GeneratorDef (modifications + additions)

The `base_engagement_rate` scalar splits into two fields; one new boolean field is added.

| Field | Type | Constraints | Status | Notes |
|-------|------|-------------|--------|-------|
| `base_engagement_rate` | `float` | — | **REMOVED** | Replaced by the `base_event_yield × base_event_rate` product. All existing call sites migrate. |
| `base_event_yield` | `float` | > 0, from static data | **NEW** | Engagement produced per event (per click for manual; per passive "event" for automators). Scales with Upgrade (level). |
| `base_event_rate` | `float` | > 0, from static data | **NEW** | Events per second per unit (actor). Scales with Automate (count). Derived manual-cooldown: `1 / (max(1, count) × base_event_rate)`. |
| `manual_clickable` | `bool` | from static data | **NEW** | `true` for the 5 ladder verbs (chirps, selfies, livestreams, podcasts, viral_stunts); `false` for the 3 passive-only generators (memes, hot_takes, tutorials) AND the 3 post-prestige generators (ai_slop, deepfakes, algorithmic_prophecy). See §Coupling → Static Data. |

**Mathematical equivalence.** Seeded with `base_event_yield=1.0, base_event_rate=<old base_engagement_rate>`, the effective-rate formula produces numerically identical passive output to today. This equivalence MUST be covered by a regression test (`computeGeneratorEffectiveRate` → tick → engagement delta) against a pinned GameState with count≥1, level≥1.

**`manual_clickable` semantics.** This flag is the single source of truth for two gates:
1. `postClick(state, staticData, verbId)` rejects verbIds where `def.manual_clickable === false`.
2. The Actions-column UI view filters `Object.values(staticData.generators)` to `manual_clickable === true`.

Post-prestige generators (ai_slop, deepfakes, algorithmic_prophecy) are explicitly `manual_clickable: false`. They are narratively "the machine produces content about you" and are mechanically incompatible with the ladder lifecycle (they are Clout-gated, not follower-gated, and their unlock surfaces through the Clout shop, not the Actions column). Their yield/rate split is backward-compatible: `base_event_yield=1.0, base_event_rate=<old base_engagement_rate>`.

### GeneratorState (semantic change to `owned`)

**No field additions or removals.** The existing shape `{id, owned: boolean, level: int, count: int}` carries through. What changes is the **semantic** of `owned` for the 5 manual-clickable verbs:

| Generator class | `owned` semantic | Auto-flip source | Unlock surface |
|-----------------|------------------|------------------|----------------|
| Passive-only (memes, hot_takes, tutorials) | "follower-threshold met AND visible in Upgrades column" | `checkGeneratorUnlocks` flips `owned=true` when `total_followers ≥ unlock_threshold` | Upgrades column — no player purchase to unlock (unchanged from today). |
| Manual-clickable ladder verbs (chirps, selfies, livestreams, podcasts, viral_stunts) | "player has paid the Unlock cost AND verb is live in Actions column" | NOT auto-flipped. Threshold-met only gates **ghost-slot eligibility** (UI surface); the Unlock purchase flips `owned=true` via a new driver action. | Actions column ghost slot (per OQ6); tap-to-unlock pays the Unlock cost. |
| Post-prestige (ai_slop, deepfakes, algorithmic_prophecy) | "Clout `generator_unlock` upgrade purchased" | `generator_unlock` CloutUpgrade effect (unchanged from today) | Clout shop modal (unchanged). |
| chirps special case | Starter verb — threshold=0 → `owned=true` at fresh-start / post-migration seed. | Seeded `owned=true` by `createInitialGameState` (via the existing `threshold === 0 → owned=true` rule in `model/index.ts` L127-131) AND by `migrateV8toV9`. | No ghost slot — always live. |

**Why reuse `owned` rather than add a new field:**
- Today's invariant — "a generator is purchasable / usable when owned=true" — is preserved verbatim. UI, tick loop, unlock checks, and offline calculation all continue to read `owned` with the same truth condition.
- The lifecycle distinction is narrative, not structural: "how did owned become true" differs between classes, but the downstream meaning is identical.
- Adding an `unlocked: bool` sibling field would double the state space (owned × unlocked × count × level = 16 configurations with 12 of them invalid) and require every consumer to check both.
- Cost of this reuse: `checkGeneratorUnlocks` needs to know `manual_clickable` and split its behavior (§Interface Contracts). That is a one-function change, bounded.

### Player (additions)

One new field added to the `Player` entity from `core-systems.md`:

| Field | Type | Constraints | Where | Notes |
|-------|------|-------------|-------|-------|
| `last_manual_click_at` | `Record<GeneratorId, number>` (partial) | values ≥ 0 (epoch ms); missing key read as 0 | both | Per-verb cooldown gate for manual clicks. Seeded `{}` at fresh-start and at migration. TypeScript may shape this as `Partial<Record<GeneratorId, number>>`; the contract is "missing key = never clicked" via the `?? 0` guard in the cooldown check. |

**Why a single `Record<GeneratorId, number>` rather than per-generator state:** manual-click-at is a thin, write-heavy field with no lifecycle coupling to `GeneratorState` (it persists across level/count changes, is not reset by rebrand, and is never read by the passive tick pipeline). Keeping it on `Player` keeps the cooldown concern in one place, keeps `GeneratorState` minimal, and matches the shape of `clout_upgrades` and `creator_kit` (thin lookup maps on `Player`).

**Rebrand behavior.** `last_manual_click_at` SHOULD be reset to `{}` on rebrand. Rationale: rebrand wipes generator `count` and `level`, so retaining click timestamps keyed on the pre-rebrand cooldown model is semantically meaningless. Engineer to verify this in the prestige/rebrand pathway and cover with a test.

### GeneratorId union (addition)

One new entry: `'chirps'`. Added at position 0 of the union. The full union becomes:

```typescript
type GeneratorId =
  | 'chirps'              // NEW — ladder rung 1, threshold=0
  | 'selfies'             // threshold now 100 (was 0)
  | 'memes'               // unchanged
  | 'hot_takes'           // unchanged
  | 'tutorials'           // unchanged
  | 'livestreams'         // unchanged
  | 'podcasts'            // unchanged
  | 'viral_stunts'        // unchanged
  | 'ai_slop'             // post-prestige, unchanged
  | 'deepfakes'           // post-prestige, unchanged
  | 'algorithmic_prophecy'; // post-prestige, unchanged
```

Every `Record<GeneratorId, ...>` in the codebase must gain a `chirps` entry — see §Coupling → Static Data for the exhaustive list.

---

## Interface Contracts

### `postClick(state, staticData, verbId) → GameState`

Replaces today's `postClick(state, staticData)`. Signature break; the callsite compatibility path is the driver shim (§Driver Shim Strategy).

**Contract:**
1. Precondition: `verbId: GeneratorId` is provided.
2. Guard A — manual_clickable: if `staticData.generators[verbId].manual_clickable === false`, return `state` unchanged. (Passive-only and post-prestige generators are not valid click targets.)
3. Guard B — owned: if `state.generators[verbId].owned === false`, return `state` unchanged. (Verb has not been Unlocked yet.)
4. Guard C — cooldown gate:
   ```
   const count = state.generators[verbId].count;
   const cooldownMs = 1000 / (Math.max(1, count) × def.base_event_rate);
   const last = state.player.last_manual_click_at[verbId] ?? 0;
   if (now - last < cooldownMs) return state;
   ```
   The `Math.max(1, count)` floor models the player's own hand as actor #1 (per OQ16). The `?? 0` makes "never clicked" explicit.
5. Compute earned (no platform-affinity term — per OQ17):
   ```
   earned = def.base_event_yield
          × levelMultiplier(genState.level)
          × effectiveAlgorithmModifier(rawModifier, def.trend_sensitivity)
          × cloutBonus(state.player.clout_upgrades, staticData)
          × kitEngagementBonus(state.player.creator_kit, staticData)
   ```
6. Return `state` with `engagement += earned` (clamped), `last_manual_click_at[verbId] = now`.

**Determinism / `now` sourcing.** `postClick` needs a timestamp for the cooldown gate. Engineer should accept `now` as a parameter (defaulting to `Date.now()`) to keep the function testable, mirroring the pattern in `tick()`. Whether `now` is passed through the driver or read inside `postClick` is an engineer call; the contract requires only that manual clicks made within `cooldownMs` of each other on the same verb produce one state update, not two.

**Deletion.** `CLICK_BASE_ENGAGEMENT` constant and `CLICK_GENERATOR_ID` constant are removed from `game-loop/index.ts` when the shim is torn down. They MUST NOT leak into the replacement call sites (`GameScreen.tsx`).

### `unlockGenerator(state, verbId, staticData) → GameState` (NEW)

The new driver action that implements the Unlock lifecycle step for manual-clickable verbs.

**Contract:**
1. Throws if `staticData.generators[verbId].manual_clickable === false` — passive-only and post-prestige generators do not flow through this action.
2. Throws if `state.generators[verbId].owned === true` — already unlocked.
3. Throws if `state.player.total_followers < staticData.generators[verbId].unlock_threshold` — threshold not met (ghost-slot not yet eligible).
4. Throws if player cannot afford `unlockCost(verbId, staticData)` — see §Assumption A2 for the unlock-cost source.
5. On success: spends Engagement, flips `state.generators[verbId].owned = true`, returns new state.

**Why a new action, not repurposed `buyGenerator`:** `buyGenerator` increments `count` (the Automate step). Conflating the two would couple the "first Automate purchase" price to the Unlock price, which blurs the three-state lifecycle the proposal locks in. A distinct `unlockGenerator` keeps the lifecycle legible in the codebase.

**Driver wiring:** a new `driver.unlock(verbId)` method, mirroring `driver.buy(verbId)` / `driver.upgrade(verbId)`.

### `checkGeneratorUnlocks(generators, totalFollowers, staticData) → Record<GeneratorId, GeneratorState>` (behavior split)

Existing function; behavior splits by `manual_clickable`.

**Behavior:**
- For each entry where `generators[id].owned === false`:
  - Look up `threshold = staticData.unlockThresholds.generators[id]`. Skip if `undefined` (post-prestige — unchanged).
  - If `totalFollowers < threshold`, skip.
  - **If `staticData.generators[id].manual_clickable === true`:** DO NOT flip `owned`. Threshold-met is consumed by the UI layer to opacify the ghost slot; the actual owned-flip happens only through `unlockGenerator`.
  - **If `staticData.generators[id].manual_clickable === false`:** flip `owned = true` (today's behavior preserved).

**Return contract:** unchanged — same reference if nothing changed, new map otherwise. Callers (`tick`, `offline/computeOfflineProgression`) require no changes.

**UI-layer contract (for ux-designer / engineer):** ghost-slot eligibility is derived as:
```
canUnlock(verbId) =
  staticData.generators[verbId].manual_clickable === true
  && state.generators[verbId].owned === false
  && state.player.total_followers >= (staticData.unlockThresholds.generators[verbId] ?? Infinity)
```
This is a pure derived view — no new state fields are needed. The ux-designer's Actions-column spec (task #118) consumes this derivation.

### `computeGeneratorEffectiveRate` (formula change only)

**New formula:**
```
effective_rate = count × base_event_rate × base_event_yield × levelMultiplier(level) × algoMod × clout × kit
```

**Equivalence guarantee:** for any generator with `base_event_yield=1.0, base_event_rate=<old base_engagement_rate>`, this produces numerically identical output to the pre-refactor formula. A regression test MUST pin a canonical `GameState` and assert the engagement-per-tick delta is equal (or bit-identical on a fixed platform) before and after the refactor, for all 7 pre-existing generators.

**No behavior change to the tick loop.** `tick()`, offline progression, viral-burst rate queries, and UI rate displays all continue to call `computeGeneratorEffectiveRate` and receive a `number` in engagement/sec. No downstream caller changes.

**The `max(1, count)` floor DOES NOT apply here.** It is scoped to manual-cooldown derivation only (per architect re-review). A count=0 generator produces 0 passive engagement — the unfloored multiply is critical for preserving the existing 7-generator balance.

---

## Coupling Analysis

### Driver ↔ Game Loop

- **Today:** `driver.click()` → `postClick(state, staticData)`. One click, one verb, hard-coded to `'selfies'`.
- **After:** `driver.click(verbId)` → `postClick(state, staticData, verbId)`. Per-verb dispatch.
- **What breaks if changed:** every caller of `driver.click()` — the 20+ UI/test sites that pass no args — breaks on signature. Mitigation: the shim (§Driver Shim Strategy). After E4, all call sites pass a verbId explicitly.
- **New action:** `driver.unlock(verbId)` wraps `unlockGenerator`.

### UI ↔ Driver ↔ Game Loop (GameScreen.tsx)

- **Today:** `GameScreen.tsx` L24 imports `CLICK_BASE_ENGAGEMENT`; L138 uses it to compute `perClick` for the click-preview display. `PostZone.tsx` calls `driver.click()`.
- **After:** `CLICK_BASE_ENGAGEMENT` import is removed. The per-click preview must be derived per verb:
  ```
  perClick(verbId) = def.base_event_yield × levelMultiplier(genState.level)
                   × algoMod × clout × kit
  ```
- **Landing in phases (see §Driver Shim Strategy):**
  - **E2 window** (shim alive): `GameScreen.tsx` drops the `CLICK_BASE_ENGAGEMENT` import and computes the preview using `chirps`' def (`STATIC_DATA.generators.chirps.base_event_yield`, etc.). `PostZone.tsx` unchanged — still calls `driver.click()` (shim routes to `'chirps'`).
  - **E4 window** (shim removed): `PostZone.tsx` is deleted. The Actions-column ladder component (per ux-designer spec) renders one per-verb row, each owning its own `perClick` derivation and calling `driver.click(verbId)` with its own verb.
- **What breaks if changed:** if the shim's verb default drifts from the preview's verb default (e.g., shim routes to chirps but preview derives from selfies), the displayed per-click number doesn't match what happens on click. The shim and the E2-window preview MUST both be keyed to `chirps` for consistency.

### Save ↔ Game State

- **Today:** `CURRENT_VERSION = 8`. `migrate()` chain runs V1→V8.
- **After:** `CURRENT_VERSION = 9`. New migration `migrateV8toV9` seeds the three data-model deltas (see §Migration Contract).
- **What breaks if changed:** if `migrateV8toV9` misses `generators.chirps`, every existing save throws at first tick when `tick()` or `computeGeneratorEffectiveRate` iterates `Object.keys(state.generators)` and encounters a union member with no state. If it misses `player.last_manual_click_at`, `postClick` throws on the first manual click (dereferencing `undefined.[verbId]`).

### Static Data ↔ Type Union

Adding `'chirps'` to the `GeneratorId` union means every `Record<GeneratorId, ...>` becomes a compile error until filled. Exhaustive list (engineer to confirm during E2):

| Location | Record | Required chirps entry |
|----------|--------|----------------------|
| `static-data/index.ts` | `GENERATOR_DEFS: Record<GeneratorId, GeneratorDef>` | Full def per proposal §14c |
| `static-data/index.ts` | `PLATFORM_DEFS[p].content_affinity: Record<GeneratorId, number>` — 3 platforms | Skroll/chirper 1.5, Instasham 1.0, Grindset 0.6 (per OQ4) |
| `static-data/index.ts` | `ALGORITHM_STATE_DEFS[s].state_modifiers: Record<GeneratorId, number>` — 5 states | Per proposal §14c chirps table |
| `static-data/index.ts` | `unlockThresholds.generators` | `chirps: 0`; also update `selfies: 0 → 100` |
| Any test fixture | `createGeneratorState('chirps'…)` usages, partial Records | Engineer sweeps |

The compile-error surface IS the safety net — TypeScript will name every missing cell.

### Game Loop ↔ Generator Module

- **Today:** `computeGeneratorEffectiveRate` reads `def.base_engagement_rate`. `generator/index.ts::generatorBuyCost` and `generatorUpgradeCost` do not read the split fields.
- **After:** `computeGeneratorEffectiveRate` reads `base_event_yield × base_event_rate`. Cost formulas are unchanged.
- **What breaks if changed:** any code still reading `def.base_engagement_rate` is a compile error (field deleted) — engineer sweeps exhaustively.

### Passive-Only Generators ↔ Manual Actions

There is **no** coupling between manual-clickable and passive-only generators at runtime. They share the same `GeneratorState` shape, the same `computeGeneratorEffectiveRate` formula, the same `buyGenerator` / `upgradeGenerator` actions. The only runtime difference is that `manual_clickable: false` generators never flow through `postClick` or `unlockGenerator`. This separation keeps the coupling surface thin.

---

## Driver Shim Strategy

The `driver.click() → driver.click(verbId)` signature break affects ~20+ call sites across `PostZone.tsx`, `useGame.ts`, driver tests, integration tests, and potentially screenshot/e2e fixtures. Refactoring all of them in one engineer task creates a large, red-main-risking diff.

**Landing plan (two windows):**

**E2 — engine refactor.** Engineer refactors `postClick` to `postClick(state, staticData, verbId)` + splits yield/rate in `GeneratorDef` + migrateV8toV9. The driver keeps a **temporary shim**:

```typescript
// driver/index.ts
click(verbId?: GeneratorId) {
  runAction('click', { verbId: verbId ?? 'chirps' }, () => {
    applyState(postClick(state, staticData, verbId ?? 'chirps', now()));
  });
},
```

All existing `driver.click()` call sites continue to work, routing to `'chirps'`. `chirps` is seeded as owned=true by migration and static-data, so the shim is always safe to fire.

**E4 — UI wiring.** Engineer removes `PostZone.tsx`, builds the per-verb Actions-column ladder component per ux-designer spec, and wires each row to call `driver.click(verbId)` with its own verb. At this point, **remove the shim**:

```typescript
// driver/index.ts — POST-E4
click(verbId: GeneratorId) {
  runAction('click', { verbId }, () => {
    applyState(postClick(state, staticData, verbId, now()));
  });
},
```

Make `verbId` required. The TypeScript compiler names every remaining `driver.click()` (no-arg) call site; engineer updates each.

**Shim removal is a hard requirement, not optional.** Leaving the shim in place silently couples the driver to "chirps" as a default. If a future task deletes chirps or changes it to `manual_clickable: false`, the shim fires `postClick` against an invalid verb. **The shim's removal point is E4; document it in the E4 task's done-when.**

---

## Migration Contract

### v8 → v9

`migrateV8toV9(data: SaveData): SaveData` — the new migration function, added to the chain after `migrateV7toV8`.

**Seeded fields (EVERY v8 save gets these):**

1. **`player.last_manual_click_at = {}`** — empty Record. Manual clicks made post-migration will populate keys lazily.
2. **`state.generators.chirps = createGeneratorState('chirps', true)`** — owned=true because chirps' `unlock_threshold = 0`. Level=1, count=0 by factory default.

**No static-data migration.** Static data is loaded fresh from `STATIC_DATA` at game-start and is not persisted in saves. The yield/rate field split on `GeneratorDef` does not touch the save payload.

**Field removals in save payload.** None. `base_engagement_rate` lives on `GeneratorDef` (static data), not on `GeneratorState` (persisted). No save payload field removals are required for the split.

**Invariants after migration:**
- `Object.keys(state.generators).length === 11` (7 existing base + 1 new chirps + 3 post-prestige). Engineer to verify against `ALL_GENERATOR_IDS` length.
- `state.generators.chirps.owned === true`.
- `state.player.last_manual_click_at` is an object (may be empty).
- No existing generator state is mutated — selfies, memes, hot_takes, tutorials, livestreams, podcasts, viral_stunts, ai_slop, deepfakes, algorithmic_prophecy all carry through unchanged.

**Migration test contract:**
- Test 1: v8 save with all 10 existing generators (not owned) migrates to v9 with `chirps` added and `last_manual_click_at={}`. Existing entries untouched.
- Test 2: v8 save with a live mid-game state (some generators owned, counts > 0, levels > 1) migrates without corrupting any existing field.
- Test 3: full migration chain v1 → v9 produces a v9 save that passes the v9 invariant checks above.

**Not migrated:** existing generator `owned` states. The semantic change for manual-clickable verbs (owned = "player paid Unlock cost") means a migrated player whose `selfies.owned === true` (auto-flipped pre-v9 because total_followers ≥ 0) is now understood as "has paid the Unlock cost." Post-migration, selfies stays owned for these players — this is by design, a grandfather clause. Fresh-start players get selfies' `unlock_threshold = 100` and must Unlock it through the ghost-slot purchase.

**This grandfather-clause is load-bearing.** If engineer finds it problematic (e.g., playtest feedback that existing players don't get the Unlock teaching moment), the alternative is to reset owned=false for all manual-clickable verbs during migration — but that wipes live progression and is a hard sell. Architect recommends the grandfather approach; reopens if D1 resolves in a way that forces the issue.

---

## Open Questions

0. ~~**Unlock threshold unit (followers vs. engagement) and Unlock cost source (reuse base_buy_cost vs. new field).**~~ **Deferred to task #115 (D1)** — game-designer. This spec ASSUMES the architect-leaned defaults: (a) thresholds stay follower-gated, keyed against `player.total_followers` (no code change to `checkGeneratorUnlocks`'s lookup); (b) Unlock cost reuses `GeneratorDef.base_buy_cost`, so `unlockGenerator`'s cost read is `staticData.generators[verbId].base_buy_cost`. If D1 resolves differently, see §Assumptions for the revision surface.

1. **Should `last_manual_click_at` reset on rebrand?** Architect recommendation: yes — reset to `{}`. Engineer to confirm and wire the reset through the prestige pathway. Owner: engineer (implementation call); flag to game-designer only if a design reason surfaces to preserve click-timestamps across rebrand.

2. **Does the passive tick loop need to react to `manual_clickable` at all?** Architect answer: no. The passive tick reads only `count`, `level`, `base_event_rate`, `base_event_yield`, and the usual modifiers. `manual_clickable` is a gate on click dispatch and a UI filter; the passive production pipeline is agnostic to it. Manual-clickable verbs with count≥1 produce passive engagement identically to passive-only generators. Owner: architect (resolved here).

---

## Assumptions

**A1 — Threshold unit is followers (load-bearing, D1-dependent).** `checkGeneratorUnlocks` continues to compare against `state.player.total_followers`. If D1 resolves to "engagement" (option b of task #115), `checkGeneratorUnlocks` needs a new gate source — likely a new `lifetime_engagement` field on `Player`, because `player.engagement` fluctuates with spends and cannot be a monotonic gate. This would be a meaningful rework: (a) new `Player` field, (b) migration to seed it, (c) `checkGeneratorUnlocks` signature change to accept the gate source, (d) `tick` and `offline` wiring. **If D1 resolves to engagement, this spec revises — do not start E3 until this assumption is confirmed or revised.**

**A2 — Unlock cost reuses `base_buy_cost` (load-bearing, D1-dependent).** `unlockGenerator` reads `staticData.generators[verbId].base_buy_cost` as the Unlock cost. No new `unlock_cost` field. The first Automate purchase (count: 0 → 1) also pays `base_buy_cost × 1.15^0 = base_buy_cost` — the same number. This keeps the three-state lifecycle legible ("Unlock buys the verb, Automate N buys the Nth parallel actor, prices scale naturally") without a data-model addition. If D1 resolves to a separate `unlock_cost` field, this spec revises: add `GeneratorDef.unlock_cost: number`, seed for all 5 ladder verbs in static data, read it in `unlockGenerator`.

**A3 — chirps gets `owned=true` grandfather-clause at migration.** All pre-v9 saves keep their currently-owned manual-clickable generators owned post-migration, on the semantic understanding "I paid the Unlock cost" (even though no such transaction happened). Fresh-start players post-v9 Unlock each verb through the ghost slot. This trade accepts a modest teaching-moment loss for existing players in exchange for preserving live progression.

**A4 — Platform routing semantics unchanged.** `postClick` produces flat engagement (per OQ17). `computeFollowerDistribution` in `platform/index.ts` continues to apply `content_affinity` as today, now reading the affinity cell for the clicked verb's generator id. Engineer to verify that the distribution step correctly handles manual-click engagement vs. passive-tick engagement — architect expects no change needed because distribution is keyed to the engagement's source generator, which is already tracked per-tick, but naming this as a checkpoint.

**A5 — `max_level` applies uniformly to manual-clickable verbs.** Upgrade's multi-level progression uses the same L=1..10 clamp and `levelMultiplier(level) = 2^(level²/5)` curve as passive generators. The "Upgrade scales yield" lifecycle step is the existing `upgradeGenerator` action, unchanged. Engineer to confirm the `base_upgrade_cost × levelMultiplier` scaling produces coherent price curves for the ladder verbs — balance concern, flag to game-designer if not.
