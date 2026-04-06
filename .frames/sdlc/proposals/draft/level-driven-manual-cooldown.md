---
name: Level-Driven Manual Cooldown
description: Redefine the Actions-column buttons so LVL UP controls tap speed, BUY controls tap power, and a one-time Autoclicker purchase per verb adds passive auto-tapping with visible feedback on the verb button.
created: 2026-04-06
author: game-designer
status: draft
reviewers: [architect, engineer]
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
cooldownMs = 1000 / (level * base_event_rate)
```

Level starts at 1, caps at `max_level` (currently 10). At level 1, cooldown equals the base cooldown from §3 of the manual-action-ladder. Each level-up divides the cooldown further. The player feels every LVL UP in their tapping rhythm immediately.

**Cooldown progression per verb:**

| Verb | L1 (base) | L2 | L5 | L10 (max) |
|---|---|---|---|---|
| chirps | 2,000ms | 1,000ms | 250ms | 0ms |
| selfies | 5,000ms | 2,500ms | 750ms | 0ms |
| livestreams | 10,000ms | 5,000ms | 2,000ms | 1,000ms |
| podcasts | 30,303ms | 15,151ms | 6,060ms | 3,030ms |
| viral_stunts | 120,482ms | 60,241ms | 24,096ms | 12,048ms |

No phantom-hand floor needed — level is always >= 1, so cooldown is always defined.

#### 3. BUY button (power axis)

Increases the engagement earned per tap. Each BUY increases count, which multiplies the per-tap yield. This is the power axis — "Each tap is worth more now."

**Per-tap earned formula:**

```
earned = base_event_yield * count_multiplier(count) * algoMod * clout_bonus * kit_bonus
```

The exact shape of `count_multiplier(count)` — whether it's linear, exponential, or something else — is an architect/engineer question (see OQ1). The design intent is: each BUY makes every tap visibly stronger. The player sees bigger numbers per tap.

**Note:** `levelMultiplier(level)` no longer appears in the per-tap yield formula. Level drives cooldown only. Count drives yield only. One button, one axis. Clean split.

#### 4. Autoclicker (one-time unlock per verb)

A single purchase that unlocks passive auto-tapping for the verb. Once purchased:

- The autoclicker fires on its own internal cooldown, generating engagement automatically.
- **Every time it fires, the verb's action button emits a floating number** showing the engagement generated — identical to the feedback from manual taps. The player sees their verb button popping numbers even when they're not tapping it.
- The autoclicker uses the same yield formula as manual taps — it benefits from both LVL UP (faster firing, since it shares the level-driven cooldown) and BUY (stronger output, since it shares the count-driven multiplier).

This is the "set it and forget it" moment per verb. The player watches their verb button come alive on its own. But manual taps still stack on top — the player's hand and the autoclicker are additive.

**Autoclicker internal cooldown:** Uses the same level-driven cooldown as manual taps. When the player levels up a verb, both their manual tapping AND the autoclicker get faster. This reinforces LVL UP as the speed axis for everything on that verb.

**Autoclicker engagement per fire:**

```
earned = base_event_yield * count_multiplier(count) * algoMod * clout_bonus * kit_bonus
```

Same formula as manual taps. The autoclicker is functionally "a hand that taps for you."

### Why this is better

1. **One button, one axis.** LVL UP = speed. BUY = power. Autoclicker = passive. Three distinct purchases, three distinct feelings, zero overlap.

2. **Matches universal game literacy.** "Level up = get faster" and "buy more = get stronger" are intuitive. "Unlock autoclicker = it plays itself" is the classic idle-game graduation moment.

3. **Visible automation feedback.** The autoclicker's output appears as floating numbers on the verb button. The player sees their investments paying off in the same visual language as manual taps. The verb button becomes a living thing.

4. **Manual + auto are additive.** The player's hand still matters after unlocking the autoclicker. They're tapping alongside it, not being replaced by it. Both benefit from LVL UP and BUY equally.

5. **Bounded cooldown progression.** Level caps at 10, so cooldown has a known floor per verb. No asymptotic shrink. The designer can predict exact cooldowns. The UX can show a clean progression bar.

6. **Eliminates the phantom-hand floor.** `max(1, count)` was needed because count=0 is valid pre-Automate and cooldown would be infinite. Level is always >= 1, so the formula just works. One fewer special case.

### Supersession

This proposal supersedes the following sections of `proposals/accepted/manual-action-ladder.md`:

- **§4 (Automate teaching moment):** Replaced by the Autoclicker one-time purchase described above. The Unlock → Upgrade → Automate lifecycle per verb is replaced by: Unlock → LVL UP / BUY (ongoing) → Autoclicker (one-time).
- **§12 (What This Locks In) — cooldown formula:** `cooldown = 1 / (max(1, count) * base_event_rate)` is replaced by `cooldown = 1 / (level * base_event_rate)`.
- **§12 — phantom-hand floor scoping:** Eliminated. No floor needed.
- **§12 — per-tap earned formula:** `levelMultiplier(level)` is removed from the earned formula. Replaced by `count_multiplier(count)`.
- **§14e (automation curve):** The cooldown-by-count table is superseded by the level-keyed cooldown table above. Automation is now a binary unlock (autoclicker), not a count-scaling curve.
- **§14f (manual-supplementary ratio):** Replaced by the additive manual+autoclicker model. Both use the same formula; manual is always additive on top of autoclicker output, never "fading to supplementary."
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

All other sections of manual-action-ladder (verb roster, balance cells, unlock thresholds, platform affinities, algorithm modifiers) remain in force.

## References

1. `.frames/sdlc/proposals/accepted/manual-action-ladder.md` — the accepted proposal this partially supersedes (§4, §12, §14e, §14f)
2. `.frames/sdlc/proposals/accepted/generator-balance-and-algorithm-states.md` — generator rate table and cost structure
3. `client/src/game-loop/index.ts` — `postClick` implementation with current count-driven cooldown gate
4. `client/src/static-data/index.ts` — generator definitions with `base_event_rate`, `max_level` fields

## Open Questions

1. **Shape of `count_multiplier(count)`.** Is it linear (`count`), exponential (reuse `levelMultiplier` curve applied to count), or something else? The design intent is "each BUY makes taps visibly stronger" but the exact curve affects pacing. **Owner: architect** (formula shape), **game-designer** (pacing feel)

2. **BUY cost formula.** Currently `ceil(base_buy_cost * 1.15^count_owned)`. Does this still make sense when BUY is a manual-yield upgrade rather than an automator purchase? The exponential scaling may need retuning. **Owner: game-designer**

3. **LVL UP cost formula.** Currently `ceil(base_upgrade_cost * levelMultiplier(level+1))`. If level now drives cooldown instead of yield, should the cost curve change to reflect the value of cooldown reduction at each level? **Owner: game-designer**

4. **UX implications for cooldown and autoclicker display.** LVL UP can show a cooldown preview ("400ms -> 200ms"). BUY can show a multiplier preview ("x1 -> x2"). The Autoclicker button needs a cost display and a visual state change once purchased (grayed out / "ACTIVE" badge). The floating-number emission from autoclicker fires needs a UX spec. **Owner: ux-designer**

5. **Autoclicker cost per verb.** What does the one-time autoclicker purchase cost? Should it scale with the verb's tier (chirps cheap, viral_stunts expensive)? Should it gate behind a follower threshold, an engagement cost, or both? **Owner: game-designer**

6. **Autoclicker and offline progression.** Does the autoclicker produce engagement while the player is away? If yes, the offline catch-up formula needs to account for autoclicker state per verb. If no, autoclickers are active-session-only. **Owner: game-designer** (intent), **architect** (implementation)
