---
name: Ratio-Scaled Manual Tap Floating Numbers
description: Scale floating number size and brightness based on tap significance — the ratio of engagement earned to current engagement balance.
created: 2026-04-06
author: ux-designer
status: accepted
reviewers: []
---

# Proposal: Ratio-Scaled Manual Tap Floating Numbers

## Problem

When the player taps a verb action button, the floating `+N` number pops at a fixed size (22px) and fixed color (gold `#FFD66B`) regardless of value. A `+1` tap in early game and a `+847K` tap in late game look identical. The player gets no visual feedback about whether their tap was significant relative to their current state. This is a missed opportunity: the float is the most immediate feedback from the core action, and it communicates nothing about relative impact.

## Proposal

Scale the floating number's font-size and HSL brightness based on `perClick / currentEngagement` — the ratio of what the tap earned to what the player currently has. Significant taps (high ratio) render large and bright. Insignificant taps (low ratio) render small and dim. The hue stays gold throughout.

### 1. Ratio computation

```
ratio = perClick / max(1, currentEngagement)
t = clamp((log10(ratio) + 6) / 6, 0, 1)
```

`t` maps the ratio to a 0–1 scale across 6 orders of magnitude:

| Ratio | t | Player moment |
|-------|---|---------------|
| 1.0 (tap = 100% of balance) | 1.0 | Early game, first taps |
| 0.01 (tap = 1% of balance) | 0.67 | Mid-game, taps still matter |
| 0.001 (tap = 0.1%) | 0.5 | Transition zone — generators taking over |
| 0.000001 (tap = 0.0001%) | 0.0 | Late game, manual taps are supplementary |

The log scale is essential because the ratio spans ~9 orders of magnitude across a full playthrough. A linear mapping would bottom out within the first few minutes.

### 2. Size scaling

```
fontSize = lerp(16, 32, t)
```

| t | Font size | Context |
|---|-----------|---------|
| 0.0 | 16px | Floor — still legible (larger than 13px badge text) |
| 0.5 | 24px | Mid-range — close to current fixed 22px |
| 1.0 | 32px | Ceiling — significant tap, noticeable but not overwhelming on 80px button |

The current fixed 22px falls near the midpoint, so the average player experience barely changes. Extremes become visible: early taps feel punchy, late taps feel light.

### 3. Gold brightness scaling

The hue stays at HSL 43 (gold). Saturation and lightness scale with `t`:

```
saturation = lerp(40, 100, t)    // 40% → 100%
lightness  = lerp(52, 71, t)     // 52% → 71%
color      = hsl(43, saturation%, lightness%)
```

| t | Color | Token | Feel |
|---|-------|-------|------|
| 0.0 | `hsl(43, 40%, 52%)` | `#B8A050` — dim gold | Muted, warm, still reads as "earned" |
| 0.5 | `hsl(43, 70%, 62%)` | ~`#D4B55E` — mid gold | Neutral |
| 1.0 | `hsl(43, 100%, 71%)` | `#FFD66B` — bright gold | Full current gold, maximum reward feel |

No hue shift. Both extremes are gold. The player never sees a color that reads as "bad" or "warning" — only degrees of warmth. This preserves the reward beat at every tap.

### 4. Contrast and accessibility

The floating number's primary contrast mechanism is its text-shadow (`0 0 3px rgba(255, 214, 107, 0.9), 0 0 8px rgba(255, 214, 107, 0.5), 0 0 16px rgba(255, 200, 50, 0.3), 0 2px 4px rgba(0, 0, 0, 0.6)` — current `.verb-float` CSS). The dark shadow provides contrast against any button face color. At the dim gold floor (`#B8A050`), the text-shadow's `rgba(0,0,0,0.6)` provides sufficient contrast for legibility. At the bright gold ceiling, contrast is strong.

Size carries the primary significance signal. Brightness is reinforcement. A color-blind player reads significance through size alone — no information is lost. This satisfies WCAG color-independence requirements.

### 5. Purely ratio-driven (no threshold gate)

The formula runs identically at all game stages. There is no special case where taps are held at full brightness until autoclickers arrive. Rationale:

- A threshold gate creates a discontinuity: the moment you buy your first autoclicker, your manual taps visually shrink. That's a punishment signal on a purchase — backwards.
- The gradual shrink from organic engagement growth is honest and invisible in the moment. The player never experiences a sudden downgrade.
- After a BUY purchase (yield increase), the ratio jumps up and the float temporarily grows — creating a satisfying "I just powered up" feedback moment without any special-case logic.

### 6. Interaction with autoclicker floats

Per `ux/manual-action-ladder.md` §4.6, autoclicker floats already render at 80% size and 0.7 opacity relative to manual floats. Under this proposal:

- The manual float's size is now variable (16–32px). Autoclicker floats should scale to 80% of the *current* manual float size: `autoclickerSize = manualSize × 0.8`. This preserves the visual hierarchy at all ratios.
- At late game: manual floats are small (16px), autoclicker floats are smaller (13px). Both are dim. The autoclicker's 0.7 opacity still differentiates them.
- At early game (before autoclickers exist): manual floats are large and bright. No conflict.
- The density-cap batched floats (`+total ×N` at 8+ autoclickers) stay at a fixed 22px per §4.6 — they are aggregate readouts, not individual taps, and should not scale with the manual float ratio.

### 7. Reduced motion

No new animation is introduced. Size and brightness are static properties computed at the moment of emission — they do not animate over the float's lifetime. Under `prefers-reduced-motion: reduce`, the float still appears (snaps to position without drift, per §9.5), and still carries the ratio-scaled size and brightness. No change needed.

### 8. Implementation surface

The change is contained to two files:

- **`client/src/ui/ActionsColumn.tsx`** — the `verb-float` span. Add `currentEngagement` to the component's props (already available from game state). Compute `t` from `perClick / currentEngagement`. Set inline `style={{ fontSize, color }}` on the float span.
- **`client/src/ui/GameScreen.css`** — the `.verb-float` rule. Change `font-size: 22px` and `color: #FFD66B` to default values that are overridden by inline styles. The text-shadow stays fixed (it's the contrast mechanism, not the significance signal).

`PostZone.tsx` uses a separate `.float-number` class. If the ratio scaling should apply there too (the main Post button in early game before verb buttons exist), the same logic applies — pass `currentEngagement` and compute inline styles. This is a follow-up decision, not blocking.

## References

1. `client/src/ui/ActionsColumn.tsx` — current verb-float rendering (line 204)
2. `client/src/ui/GameScreen.css` — current `.verb-float` styles (22px, #FFD66B)
3. `ux/manual-action-ladder.md` §4.6 — autoclicker float spec (80% size, 0.7 opacity)
4. `ux/core-game-screen.md` §8.2 — click floating number spec (500ms, drift up)
5. `proposals/accepted/level-driven-manual-cooldown.md` — three-axis model, yield formula `base_event_yield × (1 + count)`

## Open Questions

1. Should `PostZone.tsx` (the early-game Post button) also get ratio-scaled floats, or only the verb-button floats in ActionsColumn? The PostZone is temporary (replaced by verb buttons once the ladder activates), so the impact is limited. **Owner: ux-designer**

---
# Review: engineer

**Date**: 2026-04-06
**Decision**: Aligned

**Comments**

The math is sound, the implementation surface is accurate and small (~30 min). `verbYieldPerTap` already exists as an extracted helper in `game-loop/index.ts`, and `state.player.engagement` is already available in ActionsColumn's props. Computing `t` is ~3 lines of inline logic; the rest is an inline `style` override on the float span.

Observations (non-blocking):

1. The `max(1, currentEngagement)` floor gives the first-ever tap `t = 1.0` (biggest, brightest). That's actually the right feel for the first click — no issue.
2. Late-game autoclicker floor at 13px (80% of 16px manual floor) is tight but legible. The density-cap batched floats staying at fixed 22px is the correct call.
3. The `PostZone.tsx` follow-up (OQ1) is cleanly scoped out — no coupling risk since it uses a separate CSS class.
4. The text-shadow contrast mechanism is shared infrastructure (`.verb-float` CSS) and stays fixed. No risk of dim gold becoming illegible since the dark shadow provides the contrast floor.

No blocking concerns. Implementable as specified.
