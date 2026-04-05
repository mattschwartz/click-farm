---
name: Badge Shop
description: Cosmetic badges earned through gameplay milestones and claimed from a shop for a small clout fee — prestige through achievement, not purchase.
author: game-designer
status: draft
reviewers: [architect, ux-designer]
---

# Proposal: Badge Shop

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

### 3. Clout Cost

Each badge costs a small, flat clout fee to claim. The fee should be:
- Affordable immediately after any rebrand
- Not a real decision (always yes, if you've earned it)
- Just enough friction to make the claim feel intentional

Specific values TBD in balance pass.

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

## References

1. `.frames/sdlc/proposals/accepted/core-game-identity-and-loop.md` §6 — clout economy definition; prestige currency faucet/drain model
2. `.frames/sdlc/proposals/accepted/core-game-identity-and-loop.md` §7 — Rebrand prestige mechanic; clout as meta-upgrade currency
3. `.frames/sdlc/proposals/accepted/scandals-and-follower-loss.md` — scandal survival as a badge milestone candidate

## Open Questions

1. **Milestone thresholds** — exact follower counts, rebrand counts, viral counts, etc. for each badge. **Owner: game-designer** (balance pass once progression curve is defined)
2. **Badge names and copy** — satirical names fitting the game's tone. **Owner: game-designer** (creative pass — can happen in parallel with build)
3. **How many badges at launch?** Too few and the collection feels thin. Too many and none feel special. **Owner: architect** (scoping question — what's buildable for a first pass?)
4. **Shop and collection screen design** — where does the shop live in the navigation? How are locked vs. claimed badges presented? How does the shine work visually? **Owner: ux-designer**
5. **Badge visibility on the main screen** — does the player's most recently claimed or "featured" badge appear anywhere on the core game screen? **Owner: ux-designer**
