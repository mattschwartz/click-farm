# Creator Kit Architecture

> **Scope:** Defines the data model, interface contracts, effect types, and integration points for the per-run Creator Kit upgrade menu — five themed items (Camera, Laptop, Phone, Wardrobe, Mogging) purchased with Engagement and wiped on rebrand.

> **Not in scope:** Balance values (level counts, effect magnitudes, cost curves — owned by game-designer), UI/UX treatment of the kit panel (owned by ux-designer, tracked in `ux/creator-kit-panel.md`), scandal interaction.

> **Source:** `.frames/sdlc/proposals/accepted/creator-kit-upgrades.md` (accepted). The architect review at the bottom of that document resolved OQ#2 and gave architectural clearance on OQ#1. This spec formalizes that review.

---

## Data Model

### Player (additions)

One new field added to the `Player` entity defined in `core-systems.md`:

| Field | Type | Constraints | Where | Notes |
|-------|------|-------------|-------|-------|
| `creator_kit` | `map<kit_item_id, int>` | values ≥ 0, ≤ item's `max_level` | both | Per-run kit purchases. **Wiped on rebrand.** |

**Ownership:** Same as the rest of `Player`. Mutated by the game loop through purchase actions dispatched from the UI.

**Why a map, not a record of structs:** The kit item's static definition (max_level, values, effect) lives in static data. The player's state is only "what level do I own." A flat `id → level` map mirrors `clout_upgrades` exactly and keeps the save payload small.

### KitItemDef (new, static data)

Parallel to `CloutUpgradeDef`. Defined in the static data module.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `string (enum)` | unique | One of `camera`, `laptop`, `phone`, `wardrobe`, `mogging` |
| `max_level` | `int` | ≥ 1, from static data | Maximum purchasable level |
| `cost` | `int[]` | length = `max_level`, ascending | Engagement cost for each level (indexed by `level - 1`, the cost to advance from `level-1 → level`) |
| `effect` | `KitEffect` | | Tagged union, see below |

**Why a separate type (`KitItemDef`) rather than reusing `CloutUpgradeDef`:** Currency differs (Engagement vs Clout), reset semantics differ (per-run vs permanent), and effect types differ (two new discriminators). A separate type makes the distinction explicit at the type system level and prevents accidental cross-wiring. The structural similarity is a feature — the engineer can copy patterns — but the types stay distinct.

### StaticData (additions)

One new field on the `StaticData` interface from `core-systems.md`:

```typescript
interface StaticData {
  // ...existing fields...
  creatorKitItems: Record<KitItemId, KitItemDef>;
}
```

### The Five Items (static data population)

All five items are defined at launch. Balance values (exact `max_level`, `cost[]`, effect-value arrays) are owned by game-designer and populated in a separate balance-pass task. Engineer implements with placeholder values.

| Item ID | Effect Type | Clout Mirror | Axis |
|---------|-------------|--------------|------|
| `camera` | `engagement_multiplier` | Engagement Boost | Engagement rate (multiplicative) |
| `laptop` | `algorithm_lookahead` | Algorithm Insight | Algorithm lookahead (additive) |
| `phone` | `platform_headstart_sequential` | Platform Head-Start | Platform head-start (sequential, non-overlapping) |
| `wardrobe` | `follower_conversion_multiplier` | — | Follower conversion (multiplicative) |
| `mogging` | `viral_burst_amplifier` | — | Viral burst magnitude (multiplicative) |

---

## Interface Contracts

### KitEffect (new tagged union)

```typescript
type KitEffect =
  | { type: "engagement_multiplier"; values: number[] }      // Camera — reused
  | { type: "algorithm_lookahead"; lookaheads: number[] }    // Laptop — reused (additive stacking)
  | { type: "platform_headstart_sequential"; }               // Phone — sequential semantics
  | { type: "follower_conversion_multiplier"; values: number[] }  // Wardrobe — new
  | { type: "viral_burst_amplifier"; values: number[] };     // Mogging — new
```

Each `values` / `lookaheads` array has length `max_level` and is indexed by `level - 1` to retrieve the **cumulative** effect at that level (same convention as `CloutUpgradeDef.effect.values`).

**Effect type reuse:**

- `engagement_multiplier` (Camera): identical shape to the Clout `engagement_multiplier`. The kit's multiplier is applied at the **same point** in the tick pipeline as the Clout version — both fold into the same multiplicative chain (see Stacking Order below).
- `algorithm_lookahead` (Laptop): shape identical to Clout's `algorithm_insight`. **Stacks additively** per proposal: total lookahead = `clout_lookahead + kit_lookahead`. Applied when populating `AlgorithmState.upcoming_states[]`.

**New effect types:**

- `platform_headstart_sequential` (Phone): At run start, iterate unlocked platforms by their static declaration order; for each Phone level owned, unlock the next still-locked platform that is not already covered by a Clout `platform_headstart`. No static `platform_id` field — the target is computed dynamically.
- `follower_conversion_multiplier` (Wardrobe): Applied at the engagement→follower conversion step in the tick (`core-systems.md` line 388 region). See Integration Points.
- `viral_burst_amplifier` (Mogging): Multiplies `boost_factor` at viral-burst trigger time. See Integration Points.

### Purchase

Kit items are purchased through the same action-dispatch pattern as other UI → game-loop actions. The purchase handler:

1. Validates `player.creator_kit[item_id] < KitItemDef.max_level`
2. Validates `player.engagement >= KitItemDef.cost[current_level]`
3. Decrements `player.engagement` by the cost
4. Increments `player.creator_kit[item_id]` by 1
5. If the newly-purchased effect has immediate state implications (Phone on first purchase → unlock a platform mid-run), applies them

**Mid-run application of Phone:** When `phone` is purchased and the new level would have head-started an additional platform, the handler performs the sequential head-start pass immediately (same logic that runs on rebrand-apply for Clout `platform_headstart`). This mirrors the existing pattern where Clout `generator_unlock` re-applies on first purchase mid-run (`core-systems.md` §applyRebrand post-reset Clout re-application order).

---

## Stacking Order (Evaluation Convention)

The game has multiple effect families that can stack on the same axis (engagement rate, follower conversion, viral burst, algorithm lookahead). To keep stacking deterministic and extensible, this spec defines the evaluation convention:

**Multiplicative stacking** (Camera × Clout Engagement Boost, Wardrobe × base conversion, Mogging × base burst factor):

Effects multiply in a **defined chain order** at the single point in the pipeline where the target value is computed:

```
final_engagement_rate = base_rate
                      × algorithm_modifier
                      × platform_affinity
                      × clout_engagement_multiplier     // cumulative across clout levels
                      × kit_engagement_multiplier        // cumulative across kit camera levels
```

Multiplicative effects are **order-independent** (commutative), so the current set of effects produces the same result in any order. However, the convention matters for future additive or clamped effects. The convention is:

1. Base value (from generator / platform / event definition)
2. Algorithm / situational modifiers
3. Clout effects (permanent)
4. Kit effects (per-run)
5. Event effects (Brand Deal, Viral Burst, etc.)
6. **Audience-Mood retention** (platform-scoped, applied to per-platform follower gain AFTER content-affinity weighting and kit follower-conversion, BEFORE any viral-burst amplifier that targets follower gain — see `architecture/audience-mood.md` §Integration Into Follower Distribution)
7. Clamps (if defined — e.g., Mogging burst cap if ever introduced)

**Additive stacking** (Laptop + Algorithm Insight):

Sum values directly: `total_lookahead = clout_lookahead_value + kit_lookahead_value`. No ordering concern.

**Sequential stacking** (Phone platform head-start):

Clout head-starts are applied first (explicit `platform_id`s). Phone head-starts are then applied, skipping platforms already unlocked by Clout, in platform static-declaration order. Phone owns the first `phone_level`-many remaining locked platforms.

> **Cross-reference:** This convention supersedes any ad-hoc ordering in the live codebase. Future effect types MUST declare where they fall in the chain above. `core-systems.md` should link to this section.

---

## Integration Points

### 1. Economy (Engagement spend)

Kit purchases spend Engagement. No new code paths — the purchase dispatcher decrements `player.engagement` identically to any other Engagement sink. **No new coupling.**

### 2. Tick — Camera (`engagement_multiplier`)

Applied in the effective-rate formula in the tick (`core-systems.md` §Generator, effective rate formula and `core-systems.md` line 388 region). Folds into the existing multiplicative chain after Clout effects, before event effects (per Stacking Order §3→§4).

### 3. Tick — Wardrobe (`follower_conversion_multiplier`)

Applied at the engagement→follower conversion step (`core-systems.md` line 388). The formula becomes:

```
followers_per_platform_per_tick = Σ (
    generator_effective_rate
    × generator.follower_conversion_rate
    × platform.content_affinity[generator_id]
  ) / total_affinity_weight
  × kit_follower_conversion_multiplier
```

The kit multiplier wraps the entire per-platform sum. **One new multiplication, one point in the pipeline.**

### 4. Laptop (`algorithm_lookahead`)

Applied when the game loop populates `AlgorithmState.upcoming_states[]`. The length of that array is `clout_lookahead + kit_lookahead`, clamped to the total number of upcoming states the schedule-walker can produce. Consumed by UI only — not persisted.

### 5. Phone (`platform_headstart_sequential`)

Two application paths:
- **Mid-run (purchase handler):** As described in Purchase above.
- **Rebrand-apply:** Phone state is wiped on rebrand (kit is cleared). After rebrand, Clout `platform_headstart` runs as before. Phone does not run during rebrand — only during the next run as the player re-buys it.

There is **no change to `applyRebrand`** for Phone — because by the time `applyRebrand` runs, `creator_kit` has been wiped to `{}`, and Phone has no work to do. Phone's integration is entirely in the purchase handler.

### 6. Viral Burst — Mogging (`viral_burst_amplifier`)

Per `viral-burst-event-signal.md` §3, the magnitude computation reads a random `boost_factor` in `[magnitudeBoostMin, magnitudeBoostMax]`. Mogging multiplies the rolled `boost_factor` before magnitude is computed:

```
boost_factor_raw = random(magnitudeBoostMin, magnitudeBoostMax)
kit_amplifier    = kit_viral_burst_amplifier_value  // from creator_kit.mogging level, 1.0 if level 0
boost_factor     = boost_factor_raw * kit_amplifier
magnitude        = total_engagement_rate_per_ms * duration_ms * (boost_factor - 1)
bonus_rate_per_ms = total_engagement_rate_per_ms * (boost_factor - 1)
```

**One new read point** in the viral burst trigger logic. The amplified `boost_factor` replaces the raw roll throughout the existing formula — no other changes to the viral burst subsystem.

### 7. Rebrand — wipe `creator_kit`

`applyRebrand` (`core-systems.md` §Rebrand) gains one line in its reset pass:

```typescript
player.creator_kit = {};
```

`creator_kit` MUST NOT appear in the preservation list. The preservation list currently retains `clout`, `clout_upgrades`, `lifetime_followers`, `rebrand_count`, and seed derivation inputs. Creator Kit is per-run; it always resets.

---

## Coupling Analysis

| Touchpoint | Integration | New coupling? |
|---|---|---|
| Economy (engagement spend) | Purchase handler — same pattern as Clout purchase | No |
| Tick (Camera) | One multiplier in existing multiplicative chain | No |
| Tick (Wardrobe) | One new multiplication wrapping the conversion sum | One new read; no data-flow change |
| Algorithm lookahead (Laptop) | Additive sum with Clout value | No |
| Platform system (Phone) | Same semantics as Clout `platform_headstart`, computed target | One new application path (mid-run purchase) |
| Viral burst (Mogging) | One new multiplication on `boost_factor` | One new read; no data-flow change |
| Rebrand (wipe) | One line in reset pass | No |

**Tightest new coupling:** Mogging → viral burst trigger. The viral burst system now reads from `player.creator_kit`. This is a single, clearly-named read; the coupling is explicit and contained. No shared mutation.

**Invariant preserved:** Each kit item has exactly **one** effect. No item is multi-modal. This matches the Clout item invariant and keeps the effect-type contract single-dispatch.

---

## Save Schema Migration

**Version bump required.** The save format gains `player.creator_kit`.

**Migration (forward-only, trivial):**

```typescript
// vN → vN+1
function migrate_creator_kit(data: SaveData): SaveData {
  if (!data.state.player.creator_kit) {
    data.state.player.creator_kit = {};
  }
  return data;
}
```

Existing saves default to an empty kit. No data loss, no field removal.

---

## Open Questions

1. **OQ#1 — Phone ceiling behavior.** When the player has Clout-purchased head-starts for every platform, should Phone be **Inert** (purchasable, no-op) or **Hidden** (gated out of the menu)? Architect review recommended avoiding Fallback-Benefit to preserve the single-effect invariant; both Inert and Hidden are architecturally trivial. **Owner: game-designer** (feel call). *Blocks the Phone integration build task.*

2. **OQ#3 — Mogging cap.** Is a hard cap needed on total `boost_factor` after Mogging amplification, to bound compound peaks (Mogging × Brand Deal × Viral Burst × Engagement Boost)? Architecturally trivial to add (clamp step §6 of the stacking chain). **Owner: game-designer** (balance pass).

3. **OQ#4 — Cost curves.** `cost[]` values per item. **Owner: game-designer** (balance pass).

4. **OQ#5 — Level counts per item.** `max_level` per item. **Owner: game-designer** (balance pass).

Balance OQs (#3–#5) do not block filing engineer build tasks — placeholder values are acceptable and the static data table is the single point of change.

---

## Assumptions

1. **Kit purchases are player-driven, synchronous, and cannot fail after validation.** No race conditions because the game is single-threaded, client-authoritative, and purchases dispatch into the same tick pipeline as all other state mutations. **Load-bearing: if purchase validation moves off-client, this assumption breaks.**

2. **Platform static-declaration order is stable for Phone's sequential head-start semantics.** Reordering platforms in static data would change which platform Phone head-starts, across save files. **Load-bearing: any reorder of `StaticData.platforms` constitutes a balance-breaking change and requires a save migration if the product wants to preserve player intent.**

3. **`max_level` fits in a small positive integer across all kit items.** No item will grow to hundreds of levels within the lifetime of the save format. Safe assumption — balance pass targets 3–5 levels per item.
