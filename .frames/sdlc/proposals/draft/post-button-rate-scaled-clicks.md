---
name: Post Button Rate-Scaled Clicks
description: Scales the Post button's click value as a fraction of current engagement rate, keeping the core verb alive across all progression stages.
author: game-designer
status: draft
reviewers: [architect, engineer, ux-designer]
---

# Proposal: Post Button Rate-Scaled Clicks

## Problem

The Post button is the player's primary diegetic verb — "I am a poster, I post things" is the core fantasy named in `core-game-identity-and-loop.md`. It is also the only thing the player *actively does* throughout the session. Every other interaction (buying, leveling, reacting to the algorithm) is strategic; Post is motor.

Currently, `CLICK_BASE_ENGAGEMENT = 1.0` (per `generator-balance-and-algorithm-states.md` §Manual Click Value). This is affirmed as a design target with an explicit directive: "The value should not be raised — that would undermine the 'generators take over' arc."

**This produces a dead verb by mid-game:**

- At 1K engagement/sec, a click adds 1 engagement. That is 0.1% of one second of production. The button does nothing visible.
- At 13B engagement/sec, a click adds 1 engagement. That is 7.7×10⁻¹¹ of one second of production. The button is inert.
- The player stops clicking because clicking doesn't register on any counter. The core verb of a *clicker game* ceases to matter.

The original reasoning — "generators should take over" — is correct as an **economic** position: clicks should not be a primary income source. But the directive has been applied to Post's *literal rate contribution*, which over-corrects. The result is a button that fights the core fantasy: it is the player's named action, featured prominently, and it produces nothing observable after the first 10 minutes.

There is already a precedent in the codebase for fixing this: the **Complain** click (from `bad-change-upgrade-lock-and-complain-recovery.md`) uses `engagement_per_click = total_engagement_rate × k` with `k = 0.5`. That mechanic scales because it has to — recovery clicks in scandal states need to matter. The same formula shape solves the Post button problem, with a lower `k`.

## Proposal

**Replace the flat `CLICK_BASE_ENGAGEMENT = 1.0` value with a rate-scaled formula.**

### Formula

```
engagement_per_click = max(CLICK_BASE_ENGAGEMENT, total_engagement_rate × k)
```

Where:
- `CLICK_BASE_ENGAGEMENT = 1.0` — retained as a floor, not a value. Keeps the early-game bootstrap identical to today.
- `total_engagement_rate` — the existing `SnapshotState` field (same input Complain already uses).
- `k` — the single tuning knob. Proposed starting value: **`k = 0.1`** (a click is worth 100ms of current production).

### Behavior Under This Formula

| Phase | rate/sec | click value (k=0.1) | clicks/sec at 3 cps | % of passive rate |
|---|---|---|---|---|
| First 60 seconds | ~5/sec | 1.0 (floor) | 3/sec | 60% |
| Early game | 50/sec | 5 | 15/sec | 30% |
| Mid game | 1,000/sec | 100 | 300/sec | 30% |
| Late game | 100M/sec | 10M | 30M/sec | 30% |
| Endgame | 13B/sec | 1.3B | 3.9B/sec | 30% |

At `k = 0.1` and sustained 3 clicks/sec, clicking contributes ~30% of passive rate. At a more realistic casual rate of 1 click/sec, clicking contributes ~10%. At zero clicks, passive rate is unaffected.

### Why Rate-Scaled Works Here

- **Preserves the "generators take over" arc.** Generators still provide the *passive* income. Clicks are a time-locked bonus (you can't click faster than your finger). A player who clicks constantly gets a ~30% bonus over pure idle; a player who doesn't click still plays the game. Generators are what the strategy is *about*. Clicks are what the hands *do*.
- **Honors the core fantasy.** The number visibly moves when the button is pressed, at every progression stage. "I am a poster" stays intact.
- **Reuses an existing formula shape.** The Complain click already does this. No new concept — same mechanism, different `k`, different use.
- **Bounded.** Upper bound on clicking contribution is set by human click speed, not an arbitrary cap. The ceiling is organic.

### Why `k = 0.1` (starting value)

- `k = 0.5` (Complain's value) makes clicking half as valuable as a full second of production per click. That's recovery-urgent. Post is not urgent — it's continuous.
- `k = 0.01` makes a click worth 1% of a second of rate, roughly 3% of passive rate at 3 cps. Too small to feel.
- `k = 0.1` sits in the "clicks matter, clicks don't dominate" window. 30% bonus to active players, negligible to idlers, noticeable either way.

### What This Locks In

- The Post button's click value scales with current engagement rate.
- The floor remains 1.0 — early-game feel is unchanged.
- A single tuning knob (`k`) governs the balance.
- The Complain click pattern is generalized: rate-scaled clicking is now the established model for diegetic click actions.

### What This Leaves Open

- Exact value of `k` — tune via playtesting (Open Question #1).
- Whether to add autoclicker mitigation if the bonus proves exploitable (Open Question #2).
- How the click feedback UX represents a variable click value (Open Question #3).

### Supersession Note

This proposal **modifies** the "Manual Click Value" section of `generator-balance-and-algorithm-states.md` (accepted). Specifically:

> "The value should not be raised — that would undermine the 'generators take over' arc."

The updated position: the *flat value* should not be raised, but the value SHOULD scale with current rate as a bounded fraction, because flat 1.0 makes the button inert long before the "generators take over" arc has actually completed. The spirit of the original directive (clicks must not become a primary income source) is preserved — generators remain the passive income engine, and click contribution is ceiling-bounded by human tap speed.

On acceptance, the superseded paragraph should be updated in place in `generator-balance-and-algorithm-states.md` with a reference to this proposal.

### Player Psychology & Aesthetic

- **Target feeling:** "My finger matters." The button always produces a visible number-jump. The verb is alive.
- **Intrinsic motivation:** Preserved and reinforced — the core loop gains a tactile, rewarded motor action that scales with the player's progression. A player who enjoys clicking is now *allowed* to click; a player who prefers pure idle still plays the same game.
- **Engagement line check:**
  - *Is it honest?* Yes. The button claims to post; it produces engagement proportional to the player's current output. No deception.
  - *Can the player quit without loss?* Yes. Clicking is supplementary; passive rate is unaffected.
  - *Is progression tied to skill/engagement or just time?* Both, which is correct for a clicker. Passive time-based income exists, and engaged clicking adds to it without replacing it.
- **Variable ratio risk:** None added. The formula is deterministic, not probabilistic. No new randomness layered onto clicking.

## References

1. `.frames/sdlc/proposals/accepted/core-game-identity-and-loop.md` — "I am a poster" core fantasy, clicker genre positioning
2. `.frames/sdlc/proposals/accepted/generator-balance-and-algorithm-states.md` §Manual Click Value — the directive this proposal modifies
3. `.frames/sdlc/proposals/accepted/bad-change-upgrade-lock-and-complain-recovery.md` — precedent for `engagement_per_click = total_engagement_rate × k` formula (Complain click uses `k = 0.5`)
4. `.frames/sdlc/proposals/accepted/actions-column.md` — discussion of Post going "dormant" and being "dead UI" in late game
5. `.frames/sdlc/proposals/draft/game-screen-ux-audit-top-bar-and-platform-cards.md` — UX direction (B) to fill the Post panel with click feedback, which now has something meaningful to show
6. `client/src/game-loop/index.ts` — `CLICK_BASE_ENGAGEMENT` usage site

## Open Questions

1. **Tuning of `k`.** Starting value `0.1` is a design target. Needs playtesting to confirm the "clicks matter, clicks don't dominate" feel holds across early/mid/late game. May need to land lower (0.05) if late-game clicking dominates, or higher (0.2) if it still feels inert. **Owner: game-designer** (post-implementation).

2. **Autoclicker / automation risk.** If click value scales with rate, an autoclicker at 20 cps in late game could produce 200% of passive rate. Is that a real problem? Options: (a) accept it — some players will automate, their economy pulls ahead, no PvP at stake; (b) cap click contribution per time window (e.g. max 50% of passive rate/sec regardless of cps); (c) soft-diminish returns on clicks in rapid succession. My lean: **(a) accept it for v1**, revisit only if it produces visible complaint. Clicker games historically tolerate autoclickers. **Owner: game-designer + architect** (game-designer names tolerance, architect names feasibility of (b)/(c) if needed).

3. **Click feedback UX — variable click value display.** The UX audit proposal (draft) describes a "last-gain floater (+5.30 ghosts rising)" in the Post panel. That floater now shows a rate-scaled number that changes over the session. Does the UI need to do anything to communicate *why* the click value grew (e.g. show "click: 1.3B" updating as passive rate climbs), or is the floater alone sufficient signal? **Owner: ux-designer.**

4. **Interaction with brand deals, gigs, and clout upgrades.** Do any existing or proposed mechanics multiply click value? If so, do they stack with the rate-scaled formula multiplicatively or additively? Quick scan suggests no current mechanic directly boosts clicks — but a "faster engagement" or "click power" clout upgrade would need to specify its interaction. **Owner: game-designer** (review upgrade menu for interactions).

5. **Interaction with the Cheap Purchase Engagement Dampening proposal.** The dampening proposal dampens *per-unit generator contribution* when cost is trivial relative to income. It does not dampen `total_engagement_rate` itself, which is the input to this formula — so rate-scaled clicks compute against the (already-dampened) honest rate. The two proposals compose cleanly and reinforce the same design intent: "the progress signal reflects real position." **Owner: game-designer** (noted for coherence, no action).
