---
name: Algorithm Mood Visibility
description: The algorithm mood background should be perceptible through content panels via screen-edge vignettes, with panel opacity tuning deferred until contrast is verified across all states.
author: ux-designer
status: accepted
reviewers: []
---

# Proposal: Algorithm Mood Visibility

## Problem

The algorithm mood background is architecturally present but visually absent. Two factors suppress it:

1. **Panel opacity:** The content panels (`rgba(18, 21, 28, 0.82)`) are 82% opaque dark and cover ~80% of the visible screen area. Even the most saturated mood gradients (engagement_bait: magenta → yellow) cannot breathe through this.
2. **Corporate Takeover gradient darkness:** The current `corporate_takeover` gradient (`#1a1a22 → #2d2d38 → #3d3a4a`) is near-indistinguishable from the base background (`#0b0d12`). By design this state should feel flat and cold — but right now every state looks identical: a dark wall.

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

Each algorithm mood gets a `--mood-color-edge` token at ~25–35% opacity — enough to tint the periphery, not enough to compete with content.

**Per-mood edge color targets (directions, not final values — engineer to tune):**

| State | Edge color direction | Opacity |
|-------|----------------------|---------|
| `short_form_surge` | Warm amber `#c45a10` | 30% |
| `authenticity_era` | Muted teal `#1a6070` | 28% |
| `engagement_bait` | Magenta `#9e1a7a` | 32% |
| `nostalgia_wave` | Deep purple `#5a2080` | 28% |
| `corporate_takeover` | Cool grey `#3a3a50` | 20% |

Corporate Takeover remains the most muted by design. Its edge color is subtle — a barely-there coolness at the periphery that confirms *something is different* without announcing itself.

**Transition:** The vignette color crossfades on algorithm shift over 400ms (matching the background crossfade in UX spec §4.4).

**Instability intensification:** Per UX spec §4.3, in the final 20% of a shift interval, the vignette opacity scales up by ×1.2 (same instability factor already applied to the background drift speed). This reinforces the "something is coming" signal at the screen edges.

**Viral burst override:** During a viral burst event (UX spec §9.2), the vignette color is taken over by the source platform's affinity color. State machine:
1. Burst fires → crossfade from mood color to platform-affinity color over 300ms
2. Phase 2 (peak) → platform-affinity color pulses at 2s cycle at the mood vignette's current opacity
3. Phase 3 end (burst complete) → crossfade back to current mood color over 400ms

These are two states on the same layer — they do not stack. The viral color always wins while the burst is active.

### Phase 2 (follow-up): Panel opacity tuning

Reducing panel opacity from 82% to ~72–74% would let the background gradient itself contribute to mood presence, compounding the vignette effect. This is deferred because:

- P2 text on colored backgrounds needs contrast verification across all five mood states
- The measurement is an engineering task, not a design judgment
- Phase 1 alone should meaningfully address the lifelessness problem

Phase 2 becomes worth doing once Phase 1 is shipped and the gap is re-evaluated in-browser.

## References

1. `client/src/ui/AlgorithmBackground.tsx` — current background implementation; vignette layer should be added here or as a sibling component
2. `client/src/ui/GameScreen.css` — panel background token (`--panel-bg: rgba(18, 21, 28, 0.82)`)
3. `client/src/ui/display.ts` — `ALGORITHM_MOOD` — mood definitions where `moodColorEdge` token should be added
4. `ux/core-game-screen.md` §4.2 — mood library and motion signatures
5. `ux/core-game-screen.md` §4.3 — instability intensification spec (final 20% of shift interval)
6. `ux/core-game-screen.md` §4.4 — shift transition timing (400ms background crossfade)
7. FTL: Faster Than Light — reference for edge vignette as ambient state carrier

## Open Questions

1. Should the vignette be a second `<div>` layer in `AlgorithmBackground`, or a `::before`/`::after` pseudo-element on the existing element? Pseudo-element is simpler if the existing element already has one in use. **Owner: engineer**
   - [RESOLVED] Second `<div>` inside `AlgorithmBackground`. The `::after` pseudo-element is already occupied by the shimmer layer (see `GameScreen.css`). `::before` is free, but the viral burst override requires React prop control — the component needs to accept burst state (active, platform affinity color) and drive the crossfade. A React-controlled `<div>` handles this cleanly; a pseudo-element would require threading the burst color through CSS custom properties and managing the 3-phase state machine entirely in CSS, which is brittle. The second `<div>` keeps all mood-background logic in one component and makes the instability factor and viral state trivially passable as props.
2. The opacity targets above are starting points. Engineer should tune in-browser across all five states to confirm they're perceptible but not distracting. Is there a brightness or saturation constraint that should be specified here to bound the tuning? **Owner: ux-designer (can answer in review if engineer flags)**
   - [RESOLVED] No hard constraint needed from the engineer's side. The opacity table is sufficient direction. The implicit bound is: perceptible at a glance without requiring attention. In-browser tuning can proceed without a formal ceiling — if it reads as distraction, it's over; if it's invisible, it's under. The per-mood targets in the table already encode the relative muting intent (Corporate Takeover at 20% vs Engagement Bait at 32%).

---
# Review: engineer

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

Both OQs answered. No blocking concerns.

1. **Second `<div>` over pseudo-element** — `::after` is already taken by the shimmer animation in `GameScreen.css`. `::before` is available but the wrong tool here: the viral burst override (3-phase state machine, crossfade to platform affinity color, pulse, crossfade back) requires React to drive it. Threading that through CSS custom properties on a pseudo-element is achievable but brittle — any change to the burst phases requires coordinated CSS + React state changes. A second `<div>` inside `AlgorithmBackground` receives instability factor and burst state as props and handles everything in one place. `AlgorithmBackground` already computes `instabilityFactor` for the speed multiplier, so passing it through to the vignette opacity scale is trivial.

2. **Opacity constraint** — no hard bound needed. The per-mood table encodes relative intent (Corporate Takeover at 20% is subtler by design; Engagement Bait at 32% is the loudest). Engineer tunes in-browser with those as anchors. No formal ceiling necessary.

Phase 2 (panel opacity) is correctly deferred — contrast verification across all five mood states is an engineering measurement, not a design call, and Phase 1 alone should move the needle.

Moving to accepted.
