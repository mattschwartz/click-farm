---
name: Algorithm Mood Visibility
description: The algorithm mood background should be perceptible through content panels via screen-edge vignettes, with per-state edge colors derived for the light-mode base and panel opacity tuning deferred until contrast is verified across all states.
author: ux-designer
status: implementation
reviewers: []
---

## Revision: 2026-04-05 — ux-designer

Re-derived for the light-mode base committed in `proposals/draft/visual-identity-light-mode.md`. Changes:

- **Problem section** reframed around the light-mode base and what the dark-mode derivation now invalidates
- **Edge color table** re-derived for a warm near-white base (`#FAF8F5`) — all five hues adjusted for editorial saturation; opacities roughly halved because color registers faster on light surfaces than dark
- **Corporate Takeover identity** reframed from "darkest/flattest" to "drained of warmth" — a cool pale grey wash that leaches vitality from the warm base. Still the most muted of the five
- **Panel opacity direction** rewritten — on light mode, panels stay fully opaque white (translucent-white-on-warm-white muddies rather than enriches). Phase 2 reframes around a possible accent-tint wash on the base area *around* the panels rather than behind them
- **OQ2 (base shift vs fixed)** resolved in favor of fixed base + shifting accent layer — matches engineer recommendation, keeps calibration surface small for v1, can retrofit later
- **New OQ (Corporate Takeover on light base)** resolved inline

The original engineer review log is preserved below. Core mechanics (edge vignette layer, viral burst override, instability scaling, crossfade timing) are unchanged; only color values, Corporate Takeover signature, and panel opacity direction are revised.

---

# Proposal: Algorithm Mood Visibility

## Problem

The algorithm mood background is architecturally present but visually absent. Two factors suppress it:

1. **Panel coverage:** Content panels cover ~80% of the visible screen area. Even saturated mood gradients cannot breathe through them.
2. **Corporate Takeover flatness:** The previous `corporate_takeover` signature was "darkest" on a dark base, making it near-indistinguishable from the background. Every state looked identical — a dark wall. That derivation is no longer authoritative: with the v1 pivot to a warm near-white base (`#FAF8F5`, per `visual-identity-light-mode`), "darkest" is not available as a design direction. Corporate Takeover needs a new identity on a light surface.

The spec defines the algorithm mood as "the weather of the screen" — ambient, environmental, felt rather than read. That intent is unrealized. The player currently has no ambient cue that the algorithm state exists between shift transitions.

## Proposal

### Phase 1 (this proposal): Screen-edge mood vignette

Add a fixed, full-screen vignette layer that bleeds the current mood color at the screen edges. The vignette is zero-risk to legibility — screen edges carry no readable content — and immediately gives the screen environmental presence.

**Implementation:**

A CSS layer sits above the background and below the content panels (`z-index: 0.5`, effectively between the two). It renders as a radial or multi-stop linear gradient that is transparent at center and carries mood color at the edges:

```css
background: radial-gradient(
  ellipse 120% 100% at 50% 50%,
  transparent 40%,
  var(--mood-color-edge) 100%
);
```

Each algorithm mood gets a `--mood-color-edge` token at 14–22% opacity — enough to tint the periphery of a warm-white canvas, not enough to compete with content.

**Per-mood edge color targets (light-mode base, directions not final values — engineer to tune):**

| State | Edge color direction | Hex | Opacity |
|-------|----------------------|-----|---------|
| `short_form_surge` | Warm coral-orange, energetic | `#E87B3C` | 18% |
| `authenticity_era` | Warm sage-teal, grounded | `#4F8A7A` | 18% |
| `engagement_bait` | Hot pink / magenta, garish | `#D63A82` | 22% |
| `nostalgia_wave` | Dusty purple, soft | `#7A4FA8` | 18% |
| `corporate_takeover` | Cool pale grey, drained | `#8A95A8` | 14% |

**Why these values against a warm near-white base:**

- **Opacities are roughly halved** vs. the prior dark-mode table. On a dark base, saturated color at 30% is required to register at the periphery; on a warm-white base, 15–22% color reads as assertive ambient presence. Beyond that it tips from "weather" to "decoration."
- **Hues lean editorial**, not neon. Magazine ink on cream paper, not RGB screen color. This matches the "design as straight man" posture in `visual-identity-light-mode`.
- **Relative muting intent preserved.** Engagement Bait is still the loudest (22%, hot pink), Corporate Takeover still the quietest (14%, drained grey). Ratio ~1.6:1, matching the original dark-mode table.

**Corporate Takeover signature (light-mode identity):**

On a dark base, the state was "darkest" — algorithm as black hole, vitality drained to nothing. On a warm-white base, the equivalent is **fluorescent office light leaching warmth from the base**. The edge vignette is a desaturated cool grey-blue wash at the lowest opacity of the five — still barely-there at the periphery, still confirming *something is different without announcing itself*. The tonal meaning is unchanged: corporate sterility, algorithm-as-spreadsheet, the moment when engagement becomes compliance. The mechanism inverts — drained coolness instead of drained darkness — but the feeling lands the same.

**Transition:** The vignette color crossfades on algorithm shift over 400ms (matching the background crossfade in UX spec §4.4).

**Instability intensification:** Per UX spec §4.3, in the final 20% of a shift interval, the vignette opacity scales up by ×1.2 (same instability factor already applied to the background drift speed). This reinforces the "something is coming" signal at the screen edges.

**Viral burst override:** During a viral burst event (UX spec §9.2), the vignette color is taken over by the source platform's affinity color. State machine:
1. Burst fires → crossfade from mood color to platform-affinity color over 300ms
2. Phase 2 (peak) → platform-affinity color pulses at 2s cycle at the mood vignette's current opacity
3. Phase 3 end (burst complete) → crossfade back to current mood color over 400ms

These are two states on the same layer — they do not stack. The viral color always wins while the burst is active.

### Phase 2 (follow-up): Base accent-tint wash

On the previous dark-mode derivation, Phase 2 proposed reducing panel opacity so the background gradient itself could contribute to mood presence. That direction does not translate to light mode — translucent white panels on a warm-white base would muddy rather than enrich, and panels here rely on shadow/border for lift, not contrast.

The light-mode equivalent is a **low-opacity accent-tint wash applied to the base area around (not behind) the panels**. This compounds the edge vignette by carrying a hint of the accent color into the strip of `#FAF8F5` visible between panels, further reinforcing the ambient weather. Values and approach deferred:

- Panels stay fully opaque `#FFFFFF` in v1 — this is the current commitment
- Contrast verification for P2 text on any tinted area needs to happen in-browser across all five mood states
- The measurement is an engineering task, not a design judgment
- Phase 1 alone should meaningfully address the lifelessness problem

Phase 2 becomes worth doing once Phase 1 is shipped and the gap is re-evaluated in-browser.

### Scope note — core-game-screen.md §4.2–4.4

- **§4.2 mood library** — the background gradient/motion-signature table was written against a dark base. It needs a follow-up pass to point at this proposal for light-mode color values. The "motion signature" column (fast drift / slow breathing / jittery pulse) is independent of color space and stands.
- **§4.3 instability intensification** — saturation-nudge math differs on a light base, but the *logic* (drift speed scales up, saturation nudges in final 20%) is unchanged. Specific values are engineer-tuned.
- **§4.4 shift transition** — 400ms crossfade timing is independent of color space and stands as written.

A follow-up UX task will reconcile §4.2's table with this proposal's edge colors. Out of scope for this revision.

## References

1. `client/src/ui/AlgorithmBackground.tsx` — current background implementation; vignette layer should be added here or as a sibling component
2. `client/src/ui/GameScreen.css` — panel background token (now targeting `#FFFFFF` opaque white on light base)
3. `client/src/ui/display.ts` — `ALGORITHM_MOOD` — mood definitions where `moodColorEdge` token should be updated
4. `.frames/sdlc/proposals/draft/visual-identity-light-mode.md` — the light-mode commitment driving this revision
5. `.frames/sdlc/ux/core-game-screen.md` §4.2 — mood library and motion signatures (needs follow-up revision)
6. `.frames/sdlc/ux/core-game-screen.md` §4.3 — instability intensification spec (final 20% of shift interval)
7. `.frames/sdlc/ux/core-game-screen.md` §4.4 — shift transition timing (400ms background crossfade)
8. FTL: Faster Than Light — reference for edge vignette as ambient state carrier

## Open Questions

1. Should the vignette be a second `<div>` layer in `AlgorithmBackground`, or a `::before`/`::after` pseudo-element on the existing element? **Owner: engineer**
   - [RESOLVED] Second `<div>` inside `AlgorithmBackground`. The `::after` pseudo-element is already occupied by the shimmer layer (see `GameScreen.css`). `::before` is free, but the viral burst override requires React prop control — the component needs to accept burst state (active, platform affinity color) and drive the crossfade. A React-controlled `<div>` handles this cleanly; a pseudo-element would require threading the burst color through CSS custom properties and managing the 3-phase state machine entirely in CSS, which is brittle. The second `<div>` keeps all mood-background logic in one component and makes the instability factor and viral state trivially passable as props.
2. The opacity targets above are starting points. Engineer should tune in-browser across all five states to confirm they're perceptible but not distracting. Is there a brightness or saturation constraint that should be specified here to bound the tuning? **Owner: ux-designer (can answer in review if engineer flags)**
   - [RESOLVED] No hard constraint needed from the engineer's side. The opacity table is sufficient direction. The implicit bound is: perceptible at a glance without requiring attention. In-browser tuning can proceed without a formal ceiling — if it reads as distraction, it's over; if it's invisible, it's under. The per-mood targets in the table already encode the relative muting intent (Corporate Takeover at 14% vs. Engagement Bait at 22%).
3. **[NEW]** Does the warm base (`#FAF8F5`) shift slightly per algorithm state, or stay fixed while only the accent layer shifts? (Mirrors OQ2 on `visual-identity-light-mode`.) **Owner: ux-designer + engineer**
   - [RESOLVED — ux-designer, 2026-04-05] Base stays **fixed** at `#FAF8F5` for v1. Only the accent layer (edge vignette + chrome accents) shifts with algorithm state. Rationale: (a) engineer recommended "start fixed, retrofit if needed" — a shifting base is cheap to add later once accents have been judged in motion; (b) calibration surface stays small — fixing the base lets us tune accent harmony against a single known canvas rather than five; (c) a shifting base adds a third degree of color freedom on top of edge vignette and accent chrome, and risks color pollution. Base-shift is a post-ship retrofit candidate if accents alone do not carry immersion.
4. **[NEW]** What is Corporate Takeover's signature on a light base, now that "darkest" is no longer available? **Owner: ux-designer**
   - [RESOLVED — ux-designer, 2026-04-05] **Cool pale grey wash, drained of warmth.** The edge vignette uses a desaturated cool grey-blue (`#8A95A8` direction) at the lowest opacity of the five states (14%). The metaphor shifts from "algorithm as black hole" to "fluorescent office light" — same tonal meaning (corporate sterility, algorithm-as-spreadsheet, engagement-becomes-compliance), inverted mechanism (drained coolness vs. drained darkness). Relative muting intent is preserved: it remains the quietest and most neutral of the five state signatures.

---
# Review: engineer

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

Both OQs answered. No blocking concerns.

1. **Second `<div>` over pseudo-element** — `::after` is already taken by the shimmer animation in `GameScreen.css`. `::before` is available but the wrong tool here: the viral burst override (3-phase state machine, crossfade to platform affinity color, pulse, crossfade back) requires React to drive it. Threading that through CSS custom properties on a pseudo-element is achievable but brittle — any change to the burst phases requires coordinated CSS + React state changes. A second `<div>` inside `AlgorithmBackground` receives instability factor and burst state as props and handles everything in one place. `AlgorithmBackground` already computes `instabilityFactor` for the speed multiplier, so passing it through to the vignette opacity scale is trivial.

2. **Opacity constraint** — no hard bound needed. The per-mood table encodes relative intent (Corporate Takeover at 20% is subtler by design; Engagement Bait at 32% is the loudest). Engineer tunes in-browser with those as anchors. No formal ceiling necessary.

Phase 2 (panel opacity) is correctly deferred — contrast verification across all five mood states is an engineering measurement, not a design call, and Phase 1 alone should move the needle.

---
# Review: game-designer

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

Reviewed from the player-experience lens. No blocking concerns.

1. **Aesthetic-to-mechanic trace is clean.** The stated feeling — "weather of the screen, ambient, environmental, felt rather than read" — maps directly to an edge vignette at 14–22% opacity on a warm-white base. Center stays readable; periphery carries the mood. This is the right mechanical answer to the target aesthetic and closes the gap the proposal identifies (algorithm mood architecturally present but visually absent).

2. **Corporate Takeover reframe is stronger than the original derivation.** "Algorithm as black hole" was evocative but abstract. "Fluorescent office light leaching warmth from the base" is concrete — it names the specific texture of corporate capture (the drained vitality, the meeting-room hum). The tonal meaning (sterility, algorithm-as-spreadsheet, engagement-becomes-compliance) lands harder with a specific metaphor than with a general one. The light-mode constraint forced a better answer here, not a compromised one.

3. **Relative muting ordering is preserved through the base swap.** Engagement Bait remains the loudest (22%) and Corporate Takeover remains the quietest (14%), ratio ~1.6:1 matching the prior dark-mode derivation. This matters because the *ratios* encode the honesty of the mood signal — the most manipulative state should feel the loudest, the most draining state the quietest. Design integrity survived the re-derivation.

4. **Viral burst override is the right call.** During a burst, the burst itself is the signal the player is tracking; losing the algorithm mood cue for ~1–2 seconds is appropriate because burst is a temporary foreground event and mood is persistent ambient context. The two-states-on-one-layer rule (viral always wins while active) prevents signal collision. Honest prioritization.

5. **Instability ×1.2 in final 20% reinforces anticipation at the edges.** Matches the "something is coming" signal already in the spec (§4.3) and compounds the drift-speed intensification rather than duplicating it. Good use of an existing factor.

**Non-blocking observation (flag-for-discussion):**

- The proposal does not specify vignette behavior during a **scandal** event. Scandals have their own visual language per the accepted `Scandals & Follower Loss` proposal. Mood being ambient and scandal being foreground should let the two coexist, but it is worth confirming in implementation that the scandal visual language does not compete with or wash out the mood vignette at the moment a player most needs to read the screen. Not blocking — can be handled when scandals are built against this layer.

Moving to accepted.

---
# Review: engineer (revision 2026-04-05)

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

Reviewing the light-mode re-derivation. The mechanics I aligned on in the prior review — second `<div>` layer, React-driven viral burst state machine, instability factor pass-through, 400ms crossfade — are unchanged. Only color tokens and opacity values shifted, plus OQ3/OQ4 resolved.

1. **OQ3 (fixed base vs. shifting base) resolved "fixed" — matches my recommendation.** Calibration surface stays at one canvas. Retrofit path to a per-state base shift remains open (swap `--base-canvas` token per mood) but is not committed in v1. Good default.

2. **Opacity table change is a token-value edit, not a code-shape change.** The implementation still reads `--mood-color-edge` off the current mood, still crossfades over 400ms, still scales opacity by the existing `instabilityFactor`. New values drop into `ALGORITHM_MOOD` in `display.ts` — no structural work.

3. **Corporate Takeover hex direction (`#8A95A8` at 14%).** Fits the same token slot; will tune in-browser against the other four alongside the rest of the table per OQ2's "perceptible but not distracting" anchor.

4. **Phase 2 reframe (accent wash around panels, not translucent panels) is still correctly deferred.** Still an in-browser contrast measurement across all five mood states once Phase 1 is live. No change to my prior assessment.

5. **Non-blocking note carried forward from game-designer's flag-for-discussion:** vignette + scandal coexistence. Will verify when scandals are wired against this layer that scandal foreground treatment does not compete with the ambient vignette at the moment the player most needs to read the screen. Not a blocker for Phase 1.

All four OQs resolved. No new engineering concerns. Last reviewer — moving to accepted.
