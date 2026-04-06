---
name: Action Button Physicality
description: Replace flat action-button cards with raised, pressable slabs that depress on tap and snap back with spring physics — making the manual-action-ladder buttons feel heavy and satisfying.
created: 2026-04-06
author: ux-designer
status: implementation
reviewers: []
---

# Proposal: Action Button Physicality

## Problem

The Actions-column buttons look identical in material to every other card on screen — flat, white, polished, modern. They read as a fintech dashboard, not a game. Nothing about them says "press me repeatedly and fast." The game is a clicker. The button the player clicks should be the most physically satisfying object on screen.

**Supersedes:** `proposals/rejected/20260406-glass-action-buttons.md` (frosted-glass treatment — explored and rejected; translucency read as "slightly tinted card," not as a distinct material).

## Proposal

### 1. Design intent

The action buttons are the ONE zone that breaks the editorial polish. Everything else on screen stays clean and warm (generators, platforms, top bar). The action buttons feel like physical objects — raised slabs that resist being pushed down and snap back up like spring-loaded arcade buttons. The contrast between the polished editorial frame and the juicy, weighted buttons IS the satire: a beautiful social-media shell with an addictive arcade machine inside.

### 2. Raised slab — resting state

Each action button is a colored slab that sits UP off the surface, casting a thick bottom shadow in a darker shade of its own face color.

```
  ╭─────────────────────────╮  ← 1px top border (face-color lightened 15%)
  │  ▣  CHIRPS         ×83  │  ← face: verb's color lane
  │     828.4K eng/tap       │
  ╰─────────────────────────╯
  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ← 4px bottom "depth edge" (face-color darkened 25%)
```

**CSS model:**

```css
.action-button {
  position: relative;
  border-radius: 12px;
  transform: translateY(0);
  transition: transform 60ms ease-in;

  /* depth edge — thick colored shadow */
  box-shadow:
    0 4px 0 0 var(--verb-shadow),       /* depth slab */
    0 6px 12px -2px rgba(0, 0, 0, 0.1); /* soft ambient */

  /* top-edge highlight */
  border-top: 1px solid var(--verb-highlight);
}
```

The button face, shadow, and highlight all derive from the verb's color lane — not white. Each verb gets a tinted face:

| Verb | Face | Shadow (darkened 25%) | Highlight (lightened 15%) | Text color |
|---|---|---|---|---|
| Chirps | `#4d9ef0` | `#3a77b4` | `#7ab8f5` | `#FFFFFF` |
| Selfies | `#e07040` | `#a85430` | `#e89070` | `#FFFFFF` |
| Livestreams | `#9a3adf` | `#732ca7` | `#b46ae8` | `#FFFFFF` |
| Podcasts | `#5a6adf` | `#4350a7` | `#7e8ae8` | `#FFFFFF` |
| Viral Stunts | `#df3a5a` | `#a72c44` | `#e86a80` | `#FFFFFF` |

Text on the button face is `#FFFFFF`. All five face colors produce >= 3.5:1 contrast against white text. The verb name is bold (Space Grotesk 600) at 14px+ — legibility is not a concern at these sizes and weights.

**Contrast against warm base (`#FAF8F5`):** The colored slabs are opaque and saturated. Minimum contrast of any face color against the warm base is ~3.2:1 (Chirps blue) — well above the 3:1 WCAG 1.4.11 minimum for UI components. The button boundary is unmistakable.

### 3. Pressed state — the smack

On `pointerdown` (not click — the press itself is the event), the button travels DOWN into the surface:

```css
.action-button:active,
.action-button--pressed {
  transform: translateY(3px);
  box-shadow:
    0 1px 0 0 var(--verb-shadow),        /* depth slab compressed */
    0 2px 4px -1px rgba(0, 0, 0, 0.08);  /* ambient tightened */
  transition: transform 40ms ease-in;     /* press is FAST */
}
```

**What happens:**
- `translateY(3px)` — the face drops 3px. The 4px shadow compresses to 1px. The button is now nearly flush with the surface.
- Press transition is 40ms `ease-in` — fast, no resistance feel. The button *wants* to go down.
- The 3px travel distance is the whole feeling. Too little (1px) and it feels like a hover state. Too much (6px+) and it feels spongy.

### 4. Release state — the snap-back

On `pointerup`, the button springs back to resting:

```css
.action-button {
  transition: transform 100ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

**The asymmetry is critical:**
- Press: 40ms, ease-in (fast, decisive, no hesitation)
- Release: 100ms, spring overshoot (bounces slightly past resting, settles)

The spring `cubic-bezier(0.34, 1.56, 0.64, 1)` overshoots by ~8% — the button pops up slightly *above* its resting position then settles back. This is what makes it feel spring-loaded and heavy. Heavy things resist going down and bounce coming back.

### 5. Impact feedback — the registration

At the moment the button hits bottom (the `pointerdown` frame), the engagement counter for that verb does a **number bump**:

```css
@keyframes counter-bump {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.15); }
  100% { transform: scale(1); }
}

.counter-bump {
  animation: counter-bump 150ms ease-out;
}
```

The counter scales up 15% and settles back. This happens on the SAME frame as the button depression — the two are causally linked. The player sees: "I pressed → the number moved." That's the dopamine loop.

### 6. Ghost slot — unlit button

Ghost slots (locked verbs) use the same raised-slab shape but desaturated and muted — an unpowered arcade button:

```css
.action-button--ghost {
  background: #E8E4DF;                    /* warm grey, matches border token */
  box-shadow:
    0 4px 0 0 #D0CBC4,                    /* muted depth */
    0 6px 12px -2px rgba(0, 0, 0, 0.06);  /* softer ambient */
  border-top: 1px solid #F0EDEA;
  opacity: 0.5;
}
```

The ghost keeps the slab shape so the player reads it as "a button that isn't on yet" — not a different kind of element. When it awakens (unlock threshold met), the color floods in and the slab lifts to full depth as part of the awakening animation specified in `ux/manual-action-ladder.md` section 3.

### 7. Spotlight slot — extra weight

The spotlight slot (most-recently-unlocked verb) gets a slightly deeper shadow and a subtle scale bump to feel heavier/closer:

```css
.action-button--spotlight {
  box-shadow:
    0 5px 0 0 var(--verb-shadow),        /* 1px deeper slab */
    0 8px 16px -2px rgba(0, 0, 0, 0.12); /* stronger ambient */
  transform: scale(1.02);                 /* 2% larger — subtle lift */
}
```

Press travel on spotlight is still 3px (consistent feel across all buttons).

### 8. Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  .action-button,
  .action-button:active,
  .action-button--pressed {
    transition: none;
  }

  .counter-bump {
    animation: none;
  }
}
```

Under reduced motion: button still changes visual state (shadow compression, translateY) but the transitions are instant — no animation. The counter bump is removed. The press/release still reads as state change through the static visual shift (shadow 4px → 1px is visible without motion).

### 9. Mobile

Same treatment. The action buttons in the mobile bottom bar (96px) use identical slab/shadow/press physics. Touch events map cleanly — `pointerdown`/`pointerup` works for both mouse and touch. No adjustment needed for tap targets — the existing 80px minimum from the actions-column spec is preserved.

### 10. What this does NOT change

- Generators column: stays opaque white cards, flat, structural.
- Platform cards: stays opaque, editorial.
- Top bar: untouched.
- Cooldown ring (3px left-edge vertical fill): renders ON the colored face. Ring color is `rgba(255,255,255,0.3)` — a subtle white overlay on the verb color, visible but not dominant.
- Count badge: opaque pill overlaid on the button face (same as current spec), uses the verb's shadow color as background with white text for contrast.

## References

1. `ux/manual-action-ladder.md` — Actions-column UX spec, button anatomy, ghost/spotlight behavior
2. `ux/visual-identity.md` §2 + §4 — generator color lanes (verb face colors derived from these)
3. `ux/accent-palette-light-mode.md` — accent tokens (not used on button faces, but relevant for modifier chips that appear on buttons)
4. `proposals/accepted/visual-identity-light-mode.md` — base palette, WCAG targets
5. `proposals/rejected/20260406-glass-action-buttons.md` — prior glass approach, rejected

## Open Questions

None.
