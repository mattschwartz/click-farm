---
name: Creator Kit Upgrades (Per-Run)
description: Introduces a themed per-run upgrade menu — Camera, Laptop, Phone, Wardrobe, Mogging — purchased with Engagement and wiped on rebrand, giving players a diegetic "invest in yourself as a creator" layer between generator-buying and prestige.
author: game-designer
status: draft
reviewers: [architect, ux-designer]
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
6. **Menu UI placement.** Where does the Creator Kit menu live in the UI? Inline with the generator list? A separate tab? A dedicated strip? This affects player attention and flow. **Owner: ux-designer**.
7. **Icons and copy.** Each kit item needs an icon and flavor copy that lands the satirical creator-culture tone without drifting into mean-spirited. **Owner: ux-designer** (visual direction) with **game-designer** collaboration on copy.
