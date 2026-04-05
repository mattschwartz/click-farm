---
name: Bad Change — Upgrade Lock & Complain Recovery
description: The bad algorithm state locks upgrades instead of penalising output, and is resolved by mashing a complain action that generates engagement.
author: game-designer
status: accepted
reviewers: []
---

# Proposal: Bad Change — Upgrade Lock & Complain Recovery

## Problem

The existing algorithm state design (five named states with per-generator output modifiers) models the algorithm as a strategic puzzle — the player adapts their generator loadout to the current state. That is interesting but it is not the emotional truth of being an influencer. The deeper fantasy is that you are *beholden* to the algorithm. When it works for you, you're flying. When it doesn't, it blocks you and you have to fight back.

The previously explored approach (a `bad_change` state with a ×0.1 output multiplier) was too punishing — a 90% output cut is catastrophic at late game, and any state that damages the player while they're AFK is a retention problem. We need adversity that creates active engagement without cruelty.

## Proposal

### What bad_change Does

When `bad_change` activates:

1. **Generator upgrades are locked.** The player cannot level up any generator until the complaint threshold is met. Buying new generator units is unaffected — only upgrades are gated.
2. **Generator output is unaffected.** All generators continue running at their normal rate. No multiplier penalty. The player is not losing anything — they are blocked from amplifying.
3. **A complain action becomes available.** The player can tap/click it repeatedly to fill a progress meter toward unlocking upgrades.

This means AFK players return to a world where their generators have kept running, upgrades are locked, and they can complain their way back to normal in a few seconds. No devastation.

### The Complain Action

The complain action is a mash mechanic with a progress threshold. The design targets are:

- **Casual pace** (~2–3 taps/sec): ~15 seconds to reach threshold
- **Spam pace** (~8–10 taps/sec): ~3–5 seconds to reach threshold

The exact click count to meet threshold is an implementation detail for the engineer — the above targets are the tuning benchmark.

**Each complain click:**
- Advances the progress meter toward unlock
- Generates a burst of engagement **scaled to current output rate** — so it stays meaningful at late game, not just a flat drip. The exact scaling formula is an open question for the architect.
- Triggers a screen shake (UX to spec the intensity and decay — should feel satisfying, not disorienting)

**On threshold met:**
- Upgrades unlock
- Progress meter resets
- `bad_change` state ends and the algorithm transitions to the next scheduled state

### Persistence

`bad_change` does not auto-resolve. It stays until the player meets the complaint threshold. This is intentional and fair: the player is not losing output, so there is no ongoing harm from being away. When they return, complaining takes at most 15 seconds at a casual pace.

### What This Does Not Define

The positive tier states (`normal`, `high`, `extreme`) and their multiplier values are left as open design space. This proposal concerns only `bad_change` behavior. The existing per-generator modifier system from the Generator Balance proposal may or may not survive into the final algorithm state design — that decision belongs to a follow-up proposal once we have clarity on what the positive states should feel like.

### Contradiction with Existing Design

This proposal supersedes the `bad_change` behavior implied by the accepted **Generator Balance & Algorithm States** proposal, which defined five named states with per-generator output modifiers and no special player-interactive state. The five named states (`short_form_surge`, `authenticity_era`, `engagement_bait`, `nostalgia_wave`, `corporate_takeover`) and their modifier tables remain in the accepted proposal but their relationship to the new tier structure (`normal`, `high`, `extreme`, `bad_change`) is unresolved. Reviewers should flag if the named states should be folded into or replaced by the tier structure.

## References

1. `.frames/sdlc/proposals/accepted/generator-balance-and-algorithm-states.md` — the proposal being partially superseded; defines the five-state modifier system and 5-minute shift interval
2. `.frames/sdlc/proposals/accepted/core-game-identity-and-loop.md` — generator flavors and strategic intent
3. `.frames/sdlc/proposals/accepted/scandals-and-follower-loss.md` — prior art for a state that persists until resolved by player action

## Open Questions

1. ~~**Complain engagement scaling formula.** Each complain click should generate engagement scaled to the player's current output rate, so it stays relevant late game. What is the right multiplier — a flat multiple of `base_rate` sum across owned generators, or a fraction of the per-tick output? **Owner: architect**~~ **[RESOLVED — architect, 2026-04-05]** `engagement_per_click = total_engagement_rate × k`, where `k` is a tuning knob in seconds (starting value: `k = 0.5`). Rationale: `base_rate` ignores `level_multiplier` (32× at L5, 7,225× at L8) and goes stale within the first run, violating the designer's "stays relevant late game" criterion. `total_engagement_rate` is already computed every tick and already stored on `SnapshotState`, so no new aggregation path is needed — and it already folds in count, level, algorithm modifier, clout bonuses, and platform affinity via the existing `effective_rate` formula. Expressing `k` in seconds gives the designer one legible tuning knob ("each tap earns you `k` seconds of passive production"). Computed live at each click, not banked at episode start — generator count can still grow during `bad_change` (purchases unaffected), so the rate may drift mid-episode, and "current output rate" implies live. At `k = 0.5`: casual pace (~45 clicks over 15s) yields ~22s of bonus production, ~1.5× normal; spam pace (~40 clicks over 4s) yields ~20s of production in 4s wall-clock, ~5× normal. Mashing is rewarded without breaking the economy.

2. ~~**Screen shake spec.** Each complain click triggers a screen shake. Intensity, decay curve, and whether it compounds on rapid successive clicks needs to be specced. Too subtle and it doesn't land; too violent and it's fatiguing over 15 seconds of tapping. **Owner: ux-designer**~~ **[RESOLVED — ux-designer, 2026-04-05]** 3–4px peak displacement, 120ms ease-out decay, random 4- or 8-direction jitter per click. **Does not compound** — each click resets and restarts the shake, because stacked shakes at 10 clicks/sec would walk the viewport. At spam pace the shake is mostly finished before the next click lands, which keeps it from smearing into noise. Rationale on intensity: 30–45 taps per episode is the fatigue budget, so the shake has to stay small to survive repetition. **Accessibility:** when `prefers-reduced-motion` is set, replace the viewport shake with a punch-scale on the complain button itself (scale 0.96 → 1.0 over 100ms, ease-out). The state-change signal is preserved without moving the viewport.

3. ~~**Progress meter visibility.** Where does the progress meter live on screen during `bad_change`? Should it be attached to the locked upgrade buttons, or a prominent full-screen element, or something ambient? **Owner: ux-designer**~~ **[RESOLVED — ux-designer, 2026-04-05]** **Primary: attach the meter to the complain button itself** as a ring around the button or a fill behind the label. The complain button is the attention anchor during this state, so the reward loop lives at the point of action — every tap produces a visible tick on the meter it's driving. **Secondary: small lock-icon overlay on each generator's upgrade control**, which dissolves when the threshold is met. This sells the causality (complain → unlocks) without fragmenting the player's focus across the upgrade column during mashing. Rejected alternatives: full-screen prominent meter (breaks the game frame and pulls attention away from the action), one-meter-per-locked-upgrade (splits attention across ~5+ buttons during rapid tapping).

4. **Positive tier states.** `normal` (×1), `high` (×1.25), `extreme` (×2) are placeholders. Whether these are global multipliers, per-generator multipliers, or something else is unresolved. This is a follow-up design question. **Owner: game-designer**

---
# Review: architect

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

Resolving Open Question #1 (complain engagement scaling formula) — see [RESOLVED] annotation inline. Answer: `engagement_per_click = total_engagement_rate × k`, where `k` is a tuning knob in seconds (starting `k = 0.5`). `total_engagement_rate` already exists on `SnapshotState` and is derived by the tick; the `base_rate`-sum alternative was rejected because it does not include `level_multiplier` and goes stale within one run.

Non-blocking observations for the engineer task that will follow this proposal:

1. **Click must be an action, not a UI calculation.** Per `core-systems.md` the game loop is a pure `state → state` function and "The UI does not mutate game state directly — it dispatches actions (click, buy, rebrand) that the game loop processes on the next tick." The complain click follows that contract: UI dispatches a `complain_click` action; the tick computes `total_engagement_rate × k` using the same rate derivation it already runs. Do not have the UI read a cached rate and multiply on the click side — the click and the passive rate must agree on their source of truth.

2. **Progress meter is tick state, not UI state.** The complain progress counter (clicks toward threshold) is gameplay state and belongs on the `GameState` tree, reset on bad_change entry and on threshold met. Save migration will be required when this lands.

3. **No algorithm_modifier during bad_change.** The proposal says generator output is unaffected during `bad_change`. That means `bad_change` either has no entry in `state_modifiers` (all generators default to 1.0) or its modifier map is all 1.0. Engineer will need to pick; I'd default to "no entry → 1.0" via a null-coalesce in the tick's rate formula, so no static data row is required for states that are pure behavioral states. Flagging for the static-data task — not blocking.

4. **`bad_change` shift scheduling is out of scope for this proposal.** The algorithm shift schedule is seeded and deterministic (`core-systems.md` §Technology Decisions). Whether `bad_change` is one state in the rotation, or an injected interrupt state, or probabilistic, is a game-designer call that should be surfaced before implementation. Flagging for a follow-up design proposal — not blocking this one.

Removing architect from reviewers. ux-designer still owns Open Questions #2 and #3.

---
# Review: ux-designer

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

The emotional arc is right. *Frustration → catharsis (mash) → relief* is the influencer fantasy of being beholden to the algorithm, and the complain action IS the catharsis. Nothing in the mechanic fights that.

Resolving Open Questions #2 (screen shake spec) and #3 (progress meter visibility) — see [RESOLVED] annotations inline.

Non-blocking observations for the engineer task that will follow this proposal:

1. **State entry needs a transition moment.** When `bad_change` activates, upgrades should not silently stop responding. Recommend a ~250ms entry transition: grey-out sweep across the upgrade column with lock icons settling in, complain button animates in from below the fold. A player who had an upgrade queued in their eye-line needs to see *why* it stopped responding, or the lock reads as a bug. This is a small spec but it is the difference between feeling "the algorithm turned on me" and feeling "the game stopped working."

2. **Per-click engagement numbers must be visible.** Each complain click produces `total_engagement_rate × k` engagement, and at k=0.5 that's a meaningful burst. If the engagement silently lands in the counter, mashing feels like unrewarded work. Recommend small number-popups rising from the complain button on each click, staggered so they don't stack into a wall at spam pace. This is trust-signal design — the reward must be seen at the moment it is earned, not inferred from a counter ticking up.

3. **bad_change exit needs a release beat.** When the threshold is met and upgrades unlock, the moment should land — the lock overlays dissolving together, a soft flash on the upgrade column, complain button retreats. The player just earned this; the transition out is the payoff for the mashing. A flat state swap wastes the emotional peak.

Removing ux-designer from reviewers. All open questions owned by reviewers are resolved; OQ #4 (positive tier states) is correctly scoped as a follow-up design question owned by game-designer.
