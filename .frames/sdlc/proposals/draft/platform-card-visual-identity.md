---
name: Platform Card Visual Identity
description: Gives each platform card a distinct visual personality — shape, color, texture, and motion character — so they read as three different places, not three identical counters.
created: 2026-04-05
author: ux-designer
status: draft
reviewers: [game-designer, engineer]
---

# Proposal: Platform Card Visual Identity

## Problem

The three platform cards (Chirper/Skroll, InstaSham, Grindset) are structurally identical: same border-radius, same white background, same 3px accent top-border, same typography. The only differentiators are the name, icon emoji, and a single `--platform-accent` color. They read as data rows — "metric A, metric B, metric C" — not as three satirical social media platforms with distinct audiences, voices, and personalities.

The game-designer's Platform Identity & Affinity Matrix proposal (`proposals/draft/platform-identity-and-affinity-matrix.md`) defines strong character for each platform:

- **Chirper/Skroll** — chaotic, fast, viral, "confetti"
- **InstaSham** — curated, aesthetic, polished, "a gallery opening"
- **Grindset** — professional, compounding, glacial, "an investment portfolio"

None of that character is expressed visually. The cards need to *look* like different places, not just *say* different names. The game's target feel is arcadey and gamey — these cards should carry some of that character-select-screen energy where each option looks and feels distinct before you read a word.

## Proposal

### Design Principles

1. **Shared information layout, divergent surface treatment.** All three cards keep the same content structure (header → followers + rate → affinity chips). What changes is the card's skin: shape, color palette, texture, border behavior, and ambient motion. This preserves scanability while delivering personality.
2. **Arcadey, not subtle.** The differentiation should be visible at a glance, not discovered through squinting. Bold enough to feel gamey — restrained enough to not fight the information.
3. **Each card evokes its real-world analog without copying it.** The player should feel "oh, this one's the Twitter one" from surface treatment alone.
4. **WCAG compliance is non-negotiable.** All treatments must pass the same contrast standards as the rest of the game (4.5:1 text, 3:1 UI components).

---

### 1. Chirper/Skroll — "The Feed"

**Character:** Fast, chaotic, disposable. Text-first. Doom-scroll energy.

| Property | Treatment |
|---|---|
| **Border-radius** | 4px — sharp, utilitarian, feed-item energy |
| **Border** | 2px left-side accent stripe (`#4a9dd6`), no top-border. Reads as a feed scroll indicator — content flows past this edge. |
| **Background** | `#F4F8FB` — icy blue tint, barely there. Cool and screen-glow-ish. |
| **Header strip** | Platform name + icon sit on a `#E8F1F8` bar (light blue wash) spanning full card width. 28px height. Feels like a tab bar. |
| **Typography accent** | Follower count uses tighter letter-spacing (`-0.02em`). Feels compressed, feed-dense. |
| **Rate indicator motion** | The `▲` arrow has a CSS jitter animation — a 0.5px random-feeling horizontal wiggle on a 3s cycle. Communicates "this number is volatile, things move fast here." |
| **Accent palette** | Primary: `#4a9dd6` (cool blue). Tint: `#F4F8FB`. Header wash: `#E8F1F8`. |

**The feel:** A card ripped from a feed. Sharp, quick, disposable.

---

### 2. InstaSham — "The Grid"

**Character:** Curated, aspirational, polished. Visual-first. Everything is a little too perfect.

| Property | Treatment |
|---|---|
| **Border-radius** | 14px — generous, smooth, app-icon energy |
| **Border** | 1px solid with a subtle gradient border (top-to-bottom: `#d6579e` → `#e8a0c8`). The gradient is the kind of overdesigned touch that parodies Instagram's brand. |
| **Background** | `#FDF6F9` — rosy warm tint. Soft, inviting, a little vain. |
| **Header strip** | No bar — instead, the platform icon sits centered above the name, slightly larger (24px), with a faint circular backdrop (`#F8E8F0`, 32px round). Feels like a profile avatar frame. |
| **Typography accent** | Platform name uses 500 italic. A small thing, but italic on a name reads as "brand voice" — editorial, magazine-cover. |
| **Inner shadow** | `inset 0 2px 8px rgba(214, 87, 158, 0.06)` — a barely-visible pink inner glow that gives the card a sense of depth, like a polaroid or a phone screen. |
| **Rate indicator motion** | Smooth — the rate number transitions value changes with a 400ms ease-out rather than snapping. "Everything here is graceful." |
| **Accent palette** | Primary: `#d6579e` (pink-mauve). Gradient end: `#e8a0c8`. Tint: `#FDF6F9`. Halo: `#F8E8F0`. |

**The feel:** A card that looks like it was designed by someone who cares too much about how things look. The satire is in the polish.

---

### 3. Grindset — "The Dashboard"

**Character:** Professional, authoritative, no-nonsense. Data-first. Everything earns its place.

| Property | Treatment |
|---|---|
| **Border-radius** | 2px — squared off, corporate, dashboard-widget energy |
| **Border** | 1px solid `#c8d6ce` (muted sage border, heavier than default). A contained, boxed-in feel. |
| **Background** | `#F6FAF8` — cool sage tint. Clean, professional, a little cold. |
| **Header strip** | Platform name sits in ALL-CAPS at 12px weight 600 tracking `0.08em`, with a thin 1px bottom-border divider. Reads like a dashboard section header. Icon sits to the right of the name, smaller (16px), subdued. |
| **Verified badge** | A small `checkmark-circle` glyph (✓ in a 14px circle, `#5eae8f` fill) sits to the right of the platform name. Parodies LinkedIn's "thought leader verified" energy. |
| **Typography accent** | Follower count gets a monospace-ish treatment via `font-variant-numeric: tabular-nums` + weight 700 (heavier than other cards). Reads as a KPI. |
| **Rate indicator motion** | None. The number updates with no animation, no easing. Just snaps. "This is a serious number for serious people." |
| **Accent palette** | Primary: `#5eae8f` (teal-green). Border: `#c8d6ce`. Tint: `#F6FAF8`. |

**The feel:** A card that takes itself very seriously. The satire is in the earnestness.

---

### 4. Shared Structure (What Stays Consistent)

These elements are identical across all three cards to preserve scanability:

| Element | Spec |
|---|---|
| **Card width** | 100% of platform panel column (280px reference) |
| **Padding** | 14px |
| **Follower count** | 24px weight 600 (Grindset bumps to 700), `--text-primary`, tabular-nums |
| **Rate position** | Inline with follower count, right-aligned on same baseline |
| **"followers" sub-label** | 11px, `--text-secondary` |
| **Affinity chips** | Same chip component, same sizing, same glow behavior |
| **Locked state** | Same grayscale + 42% opacity treatment |
| **Unlock animation** | Same grayscale-to-color 600ms transition |
| **Viral illuminate** | Same edge glow treatment (per viral burst spec) |

---

### 5. Expanded Accent Palettes

Each platform moves from a single `--platform-accent` color to a small token set:

```css
/* Chirper/Skroll */
--platform-accent: #4a9dd6;
--platform-tint: #F4F8FB;
--platform-header-wash: #E8F1F8;

/* InstaSham */
--platform-accent: #d6579e;
--platform-accent-soft: #e8a0c8;
--platform-tint: #FDF6F9;
--platform-halo: #F8E8F0;

/* Grindset */
--platform-accent: #5eae8f;
--platform-border: #c8d6ce;
--platform-tint: #F6FAF8;
```

These are set as inline CSS custom properties on each card (extending the existing `--platform-accent` pattern in `PlatformPanel.tsx`).

---

### 6. Contrast Verification

All background tints are near-white. Worst-case text contrast (primary text `#1A1A1A` against tinted bg):

| Tint | Hex | Contrast vs `#1A1A1A` | Pass (4.5:1) |
|---|---|---|---|
| Chirper | `#F4F8FB` | ~16.2:1 | Yes |
| InstaSham | `#FDF6F9` | ~17.1:1 | Yes |
| Grindset | `#F6FAF8` | ~16.6:1 | Yes |

Secondary text (`#6B6B6B`) against tints: all remain above 5.5:1. No contrast regressions.

Gradient border on InstaSham: both endpoints (`#d6579e`, `#e8a0c8`) exceed 3:1 against both the card tint and the warm base `#FAF8F5`, satisfying WCAG 1.4.11 for UI components.

---

### 7. Motion Summary

| Card | Element | Animation | Duration | Communicates |
|---|---|---|---|---|
| Chirper | Rate arrow `▲` | Horizontal jitter (0.5px) | 3s cycle | Volatility, chaos |
| InstaSham | Rate value | Smooth value transition | 400ms ease-out | Grace, polish |
| Grindset | Rate value | No animation, instant snap | 0ms | Seriousness, precision |

Motion is purely cosmetic — no motion carries semantic information. All three cards are fully usable with `prefers-reduced-motion: reduce` (all motion suppressed, rate values snap on all cards).

---

### 8. What This Locks In

- Per-platform border-radius, border treatment, background tint, and header layout
- Per-platform accent palette (3 tokens each, extending the existing single-accent pattern)
- Per-platform motion character on rate indicators
- Grindset verified-badge parody element
- InstaSham gradient-border and inner-shadow treatment
- Chirper left-stripe feed-indicator treatment

### 9. What This Leaves Open

- Platform naming (Chirper vs Skroll) — pending game-designer's Platform Identity proposal
- Platform-specific unlock animations (could each have a themed unlock, but the shared grayscale→color is fine for now)
- Platform-specific sound design (audio is out of scope for this visual spec)
- Mobile layout adaptations for these treatments

## References

1. `proposals/draft/platform-identity-and-affinity-matrix.md` — platform character definitions, voice, mechanical identity
2. `proposals/accepted/visual-identity-light-mode.md` — base palette, color philosophy, WCAG targets
3. `ux/accent-palette-light-mode.md` — functional accent tokens, mood-edge collision analysis
4. `ux/core-game-screen.md` §7 — platform card anatomy, cross-posting flow, locked state
5. `ux/purchase-feedback-and-rate-visibility.md` — rate indicator treatments
6. `client/src/ui/display.ts` — current `PLATFORM_DISPLAY` data structure and accent colors
7. `client/src/ui/PlatformPanel.tsx` — current card implementation
8. `client/src/ui/GameScreen.css` — current card CSS (`.platform-card` rules)

## Open Questions

1. **Should the platform name rename (Chirper → Skroll) land before or alongside this visual work?** The visual identity works with either name. If the game-designer's Platform Identity proposal is accepted first, the rename comes free. If this lands first, we build against "Chirper" and rename is a trivial follow-up. **Owner: game-designer**
2. **Does the InstaSham italic name treatment conflict with any typography system rule?** The typography system proposal (`proposals/accepted/typography-system.md`) specifies Space Grotesk for UI text — italic may not be available or may need Fraunces. Need to verify the font supports italic at weight 500. **Owner: engineer (font check)**
3. **Is the Grindset verified badge glyph (✓) sufficient, or should it be a proper SVG icon?** Emoji checkmarks render inconsistently cross-platform. A small inline SVG would be more reliable. **Owner: engineer (implementation call)**
4. **At what point does per-card motion become distracting at mid-game density?** Chirper's jitter + InstaSham's smooth transitions + generator breathing pulses could add up. The jitter amplitude (0.5px) is designed to be subliminal, but should be validated in-browser with all three cards visible. **Owner: ux-designer (post-build QA)**
