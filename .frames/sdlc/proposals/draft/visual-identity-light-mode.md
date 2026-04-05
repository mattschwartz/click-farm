---
name: Visual Identity — Light Mode & Color System
description: Establishes the game's base visual mood as clean and airy light mode, with color reserved for algorithm states and peak emotional moments.
author: ux-designer
status: draft
reviewers: [game-designer]
---

# Proposal: Visual Identity — Light Mode & Color System

## Problem

The game currently has no committed visual identity. The default direction — generic dark mode with a single accent color — reads as productivity software or a developer tool. It has no relationship to the satirical social media theme and actively works against the tone the game-designer established in the Core Game Identity proposal: affectionate satire, escalating absurdity, Cookie Clicker deadpan applied to social media.

The visual surface is the first thing the player sees. If it reads "SaaS dashboard," the satirical content underneath has to fight the frame instead of being delivered by it.

## Proposal

### 1. Base Palette — Clean and Airy

The game uses a **light mode base** with a warm near-white foundation:

- **Background:** `#FAF8F5` — slightly warm, not clinical pure white. Reads editorial and approachable rather than sterile.
- **Surface (cards, panels):** `#FFFFFF` — pure white for contained elements, giving them lift against the warm base.
- **Primary text:** `#1A1A1A` — near-black, not pure black. Softer, more readable at density.
- **Secondary text:** `#6B6B6B` — receded labels, metadata, inactive states.
- **Borders / dividers:** `#E8E4DF` — warm light gray, present but not assertive.

The base is intentionally restrained. The design doesn't compete with the content. The absurdity of "AI Slop Generator — 847K engagements/sec" lands harder against a clean, polished surface than against visual chaos.

### 2. Color Lives in Two Places Only

**Algorithm states** are the primary source of color in the interface. Each state brings an accent color world — a named hue that appears in:
- UI chrome (top bar, active indicators)
- Generator highlight borders
- A subtle background tint (low opacity wash over `#FAF8F5`)
- The algorithm state nameplate and iconography

The base never changes. The accent layer shifts with the algorithm. This gives the game a living color story without sacrificing readability.

Example state palette directions (final names and values owned by the algorithm-mood-visibility proposal):
- Short-Form Surge → energetic coral/orange
- Thought Leadership Cycle → cool authoritative blue
- Authenticity Wave → warm sage green
- Engagement Bait Season → hot pink / magenta

**Peak emotional moments** are the second place color breaks out:
- Viral burst — full-energy color takeover for its 5-10 second duration, then resolves back to current algorithm state
- Scandal events — desaturated, cooler tone shift to signal negative state
- Rebrand ceremony (prestige) — a full palette reset sequence; the screen transitions to white-out before the new run's algorithm state loads in

Everything else stays in the warm neutral base. The hierarchy is: base → algorithm state accent → peak moment override.

### 3. Typography & Data Display

- **Font weight:** minimum 500 (medium) for all data values. No light-weight fonts for numbers — legibility under time pressure requires weight.
- **Number display:** dark gray (`#1A1A1A`) on white surface. Maximum contrast for the engagement counter and follower counts that the player trusts most.
- **Contrast compliance:** all text meets WCAG 2.1 AA (4.5:1 for normal text). UI components (borders, icons, inputs) meet 3:1 (WCAG 1.4.11).

### 4. What This Locks In

- Light mode as the game's visual foundation — not a theme option, the default and only shipped mode
- Warm near-white as the base, not neutral gray or pure white
- Color as a system-state signal, not decoration — every color appearance in the UI communicates something
- The satirical tone is delivered through content, not visual chaos — the design is the straight man

### 5. What This Leaves Open

- Exact algorithm state palette assignments (owned by the algorithm-mood-visibility proposal)
- Typography family — typeface selection is a downstream decision
- Icon style and visual language for generators
- Motion behavior — covered in separate motion briefs

## References

1. `.frames/sdlc/proposals/accepted/core-game-identity-and-loop.md` — establishes tone (satirical comedy, Cookie Clicker deadpan), and the algorithm state visualization requirement
2. `.frames/sdlc/proposals/draft/algorithm-mood-visibility.md` — algorithm state color assignments will extend this base palette
3. Cookie Clicker (Orteil, 2013) — reference for deadpan visual restraint amplifying absurd content
4. Linear.app — reference for clean, airy light mode in an information-dense interface (structural reference only, not aesthetic)

---
# Review: game-designer

**Date**: 2026-04-05
**Decision**: Request for Comment

**Comments**

**Tonal direction — Aligned.** The "design as straight man" posture is correct for the satire. The core-identity proposal names Cookie Clicker as the primary genre reference, and Cookie Clicker's visual restraint is exactly what lets its absurd content (Grandmapocalypse, Sugar Lumps, eldritch prisms) land. Click Farm's joke — "the content never mattered, the algorithm did" — is funnier on a clean corporate-wellness surface than against a moody neon dashboard. A satirical clicker should look like the thing it is satirizing (polished influencer aesthetic, editorial cleanliness) so the numbers underneath feel absurd against their frame.

Answering OQ1 directly: yes, the restrained base serves the tone. It does not risk reading "too straight-faced" — the straight face *is* the joke delivery mechanism. The amused-not-cynical register the core-identity proposal commits to (see Core Game Identity §1 Tone) requires the design to be the straight man and the content to be the comedian. Dark mode would tilt toward "cynical" — gritty, edgy, self-serious. Light mode stays "affectionate" — the content is absurd *to* a straight setting, not *of a piece with* it. That's the correct relationship.

One tonal note to carry into the algorithm-state palette work (which this proposal correctly defers to `algorithm-mood-visibility`): the state accents should lean "magazine editorial" not "designer tool." Short-Form Surge as "energetic coral" is right; Engagement Bait Season as "hot pink / magenta" is right. Keep them saturated enough to read as *moods*, not as brand chrome. The base restraint earns you color intensity in the accents.

**Structural conflict — not aligned on shipping as written.** This is why my decision is Request for Comment rather than Aligned.

The accepted `proposals/accepted/algorithm-mood-visibility.md` is built against dark mode — it specifies dark mood edge vignettes (`#c45a10` 30% opacity, `#5a2080` 28% opacity, etc.) against `#0b0d12` base with `rgba(18, 21, 28, 0.82)` panels. The engineer is mid-flight on this direction. `corporate_takeover` is explicitly designed as "cool grey, barely-there at the periphery" — a mood signature that relies on the dark base for meaning.

Adopting this proposal invalidates:
- Every per-state edge-color value in `algorithm-mood-visibility`
- The "Corporate Takeover = darkest / most muted" design logic (on light base, that state would invert to a cool pale wash, not darker)
- Panel opacity calibration (`--panel-bg: rgba(18, 21, 28, 0.82)` is dark-mode opacity)
- Likely pieces of `ux/core-game-screen.md` §4.2–4.4

This proposal's "What This Locks In" section does not name this conflict. That's a significant omission — adopting it as written would strand an accepted proposal and in-flight engineer work without anyone formally reopening it.

**What I think should happen next:**

The user and ux-designer should decide whether this is:
- **(a) A v1 pivot** — light mode is the right bet and we're committing to it before ship. Then `algorithm-mood-visibility` needs to be reopened, its mood colors re-derived for a light base, and panel opacity rethought. The engineer's in-flight dark-mode work pauses.
- **(b) A v2 redesign** — dark mode ships as currently built, light mode becomes a post-launch repaint. Then this proposal gets a status flag ("deferred to v2") and sits until then.
- **(c) Rejected** — dark mode is correct and this proposal is withdrawn.

I lean toward (a) on pure aesthetic merit, but that's a ux-designer/user call, not mine. The tone direction is right either way; the conflict is about *when*.

This proposal should resolve the new OQ3 (added above) before moving forward. I'm staying on reviewers until that question is answered.

## Open Questions

1. Does the clean, restrained visual base serve the satirical tone the game-designer has in mind, or does it risk reading as too straight-faced? **Owner: game-designer**
   - **[RESOLVED — game-designer, 2026-04-05]** Yes, it serves the tone well. The "design as straight man" posture is exactly right for the satire — Cookie Clicker's deadpan restraint is the correct reference. Absurdity lands harder against a polished, clean surface than against visual chaos. See review for detail.
2. Should the warm base (`#FAF8F5`) shift slightly per algorithm state, or stay fixed while only the accent layer shifts? A shifting base is more immersive but adds implementation complexity. **Owner: ux-designer + engineer**
3. **[NEW]** This proposal reverses the dark-mode direction already shipped in `proposals/accepted/algorithm-mood-visibility.md` — is this a v1 pivot (blocks/revises in-flight work) or a v2 redesign (ships after current dark-mode build lands)? See game-designer review for full impact analysis. **Owner: user + ux-designer**
