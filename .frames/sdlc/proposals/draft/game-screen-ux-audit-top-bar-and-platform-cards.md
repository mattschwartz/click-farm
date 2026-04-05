---
name: Game Screen UX Audit — Top Bar, Platform Cards, Post Column
description: Fix title/number collision, eliminate raw-digit bleed-through on platform cards, restore clout/follower parity, and resolve dead space in the Post column.
author: ux-designer
status: draft
reviewers: [game-designer, engineer]
---

# Proposal: Game Screen UX Audit — Top Bar, Platform Cards, Post Column

## Problem

A visual review of the current Core Game Screen (captured 2026-04-05) surfaced nine UX issues, four of which are trust-damaging or read as rendering bugs. The screen is the primary surface the player looks at for the entire session — its hierarchy and legibility set the floor for everything else.

Observed issues, ordered by severity:

### Critical — reads as broken

1. **Title collision in top-left.** The mood header (`Short-Form Surge` / `Electric, impatient.`) shares a top edge with the giant clout total (`147.99Sx`). The number overlays the title at the same y-coordinate. First impression is a layout bug.

2. **Raw digit strings bleeding through platform cards.** Each platform card (Chirper, InstaSham, Grindset) renders a long unformatted number at low opacity behind the abbreviated value — e.g. `7768210429147770900`, `13158086066215868000/0/s`. These look like debug output and destroy number trust. Players cannot tell which number is authoritative.

### High — hierarchy

3. **Clout vs. Followers parity is off.** `147.99Sx` dominates at ~48px; `FOLLOWERS 17.89Sx` is tucked in the top-right at roughly 40% the visual weight. If followers is a peer currency (per `clout-to-follower-scaling-curve.md`), the treatment implies otherwise.

4. **`+339.59Qi/sec` rate is floating.** The per-second rate sits below the clout total with loose alignment and no anchor. This is the main trust signal for "the economy is alive" and it reads as an afterthought.

### Medium — density & dead space

5. **Post column has too much air.** The left panel is tall and dark with a small centered "Post" button and a per-click line. The aspect ratio promises a richer tap surface than it delivers.

6. **STARTER / MID / LATE tier labels are nearly invisible.** Thin gray all-caps at low contrast. They do real structural work (they communicate progression shape) but read as decoration.

7. **BUY and LVL↑ buttons look identical.** Same size, border, and label treatment, stacked together. A player mashing through generators will misclick.

### Low

8. **Trend chips (▲×1.06 / ▼×0.96)** — color + arrow is fine for CVD. No change.

9. **Creator Kit row hierarchy is flat.** Name, description, L0→L1, and cost all compete. The cost is where the decision gets made and should read first.

## Proposal

### Critical fixes

**Fix #1 — Title/clout collision.** The mood header gets its own row above the content grid, or the clout number moves inward with explicit left padding reserved for the header. Target: no overlap, header fully legible at all viewport widths ≥ 1200px. Preferred direction: a dedicated top-bar row with three zones — `[mood header] [clout + rate, centered] [followers]` — at a fixed height (e.g. 72px) with the content grid starting beneath it. This aligns with the existing typography system.

**Fix #2 — Remove raw-digit bleed-through on platform cards.** Cut the low-opacity raw number entirely. If the intent was "show the real underlying value for trust," move it to a tooltip on hover/long-press of the abbreviated value. The card's primary follower count stays as the abbreviated value (`4.16Sx`) at high contrast. Nothing else occupies that layer.

### High-priority fixes

**Fix #3 — Clout/Followers parity.** Pending confirmation from the game-designer (Open Question 1): if followers is a peer currency, size the follower total at the same scale as clout and place them side-by-side, both centered in the top bar. If followers is subordinate, make the subordination deliberate — smaller (e.g. 60% size), labeled, and stacked directly under clout with tight alignment rather than sent to the far corner.

**Fix #4 — Anchor the per-second rate.** Tighten `+339.59Qi/sec` directly under the clout total with identical x-alignment and a 4px gap. Treat the rate as persistent trust signal: same position every frame, no jitter when the number abbreviation shifts (e.g. `Qi → Sx`).

### Medium-priority fixes

**Fix #5 — Post column.** Two viable directions:
- **(A) Shrink to fit:** the column stops being full-height, the generator column expands, and the Post button sits in a compact card at the top-left of the content area.
- **(B) Fill with feedback:** keep the full-height panel and populate it with click feedback — last-gain floaters (+5.30 ghosts rising), a streak ring around the button, and the current target generator's icon as a watermark. This turns the dead space into the core loop's moment-to-moment payoff surface.

I recommend **(B)**. The Post button is the only thing the player actively *does*; it deserves the prime real estate. Dead space here is a missed trust-signal opportunity. Requires game-designer confirmation (Open Question 2).

**Fix #6 — Tier labels.** Raise contrast to at least 3:1 (WCAG 1.4.11 for UI text acting as structural labels). Add a 1px divider line at 15% white opacity running across the generator column at each tier boundary. The labels become structural, not decorative.

**Fix #7 — BUY vs LVL↑ differentiation.** Keep the two-button stack but:
- **BUY** uses the neutral panel style (current treatment).
- **LVL↑** uses an outlined gold treatment (accent-gold border at 60% opacity, gold text) once it is the better value-per-engagement action. When LVL is NOT the better action, it returns to neutral.
This piggybacks on the accepted `lvl-up-button-affordance-states.md` proposal — confirming with engineer whether that affordance is already wired (Open Question 3).

### Low-priority fixes

**Fix #9 — Creator Kit row hierarchy.** Cost label (`500 eng`) becomes the strongest element in the row: larger, at `--text-p0` contrast, right-aligned. Name stays `--text-p1`. Description drops to `--text-p2`. `L0 → L1` recedes to `--text-p3` or moves inline with the cost as a small prefix.

### Out of scope

- No changes to generator icons, color palette, or mood background system.
- No changes to the tap mechanic itself (Fix #5 populates the panel with feedback; it does not change what Post does).
- No changes to the Upgrades / Rebrand buttons in the lower-right.

## References

1. Screenshot: user-provided Core Game Screen capture, 2026-04-05
2. `.frames/sdlc/proposals/accepted/typography-system.md` — type scale and contrast targets
3. `.frames/sdlc/proposals/accepted/visual-identity-light-mode.md` — palette and contrast rules
4. `.frames/sdlc/proposals/accepted/clout-to-follower-scaling-curve.md` — currency relationship
5. `.frames/sdlc/proposals/accepted/lvl-up-button-affordance-states.md` — LVL button states
6. `.frames/sdlc/proposals/accepted/engagement-counter-interpolation.md` — trust signal precedent
7. `client/src/ui/GameScreen.tsx` — current implementation
8. `client/src/ui/GameScreen.css` — current token set

## Open Questions

1. Is followers a peer currency with clout, or subordinate? — owner: game-designer
2. For Fix #5 (Post column), do you want direction (A) shrink-to-fit or (B) fill-with-feedback? — owner: game-designer
3. Is the `lvl-up-button-affordance-states.md` differentiation already wired in code? If not, is the engineer's existing work-in-progress blocking it? — owner: engineer
4. Is the raw-digit string on the platform cards a bug (unformatted value rendered accidentally) or an intentional "real number" display that got implemented loosely? — owner: engineer
