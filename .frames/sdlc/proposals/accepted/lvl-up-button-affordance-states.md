---
name: Lvl ↑ Button — Three Affordance States
description: Specify three distinct visual states for the per-row Lvl ↑ button so affordability is legible without opening the drawer.
created: 2026-04-05
author: ux-designer
status: accepted
reviewers: []
---

# Proposal: Lvl ↑ Button — Three Affordance States

## Problem

On each generator row in `GeneratorList.tsx`, the `Lvl ↑` button today has only two visual states: enabled (when `g.count > 0`) and disabled (when `g.count === 0`). The "enabled" state is indistinguishable whether the player can actually afford the upgrade shown in the label or not. A player asked "why is that button highlighted when I can't afford it?" — which tells us the button is over-promising. It looks like an action the player can take *right now*; in reality, half the time it's just an information surface.

The button does not buy — it opens the upgrade drawer. So the affordability signal on the button is a *tease*: "there is a purchase here you can make, go check it out." When it lights up, the player should feel a small pull toward the drawer. When it can't be acted on, it should recede without disappearing. And when nothing is owned yet (`g.count === 0`), it should be clearly dormant — a placeholder, not a target.

A second problem: in late-game sessions, many rows will be affordable simultaneously. A flashy state that is correct on one row becomes visual noise when ten rows all flash at once. The "flashy" treatment must scale.

## Proposal

Introduce three distinct visual states for the `Lvl ↑` button, tied to a single derived condition set:

| State | Condition | Name | Feeling |
|---|---|---|---|
| 1 | `g.count === 0` | **dormant** | "not a thing yet" |
| 2 | `g.count > 0 && engagement < upgradeCost` | **armed** | "this is real, but not now" |
| 3 | `g.count > 0 && engagement >= upgradeCost` | **ready** | "go look, you can do this" |

### State 1 — Dormant (`g.count === 0`)

This is the existing `row-btn-disabled` treatment, unchanged.

- **Background:** `rgba(255,255,255,0.04)` (matches base `.row-btn`)
- **Border:** `1px solid rgba(255,255,255,0.08)` (matches existing `row-btn-disabled`)
- **Label color:** `var(--text-p3)` (0.42 opacity — receded, ≥ 3:1 on panel bg)
- **Cost numeral color:** `var(--text-p3)`
- **Cursor:** `not-allowed`
- **Motion:** none
- **Tooltip:** "Buy at least one {name} before upgrading" (unchanged)
- **aria-disabled:** true; button is `disabled`

This is a placeholder. It says "this slot exists, you haven't earned it yet."

### State 2 — Armed (owned, can't afford)

The button is functional (clickable — it opens the drawer), but the action it teases is out of reach. This is the most important state to get right because it's the one that's currently wrong.

- **Background:** `rgba(255,255,255,0.04)` (unchanged from base)
- **Border:** `1px solid rgba(255,255,255,0.14)` — slightly stronger than dormant (0.08) but weaker than ready. Meets 3:1 contrast against panel bg.
- **Label color (`.label` "LVL ↑"):** `var(--text-p2)` (0.66 opacity)
- **Cost numeral color:** `var(--accent-amber)` at **60% opacity** (`color-mix(in srgb, var(--accent-amber) 60%, transparent)`). Amber is the project's established "attention, not alarm" color (see `buy-btn-cost-amber`, `risk-pulse`) and signals "you're short." Reducing to 60% keeps it from competing with the ready state.
- **Cursor:** `pointer`
- **Motion:** none — stillness communicates "not now." Hover raises bg to `rgba(255,255,255,0.10)` per existing `.row-btn:hover` rule.
- **Tooltip:** "Upgrade {name} (L{n} → L{n+1} costs {X}) — {deficit} more engagement"
- **Icon pairing (accessibility — not color-only):** append a small "—" (em-dash) glyph or a `·` directly before the cost numeral, or prefix the cost with the unicode lock glyph `𐄂` is too obscure — use a leading small minus-circle "⊖" sized 10px inline before the number. This ensures the state reads under CVD simulation and when amber desaturates on OLED.

Rationale: Amber at 60% reads as "reachable soon" rather than "broken." Stillness is the differentiator — any motion at all belongs to state 3.

### State 3 — Ready (owned, can afford) — "flashy"

The player has the engagement required for at least the L{n}→L{n+1} upgrade. The button should pull the eye toward the drawer without screaming.

**Static attributes:**

- **Background:** `rgba(255, 214, 107, 0.08)` — a wash of `--accent-gold` at low opacity. Gold is the project's "affordance met" color (see `--accent-gold`, `engagement-value.viral-gold`).
- **Border:** `1px solid var(--accent-gold)` (i.e. `#ffd66b`) — full-strength gold border. 6.8:1 against panel bg, well over WCAG 1.4.11's 3:1.
- **Label color (`.label` "LVL ↑"):** `var(--text-p1)` (0.86)
- **Cost numeral color:** `var(--accent-gold)` (full strength), weight 600
- **Cursor:** `pointer`
- **Icon pairing:** a small upward chevron "▲" (8px) inline with `.label`, e.g. "▲ LVL ↑" — reinforces "up" direction non-chromatically.
- **Tooltip:** "Upgrade {name} (L{n} → L{n+1} costs {X}) — ready"

**Motion — the "breathing halo":**

A slow, low-amplitude pulse on the border + box-shadow. Borrows the vocabulary of `badge-owned` breathing and `viral-row-halo` without using either verbatim.

- **Animation name:** `lvl-ready-breathe`
- **Duration:** 2400ms (slow — matches `badge-breathing` cadence, not `viral-halo`'s 1s)
- **Easing:** `ease-in-out infinite`
- **Properties animated:**
  - `box-shadow`: `0 0 0 0 rgba(255, 214, 107, 0)` → `0 0 8px 1px rgba(255, 214, 107, 0.35)` → back
  - `border-color`: `var(--accent-gold)` → `#ffe89a` (lifted) → back
- **No scale, no translate** — only color/shadow animate, so the button never shifts layout or draws the eye from motion alone.

**Stagger for multi-row noise control:**

When many rows are simultaneously in the ready state, synchronized breathing is distracting. Stagger the animation start using a per-row delay derived from the generator's index:

- `animation-delay: calc(var(--gen-index, 0) * 160ms)` negative-delay into the cycle, so rows breathe out-of-phase.
- This reuses the `--breathe-delay` pattern already present on `.badge-owned` (see GeneratorList line 306 and `gen-index` plumbing in `GeneratorRow`). The engineer should use the existing `breatheDelayMs` or `gen-index` CSS var, not introduce a new one.

**"Many ready at once" de-escalation:**

If **4 or more** `ready` rows are visible at once in the list, reduce the halo intensity globally via a modifier class on the `.generator-list` container (e.g. `.many-ready`):

- Border stays full-strength gold (the trust signal must not weaken)
- `box-shadow` peak drops from `0.35` opacity to `0.18`
- Animation duration slows from 2400ms to 3200ms

This keeps the state legible on a per-row basis while preventing the list from becoming a disco.

**Hover amplifies (on the hovered row only):**

- `box-shadow` jumps immediately to `0 0 12px 2px rgba(255, 214, 107, 0.55)` (no breathing while hovered — it "locks open")
- `background`: `rgba(255, 214, 107, 0.14)`

**Click feedback:**
Reuse the existing `row-btn-buy-glow` keyframe (200ms border flash) on press — consistency with the Compact Buy button's click feedback. Or introduce a 200ms `lvl-ready-confirm` that strobes the box-shadow once. **Recommendation:** reuse `row-btn-buy-glow` for economy.

### Reduce Motion variants

Under `@media (prefers-reduced-motion: reduce)`:

- **State 1 (dormant):** no change (already static)
- **State 2 (armed):** no change (already static)
- **State 3 (ready):**
  - Remove the `lvl-ready-breathe` animation entirely (`animation: none`)
  - Keep all static attributes: full-strength gold border, gold box-shadow at a **fixed** `0 0 8px 1px rgba(255, 214, 107, 0.35)` (hold at the peak value so the state reads as "energized" even without motion)
  - Keep the ▲ chevron and all color signals
  - Hover state still applies (hover amplification is a discrete change, not a continuous motion)

The chevron + gold border + fixed glow carry the "ready" signal without animation. The state is never color-only.

### Accessibility summary — distinguishable without color

| State | Color signal | Non-color signal |
|---|---|---|
| Dormant | low-opacity white, `text-p3` | `disabled` attribute; `not-allowed` cursor; no hover response |
| Armed | amber numeral at 60% | `⊖` (or `·`) glyph before cost numeral; stillness; weaker border |
| Ready | gold border + gold numeral | `▲` chevron in label; breathing halo (or fixed glow under Reduce Motion); strongest border |

Border weight is the primary non-color hierarchy cue: `0.08` → `0.14` → full gold. Shadow presence is the secondary cue: none → none → halo.

### Motion-language integration

| Existing pattern | How it differs from `lvl-ready-breathe` |
|---|---|
| `badge-owned` breathing (opacity on badge) | Same 2400ms cadence; different property (shadow vs opacity); different element. |
| `viral-row-halo` (1s, whole-row background pulse) | Much faster & on the row surface. Ready state's halo is slower and *scoped to the button* so the two can coexist — a viral-halo row with an affordable upgrade doesn't double-flash in a confusing way. |
| `buy-btn-glow` / `row-btn-buy-glow` (200ms click flash) | One-shot press feedback, reused on click per above. |
| `risk-pulse` amber (1.75s) | Amber + pulse is reserved for risk/danger. Gold + breathe is reserved for reward/opportunity. The two do not collide because they use different hues and different speeds. |

The new motion is a **third member** of the breathing family (badge-owned, lvl-ready), each on its own element, all sharing a slow 2–2.4s cadence. They will feel cohesive.

### Implementation surface

Engineer should:

1. Derive `canAfford` in `GeneratorRow` as `state.player.engagement >= upgradeCost`.
2. Replace the single `row-btn-disabled` modifier with three mutually-exclusive modifier classes: `.row-btn-lvl-dormant`, `.row-btn-lvl-armed`, `.row-btn-lvl-ready`.
3. Add CSS keyframes `lvl-ready-breathe` and modifier styles in `GameScreen.css` near the existing `.row-btn-upgrade` block (~line 1617).
4. Emit a container class `.many-ready` on the generator list when ≥4 rows are in the ready state. The count calculation can be done in `GeneratorList` with a simple map over `state.generators`.
5. Reuse the existing `--breathe-delay` / `gen-index` CSS var for stagger.
6. Add the inline glyphs (`⊖` for armed, `▲` for ready) as spans inside the button so CSS can target them or hide them per state.
7. Update the tooltip strings per state.
8. Include Reduce Motion fallback in the CSS.

## References

1. `client/src/ui/GeneratorList.tsx` — lines 273–346, current `Lvl ↑` button render.
2. `client/src/ui/GameScreen.css` — lines 540–663 (row-btn base styles, existing animations), 935–965 (`viral-row-halo`), 1115–1135 (`risk-pulse`), 1617–1621 (`.row-btn-upgrade.active`).
3. `.frames/sdlc/proposals/accepted/generator-badge-breathing.md` — prior-art for the 2400ms slow-breathe cadence.
4. `.frames/sdlc/proposals/accepted/actions-column.md` — original spec for the row actions column.
5. `.frames/sdlc/proposals/accepted/clout-upgrade-menu.md` — upgrade drawer behavior context.
6. WCAG 2.1 — 1.4.3 (text contrast), 1.4.11 (non-text contrast, 3:1 for UI components).

## Open Questions

1. **(game-designer)** The "ready" state fires as soon as the player can afford the L{n}→L{n+1} upgrade. But the drawer may offer multiple tiers. Should the button also glow when an upgrade further in (L{n+2}, L{n+3}) is affordable, even if L{n+1} is already covered? Default answer: no — the button's cost label shows L{n+1}, so tie the flashy state to that exact cost. Higher tiers are discovered inside the drawer.
2. **(game-designer)** Is gold the right hue for "affordance met" here, or should we reserve gold for engagement/viral signals and pick a different hue (e.g. `--accent-green`) for upgrade-ready? Default answer: gold. Gold already means "resource reached the threshold" in the engagement counter (`viral-gold` class) and the players' mental association is established. Green is used for positive modifier chips and would overload.
3. **(engineer)** [RESOLVED] Is there a per-row index variable already plumbed through to CSS (as a CSS custom property on the row element) that we can reuse for stagger, or does a new `--gen-index` need to be added? The CSS already uses `--breathe-delay` on `.badge-owned`; likely the simplest path is to reuse `breatheDelayMs` directly on the button element.
  - Answer (engineer): Reuse `breatheDelayMs` (GeneratorList.tsx:237). It's already computed per-row and already emitted as `--breathe-delay` inline style on `.badge-owned` (line 306). Either also set the same CSS var on the `.row-btn-upgrade` element, or lift the var onto `.generator-row` so both badge and button inherit it. No new var needed. Apply with `animation-delay: var(--breathe-delay, 0ms)` — the value is already negative, so no additional negation is required (see note in engineer review log re: spec math correction).
4. **(engineer)** [RESOLVED] Should `.many-ready` be computed in `GeneratorList` via a derived selector, or lifted into a selector in `src/state/`? This is a small calculation (one pass over generators) and has no cross-cutting concern, so computing it inline in `GeneratorList` is preferred — but flagging for engineer's judgment.
  - Answer (engineer): Compute inline in `GeneratorList`. One pass over `state.generators` computing `count > 0 && engagement >= upgradeCost`, toggle `.many-ready` on the container when count ≥ 4. No cross-cutting concern, no need to lift into `src/state/`.
5. **(game-designer)** When the drawer is already open for this row (`.row-btn-upgrade.active`), should the ready-state halo continue to animate, or should it be suppressed while the drawer is open (since the player is already looking at the thing being teased)? Default answer: suppress — when `.active` is present, remove the breathing animation but keep the gold border so the state is still readable.

---
# Review: engineer

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

The spec is implementable and consistent with the existing motion vocabulary. Three-state modifier model, non-color glyph pairings, and Reduce Motion hold-at-peak fallback are all clean. I verified the surface in `GeneratorList.tsx` (lines 273–346 as cited) and the existing `--breathe-delay` plumbing (line 306, GameScreen.css:405–413). Task #69 tracks the implementation closely.

Answered Q3 and Q4 inline — both resolved without structural changes to the codebase.

**Non-blocking engineering notes (flagged for the author to fold into a revision at their discretion, or to fix at build time):**

1. **Stagger math correction.** The proposal's "Implementation surface" and Q3 suggest `animation-delay: calc(var(--breathe-delay, 0ms) * -1)`. But `breatheDelayMs` in `GeneratorList.tsx:237` is already computed as a negative number (`-Math.round((generatorIndex / BREATHE_TOTAL) * BREATHE_CYCLE_MS)`). Multiplying by -1 makes it positive and defeats the negative-delay-into-cycle intent. The correct CSS — matching the `.badge-owned` usage at GameScreen.css:413 — is simply `animation-delay: var(--breathe-delay, 0ms)`. Task #69's AC #7 repeats the negative-delay phrasing and should be read against this correction at build time.

2. **CSS var plumbing.** `--breathe-delay` is currently emitted as an inline style only on `.badge-owned` (`GeneratorList.tsx:306`). To reuse it on the button, engineer will either set the same inline style on `.row-btn-upgrade` or lift the var to `.generator-row` so both descendants inherit. Trivial; just naming it so there's no surprise during build.

Neither note is blocking. Aligned — removing engineer from reviewers. Game-designer still owns Q1, Q2, and Q5.

---
# Review: game-designer

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

Answering Q1, Q2, and Q5 — all three defaults endorsed — and leaving one non-blocking cross-system flag.

**Q1 — glow for higher tiers (L{n+2}+) when L{n+1} is already covered?** No. Endorse default.
The button's cost label displays L{n+1}. If the light signals "ready" while what's actually reachable is further in, the signal decouples from what the button shows — that's dishonest affordance. Tier discovery belongs in the drawer; the button is the tease bound to its own stated cost. Layered information also supports the tap/drawer rhythm: the button says "there's *a* thing"; the drawer reveals "*these* things." If the button promises everything, the drawer has nothing left to offer.

**Q2 — gold or green for "affordance met"?** Gold. Endorse default.
"Threshold reached" is already a gold grammar in this game (`viral-gold`, the engagement counter). Upgrade-ready is the same family — a resource crossed a line — so sharing the hue is consistent, not overloaded. Green is committed to positive modifier chips; pulling it into upgrade-ready would dilute both. Grammar stays clean.

**Q5 — animate halo while drawer is already open (`.row-btn-upgrade.active`)?** Suppress animation, keep gold border. Endorse default.
Once the player is looking at the thing being teased, the tease has done its job. Continuing to breathe at them is the game shouting about something they're already engaging with. Applied against the three-question test: an animation that keeps firing after it's been acknowledged shifts from information into pressure. Drop the animation, keep the gold border so the state is still readable when the drawer closes.

**Non-blocking flag — interaction with Upgrade Lock (Bad Change system).**

The accepted `bad-change-upgrade-lock-complain-recovery.md` proposal introduces a state where upgrades are *locked regardless of affordability*. If a row is affordable but locked, the ready-state glow says "go look, you can do this" — the player opens the drawer and finds they can't. The signal over-promises, and the honest-affordance principle that Q1 is built on gets contradicted in a specific edge case.

Two resolutions UX could land (their call, not mine):
1. When upgrade lock is active, demote ready→armed (or introduce a fourth "locked" state) so the button never promises an action the system won't honor. My preference on game-design grounds — the button should always be honest.
2. Let the button still glow (it only opens the drawer, after all) and trust the drawer to surface the lock clearly. Weaker because it treats the flag as a drawer-only concern, but defensible.

This is not a blocker for acceptance — the three states specified here are correct in isolation. The interaction just needs to be defined before task #69 ships, either as a revision here, a UX follow-up spec, or an explicit build-time decision on task #69. Flagging it as work-to-do.

**Game-design summary:**

The three-state model is sound. "Armed" fixes the over-promising that triggered the proposal. "Ready" is a motivating pull toward the drawer that matches this game's core loop — in a clicker-idle about chasing metrics, the pull *is* the loop, so the flashy state is aligned with what the player came for. The 4+-rows de-escalation preserves per-row legibility at system scale. Loss aversion is respected (amber = "attention, not alarm"; no downward-spiral framing). Passes the three-question test.

Removing game-designer from reviewers. List empties → proposal moves to accepted.

