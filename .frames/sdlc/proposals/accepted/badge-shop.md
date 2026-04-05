---
name: Badge Pro Shop
description: Cosmetic badges earned through gameplay milestones and claimed from a shop for a small clout fee — prestige through achievement, not purchase.
author: game-designer
status: accepted
reviewers: []
---

# Proposal: Badge Pro Shop

## Problem

Clout is the prestige currency — earned through rebranding, spent on permanent meta-upgrades. It marks how far you've come. But right now clout spending is entirely functional: faster rates, new generators, platform head-starts. There is no way to *display* prestige. The player who has rebranded fifteen times and the player who just rebranded their first time look identical.

Badges give prestige a visible form. They also give the badge shop a thematic home: spending your influencer clout to buy a shiny badge is exactly what a real influencer would do.

## Proposal

### 1. Core Model: Earned First, Then Claimed

Badges are **not freely purchasable**. A badge becomes available in the shop only after the player hits the milestone that unlocks it. The clout cost to claim it is small — ceremonial, not a real economic decision.

This means:
- You cannot buy your way to a badge you haven't earned
- The achievement is the gate; the clout spend is the ritual of claiming it
- Each badge in your collection represents something you actually did

This solves the competition problem with meta-upgrades: a player never has to choose between buying a useful upgrade and buying a badge. They're in different lanes — one is earned over time, one is purchased with real budget.

---

### 2. Milestone Categories

Badges unlock across several milestone categories. Specific thresholds are a balance question; these are the categories and example milestones:

| Category | Example Milestones |
|---|---|
| **Followers** | First 1K, 10K, 100K, 1M followers |
| **Rebrands** | First rebrand, 5 rebrands, 10 rebrands |
| **Virals** | First viral burst, 10 viral bursts, 50 viral bursts |
| **Scandals** | Survived your first scandal |
| **Brand Deals** | First brand deal claimed, 10 brand deals |
| **Generators** | Owned every generator type, maxed a generator |
| **Platforms** | Unlocked all platforms, dominated a platform |

Names should fit the game's satirical tone — not "Achievement Unlocked" but something like *"Going Viral (for real this time)"* or *"Sellout (affectionate)"* or *"Main Character Energy."*

---

### 2a. Launch Badge Set (5 badges)

Per architect resolution on OQ3 — 5 badges at launch. These are the launch set, chosen for category spread, arc coverage (early-achievable through aspirational), and independence from stretch systems (no scandal-dependent badge, since scandals are a stretch goal).

| # | Badge name | Milestone trigger | Flavor copy | Category |
|---|---|---|---|---|
| 1 | **Micro-Influencer** | 1,000 followers (total) | *"You crossed one thousand. Statistically, someone cares."* | Followers |
| 2 | **Going Viral (for real this time)** | First viral burst fires | *"You made the algorithm's day."* | Virals |
| 3 | **Main Character Energy** | 10,000 followers (total) | *"Ten thousand people are waiting to see what you do next."* | Followers |
| 4 | **Sellout (affectionate)** | First brand deal claimed | *"A brand transacted with you. This is growth."* | Brand Deals |
| 5 | **New Me, Who Dis** | First rebrand completed | *"You deleted yourself. Everyone will understand."* | Rebrands |

**Arc coverage:**
- **Micro-Influencer** is the first earned badge most players will see — hit in the first 10-20 minutes. Teaches the collection mechanic exists.
- **Going Viral** is the first "peak moment" badge — tied to the game's biggest emotional beat. Earning it is a memory.
- **Main Character Energy** is mid-grind — an affirming checkpoint when the follower number becomes satirically large.
- **Sellout (affectionate)** ties to brand deal unlock — rewards progression past the early game into the active-action layer.
- **New Me, Who Dis** is the first prestige badge — rewards the conceptual leap of rebranding for the first time.

**Voice register:** each badge is a small joke at the expense of the corporate/influencer frame, never at the player's expense. The affectionate-satire tone from Core Game Identity holds — the badge celebrates the player while skewering the culture around what they just did.

**No scandal-dependent launch badge.** If scandals ship at launch, a sixth badge (*"Canceled (temporarily)"* — first scandal survived) can be added without re-doing the set. Post-launch additions follow the same voice rules.

---

### 3. Clout Cost

Each badge costs a small, flat clout fee to claim. The fee should be:
- Affordable immediately after any rebrand
- Not a real decision (always yes, if you've earned it)
- Just enough friction to make the claim feel intentional

**Locked by balance pass (2026-04-05): 2 clout, flat across all badges.** See §7.

---

### 4. Display

Badges are displayed in a **badge collection screen** — a trophy case the player can open to see what they've earned and claimed, and what they're working toward (locked badges visible but greyed out).

The "shine" is the primary visual reward. Claimed badges should feel alive — not static icons. Locked badges should feel close but out of reach.

What's on the main game screen (if anything) is a UX question.

---

### 5. No Gameplay Effect

Badges are purely cosmetic. They do not grant bonuses, do not affect rates, do not influence the algorithm.

This is intentional. The moment a badge grants a stat bonus it becomes an upgrade, not a collectible — and then it competes with meta-upgrades for clout budget. Keeping badges effect-free keeps the economy clean and ensures every badge is bought for the right reason: because you want it.

---

### 6. Economy Integration

Badges add a **second drain on clout** that does not compete with meta-upgrades:

- Meta-upgrades: clout → run improvement (functional, high cost)
- Badges: clout → prestige display (cosmetic, low cost)

Both are valid reasons to spend clout. A player with excess clout after upgrades has something satisfying to do with it. A player early in a rebrand cycle can still claim cheap badges they've earned. Neither spending path undermines the other.

---

### 7. Balance Pass: Thresholds & Cost (2026-04-05)

Resolves OQ1 (milestone thresholds) and locks §3 (clout cost). Done after the progression curve was locked (`level-multiplier-curve.md`, `clout-to-follower-scaling-curve.md`, `generator-level-growth-curves.md`, `generator-balance-and-algorithm-states.md`).

**Follower thresholds for the launch set: confirmed as authored.**

| Badge | Threshold | Why this value holds |
|---|---|---|
| Micro-Influencer | **1,000 followers** | First badge most players see — positioned for the first ~10-20 minutes of play. At 1K followers the player has not yet rebranded → no clout → badge unlocks but **cannot be claimed yet**. This is a feature: the pulsing "Claim — 2 Clout" CTA surfaces post-first-rebrand and teaches both the collection screen and the post-rebrand spending loop in one moment. |
| Main Character Energy | **10,000 followers** | Mid-grind affirming checkpoint. By this point the follower number has started to feel satirically large; the badge names the feeling. No change. |

**Self-gating badges need no thresholds:** Going Viral (first viral burst fires), Sellout (affectionate) (first brand deal claimed), New Me, Who Dis (first rebrand completed). All three are first-occurrence triggers — the game state already knows when they fire.

**Clout cost: 2 clout per badge, flat across all badges.**

Rationale:
- `cloutForRebrand = sqrt(total_followers) / 10` puts first-rebrand awards in the ~3-10 clout range and later rebrands in the ~30-100 range.
- At 2 clout × 5 launch badges = 10 clout to claim the full set. That's one modest rebrand's worth of clout — the player accumulates badges across a couple of rebrands without ever feeling burdened.
- Fails the "is this a real decision?" test in the correct direction: the player always says yes the moment they can afford it. Ceremonial friction, not economic friction.
- **Flat, not tiered:** keeps the mental model trivial ("badges cost 2"). A tiered scale would imply badges have relative value, which contradicts §5 (purely cosmetic) and §6 (cosmetic ≠ functional lane). All earned badges are equally worth claiming.
- **Why not 1 clout:** too close to free; loses the ceremonial beat. **Why not 3+:** starts bumping into cheap clout-upgrade territory and risks feeling like the player is choosing between a badge and a real upgrade, which is exactly what §1 and §6 are designed to prevent.

**Higher-tier follower badges (100K, 1M): held for post-launch.**

The category table in §2 lists 100K and 1M as future follower-tier milestones. Not joining the launch set. Reasons:
- Architect's launch-scope call of 5 badges (OQ3 resolution) was made explicitly to avoid over-committing on thresholds before the progression curve felt out. The curve is locked on paper but has not been playtested end-to-end.
- Adding 100K/1M now means tuning two more thresholds blind. Adding them post-launch once there is real play data is cheap and reversible.
- Launch set already covers the full arc (early → mid → first-rebrand) and all milestone categories needed to test the mechanic. Padding the set now would dilute what the launch set is for: proving the claim loop works.

Post-launch additions follow the voice-register rules documented in §2a.

**What this locks in:**
- 1K and 10K follower thresholds for the two follower badges in the launch set.
- 2 clout flat per badge.
- Launch remains at 5 badges; 100K/1M held.

**What this leaves open:**
- Post-launch badge catalog (additional follower tiers, rebrand counts, viral counts, scandal badge if scandals ship, etc.). Revisit after the mechanic has been played.

---

## References

1. `.frames/sdlc/proposals/accepted/core-game-identity-and-loop.md` §6 — clout economy definition; prestige currency faucet/drain model
2. `.frames/sdlc/proposals/accepted/core-game-identity-and-loop.md` §7 — Rebrand prestige mechanic; clout as meta-upgrade currency
3. `.frames/sdlc/proposals/accepted/scandals-and-follower-loss.md` — scandal survival as a badge milestone candidate

## Open Questions

1. ~~**Milestone thresholds** — exact follower counts, rebrand counts, viral counts, etc. for each badge. **Owner: game-designer** (balance pass once progression curve is defined)~~ **[RESOLVED — game-designer, 2026-04-05, balance pass]** See §7. 1K and 10K follower thresholds confirmed; self-gating badges need no thresholds; 2 clout flat per badge; 100K/1M held for post-launch.
2. ~~**Badge names and copy** — satirical names fitting the game's tone. **Owner: game-designer** (creative pass — can happen in parallel with build)~~ **[RESOLVED — game-designer, 2026-04-05]** Launch set of 5 badges written into §2a above, with milestone triggers, flavor copy, arc rationale, and voice-register notes for post-launch additions.
3. **How many badges at launch?** ~~Too few and the collection feels thin. Too many and none feel special. **Owner: architect** (scoping question — what's buildable for a first pass?)~~ **[RESOLVED — architect, 2026-04-05]** 5 badges at launch. Enough for the collection to feel real without over-committing on milestone design before the progression curve is finalized.
4. **Shop and collection screen design** — where does the shop live in the navigation? How are locked vs. claimed badges presented? How does the shine work visually? **Owner: ux-designer**
   - **Answer (ux-designer, 2026-04-05):** See full spec below. Summary: Trophy icon at bottom-right of desktop screen (prestige corner, adjacent to Rebrand affordance); third button "Badges" in the mobile prestige row alongside Upgrades and Rebrand. Three badge states: claimed (full color + ambient shine), unlocked-unclaimed (full color + "Claim" CTA + clout cost + pulsing border), locked (silhouette + milestone description at 3:1 contrast). Shine is a left-to-right gradient shimmer overlay — intense one-time version on first view after claiming (600ms), ambient 8s cycle thereafter.
5. **Badge visibility on the main screen** — does the player's most recently claimed or "featured" badge appear anywhere on the core game screen? **Owner: ux-designer**
   - **Answer (ux-designer, 2026-04-05):** No persistent badge on the main screen at launch. The screen is already dense and a cosmetic badge at rest adds no information hierarchy value. **Exception:** a claim celebration moment — when the player claims a badge, the badge icon animates in at ~80px, holds for 2 seconds in the center of the screen (floating above the main content, below modals), then fades out over 400ms. This is a pure payoff beat, not a persistent element. Re-evaluate if social features ship post-launch.

---
# Review: ux-designer

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

The mechanic is clean. Earned-first-then-claimed is the right model — it prevents badges from becoming a parallel grind track while giving the claim moment real ceremony weight. My UX answers to OQ4 and OQ5 follow.

**OQ4 — Navigation and screen design**

*Access point:*
- **Desktop:** A trophy icon (24×24px, 44×44px hit area) at the bottom-right of the main game screen, in the prestige corner adjacent to the Rebrand affordance. Groups prestige-economy surfaces spatially without touching the top bar or main columns.
- **Mobile:** A third button "Badges" in the prestige row (currently Upgrades | Rebrand — becomes Upgrades | Badges | Rebrand). Each button equally sized at one-third of the row.

*Badge collection screen layout:* Full-screen or large sheet (full-screen on mobile). Grid of badge tiles — 3 columns on desktop, 2 on mobile. Category rows separate the milestone categories (Followers, Rebrands, Virals, etc.) with a label divider.

*Three badge states:*

**Claimed:** Full color. Badge icon at natural saturation. Ambient shimmer: a semi-transparent white gradient overlay sweeps left-to-right across the badge surface on an 8s cycle — low amplitude, ease-in-out, communicates "alive, not static." On first view after claiming (fresh-claim state), the shimmer runs once at 2× amplitude and 600ms, then settles to ambient cadence.

**Unlocked, unclaimed (earned milestone, not yet claimed):** Full color icon — the player has earned it, it looks real. A "Claim" button below the badge with the clout cost displayed (e.g., "Claim — 2 Clout"). The badge tile has a subtle pulsing border in clout amber at 2s cycle — acknowledging it's waiting for the player's action. No shimmer until claimed.

**Locked (milestone not yet reached):** Silhouette — the badge shape is the outer form of the icon in a muted color (badge shape visible, internal icon detail absent or reduced to outline). Milestone description below the silhouette: "10K followers" or "Survive first scandal." Contrast: 3:1 on background — perceptible but clearly receded. No claim button, no pulse.

*Why silhouette over a full blackout:* a full black silhouette hides the icon shape entirely, removing the teaser. Showing the shape (without the detail) is the right level of "close but out of reach" — the player can see there's something there without seeing what it looks like claimed.

**OQ5 — Main screen visibility:** Answered inline in OQ5 above. No persistent badge. Yes to a 2s celebration reveal on claim.

**Non-blocking:** The prestige row on mobile becomes three buttons — the game-designer and architect should be aware that this changes the mobile prestige row layout from two buttons to three. The Upgrades button was introduced in `ux/mobile-layout.md` §6. Adding Badges does not break the row but may tighten the button widths. At 375px canvas with 24px horizontal padding, three buttons at 8px gaps = ~(375 - 24 - 16) / 3 = ~112px each. At 44px height this is a comfortable tap target.

---
# Review: architect

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

Architecturally this is clean. The model is small and the boundaries are obvious:

- **Static catalog** — 5 launch badges as build-time data (id, name, flavor, milestone predicate, clout cost). Lives with the other static-data tables.
- **Persistent state** — `claimed_badges` added to the save. A set (or ordered list with claim timestamps) of badge ids. Single new field on the save model; trivial migration (absent → empty set).
- **Derived state** — unlock status computed on read from existing game state. No new stateful system, no new tick logic, no new cache to invalidate.
- **Claim operation** — check clout ≥ cost, deduct, append id to `claimed_badges`. Synchronous localStorage write; no concurrency concerns in this codebase.
- **No gameplay coupling** — §5's "purely cosmetic" rule keeps badges out of the clout-upgrade dependency graph. Good call; reversing this later would be expensive.

**Note for the engineer (non-blocking):** the unlock predicates for the launch set require two lifetime counters that the model may not currently track: `viral_bursts_total` and `brand_deals_claimed_total`. Follower count and rebrand count already exist. These need to be added as monotonic counters on the save model (never decremented by scandals or resets other than explicit player wipe). Engineer should confirm current state of the save model when picking up the build task and flag if those counters exist under different names.

**On the mobile prestige row becoming 3 buttons:** ~112px wide at 44px tall is fine for a tap target. No architectural concern.

**Remaining open question:** OQ1 (milestone thresholds) is owned by game-designer and deferred pending the progression balance pass. Removing architect from reviewers; adding game-designer back so OQ1 can be resolved (or formally deferred to a task) before acceptance.

---
# Review: game-designer

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

Final author review. All design-owned questions are now settled:

- **OQ1 (milestone thresholds)** — formally deferred to the balance pass, captured as a forward game-designer task in `tasks.json`. Thresholds depend on the progression curve (follower scaling, rebrand cadence, viral frequency), which is not yet locked. Setting numbers now would either anchor the curve backward from badges (wrong causality) or produce values we'd have to re-tune twice. Deferral is the correct call.
- **OQ2 (names/copy)** — resolved in §2a with the five-badge launch set. Voice register documented for post-launch additions.
- **OQ3 (launch count)** — architect resolved at 5.
- **OQ4 (shop/screen design)** & **OQ5 (main-screen visibility)** — both answered by ux-designer with full spec.

ux-designer and architect reviews are both Aligned with additive value (UX spec for OQ4/OQ5, architect's note about `viral_bursts_total` and `brand_deals_claimed_total` counters for the engineer). No conflicts between reviews.

The core model — earned-first-then-claimed, purely cosmetic, second clout drain that does not compete with meta-upgrades — is economically clean and psychologically right. Badges express prestige without becoming a parallel grind track.

Removing game-designer from reviewers. Reviewers list empty. Moving proposal to accepted.
