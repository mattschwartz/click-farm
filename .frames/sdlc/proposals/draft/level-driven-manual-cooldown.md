---
name: Level-Driven Manual Cooldown
description: Redefine the two Actions-column buttons so LVL UP controls tap speed (cooldown) and BUY controls tap power (multiplier), with automation deferred to a separate future system.
created: 2026-04-06
author: game-designer
status: draft
reviewers: [architect, engineer]
---

# Proposal: Level-Driven Manual Cooldown

## Problem

The manual-action-ladder proposal tied manual cooldown to automator count (`BUY`) and yield scaling to level (`LVL UP`). This mapping has two problems:

1. **It's emotionally backwards.** When a player taps LVL UP, they expect to get *better* at the verb — faster, not just bigger numbers. When they tap BUY, they expect to get *more stuff*, not faster fingers. The current mapping fights universal game literacy.

2. **It conflates manual improvement with automation.** BUY currently adds an automator (increases count), which both starts passive income AND reduces manual cooldown. But the Actions column is the *manual tapping* column. Both buttons there should improve the player's manual tapping experience. Automation is a separate system that the player unlocks later through a different surface.

## Proposal

### Two buttons, two axes, both manual-only

The Actions column shows two upgrade buttons per verb. Neither spawns a generator or automator. Both improve the player's manual tapping:

| Button | What it does | What it increases | Player feeling |
|---|---|---|---|
| **LVL UP** | Reduces cooldown | `level` | "I'm getting faster at this" |
| **BUY** | Increases yield multiplier | `count` | "Each tap is worth more now" |

### Cooldown formula (level-driven)

```
cooldownMs = 1000 / (level * base_event_rate)
```

Level starts at 1, caps at `max_level` (currently 10). At level 1, cooldown equals the base cooldown from §3 of the manual-action-ladder. Each level-up divides the cooldown further. The player feels every LVL UP in their tapping rhythm immediately.

**Cooldown progression per verb:**

| Verb | L1 (base) | L2 | L5 | L10 (max) |
|---|---|---|---|---|
| chirps | 400ms | 200ms | 80ms | 40ms |
| selfies | 2,500ms | 1,250ms | 500ms | 250ms |
| livestreams | 10,000ms | 5,000ms | 2,000ms | 1,000ms |
| podcasts | 30,303ms | 15,151ms | 6,060ms | 3,030ms |
| viral_stunts | 120,482ms | 60,241ms | 24,096ms | 12,048ms |

No phantom-hand floor needed — level is always >= 1, so cooldown is always defined.

### Yield formula (count-driven)

Each BUY increases count. Count multiplies the engagement earned per manual tap:

```
earned = base_event_yield * count_multiplier(count) * algoMod * clout_bonus * kit_bonus
```

The exact shape of `count_multiplier(count)` — whether it's linear (`count`), uses the existing `levelMultiplier` curve, or something else — is an architect/engineer question (see OQ1). The design intent is: each BUY makes every tap visibly stronger. The player sees bigger numbers per tap.

**Note:** `levelMultiplier(level)` no longer appears in the per-tap yield formula. Level drives cooldown only. Count drives yield only. One button, one axis. Clean split.

### Automation is separate and deferred

Automators (passive production) are not part of the Actions column. They will be introduced as a separate unlock later in the game's lifecycle, through a different UI surface. When they arrive, they will use their own production formula. Until then, count=0 for passive purposes and all engagement comes from manual tapping.

This means the current passive production formula (`count * base_event_rate * base_event_yield * levelMultiplier * ...`) produces zero for all verbs in the pre-automator game — which is correct. The player's only income source is tapping.

### Why this is better

1. **One button, one axis.** LVL UP = speed. BUY = power. No overlap, no confusion. The player never wonders "which button makes me tap faster?"

2. **Matches universal game literacy.** "Level up = get better at the thing" is how every RPG, every skill tree, every upgrade system works. "Buy more = get more" is equally intuitive.

3. **Actions column is purely manual.** Both buttons improve what your hands do. No automation leaking into the manual tapping surface. When automators arrive, they'll have their own home.

4. **Bounded cooldown progression.** Level caps at 10, so cooldown has a known floor per verb. No asymptotic shrink. The designer can predict exact cooldowns. The UX can show a clean progression bar.

5. **Eliminates the phantom-hand floor.** `max(1, count)` was needed because count=0 is valid pre-Automate. Level is always >= 1, so the formula just works. One fewer special case.

### Supersession

This proposal supersedes the following sections of `proposals/accepted/manual-action-ladder.md`:

- **§4 (Automate teaching moment):** The dual payoff moves from BUY to LVL UP. The teaching moment ("one purchase improves two things") is no longer relevant — each button improves exactly one axis.
- **§12 (What This Locks In) — cooldown formula:** `cooldown = 1 / (max(1, count) * base_event_rate)` is replaced by `cooldown = 1 / (level * base_event_rate)`.
- **§12 — phantom-hand floor scoping:** Eliminated. No floor needed.
- **§12 — per-tap earned formula:** `levelMultiplier(level)` is removed from the earned formula. Replaced by `count_multiplier(count)`.
- **§14e (automation curve):** The cooldown progression table keyed by count is superseded by the level-keyed table above.
- **§14f (manual-supplementary ratio):** Moot until automators exist. When they arrive, the ratio will be recalculated against the new formula.
- **Architect re-review (OQ16):** Phantom-hand floor approval is moot — the floor is gone.

The `postClick` cooldown gate changes:

```
// Before:
const cooldownMs = 1000 / (Math.max(1, genState.count) * def.base_event_rate);

// After:
const cooldownMs = 1000 / (genState.level * def.base_event_rate);
```

The per-tap earned formula changes:

```
// Before:
earned = def.base_event_yield * levelMultiplier(genState.level) * algoMod * clout * kit

// After:
earned = def.base_event_yield * countMultiplier(genState.count) * algoMod * clout * kit
```

All other sections of manual-action-ladder remain in force.

## References

1. `.frames/sdlc/proposals/accepted/manual-action-ladder.md` — the accepted proposal this partially supersedes (§4, §12, §14e, §14f)
2. `.frames/sdlc/proposals/accepted/generator-balance-and-algorithm-states.md` — generator rate table and cost structure
3. `client/src/game-loop/index.ts` — `postClick` implementation with current count-driven cooldown gate
4. `client/src/static-data/index.ts` — generator definitions with `base_event_rate`, `max_level` fields

## Open Questions

1. **Shape of `count_multiplier(count)`.** Is it linear (`count`), exponential (reuse `levelMultiplier` curve applied to count), or something else? The design intent is "each BUY makes taps visibly stronger" but the exact curve affects pacing. **Owner: architect** (formula shape), **game-designer** (pacing feel)

2. **BUY cost formula.** Currently `ceil(base_buy_cost * 1.15^count_owned)`. Does this still make sense when BUY is a manual-yield upgrade rather than an automator purchase? The exponential scaling may need retuning. **Owner: game-designer**

3. **LVL UP cost formula.** Currently `ceil(base_upgrade_cost * levelMultiplier(level+1))`. If level now drives cooldown instead of yield, should the cost curve change to reflect the value of cooldown reduction at each level? **Owner: game-designer**

4. **UX implications for cooldown display.** LVL UP can show a cooldown preview ("400ms -> 200ms"). BUY can show a multiplier preview ("x1 -> x2"). Both are clean affordances. Should the UX spec reflect this? **Owner: ux-designer**

5. **Passive production formula when automators arrive.** The current formula uses both count and levelMultiplier. With this split, should automators use count (number of workers × rate × yield) while level drives their efficiency? Or is that a future proposal? **Owner: architect**
