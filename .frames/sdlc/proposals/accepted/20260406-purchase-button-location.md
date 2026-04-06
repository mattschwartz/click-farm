---
name: Purchase Button Location — Generators Column
description: All three purchase tracks (LVL UP, BUY, Autoclicker) live in the Generators center column, not on the action button slab.
created: 2026-04-06
author: ux-designer
status: accepted
reviewers: []
---

# Proposal: Purchase Button Location — Generators Column

## Problem

The level-driven-manual-cooldown proposal introduces three purchase tracks per verb (LVL UP, BUY, Autoclicker), replacing the old Upgrade/Automate pair. The proposal specifies what each track does mechanically but does not specify where the purchase buttons live in the UI. This is a layout question that blocks engineer work on UI wiring (task E4).

Three options were considered:

- **(A) All three in the Generators center column** — extends the current pattern where upgrade/automate controls live in the strategic center ledger.
- **(B) All three on the action button slab** — co-locates verb controls with the tap target.
- **(C) Hybrid** — some controls on the slab, some in the Generators column.

## Proposal

**Option A: all three purchase tracks live in the Generators center column.** The action button slab remains a pure tap target with no purchase controls.

### Rationale

**1. The arcade slab's job is to be smacked.**
The action-button-physicality spec invested significant design effort in making these buttons feel like raised, spring-loaded arcade buttons with 3px travel and snap-back physics. Bolting purchase sub-buttons onto an 80px slab turns it from an arcade button into a dashboard widget. The physicality evaporates.

**2. The physical separation between tap target and purchase controls is a feature, not a tradeoff.**
"Left column = perform the verb, center column = invest in the verb" is a clean spatial grammar the player learns once. It scales as verb count grows from 1 to 5 without the action buttons becoming increasingly cluttered. The Generators column is already defined as the strategic surface — "where [the player] allocate[s] attention" (core-game-screen spec §4).

**3. The three feelings are delivered through the tap, not through button proximity.**
When the player purchases LVL UP, they feel it on the next tap cycle — the cooldown ring drains faster. When they BUY, the yield display updates and the next tap lands harder. When they purchase an Autoclicker, the badge appears and the slab starts ticking on its own. The action button *reflects* all three investments without *housing* their controls.

**4. Co-locating controls on the slab would flatten the three distinct emotional registers.**
Putting LVL UP, BUY, and Autoclicker on the same 80px surface splits the player's attention between "smack this" and "manage this" in the same spatial zone. That cognitive overlap undercuts the distinct feelings each track is designed to produce.

### What this locks in

- LVL UP, BUY, and Autoclicker purchase buttons render in the Generators center column, within or adjacent to each verb's generator row.
- The action button slab carries zero purchase controls — it is a tap target with status displays only (cooldown ring, yield display, badge, pulse indicator).
- The detailed layout of purchase controls within the Generators column (row format, affordance states, cost display) is a follow-up UX spec task, not decided here.

### What this leaves open

- Exact visual layout of the three purchase tracks within a generator row (compact inline vs. expandable tray vs. dedicated sub-rows). This needs its own spec pass.
- Whether the generator row groups by verb (all three tracks in one row) or by track type (all LVL UPs together, all BUYs together). Grouping by verb is the likely answer but not locked here.

### Load-bearing assumption

The on-slab feedback signals after a purchase must be punchy enough that the player immediately perceives the investment paid off despite the 300px spatial separation. Specifically:
- **LVL UP** — cooldown ring drain speed visibly accelerates on the next tap cycle.
- **BUY** — yield display updates immediately; rate-flare fires per `ux/purchase-feedback-and-rate-visibility.md` §5.
- **Autoclicker** — badge appears/increments with the existing scale-pulse (§4.4).

If these signals are subtle, the distance between purchase and effect will feel like a broken connection. This is an execution concern for the UX spec update (task #136), not a structural problem with the layout decision.

## References

1. `proposals/accepted/level-driven-manual-cooldown.md` — three-axis purchase model; ux-designer review Gap 4 (line 545+)
2. `proposals/accepted/20260406-action-button-physicality.md` — arcade-slab spec; why the slab must stay uncluttered
3. `ux/manual-action-ladder.md` §4 — live-verb-button anatomy (80px), current status displays
4. `ux/core-game-screen.md` §4 — three-column layout; Generators = strategic center surface

## Open Questions

None. Game-designer and ux-designer aligned on Option A during pre-proposal discussion.

---
# Review: engineer

**Date**: 2026-04-06
**Decision**: Aligned

**Comments**

Option A is the right call from an engineering perspective for three reasons:

1. **Component separation stays clean.** The action button component remains a pure tap target with display-only state (cooldown ring, yield, badge, pulse). Purchase logic and controls stay consolidated in the Generators column, which already owns upgrade/automate controls. Options B or C would force the action button to mux between tap handling and purchase affordance state — more complexity, more edge cases.

2. **The load-bearing assumption is achievable with existing wiring.** The feedback signals (cooldown ring speed change, yield display update, badge appear/increment) are all reactive derivations from model state changes that already flow through the existing data path. No new wiring pattern is needed. Whether those signals are visually punchy enough is a UX spec concern (task #136), not a structural one.

3. **Scales without layout pressure.** As verb count grows from 1 to 5, the action slab stays fixed at its current complexity. The Generators column absorbs the growth. This avoids a progressively more cluttered slab component that would need responsive layout logic at low counts and cramped overflow handling at high counts.
