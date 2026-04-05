---
name: Post Button Rate-Scaled Clicks
description: Scales the Post button's click value as a fraction of current engagement rate, keeping the core verb alive across all progression stages.
author: game-designer
status: draft
reviewers: [architect, engineer]
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
  - Answer (ux-designer): **Yes — the Post panel needs a persistent, quiet click-value preview (e.g. `+1.3B/click` label) in addition to the per-click floater.** Floater alone is insufficient: without a pre-click signal, a big click payoff reads as variable/lucky instead of deterministic, which the proposal explicitly disclaims. The preview teaches the mechanic and preserves trust; the floater remains the reward moment. Full treatment in the review log below.

4. **Interaction with brand deals, gigs, and clout upgrades.** Do any existing or proposed mechanics multiply click value? If so, do they stack with the rate-scaled formula multiplicatively or additively? Quick scan suggests no current mechanic directly boosts clicks — but a "faster engagement" or "click power" clout upgrade would need to specify its interaction. **Owner: game-designer** (review upgrade menu for interactions).

5. **Interaction with the Cheap Purchase Engagement Dampening proposal.** The dampening proposal dampens *per-unit generator contribution* when cost is trivial relative to income. It does not dampen `total_engagement_rate` itself, which is the input to this formula — so rate-scaled clicks compute against the (already-dampened) honest rate. The two proposals compose cleanly and reinforce the same design intent: "the progress signal reflects real position." **Owner: game-designer** (noted for coherence, no action).

---
# Review: ux-designer

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

Aligned on the core move. Fixing the dead-verb mid-game is overdue — the Post button was authored into the core fantasy and then left inert by progression. Rate-scaled clicks brings the verb back in line with the fantasy without unseating generators as the passive income engine. Answering Q3 and leaving two non-blocking UX observations.

**Q3 — Yes, show a persistent click-value preview. Floater alone is insufficient.**

The floater does the right job for its frame — it's the post-click *reward moment*, and it should keep doing that unchanged. But it can't carry pre-click teaching, and without pre-click teaching this mechanic develops a trust problem.

Here's the specific failure mode. A player at 13B/sec rate clicks Post, sees `+1.3B` rise from the button. Great payoff. But what does the player infer from that? Three possible readings:

1. "Nice, clicks are worth ~1.3B right now" (correct, deterministic reading)
2. "Whoa, lucky click" (variable-ratio reading — the mechanic feels random)
3. "I don't know why that was so big; I'll just keep clicking and see" (unmodeled reading — the number exists but isn't connected to anything the player controls)

Reading #2 is the dangerous one. The proposal explicitly disclaims variable-ratio risk ("the formula is deterministic, not probabilistic"). But WITHOUT a pre-click signal, a human player experiences a deterministic mechanic as variable — because from their perspective, they pressed a button and got a big number, with no antecedent that said "this is what will happen." That's the defining experience of intermittent reinforcement whether or not the underlying math is deterministic. The proposal's own psychological commitments (intrinsic motivation preserved, no variable-ratio added) require that the player can *predict* the click value before they click.

A persistent preview fixes this. Player glances at the preview, sees `+1.3B/click`, clicks, sees `+1.3B` float up — cause and effect connect, mechanic reads as deterministic, variable-ratio risk stays at zero. The preview is the contract; the floater is the delivery.

The preview also teaches the *scaling* mechanic. A player whose rate climbs from 1M to 10M watches the preview climb from `+100K/click` to `+1M/click`. That's how they learn "clicks track my rate" — not from reading a spec, from watching the number.

**Concrete UX direction for the preview:**

- **Placement:** directly beneath the Post button, inside the Post panel. Close enough to read as "what the button does," not as a separate stat.
- **Typography:** follows the engagement-rate sub-label pattern (`.engagement-rate` in GameScreen.css) — ~14px, weight 500, `--text-p2` contrast, tabular-nums. Not P0-sized. Not a headline. A quiet readout.
- **Format:** `+1.3B / click` using the existing `fmtCompact` formatter so it rides the same ladder as every other number in the game (tying into the large-number notation ladder proposal I just reviewed).
- **Update cadence:** re-renders as `total_engagement_rate` changes. Since rate changes continuously via the interpolation system, use the same debounced readout cadence as other rate displays (~4 updates/sec) to avoid vibration.
- **Change flash:** when click value doubles or halves (crosses a ~2× threshold), flash the preview briefly — 400ms, same rate-flare pattern as `rate-flare-positive` in GameScreen.css. This catches the player's eye exactly when the mechanic is teaching itself. Below the 2× threshold, updates are silent.
- **At the floor (rate < 10/sec, click value pinned at 1.0):** the preview shows `+1 / click` honestly. No special treatment. When the floor lifts, the flash fires and the player learns the scaling.
- **Reduce motion:** the change-flash is removed under `prefers-reduced-motion`. The static readout carries the signal.

**Against a different alternative I considered and rejected — "flash preview only during rate-change moments, hide when stable."** Tempting because it keeps the Post panel minimal. But it fails the basic trust test: a player who picks up the game after a break needs to see the click value *now*, not wait for it to change. The preview must be persistent.

**Coupling to my own Game Screen UX Audit draft (reference #5 on this proposal).** That draft proposes filling the Post panel with "click feedback" content precisely because the Post button was going dead. This proposal fixes the economic side of that (clicks mean something again); my audit proposes the visual side (what to show in the panel around the button). The click-value preview I'm describing here becomes a named surface on that audit's Post panel layout. I will fold this into the audit's revision pass — flagging so game-designer knows the two are now joined at the hip.

**Non-blocking observation 1 — click value vs. passive rate comparability.**

The Post panel will now show two rate-derived numbers in proximity: `+1.3B/click` (click value) and, from the top bar above it, `+13B/sec` (passive rate). Those numbers will both climb, roughly in lockstep, throughout the session. That's fine — but it's worth noting that at `k = 0.1`, the click preview is *exactly* 10% of the passive rate at all times. A player who reads both numbers will connect the dots and feel the "clicks are 10% of a second" relationship. That's a positive — it reveals the mechanic honestly. But it also means `k` is *transparently readable* from the UI, which means tuning `k` is a player-perceivable change, not a silent balance knob. Flagging for game-designer: playtesting `k` adjustments will be more visible to players than expected. Not a blocker, just information.

**Non-blocking observation 2 — autoclicker affordance.**

If Q2 resolves to "accept autoclickers" (the designer's lean), a 20cps autoclicker shows the player's click contribution running at 200% of passive rate, visible in the Post panel. The preview surface doesn't change, but the floater frequency will spike, and the post-click feedback zone becomes a firehose. No UX change needed from me — but flagging that the Post panel's visual stability under high-cps scenarios should be tested. If the floater stacking becomes overwhelming at 20cps, that's a motion-brief concern I can spec separately.

**Summary.** Aligned on rate-scaled clicks. Q3 answered with a persistent `+value/click` preview in the Post panel, floater retained unchanged. Preview is the pre-click contract that keeps the mechanic honest; floater is the post-click reward. Removing ux-designer from reviewers.
