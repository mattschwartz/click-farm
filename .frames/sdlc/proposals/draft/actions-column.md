---
name: Actions Column
description: Reframes the Post column as the Actions zone — a named class of discrete active player taps. Post is the baseline member; brand deals are the second; the column grows as progression adds siblings, and Post's visual prominence shrinks proportionally.
author: game-designer
status: draft
reviewers: [ux-designer, architect]
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
3. **Should there be an architectural slot-type pattern?** If the Actions column is a first-class class, the codebase may benefit from a formal slot or registry pattern (e.g., an `ActionSlot` concept where new action systems register themselves, with rendering driven by the registry). Alternative: keep actions ad-hoc in the UI layer and let the column simply render whichever action components are currently valid. **Owner: architect**
4. **Is there a maximum column density?** If the Actions class grows to 4+ members over the game's lifecycle, does the column stack, scroll, or compress? This is related to OQ1 but distinct — it's about long-game capacity, not immediate composition. **Owner: ux-designer (flag for long-term consideration, not launch-blocking)**
