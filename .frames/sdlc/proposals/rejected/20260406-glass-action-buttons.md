---
name: Glass Action Buttons
description: Apply frosted-glass material treatment to the Actions-column verb buttons, allowing algorithm-mood vignettes to tint through.
created: 2026-04-06
author: ux-designer
status: rejected
reviewers: []
---

# Proposal: Glass Action Buttons

## Problem

The Actions column (manual-action-ladder verb buttons) and the Generators column both render as opaque white cards on the warm `#FAF8F5` base. They look like siblings — same material, same weight. But they serve different roles: action buttons are the player's hands (tap targets, immediate, verb-driven), generators are the player's machines (passive, structural, data-dense). The current shared material flattens that distinction.

Separately, the algorithm-mood edge vignettes stop at the opaque card boundary. The mood tints the *background* but never touches the *things the player interacts with*. The algorithm's presence feels decorative rather than atmospheric.

## Proposal

### 1. Material

Replace the opaque white background on each Actions-column verb button with a frosted-glass surface:

```css
.action-button {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);  /* Safari */
  border: 1px solid rgba(255, 255, 255, 0.35);
}
```

The generators column, platform cards, and all other panels remain opaque `#FFFFFF`. Glass is exclusive to the Actions column.

### 2. Mood bleed-through

Because the Actions column sits within the algorithm-mood edge-vignette zone, the frosted glass picks up a subtle tint from the active mood:

- **Engagement Bait Season** (`#D63A82` vignette at ~30% opacity) — action buttons gain a faint warm-pink warmth
- **Corporate Takeover** (`#8A95A8` vignette at ~30% opacity) — buttons go cool-grey
- **Short-Form Surge** (`#E87B3C`) — faint warm-coral
- **Authenticity Era** (`#4F8A7A`) — faint cool-teal
- **Viral Cascade** (`#C4A035`) — faint warm-gold

The tinting is incidental (a product of what's behind the blur), not programmatic. No additional CSS per mood — the glass does it for free.

### 3. Spotlight slot treatment

The spotlight slot (most-recently-unlocked verb, pinned sticky-top on desktop / sticky-bottom on mobile) needs to feel elevated above the other glass buttons. Two options:

**Option A — More opaque glass + shadow (recommended):**
```css
.action-button--spotlight {
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
```

**Option B — Same glass, border accent:**
```css
.action-button--spotlight {
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
```

Option A is preferred — the slightly higher opacity makes the spotlight card read as "closer to you" without breaking the glass family.

### 4. Ghost slot

Ghost slots (locked verbs, silhouette preview) are already specced at 0.35 opacity in `ux/manual-action-ladder.md`. Glass treatment applies to the ghost container — the silhouette sits inside a frosted surface, making it feel like something is forming *behind* the glass. This reinforces the discovery mechanic without additional work.

```css
.action-button--ghost {
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
```

### 5. Contrast safety

The effective blended background behind glass stays within safe range:

- **Worst case:** mood vignette at ~30% opacity bleeding through 60%-opaque white glass. The resulting surface luminance stays above L=0.85 (approximately `#E8E0E0` equivalent at the absolute warmest). All six accent tokens from `ux/accent-palette-light-mode.md` retain >= 4.0:1 against this surface. `--accent-amber` (`#C45A10`) is the tightest at ~4.0:1 in the warmest mood — still above the 3:1 WCAG 1.4.11 minimum for UI components, though it dips below the 4.5:1 text target.
- **Mitigation for amber text on glass:** if amber appears as text on an action button (e.g., a negative rate-delta label), render it on an opaque white pill/chip inside the glass card rather than directly on the glass surface. This is already the convention for modifier chips in the manual-action-ladder spec.
- **All other accents** (gold, green, red, platinum, platinum-deep) retain >= 4.5:1 even against the worst-case blended surface.

### 6. Fallback (no backdrop-filter support)

```css
@supports not (backdrop-filter: blur(1px)) {
  .action-button {
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid #E8E4DF;
  }
}
```

Degrades to a slightly translucent white card — still lighter than the generators column (which is fully opaque), preserving the material hierarchy. No broken state.

### 7. Reduced motion

`backdrop-filter` is a static effect — no animation involved. No `prefers-reduced-motion` concern. The mood bleed-through changes only when the algorithm mood changes (a low-frequency event), not per-frame.

### 8. Performance

- `backdrop-filter` is GPU-composited. The Actions column contains at most 5-6 cards (soft cap 4 live + 1-2 ghosts). This is a small compositing surface.
- The generators column (which repaints frequently — counters ticking, cooldown rings) is NOT glass. The expensive repainting elements stay on opaque surfaces.
- Mobile: the action buttons in mobile layout are in a fixed bottom bar (96px). A single frosted-glass bar is a well-trodden pattern (iOS tab bar, etc.) — no performance concern.

## References

1. `ux/manual-action-ladder.md` — Actions-column UX spec (ghost slots, spotlight, button anatomy)
2. `ux/accent-palette-light-mode.md` — accent token contrast values, amber warning
3. `proposals/accepted/visual-identity-light-mode.md` — base palette (`#FAF8F5`, `#FFFFFF`), WCAG targets
4. `proposals/accepted/algorithm-mood-visibility.md` — mood-edge vignette colors and opacities
5. `ux/core-game-screen.md` — zone map, Actions column positioning

## Open Questions

None — scope is narrow, treatment is CSS-only, contrast is verified. Ship it.
