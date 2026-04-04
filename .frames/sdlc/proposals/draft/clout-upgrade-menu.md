---
name: Clout Upgrade Menu & Costs
description: Defines the complete Clout upgrade menu — what permanent meta-upgrades exist, what they cost, and how they pace across runs.
author: game-designer
status: draft
reviewers: [architect, engineer]
---

# Proposal: Clout Upgrade Menu & Costs

## Problem

Clout is the prestige currency earned at rebrand. Its meaning is entirely dependent on what it buys. Without a defined upgrade menu, the prestige loop has no destination — players earn Clout but the decision of when to rebrand and what to spend on has no shape.

This proposal defines the full upgrade menu: which upgrades exist, what they cost, and how they pace relative to Clout supply from the rebrand formula (`floor(sqrt(total_followers) / 10)`).

## Proposal

### Design Principles

**First spend validates the rebrand.** The player just wiped their progress. Their first Clout purchase must immediately make the next run feel different. The tier-1 upgrade is the moment the prestige loop proves its promise.

**Modest tier 1, sharp ramp.** Tier 1 costs exactly 10 Clout — achievable on a first good rebrand (10,000 followers). It's a noticeable but not dramatic improvement. Tier 2 costs 3× more and is a genuine power spike. The player learns the loop cheaply, then gets rewarded for mastering it.

**Each upgrade occupies a distinct decision space.** No two upgrades compete for the same goal. Engagement boost, algorithm insight, platform access, and post-prestige generators each serve a different player priority. The choice of where to spend first reveals the player's strategy.

**Post-prestige generators are the aspirational ceiling.** The most expensive upgrades unlock generators that don't exist in the base game. These are the endgame — players who reach them have mastered the system and earned something genuinely new.

---

### Upgrade Menu

#### Engagement Boost
*Multiplies all engagement rates. Stacks multiplicatively across levels.*

| Level | Cost | Cumulative Multiplier | Feeling |
|-------|------|----------------------|---------|
| 1 | 10 Clout | 1.5× | "That run started faster." |
| 2 | 30 Clout | 2.5× | "I'm producing twice as much from the start." |
| 3 | 75 Clout | 5× | "Early game is trivially fast now — I'm playing a different game." |

Total to max: 115 Clout. Requires 4–5 solid rebrands.

**Why three levels:** The multipliers are meaningful at each step. 1.5× is noticeable. 2.5× changes strategy. 5× reshapes what "early game" means entirely — you're spending less time in the grind and more time in the interesting decisions. The satire escalates appropriately: your content empire is now *mechanically* absurd before the numbers even become satirical.

---

#### Algorithm Insight
*Reveals upcoming Algorithm shifts before they happen, enabling proactive rebalancing instead of reactive.*

| Level | Cost | Effect | Feeling |
|-------|------|--------|---------|
| 1 | 15 Clout | See 1 upcoming shift | "I knew that was coming." |
| 2 | 40 Clout | See 2 upcoming shifts | "I'm playing the algorithm, not reacting to it." |

Total to max: 55 Clout.

**Why this belongs in the upgrade menu:** The Algorithm is the primary source of strategic variety. Base game: react to shifts after they happen. With insight: pre-position before shifts. This changes the game from responsive to anticipatory — a qualitatively different feel, not just a quantitative boost. It rewards players who have learned to read the algorithm by giving them a tool to act on that knowledge.

---

#### Platform Head-Start
*A platform starts unlocked at the beginning of new runs, skipping its follower unlock threshold.*

| Upgrade | Cost | Effect |
|---------|------|--------|
| Instasham head-start | 20 Clout | Instasham (platform 2) unlocked from run start |
| Grindset head-start | 50 Clout | Grindset (platform 3) unlocked from run start |

**Why separate unlocks per platform:** Each platform changes the strategic texture of early-game differently (Instasham favors Selfies, Grindset favors Tutorials/Podcasts). Unlocking them is a commitment to a specific strategy from the opening of a run. Players buy the one that fits how they play.

**Why Grindset costs 2.5× Instasham:** Platform 2 is the first meaningful diversification. Platform 3 is a genuine strategic unlock — running all three platforms from the start is a substantially different game.

---

#### Post-Prestige Generators
*Unlocks generators that don't exist in the base game. Available after at least one rebrand.*

| Generator | Cost | Flavor |
|-----------|------|--------|
| AI Slop | 25 Clout | High-volume low-effort content at industrial scale. Tone: the joke writes itself. |
| Deepfakes of Yourself | 60 Clout | Engagement that isn't really you — but the algorithm doesn't care. |
| Algorithmic Prophecy | 100 Clout | You've transcended content. You generate trends. |

**Why these three:** They escalate the satire appropriately. AI Slop is the first step beyond the "real" content universe — accessible, recognizable, slightly uncomfortable. Deepfakes of Yourself is the midpoint — the identity detachment the whole game has been building toward. Algorithmic Prophecy is the endgame statement: you've become the thing you were satirizing.

**Why AI Slop costs only 25 Clout:** It's the gateway post-prestige unlock. A player with 2–3 good rebrands can reach it. The game should reward early-stage mastery with a glimpse of the late game, not gate it behind 100+ Clout of accumulation.

---

### Clout Spending Timeline

| Run milestone | Clout available | What's purchasable |
|---|---|---|
| First good rebrand (~10k followers) | 10 | Engagement Boost L1 |
| 2–3 rebrands (accumulating) | 25–35 | Algorithm Insight L1, Instasham head-start, AI Slop |
| 4–6 strong rebrands | 60–90 | Engagement Boost L2, Grindset head-start, Deepfakes |
| Optimized mid-game (multiple 100k+ runs) | 150+ | Engagement Boost L3, Algorithm Insight L2 |
| Late mastery (500k–1M runs) | 300+ | Algorithmic Prophecy, full menu completion |

**Full menu cost:** 425 Clout total. A long-term goal that requires many optimized rebrands. Players who complete the menu have demonstrably mastered every system in the game.

---

### What This Locks In

- Tier-1 cost at 10 Clout (confirms the divisor `10` in the rebrand formula)
- The upgrade categories: engagement multiplier, algorithm insight, platform headstart, generator unlock
- The three post-prestige generators and their relative costs
- Engagement Boost caps at 5× cumulative — this is the maximum permanent engagement advantage

### What This Leaves Open

- Post-prestige generator stats (base engagement rates, trend sensitivity) — balance task
- Whether additional upgrade tiers are added post-launch — not designed for here
- Visual presentation of the upgrade menu — UX decision

## References

1. `.frames/sdlc/proposals/accepted/clout-to-follower-scaling-curve.md` — rebrand formula, Clout supply table, divisor `10` calibration
2. `.frames/sdlc/proposals/accepted/core-game-identity-and-loop.md` — Section 7 (The Rebrand), upgrade category definitions, post-prestige generator list
3. `.frames/sdlc/architecture/core-systems.md` — CloutUpgrade data model, UpgradeEffect tagged union

## Open Questions

1. **Post-prestige generator stats.** AI Slop, Deepfakes, and Algorithmic Prophecy need base engagement rates and trend sensitivity values before they can be implemented. These should scale beyond Viral Stunts to justify the Clout cost. **Owner: game-designer** (balance decision, separate task — does not block this proposal)
