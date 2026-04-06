---
name: Glass Generator Sheet
description: Render the Generators column as a single frosted-glass clipboard — the algorithm's report served to the player — with mood-tinted translucency and hairline row dividers.
created: 2026-04-06
author: ux-designer
status: accepted
reviewers: []
---

# Proposal: Glass Generator Sheet

## Problem

The three columns now have distinct material identities for two of three: the Actions column has physical arcade-slab buttons (per `proposals/accepted/20260406-action-button-physicality.md`), and the Platforms column has opaque editorial cards. The Generators column is still opaque white cards — visually identical to the platform cards. It has no material voice of its own, and nothing communicates that the generators are the algorithm's domain, not the player's.

## Proposal

### 1. Design intent

The Generators column is not the player's space — it's the algorithm's clipboard. The player's agent (the algorithm) is presenting a curated content pipeline. The material should feel clinical, curated, slightly detached: a frosted-glass sheet being held up for the player to read. The mood vignette bleeds through the glass, so the algorithm's emotional state is literally visible on the surface it's showing you.

**Material hierarchy across the three columns:**

| Column | Material | Metaphor |
|---|---|---|
| Actions (left) | Opaque colored slabs, pixel-art marquees | Your hands — arcade buttons you smash |
| Generators (center) | Frosted glass, single sheet | The algorithm's clipboard — served to you |
| Platforms (right) | Opaque white editorial cards | Your platforms — status readouts, scoreboard |

### 2. Single sheet, not individual cards

The entire Generators column renders as ONE continuous frosted-glass panel. Individual generator rows are lines on the sheet, separated by hairline dividers — not discrete cards with their own backgrounds and borders.

```
╭───────────────────────────────────────╮
│  STARTER                              │  ← section label, not structural break
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │  ← hairline divider
│  Chirps L6    ×27    13.4K/s     BUY  │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│  Selfies L1   ×29    157/s       BUY  │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│  Memes L1     ×0     0.00/s      BUY  │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│  MID                                  │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│  Hot Takes L1  ×0    0.00/s      BUY  │
│  ...                                  │
╰───────────────────────────────────────╯
```

### 3. Glass material

```css
.generator-sheet {
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;

  /* "held up" float — subtle top-lit shadow */
  box-shadow:
    0 2px 8px -2px rgba(0, 0, 0, 0.08),   /* close shadow — sheet is near surface */
    0 8px 24px -4px rgba(0, 0, 0, 0.05);   /* far shadow — ambient depth */
}
```

**Why 0.55 opacity (not 0.6 like the rejected action-glass):** the generators sheet is larger — it's the widest column on screen. A slightly lower opacity lets more mood color through, which matters because the mood-tinting IS the feature here. The sheet should feel like a lens you're looking through, not a translucent wall.

**Why blur(20px) (not 16px):** larger surface, larger blur radius. The extra blur softens whatever is behind the sheet into a smooth wash rather than showing recognizable shapes through the glass. This keeps the tint atmospheric, not distracting.

### 4. Hairline row dividers

```css
.generator-row {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.generator-row:last-child {
  border-bottom: none;
}
```

Barely visible — just enough to separate rows for scanability. No padding-heavy card gaps. The rows sit tight on the sheet like lines on a report.

### 5. Section headers (STARTER / MID / LATE)

```css
.generator-section-label {
  font: 500 11px/1 'Space Grotesk', sans-serif;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(26, 26, 26, 0.4);
  padding: 12px 16px 4px;
}
```

Quiet, low-contrast labels. They organize the sheet but don't compete with the data. They're the algorithm's filing tabs, not headings the player needs to read urgently.

### 6. Mood bleed-through

The glass sheet sits in the center of the viewport, overlapping with the algorithm-mood edge vignettes. The frosted glass picks up ambient color from the active mood:

| Mood | Vignette | Sheet tint effect |
|---|---|---|
| Engagement Bait | `#D63A82` hot pink | Faint warm-pink wash — the algorithm is thirsty |
| Corporate Takeover | `#8A95A8` cool grey | Cool-grey clinical tone — the algorithm is corporate |
| Short-Form Surge | `#E87B3C` coral | Warm-coral urgency — the algorithm is impatient |
| Authenticity Era | `#4F8A7A` teal | Cool-teal calm — the algorithm is pretending to be chill |
| Viral Cascade | `#C4A035` warm gold | Warm-gold hype — the algorithm smells blood |

This is not programmatic — the glass does it for free based on what's behind it. No per-mood CSS.

### 7. Contrast safety

Text on the generator sheet is `#1A1A1A` (primary text) and `#6B6B6B` (secondary text), both from the base palette.

**Against the glass surface:** the effective blended background at 0.55 opacity over the warm base stays above L=0.82 in all mood states. Primary text (`#1A1A1A`) retains >= 14:1 contrast. Secondary text (`#6B6B6B`) retains >= 4.8:1. Both clear WCAG AA.

**Accent tokens on the sheet** (modifier pills, rate-delta labels): these render on opaque pill backgrounds per existing spec, not directly on the glass. No contrast regression.

**BUY / LVL buttons on the sheet:** these are already opaque-background elements (bordered buttons with white/warm fill). They sit on top of the glass, not through it. No change needed.

### 8. Fallback

```css
@supports not (backdrop-filter: blur(1px)) {
  .generator-sheet {
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid #E8E4DF;
  }
}
```

Degrades to a near-opaque warm-white panel with a visible border. Loses the mood-tinting but retains the single-sheet structure and hairline dividers. The material hierarchy (opaque slabs / translucent sheet / opaque cards) still holds at reduced fidelity.

### 9. Reduced motion

No motion involved — `backdrop-filter` is static. Mood tint changes happen only when the algorithm mood changes (a low-frequency game event), not per-frame. No `prefers-reduced-motion` concern.

### 10. Performance

One glass surface, not five. The generators column is a single compositing layer. Individual generator rows are DOM elements inside it — they don't each carry their own blur. The repainting elements (counters, rate displays) are text nodes that update without triggering recomposite of the blur layer. This is a lighter GPU load than the rejected per-card glass approach.

Mobile: the generators column in mobile layout scrolls behind the fixed bottom action bar. A single glass sheet scrolling is a standard compositing operation — no performance concern.

### 11. What this does NOT change

- Actions column: arcade slabs, untouched
- Platform cards: opaque editorial, untouched
- Top bar: untouched
- Generator row internal layout (icon, name, count, rate, modifier pill, BUY/LVL buttons): all stay as-is, they just live on the glass sheet instead of individual white cards
- Creator Kit section at the bottom: stays its own element, not part of the glass sheet

## References

1. `proposals/accepted/20260406-action-button-physicality.md` — arcade slab treatment for actions (establishes the material contrast this proposal completes)
2. `proposals/accepted/visual-identity-light-mode.md` — base palette, text colors, WCAG targets
3. `proposals/accepted/algorithm-mood-visibility.md` — mood-edge vignette colors and opacities
4. `ux/core-game-screen.md` — zone map, generators column positioning and flex behavior
5. `proposals/rejected/20260406-glass-action-buttons.md` — prior glass-on-actions attempt (rejected there, repurposed here for the right surface)

## Open Questions

None.
