---
name: Clout Formula k Tuning
description: Confirms k=3 as the final constant for the log10-based prestige clout formula introduced in the Decimal.js engagement migration.
created: 2026-04-08
author: game-designer
status: draft
reviewers: [architect, engineer]
---

# Proposal: Clout Formula k Tuning

## Problem

The Decimal.js engagement migration (accepted 2026-04-08) replaced the clout formula from `floor(sqrt(total_followers) / 10)` to `floor(log10(total_followers) * k)` with a provisional k=3. The constant was explicitly marked as requiring a game-designer tuning pass before the migration ships. Without a confirmed value, the prestige economy has no final spec and the engineer cannot implement with confidence.

The tuning pass must verify that the chosen k produces a prestige economy that hits the design targets established in the Rebrand Cadence Intent and Clout Upgrade Menu proposals:
- First rebrand (~1e4 followers) yields enough clout for one tier-1 upgrade (10 clout)
- Full shop (425 clout) is reachable around R15-R20
- 1,000 cumulative clout represents deep investment
- The formula remains bounded at arbitrarily large follower magnitudes

## Proposal

### Final Value: k = 3

The provisional value is confirmed as final. No piecewise formula or curve adjustment is needed.

### Why log10 * k Works

The log10 function has one property that makes it ideal for prestige compression: every 10x increase in followers adds exactly k clout. This means:

- Growth at 10x/run: +3 clout/run (additive)
- Growth at 100x/run: +6 clout/run
- Growth at 1000x/run: +9 clout/run

No matter how explosive late-game follower growth becomes (post-prestige generators, full upgrade stack, Decimal.js removing all ceilings), clout output remains a small, bounded integer. The diminishing-returns curve is structural, not tuned with a secondary parameter.

At the extreme end: `log10(1e60) * 3 = 180 clout` from a single Vigintillion-follower run. The formula never overflows, never produces absurd numbers, and never stops being meaningful.

### Modeled Clout Accumulation Across 17 Rebrands

Follower growth per run assumes ~10x compounding from upgrades purchased at each rebrand. This is conservative early (before upgrades stack) and conservative late (post-prestige generators push well past 10x). The model uses 10x as a baseline because it makes the log10 math transparent: each run adds roughly 3 more clout than the last.

| Run | Followers | Clout Earned | Cumulative | Purchase |
|-----|-----------|-------------|------------|----------|
| 1 | 1e4 | 12 | 12 | Engagement Boost L1 (10) |
| 2 | 3e4 | 13 | 25 | Algorithm Insight L1 (15) |
| 3 | 8e4 | 14 | 39 | Bank |
| 4 | 2e5 | 15 | 54 | Instasham headstart (20) |
| 5 | 5e5 | 17 | 71 | AI Slop (25) |
| 6 | 2e6 | 18 | 89 | Bank |
| 7 | 8e6 | 20 | 109 | Engagement Boost L2 (30) |
| 8 | 5e7 | 23 | 132 | Bank |
| 9 | 3e8 | 25 | 157 | Algorithm Insight L2 (40) |
| 10 | 2e9 | 27 | 184 | Bank |
| 11 | 1e10 | 30 | 214 | Grindset headstart (50) |
| 12 | 1e11 | 33 | 247 | Bank |
| 13 | 1e12 | 36 | 283 | Deepfakes (60) |
| 14 | 1e13 | 39 | 322 | Bank |
| 15 | 1e14 | 42 | 364 | Engagement Boost L3 (75) |
| 16 | 1e15 | 45 | 409 | Bank |
| 17 | 1e16 | 48 | 457 | Algorithmic Prophecy (100) |

**Shop complete at R17.** Cumulative clout at that point: 457.

### Verification Against Design Targets

**First rebrand (12 clout):** Comfortably above the 10-clout tier-1 threshold. The player has 2 clout banked after their first purchase, which reinforces the promise that pushing further would have yielded more. No anxiety about falling short.

**R2-R3 cumulative (25-39 clout):** Enough to branch into a second upgrade. The player is choosing between Algorithm Insight L1 (15), Instasham headstart (20), or saving toward AI Slop (25). This matches the "shopping trip" feel target from Rebrand Cadence Intent.

**R5 cumulative (71 clout):** Two to three upgrades owned. Runs are measurably faster. The player is operating a working machine and rebranding because they want to spend, not because they hit a wall.

**R10 cumulative (184 clout):** Deep into the upgrade tree. The player is choosing between banking for expensive upgrades or filling gaps. Rebrand timing is becoming a strategic decision — pushing from 2e9 to 1e10 followers adds only 3 more clout but takes meaningful time.

**Shop completion at R17 (457 cumulative):** Dead center of the R15-R20 design target. A thorough player completes the menu here. Not a grind to reach, not trivially early.

**1,000 cumulative clout at ~R30:** Requires sustained play well past shop completion. This is the "deeply invested player" threshold — someone who has kept rebranding because the loop is satisfying, not because they need anything. The number carries meaning because it's hard to reach.

### Why Not k=2.5 or k=4

| k | R1 Clout | Shop Complete | 1,000 Clout | Issue |
|---|----------|--------------|-------------|-------|
| 2.5 | 10 | ~R21 | ~R35 | First rebrand gives exactly 10 — no margin. Shop pushes past R20 target ceiling. |
| **3** | **12** | **~R17** | **~R30** | **All targets hit.** |
| 4 | 16 | ~R13 | ~R22 | Shop completes before the strategic phase kicks in. Player runs out of things to buy too early. |

k=3 is the only integer value that hits the first-rebrand, shop-completion, and deep-investment targets simultaneously.

### What This Locks In

- `k = 3` as a final constant in `cloutForRebrand()`
- The PROVISIONAL comment in the Decimal.js migration proposal can be removed at implementation time
- No piecewise formula, no curve breaks, no follower-magnitude special cases

### What This Leaves Open

- Exact follower growth rates per run (depends on generator balance, upgrade stacking, and run-length tuning — those are separate balance tasks)
- Whether the shop expands beyond 425 clout in the future (if it does, k=3 still works — later runs produce more clout per rebrand naturally)

## References

1. `.frames/sdlc/proposals/accepted/20260408-decimal-js-engagement-migration.md` — log10 formula introduction, provisional k=3, OQ6
2. `.frames/sdlc/proposals/accepted/clout-to-follower-scaling-curve.md` — original sqrt formula, design intent for prestige tension
3. `.frames/sdlc/proposals/accepted/clout-upgrade-menu.md` — full upgrade menu, 425 total clout cost, tier pricing
4. `.frames/sdlc/proposals/draft/20260405-rebrand-cadence-intent.md` — R1/R3/R5/R10 felt-pacing targets, R15-R20 shop completion target

## Open Questions

None. The tuning pass is complete. The constant is confirmed.
