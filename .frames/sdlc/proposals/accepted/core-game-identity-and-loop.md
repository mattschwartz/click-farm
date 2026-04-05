---
name: Core Game Identity & Loop
description: Defines the fantasy, tone, core loop, progression arc, economy, and prestige mechanic for Click Farm as a satirical social media clicker game.
created: 2026-04-04
author: game-designer
status: accepted
reviewers: []
---

# Proposal: Core Game Identity & Loop

## Problem

Click Farm has a name, a genre (social media clicker), and an intended stack — but no defined game identity. Without alignment on what the game *is*, what it *feels like*, and how its core systems interact, every downstream decision (architecture, UI, content) will be made in a vacuum and will contradict each other within a few sessions.

This proposal establishes the foundational design: the player fantasy, tone, core loop, progression structure, economy, and prestige mechanic. Everything else builds on top of this.

## Proposal

### 1. Fantasy & Tone

**The fantasy:** You are a nobody who discovers you can game the social media algorithm. You start by posting into the void. You end as an unstoppable content empire — not because your content is good, but because you've mastered the system. The joke is that the content never mattered. The algorithm did.

**The tone:** Satirical comedy. Affectionate, not cynical. The game pokes fun at influencer culture, engagement metrics, algorithmic feeds, and the absurdity of "going viral" — but it does so from a place of amusement, not contempt. Think Cookie Clicker's deadpan absurdity applied to social media. The humor escalates with progression: early game is relatable (posting selfies, refreshing for likes), late game is absurd (your AI-generated content empire spans twelve platforms and you've algorithmically manufactured three cultural movements this week).

**Target aesthetics (MDA):**
- **Discovery:** "Wait, I can do *that*?" — finding new interactions between systems
- **Expression:** Building *your* content empire your way — which platforms, which strategy
- **Submission:** The satisfying trance of numbers climbing and systems humming — the reason clicker games work

### 2. Core Loop

> **[EXTENDED by `proposals/accepted/manual-action-ladder.md` — 2026-04-05]** The "click to post" active input is extended into a **rotating ladder of content-medium verbs** (chirps → selfies → livestreams → podcasts → viral_stunts), each unlocked via engagement thresholds and independently Upgraded/Automated. The "auto-poster" is per-verb: each ladder rung gets its own automator that takes over that verb's cadence while the player's hand migrates to the next rung. The early-game beat reads as: "Tap Chirp. Watch engagement accumulate. Unlock Selfies. Automate Chirp so it runs on its own while your hand moves up the ladder." The three-beat structure below (Post → Engage → Grow) remains correct at the system level; the "Post" beat is now a menu of verbs rather than a single button. Historical text below preserved for context.

The core loop has three beats:

1. **Post** (active input) → Player clicks to create content. Each click = one post.
2. **Engage** (conversion) → Posts generate Engagement (likes, shares, comments) based on content type, platform, and current trends.
3. **Grow** (accumulation) → Engagement converts into Followers over time. Followers are the primary progression metric and unlock new systems.

As the player progresses, the loop shifts from manual clicking to strategic management:
- **Early game:** Click to post. Watch likes come in. Buy your first auto-poster.
- **Mid game:** Manage multiple content types across multiple platforms. Chase trends. Optimize your content mix for the current algorithm.
- **Late game:** Orchestrate a content empire. Engineer viral moments. Manipulate the algorithm itself.

This mirrors the clicker genre's natural arc from active to idle to strategic, but the social media theme gives each phase a distinct narrative flavor rather than just "bigger numbers."

### 3. Generators

Generators are content types that auto-produce Engagement. Unlocked progressively:

| Order | Generator     | Flavor                                      |
|-------|---------------|----------------------------------------------|
| 1     | Selfies       | Low effort, low yield — everyone starts here |
| 2     | Memes         | Higher variance, trend-sensitive             |
| 3     | Hot Takes      | High engagement, risk of backlash           |
| 4     | Tutorials     | Steady, reliable, boring                     |
| 5     | Livestreams   | High yield, requires active attention        |
| 6     | Podcasts      | Slow build, compounding returns              |
| 7     | Viral Stunts  | Massive spikes, cooldown period              |
| 8+    | Unlocked via prestige — increasingly absurd (AI Slop, Deepfakes of Yourself, Algorithmic Prophecy) |

Each generator has:
- A **base engagement rate**
- A **follower conversion rate**
- **Upgrade tracks** (quality, frequency, platform optimization)
- **Trend sensitivity** — how much the current trend affects output (high for memes, low for tutorials)

### 4. The Algorithm (Key Differentiator)

The Algorithm is a shifting modifier that changes which content types and strategies perform best. It is the primary source of strategic variety.

- The Algorithm has a visible **state** that changes on a soft timer (not a hard clock — the shift window is fuzzy to prevent clock-watching)
- Each state favors certain content types and penalizes others (e.g., "Short-Form Surge" boosts Memes and Hot Takes, reduces Tutorials and Podcasts)
- Players can **read** the algorithm state and **react** by rebalancing their content mix
- Late-game upgrades let players **influence** the algorithm — not control it, but nudge it
- This creates strategic decisions without variable-ratio reward schedules — the variance is in the environment, not the reward, so the player is solving a puzzle rather than pulling a slot machine

### 5. Platforms

Platforms are parallel progression tracks that multiply output. Each platform has:
- A **follower count** (independent per platform)
- A **content affinity** — which generators perform best on it
- An **unlock threshold** based on total followers

Starting platform: a generic feed (think early Twitter). Later platforms introduce mechanical variety — a photo platform favors Selfies, a video platform favors Livestreams, a professional platform favors Tutorials. Cross-posting across platforms with the right content mix creates multiplicative returns — this is where emergence lives.

### 6. Economy

Three currencies, each in a distinct decision space:

| Currency    | Faucet                      | Drain                                    | Decision Space                    |
|-------------|------------------------------|------------------------------------------|------------------------------------|
| Engagement  | Posting content (click + idle) | Buying upgrades, unlocking platforms     | Immediate spending vs. saving for bigger unlocks |
| Followers   | Engagement conversion         | Algorithm shifts, Scandals (event system) | Which platforms to grow, when to diversify |
| Clout       | Rebranding (prestige reset)   | Permanent meta-upgrades                  | When to prestige, which permanent upgrades to prioritize |

**Engagement** is the workhorse currency — earned constantly, spent constantly. Fast faucet, fast drain.

**Followers** are the progression metric — they unlock things but can also be lost. Slower cycle. The fact that followers can decrease (algorithm shifts, scandals) means the player has to actively maintain their empire, not just accumulate passively. This prevents late-game stagnation.

**Clout** is the prestige currency — earned only through rebranding, spent on permanent upgrades. Very slow cycle. This is the long-term strategic layer.

### 7. Prestige: The Rebrand

The prestige mechanic is **Rebranding**. You wipe your accounts, reset your followers and engagement to zero, and start fresh — but you keep your Clout.

**Why it fits the theme:** Rebranding is something real influencers actually do. The narrative framing is: "You've learned everything this identity can teach you. Time to reinvent yourself." Each rebrand represents a deeper understanding of how the system works. The content was never the point. The system mastery was.

**Clout scales with total followers at time of rebrand.** This creates the classic prestige tension: rebrand now for a small Clout boost, or push further for a bigger one but with diminishing returns on your current run.

**Clout buys permanent meta-upgrades:**
- Faster engagement rates across all runs
- New generator types (the absurd late-game ones)
- Algorithm insight (see upcoming shifts earlier)
- Platform head-starts (begin new runs with platforms pre-unlocked)

### 8. The Engagement Line

This game satirizes manipulative social media patterns. It must not employ them.

**Off the table:**
- No real-money transactions of any kind — this is not a mobile F2P game
- No daily login bonuses or streak penalties
- No time-limited events that create FOMO
- No notifications that pull the player back through guilt or urgency
- No loot boxes or randomized purchases

**The three-question test:**
1. *Is every mechanic honest?* Yes — the game shows you how the algorithm works and lets you respond. No hidden systems.
2. *Can the player quit without loss?* Yes — there is no punishment for not playing. Idle gains accumulate but nothing decays while offline.
3. *Is progression tied to engagement, not just time?* Yes — active play and strategic decisions always outpace pure idle accumulation.

**Design note:** The "Scandals" and follower-loss mechanics must be carefully tuned. Losing followers while actively playing is a strategic challenge. Losing followers while offline would feel punitive. **Rule: No negative events fire while the player is offline.** The game state freezes favorably when you close it.

### 9. Key Design Tradeoff: Satire vs. Straight

The main alternative considered was playing the social media theme straight — an earnest empire-builder where you're building a legitimate media brand. This approach would have broader appeal and avoid the risk of the satire feeling mean-spirited.

**Why satire wins:**
- The name "Click Farm" already promises it — playing it straight against that name would feel dishonest
- Satire gives the escalating absurdity of clicker games a narrative reason to exist (Cookie Clicker works because the absurdity *is* the joke — Click Farm should do the same)
- An earnest social media simulator competes with actual social media for the same dopamine; a satirical one offers *commentary* on that dopamine, which is a distinct and more defensible niche
- The humor provides a reason to keep playing beyond numbers — players want to see what absurd thing comes next

**What this locks in:** The game's voice, content naming, visual style, and narrative arc all commit to comedic satire. Reversing this later would require reworking most player-facing content.

**What this leaves open:** Specific content names, exact generator stats, platform specifics, visual style, UI patterns, technical architecture — all downstream decisions that build on this foundation.

## References

1. `CLAUDE.md` — project description and intended stack (client: Vite + React + TypeScript; server deferred)
2. MDA Framework (Hunicke, LeBlanc, Zubek, 2004) — aesthetic-first design methodology referenced in game-designer role
3. Cookie Clicker (Orteil, 2013) — primary genre reference for escalating absurdity and idle-to-strategic arc
4. Universal Paperclips (Lantz, 2017) — reference for narrative discovery through systems
5. Adventure Capitalist (Hyper Hippo, 2014) — reference for prestige loop and multi-track progression

## Open Questions

1. [RESOLVED] **How should the UI represent the Algorithm state?** This is a UX question — the game designer defines that the algorithm is visible and reactive, but how it's displayed on screen (ambient visualization? explicit dashboard? somewhere in between?) is a UX decision. **Owner: ux-designer**
   - **Answer:** An ambient weather-like metaphor. Each Algorithm state has a name and visual mood (color palette shift, background motion, iconography). A subtle instability indicator builds as a shift approaches — visual tension like clouds gathering, not a countdown. On shift: visible environmental transition with affected generators showing a brief visual pulse. See ux-designer review for full spec.
2. [RESOLVED] **What is the technical architecture for the algorithm shift system?** Server-side timer? Client-side with seed? This affects whether players can predict/manipulate shifts in unintended ways. **Owner: architect**
   - **Answer:** Client-side with a seeded PRNG. The seed determines the full shift schedule deterministically — works offline, is reproducible for debugging, requires no server polling. The fuzzy window is a base interval ± a seeded random offset. If leaderboards or social features come later, the seed can be server-issued without changing shift logic. See architect review for full spec.
3. [RESOLVED] **How many platforms at launch?** This is a scoping question that depends on implementation complexity. The design supports 3-6 but the right number depends on what's buildable. **Owner: architect**
   - **Answer:** 3 platforms. Cross-posting needs at least 3 for interesting tradeoffs (2 is binary). Each platform carries its own follower count, content affinity, and unlock threshold. A 4th can be added post-launch without structural changes if the platform entity is well-defined.
4. [RESOLVED] **Should idle gains be calculated on-open or tick in background?** Affects architecture and player experience of returning to the game. **Owner: architect**
   - **Answer:** Calculate-on-open. Standard for the genre. The "no negative events offline" rule makes it clean: `time_elapsed × production_rate_at_close`. Algorithm state advances while offline (the seed makes this deterministic), but no negative effects from shifts fire until the player returns.
5. [RESOLVED] **What does "going viral" look like on screen?** The moment a post goes viral is the game's peak emotional beat — it needs to feel explosive and surprising. How to deliver that visually is a UX question. **Owner: ux-designer**
   - **Answer:** A sustained 5-10 second cascade event. Engagement counter visibly accelerates in real-time, screen energy escalates (particle burst, subtle shake, generator glow), a distinct sound signature cuts through ambient audio. The payoff is watching the cascade unfold, not seeing a result after the fact. See ux-designer review for full spec.

---

# Review: architect

**Decision**: Aligned
**Three-currency economy.** The three currencies map cleanly to three distinct lifecycle speeds (fast/medium/slow), which avoids storage and update contention. The directional pipeline (Engagement → Followers → Clout) is sound. Two structural commitments worth flagging:
- Per-platform follower counts make Platform a full sub-entity with its own state, not just a multiplier. This is the heaviest data model decision in the proposal.
- Engagement-to-follower conversion is context-dependent (algorithm state, platform affinity, generator type) — this multi-input formula will need a clean contract.

Neither is a problem, but both are load-bearing and expensive to change later.

**The Algorithm.** Feasible. The fuzzy shift window is the right instinct. See Q2 answer below for architecture recommendation.

**"No negative events offline" rule.** Architecturally significant and helpful — it means offline calculation is pure positive accumulation with no branching logic for events. Clean constraint.

**Follower loss while online.** Scandals and algorithm-driven follower loss are mentioned but not specified. This will need its own proposal or spec — an event system that can subtract from a progression metric is a different beast from one that modifies rates.

**Decisions that are expensive to reverse:**
1. Per-platform follower counts — shapes the entire data model
2. Three currencies vs. fewer/more — touches every system
3. The Algorithm as a first-class system — wired into generators, platforms, and economy
4. Engagement → Followers as a conversion pipeline, not direct earn — more complex but enables richer mechanics

None of these are wrong. All are flagged so we're making them eyes-open.

**Open question answers:**

**Q2 — Algorithm shift architecture:** Client-side with a seeded PRNG. The seed determines the full shift schedule deterministically: works offline, is reproducible for debugging, requires no server polling. The fuzzy window is a base interval ± a seeded random offset. If leaderboards or social features come later, the seed can be server-issued without changing shift logic.

**Q3 — Platform count at launch:** 3 platforms. Cross-posting needs at least 3 for interesting tradeoffs (2 is binary). Each platform carries its own follower count, content affinity, and unlock threshold. 3 is buildable and sufficient. A 4th can be added post-launch without structural changes if the platform entity is well-defined.

**Q4 — Idle gains:** Calculate-on-open. Standard for the genre, and the "no negative events offline" rule makes it clean: `time_elapsed × production_rate_at_close`. Algorithm state advances while offline (the seed makes this deterministic), but no negative effects from shifts fire until the player returns.

**For ux-designer:**
- Q1 and Q5 remain open for your review
- The Algorithm state visualization (Q1) should account for the seeded shift model — the player needs to understand what the current state *is* and have some sense of when it might change, without enabling precise clock-watching

**For game-designer:**
- The follower-loss mechanic (Scandals, algorithm-driven loss) needs a follow-up proposal before architecture can spec the event system. Consider scoping what triggers loss, magnitude, and player counterplay options.

---

### ux-designer — 2026-04-04

**Assessment:** approve

**Target aesthetics delivery.**
- *Discovery* — achievable but fragile. Cross-posting synergies and algorithm interactions need to be visible accidents — the screen rewards unexpected combinations with unmistakable feedback. Too subtle and the discovery never registers; too explicit and it stops being discovery.
- *Expression* — naturally supported by the platform + content type matrix. The risk is the opposite direction: so many knobs the player doesn't know which ones are theirs. The screen needs to reflect the player's current strategy back to them so expression feels intentional.
- *Submission* — clicker home turf. The UX job is making numbers trustworthy and satisfying: tick speed, animation, sound. If the engagement counter updates in jerky jumps, the trance breaks.

**Three-currency hierarchy.** Three currencies at three speeds is a gift for information hierarchy: Engagement (always moving, primary attention), Followers (slower, secondary), Clout (rare, lives on the prestige screen). The concern is mid-game density — 3 platform follower counts + engagement + algorithm state + generator output on one screen. Solvable, but the hierarchy must be ruthless: one primary number, clear secondary groupings, everything else on demand. This is the single biggest UX challenge in the proposal.

**Q1 — Algorithm state visualization.** An ambient weather-like metaphor. The Algorithm is a visible environmental element — not a dashboard, not pure ambience:
- Current state has a **name** and a **visual mood** (color palette shift, background motion, iconography). Each state feels visually distinct.
- A subtle **instability indicator** — visual tension that builds as a shift approaches. Not a countdown. Think clouds gathering. The player feels it coming without knowing exactly when.
- On shift: a **visible environmental transition** — mood changes, name changes, affected generators show a brief visual pulse to orient the player.
This respects the fuzzy timer, gives actionable information, and reinforces the satirical tone.

**Q5 — "Going viral" on screen.** The peak emotional beat must break the visual rhythm of everything else:
- Engagement counter **visibly accelerates** — the player watches the rate spike in real-time. The tick speed itself is the drama.
- **Screen energy escalates** — particle burst, subtle shake, the affected generator glows. Visual language says "something extraordinary is happening."
- A **distinct sound signature** that cuts through ambient audio. Recognizable by sound alone after the first time.
- **Sustained, not instant** — a 5-10 second event. The emotional payoff is in watching the cascade, not seeing a result after the fact.

**Non-blocking concerns for downstream UX specs:**
1. Generator density — 8 types need a visual language that scales beyond icon + color. A third differentiator (shape, position, or grouping) will be needed.
2. Follower loss presentation — Scandals and algorithm-driven loss need careful visual treatment so losing numbers feels like a strategic challenge, not punishment. The visual language for decrease matters as much as the mechanic.
3. Algorithm shift + rebalancing — when the Algorithm shifts, the player needs to understand what changed and what to do without explicit instructions. Generator boost/penalty feedback must be self-evident.

**For game-designer:**
- The follower-loss mechanic's visual treatment will need close collaboration between game-designer and ux-designer once the Scandals system is specified — the feel of losing followers is as much a design question as a UX question.
