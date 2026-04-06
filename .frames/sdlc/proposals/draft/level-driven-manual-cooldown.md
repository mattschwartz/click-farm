---
name: Level-Driven Manual Cooldown
description: Swap manual cooldown from count-driven to level-driven so that LVL UP makes tapping faster and BUY purely adds passive workers.
created: 2026-04-06
author: game-designer
status: draft
reviewers: [architect, engineer]
---

# Proposal: Level-Driven Manual Cooldown

## Problem

The manual-action-ladder's cooldown formula ties tapping speed to automator count:

```
cooldownMs = 1000 / (max(1, count) * base_event_rate)
```

This means **BUY** (which increases count) makes the player's manual tapping faster, while **LVL UP** (which increases level) only makes each tap worth more engagement. From the player's perspective, this mapping is backwards:

- "I leveled up my chirping... why didn't I get faster?" LVL UP should feel like personal improvement — stronger AND faster.
- "I bought another automator... why am I tapping faster?" BUY should feel like hiring a worker — more passive output, not a change to what my hands do.

The current mapping is architecturally clean but emotionally wrong. Player intuition expects leveling up to make them better at doing the thing. Buying more units should grow the team, not change the player's personal ability.

## Proposal

### Swap the cooldown driver from count to level

**New formula:**

```
cooldownMs = 1000 / (level * base_event_rate)
```

**What changes:**

| Surface | Before (count-driven) | After (level-driven) |
|---|---|---|
| Manual cooldown | `1000 / (max(1, count) * base_event_rate)` | `1000 / (level * base_event_rate)` |
| LVL UP effect | Yield multiplier only | Yield multiplier + cooldown reduction |
| BUY effect | Passive throughput + cooldown reduction | Passive throughput only |
| Phantom-hand floor | Required (`max(1, count)` at count=0) | Not needed (level is always >= 1) |
| Cooldown floor | Asymptotic toward 0.01s hard floor | Caps at max_level (known minimum per verb) |

**What stays the same:**

- Passive production formula: `count * base_event_rate * base_event_yield * levelMultiplier(level) * algoMod * clout * kit` — unchanged.
- Per-tap earned formula: `base_event_yield * levelMultiplier(level) * algoMod * clout_bonus * kit_bonus` — unchanged.
- All balance cells (yield, rate, costs, thresholds, algorithm modifiers, platform affinities) — unchanged.
- The 0.01s hard cooldown floor — still exists as a safety clamp, but most verbs can't reach it since level caps at 10.

### Cooldown progression per verb at each level

Level starts at 1, max is 10. Each level halves, thirds, etc. of the base cooldown:

| Verb | L1 (base) | L2 | L5 | L10 (max) |
|---|---|---|---|---|
| chirps | 400ms | 200ms | 80ms | 40ms |
| selfies | 2,500ms | 1,250ms | 500ms | 250ms |
| livestreams | 10,000ms | 5,000ms | 2,000ms | 1,000ms |
| podcasts | 30,303ms | 15,151ms | 6,060ms | 3,030ms |
| viral_stunts | 120,482ms | 60,241ms | 24,096ms | 12,048ms |

Each LVL UP is directly felt in the player's hand. The progression is bounded and predictable — no asymptotic tail chasing an infinitesimal floor.

### Why this is better

1. **Matches player intuition.** "Level up = I get better" is universal game literacy. Every RPG, every upgrade system, every skill tree works this way. Fighting the convention costs us a teaching moment on every single verb unlock.

2. **Clean narrative split.** LVL UP = "I personally improve at this verb" (faster + stronger). BUY = "I hire more workers" (passive output scales). Two buttons, two stories, zero overlap.

3. **Bounded cooldown.** Level caps at 10, so cooldown has a known floor per verb. No more asymptotic shrink toward 0.01s as count grows unboundedly. The designer can predict exact cooldown at every level. The UX can show a clean progression bar.

4. **Eliminates the phantom-hand floor.** `max(1, count)` was needed because count=0 is a valid pre-Automate state and cooldown can't be infinite. Level is always >= 1, so the formula just works. One fewer special case in the codebase.

5. **LVL UP becomes the dual-payoff button.** The manual-action-ladder's original "dual payoff" teaching moment (one purchase improves two things simultaneously) is preserved — it just moves from BUY to LVL UP, where players expect it.

### Supersession

This proposal supersedes the following sections of `proposals/accepted/manual-action-ladder.md`:

- **§4 (Automate teaching moment):** The "first BUY halves your cooldown" dual payoff becomes "first LVL UP halves your cooldown." The teaching moment survives; the trigger changes.
- **§12 (What This Locks In) — cooldown formula:** `cooldown = 1 / (max(1, count) * base_event_rate)` is replaced by `cooldown = 1 / (level * base_event_rate)`.
- **§12 — phantom-hand floor scoping:** No longer needed. The `max(1, count)` floor and its passive-production scoping caveat are eliminated entirely.
- **§14e (automation curve):** The cooldown progression table keyed by count is superseded by the level-keyed progression table above.
- **§14f (manual-supplementary ratio):** The ratio formula `100 / (N * base_event_rate)` where N=count needs rework. With level-driven cooldown, the supplementary ratio depends on level (bounded) rather than count (unbounded). At max level, manual output per second = `(1/cooldown) * base_event_yield * levelMultiplier(level)`. The 10% ceiling still holds structurally but the count at which it kicks in changes.
- **Architect re-review (OQ16):** The phantom-hand floor approval and passive-production scoping clarification are moot — the floor is gone.

The `postClick` cooldown gate signature changes:

```
// Before:
const cooldownMs = 1000 / (Math.max(1, genState.count) * def.base_event_rate);

// After:
const cooldownMs = 1000 / (genState.level * def.base_event_rate);
```

All other sections of manual-action-ladder remain in force.

## References

1. `.frames/sdlc/proposals/accepted/manual-action-ladder.md` — the accepted proposal this partially supersedes (§4, §12, §14e, §14f)
2. `.frames/sdlc/proposals/accepted/generator-balance-and-algorithm-states.md` — generator rate table and cost structure (unchanged by this proposal)
3. `client/src/game-loop/index.ts` — `postClick` implementation with current count-driven cooldown gate
4. `client/src/static-data/index.ts` — generator definitions with `base_event_rate`, `max_level` fields

## Open Questions

1. **§14f supplementary ratio rework.** With level-driven cooldown, manual throughput at max level is fixed (not count-dependent). The "manual fades to 10% of passive" dynamic now depends on count growing past a threshold while level is capped. The structural 10% ceiling should still hold but the table needs recalculating. **Owner: game-designer**

2. **UX implications for cooldown display.** If cooldown is level-driven, the LVL UP button can show "cooldown: Xms -> Yms" as a preview. This is a cleaner affordance than count-driven cooldown (where the player wouldn't associate BUY with tapping speed). Should the UX spec reflect this? **Owner: ux-designer**
