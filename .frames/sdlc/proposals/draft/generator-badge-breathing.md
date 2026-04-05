---
name: Generator Badge Breathing
description: Owned generator badges should pulse with a slow ambient breath animation, staggered by unlock order, so the generator list feels like a running machine rather than a static menu.
author: ux-designer
status: draft
reviewers: [engineer]
---

# Proposal: Generator Badge Breathing

## Problem

The generator list is completely static between player interactions. Owned generators are producing engagement every tick, but nothing on screen communicates that they're running. The list reads as a menu — things you bought — rather than a machine actively working for you. This is a significant contributor to the game feeling lifeless during normal play.

## Proposal

Each owned generator badge pulses with a slow ambient breath animation. The animation is:

- **Cadence:** 2.5s per cycle, ease-in-out
- **Amplitude:** scale 1.0 → 1.025 → 1.0 (barely perceptible at a glance, felt rather than seen)
- **Phase offset:** each badge starts its cycle at a different phase, staggered by unlock order index

The phase offset is the key decision. Synchronized breathing (all badges peaking at the same moment) reads as robotic. Staggered breathing reads as organic — the list feels alive rather than mechanical. The stagger is computed from the generator's position in `GENERATOR_ORDER`:

```
animation-delay: -(index × 2.5s / total_generators)
```

Using a negative delay starts each badge mid-cycle immediately on mount rather than waiting for its turn — no staggered startup delay the player would notice.

### What pulses, what doesn't

- **Pulses:** owned generator badges only
- **Does not pulse:** locked badges (hollow), unowned-but-discovered badges (threshold met, not bought)
- **Does not pulse:** the icon inside the badge — only the badge shape itself breathes

### Interaction with other badge animations

The badge already has an `upgraded-pulse` animation (scale 1.0 → 1.02 → 1.0, 250ms) on upgrade confirm. The breathing animation should pause during this pulse and resume after. In practice this is handled naturally if the upgrade pulse uses `animation` shorthand and the breathing uses a CSS custom property or class — the upgrade class can temporarily override the breathing animation.

### Reduce Motion

Under `prefers-reduced-motion` or the in-game Reduce Motion toggle: breathing animation is disabled. Owned badges render static. This is decorative motion — unlike counter interpolation, removing it causes no information loss.

### Why not rate-coupled cadence

A rate-coupled approach (faster generators pulse faster) was considered and rejected. With 7 generators at different rates, the visual result is noise — competing rhythms that feel agitated rather than alive. The staggered uniform cadence achieves organic feel without information overload. Rate information is already communicated by the rate label on each row.

## References

1. `client/src/ui/GeneratorList.tsx` — badge rendering; `className={`badge ${badgeShape}`}`
2. `client/src/ui/GameScreen.css` — `.badge` styles; breathing animation goes here
3. `client/src/ui/display.ts` — `GENERATOR_ORDER` — defines unlock order for phase offset computation
4. `ux/purchase-feedback-and-rate-visibility.md` §6.2 — original mention of breathing pulse on badges
5. `ux/core-game-screen.md` §12 — Reduce Motion scope: "disables particle bursts, replaces background drift with static gradients" — breathing is in this category

## Open Questions

1. The amplitude of 1.025 is a starting point. Engineer should test in-browser — it may need to go as low as 1.015 to avoid feeling distracting at small badge sizes, or as high as 1.04 to be visible at all. **Owner: engineer (tune in-browser)**
2. Should the breathing animation be applied via a CSS class toggled in React (`.badge.owned`) or directly via a CSS rule targeting `.generator-row:not(.locked) .badge`? The latter requires no React change. **Owner: engineer**
