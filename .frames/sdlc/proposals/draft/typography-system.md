---
name: Typography System — Space Grotesk + Fraunces
description: Adopt a two-face typography system (Space Grotesk for UI/data, Fraunces for voice/satirical moments) to replace the current system-ui default.
author: ux-designer
status: draft
reviewers: [architect]
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

---
# Review: game-designer

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

Responding to OQ#4 (the question addressed to this role) and leaving one non-blocking observation.

**OQ#4 — "magazine cover story about your downfall" as the emotional register for scandal moments: yes.**

Scandals are the game's primary loss event. From a systems perspective, loss moments need emotional weight to give the recovery path something to counterbalance — if a scandal ticks by as a number, there is nothing for the bad-change recovery mechanic to feel like a *return from*. A theatrical serif frame slows the player down, marks the loss as an event the world is witnessing, and hands the recovery loop something to redeem. That matches how real influencer downfalls surface in the culture being satirized (tabloid-adjacent, Styles-section, Gawker-era headlines). The pairing supports the fantasy being skewered.

The register constraint is tone: the scandal copy examples ("aged like an egg salad sandwich left in a car") are dry-observational, not melodramatic. Fraunces has to match that — restrained weights, not the expressive extreme. If the type over-performs, it fights the copy instead of carrying it. I trust UX to land the axis settings in downstream spec work; not blocking on that.

I also endorse the *"voice face is earned, not default"* principle on psychological grounds. If Fraunces shows up on every label the serif moment collapses — endowment effect in reverse, the rare thing becomes routine. Reserving it for scandal / prestige / rebrand surfaces is correct.

**Non-blocking observation — brand-marks tension.**

The proposal lists "platform names (Chirper, InstaSham, Grindset as brand-marks)" as a Fraunces surface alongside scandal headers and prestige titles. But platform names appear *constantly* in the UI — generator rows, platform columns, everywhere. If brand-marks are always in Fraunces, they become routine and the serif stops reading as "moment." That contradicts the stated "earned, not default" principle.

Two ways this could resolve (UX's call, not mine):
1. Keep brand-marks in Fraunces because they are *names*, not *moments* — the serif there reads as satirical distance ("this is a fake brand"), not theatrical weight. In that case the principle needs re-wording to distinguish *naming register* from *moment register*.
2. Brand-marks go in Space Grotesk with a custom letterform treatment, and Fraunces is reserved strictly for scandal / prestige / rebrand surfaces.

Flagging for UX to address in the downstream typography spec. Not blocking acceptance of the pairing direction.

**Summary:** Aligned on the two-face system. Space Grotesk for the world, Fraunces for the moments the player is meant to witness. OQ#4 answered affirmatively. Brand-mark usage needs clarifying downstream. Removing myself from reviewers. Architect stays on for webfont loading strategy (OQ#3).
