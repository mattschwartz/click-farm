---
name: Rush Buy Ignition Switch
description: Transforms the Rush Buy button from a flat gold bar into a live-wire ignition switch that blazes on press and pulses with each purchase.
created: 2026-04-07
author: ux-designer
status: accepted
reviewers: []
---

# Proposal: Rush Buy Ignition Switch

## Problem

The Rush Buy button is a 36px flat gold-tinted bar with a gentle opacity pulse (0.8-1.0, 400ms) while sweeping. It's the most exciting action in the game — watch your entire engagement drain as generators, levels, and autoclickers cascade upward — delivered through the least exciting button on screen. The verb buttons got arcade-button physicality (raised slabs, spring physics, depth shadows). The Rush Buy button is still a polite fintech element.

The hold-to-activate mechanic is correct. The visual feedback is not.

## Proposal

### 1. Design intent

The Rush Buy button is an ignition switch. Press it and the breaker flips — the button transforms instantly from a resting gold bar into a blazing active state. Each purchase that fires sends a visible current pulse through the button. Release and the power cuts.

The emotional arc: idle calm → slam → live wire → power down.

### 2. Resting state (idle, purchases available)

Same as current, with one addition: the raised-slab depth treatment from the verb buttons, adapted to the button's proportions.

```css
.buy-all-btn {
  /* Existing: gold tint, gold border, gold text */
  /* Add: depth edge + spring transition */
  box-shadow:
    0 3px 0 0 rgba(var(--glow-halo-rgb), 0.4),   /* depth slab — gold-darkened */
    0 3px 8px rgba(0, 0, 0, 0.08);                 /* ambient */
  transform: translateY(0);
  transition: transform 100ms cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 100ms cubic-bezier(0.34, 1.56, 0.64, 1),
              background 60ms ease-in,
              border-color 60ms ease-in;
}
```

This gives it physical weight at rest — it's a button you can *press*, not a label you can tap.

### 3. Press — ignition (immediate, no charge delay)

On `pointerdown`, the button depresses and transforms in a single 60ms beat:

```css
.buy-all-btn-sweeping {
  /* Depress: sink 2px */
  transform: translateY(2px);

  /* Ignite: background floods solid gold, text goes white */
  background: var(--accent-gold, #A0730E);
  border-color: rgba(255, 200, 50, 0.6);
  color: #FFFFFF;

  /* Combined shadow: depth slab (compressed) + outer glow halo */
  box-shadow:
    0 1px 0 0 rgba(var(--glow-halo-rgb), 0.4),
    0 1px 4px rgba(0, 0, 0, 0.06),
    0 0 12px 2px rgba(var(--glow-halo-rgb), 0.35),
    0 0 24px 4px rgba(var(--glow-halo-rgb), 0.15);
}
```

The transition from transparent gold tint to solid gold background is the ignition moment. The outer glow halo makes the button look like it's radiating energy.

### 4. Live wire — purchase pulse

Each purchase that fires during the sweep triggers a brief flash through the button — a current-pulse that communicates "something just happened."

**Mechanism:** on each sweep purchase, add a CSS class (`buy-all-pulse`) that sets `filter: brightness(1.3)`, then remove it after one frame. The brightness spike is driven by a `transition`, not a keyframe `animation` — this avoids colliding with the glow-ramp animation on the same element (CSS `animation` doesn't compose across classes; `transition` on `filter` coexists cleanly).

```css
.buy-all-btn-sweeping {
  filter: brightness(1.0);
  transition: filter 80ms ease-out;
}

.buy-all-pulse {
  filter: brightness(1.3);
  transition: filter 0ms; /* instant spike */
}
```

When the class is added, brightness jumps to 1.3 instantly. When it's removed (~1 frame later via `requestAnimationFrame`), the 80ms `ease-out` transition on the base class smoothly decays back to 1.0. At 12 purchases/second, this creates a rapid flickering effect — the button strobes as engagement drains. Each flash is tied to a real purchase, so the rhythm is irregular (purchases are re-evaluated between each one, so timing varies slightly). The irregularity reads as electrical, not mechanical.

### 5. Glow intensification — energy ramp

As the sweep progresses, the outer glow intensifies. This communicates momentum — the longer the sweep runs, the more charged the button looks.

**Mechanism:** a CSS animation that runs for the duration of the sweep, ramping the glow spread:

```css
@keyframes buy-all-glow-ramp {
  0%   { box-shadow: 0 1px 0 0 rgba(var(--glow-halo-rgb), 0.4),
                     0 0 12px 2px rgba(var(--glow-halo-rgb), 0.35),
                     0 0 24px 4px rgba(var(--glow-halo-rgb), 0.15); }
  100% { box-shadow: 0 1px 0 0 rgba(var(--glow-halo-rgb), 0.4),
                     0 0 20px 4px rgba(var(--glow-halo-rgb), 0.45),
                     0 0 40px 8px rgba(var(--glow-halo-rgb), 0.25); }
}

.buy-all-btn-sweeping {
  animation: buy-all-glow-ramp 3s ease-in forwards;
}
```

At ~3 seconds (a typical full sweep at 80ms × ~35 purchases), the glow reaches its maximum spread. If the sweep ends early, the animation freezes wherever it is — the glow reflects how much was bought.

### 6. Release — power down

On release (`pointerup`), the sweeping class is removed. The button springs back up and the glow drains:

- **Spring-back:** `translateY(0)` with the 100ms cubic-bezier overshoot (same as verb buttons)
- **Glow drain:** background fades from solid gold back to gold tint over 200ms
- **Color return:** text returns from white to gold over 200ms

The 200ms drain is fast enough to feel responsive, slow enough to see the afterglow — the button cools down rather than snapping off.

### 7. Label during sweep

Current label changes from `RUSH BUY (HOLD)` to `BUYING...`. With the ignition treatment, the label should be bolder:

- **Resting:** `RUSH BUY` (drop the `(HOLD)` hint — the raised-slab physicality communicates pressability without instructions)
- **Sweeping:** `RUSH BUY` (unchanged — the visual transformation IS the feedback; changing the text to "BUYING..." adds noise to an already loud signal)

If the player needs to know they can release to stop, the `aria-label` carries that: "Buying — release to stop." Visual text stays stable.

### 8. Disabled state

Unchanged — transparent, muted border, receded text, no pointer events. No depth shadow (the button is not a pressable object when disabled).

### 9. Reduced motion

Under `prefers-reduced-motion` or `data-reduce-motion="true"` (both selectors must be present, matching existing codebase pattern in GameScreen.css):
- **Glow ramp animation:** `animation: none`. Static glow at the initial intensity.
- **Purchase pulse flicker:** `transition: filter 0ms`. No visible decay — brightness stays at 1.0.
- **Spring-back transition:** `transition: transform 0ms, box-shadow 0ms`. Instant position change, no overshoot.
- **Background color change:** preserved (it's a state signal, not decorative motion).
- **Power-down drain (§6):** `transition: background 0ms, color 0ms`. Instant return to resting state.

The button still transforms on press (solid gold, white text, depressed position) — that's state communication, not animation. The flickering, glow ramp, spring-back, and drain are suppressed.

### 10. Implementation scope

| File | Change |
|------|--------|
| `GameScreen.css` | Replace `.buy-all-btn` styles: add depth shadow, spring transition, ignition state, glow ramp keyframes, purchase pulse keyframes, power-down transition, reduced-motion overrides. ~60 lines replacing ~55 existing lines. |
| `GeneratorList.tsx` | (1) Remove `(HOLD)` from label. (2) Add `sweepPurchaseSeq: number` to `BuyAllButtonProps` and thread it through from `GeneratorList`'s existing prop. (3) Use `sweepPurchaseSeq` in a `useEffect` to toggle the `buy-all-pulse` class: add class, then `requestAnimationFrame(() => remove class)` so the transition fires the decay. |

No new props, no new components, no game logic changes.

## References

1. `proposals/accepted/20260406-auto-buy-sweep.md` — the sweep mechanic this proposal enhances visually. All mechanical behavior (cadence, order, cancel, re-evaluation) is unchanged.
2. `proposals/accepted/20260406-action-button-physicality.md` — the raised-slab treatment this proposal extends to the Rush Buy button. Depth shadow, spring-back, press depress — same language.
3. `client/src/ui/GeneratorList.tsx` lines 699-767 — current BuyAllButton component.
4. `client/src/ui/GameScreen.css` lines 906-960 — current Rush Buy CSS.

## Open Questions

1. **Glow color: gold vs. white-gold.** The current spec uses `--glow-halo-rgb` (warm gold) for the glow. An alternative is a hotter white-gold that reads more electrical. Hotter glow risks contrast issues with the warm-white canvas. **Owner: ux-designer (build-time tuning).**
2. **Purchase pulse timing vs. sweep cadence.** The pulse animation is 80ms, matching the 80ms sweep cadence. If two purchases fire back-to-back faster than 80ms (due to re-evaluation being instant), the second pulse would be swallowed. Acceptable — the visual reads as continuous flicker at high speed, which is the desired effect. **Owner: engineer (build-time verification).**

---
## Revision: 2026-04-07 — ux-designer

Addresses all three engineer RFC items: (1) merged duplicate `box-shadow` into single 4-layer declaration in §3, (2) moved purchase pulse from keyframe `animation` to `filter` transition to avoid collision with glow-ramp animation in §4, (3) noted `sweepPurchaseSeq` prop threading in §10 implementation scope. Also expanded §9 reduced-motion to cover `transition` suppression for spring-back and power-down drain, with both `@media` and `data-reduce-motion` selectors per codebase pattern.

---
# Review: engineer

**Date**: 2026-04-07
**Decision**: Request for Comment

**Comments**

The design intent is clear and the emotional arc is right. Three implementation issues need to be addressed before this can be built cleanly.

1. **Duplicate `box-shadow` in Section 3.** The `.buy-all-btn-sweeping` block declares `box-shadow` twice. The second declaration (outer glow) silently overrides the first (depth slab + ambient). The depth slab shadow is lost. These must be merged into a single `box-shadow` declaration with all four layers: depth slab, ambient, inner glow ring, outer glow halo.

2. **`animation` property collision between Section 4 and Section 5.** Section 5 sets `animation: buy-all-glow-ramp 3s ease-in forwards` on `.buy-all-btn-sweeping`. Section 4 sets `animation: buy-all-current-pulse 80ms ease-out` on `.buy-all-pulse`. When `.buy-all-pulse` is added to the element, CSS cascade replaces the glow-ramp animation entirely — it does not compose. The glow ramp freezes or resets on every purchase pulse, which is 12 times per second. Two options: (a) move the glow ramp to a CSS custom property animated via a JS-driven inline style (e.g., incrementing `--glow-intensity` on each pulse), or (b) move the purchase pulse to use `filter` transitions rather than a keyframe animation (the keyframe already uses `filter: brightness()`, so a simple `transition: filter 80ms` with a class toggle would work without an `animation` property). Option (b) is simpler and keeps everything in CSS.

3. **`sweepPurchaseSeq` is not passed to `BuyAllButton`.** The proposal says to use `sweepPurchaseSeq` in a `useEffect` to toggle the pulse class, but `BuyAllButtonProps` does not include this prop and `GeneratorList` does not pass it through (line 165-170). The implementation scope should note that `BuyAllButtonProps` needs a new `sweepPurchaseSeq: number` prop and the JSX at line 165 needs to thread it through.

Two smaller items that are not blockers but should be captured:

4. **Reduced-motion: transition suppression.** Section 9 says spring-back transition is disabled, but the implementation scope only mentions reduced-motion overrides for the keyframe animations. The `transition: transform 100ms cubic-bezier(...)` on `.buy-all-btn` also needs a reduced-motion override to `transition: none` (or `transition: transform 0ms`). The existing codebase uses both `@media (prefers-reduced-motion: reduce)` and `html[data-reduce-motion="true"]` selectors (see lines 952-960 of GameScreen.css) — both must be present for each new animation and transition.

5. **Performance at 12 pulses/sec is fine.** The `filter: brightness()` approach triggers compositing but not layout or paint on modern browsers. Combined with the 80ms class toggle, this will not cause frame drops. No concern here — just confirming the open question in #2 is answered from the engineering side.

---
# Review: game-designer

**Date**: 2026-04-07
**Decision**: Aligned

**Comments**

This proposal nails the target feeling. The emotional arc — idle calm, slam, live wire, power down — is exactly right for what Rush Buy is: the moment the player dumps accumulated wealth into raw progression. That moment deserves spectacle, and right now it gets a polite opacity pulse. The gap between what the action *does* and what the action *looks like* is the core problem, and this proposal closes it.

Specific points of alignment:

1. **Instant ignition is the correct choice.** No charge delay, no wind-up. The player decided to commit before they pressed — the button should honor that decision immediately. A charge delay would introduce doubt ("is it working?") at the exact moment the player should feel power.

2. **Purchase pulse tied to real events.** Each flash corresponds to an actual purchase firing. This is honest feedback — the rhythm is driven by the game state, not a decorative animation. The irregular cadence from re-evaluation timing is a strength: it reads as alive rather than canned. This is emergence in the visual layer — the player's economy is literally visible in the flicker pattern.

3. **Glow intensification communicates momentum.** The ramp rewards longer holds and gives the player a sense of the sweep's scale. A player who holds through 35 purchases sees a different button than one who holds through 5. That distinction is meaningful — it tells the player "you had a lot to buy" without numbers.

4. **Dropping "(HOLD)" from the label.** Correct call. The raised-slab physicality already teaches pressability. Instructional text on a physical-looking button is redundant and undermines the tactile metaphor. Players learn hold-to-activate within one interaction — the transformation IS the tutorial.

5. **Keeping the label stable during sweep.** Also correct. The current "BUYING..." swap is a text-level signal competing with a screen-level visual transformation. When the button is blazing gold with purchase pulses and an intensifying glow, changing the label to "BUYING..." is like whispering during a fireworks show. Let the visuals carry it.

6. **200ms power-down drain.** The afterglow is important. An instant snap-off would feel like a disconnect or error. The 200ms drain says "the engine is cooling" — it gives the moment a clean ending rather than an abrupt cutoff. Good instinct on the timing.

7. **Reduced motion handling.** Preserving the background color change (state signal) while suppressing the flicker and glow ramp (decorative motion) is the right split. The button still communicates "I am active" without relying on animation.

No concerns on feel, economy, or player psychology. This is a visual-only change with no mechanical impact — the sweep behavior, cadence, and purchase logic are untouched. The proposal correctly stays in its lane.

One minor observation (not blocking): the glow ramp assumes ~3 seconds for a full sweep. As the player progresses and has more generators/levels to buy, sweeps could run longer. The `forwards` fill on the animation handles this gracefully — the glow just maxes out and holds. If anything, a maxed-out glow during a long sweep reinforces the "this is a big purchase" feeling. No change needed.

---
# Review: engineer (re-review)

**Date**: 2026-04-07
**Decision**: Aligned

**Comments**

All three RFC items from the initial review have been resolved correctly.

1. **Duplicate `box-shadow` (§3) — resolved.** The `.buy-all-btn-sweeping` block now carries a single `box-shadow` declaration with all four layers (depth slab compressed, ambient, inner glow ring, outer glow halo). No silent override, no lost shadows.

2. **`animation` property collision (§4 vs §5) — resolved.** The purchase pulse now uses `filter: brightness()` driven by a `transition` rather than a keyframe `animation`. The base sweeping class sets `transition: filter 80ms ease-out` at `brightness(1.0)`; the pulse class overrides to `brightness(1.3)` with `transition: filter 0ms` for the instant spike. On class removal, the base transition decays smoothly. This coexists cleanly with the glow-ramp `animation` on `box-shadow` — no property collision.

3. **`sweepPurchaseSeq` prop threading (§10) — resolved.** The implementation scope now explicitly calls out adding `sweepPurchaseSeq: number` to `BuyAllButtonProps` and threading it through from `GeneratorList`'s existing prop. The `useEffect` toggle mechanism is described inline.

Additionally, the non-blocking item on reduced-motion transition suppression (item #4 from the initial review) has been addressed in §9, which now covers spring-back (`transition: transform 0ms, box-shadow 0ms`), power-down drain (`transition: background 0ms, color 0ms`), and confirms both `@media` and `data-reduce-motion` selectors per codebase convention.

No remaining concerns. This is ready to build.
