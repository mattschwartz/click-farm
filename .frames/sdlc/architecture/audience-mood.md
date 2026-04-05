# Audience Mood Architecture

> **Scope:** Defines the data model, pressure accumulators, update cadences, recovery formulas, save-schema migration, and tick-integration contract for the Audience Mood retention system that replaces Scandals.

> **Not in scope:** Visual treatment of the mood strip, copy pools, motion choreography (see `.frames/sdlc/ux/audience-mood.md`), specific tuning values (retention floor, degradation rates, recovery pace — these are tuning knobs surfaced to game-designer at build time).

> **Supersedes:** `.frames/sdlc/architecture/scandal-system.md` (marked SUPERSEDED; retained as historical record).

> **Source proposal:** `.frames/sdlc/proposals/accepted/audience-mood-retention.md`.

---

## Framing

The scandal system declared itself additive — "bolts onto the core architecture without structural changes." Audience Mood is **integrated**, not additive. The retention multiplier enters the core follower-distribution formula at exactly one point (`core-systems.md` line 388):

```
followers_per_platform_per_tick = (existing formula) × platform.retention
```

One multiplier at one known integration point. The "growth is monotonically non-decreasing from mood" guarantee falls out automatically because `retention ∈ [retention_floor, 1.0]` scales gains and never touches `platform.followers` directly. Follower count never moves backwards from mood.

The additive-system framing from `scandal-system.md` is explicitly retired.

---

## Data Model

### PlatformState — field additions

Adds four fields to the existing `PlatformState` (`client/src/types.ts`):

| Field | Type | Constraints | Where | Notes |
|-------|------|-------------|-------|-------|
| `retention` | `float` | `[retention_floor, 1.0]` | both | Derived from the three pressures below. Applied to follower distribution. Default `1.0`. |
| `content_fatigue` | `map<GeneratorId, float>` | each value in `[0, 1]` | both | Per-(platform, generator) fatigue. Must be per-generator so flavor text can name the specific content type. A single scalar would lose that legibility. |
| `neglect` | `float` | `[0, 1]` | both | Time-since-last-post accumulator for this platform. |
| `algorithm_misalignment` | `float` | `[0, 1]` | both | Accumulates when player posts content misaligned with the current Algorithm state on this platform. |

**`retention_floor`:** tuning constant, targeted `[0.3, 0.5]`. Final value is a game-designer decision at build time. Exposed as a single static-data constant so it can be changed without touching code logic.

**Derivation:** `retention` is a **derived field**, recomputed from the three pressures on every update. It is persisted for save-load convenience (so the UI has a value to render immediately on load without waiting for the first recomputation), but the pressures are the source of truth. On every save load, `retention` MUST be recomputed from the pressures before the first tick runs — this prevents stale retention values from drifting out of sync with the accumulators.

**Why no `last_post_time` field:** Neglect could be tracked as "seconds since last post on this platform" and derived, but storing the accumulator directly is simpler, symmetric with the other two pressures, and avoids a wall-clock dependency inside the tick loop.

### Static data — retention constants

A new static-data group `audience_mood` with these tuning knobs:

| Key | Type | Default (placeholder) | Purpose |
|-----|------|----------------------|---------|
| `retention_floor` | `float` | `0.4` | Lower bound on retention multiplier |
| `degradation_threshold` | `float` | `0.95` | Retention level below which the mood strip appears (per ux review OQ#1) |
| `content_fatigue_per_post_same_gen` | `float` | `0.08` | Accumulation on same-generator post to same platform |
| `content_fatigue_decay_per_post_other_gen` | `float` | `0.15` | Recovery on any other-generator post to this platform |
| `neglect_per_tick` | `float` | TBD | Accumulation per tick of no posts on this platform (tick-driven) |
| `neglect_reset_on_post` | `float` | `1.0` | Fraction of neglect removed on any post to this platform (1.0 = full reset) |
| `misalignment_per_off_trend_post` | `float` | `0.12` | Accumulation on a post whose generator is not favored by current algorithm state |
| `misalignment_decay_per_aligned_post` | `float` | `0.20` | Recovery on an aligned post |
| `composition_priority` | `[PressureId, PressureId, PressureId]` | `["content_fatigue", "algorithm_misalignment", "neglect"]` | Tie-breaker for dominant-display when two pressures produce equal magnitude |

All numbers above are **architectural placeholders**. The engineer implements against these names; game-designer tunes values at build time.

---

## Pressure Update Cadences

Same event-driven vs tick-driven split the old scandal system used. This is intentional pattern reuse — it was the right shape in scandal, it remains the right shape here.

### Event-driven (on post action)

Triggered by the existing post event in the game loop.

**Content Fatigue:**
- On a post from generator `G` to platform `P`: `content_fatigue[P][G] += content_fatigue_per_post_same_gen`, clamped to `[0, 1]`.
- For every *other* generator `G' ≠ G` on platform `P`: `content_fatigue[P][G'] -= content_fatigue_decay_per_post_other_gen`, clamped to `[0, 1]`.
- This couples accumulation and decay to the same event — posting one type fatigues itself and recovers the others simultaneously.

**Algorithm Misalignment:**
- On a post from generator `G` to platform `P`, check whether `G` is favored by the current algorithm state (`algorithm_state.state_modifiers[G] >= 1.0` is the proposed threshold — engineer to confirm with algorithm module).
- If not favored: `algorithm_misalignment[P] += misalignment_per_off_trend_post`, clamped `[0, 1]`.
- If favored: `algorithm_misalignment[P] -= misalignment_decay_per_aligned_post`, clamped `[0, 1]`.

**Neglect (event-driven reset):**
- On any post to platform `P`: `neglect[P] = max(0, neglect[P] - neglect_reset_on_post)`. With default `1.0`, every post to the platform fully resets its neglect.

### Tick-driven

**Neglect (tick-driven accumulation):**
- On each tick, for every unlocked platform `P`: `neglect[P] += neglect_per_tick`, clamped `[0, 1]`.
- Neglect freezes offline per the "no negative events offline" rule — identical freeze semantics to the old Platform Neglect accumulator. Offline calculator MUST NOT advance neglect.

### Retention recomputation

After any pressure field is mutated (event-driven OR tick-driven path), `platform.retention` is recomputed from the current pressure values for that platform. See **Composition Rule** below.

---

## Composition Rule (OQ#3: dominant-display)

Game-designer decision, architect-supported: **multiplicative composition under the hood, dominant-pressure display on the surface.**

### Magnitude computation (model layer)

For each platform:

```
fatigue_magnitude = max(content_fatigue[P][G]) for all G  // worst generator on this platform
neglect_magnitude = neglect[P]
misalignment_magnitude = algorithm_misalignment[P]

retention_raw = 
    (1 - fatigue_magnitude * fatigue_weight) *
    (1 - neglect_magnitude * neglect_weight) *
    (1 - misalignment_magnitude * misalignment_weight)

retention = clamp(retention_raw, retention_floor, 1.0)
```

Each pressure's `*_weight` tuning knob controls how much a fully-saturated pressure (value `1.0`) drags retention. If all three weights are `0.5`, a single saturated pressure halves its contribution; all three saturated at weight `0.5` would give `0.125` pre-clamp → clamped to `retention_floor`.

### Dominant pressure (UI label layer)

The UI needs to know which pressure is "winning" so the strip can show one flavor text, not three. The dominant pressure is the one with the largest *individual drag*:

```
drag_fatigue = fatigue_magnitude * fatigue_weight
drag_neglect = neglect_magnitude * neglect_weight
drag_misalignment = misalignment_magnitude * misalignment_weight

dominant = argmax(drag_*, tie_breaker = composition_priority)
```

**Tie-breaking:** when two drags are equal, the deterministic fixed priority from `composition_priority` wins. Default: `Content Fatigue > Algorithm Misalignment > Neglect` (rationale: content fatigue is the most specific signal, neglect is the most passive).

This priority is a **display ordering choice**, not a mechanics choice. All three pressures remain mechanically active regardless of which is shown. Confirm with game-designer at build time whether this ordering matches design intent — easily reversible via one config line.

### Contract for the UI

The model layer exposes, per platform:
- `retention: float` — the multiplier
- `dominant_pressure: PressureId | null` — `null` when retention >= `degradation_threshold` (strip is hidden anyway)
- `dominant_generator: GeneratorId | null` — non-null only when `dominant_pressure === "content_fatigue"` (flavor text needs to name the specific content type)

The UI renders the strip only when `retention < degradation_threshold`. It reads `dominant_pressure` + `dominant_generator` to select flavor-text copy, and `retention` as the magnitude number (`×0.7` etc).

---

## Integration Into Follower Distribution

The single integration point. `core-systems.md` §"Engagement-to-Follower Conversion" defines:

```
followers_per_platform_per_tick = Σ (generator_effective_rate × generator.follower_conversion_rate × platform.content_affinity[generator_id]) / total_affinity_weight
```

Audience Mood multiplies the result per platform:

```
followers_per_platform_per_tick_moody =
    followers_per_platform_per_tick × platform.retention
```

Applied in `computeFollowerDistribution` (or immediately after its call site, depending on engineer's preferred seam — the arithmetic is the same). One scalar multiply per platform per tick.

**Stacking order:** per `creator-kit.md` §Stacking Order, this belongs in the platform-scoped multipliers chain. Retention applies **after** content-affinity weighting and **before** any viral-burst multipliers — it represents the audience's sustained willingness to follow, which is an attribute of the platform-audience relationship, not of any single post or event. Engineer to register it in the stacking-order declaration per that document's convention.

**Offline calculation:** the offline calculator currently reads `last_close_state` production rates and advances them over elapsed time. Audience Mood does NOT degrade offline (neglect is frozen), so the retention value at `last_close_time` remains valid throughout the offline window. The calculator applies `platform.retention` as a constant scalar over the offline follower accrual. No new offline-calculation complexity.

---

## Save-Schema Migration

Forward-only migration — old builds can't load new saves. Acceptable given project scope (solo-dev, pre-launch, no production save-base to protect).

### Version numbering

Task #100 (scandal removal) bumps save schema to a new version (its AC names V6, but V6 is already consumed by an engagement/level-clamp migration — the engineer picking up #100 will need to bump to **V7** instead). Audience Mood's model-layer task then adds **V7→V8**:

1. Initialize `retention = 1.0` on every platform in state
2. Initialize `content_fatigue = {}` (empty map — defaults to `0` per generator when read) on every platform
3. Initialize `neglect = 0` on every platform
4. Initialize `algorithm_misalignment = 0` on every platform
5. Bump `version` to `8`

The migration assumes #100's scandal-field removal has already happened in V7 — it does NOT need to touch scandal fields. If for any reason the two tasks ship together and share a single migration bump, the engineer SHOULD collapse them into one migration function and document the combination in a comment block.

### Load-path recomputation

On load, after migration: for every platform, recompute `retention` from the pressure fields via the composition rule. This protects against drift if a save was hand-edited or corrupted.

---

## Interface Contracts

### audience-mood module (new)

New module at `client/src/audience-mood/index.ts`. Exposes:

```typescript
// Event-driven path: called by game-loop on every post event
applyPostToPressures(
  state: GameState,
  staticData: StaticData,
  platformId: PlatformId,
  generatorId: GeneratorId,
): GameState;

// Tick-driven path: called by game-loop on every tick (not during offline)
advanceNeglect(
  state: GameState,
  staticData: StaticData,
  deltaTicks: number,
): GameState;

// Recompute retention for a single platform from current pressures
recomputeRetention(
  platformState: PlatformState,
  staticData: StaticData,
): { retention: number; dominantPressure: PressureId | null; dominantGenerator: GeneratorId | null };

// Recompute retention for all platforms (used on save load)
recomputeAllRetention(state: GameState, staticData: StaticData): GameState;
```

Pure functions, `state → state`. No side effects. Testable in isolation.

### Game-loop integration points

1. **On every post event** (existing post handler): call `applyPostToPressures` after the post is recorded, before follower distribution is computed for that post. The updated pressures feed the retention used in the same tick's distribution.
2. **On every tick** (in the tick pipeline): call `advanceNeglect` with the tick delta. Skip during offline-catchup simulation.
3. **In `computeFollowerDistribution`** (or immediately after): multiply per-platform follower gain by `platform.retention`.
4. **On save load** (in `save/index.ts` after migration): call `recomputeAllRetention` to normalize retention values against the loaded pressures.

---

## Coupling Analysis

### Named dependencies

- **Depends on:** `AlgorithmState.state_modifiers` (to determine "aligned" vs "off-trend" for Misalignment). If algorithm's modifier shape changes, misalignment's "favored" check must be updated. Low risk: the shape has been stable and is core to the Algorithm system.
- **Depends on:** static data for generator affinity per platform (already modeled). No new static-data dependency on the generator side.
- **Depends on:** the post event in the game loop. The post event's signature must expose `(platformId, generatorId)` to the audience-mood module. It already does (see `game-loop/index.ts` post handling).

### What breaks if retention's range changes

- If `retention_floor` is raised to e.g. `0.8`, the mechanic becomes nearly invisible — tuning change, not architectural.
- If `retention` is allowed to exceed `1.0` (reward mechanic), the `clamp(_, retention_floor, 1.0)` line in the composition formula must change, and the UI assumption "strip only appears below threshold" must be reconsidered (would need a reward strip or different signal). Not planned.

### Inversion points

None required. Audience Mood is a leaf subsystem — the core tick calls into it, it does not call out.

---

## Open Questions

1. **Default value for `composition_priority`** (ENGINEERING/DESIGN). Arch spec proposes `Content Fatigue > Algorithm Misalignment > Neglect`. Game-designer should confirm/override at build time. Non-blocking for model-layer implementation — change is one line in static data.

2. **Exact `*_weight` values for composition** (DESIGN). Game-designer owns these at build time. Engineer should ship with placeholders (suggested `0.5` each) and a clear tuning hook.

3. **Should `recomputeRetention` run every tick, or only on state mutation?** (ENGINEERING). Every-tick is simpler and deterministic but recomputes even when nothing changed. Mutation-gated is O(1) cheaper but adds a "when to recompute" contract the engineer must maintain. Recommendation: every-tick for simplicity — the arithmetic is trivially cheap and there is no measurable win from gating.

4. **Floating-number presentation** (resolved by ux-designer OQ#6): no per-post `×0.7` annotation on the floating gain number. The platform card's mood strip is the single diagnostic surface. Model layer emits only the raw post gain; UI does NOT annotate per-post.

---

## Assumptions

- **Neglect does not advance offline.** Load-bearing. If this changes, the offline calculator must simulate neglect accumulation, which pulls Audience Mood into the offline calculation surface and increases coupling.
- **All four Audience Mood fields initialize to "healthy" on new save and after migration.** Load-bearing. If post-migration saves should carry remembered pressure (e.g., if game-designer wants a soft onboarding where returning players experience a mood state from their prior play), this assumption breaks and the migration must derive initial values from some proxy (post history, generator ownership, etc).
- **`StaticData.audience_mood` exists as a new static-data group.** The engineer creates this group during implementation. Placeholder values above are architectural guidance; game-designer owns the final numbers.
- **Post events always carry `(platformId, generatorId)`.** Verified in existing game-loop code.

---

## What This Retires

From `architecture/scandal-system.md`:
- RiskAccumulator data model
- Six discrete scandal types and their trigger conditions
- Scandal state machine (`scandal_active` / `resolving` game-loop states)
- PR Response modal flow, slider, timer
- Risk accumulators with hidden thresholds + fuzz
- Empire-scaling accumulator threshold curve
- Session snapshot + foreground-snapshot lifecycle
- Stacking suppression + "suppressed notice" secondary notification
- Session-floor snapshot rule
- The "additive system, bolts onto core architecture" framing

Task #100 (scandal removal, interim) carries out the code-level retirement. This spec governs what replaces it.
