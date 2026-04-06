# Generator Purchase Pills — UX Spec

> **Scope:** Defines the visual treatment, interaction states, motion briefs, accessibility, and engineer handover for the three-track purchase pill buttons (LVL, BUY, AUTO) within each generator row in the Generators center column. This is the player-facing surface of the three-axis investment model (speed / power / passive) applied to the strategic ledger.
>
> **Not in scope:** The action-button slab (see `ux/manual-action-ladder.md`). The upgrade curve drawer (see `ux/upgrade-curve-drawer-spec.md` — coexists with pills, triggered by row tap). Generator unlock/buy flows for passive-only generators (unchanged). Autoclicker floating-number emissions (see `ux/manual-action-ladder.md` §4.6).
>
> **Implements:** `proposals/accepted/20260406-three-track-purchase-row-layout.md` — compact inline pills, grouped by verb. `proposals/accepted/20260406-purchase-button-location.md` — all purchase controls in Generators column.
>
> **Against contract:** `proposals/accepted/level-driven-manual-cooldown.md` — three-axis model (LVL UP = speed, BUY = power, Autoclicker = passive). `architecture/core-systems.md` — GeneratorState fields (`level`, `count`, `autoclicker_count`).
>
> **Integrates with:** `ux/core-game-screen.md` §6.2 (generator row anatomy), `ux/purchase-feedback-and-rate-visibility.md` §5 (rate-flare on yield change), `ux/manual-action-ladder.md` §4.2–4.4 (badge and yield display updates on purchase), `ux/generator-max-level-state.md` (platinum token, maxed shine sweep).

---

## Decisions Taken in This Spec

1. **Cost is shown on hover/long-press, not inline at rest.** The affordable/unaffordable binary is the 90% decision signal ("can I buy this?"). The actual cost number matters only when choosing between affordable options or estimating closeness. Showing 15 cost numbers at rest (3 pills x 5 verbs) would overwhelm the ledger. Ghost label on demand covers the 10% case.
2. **Purchase fires immediately on tap — no confirmation drawer for pills.** The upgrade curve drawer (existing, triggered by row tap) handles the deliberate "plan my upgrades" flow. Pills are the fast path — tap to invest, see the feedback, keep going. Confirmation modals on a fast-path purchase kill the flow state.
3. **The pill's press animation mirrors the action-button physicality — scaled down.** The same "press in, spring back" feel at a smaller scale. The pills are part of the same game; they should feel the same.
4. **Passive-only generators show `[BUY]` only.** LVL and AUTO pills are omitted (not disabled). Two permanently inert pills would read as broken, not inapplicable.
5. **Keyboard navigation: LVL -> BUY -> AUTO within a row, then Tab to next row.** Standard left-to-right, top-to-bottom order. Each pill is a focusable `<button>`.

---

## 1. Row Anatomy (Extended)

The existing generator row anatomy from `ux/core-game-screen.md` §6.2 extends with three pill buttons on the right edge:

### 1.1 Manual-clickable verbs (chirps, selfies, livestreams, podcasts, viral_stunts)

```
┌────────────────────────────────────────────────────────────────────┐
│ [badge] Icon  Name       ×N  +18/s  [×1.8▲]   [LVL] [BUY] [AUTO] │
│         32px  wt 500     ct  rate   chip        pill   pill  pill  │
└────────────────────────────────────────────────────────────────────┘
```

### 1.2 Passive-only generators (memes, hot_takes, tutorials, ai_slop, deepfakes, algorithmic_prophecy)

```
┌────────────────────────────────────────────────────────────────────┐
│ [badge] Icon  Name       ×N  +18/s  [×1.8▲]                [BUY] │
│         32px  wt 500     ct  rate   chip                    pill  │
└────────────────────────────────────────────────────────────────────┘
```

The single BUY pill right-aligns to the same edge as the rightmost pill (AUTO) in a three-pill row. Vertical scanning stays consistent — "purchase zone" is always the right edge.

### 1.3 Pill zone dimensions

- **Gap between modifier chip and pill zone:** 12px minimum. Prevents the info zone from bleeding into the control zone.
- **Gap between pills:** 6px.
- **Pill zone total width:** ~(3 × 44px) + (2 × 6px) = 144px for three pills; 44px for a single BUY pill.
- **Alignment:** right-aligned within the row, vertically centered.

---

## 2. Pill Anatomy

Each pill is a compact rounded button with consistent dimensions across all three tracks.

### 2.1 Dimensions

- **Min-width:** 44px (meets WCAG 2.5.8 target size).
- **Height:** 28px.
- **Border-radius:** 14px (fully rounded ends — pill shape).
- **Internal padding:** 8px horizontal, 0 vertical (text is vertically centered by line-height).

### 2.2 Typography

- **Label:** 11px, Space Grotesk 600, uppercase.
- **Labels per track:** "LVL" / "BUY" / "AUTO".
- **Line-height:** 28px (matches pill height for vertical centering).

### 2.3 Fixed order

Pills always render in the order **LVL → BUY → AUTO** (left to right). This is invariant — the player builds muscle memory for pill position regardless of which verb row they're in. The order mirrors the investment logic: speed first, then power, then automation.

---

## 3. Affordance States

Each pill has one of three visual states, driven by the player's current engagement balance and the generator's state.

### 3.1 Affordable (tappable)

The player has enough engagement to purchase this track.

- **Background:** verb's color lane at 15% opacity — `rgba(var(--gen-{verb}-rgb), 0.15)`. Warm, tinted, inviting.
- **Text:** verb's color lane at full saturation — `var(--gen-{verb})`. Weight 600.
- **Border:** 1px solid, verb's color lane at 30% opacity — `rgba(var(--gen-{verb}-rgb), 0.30)`.
- **Cursor:** `pointer`.

**Color tokens per verb (affordable pill):**

| Verb | Face tint (15%) | Text | Border (30%) |
|------|-----------------|------|--------------|
| chirps | `rgba(77, 158, 240, 0.15)` | `#4d9ef0` | `rgba(77, 158, 240, 0.30)` |
| selfies | `rgba(224, 112, 64, 0.15)` | `#e07040` | `rgba(224, 112, 64, 0.30)` |
| livestreams | `rgba(154, 58, 223, 0.15)` | `#9a3adf` | `rgba(154, 58, 223, 0.30)` |
| podcasts | `rgba(90, 106, 223, 0.15)` | `#5a6adf` | `rgba(90, 106, 223, 0.30)` |
| viral_stunts | `rgba(223, 58, 90, 0.15)` | `#df3a5a` | `rgba(223, 58, 90, 0.30)` |

**Passive-only generators** use the same color lane tokens from `ux/visual-identity.md` §2:

| Generator | Text | Tint base |
|-----------|------|-----------|
| memes | `#dfb020` | `rgba(223, 176, 32, ...)` |
| hot_takes | `#d04820` | `rgba(208, 72, 32, ...)` |
| tutorials | `#3aaad0` | `rgba(58, 170, 208, ...)` |

**Contrast check:** all verb color lane tokens produce >= 3:1 contrast against `--surface-panel` (#FFFFFF) per `ux/visual-identity.md` §2 CVD verification. At 11px weight 600, these are large enough to be legible under the "bold 14px+ or regular 18px+" large-text exception. However, 11px at 600 weight is below the exception threshold — verify per-verb contrast at implementation. If any verb falls below 4.5:1, darken the text variant by 10% for the pill label only.

### 3.2 Unaffordable (visible, not tappable)

The player cannot afford this purchase.

- **Background:** transparent.
- **Text:** `var(--text-receded)` — `#9B9B9B`. Warm grey.
- **Border:** 1px solid, `var(--border-subtle)` at 60% opacity — `rgba(240, 236, 231, 0.60)`.
- **Cursor:** `default` (no pointer).
- **On tap:** no-op. No animation, no shake, no feedback. The recessed visual is the signal.

**Contrast check:** `#9B9B9B` on `#FFFFFF` = ~3.5:1. Below 4.5:1 AA for body text, but the unaffordable label is communicating "not available" — its reduced contrast is intentional and aligned with the visual receding. The label text is supplemented by the transparent background (vs the tinted affordable state) as a non-color signal. For accessibility, the aria-label includes "not affordable" (see §8).

### 3.3 Maxed (completed, non-actionable)

Applies to LVL at `level === max_level` (currently 10). Applies to AUTO only if a cap is introduced (currently uncapped). Does NOT apply to BUY (currently uncapped).

- **Background:** `rgba(var(--palette-platinum-rgb), 0.12)` — cool grey, distinct from the warm affordable tint.
- **Text:** `var(--accent-platinum)` — `#5C6A86`. Weight 600. Label changes to "MAX".
- **Border:** 1px solid, `rgba(var(--palette-platinum-rgb), 0.25)`.
- **Inset shadow:** `inset 0 1px 2px rgba(0, 0, 0, 0.06)` — slightly recessed, matching the LVL UP maxed plaque from `ux/generator-max-level-state.md` §3.2.
- **Shine sweep:** the pill participates in the existing `@keyframes lvl-maxed-shine` — 7s cycle, ~420ms sweep, synced with all other maxed elements on screen. Same `::before` pseudo-element technique as the LVL UP maxed plaque.
- **Cursor:** `default`.

**Contrast check:** `#5C6A86` on `#FFFFFF` = ~5.7:1. Passes AA for body text.

---

## 4. Cost Ghost Label

Cost is not shown inline at rest. It appears on demand via hover (desktop) or long-press (mobile).

### 4.1 Trigger

- **Desktop:** `mouseenter` on an affordable or unaffordable pill. Does not appear on maxed pills.
- **Mobile:** `touchstart` held > 300ms (long-press). Released on `touchend`.
- **Keyboard:** appears on `focus` of the pill.

### 4.2 Appearance

The ghost label floats above the pill:

```
        ┌─────────┐
        │  1,200   │  ← ghost label
        └────┬────┘
             │
         [ LVL ]      ← pill
```

- **Position:** centered above the pill, 4px gap. If the pill is near the top of the viewport, the label renders below instead (collision avoidance).
- **Background:** `var(--surface-panel)` (#FFFFFF) with `var(--panel-shadow)`.
- **Border:** 1px solid `var(--border-default)` (#E8E4DF).
- **Border-radius:** 6px.
- **Padding:** 4px 8px.
- **Typography:** 11px Space Grotesk 500. Compact notation (per `ux/purchase-feedback-and-rate-visibility.md` number formatting: `1,200` / `12.4K` / `1.2M`).
- **Text color:** `var(--text-primary)` (#1A1A1A) for affordable pills; `var(--text-receded)` (#9B9B9B) for unaffordable pills.
- **Width:** auto, min-width 36px.

### 4.3 Animation

- **Fade in:** 120ms, ease-out. Starts from 0 opacity + 2px translateY offset (slides up slightly as it appears).
- **Fade out:** 80ms, ease-in. On `mouseleave` / `touchend` / `blur`.
- **Reduced motion:** instant appear/disappear (no translate, no fade).

### 4.4 Cost formulas

The ghost label shows the cost for the next purchase of that track:

| Track | Cost formula | Source |
|-------|-------------|--------|
| LVL | `generatorUpgradeCost(genId, level, staticData)` | Next level-up cost |
| BUY | `ceil(base_buy_cost × 1.15^count)` | Next BUY cost |
| AUTO | `autoclickerBuyCost(genId, autoclicker_count, staticData)` | Next autoclicker cost |

All costs are denominated in engagement. The ghost label shows the number only — no "eng" suffix (the player knows the currency by context).

---

## 5. Tap Interaction and Feedback

### 5.1 Press animation

On `pointerdown`, the pill performs a micro-press:

```css
.purchase-pill:active,
.purchase-pill--pressed {
  transform: scale(0.93);
  transition: transform 30ms ease-in;
}
```

On `pointerup`, the pill springs back:

```css
.purchase-pill {
  transition: transform 80ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

Same asymmetry as the action-button physicality (fast press, spring release) but at pill scale. The `cubic-bezier(0.34, 1.56, 0.64, 1)` overshoot is the same curve — 8% overshoot, settles.

### 5.2 Purchase feedback chain

On successful tap of an affordable pill:

1. **T+0ms:** purchase fires. Engagement debited. Pill press animation completes.
2. **T+0–60ms:** engagement counter ticks down to new value (communicated spend per `ux/purchase-feedback-and-rate-visibility.md`).
3. **T+60ms:** pill label briefly flashes — text color brightens to 100% lightness for 120ms, then returns to verb color. This is the pill's local confirmation signal.
4. **Downstream feedback per track:**

| Track | Downstream feedback | Spec reference |
|-------|--------------------|----------------|
| **LVL** | Cooldown ring on the action button drains faster on the next tap cycle. No immediate visual on the generator row beyond the pill flash. | `ux/manual-action-ladder.md` §4.4 |
| **BUY** | Yield display on the action button updates immediately. Rate-flare fires on the engagement counter. | `ux/manual-action-ladder.md` §4.2, `ux/purchase-feedback-and-rate-visibility.md` §5 |
| **AUTO** | Autoclicker badge on the action button appears/increments with scale-pulse (1.0→1.05→1.0, 200ms). | `ux/manual-action-ladder.md` §4.4 |

5. **T+80ms:** pill state re-evaluates. If the player can still afford the next purchase of the same track, the pill stays affordable. If not, it transitions to unaffordable (see §5.4).

### 5.3 Unaffordable tap

Tapping an unaffordable pill: no-op. No animation, no shake, no sound. The visual receding is the feedback — the player already knows they can't afford it. Adding feedback to an impossible action teaches the wrong lesson ("try harder to tap this").

### 5.4 State transitions

When a purchase changes the player's engagement balance, all pills on all visible rows re-evaluate their affordance state:

- **Affordable → unaffordable:** background fades from tinted to transparent over 150ms, ease-out. Text fades from verb color to `--text-receded` over 150ms. Border fades.
- **Unaffordable → affordable:** background fades from transparent to tinted over 200ms, ease-out. Text fades from receded to verb color. The slightly longer duration (200ms vs 150ms) creates a "lighting up" feel that's perceptibly different from the "dimming" transition.
- **Affordable → maxed:** on the LVL purchase that hits `max_level`, the pill transitions over 300ms: background shifts to platinum, text changes to "MAX", border shifts to platinum. The maxed arrival celebration from `ux/generator-max-level-state.md` §4 fires simultaneously on the LVL UP plaque in the row.
- **Reduced motion:** all transitions are instant (no fade, no duration).

---

## 6. Density and Interaction with Existing Row Elements

### 6.1 Relationship to the upgrade drawer

The upgrade curve drawer (`ux/upgrade-curve-drawer-spec.md`) is triggered by tapping the generator row itself or the upgrade button (⬆). The pills are a separate interaction — tapping a pill fires a purchase directly, it does NOT open the drawer.

If the drawer is open and the player taps a pill, the purchase fires AND the drawer updates live (level display, cost, rate delta). The drawer does not close — it reflects the new state.

If the player taps the row (not a pill), the drawer opens as normal. The pill tap target is small enough (44px wide) and positioned at the right edge that accidental pill taps when intending to open the drawer are unlikely. But if they happen, the immediate purchase + drawer-update is not harmful — the player sees what they just bought.

### 6.2 Modifier chip and pill coexistence

The modifier chip (`×1.8▲`) and the pills share the row's right zone. They are separated by 12px. The chip is left of the pills. If the modifier chip is "neutral" (×1.0, no chip rendered), the pills shift slightly left to fill the gap — but maintain right-alignment.

### 6.3 Row height

The existing generator row height is not changed. Pills are 28px tall, vertically centered within the row's existing height (56px+). No reflow.

---

## 7. Mobile Adaptation

Per `ux/mobile-layout.md`, the Generators column renders as a full-width scrollable list on mobile.

### 7.1 Pill sizing

- Pills maintain 44px min-width and 28px height.
- Touch targets: the row itself is 56px+ tall. The 28px pill height + row padding clears the 44px logical touch target minimum.

### 7.2 Narrow viewport abbreviation

On viewports < 360px logical width, pill labels abbreviate to single-letter:

| Full label | Abbreviated |
|-----------|-------------|
| LVL | L |
| BUY | B |
| AUTO | A |

The fixed position (leftmost = level, middle = buy, rightmost = auto) carries meaning even without the full label. This is a CSS media query with static content swap — no JS logic needed.

### 7.3 Cost ghost label on mobile

- Triggered by long-press (300ms hold).
- Position: above the pill (same as desktop hover).
- Dismissed on `touchend`.
- No hover state on mobile — the ghost label is invisible until long-pressed.

---

## 8. Accessibility

### 8.1 Keyboard navigation

Each pill is a `<button>` element. Tab order within a row: LVL → BUY → AUTO (left to right). Tab from the last pill in a row moves to the first pill in the next row. Standard left-to-right, top-to-bottom navigation.

Focus ring: 2px solid `var(--accent-gold)` outline with 2px offset. Matches the existing focus ring convention in the codebase.

### 8.2 Screen reader labels

Each pill has a dynamic `aria-label` that includes:

- Track name ("Level Up" / "Buy" / "Autoclicker")
- Generator name ("Chirps", "Selfies", etc.)
- Current state ("affordable, costs 1,200 engagement" / "not affordable, costs 12,400 engagement" / "maxed")
- Current level/count for context ("level 3 of 10" / "count 5" / "2 autoclickers")

Example: `aria-label="Level Up Chirps, level 3 of 10, affordable, costs 1,200 engagement"`

### 8.3 Color independence

| Signal | Color | Non-color pair |
|--------|-------|----------------|
| Affordable | Verb color tint + text | Filled background vs transparent |
| Unaffordable | Receded grey | Transparent background, muted border |
| Maxed | Platinum | "MAX" label text, inset shadow, shine sweep |

No state is communicated by color alone.

### 8.4 Contrast summary

| State | Text token | Background | Contrast ratio | Passes AA? |
|-------|-----------|------------|----------------|------------|
| Affordable | Verb color lane | 15% tint on white | >= 3:1 (verify per verb) | Yes for UI components; verify 4.5:1 for text per verb |
| Unaffordable | `--text-receded` #9B9B9B | Transparent (white) | ~3.5:1 | Marginal — acceptable for non-actionable label (see §3.2) |
| Maxed | `--accent-platinum` #5C6A86 | 12% platinum on white | ~5.7:1 | Yes |

### 8.5 Reduced motion

Under `prefers-reduced-motion: reduce`:
- Pill press/release animation: disabled. Pill still shows pressed visual state (scale 0.93) but applies instantly, no transition.
- Cost ghost label: instant appear/disappear, no slide or fade.
- State transitions (affordable ↔ unaffordable): instant, no fade.
- Maxed shine sweep: disabled (static platinum pill remains).
- Pill flash on purchase: disabled (state change is the confirmation signal).

---

## 9. Motion Briefs (Summary)

| Motion | Trigger | Duration | Easing | Communicates |
|--------|---------|----------|--------|-------------|
| Pill press | `pointerdown` on affordable pill | 30ms | ease-in | tactile confirmation |
| Pill release | `pointerup` | 80ms | cubic-bezier(0.34, 1.56, 0.64, 1) | spring-back |
| Pill label flash | purchase confirmed | 120ms | linear | local purchase confirmation |
| Cost ghost label appear | hover / long-press / focus | 120ms | ease-out | cost revealed |
| Cost ghost label dismiss | leave / release / blur | 80ms | ease-in | cost hidden |
| Affordable → unaffordable | engagement balance drops below cost | 150ms | ease-out | can no longer buy |
| Unaffordable → affordable | engagement balance rises above cost | 200ms | ease-out | can now buy |
| Affordable → maxed | LVL purchase hits max_level | 300ms | ease-out | track completed |
| Maxed shine sweep | continuous (synced) | 7s cycle, 420ms sweep | linear | trophy |

---

## 10. Engineer Handover

Explicit handover — the engineer implementing purchase pills should find everything needed in this doc:

1. **Component:** `<PurchasePill>` — a `<button>` element rendered within each `<GeneratorRow>`. Props:
   ```ts
   interface PurchasePillProps {
     track: 'lvl' | 'buy' | 'auto';
     generatorId: string;
     state: 'affordable' | 'unaffordable' | 'maxed';
     cost: number;             // next purchase cost
     currentValue: number;     // current level / count / autoclicker_count
     maxValue?: number;        // max_level for LVL; undefined if uncapped
     verbColorLane: string;    // CSS color token (e.g., '#4d9ef0')
     verbColorLaneRgb: string; // RGB channels (e.g., '77, 158, 240')
     onPurchase: () => void;   // fires the purchase action
   }
   ```

2. **State derivation:**
   - `state` is computed from `player.engagement >= cost` (affordable) or `currentValue >= maxValue` (maxed) or else unaffordable.
   - `cost` comes from `generatorUpgradeCost` (LVL), `ceil(base_buy_cost * 1.15^count)` (BUY), or `autoclickerBuyCost` (AUTO).
   - `currentValue` comes from `genState.level` (LVL), `genState.count` (BUY), `genState.autoclicker_count` (AUTO).

3. **Conditional rendering:** if `!staticData.generators[id].manual_clickable`, render only the BUY pill. LVL and AUTO pills are omitted from the DOM entirely.

4. **Event handlers:** `onPurchase` calls the appropriate driver method: `driver.levelUp(genId)` (LVL), `driver.buyGenerator(genId)` (BUY), `driver.buyAutoclicker(genId)` (AUTO).

5. **Cost ghost label:** a tooltip component positioned above the pill on hover/focus/long-press. No tooltip component exists today — this is net-new. Implement as a portal to avoid clipping by the row's `overflow`.

6. **Maxed shine sweep:** reuse the existing `@keyframes lvl-maxed-shine` and `::before` pseudo-element technique from `ux/generator-max-level-state.md` §5. All maxed elements share the same animation timing via a shared CSS custom property or synchronized keyframe start.

7. **All color tokens** are in `client/src/theme/tokens.css`. Verb color lanes need RGB channel exports (e.g., `--gen-chirps-rgb: 77, 158, 240`) if they don't exist yet — add them to Tier 1.

8. **Motion specs:** all durations and easings in §9 table.

9. **Reduced motion:** §8.5 — all animations disabled, state changes instant.

10. **Keyboard:** §8.1 — tab order LVL → BUY → AUTO, focus ring `--accent-gold`.

---

## 11. References

1. `proposals/accepted/20260406-three-track-purchase-row-layout.md` — layout decision (compact inline pills, grouped by verb)
2. `proposals/accepted/20260406-purchase-button-location.md` — location decision (Generators column)
3. `proposals/accepted/level-driven-manual-cooldown.md` — three-axis model
4. `ux/core-game-screen.md` §6.2 — generator row anatomy
5. `ux/purchase-feedback-and-rate-visibility.md` §5 — rate-flare on purchase
6. `ux/manual-action-ladder.md` §4.2–4.6 — badge, yield display, autoclicker float spec
7. `ux/generator-max-level-state.md` §2–5 — platinum token, maxed treatment, shine sweep
8. `ux/upgrade-curve-drawer-spec.md` — coexisting upgrade drawer
9. `ux/visual-identity.md` §2 — generator color lanes
10. `client/src/theme/tokens.css` — semantic token definitions

---

## 12. Open Questions

1. **BUY cost escalation visibility.** The BUY cost escalates exponentially (`1.15^count`). Should the cost ghost label show the next 2-3 costs on a mini-curve (like the upgrade drawer shows next 3 levels), or just the next cost? Showing a mini-curve would help the player plan, but adds complexity to the ghost label. **Owner: ux-designer (follow-up)**
2. **Autoclicker cap.** If a cap is introduced for autoclicker count per verb, the AUTO pill gains a maxed state. The visual treatment is specced (§3.3) but the cap value is not yet defined. **Owner: game-designer**
