---
name: Gigs System
description: Reframes the "brand deal" Actions-column member as the Gigs system — one slot, one cadence, with multiple data-defined variants (Brand Deal, Livestream, Convention) that share the mechanic but carry distinct payoff shapes and unlock tiers.
created: 2026-04-05
author: game-designer
status: accepted
reviewers: []
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

### 9. Balance Pass: Unlock Thresholds & Selection Weights (2026-04-05)

Resolves OQ1 (variant unlock thresholds) and OQ2 (selection weights). Done after the progression curve was locked (`clout-to-follower-scaling-curve.md`, `level-multiplier-curve.md`, `generator-level-growth-curves.md`, `generator-balance-and-algorithm-states.md`).

**Unlock thresholds:**

| Variant | Threshold | Progression anchor | Rationale |
|---|---|---|---|
| **Brand Deal** | **1,000 followers** | Micro-Influencer badge threshold; ~3 clout rebrand territory | Aligns with the "you're now a creator" moment. Micro-sponsorships are a real thing. Creates a chained onboarding: 1K unlocks Micro-Influencer badge (locked until first rebrand) → first Brand Deal fires on cadence → first tap unlocks Sellout (affectionate) badge (also locked until clout). All three light up during the pre-first-rebrand stretch and become claimable together after first rebrand. |
| **Livestream** | **10,000 followers** | Main Character Energy badge threshold; first "good rebrand" (10 clout, one tier-1 upgrade) | Pairs with the first-rebrand reinforcement moment. The 1K–10K span gives Brand Deal alone time to teach the Gigs mechanic and its decision surface. At 10K, multiple progression signals converge ("you're leveling up") and Livestream arrives as the second variant — long-and-steady, the patience variant. |
| **Convention** | **100,000 followers** | "Established creator" tier; ~31 clout rebrand, mid/late game | The diegetic "invited to a con" moment. Gating higher (250K or 500K) risks players never experiencing Cons — at 10% roll weight against a small unlocked pool, threshold × weight determines real exposure, and a player at 250K who has rebranded a few times may still not have seen a Con. 100K with 10% weight produces roughly one Con every ~15 minutes of continuous play for a player at or past the threshold — rare enough to feel special, frequent enough to learn the 10-second knife-edge timing. |

**Starting weights: confirmed at 60 / 30 / 10 (Brand Deal / Livestream / Convention).**

Reasoning:
- At the ~90s average Gig cadence (`intervalMsMin: 60000, intervalMsMax: 120000`), 10% weight produces roughly one Convention per ~15 min of play for a player past the 100K threshold. That lands in the "rare but learnable" zone: rare enough that each "Oh, a con!" feels like a moment, frequent enough that a player develops mastery over the 10-second timing window across a session.
- 70/25/5 was considered and rejected: at ~30 min between Conventions, most players would see only 1–2 per session and never develop the timing intuition the variant is designed around. The knife-edge 10s window is only interesting if the player has touched it enough to get good at it.
- 60% Brand Deal keeps the baseline variant dominant — the new-player experience is anchored in the mid-range bet until they cross 10K.
- 30% Livestream gives mid-game players a real alternative — not a novelty, a genuine strategic choice about which payoff shape fits the moment.

**Tuning discipline:** weights are `StaticData` and changeable without code (per §3). If post-playtesting data shows Conventions flatten into habit or never land the emotional register, 70/25/5 or 65/30/5 become candidates — but that's a post-play tuning decision, not a pre-play one.

**What this locks in:**
- Unlock thresholds: Brand Deal 1K, Livestream 10K, Convention 100K.
- Selection weights: 60 / 30 / 10.

**What this leaves open:**
- Post-playtesting weight adjustment. If Conventions flatten, tune rarity down; if they feel too scarce to master, tune up.
- Whether Convention's threshold should move to 250K if the 100K placement feels too early once Gigs are running in a full progression context. Revisit in the same playtest pass.

## References

1. `.frames/sdlc/proposals/accepted/brand-deal-boost.md` — core mechanic; this proposal renames and extends it
2. `.frames/sdlc/proposals/accepted/actions-column.md` §3 — names Brand Deal (now Gigs) as the second Actions-column citizen
3. `.frames/sdlc/proposals/accepted/viral-burst-event-signal.md` — viral burst mechanic; compound-timing target
4. `.frames/sdlc/proposals/accepted/core-game-identity-and-loop.md` §6 — three-currency economy; engagement as fast currency
5. `.frames/sdlc/ux/brand-deal-card.md` — existing card spec; needs per-variant extension
6. `.frames/sdlc/tasks/tasks.json` — contains references to "brand deal" that will need rename once this proposal accepts

## Open Questions

1. ~~**Variant-specific follower unlock thresholds** — at what follower counts do Livestream and Convention unlock? Brand Deal threshold is already resolved to TBD in `brand-deal-boost.md`. **Owner: game-designer (balance pass, once progression curve is finalized)**~~ **[RESOLVED — game-designer, 2026-04-05, balance pass]** See §9. Brand Deal: 1K. Livestream: 10K. Convention: 100K. Anchored to the locked progression curve and to the badge milestones.
2. ~~**Selection weights** — are 60/30/10 the right starting weights, or should Convention be rarer (e.g., 70/25/5)? **Owner: game-designer (balance pass, after playtesting)**~~ **[RESOLVED — game-designer, 2026-04-05, balance pass]** See §9. 60/30/10 confirmed for launch. Post-playtesting adjustment remains available as a `StaticData` tuning pass.
3. **Per-variant card visual treatment** — how do Brand Deal, Livestream, and Convention cards differ visually? Iconography, color accent, copy, animation? ~~Owner: ux-designer~~ **[RESOLVED — ux-designer, 2026-04-05]** Direction committed; full asset-level spec deferred to a follow-up UX task (`ux/gig-cards.md`). Direction:
  - **Duration is the loudest element on the card.** Variant recognition at tap-time is decision-critical — Convention's 10s window leaves no room for the player to misread and hesitate. Visual hierarchy: duration > variant name > icon > body copy. This inverts the conventional card reading order and is deliberate.
  - **Rarity signals through *arrival*, not static art.** The "Oh, a con!" moment the proposal names (§3) is produced by how the card enters, not how it looks once stationary. Brand Deal enters with the baseline motion (per existing `ux/brand-deal-card.md`). Livestream enters slower / heavier, signaling uptime. Convention enters fast + punchier, with a distinct audio/visual signature. Uniform entrance with different icons kills the emotional register.
  - **Shared lane, divergent accent.** All three cards live inside the existing corporate-green lane (distinct from viral gold) so the class reads as "Gig." Within that lane, each variant carries a secondary accent tone (Brand Deal: baseline green, Livestream: warm green-toward-amber, Convention: cooled green-toward-teal) sufficient to pass 3:1 UI-component contrast against the card background. Specifics go in the follow-up spec.
  - **Iconography:** phone/handshake (Brand Deal), broadcast dot / go-live badge (Livestream), crowd / badge-lanyard (Convention). Final icon set in the follow-up spec.
4. **State model rename and variant discriminator** — `GameState.brandDeal` becomes `GameState.gig`. `BrandDealOffer` gains a `variant_id: string` field; `ActiveBrandDeal` also gains `variant_id`. Is this the right shape, or should variant config be inlined into the state rather than referenced by id? ~~Owner: architect~~ **[RESOLVED — architect, 2026-04-05]** Reference by `variant_id`, plus snapshot of mutable behavior parameters at activation. See architect review below for the full state model (`GigOffer` carries `variant_id` only; `ActiveGig` carries `variant_id` + snapshotted `duration_ms` and `boost_multiplier`, mirroring the existing `ActiveBrandDeal` precedent). The variant's *identity* is stable and small; its *parameters* snapshot to insulate a running effect from mid-session StaticData tuning.
5. **Save migration** — the architect's plan in `brand-deal-boost.md` already required a v2→v3 bump for `brandDeal`. If this proposal accepts before the engineer implements v3, we can ship as v2→v3 with the Gigs shape directly (no v3→v4 needed). If implementation has already started, a second migration is required. ~~Owner: architect + engineer (coordinate on implementation sequence)~~ **[RESOLVED — architect, 2026-04-05]** v3 has already been consumed by the scandal system (`save/index.ts::migrateV2toV3` injects `accumulators`, `scandalStateMachine`, `scandalSessionSnapshot`). The brandDeal code was never implemented against v3. Therefore Gigs ships as **v3→v4**: a single `migrateV3toV4` that injects `{ ms_until_next_offer: 0, offer: null, active: null }` on `GameState.gig`. Only one migration step is required — the original v2→v3 concern is moot.
6. **Naming of "Convention"** — "Convention" is formal; "Con" is shorter and vibier but can be misread. The data/code identifier should be `convention`; the player-facing card text is a UX/copy decision. ~~Owner: ux-designer (copy)~~ **[RESOLVED — ux-designer, 2026-04-05]** On-card label is **"Convention"** (full word). "Con" collides with the Scandal system's vocabulary — players are being trained to read "con" as scheme/fraud elsewhere in this game, and we must not leak that semantic into a positive offer card. Data id stays `convention`. Short nicknames may live in secondary copy ("You got invited to a con!" in acknowledgment toasts) but not on the primary card label.
7. ~~**Do variants have sub-mechanics beyond multiplier/duration?** e.g., does Convention cost something to accept (a follower dip for "traveling")? Does Livestream require the player to stay on screen? These would turn variants into distinct sub-systems and move us back toward Framing B. **Recommendation: no sub-mechanics at launch — variants are pure parameter differences.** **Owner: game-designer (confirm)**~~ **[RESOLVED — game-designer, 2026-04-05]** Confirmed: **no sub-mechanics at launch**. Variants are pure parameter differences (multiplier, duration, weight, unlock threshold). Rationale: (a) sub-mechanics would fragment Gigs from one Actions-column citizen into three distinct systems — that is Framing B, which was explicitly rejected upstream; (b) the decision surface we want — *which kind of opportunity fits this moment?* — is already produced by payoff-shape differences alone, without requiring the variants to be distinct sub-systems; (c) YAGNI — if playtesting reveals the three-variant decision flattens, sub-mechanics become a candidate for a future proposal, not a speculative complication now. ux-designer's non-blocking observation (duration-as-loudest-element would need re-evaluation if sub-mechanics land later) is correctly parked as future-design work.

---
# Review: architect

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

The proposal is structurally a clean extension of the brand-deal-boost architecture rather than a redesign. The core tick pipeline, driver contract, and save-behavior model all carry over with only per-variant parameter substitutions. Two of my OQs (4 and 5) are answered below. I'm aligned and removing myself from the reviewers list.

---

## OQ4 — State model and variant discriminator

**Decision: reference variants by `variant_id`; snapshot mutable behavior params at activation.**

State model for the Gigs system:

```typescript
interface GigState {
  ms_until_next_offer: number;
  offer: GigOffer | null;
  active: ActiveGig | null;
}

interface GigOffer {
  /** Which variant was drawn from the weighted random roll. */
  variant_id: string;           // "brand_deal" | "livestream" | "convention" (string, not enum, for StaticData-driven extensibility)
  appeared_at: number;
  expires_at: number;
}

interface ActiveGig {
  variant_id: string;           // carried through from the offer that spawned it
  start_time: number;
  duration_ms: number;          // snapshot from StaticData.gigs.variants[variant_id] at activation
  boost_multiplier: number;     // snapshot from StaticData.gigs.variants[variant_id] at activation
}
```

Rationale:

- **`variant_id` in `GigOffer`**: the offer is a pointer to a variant config. The UI resolves variant_id → StaticData to render the right card. State stays small.
- **Snapshot in `ActiveGig`**: mirrors the existing `ActiveBrandDeal` precedent (duration_ms and boost_multiplier are already snapshotted). This insulates a running boost from mid-session StaticData tuning — if the balance pass nudges Convention from 5× to 4.5× mid-session, an already-running Convention finishes at 5× rather than jumping. The snapshot cost is ~16 bytes per active gig; the stability gain is worth it.
- **String ids, not an enum**: StaticData-driven extensibility. A new variant is a StaticData entry plus a card asset; no type-system change required. This matches the proposal's §5 "weights are StaticData values and tunable without code changes" posture.

Consequence for the tick pipeline: step 14c (spawn) runs the weighted-random roll against unlocked variants and writes the chosen `variant_id` into `offer`. Step 15 (boost) reads `active.boost_multiplier` directly — no StaticData lookup needed at tick time.

---

## OQ5 — Save migration

**Decision: Gigs ships as v3→v4. A single new migration step.**

The assumption in this OQ — that the architect's prior plan of v2→v3 for brandDeal might still be available — is stale. v3 has already been consumed:

- `client/src/save/index.ts::migrateV2toV3` injects `accumulators`, `scandalStateMachine`, and `scandalSessionSnapshot`.
- `CURRENT_VERSION = 3`.
- No brandDeal code ever landed against v3.

So: bump `CURRENT_VERSION` 3 → 4, implement `migrateV3toV4` that injects `{ ms_until_next_offer: 0, offer: null, active: null }` as `GameState.gig` default. On `load()`, clear any persisted `offer` and `active` before returning (transient; same rule as the original brand-deal-boost save-behavior table). Only one migration step is needed — not two.

Naming note: `GameState.brandDeal` (in the original plan) was never implemented, so there is no rename to worry about in save data. The first time the field enters the save schema, it enters as `GameState.gig`.

---

## Architecture delta from `brand-deal-boost.md`

For the planner/engineer who picks this up, here is what changes from the architect review inside brand-deal-boost.md:

| Concern | brand-deal-boost.md | gigs-system |
|---|---|---|
| `GameState` field name | `brandDeal` | `gig` |
| Offer type | `BrandDealOffer` | `GigOffer` (+ `variant_id`) |
| Active type | `ActiveBrandDeal` | `ActiveGig` (+ `variant_id`) |
| Driver offer event | `onBrandDealOffer` | `onGigOffer` |
| Driver activation fn | `activateBrandDeal()` | `activateGig()` |
| StaticData root | `StaticData.brandDeal` | `StaticData.gigs` (with `variants` map) |
| Spawn rule | unconditional if threshold met | weighted-random over *unlocked* variants; no spawn if pool empty |
| Unlock gating | single top-level threshold array | per-variant threshold (pool membership driven by thresholds) |
| Save migration | v2→v3 (planned, never shipped) | v3→v4 (single step) |

The tick pipeline steps themselves (13 expiry, 14 countdown+spawn, 15 engagement boost) remain structurally identical. Step 14c gains the weighted-random variant roll against the unlocked pool; step 15 is unchanged (reads snapshotted `boost_multiplier` from `active`).

**No new architecture doc required.** When this proposal is accepted, a planner can write tasks directly against this review + the brand-deal-boost.md architect review. If an architecture doc becomes warranted (e.g., if variants later grow sub-mechanics per OQ7), one can be added at `.frames/sdlc/architecture/gigs-system.md` at that time.

---
# Review: ux-designer

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

The three-variant card shape is workable. OQ3 and OQ6 are resolved in the Open Questions section above with direction; detailed per-variant card specs belong in a follow-up UX spec (`ux/gig-cards.md`), filed as a separate task alongside this review.

Key UX truths this proposal commits the card spec to honor:

1. **Duration is the decision-critical fact, not the variant name.** Convention at 10s leaves no slack — if a player misreads a Convention as a Brand Deal (20s) and hesitates 3 seconds, they've burned a third of the window. The card's visual hierarchy must put duration above the variant name and above the icon. This inverts conventional card reading order and is deliberate.

2. **Rarity produces feeling through *arrival*, not static art.** The proposal explicitly names the emotion ("Oh, a con!" §3). That emotion comes from how the rare card *enters*, not from a different icon on an identical entrance. Uniform approach animation with different icons kills the emotional register even if every static element is individually correct. The follow-up spec will define distinct entrance motion per variant.

3. **Copy: "Convention" on-card, not "Con."** The Scandal system trains players to read "con" as scheme/fraud. We do not want that semantic leak on a positive offer card. Data id `convention`; card label "Convention"; short forms allowed only in secondary copy.

Non-blocking observation: if sub-mechanics land later per OQ7, the duration-as-loudest-element rule will need re-evaluation — a variant with a "stay on screen" requirement shifts the decision from timing to commitment, and the card hierarchy should shift accordingly.

I am removing ux-designer from the reviewers list. Game-designer is added to the list to formally resolve OQ1, OQ2, and OQ7 (all game-designer-owned; two are deferred balance-pass items and one is a recommendation that needs author confirmation). Once game-designer parks those, this proposal can move to accepted.

---
# Review: game-designer

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

Final author review. Game-designer-owned OQs are now settled:

- **OQ1 (variant unlock thresholds)** & **OQ2 (selection weights)** — both formally deferred to the balance pass and captured as a forward game-designer task in `tasks.json`. OQ1 depends on the progression curve; OQ2 depends on playtesting. Starting weights of 60/30/10 ship as the launch default so we are not blocked on tuning.
- **OQ7 (sub-mechanics at launch?)** — confirmed **no**. Variants are pure parameter differences. Adding sub-mechanics (Livestream-requires-screen, Convention-costs-follower-dip, etc.) fragments Gigs from one Actions-column citizen into three distinct systems, which is Framing B — explicitly rejected upstream. The decision surface we want — *which kind of opportunity fits this moment?* — is already produced by payoff-shape differences alone. YAGNI holds: if playtesting reveals the three-variant decision flattens into habit, sub-mechanics become a future proposal, not speculative complication now. ux-designer's observation that duration-as-loudest-element would need re-evaluation if sub-mechanics land later is correct and correctly parked as future-design work.

architect and ux-designer reviews are both Aligned with substantive additions:
- architect's state model (`GigOffer` by `variant_id`, `ActiveGig` with snapshotted behavior params) is the right shape — it insulates running boosts from mid-session tuning and keeps StaticData-driven extensibility.
- architect's v3→v4 save migration correction is important; the earlier v2→v3 plan was stale.
- ux-designer's three card truths (duration-as-loudest, rarity-through-arrival, "Convention" not "Con") are the correct decisions on all three fronts.

The mechanic is honest, the class holds, and the emergent decision layer (variant × viral-timing) is earned by a small surface. Removing game-designer from reviewers. Reviewers list empty. Moving proposal to accepted.
