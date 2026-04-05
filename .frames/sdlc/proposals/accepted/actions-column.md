---
name: Actions Column
description: Reframes the Post column as the Actions zone — a named class of discrete active player taps. Post is the baseline member; brand deals are the second; the column grows as progression adds siblings, and Post's visual prominence shrinks proportionally.
created: 2026-04-05
author: game-designer
status: accepted
reviewers: []
---

# Proposal: Actions Column

## Problem

The Post button occupies roughly a third of the game screen, but it is not the primary player interaction. The primary loop is tapping upgrades and watching the rate climb. Post is meaningful in the first few minutes — it teaches the player they are a poster, it is the only diegetic action — and then it largely goes dormant. A button that size with no late-game decision attached is dead UI.

Two framings were considered:

1. **Post is a vestigial tutorial button.** Shrink it aggressively, let upgrades take the space.
2. **Post is underdesigned.** Give it a late-game decision so it earns its footprint.

Neither is quite right. Framing (1) kills the diegetic anchor — "I am a poster" is the core fantasy of a social media clicker, and losing the visible Post button costs us the premise. Framing (2) risks over-designing Post itself when the actual problem is adjacent: the **column** is named and sized for a single action that will not stay primary forever.

The current UX specs already place brand deals inside the post zone (`ux/core-game-screen.md` §2, `ux/brand-deal-card.md` §2.1, `ux/mobile-layout.md` §7). The pattern is emerging implicitly. This proposal names it, commits to it as a system class, and changes how the column evolves.

## Proposal

### 1. The Actions Column Is a Named Class

The left column of the game screen is the **Actions** zone: the home for every discrete active player tap the game ever introduces. This is a first-class category in the game's system taxonomy, not an ad-hoc grouping.

An **action** is any player interaction that:
- Fires on a single tap (not held, not dragged, not scrolled)
- Produces an immediate gameplay effect (boost, burst, event)
- Is meaningful throughout the game's lifecycle, not consumed on use

This distinguishes actions from:
- **Upgrades** — investment decisions made from a list (middle column)
- **Platform interactions** — readouts and drilldowns (right column)
- **Modals and drawers** — occasional context surfaces

### 2. Post Is the Baseline Member

> **[SUPERSEDED by `proposals/accepted/manual-action-ladder.md` — 2026-04-05]** The baseline Actions member is no longer a single "Post" button. It is **Chirp**, the first rung of the manual-action ladder (5 content-medium verbs: chirps → selfies → livestreams → podcasts → viral_stunts). The "always available" and "diegetic anchor" properties transfer to Chirp: Chirp is unlocked at engagement 0, has no unlock cost, and is the only action in the column at game start. The column's growing population is now carried by the ladder's Unlock → Upgrade → Automate lifecycle — each ladder rung crosses its engagement threshold and becomes a new Actions-column member. Historical text below preserved for context.

Post remains in the Actions column as its founding member. It is not given a new internal decision. It remains:
- The diegetic anchor — pressing Post is being a poster
- Always available
- The only action in the column at game start

Post's role is honest: in early game it is the game, because nothing else is in the column. In mid-late game it is the baseline rhythm, pressed when nothing else is lit. It does not need additional mechanical weight because the column's **growing population** is what carries progression.

### 3. Brand Deals Are the Second Member

Brand deals (already designed in `proposals/accepted/brand-deal-boost.md` and `ux/brand-deal-card.md`) are the second citizen of the Actions column. They are unlocked by follower threshold, appear at random intervals, and are tapped like Post — the same action grammar. Their existing design is unchanged by this proposal.

What changes: they are now understood as a **member of a class**, not a one-off feature plugged into the post zone.

### 4. Post Shrinks as Siblings Arrive

Post's visual prominence is proportional to its share of the column's relevance. When Post is the only action, it earns the full column. When brand deals unlock, Post shrinks. When additional action-class members ship (future), Post shrinks again.

The shrinking is the progression signal. The player does not need the game to tell them they have grown — the Actions column visibly densifying is the story. Cookie Clicker teaches this with its Golden Cookies and Sugar Lumps: the player's surface area of available levers grows over time, and the growth is legible.

This proposal does not specify *how* Post shrinks (thumbnail size, layout rules, animation). That is UX's call. This proposal only establishes that Post's footprint is not fixed — it is a function of how many siblings share the column.

### 5. Future Actions Plug Into This Column

Any future system that introduces a discrete active player tap — collab events, algorithm storms, fan-mail bursts, whatever the game needs — lives in the Actions column. New active-tap systems do NOT get new columns, new screen zones, or new floating elements. They compete for space in the existing Actions class.

This is a discipline constraint. It prevents the screen from accumulating ad-hoc action buttons in arbitrary locations, and it forces new active-action proposals to justify themselves against the existing members (rather than hiding behind "we'll just add it somewhere").

### 6. Engagement Line Check

Three-question test:
1. **Is this mechanic honest?** Yes — actions are visible, their effects are real, the player taps what they see.
2. **Can the player quit without loss?** Yes — this is a structural change, not a new compulsion loop. No action introduces a penalty for absence.
3. **Is progression tied to engagement or just time?** Yes — action members unlock through progression milestones (follower thresholds, etc.), and the skill of using them well is the ceiling.

No concerns.

## References

1. `ux/core-game-screen.md` §2 — zone map; post zone definition that this proposal renames
2. `ux/mobile-layout.md` §2 decision #4, §7 — "post zone is a fixed bottom bar" and "the post button is the primary interaction"; this proposal changes the column's identity and requires UX-designer to revisit
3. `ux/brand-deal-card.md` §2.1 — brand deal card lives in the post zone; confirms the Actions-column pattern is already implicit
4. `proposals/accepted/brand-deal-boost.md` — second member of the Actions class; unchanged by this proposal
5. `proposals/accepted/core-game-identity-and-loop.md` — core loop that Post is the diegetic anchor of

## Open Questions

1. **When does Post start shrinking, and by what rule?** Trigger options: (a) the moment the first sibling arrives (brand-deal unlock threshold crossed), (b) a gradual shrink tied to the player's follower progression, (c) a step-function shrink at defined milestones. This is a layout-composition question. **Owner: ux-designer**
2. **Does Post-as-bottom-bar on mobile still hold?** `ux/mobile-layout.md` §2 decision #4 anchored Post as a full-width fixed bottom bar because it was "the primary interaction." Under the Actions-column framing, Post is *a* primary interaction, not *the* primary interaction. The bottom bar may need to become an Actions bar that holds Post + active siblings, or the composition may change entirely. **Owner: ux-designer**
3. ~~**Should there be an architectural slot-type pattern?** If the Actions column is a first-class class, the codebase may benefit from a formal slot or registry pattern (e.g., an `ActionSlot` concept where new action systems register themselves, with rendering driven by the registry). Alternative: keep actions ad-hoc in the UI layer and let the column simply render whichever action components are currently valid. **Owner: architect**~~ **[RESOLVED — architect, 2026-04-05]** Ad-hoc rendering. The column's membership is fixed at build time (no runtime extensibility needed), realistically 3–5 members across the full game lifecycle, and each member is strongly curated with its own visual identity. A formal registry pattern would push implementation toward a lowest-common-denominator slot spec that flattens the feel of each member. YAGNI — if a registry becomes obviously useful at member 4 or 5, introduce it then.
4. **Is there a maximum column density?** If the Actions class grows to 4+ members over the game's lifecycle, does the column stack, scroll, or compress? This is related to OQ1 but distinct — it's about long-game capacity, not immediate composition. **Owner: ux-designer (flag for long-term consideration, not launch-blocking)**
   - **Answer (ux-designer, 2026-04-05):** Soft cap at 4 members. Desktop column scrolls internally at 5+ — no action compresses below 80px height. On mobile, the Actions zone caps at ~55% viewport height before introducing internal scroll. No action element (Post included) compresses below its minimum tap target. This is not a launch concern.

---
# Review: ux-designer

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

The proposal is correct and the emergent pattern was always going to need naming. My answers to the UX-owned open questions follow.

**OQ1 — When does Post start shrinking, and by what rule?**

Option (a): trigger is the brand-deal unlock threshold. The column's composition reflects the player's progression state, not the instantaneous presence of an active card. If Post shrank back to full height whenever no brand deal was currently showing and re-shrank when the next one appeared, the UI would breathe in a way that contradicts the "you've grown" read. Growth is one-directional.

Concrete layout rule: when brand deals unlock, the post zone permanently reserves **88px** at the bottom of the column for the brand-deal slot — matching the card height already specced in `ux/brand-deal-card.md` §2.1. Post resizes from 220px to ~170px tall. The transition is a 400ms ease-out height change on the post button element. When no deal is currently active, the reserved slot shows nothing (no placeholder, no ghost) — it is simply space. When a deal card arrives it fills its slot; when it expires it leaves the slot empty again.

**Non-blocking flag for author:** `ux/brand-deal-card.md` §2.1 currently says the card "floats over the column bottom — does not push the Post button or rate display upward." Under the Actions Column model, the card occupies a reserved dedicated slot rather than floating. §2.1 will need a small update once this proposal is accepted. UX will make that edit.

**OQ2 — Does Post-as-bottom-bar on mobile still hold?**

Yes, with a reframe. The 96px fixed bottom bar stays, but it is now the **Post anchor of the Actions zone**, not the full extent of the Actions zone. The mobile Actions zone grows upward from the Post bar as siblings arrive.

Concrete layout: brand deals already appear in a full-width 88px strip above the Post bar (per `ux/brand-deal-card.md` §6.1 — this was already specced correctly before this proposal existed). That strip is now understood as the first tier of the Actions zone above the Post anchor. Future siblings would stack above brand deals, below the prestige row, within a capped zone height. Post itself stays 96px because shrinking a full-width bar below 96px degrades thumb reachability — it never compresses.

On mobile, "Post's visual prominence shrinks" manifests not as Post getting smaller but as the zone growing to include siblings that earn comparable visual weight. Post remains the bottom anchor; the zone grows up. The net effect on Post is the same — it is no longer the only thing in the zone — without compromising tap ergonomics.

**OQ4 — answered inline above under OQ4.**

**On the brand-deal-card float spec conflict:** flagged under OQ1 — non-blocking, author does not need to revise this proposal. UX will update the brand-deal-card spec after this proposal is accepted.

---
# Review: architect

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

This is a naming/discipline doc for a UX taxonomy — there is no architectural surface here beyond the slot-pattern question I already resolved under OQ3 (ad-hoc rendering, YAGNI on registry).

No data model implications: Post and brand deals already have their own systems and state. The Actions Column is a rendering grouping, not a data boundary. Nothing crosses this line that isn't already crossing existing lines.

The discipline constraint in §5 — "new active-tap systems plug into this column, not new zones" — is governance, and I endorse it. Unbounded screen-zone proliferation is a real failure mode in clicker UIs and naming this constraint up front is cheaper than unwinding it later.

All open questions resolved (mine in OQ3; UX-designer's in OQ1, OQ2, OQ4). Last reviewer, no architectural blockers. Moving to accepted.
