---
name: Level Multiplier Curve
description: Defines the shape of level_multiplier(level) used in the generator engagement rate formula.
author: game-designer
status: draft
reviewers: [engineer]
---

# Proposal: Level Multiplier Curve

## Problem

The generator engagement rate formula includes a `level_multiplier(level)` term:

```
effective_rate = count × base_engagement_rate × level_multiplier(level) × algorithm_modifier × clout_bonus
```

The architecture deferred the specific curve shape to design (core-systems.md Open Question #2). Without a defined curve, engineer tasks #22 (Game Loop), #23 (Generator System), and #26 (Economy) cannot be implemented.

## Proposal

### Curve

**Super-exponential (polynomial-exponent) curve:**

```
level_multiplier(level) = 2^(level² / 5)
```

### Value Table

| Level | Multiplier | Phase |
|-------|-----------|-------|
| 1 | 1.15× | Early |
| 2 | 1.74× | Early |
| 3 | 3.5× | Early |
| 4 | 9× | Mid |
| 5 | 32× | Mid |
| 6 | 146× | Mid |
| 7 | 891× | Late |
| 8 | 7,225× | Late |
| 9 | 75,357× | Post-prestige |
| 10 | 1,048,576× | Post-prestige |

### Why This Shape

The `level²` exponent means the growth rate itself accelerates with each level — not just the value. Early levels produce modest, predictable improvements. The curve bends sharply around level 6–7. By level 9+, the numbers become satirically large, which fits the game's tone: your content empire eventually outputs engagement at a scale that makes no human sense.

### Player Feel by Phase

**Early (L1–3): "Nice."**
Multipliers stay below 4×. Upgrades feel like marginal improvements. The player is still learning which generators to invest in. No single generator dominates. Cost of upgrading is low.

**Mid (L4–6): "Oh."**
Multipliers jump from 9× to 146×. A level 5–6 generator is dramatically outperforming an un-upgraded one. The player starts building a strategy around their highest-level generators. Upgrade costs should feel meaningful here — a real commitment.

**Late (L7–8): "Wait."**
A single level 7–8 generator produces nearly 1,000–7,000× its base output. The player's content empire has a clear dominant strategy. This is the "absurd empire" phase of a single run. These levels should require serious investment and mark the natural ceiling before rebrand.

**Post-prestige (L9–10+): "What."**
75,000× to 1,000,000×+. Numbers stop making sense. This territory is unlocked via clout upgrades after at least one rebrand — aspirational, not baseline. The satire lands hardest here.

### Scope: Per-Generator, Independent

Each generator has its own `level` field and scales independently. A level 8 Podcast and a level 2 Meme coexist without interfering. This creates strategic differentiation: players choose which generators to heavily invest in rather than uniformly upgrading everything. This is the correct strategic texture for the mid-to-late game.

### Curve is Tunable

The denominator `5` in `level² / 5` is the single tuning knob. Increasing it slows the bend (later hockey stick); decreasing it sharpens it. This is a 2-way door — adjusting one constant recalibrates the whole curve. Balance testing may warrant a tweak, but the shape is committed.

### Upgrade Costs Must Match

Upgrade costs are not defined in this proposal, but they must match the curve's inflection. A reasonable heuristic: cost to reach level `n` should grow roughly proportionally to `level_multiplier(n)`. If level 7 gives 891× output, level 7 should be expensive enough that it marks a genuine milestone. This is a balance task for engineer/architect to validate during implementation.

## References

1. `.frames/sdlc/architecture/core-systems.md` — Open Question #2, engagement rate formula, Generator data model
2. `.frames/sdlc/proposals/accepted/core-game-identity-and-loop.md` — Generator upgrade tracks, progression pacing, satirical tone intent

## Open Questions

1. **Upgrade cost formula.** The level multiplier curve is defined, but the cost to upgrade from level `n` to `n+1` is not. Costs must scale to match the curve's inflection — otherwise early levels are trivially cheap and late levels are unreachable. **Owner: game-designer** (cost pacing is a balance decision)

---
# Review: architect

**Date**: 2026-04-04
**Decision**: Aligned

**Comments**

Architecturally sound. `2^(level² / 5)` is a pure formula — no data model changes, no new fields. The `level` field already exists on the Generator entity. The formula slots directly into the effective rate calculation already defined in the architecture spec.

One non-blocking note for the engineer: this formula should be extracted as a named pure function (e.g. `levelMultiplier(level: number): number`) rather than inlined at the call site. The game loop tick and any offline balance tooling will both need it — a shared utility prevents drift between implementations.

Open question on upgrade costs is balance work owned by game-designer. The formula itself is independent of upgrade costs and is fully specifiable now. Does not block acceptance.
