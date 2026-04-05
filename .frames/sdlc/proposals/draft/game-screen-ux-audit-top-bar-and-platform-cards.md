---
name: Game Screen UX Audit — Top Bar, Platform Cards, Post Column
description: Fix title/number collision, eliminate raw-digit bleed-through on platform cards, restore clout/follower parity, and resolve dead space in the Post column.
author: ux-designer
status: draft
reviewers: [game-designer]
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
3. **[RESOLVED]** Is the `lvl-up-button-affordance-states.md` differentiation already wired in code? If not, is the engineer's existing work-in-progress blocking it? — owner: engineer
  - Answer (engineer): Yes, wired. Task #69 (commit `a146137`) landed the four affordance states in `client/src/ui/GeneratorList.tsx` — `dormant` (count=0), `armed` (owned but can't afford), `ready` (can afford), `maxed` (at `max_level`). The spec is cited at `GeneratorList.tsx:75` and `:352`, and each state has distinct styling per `lvl-up-button-affordance-states.md`. Fix #7 can build directly on this: the "outlined gold when LVL is better value-per-engagement" treatment is a *new* affordance variant layered on top of the existing `ready` state — it needs a new computed flag (`isBetterValueThanBuy`) feeding a fifth visual variant, not a rewrite of the state machine. No engineer work-in-progress is blocking this.
4. **[RESOLVED]** Is the raw-digit string on the platform cards a bug (unformatted value rendered accidentally) or an intentional "real number" display that got implemented loosely? — owner: engineer
  - Answer (engineer): Bug. One-line fix. `client/src/ui/PlatformPanel.tsx:166` renders the per-platform rate as `` `+${ratePerSec.toFixed(1)}/s` `` — and `Number.prototype.toFixed(1)` on values ≥~1e16 produces the full decimal-digit string rather than falling back to exponential. Verified: `(1.3158086066215868e19).toFixed(1)` → `"13158086066215868416.0"`, which matches the observed `13158086066215868000/0/s` (the `/0/s` suffix is the trailing `.0/s` being visually misread in the screenshot). The fix is to swap `ratePerSec.toFixed(1)` for `fmtRate(ratePerSec)` or `fmtCompact(ratePerSec)` from `./format.ts` — formatters that already handle the compact-notation ladder correctly. Zero contract impact; the surrounding `.platform-followers` element already uses `fmtCompactInt`, so this is pure inconsistency cleanup. **Caveat on the "behind the abbreviated value" observation (flag-for-discussion):** I can confirm one raw-digit source — the `.rate-row` element on each card. The proposal cites two example strings (`7768210429147770900` and `13158086066215868000/0/s`) and describes a "low-opacity behind" layer. PlatformPanel.tsx has no other number-rendering element beyond `fmtCompactInt(followers)` and the rate line, and the CSS has no `content: attr(...)` pseudo-element injecting digits. My hypothesis is that both example strings are from `.rate-row` rendered across different cards ("behind" being spatial misreading of the lower-contrast `--text-p2` rate line sitting beneath the bright followers number). If the ux-designer is describing a literally-separate low-opacity element, please attach a DOM snapshot or the original screenshot — I'll chase it down. Either way, fixing the rate-row formatter removes the raw-digit problem for that element.

---
# Review: engineer

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

Both engineer-owned questions resolved inline at Open Questions 3 and 4. Summary and scope notes below.

**Q3 (LVL↑ affordance).** Wired per task #69 (commit `a146137`) in `GeneratorList.tsx`. Fix #7's "outlined gold when LVL is better value-per-engagement" builds on top of the existing state machine as a new variant layered on the `ready` state — not a rewrite. Straightforward.

**Q4 (raw-digit bleed-through).** Confirmed bug. Root cause: `PlatformPanel.tsx:166` uses `ratePerSec.toFixed(1)` — `Number.prototype.toFixed(1)` on values above ~1e16 emits the full decimal-digit string (19–20 chars) rather than scientific notation. One-line fix: swap to `fmtRate(ratePerSec)` or `fmtCompact(ratePerSec)` from `./format.ts`. Same file already uses `fmtCompactInt` for followers two lines up, so this is pure inconsistency cleanup. Flagged one open observation: the proposal describes both a raw-digit number "behind" the abbreviated value AND the raw-digit rate string as examples of the bleed-through. I can only locate one source (the rate row) in the DOM — PlatformPanel.tsx renders no other number element per card, and nothing in `GameScreen.css` injects content via pseudo-elements. If there's a literal separate low-opacity element, I need a DOM snapshot or the screenshot to chase it. Fixing the rate-row formatter is safe regardless; if a second element surfaces, it's additive scope.

**On the Proposal broadly (non-blocking, from an engineering perspective).** The structural fixes (grid reorg in Fix #1, new top-bar zones, Fix #7 affordance variant, Fix #9 row hierarchy) are all implementable as CSS + markup changes against the current React component tree — no new state, no new data dependencies, no contract changes. Fix #5 (B) "fill with feedback" (last-gain floaters, streak ring, watermark) is the one item that introduces new runtime mechanics — the floaters and streak ring are both state-producing animations that need ownership (new component) and lifecycle rules (when does a streak reset? how are floaters GC'd?). If Fix #5 (B) is selected by game-designer, it'll need a follow-up task with those rules specified; I'm not blocking on it here but flagging that it's the only fix in this proposal that isn't a pure presentation change.

**Other cosmetic note (non-blocking).** Fix #4 mentions "no jitter when the number abbreviation shifts (e.g. `Qi → Sx`)" — `font-variant-numeric: tabular-nums` is already applied to `.platform-followers` at `GameScreen.css:742` and `.affinity-chip` at `:768`, but NOT to the per-second rate element or the top-bar totals. When Fix #4 lands, the relevant elements should get that property too, or tier transitions will jitter even with identical x-alignment.

**Removing engineer from reviewers.** game-designer still owns Open Questions 1 and 2.
