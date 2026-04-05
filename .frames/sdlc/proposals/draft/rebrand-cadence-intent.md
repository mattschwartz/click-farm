---
name: Rebrand Cadence Intent
description: Defines the designed felt pacing of the prestige (Rebrand) loop across its lifetime — time-to-first-rebrand, how rebrands 1/3/5/10 should feel, and when the loop shifts from ceremonial to strategic.
author: game-designer
status: draft
reviewers: [game-designer]
---

# Proposal: Rebrand Cadence Intent

## Problem

The prestige formula is specced (`floor(sqrt(total_followers)/10)` per `clout-to-follower-scaling-curve.md`) and the upgrade menu exists (`clout-upgrade-menu.md`), but no design artifact captures the **intent** for how the rebrand loop should feel across its lifetime.

The math alone does not tell a balance tuner:
- Roughly when should the first rebrand happen in real session minutes?
- How should rebrand #3 feel different from rebrand #1?
- When does prestige stop feeling like a ceremonial milestone and start feeling like a strategic timing decision?
- What "felt stakes" statement can task #88 (balance pass on `base_upgrade_cost` seeds) test against?

Without this, balance passes aim at a blank wall. Numbers get adjusted but there's no target feeling to hit. This proposal names the target.

This is a design-intent document, not a balance spec. It produces a felt-pacing target; `base_upgrade_cost` tuning in task #88 is the separate act of hitting that target.

## Proposal

### 1. Time-to-First-Rebrand: ~25–35 minutes

**Target: the first rebrand lands around 30 minutes of active first-time play, reaching ~10,000 total followers for 10 Clout — exactly enough for one tier-1 upgrade.**

Why this window:
- **Under 20 minutes feels cheap.** The rebrand narrative is "You've learned everything this identity can teach you" — that line reads as a joke if the player wipes after 12 minutes of clicking. Ceremony requires investment.
- **Over 45 minutes feels like a grind wall.** Clicker players expect a prestige loop to *open up* in the first hour, not after it. Past 45 minutes we lose the player who wanted to see the whole game exists before committing to it.
- **~30 minutes matches the designed "good first rebrand" target** already implied by the Clout curve (10k followers → 10 Clout → one tier-1 upgrade). This proposal just names the real-time expectation behind the follower target.

The First Five Minutes onboarding carries the player to their first platform unlock and first viral burst. Minutes 5–25 are the player climbing the generator ladder. Minute ~30 is the Rebrand surfacing as an affordance and paying out cleanly.

### 2. Per-Rebrand Felt Pacing

Each named rebrand is a **feeling target**, not a clock guarantee. The times are design intent; balance tuning aims at them.

#### Rebrand 1 — "Ceremonial milestone" (~30 min)
- **Feels like:** A promise kept. The player just wiped their accounts and the Clout upgrade they buy immediately makes the next run feel different.
- **Clout earned:** ~10. One tier-1 purchase (Engagement Boost L1 at 10).
- **Player's question:** "Did that just work?" → Yes.
- **What the game is teaching:** The prestige loop exists, is honest, and pays on the first good try.
- **Agency shape:** No decision yet — there's only one thing to buy, and the game wants the player to buy it.

#### Rebrand 3 — "Shopping trip" (~15–20 min per run)
- **Feels like:** Picking a direction. The player has accumulated 25–35 Clout across runs and is choosing *which* second-tier upgrade reveals their strategy.
- **Clout earned per run:** ~10–15 (follower totals haven't grown dramatically yet; engagement boost from R1 has shortened runs slightly).
- **Player's question:** "Do I buy Algorithm Insight, the Instasham head-start, or AI Slop?"
- **What the game is teaching:** Upgrades occupy distinct decision spaces. The player's first branching choice is here. Their build identity begins.
- **Agency shape:** First meaningful prestige decision. There is no wrong answer — each path is a different game.

#### Rebrand 5 — "The loop tightens" (~10–15 min per run)
- **Feels like:** Operating a working machine. The player has 2–3 upgrades purchased, runs are measurably faster, and rebrands happen because the player *wants to spend*, not because they've hit a wall.
- **Clout earned per run:** ~20–35.
- **Player's question:** "What do I need next to unlock X?"
- **What the game is teaching:** Upgrades compound. The player sees their second-run build working and is planning the third and fourth.
- **Agency shape:** Shopping-list play. Rebrand is a tool for acquiring upgrades on a schedule.

#### Rebrand 10 — "Strategic timing" (~8–15 min per run, but *decided*)
- **Feels like:** A deliberate trigger-pull. The player is no longer rebranding at the first good moment — they are *choosing* between cashing out at 100k for 31 Clout or pushing to 500k for 70 Clout, weighing time-to-push against Clout-per-minute.
- **Clout earned per run:** ~50–100 depending on how hard the player pushed.
- **Player's question:** "Is pushing further worth it this run?"
- **What the game is teaching:** The diminishing-returns curve of the Clout formula is now a live decision, not a footnote.
- **Agency shape:** Optimization play. Rebrand timing is now a skill expression.

### 3. When Rebrand Shifts from Ceremonial → Strategic

**The shift happens between Rebrand 3 and Rebrand 5.**

- **R1–R2:** Ceremonial. Player rebrands because it's *available* and *new*. The game is teaching that rebrand is a good thing.
- **R3–R4:** Transitional. Player rebrands to *buy specific upgrades*. The decision is "which upgrade," not "when to rebrand."
- **R5+:** Strategic. Player weighs *when* to rebrand against the Clout curve. Pushing further becomes a live tradeoff.
- **R10+:** Optimization. Rebrand is a rhythm instrument — the player is tuning Clout-per-minute deliberately.

The transition is felt, not gated. The game should not announce "you are now in the strategic phase" — the player arrives there because their shopping list outgrows their patience for easy rebrands.

### 4. Interaction with the Clout Upgrade Menu

The menu totals 425 Clout across 10 purchases. Intended pacing of full-menu completion:

| Rebrand count | Cumulative Clout (rough) | What's typically owned |
|---|---|---|
| R1 | 10 | Engagement Boost L1 |
| R3 | ~30 | + Algorithm Insight L1 or Instasham head-start |
| R5 | ~80 | + one mid-tier (AI Slop, Engagement L2, or both started) |
| R8 | ~180 | + Grindset head-start, Deepfakes, Engagement L2 |
| R12 | ~300 | + Engagement L3, Algorithm Insight L2 |
| R15–R20 | 425 | Full menu — Algorithmic Prophecy purchased |

**Design target: full menu is reachable around rebrand 15–20 for a thorough player, not before R12 and not grindy past R25.** A player who has completed the menu has demonstrably mastered every system. The menu should feel earned by then, not looming.

### 5. Interaction with Other Systems

**Audience Mood (retention):** Retention drag extends run time but does not block rebrand. A player fighting retention runs ~20–30% slower per run; the cadence targets above assume *average* retention, not perfect. If a player is playing around Audience Mood well, runs shorten toward the fast end of each range.

**Gigs:** Gigs accelerate runs by injecting follower boosts. A gig-heavy run can shorten a mid-game rebrand by a few minutes. This is intended — Gigs *should* be a cadence lever the player can pull.

**Creator Kit (Phone head-start):** Sequential platform head-starts from Phone stack with Clout-purchased head-starts. Once both head-starts are owned, R3+ runs open with all platforms available, which is a load-bearing assumption for the "R5 feels like an operating machine" target.

**First Five Minutes onboarding:** The onboarding sequence ends before rebrand surfaces. Rebrand is a post-onboarding affordance — it does NOT appear within the first 5 minutes. It should reveal around minute 10–15 as a locked-state preview, unlock as an available action around minute ~25.

### 6. Felt Stakes Statement (for balance tuners)

This is the statement task #88 and any future balance pass can test against:

> **A first-time player should reach their first rebrand in 25–35 minutes of active play, earn exactly enough Clout to buy Engagement Boost L1, and immediately feel the next run start faster. By rebrand 5, runs should take 10–15 minutes and the player should be shopping for specific upgrades. By rebrand 10, the player should be weighing "cash out now vs. push further" as a live decision every run. If any of these three checkpoints misses, `base_upgrade_cost` seeds are wrong.**

If playtest produces rebrand 1 in 12 minutes, generators are too cheap. If it produces rebrand 1 in 55 minutes, generators are too expensive. If rebrand 10 still feels ceremonial, the Clout curve's diminishing returns aren't being felt and something upstream is wrong.

### 7. What This Locks In

- Time-to-first-rebrand target: 25–35 minutes of active play
- Felt-pacing for R1, R3, R5, R10
- The ceremonial → strategic shift between R3 and R5
- Full-menu completion target: R15–R20
- Felt stakes statement as the balance-test target

### 8. What This Leaves Open

- Exact `base_upgrade_cost` seed values — owned by task #88
- Offline/idle-gain scaling across the cadence — not addressed here
- Whether late-game (R20+) generators unlock per task #93 reshape cadence further

## References

1. `.frames/sdlc/proposals/accepted/clout-to-follower-scaling-curve.md` — Clout formula and Clout/follower table
2. `.frames/sdlc/proposals/accepted/clout-upgrade-menu.md` — Upgrade menu, tier costs, 425 Clout total
3. `.frames/sdlc/proposals/accepted/core-game-identity-and-loop.md` — §7 Prestige: The Rebrand
4. `.frames/sdlc/proposals/accepted/generator-balance-and-algorithm-states.md` — current provisional base_upgrade_cost seeds (task #88)
5. `.frames/sdlc/proposals/accepted/audience-mood-retention.md` — retention drag affecting run length
6. `.frames/sdlc/proposals/accepted/creator-kit-upgrades.md` — Phone sequential head-start
7. `.frames/sdlc/proposals/draft/first-five-minutes-onboarding.md` — onboarding window before rebrand surfaces

## Open Questions

1. Should the "Rebrand" action surface visually as a locked preview during the first run (e.g., a greyed affordance around minute 10–15), or only appear once unlocked? **Owner: ux-designer**
2. Does the Creator Kit Phone head-start's sequential-platform delivery align with the R3 "shopping trip" cadence, or does it front-load platforms too quickly? **Owner: game-designer**
3. Should there be any designed "plateau break" — a moment around R7–R9 where the game deliberately surfaces Algorithmic Prophecy as a distant goal — or is the upgrade menu's natural escalation enough? **Owner: game-designer**
