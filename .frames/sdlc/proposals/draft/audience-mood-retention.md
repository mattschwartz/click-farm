---
name: Audience Mood (Retention) Replaces Scandals
description: Replaces the discrete scandal event system with a continuous, diagnostic retention multiplier driven by audience mood — removing modal interruptions and active follower loss while preserving negative pressure on the core loop.
author: game-designer
status: draft
reviewers: [ux-designer]
---

# Proposal: Audience Mood (Retention) Replaces Scandals

## Problem

The currently-accepted Scandals system (`proposals/accepted/scandals-and-follower-loss.md`) inverts its own stated aesthetic. Specced to produce "oh no — but I kind of saw that coming" (recognition), it actually produces "oh god, not again" (dread) in play. The system is shipping as specced — the specification was wrong.

Four mechanisms cause the inversion:

1. **Hard modal interrupts the idle-game contract.** The PR Response is a screen-dimming, timer-gated, slider-decision modal. Every scandal fire is a hard stop. Idle games live or die on ambient, low-pressure satisfaction; a blocking modal violates the genre.
2. **PR Response treats symptoms, not causes.** Player pays Engagement → loss reduced → accumulator resets → behavior unchanged → it fires again. The player learns "pay the tax," not "change behavior." The counterplay never addresses why the scandal fired.
3. **Loss aversion without a recovery path.** The system produces losses; counterplay only reduces magnitude, never cancels it. Loss pain is 2–2.5× gain pleasure — the player's nervous system registers every fire as a net-negative event.
4. **Six triggers, one generic signal.** The amber warmth/pulse means "something is heating up somewhere" but never names cause. Six distinct behavioral rules with a single visual vocabulary — high cognitive load, low feedback specificity.

But the **design goal remains valid**: the core loop needs negative pressure so late-game decisions matter. Without it, growth flattens into passive accumulation. We need pressure — we need a different mechanic carrying it.

## Proposal

Replace the Scandals system with **Audience Mood**, a continuous retention mechanic.

### 1. Design Intent

**Target feeling:** "My audience is telling me something." Diagnostic, ambient, legible. The player reads each platform's mood like reading a face — "this one's bored, this one feels ignored" — and adjusts behavior. Recovery is immediate and visible. Pressure is felt as opportunity cost, never as pain.

**What Audience Mood is NOT:**
- Not a modal, not a timer, not an event.
- Not active follower loss. Numbers never tick backwards from mood.
- Not a tax. There is no currency spent to "fix" mood — only behavior change.

### 2. Mechanic

Each platform has a `retention` multiplier in `[retention_floor, 1.0]`, applied to follower gain from posts on that platform. Default `retention = 1.0` (full gains). Audience mood degrades retention in response to specific behaviors and recovers when behavior changes.

**Critical constraint: retention NEVER causes active follower loss.** It only scales new gains downward. A platform with 0.4 retention still earns followers on every post — it just earns 40% of what it would at full retention. Follower count never goes backwards from mood.

**Retention floor:** Retention never drops below ~0.3–0.5 (tuning TBD). No platform is ever rendered useless — ignoring a platform produces reduced gains, not zero.

### 3. The Three Pressures

Each pressure tracks one specific behavior per platform. Mood on a platform is driven by the most-active pressure (or a composition — see Open Question #3).

| Pressure | Trigger | Mood reads as |
|---|---|---|
| **Content Fatigue** | Overposting one generator type on this platform | "Audience is bored of your [content type]" |
| **Neglect** | Not posting on a platform with existing followers | "Audience feels ghosted" |
| **Algorithm Misalignment** | Posting content the current Algorithm state penalizes | "Audience can tell you're off-trend" |

This set retires Trend Chasing (collapsed into Algorithm Misalignment), Growth Scrutiny (punished success without player choice), and Fact Check (duplicated Content Fatigue).

### 4. Feedback & Legibility

**On each platform card:**
- A mood indicator showing current retention (e.g., "×0.6") and one line of satirical flavor text naming the cause ("Bored of your selfies," "Feels ghosted," "Off-trend").
- Color/motion treatment per ux-designer (see Open Question #1). Should be ambient, not alarming.

**On every post:**
- The floating follower-gain number shows the multiplier applied: "+50 (×0.5)". Cause and effect in the same frame. The player sees the cost of their current behavior every time they act.

### 5. Recovery

Behavior change → retention recovers over ~3–5 corrective actions (tuning TBD).
- Post a different content type → Content Fatigue on that platform eases.
- Post anything on a neglected platform → Neglect eases.
- Post aligned content during the current Algorithm state → Misalignment eases.

Recovery is visible in real time: the retention multiplier ticks back toward 1.0 as the player plays correctly. No hidden timers, no cooldowns.

### 6. Interaction With Other Systems

- **Algorithm:** The current Algorithm state directly defines which content is "aligned." Algorithm Misalignment pressure is literally "your content mix doesn't match the current Algorithm favor." This tightens the coupling between two existing systems rather than adding a third.
- **Generators:** Each generator has an affinity profile per platform (already implied by existing spec). Posting off-affinity content accelerates Content Fatigue on that platform. No new data model for generators — affinity is already there.
- **Prestige (Clout):** Defensive Clout upgrades (e.g., "audiences forgive faster," "retention floor raised") remain available as an optional strategic layer. **Deferred to the Prestige Economy proposal.**
- **Core loop:** Growth remains monotonically non-decreasing from mood alone. Mood only slows ascent on unfavored lines of play. This preserves the core-loop ascent guarantee.

### 7. What This Retires

Accepting this proposal retires the following from the current Scandals system:

- All six discrete scandal types and their trigger conditions
- The PR Response modal, slider, timer, and comedic read-beat
- Risk accumulators with hidden thresholds + fuzz
- The `scandal_active` / `resolving` game-loop states and their state-machine transitions
- `ScandalModal` and `ScandalAftermathCard` UI components (current implementation)
- Scandal stacking suppression logic and the "suppressed notice" secondary notification
- The session-floor snapshot rule (no longer needed — no active loss to floor)
- The empire-scaling accumulator threshold curve

The satirical voice migrates into mood flavor text. The "no negative events offline" rule still applies trivially — mood simply doesn't degrade while offline.

### 8. Tuning Philosophy

- **Retention floor:** 0.3–0.5 — no platform ever becomes useless.
- **Degradation onset:** player should see retention start to slip within ~5–10 off-pattern actions.
- **Recovery pace:** ~3–5 corrective actions to return to full retention.
- **Felt stakes:** a player ignoring mood should see empire growth run at ~40–60% efficiency across the board. A player reading mood and adjusting should see ~90%+. The gap should be large enough to matter and small enough that ignoring mood is viable for players who just want to grind.

Exact numbers are implementation-time tuning decisions.

## References

1. `proposals/accepted/scandals-and-follower-loss.md` — the system this proposal supersedes
2. `proposals/accepted/core-game-identity-and-loop.md` — establishes the core loop and "no negative events offline" rule this respects
3. `proposals/accepted/algorithm-mood-visibility.md` — Algorithm state is the partner system for Misalignment pressure
4. `client/src/scandal/index.ts` — current implementation to be deprecated
5. `client/src/ui/ScandalModal.tsx` — current modal UI to be deprecated
6. `.frames/sdlc/architecture/scandal-system.md` — architecture spec to be updated or replaced
7. `.frames/sdlc/ux/scandal-system.md` — UX spec to be replaced

## Open Questions

1. **What is the visual language for the mood indicator on each platform card?** Ambient, diagnostic, non-alarming. Must name cause (flavor text) and magnitude (retention multiplier or equivalent). Must pass the "no color alone" CVD test. **Owner: ux-designer**
2. **Does the retention multiplier visualize as a number, a bar, or a face/mood icon?** This is a UX call — the design requirement is only that magnitude is readable at a glance alongside the flavor text. **Owner: ux-designer**
3. **When multiple pressures are active on one platform, how do they compose?** Three viable options: (a) **take-worst** — retention = min of each pressure's contribution; simple, legible, caps felt pain. (b) **multiplicative** — each pressure multiplies into retention; punishes combinations harder, may hit the floor quickly. (c) **dominant-pressure display** — multiplicative under the hood, but only the strongest pressure's flavor text shows, to avoid cluttering the platform card. **Owner: game-designer** — recommending (c), but want architect input on implementation cost.
4. **What does the migration look like for code and tasks already building on scandals?** The scandal system has implemented code, tests, UI, and may have in-flight tasks. Need a migration/deprecation plan. **Owner: architect**
5. **Should Clout upgrades interact with Audience Mood (e.g., faster recovery, raised retention floor)?** Defer to Prestige Economy proposal, consistent with the prior deferral on scandal-reducing Clout upgrades. **Owner: game-designer (future proposal)**
6. **Does the per-post floating number ("+50 (×0.5)") create too much visual noise on high-frequency clicks?** At late-game click rates this could flood the screen. May need a smoothed/aggregated presentation. **Owner: ux-designer**

---
# Review: architect

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

Aligned on the direction. This proposal is architecturally *cleaner* than the scandal system it replaces — removing a state machine, a modal flow, a session snapshot, and stacking suppression, while adding one localized subsystem and one multiplier in the core tick. Overall architectural complexity decreases.

Two architect-owned questions (OQ#3, OQ#4) answered below, plus notes for the architecture spec that will follow.

**Framing correction: this is a replacement, not an additive system.**

The superseded `architecture/scandal-system.md` declared itself additive — "bolts onto the core architecture without structural changes." Audience Mood is different. The retention multiplier enters the core follower-distribution formula (`core-systems.md` line 388) as:

```
followers_per_platform_per_tick = (existing formula) × platform.retention
```

One multiplier at one known integration point. That's integrated into the tick, not bolted on. The "growth is monotonically non-decreasing from mood" guarantee falls out automatically because retention ∈ [floor, 1.0] scales gains and never touches follower count directly. This framing matters for the new architecture doc — the additive-system assumption (load-bearing in the old doc) is explicitly retired.

**Data model delta — Platform gains the following fields:**

- `retention: float` in [retention_floor, 1.0], default 1.0
- `content_fatigue: map<generator_id, float>` — per-(platform, generator), in [0, 1]. Must be per-generator so flavor text can name the specific content type ("bored of your selfies"). A single scalar would lose that legibility.
- `neglect: float` in [0, 1]
- `algorithm_misalignment: float` in [0, 1]

Generator `content_affinity` is already modeled (`core-systems.md` line 62), so the proposal's "affinity is already there" assumption holds — no hidden dependency.

**Pressure update cadences — reuse the proven pattern.**

Same event-driven vs tick-driven split the old scandal system used:
- **Event-driven (on post action):** Content Fatigue, Algorithm Misalignment
- **Tick-driven:** Neglect (increments over elapsed time since last post on that platform, resets on any post)

Neglect freezes offline per the "no negative events offline" rule — identical freeze semantics to the old Platform Neglect accumulator. This is intentional pattern reuse, not accidental similarity.

**Recovery pattern.**
- Content Fatigue on platform P for generator G decays when the player posts a *different* generator type to P.
- Neglect on P decays on any post to P.
- Misalignment on P decays when posted content is aligned with the current Algorithm state.

All three decay event-driven (or tick-driven for Neglect during sustained correct play). No hidden cooldowns, consistent with the proposal's "Recovery is visible in real time" requirement.

**OQ#3 — Composition method (architectural cost): all three options are equivalent.**

Take-worst (`min`), multiplicative (`*`), and dominant-display (multiplicative + argmax for label) are all O(1) per platform per tick. The arithmetic is trivially cheap. Dominant-display adds one extra concern: tie-breaking when two pressures produce equal magnitudes — resolved with a deterministic fixed priority list (e.g., Content Fatigue > Algorithm Misalignment > Neglect). That's three lines of code.

**Cost does not discriminate between the options. This is purely a design / UX call. I support the game-designer's recommendation of (c) dominant-display** — it preserves the multiplicative pressure model while keeping the platform card legible. The tie-breaking rule belongs in the design spec, not in implementation.

**OQ#4 — Migration plan:**

a) **Architecture docs.** Mark `architecture/scandal-system.md` as SUPERSEDED at the top of the file (do not delete — retain as historical record). Write a new `architecture/audience-mood.md` spec before engineer build tasks are filed. The new doc defines: retention data model on Platform, pressure accumulators, update triggers, recovery formulas, tick integration point, save-schema migration.

b) **Code deprecation.** Full removal, no salvage — the mechanics are fundamentally different:
   - `client/src/scandal/` (entire directory)
   - `client/src/ui/ScandalModal.tsx`
   - `client/src/ui/ScandalAftermathCard.tsx`
   - Scandal state machine types and transitions
   - Session snapshot logic and foreground-snapshot lifecycle
   - Stacking suppression
   - The `scandal_active` / `resolving` game-loop states (loop collapses to single state)

c) **In-flight task audit.** I scanned the open-task board before writing this. No open tasks depend on scandal mechanics — tasks #48, #55, #60–66, #69–71 are in other subsystems. Safe to proceed on migration timing.

d) **Save-schema migration (new concern I am adding — not in proposal).** Existing saves carry scandal fields (`risk_accumulators`, possibly scandal state, possibly session snapshot remnants). On load, the new build must:
   1. Bump save schema version
   2. Drop scandal-era fields
   3. Initialize `retention = 1.0` and all pressure accumulators to 0 for every platform
   4. Return the migrated state to the game
   
   Forward-only migration — old builds can't load new saves. This is the standard approach and acceptable given current scope (solo-dev, pre-launch, no production save-base to protect). Flagged as ENGINEERING for the new arch doc.

e) **Sequencing constraint.** Tear-out and rebuild MUST happen in the same engineering cycle, not sequential passes. Deleting scandals before Audience Mood is playable leaves the game without negative pressure — a regression in design intent. Plan the work so both land together.

**Non-blocking architectural observation:**

OQ#6 (per-post floating number flood at high click rates) is UX-domain, but I'll note: architecturally the signal is cheap — the multiplier is just an annotation on an existing floating-number emission. Aggregation / smoothing, if needed, is a presentation-layer transform, not a model-layer change.

**Summary:** Aligned on the direction. OQ#3 resolved: architecturally neutral — supporting game-designer's (c) recommendation. OQ#4 resolved: migration plan above, carries forward into a new `architecture/audience-mood.md` spec which I will write after this proposal is fully accepted. Removing myself from reviewers. ux-designer stays on for OQ#1, #2, #6.
