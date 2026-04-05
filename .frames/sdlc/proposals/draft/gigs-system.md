---
name: Gigs System
description: Reframes the "brand deal" Actions-column member as the Gigs system — one slot, one cadence, with multiple data-defined variants (Brand Deal, Livestream, Convention) that share the mechanic but carry distinct payoff shapes and unlock tiers.
author: game-designer
status: draft
reviewers: [ux-designer, architect]
---

# Proposal: Gigs System

## Problem

The `brand-deal-boost.md` proposal (accepted) defines a player-triggered engagement boost — a random offer card that appears, the player taps it, and an engagement multiplier runs for a short duration. It is named entirely around the "brand deal" fiction.

That fiction is too narrow. A creator's opportunity stream is not only brand deals. It's livestreams. It's conventions. It's collabs, podcast guest spots, sponsored segments, press tours. The Actions-column slot we designed is flavor-agnostic — the mechanic is *timed offer → tap → boost*. Binding it permanently to one fiction loses the richness of the creator-economy frame the game lives in.

More importantly, a single flavor produces a single payoff shape. Every offer is 3× for 20s. The player's decision is always the same: *wait for viral or tap now?* The decision stays sharp the first few times and then flattens into habit.

Introducing **variants** with distinct payoff shapes (short-and-spiky, long-and-steady, burst-and-brief) creates a secondary decision layer on the same mechanic: *what kind of opportunity is this, and does it fit the moment I'm in?* Same grammar, more emergence.

This proposal does not change the core mechanic. It names the class, adds variants, and defines how variants are selected and gated.

## Proposal

### 1. The Class Is Called Gigs

The Actions-column member currently called "Brand Deal" is renamed to **Gigs**. A Gig is a timed opportunity offer that the player taps to activate an engagement boost. Brand Deal becomes *one variant of a Gig*, not the system itself.

Rationale: "Gig" is creator-economy native (YouTubers, streamers, and podcasters routinely say "got a gig"), one syllable, and scope-accurate. It names the class without locking in the fiction of any single variant.

### 2. Launch Variant Roster

Three variants ship at launch:

| Variant | Multiplier | Duration | Payoff Shape |
|---|---|---|---|
| **Brand Deal** | 3× | 20s | Short & spiky — the baseline |
| **Livestream** | 2× | 60s | Long & steady — the grind |
| **Convention** | 5× | 10s | Burst & brief — the peak |

Each variant teaches a different relationship to the viral-burst timing decision:

- **Brand Deal** is the mid-range bet — enough duration to land a viral overlap, enough ceiling to matter.
- **Livestream** pays off regardless of viral timing — 60 seconds is longer than most viral windows, so its value is *uptime*, not compound timing. This is the variant that rewards patient play.
- **Convention** is the knife-edge — 10 seconds is barely long enough to catch a viral, but if you do, the 5× compounds into the game's highest-ceiling engagement moment.

Three variants is the minimum to establish the pattern (short/medium/long). More can be added later. The roster is deliberately small at launch; more variants without new decision surface is a feature dump.

### 3. Variant Selection — Weighted Random

When the Gig slot fires (per the shared cadence), the game rolls a weighted random variant from the pool of *unlocked* variants. Suggested starting weights:

| Variant | Weight | Relative Frequency |
|---|---|---|
| Brand Deal | 60 | common |
| Livestream | 30 | medium |
| Convention | 10 | rare |

Rarity carries emotional weight. "Oh, a con!" is a feeling the game should produce — uniform random flattens that. Weighted selection preserves variance while giving each variant a distinct emotional register.

Weights are `StaticData` values and tunable without code changes.

### 4. Per-Variant Unlock Tiers

Each variant is gated behind its own follower threshold. The player's Gigs pool grows as they grow:

- **Brand Deal** — unlocks first (matches existing `brand-deal-boost.md` design)
- **Livestream** — unlocks at a higher tier (mid-game discovery)
- **Convention** — unlocks at the highest tier (late-game payoff)

Thematic justification: small creators get brand deals, mid-tier creators go live, established creators get invited to cons. The progression is diegetic.

Specific threshold values are a balance-pass concern (see Open Questions). The existing `unlockFollowerThresholds` array from `brand-deal-boost.md` §6 generalizes naturally — it becomes per-variant.

When the Gig slot fires but no variants are unlocked yet, no offer spawns and the cadence keeps counting. This matches the existing gating behavior from `brand-deal-boost.md`.

### 5. Shared Cadence, Single Slot

One slot, one cadence. Only one Gig offer is ever live at a time, and the interval between offers is system-wide (not per-variant). The existing 1–2 minute cadence from `brand-deal-boost.md` is unchanged.

This preserves the Actions-column discipline: Gigs is **one** citizen of the Actions class, not three. If each variant had its own cadence and slot, we'd be in Framing B of the earlier design conversation — fragmenting the Actions column into three distinct members. That was explicitly rejected.

### 6. What This Changes in `brand-deal-boost.md`

The core mechanic — offer appears, player taps, boost runs, compound with viral — is unchanged. What changes:

- The **system name** moves from "Brand Deal" to "Gigs." Brand Deal becomes a variant.
- The **state model** gains a variant discriminator on both the offer and the active boost (so the game knows which variant was drawn and the UI can render the right card).
- `StaticData.brandDeal` is renamed to `StaticData.gigs` and gains a `variants` section with per-variant config (multiplier, duration, weight, unlock threshold).
- **Static-data values become per-variant** rather than system-wide: `boostMultiplier`, `durationMs`, and `unlockFollowerThresholds` now live on each variant, not at the top level.

`brand-deal-boost.md` stays in `accepted/` as the record of the core mechanic's acceptance. This proposal supersedes its naming and extends its parameters. Once this proposal is accepted, a cross-reference note should be added to `brand-deal-boost.md` pointing to this proposal.

### 7. UX Implication (Flag for `ux-designer`)

The existing `ux/brand-deal-card.md` spec assumed one card appearance. Variants need visual differentiation — a Livestream card and a Con card should not look identical to a Brand Deal card. The player needs to recognize the variant at a glance because the variant determines their decision (tap now vs. wait for viral).

Possible differentiation axes: iconography (phone/camera/crowd), color accent within the corporate-green lane, card header text, approach animation. This proposal does not specify the visual treatment — that's UX's call. It only flags that **three distinct card treatments are required** for launch.

### 8. Engagement Line Check

Three-question test:
1. **Is this mechanic honest?** Yes — variants are visible, their effects are real, the player taps what they see. No hidden behavior.
2. **Can the player quit without loss?** Yes — missing a Gig is a missed opportunity, not a penalty. No streak, no punishment, no variant-specific loss state.
3. **Is progression tied to engagement or just time?** Yes — Gig variants unlock through follower progression (engagement-driven), and the skill of timing them (especially Convention) is the ceiling.

No new engagement-line concerns beyond those already cleared in `brand-deal-boost.md` §7.

## References

1. `.frames/sdlc/proposals/accepted/brand-deal-boost.md` — core mechanic; this proposal renames and extends it
2. `.frames/sdlc/proposals/accepted/actions-column.md` §3 — names Brand Deal (now Gigs) as the second Actions-column citizen
3. `.frames/sdlc/proposals/accepted/viral-burst-event-signal.md` — viral burst mechanic; compound-timing target
4. `.frames/sdlc/proposals/accepted/core-game-identity-and-loop.md` §6 — three-currency economy; engagement as fast currency
5. `.frames/sdlc/ux/brand-deal-card.md` — existing card spec; needs per-variant extension
6. `.frames/sdlc/tasks/tasks.json` — contains references to "brand deal" that will need rename once this proposal accepts

## Open Questions

1. **Variant-specific follower unlock thresholds** — at what follower counts do Livestream and Convention unlock? Brand Deal threshold is already resolved to TBD in `brand-deal-boost.md`. **Owner: game-designer (balance pass, once progression curve is finalized)**
2. **Selection weights** — are 60/30/10 the right starting weights, or should Convention be rarer (e.g., 70/25/5)? **Owner: game-designer (balance pass, after playtesting)**
3. **Per-variant card visual treatment** — how do Brand Deal, Livestream, and Convention cards differ visually? Iconography, color accent, copy, animation? **Owner: ux-designer**
4. **State model rename and variant discriminator** — `GameState.brandDeal` becomes `GameState.gig`. `BrandDealOffer` gains a `variant_id: string` field; `ActiveBrandDeal` also gains `variant_id`. Is this the right shape, or should variant config be inlined into the state rather than referenced by id? **Owner: architect**
5. **Save migration** — the architect's plan in `brand-deal-boost.md` already required a v2→v3 bump for `brandDeal`. If this proposal accepts before the engineer implements v3, we can ship as v2→v3 with the Gigs shape directly (no v3→v4 needed). If implementation has already started, a second migration is required. **Owner: architect + engineer (coordinate on implementation sequence)**
6. **Naming of "Convention"** — "Convention" is formal; "Con" is shorter and vibier but can be misread. The data/code identifier should be `convention`; the player-facing card text is a UX/copy decision. **Owner: ux-designer (copy)**
7. **Do variants have sub-mechanics beyond multiplier/duration?** e.g., does Convention cost something to accept (a follower dip for "traveling")? Does Livestream require the player to stay on screen? These would turn variants into distinct sub-systems and move us back toward Framing B. **Recommendation: no sub-mechanics at launch — variants are pure parameter differences.** **Owner: game-designer (confirm)**
