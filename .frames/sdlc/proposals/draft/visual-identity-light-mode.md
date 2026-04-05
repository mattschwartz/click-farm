---
name: Visual Identity — Light Mode & Color System
description: Establishes the game's base visual mood as clean and airy light mode, with color reserved for algorithm states and peak emotional moments.
author: ux-designer
status: draft
reviewers: []
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
- A subtle background tint (low opacity accent-color layer over `#FAF8F5`) — *deferred to post-v1; see `algorithm-mood-visibility` Phase 2*
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
## Revision: 2026-04-05 — ux-designer

Resolved OQ2 (fixed base vs. shifting base) in favor of **fixed base + shifting accent layer**, matching engineer's recommendation and the parallel resolution on `algorithm-mood-visibility` OQ3. Updated §2 to clarify that the "subtle background tint" is a separate accent-color layer over the fixed base (not a base shift), and annotated it as deferred to post-v1 per `algorithm-mood-visibility` Phase 2. This addresses the clarification flag in the engineer review. ux-designer removed from reviewers — no open questions remain.

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

---
# Review: game-designer

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

OQ3 resolved by user: v1 pivot. Light mode is the launch commitment.

Aligned. The tonal direction was already endorsed in my prior RFC review (see above). With the sequencing question answered, my concern is resolved — I'm removing myself from reviewers.

**Downstream work this triggers (not this proposal's burden, but flagging for coordination):**
1. **`proposals/accepted/algorithm-mood-visibility.md` must be reopened and revised.** Every per-state edge-color value, the Corporate Takeover "darkest" logic, and the panel opacity calibration were derived against a dark base and are no longer authoritative. I'm filing a task for ux-designer to drive this revision.
2. **`ux/core-game-screen.md` §4.2–4.4 likely needs revision too** — mood library, instability motion, shift transitions were all written assuming dark panels. ux-designer to confirm scope during the algorithm-mood-visibility revision.
3. **Engineer's in-flight dark-mode build direction needs to pause** for the affected surfaces until the light-mode mood colors are derived. Engineer should be looped in by ux-designer as part of the revision task.

OQ2 (does the base shift per state) remains open, owned by ux-designer + engineer. It is a tuning question that does not block the direction commitment but needs engineer input before this proposal moves to accepted. Engineer added to reviewers.

---
# Review: engineer

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

**Color architecture — Aligned.** The base palette as CSS custom properties with an algorithm-state class or data attribute on the root element swapping an accent variable set, and peak moment overrides as a timed state layer on top, is a clean and maintainable implementation. No structural concerns. The color-as-state-signal discipline (every color appearance communicates something) is the correct posture for implementation — it means no ad hoc color values anywhere in the codebase, just variable references.

**OQ2 — engineer half answered.** A fixed base with shifting accent layer is straightforward: one variable swap per state transition, predictable, easy to QA. A shifting base is technically just as cheap — one more CSS variable per state — but it adds a design burden: exact per-state base tint values must be specified and must harmonize with each accent without reading as color pollution. Recommendation: **start fixed, retrofit if needed.** The shifting base is a cheap addition post-implementation once the ux-designer has seen the accents in motion and can judge whether immersion needs it. It is not worth blocking the proposal on.

**Clarification needed before build (flagging for ux-designer):** The proposal describes "a subtle background tint (low opacity wash over `#FAF8F5`)" as part of the algorithm state accent layer, while OQ2 asks whether the base itself shifts. These are not the same thing — a low-opacity tint wash and a shifted base value produce different perceptual results and are implemented differently. Before this gets built, the ux-designer should clarify which mechanism is intended. I can implement either; I cannot implement both and call it a spec.

**Viral burst implementation note:** The "full-energy color takeover for 5-10 seconds, then resolves back to current algorithm state" implies a React timer pattern, not pure CSS. The CSS variable approach handles entry and exit transitions cleanly, but the timed resolution back is stateful duration logic. Not a concern — just flagging that the spec is implying a duration-aware state, not a passive style.

**WCAG targets — Aligned.** 4.5:1 for normal text and 3:1 for UI components are correct WCAG 2.1 AA targets and are testable. The specified values (`#1A1A1A` on `#FFFFFF`, `#6B6B6B` on `#FFFFFF`) both pass — no issues there.

**Dark-mode pause acknowledged.** In-flight work on algorithm-mood state surfaces is paused pending the algorithm-mood-visibility revision. I will not build against the dark-mode edge-color values. Waiting for ux-designer to drive that revision per the game-designer's coordination note.

Adding ux-designer to reviewers to close out OQ2 (design-side call on base-shift vs. accent-only, and tint-wash vs. base-shift clarification).

## Open Questions

1. Does the clean, restrained visual base serve the satirical tone the game-designer has in mind, or does it risk reading as too straight-faced? **Owner: game-designer**
   - **[RESOLVED — game-designer, 2026-04-05]** Yes, it serves the tone well. The "design as straight man" posture is exactly right for the satire — Cookie Clicker's deadpan restraint is the correct reference. Absurdity lands harder against a polished, clean surface than against visual chaos. See review for detail.
2. Should the warm base (`#FAF8F5`) shift slightly per algorithm state, or stay fixed while only the accent layer shifts? A shifting base is more immersive but adds implementation complexity. **Owner: ux-designer + engineer**
   - **[RESOLVED — ux-designer, 2026-04-05]** Base stays **fixed** at `#FAF8F5` for v1. Only the accent layer (edge vignette + chrome accents) shifts with algorithm state. Mirrors `algorithm-mood-visibility` OQ3 — same question, same answer, cross-referenced for consistency. Responding to engineer's clarification flag: the §2 "subtle background tint" is a separate accent-color layer laid over the base, **not** a shift of the base value itself. These are distinct mechanisms. For v1, that tint layer is deferred to Phase 2 per `algorithm-mood-visibility` — the §2 body has been updated in this revision to reflect that. Rationale: (a) engineer recommended "start fixed, retrofit if needed" — a shifting base is cheap to add post-ship once accents have been judged in motion; (b) calibration surface stays small — fixing the base lets us tune accent harmony against a single known canvas rather than five; (c) limits v1 color-freedom to edge vignette + chrome, reducing color-pollution risk.
3. ~~**[NEW]** This proposal reverses the dark-mode direction already shipped in `proposals/accepted/algorithm-mood-visibility.md` — is this a v1 pivot (blocks/revises in-flight work) or a v2 redesign (ships after current dark-mode build lands)? See game-designer review for full impact analysis. **Owner: user + ux-designer**~~ **[RESOLVED — user, 2026-04-05]** (a) v1 pivot. Light mode is the commitment for launch. `algorithm-mood-visibility` is to be reopened and re-derived against the warm near-white base; dark-mode edge colors are no longer authoritative. A follow-up task is filed for ux-designer to revise that proposal.
