---
name: Creator Kit Upgrades (Per-Run)
description: Introduces a themed per-run upgrade menu — Camera, Laptop, Phone, Wardrobe, Mogging — purchased with Engagement and wiped on rebrand, giving players a diegetic "invest in yourself as a creator" layer between generator-buying and prestige.
created: 2026-04-05
author: game-designer
status: accepted
reviewers: []
---

# Proposal: Creator Kit Upgrades (Per-Run)

## Problem

The current per-run upgrade surface is one-dimensional: you buy generator units, you level up generators, that's it. There is no diegetic "I am a creator, and I am investing in my craft" layer. The Clout menu owns the meta/prestige feeling — but Clout is slow (earned once per rebrand) and abstract (Engagement Boost, Algorithm Insight). Between the fast generator loop and the slow prestige loop, the player has no mid-tempo decisions about who they are this run.

The fantasy of Click Farm (per `core-game-identity-and-loop.md` §1) is a creator grinding up. Right now, the grind is purely about the *platform* (generators and algorithms). The *creator* — the fictional protagonist the player is inhabiting — has no mechanical presence. Adding a themed per-run upgrade menu gives the creator a surface area. You're not just stacking Tutorials; you're buying a new Laptop. You're not just going viral; you're Mogging.

This proposal defines that menu.

## Proposal

### Design Principles

**Diegetic, not abstract.** The items in this menu are things a creator would actually buy/do. Camera, Laptop, Phone, Wardrobe, Mogging — every item names a real-world creator-investment that the player instinctively understands.

**Per-run investment, not permanent mastery.** These are wiped on rebrand. They represent the gear and posture of *this particular creator identity*. When you rebrand, you start fresh — new persona, new kit. This reinforces the rebrand narrative ("You've learned everything this identity can teach you") with mechanical weight: you lose your kit, not just your followers.

**Stacks with Clout, does not replace it.** Clout upgrades are the permanent ceiling. Creator Kit upgrades are the paint-by-numbers layer inside each run. Three of the five items mirror Clout axes (Camera ↔ Engagement Boost, Laptop ↔ Algorithm Insight, Phone ↔ Platform Head-Start) and stack multiplicatively with them. Two items (Wardrobe, Mogging) occupy new axes Clout doesn't touch.

**Each item in a distinct decision space.** Same principle as the Clout menu. No two items compete for the same goal. The choice of which kit item to buy first reveals how you're playing *this* creator identity.

---

### The Menu

Five items, each multi-level, purchased with Engagement.

---

#### 📷 Camera
*Boosts engagement rate this run. Mirrors Clout's Engagement Boost — stacks multiplicatively.*

The baseline creator investment. Every creator's first upgrade. A better camera means better content means more engagement. Mechanically identical in shape to Engagement Boost, just scoped to this run.

**Decision space:** Raw production speed. If you just want numbers to go up faster, this is the lever.

---

#### 💻 Laptop
*Gives this-run algorithm lookahead. Mirrors Clout's Algorithm Insight — stacks additively (levels add together).*

You can see upcoming Algorithm shifts because you're analyzing trends on your laptop. Mechanically: adds to the number of upcoming algorithm states visible in the UI. If the player has Clout Algorithm Insight L1 (see 1 upcoming) and Laptop L1 (+1 lookahead), they see 2. Additive stacking matches the semantic: "I have more insight" is a sum, not a product.

**Decision space:** Strategic positioning. If you're already reading the algorithm, this lets you read further.

---

#### 📱 Phone
*Unlocks a platform at run start, scoped to this run only. Mirrors Clout's Platform Head-Start — but temporary.*

You're always online on your phone, so you're on every platform. Mechanically: each level of Phone head-starts one additional platform from the beginning of this run. If the player has already Clout-purchased Instasham head-start, Phone L1 head-starts Grindset; L2 head-starts the next platform (when one exists).

**Interaction with Clout Platform Head-Start:** Clout version is permanent and platform-specific (Instasham head-start, Grindset head-start). Phone is temporary and sequential (head-start the next-available platform). They do not overlap — Phone head-starts platforms Clout hasn't already bought head-starts for.

**Decision space:** Run opening tempo. Buy Phone early if you want to be on multiple platforms fast this run.

---

#### 👔 Wardrobe
*Boosts follower conversion rate this run. A new axis Clout does not touch.*

You dressed for the part, so audiences stick around. Mechanically: multiplies the Engagement → Followers conversion rate. This is the slow-cycle currency lever — doesn't speed up engagement production, but converts more of it into lasting followers.

**Why Wardrobe is new (not a Clout mirror):** Follower conversion is the engine of the scaling curve (`floor(sqrt(total_followers) / 10)` rebrand formula). Clout doesn't buy conversion-rate upgrades — the math of prestige ramps naturally off total_followers. Giving players an in-run lever on this stat rewards *staying in the run longer* (to see the conversion snowball) without permanent escalation.

**Decision space:** Long-run commitment. Buy Wardrobe if you're planning a big rebrand run and want the late-game curve to pay off harder.

---

#### 💪 Mogging
*Amplifies viral burst magnitude this run. A new axis Clout does not touch.*

You're not just posting; you're *dominating*. When the viral burst hits, it hits harder. Mechanically: increases the viral burst multiplier (per `viral-burst-event-signal.md`) for the duration of this run. If base viral is 3–5×, Mogging L1 might push it to 4–6×, and so on.

**Why Mogging is new (not a Clout mirror):** Clout doesn't buy viral-burst amplification. Viral burst is the game's peak emotional moment, and letting players *pay to make the peak higher* is a great per-run lever. It rewards players who learn to recognize viral conditions and want bigger payoffs when they hit. It's also thematically perfect: mogging is about magnifying your presence in a moment.

**Decision space:** Peak-chasing. Buy Mogging if you're optimizing for big viral moments and want the explosion to explode harder.

---

### Stacking Summary

| Axis | Clout Upgrade | Creator Kit Upgrade | Stacking |
|------|---------------|---------------------|----------|
| Engagement rate | Engagement Boost (permanent, up to 5× cumulative) | Camera (per-run) | Multiplicative |
| Algorithm lookahead | Algorithm Insight (permanent, up to 2 states) | Laptop (per-run) | Additive |
| Platform head-start | Instasham / Grindset head-starts (permanent, specific) | Phone (per-run, sequential) | Sequential (no overlap) |
| Follower conversion | — | Wardrobe (per-run) | Wardrobe only |
| Viral burst magnitude | — | Mogging (per-run) | Mogging only |
| Post-prestige generators | AI Slop / Deepfakes / Algorithmic Prophecy | — | Clout only |

The menu is five items. Three stack with Clout to extend existing axes. Two own new axes. None overlap semantically.

---

### Unlock & Availability

All five Creator Kit items are available from the start of every run. There is no follower-threshold gating on the menu itself — it's visible and purchasable from tick one. The gating is economic: tier-1 items cost enough Engagement that you're not buying them on your first three clicks, and tier-3+ items cost enough that you're committing your run to them.

**Why all-at-once and not staggered:** The Clout menu stages its reveal through cost and timing across multiple rebrands. The Creator Kit is the *this-run* menu — staging its reveal within a single run adds a layer of onboarding (every run: "here comes Mogging") that gets tedious after rebrand 3. Showing the whole menu up front respects the player's growing mastery.

---

### Economy Integration

- **Currency:** Engagement
- **Purchase model:** Multi-level per item, identical in shape to Clout (pay to advance from L→L+1)
- **Reset:** Wiped on rebrand. All kit levels return to 0.
- **Refund on rebrand:** None — Engagement is wiped alongside it anyway, so a refund is meaningless.
- **Stacks with Clout:** Yes, per the table above. Clout is the ceiling; kit is the per-run fill.

---

### Engagement Line Check

Three-question test:

1. **Is this mechanic honest?** Yes — every item's effect is stated, visible, and applies for the entire run. No hidden modifiers, no "legendary drop rates."
2. **Can the player quit without loss?** Yes — kit purchases are wiped on rebrand, which the player chooses. Closing the game doesn't forfeit anything.
3. **Is progression tied to engagement or just time?** Yes — buying kit items requires Engagement, which requires active or informed play. Idle accumulation earns kit levels slowly; strategic play earns them fast.

**Wardrobe-specific concern:** A follower-conversion multiplier is a powerful lever. If miscalibrated, it trivializes the rebrand curve. This is a balance-pass item, not an engagement-line item, but flagging it here so balance doesn't get lost.

**Mogging-specific concern:** Amplifying the viral burst is great fun, but if it stacks unchecked with Brand Deal (which also multiplies engagement), the compound moment could become absurd. This is desirable up to a point — the game *is* satirical escalation — but a cap on total peak multiplier may be needed. Flagged for balance.

---

### What This Locks In

- A per-run upgrade menu exists alongside the Clout menu
- Five items: Camera, Laptop, Phone, Wardrobe, Mogging
- Each item is multi-level
- Purchased with Engagement
- Wiped on rebrand
- The three overlap axes (engagement, algorithm insight, platform head-start) stack with Clout
- The two new axes (follower conversion, viral burst magnitude) do not exist in Clout

### What This Leaves Open

- Exact number of levels per item — balance pass
- Cost curve per item — balance pass
- Effect magnitude per level — balance pass
- Whether Phone's sequential head-start interacts correctly when player has all platforms unlocked (ceiling behavior) — architect
- Whether Mogging's viral burst magnitude cap is needed — balance pass
- UI placement of the Creator Kit menu relative to the generator list and Clout prestige screen — ux-designer
- Icon/art direction for each kit item — ux-designer
- Whether Wardrobe's follower conversion multiplier applies at the engagement→follower conversion step, or retroactively to follower-gated unlocks — architect

## References

1. `.frames/sdlc/proposals/accepted/core-game-identity-and-loop.md` §1 (fantasy), §3 (generators), §6 (economy), §7 (rebrand) — the creator fantasy this menu makes diegetic, and the economy it plugs into
2. `.frames/sdlc/proposals/accepted/clout-upgrade-menu.md` — structural template for a flat multi-level upgrade menu; defines the three axes Creator Kit mirrors
3. `.frames/sdlc/proposals/accepted/clout-to-follower-scaling-curve.md` — the `floor(sqrt(total_followers) / 10)` rebrand formula that Wardrobe accelerates
4. `.frames/sdlc/proposals/accepted/viral-burst-event-signal.md` — viral burst magnitude model that Mogging amplifies
5. `.frames/sdlc/architecture/core-systems.md` — CloutUpgrade data model; the Creator Kit will likely mirror this shape with a parallel per-run state field

## Open Questions

1. **Phone ceiling behavior.** When the player has already Clout-purchased head-starts for every available platform, does Phone become inert this run (purchasable but effectless), hidden, or does it fall back to a different benefit? **Owner: game-designer** (design intent), with **architect** confirmation that the fallback is implementable.
2. **Wardrobe application point.** Does the follower-conversion multiplier apply at the conversion step (every engagement → followers tick gets multiplied), or does it retroactively apply when a follower threshold is crossed (unlocks happen earlier)? These produce different feels. **Owner: architect** — the data model question; game-designer will confirm the intended feel once architect clarifies the options.
3. **Mogging cap.** Should the total viral burst magnitude be capped regardless of Mogging level, to prevent compound-moment absurdity (Mogging × Brand Deal × Viral Burst × Engagement Boost)? **Owner: game-designer** (balance pass) — flag only, resolve with numbers once all inputs are defined.
4. **Cost curves.** What does each tier cost in Engagement? Curve should be calibrated against generator production rates so that kit upgrades feel achievable on a first run but the top tiers are a commitment. **Owner: game-designer** (balance pass) — separate task after progression curve is defined.
5. **Level counts per item.** How many levels does each item have? Clout uses 2–3 per item. Creator Kit may want more (since it's wiped and re-earned every run, a deeper track is more replayable). Leaning toward 3–5 levels per item, but this is a balance pass question. **Owner: game-designer** (balance pass).
6. **Menu UI placement.** Where does the Creator Kit menu live in the UI? Inline with the generator list? A separate tab? A dedicated strip? This affects player attention and flow. ~~Owner: ux-designer~~ **[RESOLVED — ux-designer, 2026-04-05]** Direction: **dedicated collapsible panel**, not inline with the generator list. Rationale:
  - **Inline competes with the primary loop.** Kit items share the shape of generator upgrades (multi-level, Engagement-priced, stack). Putting them in the same scroll as generators forces the player to parse "is Camera L3 a generator peer, or a modifier on generators?" at a glance. Separating the shelves preserves the generator list's role as the first-glance primary loop.
  - **Hiding entirely re-creates the Engagement-spend competition problem.** Engagement is already contested between "more Tutorials" and "more kit." If kit lives behind a closed drawer, the player won't see the tradeoff at the moment they're about to spend. So the collapsed panel must carry a **peek-visible spend signal**: when the player's Engagement balance crosses the next affordable kit tier, a subtle affordance surfaces at the decision point (near the currency readout, not inside the panel). Exact treatment → follow-up spec.
  - **Visual weight is secondary.** The kit panel lives in the interface but must not compete with the generator list for first-glance attention. Weight budget: smaller type scale than generator rows, receded color treatment, clear "shelf" divider.
  - Full placement, panel behavior, peek-signal affordance, and open/close interaction go in a follow-up UX spec (`ux/creator-kit-panel.md`), filed as a separate task.
7. **Icons and copy.** Each kit item needs an icon and flavor copy that lands the satirical creator-culture tone without drifting into mean-spirited. ~~Owner: ux-designer~~ **[RESOLVED — ux-designer, 2026-04-05]** Approach committed; asset set and copy drafts deferred to the follow-up spec.
  - **One icon per item.** Single, legible glyph at list-row scale (Camera, Laptop, Phone, Wardrobe, Mogging). Icons carry recognition; the label carries the name. No icon does double duty.
  - **Flavor copy: satirical-but-warm, never sneering.** The tone the game already lives in (per `core-game-identity-and-loop.md`) is parody-with-affection. A Mogging flavor line laughs *with* the creator-economy culture it names, not *at* it. Copy drafts will be written jointly with game-designer.
  - Final icon set, colors, copy drafts → follow-up UX spec.

---
# Review: ux-designer

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

Structurally sound proposal. My concerns are non-blocking and resolvable in the UX spec that follows. OQ6 (menu placement) and OQ7 (icons and copy) are resolved in the Open Questions section above with direction; detailed spec goes in a follow-up task (`ux/creator-kit-panel.md`).

Key non-blocking observations the follow-up spec must carry:

1. **Screen real estate is getting dense.** The core screen now carries: generator list, Actions column (Gigs + future citizens), algorithm mood, scandal indicators, currency readouts, rebrand prompt, and five always-visible kit items. First-run cognitive load rises with every simultaneous system. The "no tutorial" test gets measurably harder when the first-run player sees this much surface at once. The kit panel's collapsible/peek treatment is specifically how we protect first-run cognitive load — not a style preference.

2. **Kit items shape-clone generator rows.** Multi-level, Engagement-priced, stackable. That visual collision is the most important problem to avoid. The follow-up spec will differentiate through placement, type scale, and color — not through competing for the same visual weight as generators.

3. **Engagement-spend competition must be legible at the decision point.** When a player has enough Engagement for both "next Tutorials unit" and "Camera L2," the tradeoff belongs in front of them, not buried inside a closed panel. The peek-signal affordance is the mechanism for this (see OQ6 resolution).

4. **Kit wipe on rebrand is a ceremony beat.** The rebrand ceremony already carries gravitas (per the prestige flow in progress). "Your kit falls away as you pivot" is a natural diegetic addition — no extra ceremony length, just a kit-clearing moment folded into the existing sequence. Flagged for the rebrand ceremony spec, not this proposal.

Architect still needs to review (OQ1 Phone ceiling, OQ2 Wardrobe application point). I'm removing ux-designer from the reviewers list.

---
# Review: architect

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

Aligned. Creator Kit is a clean mirror of the CloutUpgrade architecture — same data shape, parallel effects table, single-line addition to `applyRebrand`, two new effect types. No new component boundaries, no hidden coupling. The architectural risk surface is low because the pattern is already proven.

Resolving the two architect-owned open questions (OQ#1, OQ#2) and recording the data-model delta that the follow-on architecture spec will formalize.

**OQ#2 — Wardrobe application point. Recommendation: apply at the conversion step (Option A).**

The brief offers two interpretations:
- **A. At the conversion step.** Wardrobe multiplier enters the tick's follower-distribution formula alongside `content_affinity` (`core-systems.md` line 388). Every engagement→follower tick is multiplied.
- **B. Retroactively to unlock thresholds.** Each Wardrobe level-up lowers follower thresholds for unlocks, causing unlocks to happen earlier.

**I recommend A.** Three reasons:

1. The design brief says "multiplies the Engagement → Followers *conversion rate*." By plain reading that is Option A. Option B is a different mechanic — unlock acceleration — being called by Wardrobe's name. The wrong abstraction.
2. Option B retroactively mutates unlock state on a separate axis. Every Wardrobe level-up would trigger a threshold-recomputation pass over generators and platforms. That's state churn on a subsystem (unlocks) that currently has no conceptual relationship to engagement-follower conversion.
3. Option A mirrors how Camera (engagement_multiplier) already works — a single multiplier at one known point in the tick pipeline, one step later in the chain. The architectural symmetry is the feature.

Game-designer can confirm the feel, but the data model points clearly at A.

**OQ#1 — Phone ceiling behavior (implementability confirmation).**

All three fallback behaviors are implementable. Ranking by architectural fit:

- **Inert** (purchasable, no effect when all platforms already head-started): one-pass check over `platforms`, trivial. Honest but may feel bad.
- **Hidden** (kit item gated out of the menu when saturated): dynamic menu-item visibility — already a pattern in the UI. Cleanest.
- **Fallback-Benefit** (Phone converts to a different effect when saturated): implementable, but introduces variable-effect kit items. No current Clout or Kit item has this shape — each item has one effect. Adds a coupling I would prefer to avoid because it complicates the effect-type contract and sets a precedent for multi-modal items.

**My recommendation to game-designer: pick between Inert and Hidden. Avoid Fallback-Benefit** to preserve the single-effect invariant for all kit/clout items. Both Inert and Hidden are architecturally trivial; the choice is a design/feel call.

**Data model delta (for the follow-on architecture spec):**

Player state additions:
```
creator_kit: map<kit_item_id, int>   // wiped on rebrand
```

Static data additions:
```
creatorKitItems: Record<KitItemId, KitItemDef>
```

`KitItemDef` mirrors `CloutUpgradeDef` in shape (id, max_level, values-per-level, effect discriminator). New effect discriminators required:

- `follower_conversion_multiplier` (Wardrobe) — multiplies per-tick follower output at `core-systems.md` line 388
- `viral_burst_amplifier` (Mogging) — new read point in the viral burst system

Existing effect types are reused directly:

- `engagement_multiplier` (Camera) — identical to Clout's Engagement Boost
- `algorithm_lookahead` (Laptop) — same shape as `algorithm_insight` (increments visible-upcoming-states count; stacks **additively** per proposal)
- `platform_headstart` (Phone) — same effect type as Clout's, with sequential-platform selection semantics (picks next available platform not already head-started by Clout)

**`applyRebrand` integration — one line.**

The reset pass in `applyRebrand` (`core-systems.md` §Rebrand) gains `creator_kit = {}`. Kit state MUST NOT appear in the preservation list (which currently preserves `clout`, `clout_upgrades`, `lifetime_followers`, `rebrand_count`, and seed). This is a contained, well-fenced change.

**Save schema:**

Version bump required. Existing saves default `creator_kit = {}` on load. Forward-only migration — trivial.

**Stacking contract (non-blocking architectural note):**

The proposal specifies Camera × Clout Engagement Boost as multiplicative. Multiplicative stacking is order-independent, so there is no ambiguity in the current design. However, the follow-on architecture spec should record the stacking-order convention explicitly (e.g., "pre-clout bonuses vs post-clout bonuses"), because additive or clamped effects in future items will need a defined evaluation order. Flagging for the arch spec; not blocking this proposal.

**Coupling summary:**

| Touchpoint | Integration | New coupling? |
|---|---|---|
| Economy (engagement spend) | Same pattern as Clout purchase | No |
| Tick (Camera, Wardrobe, Laptop effects) | One multiplier in an existing formula line | No |
| Platform system (Phone head-starts) | Same effect type as Clout `platform_headstart` | No |
| Viral burst system (Mogging) | One new read point for burst multiplier | One new read, no data-flow change |
| Rebrand (wipe on `applyRebrand`) | One line in the reset pass | No |

Five touchpoints, all at known integration points, one genuinely new read path (Mogging → viral burst). This is a low-risk architectural addition.

**Open questions remaining:**

- **OQ#3** (Mogging cap) — game-designer balance pass
- **OQ#4** (cost curves) — game-designer balance pass
- **OQ#5** (level counts per item) — game-designer balance pass

All three are author-scoped balance work, explicitly flagged in the proposal as "balance pass" items. Following the precedent set on typography-system: author-owned downstream work does not block acceptance of the architectural direction. OQ#6 and OQ#7 were already resolved by ux-designer.

**Summary:** Aligned on the design. OQ#2 resolved (Wardrobe = conversion-step multiplier). OQ#1 architecturally cleared (Inert or Hidden, game-designer to pick feel). Data model delta documented for the follow-on architecture spec I will write after acceptance. Removing myself from reviewers; moving to accepted.
