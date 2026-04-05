---
name: Typography System — Space Grotesk + Fraunces
description: Adopt a two-face typography system (Space Grotesk for UI/data, Fraunces for voice/satirical moments) to replace the current system-ui default.
author: ux-designer
status: draft
reviewers: [game-designer, architect]
---

# Proposal: Typography System — Space Grotesk + Fraunces

## Problem

The game currently renders entirely in `system-ui, sans-serif`. This is the default you get when no typography decision has been made — not a decision. Every CSS reference in the client (`index.css`, `GameScreen.css`, `DebugApp.tsx`) falls through to OS chrome faces: San Francisco on Mac, Segoe UI on Windows, Roboto on Android.

All three are neutral UI workhorses tuned for OS interfaces. In a dark-mode, number-dense game about social media satire, they produce a SaaS-admin-dashboard reading. The satirical copy (*"Your take did not age well. It aged like an egg salad sandwich left in a car."*) is doing all the voice work while the typeface is actively contradicting it. The player sees a settings panel when they should see a magazine cover story about their own downfall.

The existing `ux/visual-identity.md` spec covers platforms, generators, scandals, colors, icons, and CVD — but has zero typography section. This is a missing foundational layer in the visual system.

## Proposal

**Adopt a two-face typography system:**

### UI face: Space Grotesk

Used for: data values, numerals, buttons, chrome, generator rows, modifier chips, rate displays, follower counts, every surface where legibility under time pressure is the primary job.

**Why Space Grotesk over Inter or Plex:** Inter is the safe neutral — and we have already shipped with neutral via system-ui. Plex Sans is warmer but still reads product-y. Space Grotesk has baked-in personality (slightly geometric, slightly self-aware) while remaining a competent UI face. It says "this is a tech publication that knows what it's doing" rather than "this is a settings screen."

### Voice face: Fraunces

Used for: platform names (Chirper, InstaSham, Grindset as brand-marks), scandal headers, the satirical framing text on scandal cards, prestige/rebrand screen titles, and moments the player is meant to *witness* rather than operate.

**Why Fraunces:** It's a variable serif with expressive range — it can sit restrained for a platform name and turn up for a scandal header. This gives us one voice face that can modulate rather than requiring multiple display cuts.

### Design principle: voice face is earned, not default

Fraunces appears only at moments that deserve theatrical weight. If we reach for it on every label, it stops meaning anything and the game reads like a magazine instead of a phone. The rule: Space Grotesk is the world; Fraunces is the moments inside the world that are about *you*.

### Known risks (accepted with this direction)

1. **Space Grotesk numeral performance at small sizes.** Needs verification at 12–14px in dense data grids. Tabular numerals support must be confirmed before final weight selection. If it fails, we fall back to Space Grotesk for chrome and Inter for pure numeric columns.
2. **Fraunces overreach.** Expressive typefaces can fight the satire instead of carrying it. The spec (follow-up work) must define exactly which surfaces get Fraunces and which stay in Space Grotesk.
3. **Bundle / loading cost.** Two webfonts (plus weights) add network + render cost. Architect needs to weigh in on loading strategy (FOUT vs FOIT, subsetting, variable font usage).

### What this proposal does NOT decide

- Exact weight map per UI context (headings, body, small, numerals) — that is a typography spec, downstream
- Fallback stack composition
- Font loading strategy (self-hosted vs Google Fonts CDN, preload, font-display)
- Whether Fraunces reaches into tutorial copy, brand deal cards, or settings text
- Light-mode typography behavior (depends on `visual-identity-light-mode.md` resolution)

These are follow-up work once the pairing is ratified.

## References

1. `ux/visual-identity.md` — the existing visual system spec this extends (no current typography section)
2. `client/src/index.css` — current font-family declarations
3. `client/src/ui/GameScreen.css` — current font-family declarations
4. `proposals/draft/visual-identity-light-mode.md` — pending decision that affects typography color/contrast pairing
5. Space Grotesk: https://fonts.google.com/specimen/Space+Grotesk (OFL, free)
6. Fraunces: https://fonts.google.com/specimen/Fraunces (OFL, free, variable font)

## Open Questions

1. **How far does Fraunces reach?** (owner: ux-designer, downstream spec work)
   - Obvious: scandal headers, satirical framing text, platform brand-marks
   - Ambiguous: brand deal cards, prestige screen titles, settings screen headers, tutorial copy
2. **Does Space Grotesk hold at 12–14px in dense number grids?** (owner: ux-designer + engineer, verification step)
   - Requires on-device testing with real game data in the actual GameScreen layout
3. **Webfont loading strategy.** (owner: architect)
   - Self-host vs CDN, variable font vs static cuts, font-display value, preload priority
4. **Does the game-designer agree that "magazine cover story about your downfall" is the right emotional register for scandal moments?** (owner: game-designer)
   - This is the core premise of choosing Fraunces. If the satirical tone should feel drier/more deadpan, Option B (single-face IBM Plex system) becomes the better answer and this proposal should be rejected in favor of a re-draft.
