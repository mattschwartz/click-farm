---
name: Three-Track Purchase Row Layout — Compact Inline Pills
description: LVL UP, BUY, and Autoclicker purchase controls render as compact inline pill buttons within each generator row, grouped by verb.
created: 2026-04-06
author: ux-designer
status: accepted
reviewers: []
---

# Proposal: Three-Track Purchase Row Layout — Compact Inline Pills

## Problem

The purchase-button-location proposal (`proposals/accepted/20260406-purchase-button-location.md`) decided that all three purchase tracks (LVL UP, BUY, Autoclicker) live in the Generators center column. It explicitly left open the layout format (compact inline vs. expandable tray vs. dedicated sub-rows) and grouping (by verb vs. by track type).

Three options were considered:

- **(A) Compact inline** — three pill buttons appended to each generator row. All controls visible at once. No tap-to-reveal.
- **(B) Expandable tray** — generator row stays clean; tapping it reveals a stacked tray of three purchase tracks beneath. Clean when collapsed, but hides affordances behind a tap.
- **(C) Dedicated sub-rows** — three always-visible sub-rows beneath each verb's info row. Full visibility, but at 5 verbs = 20 rows — overwhelms the strategic surface.

## Proposal

**Option A: compact inline pills, grouped by verb.**

Each generator row gains three small pill buttons after the existing rate + modifier chip zone. All purchase affordances are visible at a glance — no expanding, no hidden state. This is the least disruptive change to the current generator row anatomy and avoids introducing a new interaction pattern (expand/collapse) into the strategic ledger.

### 1. Row anatomy (updated)

The existing generator row anatomy from `ux/core-game-screen.md` §6.2 extends to:

```
┌────────────────────────────────────────────────────────────────────┐
│ [badge] Icon  Name       ×N  +18/s  [×1.8▲]   [LVL] [BUY] [AUTO] │
│         32px  wt 500     ct  rate   chip        pill   pill  pill  │
└────────────────────────────────────────────────────────────────────┘
```

- **Existing elements** (badge, icon, name, count, rate, modifier chip) are unchanged.
- **Three pills** are right-aligned, in fixed order: LVL, BUY, AUTO.
- Fixed order means the player builds muscle memory for pill position regardless of which verb row they're in.

### 2. Pill anatomy

Each pill is a compact rounded button:

- **Size:** min-width 44px, height 28px. Meets WCAG 2.5.8 target size (44×44 logical — the row itself provides vertical padding to reach the 44px touch target).
- **Border-radius:** 14px (fully rounded ends).
- **Typography:** 11px, weight 600 (Space Grotesk), uppercase label. "LVL" / "BUY" / "AUTO".
- **Spacing:** 6px gap between pills.

### 3. Grouping rationale

**By verb, not by track type.** The player's mental model is "I want to invest in Chirps" — they scan to the Chirps row and see all three options. Grouping all LVL UPs together would serve cross-verb comparison, but that's an expert action the player rarely performs. The common action is per-verb investment, and the layout should serve the common action.

### 4. Affordance states

Each pill has one of three visual states:

#### Affordable (tappable)

- **Background:** verb's color lane at 15% opacity (tinted, warm, inviting).
- **Text:** verb's color lane at full saturation, weight 600.
- **Border:** 1px solid, verb's color lane at 30% opacity.
- **Cursor:** pointer.
- **On tap:** purchase fires immediately (no confirmation drawer). Cost is deducted, feedback chain plays (rate-flare for BUY per `ux/purchase-feedback-and-rate-visibility.md` §5, cooldown speed change for LVL UP, badge appear/increment for AUTO per `ux/manual-action-ladder.md` §4.4).
- **Cost display:** on hover (desktop) or long-press (mobile), a ghost label appears above the pill showing the cost in compact notation. This keeps the row clean at rest while making cost discoverable.

#### Unaffordable (visible, not tappable)

- **Background:** transparent.
- **Text:** `--text-muted` token (warm grey, ~4:1 contrast against row background).
- **Border:** 1px solid, `--border-muted` at 20% opacity.
- **Cursor:** default (no pointer).
- **On tap:** no-op. No feedback — the recessed visual tells the player this isn't available.
- **Cost display:** same hover/long-press ghost label, but cost text renders in `--text-muted` to reinforce "not yet."

#### Maxed (completed, non-actionable)

Applies to LVL UP at `max_level` and Autoclicker if a cap is introduced.

- **Background:** `--accent-platinum` at 12% opacity (cool grey, distinct from the warm affordable tint).
- **Text:** `--accent-platinum` at full value, weight 600. Label changes to "MAX".
- **Border:** 1px solid, `--accent-platinum` at 25% opacity.
- **Inset shadow:** subtle `inset 0 1px 2px rgba(0,0,0,0.06)` — the pill looks slightly recessed, matching the existing LVL UP maxed plaque treatment from `ux/generator-max-level-state.md` §2.
- **Shine sweep:** the pill participates in the existing `@keyframes lvl-maxed-shine` — 7s cycle, ~420ms sweep, synced with all other maxed elements on screen. The pill catches the light occasionally, reading as a trophy. Same `::before` pseudo-element technique as the LVL UP maxed plaque.
- **Reduced motion:** shine sweep disabled, static platinum pill remains.

### 5. Passive-only generator rows

Passive-only generators (memes, hot_takes, tutorials) have `manual_clickable: false` — no action button, no manual cooldown, no autoclicker. Their pill set reduces to `[BUY]` only. LVL and AUTO pills are omitted entirely (not shown as disabled or maxed).

```
┌────────────────────────────────────────────────────────────────────┐
│ [badge] Icon  Name       ×N  +18/s  [×1.8▲]                [BUY] │
│         32px  wt 500     ct  rate   chip                    pill  │
└────────────────────────────────────────────────────────────────────┘
```

The single BUY pill right-aligns to the same edge as the rightmost pill (AUTO) in a three-pill verb row. This preserves vertical scanning — the player's eye finds "the purchase zone" on the right edge regardless of pill count.

### 6. Density at 5 verbs

At 5 live verbs, the column has 5 rows each with 7 inline data points (badge, name, count, rate, chip, 3 pills). This is dense. Mitigations:

- **Pills are visually recessed when unaffordable** — they fade into the row rather than competing with the verb identity elements (badge, name, rate). The row still reads as a ledger entry, not a control panel.
- **Fixed pill order + consistent sizing** builds a vertical rhythm — the three pills form a visual column on the right edge that the eye can scan quickly.
- **The modifier chip and pills are separated by at least 12px gap** to prevent the row's info zone from bleeding into the control zone.

This is a known density tradeoff. The layout holds at 5 verbs on desktop. If a future overhaul introduces more per-row information, the inline approach may need to give way to an expandable tray — but that's a bridge to cross when we get there.

### 7. Mobile adaptation

On mobile, the Generators column renders as a full-width scrollable list (per `ux/mobile-layout.md`). The three pills remain inline but benefit from the wider row:

- Pills maintain 44px min-width and 28px height.
- On narrow viewports (< 360px logical width), pill labels abbreviate to single-letter: "L" / "B" / "A". The fixed position (leftmost = level, middle = buy, rightmost = auto) carries meaning even without the full label.
- Cost ghost label renders above the pill (same as desktop hover) on long-press. No hover state on mobile.
- Touch targets: the row itself is 56px+ tall, and the pills sit within that — 28px pill height + row padding clears the 44px touch target minimum.

### 8. What this locks in

- Three inline pill buttons per generator row, right-aligned, in LVL / BUY / AUTO order.
- Grouped by verb — each generator row contains its own three purchase controls.
- Three affordance states: affordable, unaffordable, maxed.
- Maxed pills use the existing platinum + shine sweep treatment.
- Cost shown on hover/long-press, not inline at rest.

### 9. What this leaves open

- Exact color tokens for the affordable pill tint per verb — the follow-up UX spec (task #141) will define these against the generator color lanes from `ux/visual-identity.md` §2.
- Whether BUY has a cap (currently uncapped in the game model) — if a cap is introduced, the maxed state applies.
- Purchase confirmation animation within the pill itself (brief scale pulse? color flash?) — deferred to the UX spec.
- Keyboard navigation order across pills — deferred to the UX spec's accessibility section.

## References

1. `proposals/accepted/20260406-purchase-button-location.md` — decision that all three tracks live in Generators column; leaves layout format open
2. `ux/core-game-screen.md` §6.2 — current generator row anatomy
3. `proposals/accepted/level-driven-manual-cooldown.md` — three-axis purchase model (LVL UP, BUY, Autoclicker)
4. `ux/generator-max-level-state.md` §2, §5 — platinum token, maxed plaque treatment, shine sweep spec
5. `ux/visual-identity.md` §2 — generator color lanes (verb colors for pill tinting)
6. `ux/purchase-feedback-and-rate-visibility.md` §5 — rate-flare on purchase
7. `ux/manual-action-ladder.md` §4.4 — autoclicker badge pulse

## Open Questions

1. **[RESOLVED] Should the three pills visually compress into a single "invest" indicator at very early game (only 1 verb, player hasn't purchased anything yet)?** The three pills might overwhelm a brand-new player who just unlocked Chirps. Counter-argument: three small pills next to an otherwise clean row is not that loud, and hiding them delays discovery. Lean toward showing all three from the start. — owner: game-designer
  - Answer (game-designer): **Show all three from the start.** Three recessed unaffordable pills next to a clean row are not loud. The affordable/unaffordable state itself is the teaching — the player sees two grey pills and one lit one, taps the lit one, and learns. Hiding them creates a reveal moment that needs its own UX choreography, and the onboarding is already handling enough progressive reveals (platform unlocks, algorithm state, creator kit). Don't add another.
2. **[RESOLVED]** **(ux-designer)** What is the pill set for passive-only generators (memes, hot_takes, tutorials)? These have `manual_clickable: false`, no action button, no LVL UP (level drives manual cooldown which is irrelevant), and no Autoclicker (they're inherently passive via count). The pill set should reduce to `[BUY]` only — not three pills where two are permanently inert. Confirm the row anatomy diverges for passive-only gens.
  - Answer (ux-designer): **Passive-only rows show `[BUY]` only.** LVL and AUTO pills are omitted entirely — not shown as permanently maxed or disabled, just absent. Two permanently inert pills would teach the wrong lesson ("something's broken here") and waste horizontal space. The single BUY pill right-aligns in the same position as the rightmost pill in a three-pill row, so vertical scanning across mixed rows still works — the player's eye finds "the purchase zone" on the right edge regardless of pill count.

---
## Revision: 2026-04-06 — ux-designer

Added §5 (passive-only generator rows) — passive gens show `[BUY]` only, LVL/AUTO pills omitted. OQ2 resolved inline. Prompted by game-designer review flag on passive-only pill set.

---
# Review: game-designer

**Date**: 2026-04-06
**Decision**: Aligned

**Comments**

The layout serves the player's actual decision flow — "I want to invest in Chirps, which track?" — not a cross-verb comparison the player rarely makes. Three pills per row is the right density: visible without interaction, no expand/collapse indirection, muscle memory builds on fixed position.

**OQ1 resolved.** Show pills from the start. Three recessed unaffordable pills are not overwhelming. The affordable/unaffordable visual state IS the teaching — no separate reveal choreography needed. Answer written inline.

**Cost-hidden-at-rest works.** The affordable/unaffordable binary state is the cost preview for 90% of decisions ("can I buy this? yes/no" is a glance). The actual cost number matters only when the player is close to affording something or choosing between two affordable options. Hover/long-press covers that narrow case without adding 15 numbers to the screen (3 pills × 5 verbs).

**Non-blocking flag: passive-only generator pill set.** The proposal specifies three pills per generator row, but passive-only generators (memes, hot_takes, tutorials) have no manual tap, no LVL UP benefit (level drives cooldown, irrelevant without a tap button), and no Autoclicker (they produce passively via count alone). These rows should show only `[BUY]`, not three pills where two are permanently inert. Filed as OQ2 for ux-designer.

Removing game-designer from reviewers.

---
# Review: engineer

**Date**: 2026-04-06
**Decision**: Aligned

**Comments**

Implementable as specified. The pill approach is the simplest of the three options — no expand/collapse state management, no new interaction patterns. The conditional for passive-only rows (`manual_clickable`) already exists in static data.

Observations (non-blocking, for the follow-up spec task #141):

1. The cost ghost label on hover/long-press (§4) is net-new UI — no tooltip component exists today. Task #141 should specify dimensions, positioning, and animation so the engineer doesn't have to invent it.
2. The maxed shine sweep references `@keyframes lvl-maxed-shine` — if this isn't implemented yet, the keyframes need to be defined in the spec.
3. Keyboard navigation order (§9, deferred) should be LVL → BUY → AUTO within a row, then tab to next row. Standard left-to-right order. Task #141 should confirm.
4. Single-letter abbreviation at < 360px (§7) is a straightforward CSS media query with static mapping.

Both OQs are resolved. All reviewers aligned. Moving to accepted.
