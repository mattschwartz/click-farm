# Upgrade Curve Drawer — UX Spec

> **Scope:** Specifies the drawer that opens when a player taps the upgrade affordance (⬆) on a generator row. Covers layout, content, interaction states, and motion. The drawer shows the generator's upgrade path — current level, next 3 levels, costs, and rate deltas — and is the surface where the player commits to level upgrades.
>
> **Not in scope:** The Buy button and purchase-moment feedback (see `ux/purchase-feedback-and-rate-visibility.md`), the Clout Shop upgrade modal (see `ux/prestige-rebrand-screen.md` §3).
>
> **Implements:** `ux/core-game-screen.md` §6.3 (upgrade interaction — which gestures at this drawer without specifying it).
>
> **Against contract:** `architecture/core-systems.md` — `Generator.level`, level_multiplier formula, effective engagement rate.
>
> **Relies on:** level multiplier curve — `level_multiplier(level) = 2^(level² / 5)` per `proposals/draft/level-multiplier-curve.md`.

---

## Decisions Taken in This Spec

1. **Slide-out from right of row, overlapping the platform column temporarily.** Per core-game-screen.md §6.3 direction. The drawer does not shift other content — it floats over the platform cards with a soft backdrop dim on those cards only.
2. **Show current level + 3 forward levels, not the full curve.** Level 4 away is already post-prestige territory per the multiplier curve. Showing more is noise.
3. **Only the next level is purchasable from the drawer.** Levels +2 and +3 are *preview only*. Players upgrade one level at a time. Multi-buy adds complexity without earning it at current scope.
4. **The drawer closes after a successful upgrade.** Not auto-re-opening to show the new state. The row itself communicates the upgrade via pulse + rate flare (per purchase-feedback spec); re-opening the drawer would duplicate that signal and delay the player.
5. **Max level has its own state.** When a generator is at maximum level, the drawer reads as an acknowledgment, not a dead-end — "You've taken this as far as it goes. Rebrand to reset the stage."

---

## 1. Trigger & Position

- **Trigger:** tap on the upgrade button (⬆) on any owned generator row, OR tap anywhere on an owned generator row (see §6 — row-level affordance)
- **Position:** drawer slides out from the **right edge of the tapped row**
- **Width:** 340px
- **Height:** ~260px (enough for header + current-level readout + 3 level rows + footer close)
- **Z-order:** above the platform column cards, below the top bar and any modals
- **Backdrop dim:** the platform column cards beneath the drawer dim to 40% opacity while the drawer is open. The rest of the screen is unaffected.

**Why only dim the platforms, not the whole screen:** the drawer is scoped to one generator's decision. The player's eyes should stay on the row + drawer. Full-screen dimming would over-weight the interaction.

---

## 2. Layout

```
                                  ┌──────────────────────────────────────┐
  Generator Row (tapped) ────────▶│  Upgrade Selfies                     │
                                  │  Current: Level 2  (×1.74 multi.)    │
                                  ├──────────────────────────────────────┤
                                  │                                      │
                                  │  Lv 3    ×2.83    cost: 250          │
                                  │                      [  Upgrade  ]   │  ← action row (next level)
                                  │                                      │
                                  │  Lv 4    ×5.66    cost: 1,200        │  ← preview
                                  │  Lv 5    ×12.13   cost: 4,800        │  ← preview
                                  │                                      │
                                  ├──────────────────────────────────────┤
                                  │                         [  Close  ]  │
                                  └──────────────────────────────────────┘
```

### 2.1 Header zone

- **Title:** `Upgrade {GeneratorName}` — 16px weight 500
- **Current level readout:** `Current: Level N (×M.MM multi.)` — 13px, muted (7:1)
- The "multi." suffix is short for "multiplier" — tight spacing matters here

### 2.2 Level rows

Three rows, stacked:
- **Row 1 (action row):** the next level. Shows level number, resulting multiplier, cost, and an Upgrade button
- **Row 2 (preview):** level +2. Shows level, multiplier, cost — NO button
- **Row 3 (preview):** level +3. Shows level, multiplier, cost — NO button

**Row anatomy:**
```
Lv N    ×M.MM    cost: X
```
- **Level:** 14px weight 500
- **Multiplier:** 14px weight 500, in generator's semantic color
- **Cost:** 13px, muted on preview rows; full contrast on action row

**Preview row contrast:** 4.5:1 (P2 text). Not faded — perceptible, but clearly not actionable. The visual distinction between "you can buy this" (action row) and "this is what's next" (preview rows) carries through weight and button presence, not opacity.

### 2.3 Action row distinction

The action row is visually elevated relative to the preview rows:
- **Background:** subtle tinted band behind the row (generator's semantic color at ~8% opacity)
- **Upgrade button:** right-aligned, 100×36px
- **On hover (desktop):** row background tint bumps to 12%

### 2.4 Footer

- **Close button:** right-aligned, 80×32px, secondary treatment (outlined, not filled)
- **Keyboard:** Esc closes drawer

---

## 3. The Upgrade Button

### 3.1 Resting state (sufficient engagement)

- **Size:** 100×36px
- **Label:** "Upgrade"
- **Style:** filled with generator's semantic color, text in high-contrast neutral
- **Contrast:** 7:1 (P1 UI component)

### 3.2 Hover / press feedback

- **Hover:** background lightens 10% (120ms)
- **Press:** scale 0.97 (60ms down / 120ms up), background lightens 15%
- **On release:** confirm pulse (see §4)

### 3.3 Insufficient engagement state

- **Contrast:** 3:1 (not faded out, per core-game-screen.md standard)
- **Cost label:** amber, matches Buy button insufficient treatment
- **On tap:** button shakes (4px horizontal, 200ms), no state change, soft dull thud sound

### 3.4 Max level state (drawer is in §5.3 max-level layout)

- **Upgrade button is absent entirely** — replaced by max-level copy

---

## 4. Upgrade Confirmation

When the player taps Upgrade with sufficient engagement:

1. **t=0–60ms:** Button press animation (scale 0.97)
2. **t=0–16ms:** Upgrade sound cue fires (warm, single chime — same family as Buy confirm)
3. **t=0–400ms:** Engagement counter ticks down to new value (visible decrement)
4. **t=60–180ms:** Button scales back to 1.0
5. **t=100–250ms:** Drawer closes (slide back right, 150ms) — see §7 motion
6. **t=150–400ms:** Behind the closed drawer, generator row pulses (scale 1.02, per core-game-screen.md §6.3)
7. **t=150–550ms:** Rate display flares + delta readout (per purchase-feedback spec §5)

**Why close the drawer immediately:** the row pulse and rate flare communicate the result. Holding the drawer open would delay the "I did that" moment and force the player to visually shift attention. Closing routes attention back to the main screen where the consequence is.

---

## 5. States

### 5.1 Closed (default)

Drawer is not rendered. The upgrade button (⬆) on the generator row is the only affordance.

### 5.2 Open — sufficient engagement

Standard layout per §2. Action row highlighted, Upgrade button active.

### 5.3 Open — insufficient engagement

Same layout, but:
- Upgrade button in insufficient state (§3.3)
- Cost label on action row in amber
- A small inline note under the action row: `need {N} more engagement` — 11px, amber, italic

The preview rows are unchanged — they're informational regardless of affordability.

### 5.4 Open — max level reached

Layout shifts. The action row becomes a max-level acknowledgment:

```
┌──────────────────────────────────────┐
│  Upgrade Selfies                     │
│  Current: Level 10  (×7,225 multi.)  │
├──────────────────────────────────────┤
│                                      │
│  You've taken this as far as it      │
│  goes.                               │
│                                      │
│  Rebrand to reset the stage.         │
│                                      │
├──────────────────────────────────────┤
│                         [  Close  ]  │
└──────────────────────────────────────┘
```

- No preview rows — there is no "next"
- No Upgrade button
- Copy is satirical-calm, matches tone across the game
- Height reduces to ~180px (less content)

### 5.5 Open — first-time (generator at level 1)

Identical to 5.2. No special first-time treatment — the drawer pattern is the same whether it's your first upgrade or your fiftieth.

---

## 6. Row-Level Affordance

A player tapping **anywhere on the generator row** (not just the ⬆ button) should open the drawer. The ⬆ button is the visual affordance; the row-wide hit area is the courtesy.

**Exception:** taps on the modifier chip (per core-game-screen.md §4.5) should NOT open the drawer — chip interactions belong to the algorithm state visualization, not upgrades.

**Keyboard:** tab focus on a generator row + Enter opens the drawer.

---

## 7. Motion Brief

| Element | Triggers | Duration | Easing | Communicates |
|---------|----------|----------|--------|--------------|
| Drawer slide-out (open) | Tap row or ⬆ | 300ms | ease-out | Drawer opening |
| Platform cards dim | Drawer open | 200ms | ease-out | Drawer has focus |
| Action row hover tint | Desktop hover | 120ms | ease-out | This row is clickable |
| Upgrade button press | Tap Upgrade | 60ms / 120ms | ease-out | Tactile confirm |
| Drawer slide-in (close) | After upgrade or Close tap | 150ms (after upgrade) / 200ms (manual close) | ease-in | Drawer closing |
| Platform cards undim | Drawer closed | 200ms | ease-out | Platforms regain focus |
| Insufficient-engagement shake | Disabled Upgrade tap | 200ms | spring | Cannot afford |
| Inline "need N more" | Insufficient state open | 150ms fade | ease-out | Exact shortfall |

---

## 8. Accessibility

- **Contrast:** all text meets WCAG 2.1 AA; action row content at 7:1, preview rows at 4.5:1
- **Hit areas:** Upgrade button 100×36px (exceeds 44×44 when padded hit zone added); Close button 80×32px (+8px hit padding = 96×48 hit area)
- **Keyboard navigation:** Tab cycles Upgrade → Close. Enter activates focused button. Esc closes drawer.
- **Focus management:** on drawer open, focus moves to Upgrade button (or Close button in max-level state). On drawer close, focus returns to the triggering row.
- **Screen readers:**
  - Drawer opens with an aria-live announcement: "Upgrade {GeneratorName}. Current level {N}. Next level {N+1} costs {X} engagement."
  - Insufficient state adds: "{N} more engagement needed."
  - Max-level state announces: "This generator is at maximum level. Rebrand to reset."
- **No color-only signals:** action row distinguished by background tint + button presence + "cost" label emphasis (not color alone). Insufficient state uses amber + italic + explicit "need N more" text.
- **Motion:** drawer slide honors Reduce Motion. When enabled, drawer appears/disappears instantly without slide animation. Backdrop dim still applies (instant fade).

---

## 9. Open Questions

1. **Exact upgrade cost curve.** This spec shows placeholder values (250, 1200, 4800). The actual cost formula belongs to the game-designer and will likely mirror or inverse the level_multiplier curve. **Owner: game-designer.**
2. **Should the drawer support "buy multiple levels in one tap" at higher player skill?** Some idle games reveal x10, x25 multi-buy modes once the player crosses a threshold. This spec deliberately excludes it to keep the interaction simple at launch. **Owner: game-designer (post-launch consideration).**
3. **Should preview rows become interactive if the player can afford them all?** E.g., if the player has 10,000 engagement and all three preview levels are affordable, do the previews get their own Upgrade buttons? This spec says no — one level at a time keeps the commitment moments distinct. **Owner: ux-designer (decision) — confirmed here.**
4. **Where exactly does the drawer render when the tapped row is near the bottom of the generator list?** If a row is within 260px of the screen bottom, the drawer would overflow. This spec assumes the drawer anchors to the row's vertical midpoint and may shift upward to stay in-screen. Engineer to implement with bounds-checking. **Owner: engineer (layout detail).**

---

## 10. References

1. `ux/core-game-screen.md` §6.3 — the upgrade interaction this spec formalizes
2. `ux/core-game-screen.md` §6.2 — generator row anatomy (the row this drawer attaches to)
3. `ux/purchase-feedback-and-rate-visibility.md` §5 — rate flare + delta readout, triggered by successful upgrade
4. `ux/prestige-rebrand-screen.md` §3 — the parallel Clout Shop upgrade pattern (reference for consistency, not duplication)
5. `architecture/core-systems.md` — Generator entity, level_multiplier formula
6. `proposals/draft/level-multiplier-curve.md` — level multiplier curve this drawer displays
