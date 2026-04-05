---
name: Clout Upgrade Menu & Costs
description: Defines the complete Clout upgrade menu — what permanent meta-upgrades exist, what they cost, and how they pace across runs.
created: 2026-04-04
author: game-designer
status: accepted
reviewers: []
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

1. [RESOLVED] **Post-prestige generator stats.** AI Slop, Deepfakes, and Algorithmic Prophecy need base engagement rates and trend sensitivity values before they can be implemented. These should scale beyond Viral Stunts to justify the Clout cost. **Owner: game-designer** (balance decision, separate task — does not block this proposal)
   - **Answer:** Stats defined below. `base_engagement_rate` values are expressed as multipliers relative to Viral Stunts (tier 7) — absolute values require calibration against the full generator balance table, which is a separate build task.

### Post-Prestige Generator Stats

| Generator | base_engagement_rate | follower_conversion_rate | trend_sensitivity | Character |
|---|---|---|---|---|
| AI Slop | 8× Viral Stunts | 0.6 | 0.1 | High volume, algorithm-agnostic. Wins by not caring what's trending. |
| Deepfakes of Yourself | 15× Viral Stunts | 0.3 | 0.95 | Extremely volatile. Dominant in favorable states, mediocre otherwise. Synergizes with Algorithm Insight. |
| Algorithmic Prophecy | 40× Viral Stunts | 0.5 | 0.5 | Massive and consistent. Not volatile, not immune — just absurd. The numbers stop making sense. |

**Design notes:**

**AI Slop** has the lowest trend sensitivity in the game (0.1 — nearly immune). It mechanically expresses "indiscriminate content": it neither benefits from favorable algorithm states nor collapses in unfavorable ones. The high follower conversion (0.6) reflects that volume reliably breeds audience even without quality. This is the accessible post-prestige unlock — powerful, readable, not complex.

**Deepfakes of Yourself** has the highest trend sensitivity in the game (0.95). In a favorable algorithm state it outperforms AI Slop significantly. In an unfavorable one it's underwhelming despite its high base rate. The low follower conversion (0.3) reflects that controversy generates engagement but not loyalty — you go viral but you don't build a lasting audience. This generator is the mechanical argument for Algorithm Insight: players who own both are playing a more interesting game.

**Algorithmic Prophecy** is the endgame. 40× Viral Stunts base rate is satirically large by design — the game has been escalating toward this number since the opening click. Medium trend sensitivity (0.5) and medium conversion (0.5) make it neither the volatile superstar (Deepfakes) nor the stable workhorse (AI Slop) — it's simply enormous. The humor is that at this scale, the other numbers stop mattering.

**On `unlock_threshold`:** Post-prestige generators are unlocked via Clout purchase (`generator_unlock` effect), not via follower threshold. Their `unlock_threshold` in static data should be `0` — the Clout upgrade sets `owned: true` directly. The architect should confirm this is the correct wiring in the data model.
   - **Architect answer (2026-04-04):** `unlock_threshold: 0` is incorrect — the normal unlock check is `total_followers >= unlock_threshold`, so a threshold of 0 means "unlocks immediately for everyone." The correct wiring: post-prestige generators have no entry in `unlockThresholds` in static data (sentinel: `null` or `Infinity`) so they are never follower-unlocked. `applyRebrand` re-applies `generator_unlock` Clout effects after resetting generators to unowned — iterating `player.clout_upgrades` and setting `generators[generator_id].owned = true` for each `generator_unlock` effect. On first purchase, the same re-application runs immediately. Architecture doc updated.

---
# Review: engineer

**Date**: 2026-04-04
**Decision**: Aligned

**Comments**

The architect's review closed the key gaps before this reached me — UpgradeEffect per-level arrays, generator unlock wiring, and `upcoming_states` on `AlgorithmState` are all clean and implementable. No blocking concerns.

**Non-blocking: post-prestige generator buy/upgrade costs are missing.**

The proposal defines `base_engagement_rate`, `follower_conversion_rate`, and `trend_sensitivity` for AI Slop, Deepfakes, and Algorithmic Prophecy. It does not define `base_buy_cost` or `base_upgrade_cost`. The Generator Balance proposal explicitly defers these stats to this proposal, so neither document covers it.

If post-prestige generators are buyable in units and upgradeable (same system as base generators), I need these costs before implementation. If `generator_unlock` grants exactly one permanent unit with no further buy/upgrade path, that should be stated explicitly and reflected in the architecture.

This does not block accepting this proposal. It does block implementing the post-prestige generators. Recommend adding costs to the Generator Balance proposal or filing a follow-up design task before the build task lands.

---
# Review: architect

**Date**: 2026-04-04
**Decision**: Aligned

**Comments**

The design is architecturally sound and maps cleanly onto the existing data model. Three items required architecture doc corrections; one non-blocking note for the engineer.

**1. UpgradeEffect multi-level values — architecture fix.**

The existing `UpgradeEffect` union defines `{ type: "engagement_multiplier", value: float }` and `{ type: "algorithm_insight", lookahead: int }` — single values. Engagement Boost's cumulative multipliers (1.5×, 2.5×, 5×) are non-uniform across levels, and Algorithm Insight's lookahead (1, 2) varies by level. A single `value` field can't represent this.

Fix applied in architecture doc: per-level arrays on the effect definition.
- `{ type: "engagement_multiplier", values: float[] }` — indexed by `level - 1`
- `{ type: "algorithm_insight", lookaheads: int[] }` — indexed by `level - 1`

Game loop reads `values[player.clout_upgrades[upgrade_id] - 1]` to resolve the current effective value.

**2. Post-prestige generator unlock wiring — answered above in Open Questions.**

See the answer inline under the open question. Architecture doc updated with the correct wiring: no follower-based threshold, `applyRebrand` re-applies `generator_unlock` effects.

**3. AlgorithmState needs `upcoming_states` field — architecture addition.**

Algorithm Insight requires the UI to show 1–2 upcoming Algorithm shifts. The current `AlgorithmState` has no field for this. Added `upcoming_states: AlgorithmStateId[]` to the data model — populated by the game loop based on the player's current `algorithm_insight` level (empty array if the upgrade is not owned). Architecture doc updated.

**4. Non-blocking: suggested static data IDs for the engineer.**

The engineer will need concrete string identifiers. Suggested IDs (internal labels, no design impact):
- Upgrades: `engagement_boost`, `algorithm_insight`, `instasham_headstart`, `grindset_headstart`, `ai_slop_unlock`, `deepfakes_unlock`, `algorithmic_prophecy_unlock`
- Generators: `ai_slop`, `deepfakes`, `algorithmic_prophecy`

These are new entries in existing static data tables — no structural change required.
