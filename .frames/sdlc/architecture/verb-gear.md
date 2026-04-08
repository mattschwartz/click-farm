# Verb Gear Architecture

> **Scope:** Defines the data model, interface contracts, and integration points for the per-verb gear upgrade system — five equipment items (one per manual verb) purchased with Engagement and wiped on rebrand. Each gear level provides an order-of-magnitude yield multiplier to its verb.

> **Not in scope:** Balance values (costs, multiplier magnitudes — owned by game-designer), UI placement and visual treatment of gear purchases (owned by ux-designer), old Creator Kit removal (covered in the rip-out inventory of the source proposal §6).

> **Source:** `.frames/sdlc/proposals/accepted/20260407-creator-kit-verb-gear.md`. This spec supersedes `architecture/creator-kit.md`, which is dead.

---

## Data Model

### VerbGearId (new type)

```typescript
type VerbGearId = 'chirps' | 'selfies' | 'livestreams' | 'podcasts' | 'viral_stunts';
```

A narrow union of the 5 manual-clickable generator IDs. Not an alias for `GeneratorId` — the type system prevents passing passive-only or post-prestige generator IDs as gear IDs.

Each `VerbGearId` value is also a valid `GeneratorId`. The 1:1 mapping is implicit in the key — no separate `generator_id` field on the definition.

### VerbGearDef (new, static data)

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `VerbGearId` | unique, matches Record key | Which verb this gear upgrades |
| `name` | `string` | | Display name ("Mechanical Keyboard", "Phone", etc.) |
| `max_level` | `number` | >= 1 | Maximum purchasable level (3 at launch) |
| `cost` | `number[]` | length = `max_level`, ascending | Engagement cost per level, indexed by `level - 1` |
| `multipliers` | `number[]` | length = `max_level`, ascending | Cumulative multiplier at each level, indexed by `level - 1` |

**Why a separate type from `CloutUpgradeDef`:** Currency differs (Engagement vs Clout), reset semantics differ (per-run vs permanent), effect semantics differ (single per-verb multiplier vs tagged union of effect types). Structural similarity is a feature for implementation patterns, but the types stay distinct.

### Player (additions)

One new field, replacing `creator_kit`:

| Field | Type | Constraints | Where | Notes |
|-------|------|-------------|-------|-------|
| `verb_gear` | `Record<VerbGearId, number>` | values >= 0, <= item's `max_level` | both | Per-run gear purchases. **Wiped on rebrand.** |

**Why a map, not a record of structs:** Same convention as `clout_upgrades` and the old `creator_kit`. The static definition holds everything except the owned level. A flat `id -> level` map keeps the save payload small.

### StaticData (additions)

One new field, replacing `creatorKitItems`:

```typescript
interface StaticData {
  // ...existing fields...
  verbGear: Record<VerbGearId, VerbGearDef>;
}
```

### The Five Items (static data population)

| VerbGearId | Name | Verb it upgrades |
|---|---|---|
| `chirps` | Mechanical Keyboard | chirps |
| `selfies` | Phone | selfies |
| `livestreams` | Camera | livestreams |
| `podcasts` | Microphone | podcasts |
| `viral_stunts` | Shameless | viral_stunts |

Balance values (`max_level`, `cost[]`, `multipliers[]`) are owned by game-designer. Starting values are in the source proposal §3.

---

## Interface Contracts

### verbGearMultiplier

```typescript
function verbGearMultiplier(
  generatorId: GeneratorId,
  verbGear: Record<VerbGearId, number>,
  staticData: StaticData,
): number
```

Returns the cumulative gear multiplier for a given generator. O(1) lookup — casts `generatorId` to `VerbGearId` and reads the Record directly. Returns 1.0 when:
- The generator has no gear item (passive-only, post-prestige)
- The gear level is 0 (unpurchased)

This is the **only function** that reads gear state for the tick pipeline. All integration points call through here.

### purchaseVerbGear

```typescript
function purchaseVerbGear(
  state: GameState,
  gearId: VerbGearId,
  staticData: StaticData,
): GameState
```

Spend Engagement to increment the named gear item's level by 1. Follows the same throw-on-invariant-violation pattern as `purchaseCloutUpgrade` and the old `purchaseKitItem`:

1. Validate `generators[gearId].autoclicker_count >= 12` — gear purchases are gated behind a capped HIRE track (proposal §10). This is a game rule, not a UI concern — enforced at the model layer so direct calls cannot bypass it.
2. Validate `verb_gear[gearId] < VerbGearDef.max_level`
3. Validate `player.engagement >= VerbGearDef.cost[current_level]`
4. Decrement `player.engagement` by cost
5. Increment `verb_gear[gearId]` by 1

No post-purchase hooks. Unlike the old Phone item, gear purchases have no side effects beyond the level increment and engagement spend.

### verbGearCost

```typescript
function verbGearCost(
  currentLevel: number,
  gearId: VerbGearId,
  staticData: StaticData,
): number | null
```

Returns the Engagement cost for the next level, or `null` if at max level. Mirrors `kitItemCost` and `cloutUpgradeCost`.

### canPurchaseVerbGear

```typescript
function canPurchaseVerbGear(
  state: GameState,
  gearId: VerbGearId,
  staticData: StaticData,
): boolean
```

Non-throwing affordability gate for UI consumers.

---

## Stacking Order

The gear multiplier occupies **position §4** in the multiplicative stacking chain, the same position the old kit engagement multiplier held. The convention (originally defined in `architecture/creator-kit.md`, carried forward here):

1. Base value (from generator definition)
2. Algorithm / situational modifiers *(currently empty — algorithm weather removed)*
3. Clout effects (permanent) — `cloutBonus()`
4. **Verb gear (per-run)** — `verbGearMultiplier()`
5. Event effects (viral burst, etc.)
6. Audience-Mood retention (platform-scoped, post follower-distribution)
7. Clamps (if defined)

The gear multiplier is **per-generator** (scoped to the specific verb), unlike the old kit which was a global engagement multiplier. The position in the chain is identical; only the lookup changes.

The stacking order comment in `audience-mood/index.ts` (line ~11) must be updated to reference `verbGearMultiplier` instead of `kitEngagementBonus`.

---

## Integration Points

### 1. Tick — verbYieldPerTap (manual taps)

`game-loop/index.ts` `verbYieldPerTap()` (L520-529). Replace `kitEngagementBonus(state.player.creator_kit, staticData)` with `verbGearMultiplier(generator.id, state.player.verb_gear, staticData)`.

The formula becomes:
```
base_event_yield × (1 + count)^count_exponent × (1 + autoclicker_count) × clout × gear_multiplier
```

### 2. Tick — computeGeneratorEffectiveRate (passive/autoclicker)

`game-loop/index.ts` `computeGeneratorEffectiveRate()` (L121-141). Same substitution as above.

The formula becomes:
```
autoclicker_count × level × base_event_rate × base_event_yield
  × (1 + count)^count_exponent × clout × gear_multiplier
```

### 3. Tick — computeSnapshot

`game-loop/index.ts` `computeSnapshot()` (L444-496). The old code reads `kitFollowerConversionBonus` for the snapshot. This call is removed entirely — the new gear system has no follower conversion effect. The snapshot formula loses the `kitFollowerMult` factor.

### 4. Offline — computeOfflineEarnings

`offline/index.ts` (L31, L119-121, L134). Same as §3 — remove `kitFollowerConversionBonus` import and usage. No replacement needed; gear multiplies engagement yield, not follower conversion.

### 5. Viral Burst — evaluateViralTrigger

`game-loop/index.ts` `evaluateViralTrigger()` (L256-259). The old `kitViralBurstAmplifier` call is removed entirely. The new gear system has no viral burst effect. The burst magnitude formula reverts to using the raw `boostFactor` without amplification.

### 6. Economy (Engagement spend)

Gear purchases spend Engagement. Same dispatch pattern as all other purchase actions. No new code paths — follows the existing `purchaseCloutUpgrade` / old `purchaseKitItem` pattern.

### 7. Rebrand — wipe verb_gear

`prestige/index.ts` `applyRebrand()` (L167-178). Replace:
```typescript
creator_kit: {} as Record<KitItemId, number>,
```
with:
```typescript
verb_gear: {} as Record<VerbGearId, number>,
```

`verb_gear` MUST NOT appear in the preservation list. Same per-run lifecycle as the old `creator_kit`.

### 8. Initial state — createPlayer

`model/index.ts` `createPlayer()` (L43–73). Replace `creator_kit: {} as Record<KitItemId, number>` with `verb_gear: {} as Record<VerbGearId, number>`. Fresh players start with no gear.

### 9. Driver — buyVerbGear

`driver/index.ts`. Replace `buyKitItem(itemId: KitItemId)` with `buyVerbGear(gearId: VerbGearId)`. Same error-handling pattern via `runAction`.

### 10. useGame hook

`ui/useGame.ts`. Replace `buyKitItem` binding with `buyVerbGear` binding. Same pattern.

---

## Coupling Analysis

| Touchpoint | Integration | New coupling? |
|---|---|---|
| Economy (engagement spend) | Purchase handler — same pattern as Clout purchase | No |
| Tick (verbYieldPerTap) | One multiplier in existing multiplicative chain | No (replaces old kit read) |
| Tick (computeGeneratorEffectiveRate) | Same substitution | No (replaces old kit read) |
| Tick (computeSnapshot) | Old kitFollowerConversionBonus removed, no replacement | Coupling reduced |
| Offline (computeOfflineEarnings) | Old kitFollowerConversionBonus removed, no replacement | Coupling reduced |
| Viral burst (evaluateViralTrigger) | Old kitViralBurstAmplifier removed, no replacement | Coupling reduced |
| Rebrand (wipe) | One field in reset pass | No (replaces old kit wipe) |
| Driver / useGame | One action binding | No (replaces old kit binding) |

**Net coupling change:** Reduced. The old Creator Kit had 4 distinct effect axes touching 6 integration points across 4 modules. The new system has 1 effect type touching 2 integration points (verbYieldPerTap, computeGeneratorEffectiveRate) in 1 module (game-loop). Three old integration points (follower conversion, viral burst amplifier, snapshot) are removed with no replacement.

**Tightest coupling:** `verbGearMultiplier` is called in the tick hot path. This is a single, clearly-named read from `player.verb_gear` + `staticData.verbGear`. No shared mutation. Same coupling profile as `cloutBonus`.

---

## Save Schema Migration

**Version bump required.** The save format gains `player.verb_gear` and loses `player.creator_kit`.

**Migration (forward-only):**

```typescript
// vN -> vN+1
function migrateVerbGear(data: SaveData): SaveData {
  const player = data.state.player as any;
  // Strip old creator_kit (may still exist from migrateV4toV5 chain)
  delete player.creator_kit;
  // Add new verb_gear, defaulting to empty (no gear owned)
  if (!player.verb_gear) {
    player.verb_gear = {};
  }
  return { ...data, version: data.version + 1 };
}
```

The old `migrateV4toV5` (introduces `creator_kit`) and `migrateV9toV10` (strips `laptop`) remain in the chain for forward-compatibility with ancient saves. They produce a `creator_kit` field that this migration subsequently removes.

---

## Open Questions

1. **OQ#1 — Module placement.** Should the verb gear module live at `client/src/verb-gear/` (new module, parallel to `creator-kit/`) or be folded into an existing module? Recommendation: new module at `client/src/verb-gear/` — it's a clean boundary, the old `creator-kit/` is being deleted, and the purchase + multiplier logic is self-contained. **Owner: architect. Decision: `client/src/verb-gear/`.** The module exports `verbGearMultiplier`, `purchaseVerbGear`, `verbGearCost`, and `canPurchaseVerbGear`.

---

## Assumptions

1. **Gear purchases are player-driven, synchronous, and cannot fail after validation.** Same assumption as the old Creator Kit. **Load-bearing: if purchase validation moves off-client, this assumption breaks.**

2. **`VerbGearId` tracks `GeneratorId` for manual verbs.** If a new manual verb is added to `GeneratorId`, `VerbGearId` must be updated to include it (and a corresponding gear item added to static data). This is a conscious coupling — the alternative (deriving VerbGearId from GeneratorDef.manual_clickable at the type level) is not expressible in TypeScript's type system without codegen.

3. **`max_level` fits in a small positive integer.** No gear item will grow to hundreds of levels. Launch target is 3 levels per item.

4. **Gear has exactly one effect: a yield multiplier.** No gear item is multi-modal. This is a simplification over the old Creator Kit (which had 4 effect types) and is load-bearing for the single-function integration model. If gear items ever need different effect types, this architecture needs a redesign.
