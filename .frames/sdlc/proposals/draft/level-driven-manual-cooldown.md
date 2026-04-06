---
name: Level-Driven Manual Cooldown
description: Redefine the Actions-column buttons so LVL UP controls tap speed, BUY controls tap power, and stackable Autoclickers add passive auto-tapping with visible feedback on the verb button.
created: 2026-04-06
author: game-designer
status: draft
reviewers: [game-designer]
---

# Proposal: Level-Driven Manual Cooldown

## Problem

The manual-action-ladder proposal tied manual cooldown to automator count (`BUY`) and yield scaling to level (`LVL UP`). This mapping has two problems:

1. **It's emotionally backwards.** When a player taps LVL UP, they expect to get *better* at the verb — faster, not just bigger numbers. When they tap BUY, they expect to get *more stuff*, not faster fingers. The current mapping fights universal game literacy.

2. **It conflates manual improvement with automation.** BUY currently adds an automator (increases count), which both starts passive income AND reduces manual cooldown. Manual upgrades and automation should be distinct systems with distinct affordances.

## Proposal

### The Actions column per verb

Each verb in the Actions column has four interactive elements:

#### 1. Verb button (manual tap)

The player taps the verb button to earn engagement. Each tap is gated by a cooldown and earns engagement based on the verb's yield multiplier. Floating numbers emit from the button showing how much engagement was earned.

#### 2. LVL UP button (speed axis)

Reduces the verb's manual cooldown. The player taps faster after each LVL UP. This is the speed axis — "I'm getting better at this."

**Cooldown formula:**

```
cooldownMs = max(50, 1000 / (level * base_event_rate))
```

Level starts at 1, caps at `max_level` (currently 10). At level 1, cooldown equals the base cooldown. Each level divides the base cooldown by the level number — L2 = half, L5 = fifth, L10 = tenth. Hard floor at 50ms prevents infinite fire rate.

The formula is simple: "your base cooldown divided by your level." Early levels are dramatic speed boosts (L1→L2 halves the wait). Late levels are refinement (L9→L10 shaves milliseconds). Diminishing returns are baked in.

**Cooldown progression per verb:**

| Verb | L1 (base) | L2 | L5 | L10 (max) |
|---|---|---|---|---|
| chirps | 2,000ms | 1,000ms | 400ms | 200ms |
| selfies | 5,000ms | 2,500ms | 1,000ms | 500ms |
| livestreams | 10,000ms | 5,000ms | 2,000ms | 1,000ms |
| podcasts | 30,303ms | 15,151ms | 6,060ms | 3,030ms |
| viral_stunts | 120,482ms | 60,241ms | 24,096ms | 12,048ms |

No phantom-hand floor needed — level is always >= 1, so cooldown is always defined.

**Rate retune for chirps and selfies:** The design intent is slower starting cooldowns for the early verbs to make LVL UP progression more dramatic. This requires retuning `base_event_rate` (and compensating `base_event_yield` to preserve passive output):

| Verb | Old rate | New rate | Old yield | New yield | Passive output |
|---|---|---|---|---|---|
| chirps | 2.5 | 0.5 | 0.2 | 1.0 | 0.5 eng/s *(preserved)* |
| selfies | 0.4 | 0.2 | 2.5 | 5.0 | 1.0 eng/s *(preserved)* |
| livestreams | 0.1 | 0.1 | 800 | 800 | 80 eng/s *(unchanged)* |
| podcasts | 0.033 | 0.033 | 4,545 | 4,545 | 150 eng/s *(unchanged)* |
| viral_stunts | 0.0083 | 0.0083 | 60,240 | 60,240 | 500 eng/s *(unchanged)* |

Only chirps and selfies change. All other verbs' rates and yields stay as locked in manual-action-ladder §14a.

#### 3. BUY button (power axis)

Increases the engagement earned per tap. Each BUY increases `count`, which multiplies the per-tap yield. This is the power axis — "Each tap is worth more now."

**Per-tap earned formula:**

```
earned = base_event_yield * (1 + count) * algoMod * clout_bonus * kit_bonus
```

`countMultiplier` is linear: `1 + count`. At count=0 (start), multiplier is 1× (base yield). Each BUY adds +1 to the multiplier. At count=10, multiplier is 11×. Simple, predictable, no overflow risk. The escalating BUY cost (`ceil(base_buy_cost × 1.15^count)`) provides pacing control — diminishing return-on-investment is in the cost curve, not the multiplier curve.

**Note:** `levelMultiplier(level)` no longer appears in the per-tap yield formula. Level drives cooldown only. Count drives yield only. One button, one axis. Clean split.

#### 4. Autoclickers (repeatable purchase per verb)

The player can buy multiple autoclickers per verb. Each autoclicker is an independent auto-tapper that fires on a loop, generating engagement passively. Each purchase gets progressively more expensive.

**Key rules:**

- **Every time an autoclicker fires, the verb's action button emits a floating number** showing the engagement generated — identical visual feedback to manual taps. More autoclickers = more pops on the button. The player sees their little army firing off.
- **Autoclickers fire at the verb's base cooldown (L1 speed), not the player's leveled-up cooldown.** LVL UP only makes the player's hand faster — autoclickers stay at base speed. This creates a clear quality-vs-quantity split: the player's hand is always the premium path, autoclickers are the bulk path.
- **Autoclickers benefit from BUY (count-driven yield multiplier).** Each autoclicker fire uses the same yield formula as manual taps, so BUY upgrades strengthen both the player's hand and all autoclickers equally.
- **Manual taps are additive on top.** The player's hand and the autoclickers coexist. The player is never replaced — they're always adding to the army's output.
- **Burst firing.** All N autoclickers fire simultaneously every base-cooldown interval. The engine computes a single `passive_rate` per tick (see passive formula below). The UX layer may visually stagger the floating-number emissions for a smoother feel — that's a presentation concern, not an engine concern.

**Autoclicker internal cooldown (fixed at base):**

```
autoclickerCooldownMs = 1000 / base_event_rate
```

This is the L1 cooldown — the slowest the verb can be. Autoclickers never speed up from leveling. A player at L10 chirps taps at 200ms while each autoclicker still fires at 2,000ms. The player is 10× faster than any one worker, but 10 workers still add up.

**Autoclicker engagement per fire:**

```
earned_per_fire = base_event_yield * (1 + count) * algoMod * clout_bonus * kit_bonus
```

Same yield formula as manual taps. The only difference is the cooldown: manual uses the level-divided cooldown, autoclickers use the base cooldown.

**Strategic tension:** "Do I LVL UP to tap faster, BUY to tap harder, or get another autoclicker for passive income?" Three distinct investment axes, three distinct feelings. LVL UP is active-play-premium (only the player benefits). BUY is universal (everything gets stronger). Autoclickers are the idle-income path (quantity over quality).

### Data Model

`GeneratorState` gains a new field. The three purchase tracks map to three distinct state fields:

| Field | Drives | Purchase |
|---|---|---|
| `level` (1–max_level) | Manual cooldown via `max(50, 1000/(level × rate))` | LVL UP |
| `count` (≥ 0, starts at 0) | Yield multiplier via `1 + count` | BUY |
| `autoclicker_count` (≥ 0, starts at 0) | Passive production | Autoclicker |

**Save migration:** New save version. Seed `autoclicker_count = 0` for all existing generators. `level` and `count` retain their existing values but their semantic roles change (level → cooldown, count → yield multiplier instead of automator count).

### Passive Tick Formula

The existing passive rate formula changes. `levelMultiplier(level)` drops out entirely (level drives cooldown only). The leading factor changes from `count` to `autoclicker_count`:

```
passive_rate = autoclicker_count × base_event_rate × base_event_yield × (1 + count) × algoMod × clout × kit
```

- `autoclicker_count` = number of passive workers (0 means no passive income for this verb)
- `base_event_rate × base_event_yield` = base passive output per autoclicker per second
- `(1 + count)` = BUY multiplier (strengthens autoclickers equally with manual taps)
- `algoMod × clout × kit` = existing modifier stack, unchanged

This formula feeds directly into the offline calculator. Autoclickers produce engagement while the player is away — they're persistent passive workers. The offline catch-up walks this formula per algorithm segment, same structure as today, just with `autoclicker_count` replacing the old `count`.

### Why this is better

1. **Three axes, three feelings.** LVL UP = "I'm faster" (active-play premium). BUY = "everything hits harder" (universal). Autoclicker = "my army grows" (idle income). Each purchase feels different. No overlap.

2. **Matches universal game literacy.** "Level up = get faster" and "buy more = get stronger" are intuitive. "Buy autoclickers = they play for me" is the classic idle-game scaling moment.

3. **Visible automation feedback.** Each autoclicker fire emits a floating number on the verb button. More autoclickers = more pops. The player watches their verb come alive as they stack workers. The verb button becomes a living thing.

4. **Player's hand is always premium.** LVL UP only speeds the player, not autoclickers. At max level, the player taps 10× faster than any single worker. The hand is never obsoleted — it's the fastest tapper in the room. But the army adds up.

5. **Natural strategic fork.** "Level up myself OR buy another worker?" is a genuine decision at every price point. Active players invest in LVL UP. Idle players stack autoclickers. BUY helps both.

5. **Bounded cooldown progression.** Level caps at 10, so cooldown has a known floor per verb. No asymptotic shrink. The designer can predict exact cooldowns. The UX can show a clean progression bar.

6. **Eliminates the phantom-hand floor.** `max(1, count)` was needed because count=0 is valid pre-Automate and cooldown would be infinite. Level is always >= 1, so the formula just works. One fewer special case.

### Supersession

This proposal supersedes the following sections of `proposals/accepted/manual-action-ladder.md`:

- **§2 (three-state lifecycle):** Unlock → Upgrade → Automate becomes Unlock → three parallel investment tracks (LVL UP / BUY / Autoclicker). The lifecycle is no longer sequential stages — all three purchases are available once the verb is unlocked.
- **§4 (Automate teaching moment):** The "first BUY halves your cooldown" dual payoff is gone. Each button does exactly one thing. The teaching moment is now the first Autoclicker purchase: "I can see my verb button firing on its own."
- **§12 (What This Locks In) — cooldown formula:** `cooldown = 1 / (max(1, count) * base_event_rate)` is replaced by `max(50, 1000 / (level * base_event_rate))`.
- **§12 — phantom-hand floor scoping:** Eliminated. Level is always >= 1, so no floor needed. The 50ms hard floor replaces the old 10ms floor as a safety clamp.
- **§12 — per-tap earned formula:** `levelMultiplier(level)` is removed. Replaced by `(1 + count)`.
- **§14a (yield/rate split):** Chirps and selfies get retuned rates to produce the new base cooldowns. Chirps: rate 2.5→0.5, yield 0.2→1.0. Selfies: rate 0.4→0.2, yield 2.5→5.0. Passive output preserved. Other verbs unchanged.
- **§14e (automation curve):** The cooldown-by-count table is superseded by the level-keyed cooldown table above. Automation is now autoclicker-count-driven, not cooldown-scaling.
- **§14f (manual-supplementary ratio):** The old ratio assumed count-driven cooldown shrinking manual's relative share. With level-driven manual cooldown and fixed-speed autoclickers, the ratio depends on level (bounded) vs autoclicker count (unbounded). At max level, the player taps at L10 speed; N autoclickers each tap at L1 speed. Manual share = L10_rate / (L10_rate + N × L1_rate). The player's hand fades as autoclicker army grows, but is always the single fastest tapper.
- **Passive tick formula:** `count × base_event_rate × base_event_yield × levelMultiplier(level) × ...` becomes `autoclicker_count × base_event_rate × base_event_yield × (1 + count) × ...`. Leading factor changes, `levelMultiplier` drops out, `(1 + count)` replaces it.
- **Architect re-review (OQ16):** Phantom-hand floor approval is moot — the floor is gone.

The `postClick` cooldown gate changes:

```
// Before:
const cooldownMs = 1000 / (Math.max(1, genState.count) * def.base_event_rate);

// After:
const cooldownMs = Math.max(50, 1000 / (genState.level * def.base_event_rate));
```

The per-tap earned formula changes:

```
// Before:
earned = def.base_event_yield * levelMultiplier(genState.level) * algoMod * clout * kit

// After:
earned = def.base_event_yield * (1 + genState.count) * algoMod * clout * kit
```

All other sections of manual-action-ladder (verb roster, unlock thresholds, platform affinities, algorithm modifiers) remain in force.

## References

1. `.frames/sdlc/proposals/accepted/manual-action-ladder.md` — the accepted proposal this partially supersedes (§4, §12, §14e, §14f)
2. `.frames/sdlc/proposals/accepted/generator-balance-and-algorithm-states.md` — generator rate table and cost structure
3. `client/src/game-loop/index.ts` — `postClick` implementation with current count-driven cooldown gate
4. `client/src/static-data/index.ts` — generator definitions with `base_event_rate`, `max_level` fields

## Open Questions

1. **[RESOLVED] Shape of `count_multiplier(count)`.** Linear: `1 + count`. At count=0, multiplier=1× (base yield). Each BUY adds +1. Simple, predictable, no overflow. Pacing control lives in the escalating BUY cost curve, not the multiplier shape. Architect flagged that `levelMultiplier` applied to unbounded count would overflow — linear avoids this entirely.

2. **[RESOLVED] BUY cost formula.** Keep `ceil(base_buy_cost × 1.15^count)`. Exponential cost + linear yield = natural diminishing return-on-investment. Early BUYs are high-value, late BUYs are luxury. Works.

3. **[RESOLVED] LVL UP cost formula.** Keep `ceil(base_upgrade_cost × levelMultiplier(level+1))`. Super-exponential cost pairs well with the diminishing cooldown returns (L1→L2 saves 1,000ms for chirps, L9→L10 saves 22ms). Early levels are cheap dramatic boosts, late levels are expensive refinement. Good match.

4. **UX implications for cooldown and autoclicker display.** LVL UP can show a cooldown preview ("2,000ms → 1,000ms"). BUY can show a multiplier preview ("×1 → ×2"). Autoclicker button needs a cost display and a count badge ("×3 autoclickers"). The floating-number emission from autoclicker fires needs a UX spec — burst fires in the engine, but visual stagger is a UX-layer decision. **Owner: ux-designer**

5. **Autoclicker base cost per verb tier.** Cost formula: `ceil(base_autoclicker_cost × 1.15^autoclicker_count)` — same exponential escalation as BUY. Base costs should follow the ~10× tier progression and be significantly more expensive than a single BUY (autoclickers are permanent passive income). Exact base_autoclicker_cost values per verb are a balance cell to be filled during implementation. **Owner: game-designer**

6. **[RESOLVED] Autoclicker and offline progression.** Yes, autoclickers produce engagement offline. They're persistent passive workers. The offline catch-up formula walks the passive_rate formula per algorithm segment, same structure as today, with `autoclicker_count` replacing the old `count`.

7. **[RESOLVED] Autoclicker firing pattern.** Burst mode. Per architect recommendation: all N autoclickers fire simultaneously every base-cooldown interval. Maps cleanly to `passive_rate = autoclicker_count × base_event_rate × yield × modifiers × deltaMs` — zero new state, same formula shape as the existing tick pipeline. The UX layer may visually stagger the floating-number emissions for smoother feel — presentation concern, not engine concern.

---
## Revision: 2026-04-06 — game-designer (post-architect-review)

Resolved all three blockers and non-blocking items:

**Blocking 1 (Data Model):** Named the three fields explicitly — `level` (cooldown), `count` (yield multiplier), `autoclicker_count` (new, passive workers). Specified `GeneratorState` shape and save migration (seed `autoclicker_count = 0`).

**Blocking 2 (Passive Tick Formula):** Confirmed architect's inference and wrote the formula explicitly: `passive_rate = autoclicker_count × base_event_rate × base_event_yield × (1 + count) × algoMod × clout × kit`. `levelMultiplier` drops out entirely. Feeds directly into offline calculator unchanged in structure.

**Blocking 3 (Cooldown Table Mismatch):** Retuned chirps (rate 2.5→0.5, yield 0.2→1.0) and selfies (rate 0.4→0.2, yield 2.5→5.0) to match design-intent base cooldowns (2,000ms and 5,000ms). Passive output preserved via compensating yield. Added 50ms hard floor. Formula is `max(50, 1000/(level × rate))` — "base cooldown divided by level." Updated cooldown table to match formula exactly (L10 chirps=200ms, L10 selfies=500ms — not 0ms). Other verbs unchanged.

**Non-blocking (countMultiplier):** Resolved OQ1 as linear `1 + count`. No overflow, pacing in cost curve.

**Non-blocking (Autoclicker timing):** Accepted architect's burst recommendation. Resolved OQ7.

**Non-blocking (Supersession):** Added §2 (lifecycle change), §14a (rate retune), and passive tick formula to supersession list.

Also resolved OQ2 (BUY cost — keep existing), OQ3 (LVL UP cost — keep existing), OQ6 (offline — yes, autoclickers produce offline).

---
# Review: architect

**Date**: 2026-04-06
**Decision**: Not Aligned

**Comments**

The level→speed / count→power swap is a clean conceptual improvement over the manual-action-ladder's mapping. The three-axis investment model (LVL UP, BUY, Autoclicker) is architecturally tractable and the design reasoning is sound. Three things need resolution before I can approve.

### Blocking 1: Data Model — Three Purchase Tracks, One `count` Field

The proposal introduces three distinct investment axes per verb: LVL UP (speed), BUY (power), Autoclicker (passive income). Today `GeneratorState.count` is a single field that serves as both automator count and yield scaling factor. Under this proposal, BUY and Autoclicker are **separate purchases** — BUY increases a yield multiplier, Autoclicker adds independent passive tappers.

`GeneratorState` currently has:
- `level` (1–max_level) — repurposed to drive cooldown ✓
- `count` (≥ 0) — currently serves double duty

This proposal needs something like:
- `level` → drives cooldown (repurposed)
- `count` → drives yield via `countMultiplier` (repurposed as BUY count)
- `autoclicker_count` → **new field**, number of purchased autoclickers driving passive income

The proposal must name the new field (or rename existing ones), specify the `GeneratorState` shape, and acknowledge the save migration (new version). Every consumer of `count` — tick pipeline, offline calculator, UI, driver — needs to know which count it's reading.

### Blocking 2: Passive Tick Formula Not Specified

The existing passive rate formula is:

```
effective_rate = count × base_event_rate × base_event_yield × levelMultiplier(level) × algoMod × clout × kit
```

The proposal specifies the manual-tap earned formula and the cooldown formula, but never writes the new passive tick formula. With autoclickers separated from BUY, the formula becomes something like:

```
passive_rate = autoclicker_count × base_event_rate × base_event_yield × countMultiplier(buy_count) × algoMod × clout × kit
```

But that's my inference. The proposal needs to state it explicitly because:
- The leading factor changes from `count` to `autoclicker_count`
- `levelMultiplier(level)` drops out of passive production entirely (level drives cooldown only)
- `countMultiplier(buy_count)` replaces it
- This flows directly into the offline calculator (which walks passive rates per algorithm segment)

If my inference is wrong, that's exactly why the contract must be written down.

### Blocking 3: Cooldown Formula vs. Table Mismatch

The stated formula is `cooldownMs = 1000 / (level × base_event_rate)`. The table is treated as the design intent (per user direction), but the formula does not produce the table values for chirps and selfies using the locked-in `base_event_rate` values from manual-action-ladder §14a:

| Verb | Locked rate | L1 (formula) | L1 (table) |
|---|---|---|---|
| chirps | 2.5 | 400ms | 2,000ms |
| selfies | 0.4 | 2,500ms | 5,000ms |
| livestreams | 0.1 | 10,000ms | 10,000ms ✓ |
| podcasts | 0.033 | 30,303ms | 30,303ms ✓ |
| viral_stunts | 0.0083 | 120,482ms | 120,482ms ✓ |

The table values for chirps and selfies imply different `base_event_rate` values (0.5 and 0.2 respectively) than the locked-in rates from §14a. If the design intent is to slow these verbs' starting cooldowns to make LVL UP progression more dramatic, that's a valid game-design call — but changing `base_event_rate` breaks the passive-output invariant (`base_event_yield × base_event_rate = preserved passive output`) unless `base_event_yield` is retuned to compensate. The proposal should either:

- (a) Explicitly state the new `base_event_rate` values and the compensating `base_event_yield` values that preserve passive output, or
- (b) Explicitly state that passive output is being retuned (and why)

Additionally, chirps and selfies show **0ms** at L10. Under any formula of the shape `1000 / (level × rate)`, cooldown approaches zero but never reaches it. True 0ms means uncapped fire rate, which is a tick-pipeline hazard (infinite events per frame). Recommend a floor (e.g. 10ms or 50ms) for the same reason the old model had a ~0.01s floor. Alternatively, the formula may need a different shape (subtractive rather than reciprocal) to hit the table values — that's a design + architecture co-decision.

### Non-Blocking: `countMultiplier` (OQ1) Is Load-Bearing for Planning

Not blocking acceptance, but flagging: count is unbounded; level was capped at 10. The existing `levelMultiplier = 2^(level²/5)` produces ~1,048,576× at L=10 — that curve applied to unbounded count would overflow instantly. The curve choice (linear, logarithmic, polynomial, etc.) defines the entire economy's pacing. I want OQ1 resolved before any implementation tasks are filed so the engineer isn't blocked.

### Non-Blocking: Autoclicker Timing Model (OQ7) — Architect Recommendation

Burst mode (all N autoclickers fire simultaneously every `base_cooldown` ms) maps cleanly to the existing tick pipeline: `passive_rate = autoclicker_count × base_event_rate × yield × modifiers × deltaMs`. Zero new state, same formula shape as today. Staggered mode (phase offsets per autoclicker) would require per-autoclicker phase state on `GeneratorState` — more fields, more migration, more tick complexity. I'd advocate **burst** unless the game-designer has a strong feel reason for staggered. The UX layer can visually stagger the floating-number emissions without the engine actually staggering the fires.

### Non-Blocking: Supersession List Is Incomplete

The proposal says "all other sections of manual-action-ladder remain in force," but:
- §2 (three-state lifecycle: Unlock → Upgrade → Automate) becomes Unlock → three parallel investment tracks — structurally different
- §14a balance cells may change if `base_event_rate` is retuned for the new cooldown model
- The passive tick formula changes (per Blocking 2)

These should be called out in the Supersession section so downstream implementers know what's changed vs. what carries forward.

---
# Review: architect (re-review)

**Date**: 2026-04-06
**Decision**: Aligned

**Comments**

All three blockers resolved cleanly. Re-review follows.

**Blocking 1 (Data Model) → RESOLVED.** `GeneratorState` shape is explicit: `level` (cooldown), `count` (yield multiplier via `1 + count`), `autoclicker_count` (new, passive workers). Migration path clear: seed `autoclicker_count = 0`, retain existing `level`/`count` values with changed semantics. Accepted.

**Blocking 2 (Passive Tick Formula) → RESOLVED.** Formula stated explicitly: `passive_rate = autoclicker_count × base_event_rate × base_event_yield × (1 + count) × algoMod × clout × kit`. Confirmed my inference was correct. `levelMultiplier` drops out entirely, `autoclicker_count` replaces old `count` as the leading factor. Feeds into offline calculator with no structural change. Accepted.

**Blocking 3 (Cooldown Table) → RESOLVED.** Chirps and selfies retuned with compensating yield to preserve passive output. Formula updated to `max(50, 1000/(level × rate))` with 50ms hard floor. Table values verified against formula — all correct. L10 chirps = 200ms, L10 selfies = 500ms (no more 0ms entries). Accepted.

**Non-blocking items:** All adopted. `countMultiplier` resolved as linear `1 + count` — simple, no overflow risk, pacing lives in the cost curve. Burst firing accepted for autoclicker timing. Supersession list updated to cover §2, §14a, and the passive formula.

**Minor observation (non-blocking):** `GeneratorDef` will need a `base_autoclicker_cost` field (or similar) in static data to support the autoclicker cost formula from OQ5. This is obvious from context and doesn't block acceptance — the game-designer fills the values in a balance pass. Flagging so the engineer planning implementation tasks knows to expect it.

**OQ4 (ux-designer) and OQ5 (game-designer) remain open.** Neither blocks the structural architecture — OQ4 is presentation-layer and OQ5 is balance values. Engineer should assess during their review whether these need resolution before implementation planning.

---
# Review: engineer

**Date**: 2026-04-06
**Decision**: Aligned

**Comments**

The design is clean and the architect resolved the structural questions well. From an implementation standpoint this is tractable — no blocking concerns. The change surface is wider than it appears from the formulas alone, so I'm documenting every code site that changes and two design questions that need answers before implementation tasks are filed.

### Implementation Change Surface (non-blocking, informational)

Traced every consumer of `count`, `level`, `levelMultiplier`, and the passive-rate formula in the current codebase. The following files and functions require changes:

1. **`types.ts` — `GeneratorState`**: Add `autoclicker_count: number` field.

2. **`game-loop/index.ts` — `computeGeneratorEffectiveRate` (line 141–163)**: Three simultaneous changes in one function: leading factor `count` → `autoclicker_count`, `levelMultiplier(level)` drops out, `(1 + count)` replaces it. The early-return guard (line 146, `generator.count <= 0`) must change to `generator.autoclicker_count <= 0`. This is the highest-risk change — a half-applied refactor silently produces wrong numbers with no type error.

3. **`game-loop/index.ts` — `postClick` (line 567–613)**: Cooldown formula changes from `1000 / (Math.max(1, genState.count) * def.base_event_rate)` to `Math.max(50, 1000 / (genState.level * def.base_event_rate))`. Earned formula changes from `def.base_event_yield * levelMultiplier(genState.level) * ...` to `def.base_event_yield * (1 + genState.count) * ...`. Two changes in one function, mechanical.

4. **`static-data/index.ts`**: Chirps rate 2.5→0.5, yield 0.2→1.0. Selfies rate 0.4→0.2, yield 2.5→5.0. Plus a new `base_autoclicker_cost` field on `GeneratorDef` (blocked on OQ5).

5. **`generator/index.ts`**: New `buyAutoclicker` function needed — new purchase action, new cost formula (`ceil(base_autoclicker_cost × 1.15^autoclicker_count)`), new state mutation. UI wiring follows.

6. **`save/index.ts`**: V9→V10 migration — seed `autoclicker_count = 0` on all generators, bump version. Existing `count` values retained with changed semantics (deserves a code comment).

7. **`prestige/index.ts` — `applyRebrand`**: Must reset `autoclicker_count` to 0 alongside existing field resets.

8. **`offline/index.ts`**: No separate code change — it calls `computeAllGeneratorEffectiveRates` which inherits the formula change. The tight coupling the architect warned about works in our favor here.

9. **`levelMultiplier` function**: Becomes semi-orphaned from hot paths. Still used in `generatorUpgradeCost` for cost scaling. Don't delete it.

10. **Tests**: `game-loop/index.test.ts`, `integration.test.ts`, `generator/index.test.ts`, `save/index.test.ts` all assert on count-driven passive production and count-driven cooldown. Every such assertion needs updating.

### Flag 1 (game-designer): `upgradeGenerator` prerequisite is now wrong

`upgradeGenerator` (`generator/index.ts`, line 273) currently throws if `count <= 0`:

> "Upgrading a generator with no units is a no-op from a gameplay perspective, so it is disallowed."

That reasoning was correct when level affected passive rate (no units = no output = wasted upgrade). Under this proposal, level drives **manual cooldown**, which works at count=0 — the player taps faster regardless of BUY count. The guard should be removed, or the proposal should explicitly state whether LVL UP requires at least one BUY. This is a game-design question: **should a player be able to LVL UP before their first BUY?**

### Flag 2 (game-designer): Audience Mood post gate needs clarification

`applyTickPosts` (`audience-mood/index.ts`, line 295) skips generators where `count <= 0`. Under this proposal, a generator with `count=0` but `autoclicker_count > 0` has active autoclickers firing — producing engagement and emitting floating numbers. Should those autoclicker fires also generate "posts" for audience mood pressure? If autoclicker fires are semantically equivalent to manual taps (the proposal says "identical visual feedback"), they should also contribute to mood. The gate should become `count <= 0 && autoclicker_count <= 0`. But this is a design call — **do autoclickers contribute to audience mood, or only the player's hand and passive-only generators?**

### OQ5 blocks implementation planning

Agreeing with the architect's flag: OQ5 (`base_autoclicker_cost` per verb) must be resolved before build tasks are filed. I cannot write `buyAutoclicker` without the cost structure. OQ4 (UX spec) doesn't block engine work but blocks UI work.
