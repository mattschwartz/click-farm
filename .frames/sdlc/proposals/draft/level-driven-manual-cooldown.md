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

#### 4. Autoclickers (repeatable purchase per verb)

The player can buy multiple autoclickers per verb. Each autoclicker is an independent auto-tapper that fires on a loop, generating engagement passively. Each purchase gets progressively more expensive.

**Key rules:**

- **Every time an autoclicker fires, the verb's action button emits a floating number** showing the engagement generated — identical visual feedback to manual taps. More autoclickers = more pops on the button. The player sees their little army firing off.
- **Autoclickers fire at the verb's base cooldown (L1 speed), not the player's leveled-up cooldown.** LVL UP only makes the player's hand faster — autoclickers stay at base speed. This creates a clear quality-vs-quantity split: the player's hand is always the premium path, autoclickers are the bulk path.
- **Autoclickers benefit from BUY (count-driven yield multiplier).** Each autoclicker fire uses the same yield formula as manual taps, so BUY upgrades strengthen both the player's hand and all autoclickers equally.
- **Manual taps are additive on top.** The player's hand and the autoclickers coexist. The player is never replaced — they're always adding to the army's output.

**Autoclicker internal cooldown (fixed at base):**

```
autoclickerCooldownMs = 1000 / base_event_rate
```

This is the L1 cooldown — the slowest the verb can be. Autoclickers never speed up from leveling. A player at L10 chirps taps at 0ms cooldown while each autoclicker still fires at 2,000ms. The player is 10× faster than any one worker, but 10 workers still add up.

**Autoclicker engagement per fire:**

```
earned = base_event_yield * count_multiplier(buy_count) * algoMod * clout_bonus * kit_bonus
```

Same yield formula as manual taps. The only difference is the cooldown: manual uses `level * base_event_rate`, autoclickers use `base_event_rate` alone.

**Strategic tension:** "Do I LVL UP to tap faster, BUY to tap harder, or get another autoclicker for passive income?" Three distinct investment axes, three distinct feelings. LVL UP is active-play-premium (only the player benefits). BUY is universal (everything gets stronger). Autoclickers are the idle-income path (quantity over quality).

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

- **§4 (Automate teaching moment):** Replaced by the Autoclicker one-time purchase described above. The Unlock → Upgrade → Automate lifecycle per verb is replaced by: Unlock → LVL UP / BUY (ongoing) → Autoclicker (one-time).
- **§12 (What This Locks In) — cooldown formula:** `cooldown = 1 / (max(1, count) * base_event_rate)` is replaced by `cooldown = 1 / (level * base_event_rate)`.
- **§12 — phantom-hand floor scoping:** Eliminated. No floor needed.
- **§12 — per-tap earned formula:** `levelMultiplier(level)` is removed from the earned formula. Replaced by `count_multiplier(count)`.
- **§14e (automation curve):** The cooldown-by-count table is superseded by the level-keyed cooldown table above. Autoclickers run at fixed base cooldown, not count-scaled cooldown.
- **§14f (manual-supplementary ratio):** The old ratio assumed count-driven cooldown shrinking manual's relative share. With level-driven manual cooldown and fixed-speed autoclickers, the ratio depends on level (bounded) vs autoclicker count (unbounded). At max level, the player taps at L10 speed; N autoclickers each tap at L1 speed. Manual share = L10_rate / (L10_rate + N × L1_rate). The player's hand fades as autoclicker army grows, but is always the single fastest tapper.
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

5. **Autoclicker cost scaling.** Each autoclicker purchase gets more expensive. What's the cost formula? Reuse the existing `ceil(base_cost * 1.15^owned)` curve, or a different escalation? The base cost per verb tier also needs defining (chirps cheap, viral_stunts expensive). **Owner: game-designer**

6. **Autoclicker and offline progression.** Do autoclickers produce engagement while the player is away? If yes, the offline catch-up formula needs to account for autoclicker count per verb. If no, autoclickers are active-session-only. **Owner: game-designer** (intent), **architect** (implementation)

7. **Autoclicker firing pattern with multiple workers.** Do N autoclickers fire simultaneously every `base_cooldown` ms (burst), or are they staggered evenly across the interval (smooth)? Staggered creates a steadier stream of floating numbers; burst creates periodic "volleys." Both are valid feels. **Owner: game-designer** (feel), **ux-designer** (visual rhythm)
