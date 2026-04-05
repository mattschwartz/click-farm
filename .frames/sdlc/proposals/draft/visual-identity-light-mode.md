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

## Open Questions

1. Does the clean, restrained visual base serve the satirical tone the game-designer has in mind, or does it risk reading as too straight-faced? **Owner: game-designer**
2. Should the warm base (`#FAF8F5`) shift slightly per algorithm state, or stay fixed while only the accent layer shifts? A shifting base is more immersive but adds implementation complexity. **Owner: ux-designer + engineer**
