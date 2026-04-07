---
name: Landscape Phone Layout — Two-Column Reorganization
description: Defines the game screen layout for phones in landscape orientation, using a two-column verb/content split instead of compressing the desktop three-column layout.
created: 2026-04-07
author: ux-designer
status: accepted
reviewers: []
---

# Proposal: Landscape Phone Layout — Two-Column Reorganization

## Problem

The game currently has no mobile support. The desktop layout targets a 1280x800 canvas using a three-column grid (320px actions | flex generators | 280px platforms). On a phone in landscape, the canvas is approximately 812x375 (iPhone 12/13 class), 844x390 (iPhone 14), or 932x430 (Pro Max). After safe areas (~44px status bar, ~34px home indicator on notched devices), usable height drops to ~297-352px.

Compressing the desktop layout into this space was evaluated and rejected. The engagement counter — the emotional center of the game — would shrink from 64px to ~28px, losing its visual weight. Verb buttons at 60px tall lose their arcade-button physicality. Platform cards become unreadable. The result is functional but feels like a desktop site forced into a phone — not a surface designed for the device.

A separate portrait-mode spec exists (`ux/mobile-layout.md`) which vertically stacks zones. This proposal addresses landscape specifically, where the horizontal orientation invites a column-based layout closer to the desktop model but reorganized for extreme height constraints.

## Proposal

### 1. Breakpoint & Orientation Targeting

| Condition | Layout |
|-----------|--------|
| `(max-width: 932px) and (max-height: 500px) and (orientation: landscape)` | **This layout** |
| `(max-width: 767px) and (orientation: portrait)` | Portrait mobile (`ux/mobile-layout.md`) |
| Everything else | Desktop layout (unchanged) |

The `max-height: 500px` guard ensures tablets in landscape (which have ample vertical space) continue using the desktop layout. The `max-width: 932px` cap covers all current phone landscape widths.

**Reference canvas:** 812x375 (iPhone 12/13 landscape). All measurements calibrated here. Scales proportionally across 667-932px widths and 320-430px heights.

**Safe areas:** Landscape safe areas on notched iPhones add ~44px inset on the notch side (left in default landscape, varies by rotation direction) and ~34px on the home indicator side. Content must respect `env(safe-area-inset-left)`, `env(safe-area-inset-right)`, and `env(safe-area-inset-bottom)`.

### 2. Zone Map

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [icon] Click Farm    Engagement 12.4K  +6.8/s    42K followers    [gear]  │ ← top bar, 40px
├────────────────┬─────────────────────────────────────────────────────────┤
│                │  [Chirper 12.4K]  [PicShift 8.2K]  [Skroll 2.1K]      │ ← platform strip, 48px
│   [CHIRP]      ├─────────────────────────────────────────────────────────┤
│                │                                                         │
│   [SELFIE]     │  ▸ Selfies ×3    +2.4/s            [LVL] [BUY] [AUTO] │ ← generator list, flex
│                │  ▸ Memes ×1      +0.8/s                  [BUY]        │
│   [STREAM]     │  ▸ Hot Takes                             [BUY]        │
│                │  ▸ Viral Stunts (locked)                                │
│   [ghost]      │                                                         │
│                │                                                         │
├────────────────┴─────────────────────────────────────────────────────────┤
│  [Upgrades · 24 Clout]                                     [Rebrand]    │ ← prestige row, 36px
└──────────────────────────────────────────────────────────────────────────┘
```

**Grid definition:**

```
grid-template-rows: 40px 1fr 36px;
grid-template-columns: 160px 1fr;
```

- **Top bar** spans full width (both columns).
- **Verb column** (left, 160px) spans row 2 only.
- **Content area** (right, flex) contains platform strip (48px) stacked above generator list (remaining height).
- **Prestige row** spans full width (both columns), fixed at bottom.

On the 812x375 reference canvas with safe areas, the vertical budget is:
- Top bar: 40px
- Prestige row: 36px
- Content area: 375 - 44 (status) - 34 (home) - 40 (top) - 36 (prestige) = **~221px**
- Platform strip: 48px of that
- Generator list: **~173px** — room for 3-4 visible rows at 44px each, scrollable for more

### 3. Top Bar (Compact Landscape)

Single-row, 40px tall. Everything inline, no stacking.

```
[icon 28px] Click Farm   |   12.4K [eng-icon]  +6.8/s   |   42K followers   [gear]
```

- **Game icon:** 28x28px (down from 48px desktop). Keeps brand presence without eating height.
- **Title:** "Click Farm" / "Tap Farm" (per existing `pointer: coarse` detection). 18px Barlow Condensed 900 italic (down from 28px). RUN badge renders inline after title at 10px if present.
- **Engagement counter:** 28px weight 600, tabular-nums. The counter shrinks from its desktop 64px glory, but in landscape it shares the row with everything else — 28px is still the largest number on the top bar, preserving hierarchy.
- **Engagement rate:** `+6.8/s` inline after counter, 12px weight 500, accent-green. No vertical stack — horizontal space is available, vertical is not.
- **Followers:** 16px weight 500, right-aligned before gear.
- **Settings gear:** 20x20px icon, 40x40px hit area. Anchored right.
- **Engagement icon:** 24x24px (down from 40px), inline after the counter number.

**Engagement tooltip:** suppressed on touch. Rate is always visible inline, so the hover tooltip is redundant.

**Viral gold:** counter numerals still crossfade to gold during viral bursts. Summary badge renders as a temporary inline flash after the counter (not below it — no vertical room).

### 4. Verb Column (Left, 160px)

The Actions Column compresses into a narrow vertical strip. Each verb button renders as a compact card.

#### 4.1 Verb button anatomy (landscape)

```
┌──────────────┐
│  [verb image │
│   as bg]     │  ← 64px tall, 144px wide (160px - 8px padding each side)
│              │
│  CHIRP  +12  │  ← name + yield, bottom-anchored
└──────────────┘
```

- **Height:** 64px (down from 100px desktop). Preserves the colored-slab feel. At 64px with a 5-verb ladder, total verb height = 320px + gaps — fits in the ~221px content area with scrolling for the last 1-2 verbs.
- **Width:** 144px (column width minus 8px horizontal padding).
- **Background image:** verb-specific image covers the button, same as desktop. Grayscale during cooldown with color-sweep fill.
- **Name:** 18px Barlow Condensed 900 italic (down from 24px), bottom-anchored in the glass name strip.
- **Yield:** `+12` inline after name, 11px. Same as desktop.
- **Cooldown fill:** same `::before` linear-gradient sweep as desktop. No change to the mechanic.

#### 4.2 Spotlight verb

The most-recently-unlocked verb gets a subtle scale bump (1.02) and deeper shadow, same as desktop but proportional to the smaller size.

#### 4.3 Ghost slot

Next unlockable verb shows as a 64px slot with grayscale image and threshold text. Matches desktop behavior.

#### 4.4 Scroll

If more than ~3 verbs are live, the column scrolls vertically. Scrollbar hidden (`scrollbar-width: none`). Momentum scroll on touch.

#### 4.5 Floating numbers

Tap-feedback floats emerge from the button and drift upward. Contained within the verb column — they do not cross into the generator column. Scale proportionally (font sizes from `floatStyle()` capped at 24px instead of 32px to avoid overflow).

#### 4.6 Autoclicker badges

Inline with verb name in the glass strip, same as desktop. `x3` badge text at 11px.

### 5. Platform Strip (Top of Content Area)

A 48px horizontal row replacing the desktop's 280px stacked panel. Lives at the top of the right content column.

#### 5.1 Card anatomy

```
┌─────────────────────┐
│  Chirper    12.4K   │  ← 140px wide, 40px tall (48px strip - 4px padding top/bottom)
│  [affinity chips]   │
└─────────────────────┘
```

- **Card width:** 140px, matching the portrait mobile spec.
- **Card height:** 40px.
- **Name:** 11px weight 500, left.
- **Followers:** 16px weight 600, right of name.
- **Affinity chips:** 8px, bottom row, same chip style as desktop but smaller.
- **Card spacing:** 8px.
- **Total followers:** renders as a trailing element after the last card: `42K total` at 11px muted.

#### 5.2 Scroll & snap

Horizontal scroll with `scroll-snap-type: x mandatory`. With 3 platforms at 140px + gaps, total ~460px — fits without scrolling on most landscape phones (812px - 160px verb column = 652px available). Scroll-snap is there for 4+ platforms post-launch.

#### 5.3 Locked card

Same muted treatment as desktop, sized to mobile card dimensions. Threshold text in the card body.

#### 5.4 Viral illuminate

Source platform card edge-glows during viral bursts, same as desktop.

### 6. Generator List (Main Content Area)

Below the platform strip, filling remaining height. Full width of the right column.

#### 6.1 Row anatomy

Row height: **44px** (down from ~56px desktop).

```
┌────────────────────────────────────────────────────────────────────┐
│  [badge 28px]  Selfies  ×3    +2.4/s         [LVL] [BUY] [AUTO]  │
└────────────────────────────────────────────────────────────────────┘
```

- **Badge:** 28px (down from 32px desktop). Breathing pulse preserved.
- **Name:** 14px weight 500.
- **Count:** `x3` at 13px, inline after name.
- **Rate:** 12px weight 500, muted, after count.
- **Purchase pills:** right-aligned. 36px min-width x 24px height (smaller than desktop 44x28, but still meeting WCAG 2.5.5 with row padding providing logical target).
- **Pill labels:** full text (`LVL`, `BUY`, `AUTO`) on viewports > 750px. Single-letter (`L`, `B`, `A`) below 750px.

#### 6.2 Category dividers

Same `STARTER / MID / LATE / ABSURD` labels, 10px uppercase, 16px padding above (down from 24px desktop).

#### 6.3 Scroll

Vertical scroll, momentum, hidden scrollbar. ~173px visible height fits ~3-4 rows. The early game (2-3 generators) fits without scrolling; mid-game (5-8) requires scroll.

#### 6.4 Sweep button

"Buy All" button anchors at top of generator list (same position as desktop). Compact: 32px tall, full generator-list width.

### 7. Prestige Row (Fixed Bottom)

Full-width row, 36px tall, anchored at bottom above the home indicator safe area.

```
┌─────────────────────────────────────────────────────────────┐
│  [Upgrades · 24 Clout]                       [Rebrand +8]  │
└─────────────────────────────────────────────────────────────┘
```

- **Buttons:** 2, side-by-side, each 32px tall, flex distributed.
- **Visual weight:** secondary — outlined, same as desktop prestige cluster.
- **Clout balance:** shown inline on the Upgrades button (replaces hover tooltip — no hover on touch).
- **Rebrand preview:** shown inline on the Rebrand button (`+8 Clout`).
- **Locked state:** 3:1 muted, threshold inline.

This replaces the current `position: fixed; bottom: 16px; right: 16px` prestige cluster. On landscape phones, it flows into the grid instead of floating.

### 8. Modal Adaptations

Same as desktop (centered overlays), but `max-height` constrained:

- **Max height:** `calc(100dvh - 80px)` — 40px breathing room top and bottom.
- **Max width:** `calc(100vw - 80px)` — 40px breathing room left and right (respects safe areas).
- **Scroll:** modal body scrolls internally if content exceeds available height.
- **Rebrand Ceremony:** fullscreen on landscape phones (same as portrait mobile spec). Phases adapt to horizontal layout — stanzas left-aligned, buttons centered.

No bottom-sheet pattern on landscape — there's not enough height to make a 75%-viewport sheet feel like a sheet. Centered overlays with scroll work better here.

### 9. Touch Interactions

Same as portrait mobile spec (`ux/mobile-layout.md` §8):

| Desktop | Landscape phone |
|---------|-----------------|
| Hover engagement tooltip | Removed — rate visible inline |
| Hover purchase pill → cost ghost | Long-press (300ms) → popover above pill |
| Hover rebrand/upgrades → tooltip | Removed — clout/preview shown inline on buttons |
| Keyboard shortcuts (B, Esc) | Suppressed on `pointer: coarse` devices |
| Floating number from button center | From tap location (`Touch.clientX/Y`) |

### 10. Going Viral (Landscape Adaptation)

- **Counter acceleration:** unchanged. Counter is 28px but still the largest numeral on screen.
- **Particle burst:** emitted from the source generator row, drift rightward. Contained within the content area (do not cross into verb column).
- **Vignette pulse:** full-screen edges, same as desktop.
- **Zoom pulse (+/-1%):** preserved (respects Reduce Motion).
- **Summary badge:** inline flash after engagement counter, 12px, 1.5s duration.
- **Source platform highlight:** card in the horizontal strip glows. No auto-scroll needed — all 3 cards are usually visible in landscape.

### 11. Accessibility

- **Touch targets:** verb buttons 64x144px (exceeds 44x44). Purchase pills 36x24px but row padding provides 44px logical height. Prestige buttons 32px tall — pad to 44px logical with row padding.
- **Reduced motion:** all existing `prefers-reduced-motion` and `data-reduce-motion` rules carry over. No new animations introduced.
- **Dynamic type:** font sizes specified here are at 100% scale. Layout must not break at 125% text scale (lower threshold than portrait's 150% because height is already tight).
- **Contrast:** unchanged from desktop. P0 15.8:1, P1 7:1, P2 4.5:1, UI components 3:1.
- **Color independence:** unchanged.

### 12. What Changes in Code

| Area | Nature of change |
|------|-----------------|
| `GameScreen.css` | New `@media` block (~300-400 lines): grid redefinition, top bar compression, prestige row in-flow, generator row compression |
| `GameScreen.tsx` | Prestige cluster moves inside `<main>` grid for landscape (currently renders outside `<main>` as fixed overlay). Conditional class or grid-area assignment. |
| `TopBar.tsx` | Engagement tooltip suppressed on touch. RUN badge inline. Minor — mostly CSS. May need a `compact` prop or CSS handles it. |
| `ActionsColumn.tsx` | Verb button height and font sizes adapt via CSS. Float cap reduced. No structural JSX change — the column layout still works, just narrower/shorter. |
| `PlatformPanel.tsx` | Needs a horizontal layout mode. CSS `flex-direction: row` on the panel, compact card sizing. May need conditional rendering for the card anatomy (stacked → inline). |
| `GeneratorList.tsx` | Row height and badge size adapt via CSS. Pill label abbreviation via CSS (`@media` hides full label, shows abbreviation). |
| Modals | `max-height` constraint added via CSS. No structural change. |

**Not changed:** game logic, state management, data flow, sound, number formatting, save system.

## References

1. `ux/mobile-layout.md` — portrait mobile spec. This proposal is the landscape counterpart. Touch interactions (§8) and accessibility standards (§11) are shared.
2. `ux/core-game-screen.md` — desktop spec this layout adapts from.
3. `client/src/ui/GameScreen.css` — current desktop-only CSS (3,860 lines, zero responsive queries).
4. `client/src/ui/GameScreen.tsx` — main game screen component. Prestige cluster currently renders outside `<main>`.
5. Apple Human Interface Guidelines — landscape safe area insets on notched devices.

## Open Questions

1. **Verb column width: 160px vs. dynamic.** 160px is calibrated for the 812px reference canvas (160 + 652 content). On narrower phones (667px, iPhone SE landscape), 160px leaves only 507px for content. Should the verb column shrink to 130px on sub-750px landscape widths? **Owner: ux-designer.**
2. [RESOLVED] **Engagement counter at 28px — is this enough emotional weight?** The counter is the star of the game. At 28px in a 40px top bar, it's still the largest number, but it's a significant step down from 64px. Does the game-designer feel this preserves the "number is the reward" identity? **Owner: game-designer.**
   - Answer: 28px preserves the identity. At phone viewing distance (~12-14in), 28px subtends a similar visual angle to 64px at desktop distance. Emotional weight comes from relative dominance and animation behavior, not absolute pixel size. Both survive. (game-designer review)
3. **Verb button at 64px tall — does the arcade-button physicality survive?** The desktop button is 100px with a 4px depth shadow and spring-back transition. At 64px the depth proportions change. Does the press feel need re-tuning? **Owner: ux-designer (build-time verification).**
4. [RESOLVED] **Safe area testing on notched iPhones.** Landscape on iPhone 14 Pro has a Dynamic Island that creates an asymmetric top safe area. The top bar at 40px may collide. Needs device testing. **Owner: engineer (build-time verification).**
   - Answer: Dynamic Island creates a *side* inset in landscape (~59px on the notch side), not a top inset. The 40px top bar won't collide. The verb column may lose ~15px of its 160px width to `env(safe-area-inset-left)` — fix with `padding-left: env(safe-area-inset-left)` on the game screen container. Will verify at build time. (engineer review)
5. [RESOLVED] **Generator row pill sizing — WCAG 2.5.5 compliance at 36x24px.** The spec says 44x44px minimum touch target. We're relying on row padding for the logical target. Is this sufficient or do pills need to be 44px? **Owner: engineer (accessibility audit).**
   - Answer: 36x24px visual pills in 44px row height are compliant. WCAG 2.5.5 requires 44x44 CSS pixels for the target size including padding. The 44px row height provides the vertical logical target. No change needed. (engineer review)
6. **Interaction between portrait and landscape specs.** If a player rotates mid-session, state (modal open, sweep active, scroll position) must be preserved. The portrait spec shows a "rotate to portrait" prompt in landscape — this proposal replaces that with a real layout. The portrait spec's §13 needs updating. **Owner: ux-designer.**

---
# Review: game-designer

**Date**: 2026-04-07
**Decision**: Aligned

**Comments**

1. **Engagement counter at 28px (OQ #2):** 28px preserves the "number is the reward" identity. The counter's emotional power comes from being the largest numeral on screen combined with its animation behavior (interpolation, viral gold crossfade, rate ticker) — not from absolute pixel size. At phone viewing distance (~12-14in vs ~24in for desktop), 28px subtends a similar visual angle to 64px on desktop. Relative dominance and animation behavior are what matter, and both survive this spec. Marking OQ #2 resolved from the game-designer's perspective.

2. **Two-column verb/content split:** The spatial separation of "what I do" (left) from "what I own" (right) preserves the cause-and-effect readability that makes the core loop legible. Player taps left, numbers move right — that's the game's grammar. This layout keeps it intact.

3. **Platform strip compression:** Correct tradeoff. Platforms are information displays, not primary interactions. Giving them 48px while preserving full verb buttons and generator rows prioritizes the things the player actually touches.

4. **Prestige row in-flow:** Better than floating on this form factor. Inline clout balance and rebrand preview solve the no-hover problem cleanly — no information hidden behind untriggerable tooltips.

5. **Verb buttons at 64px (OQ #3):** No blocking opinion — the arcade feel comes from the spring-back transition and depth shadow as much as raw height. Deferring to UX designer's build-time verification.

Overall: the proposal correctly identifies what matters (verbs stay big, counter stays dominant, generators stay usable) and what can compress (platforms, prestige). The game's emotional hierarchy survives the landscape transition.

---
# Review: architect

**Date**: 2026-04-07
**Decision**: Aligned

**Comments**

1. **No game logic changes — correct scoping.** The proposal stays entirely in the presentation layer. Game loop, state management, data flow, save system, and all interface contracts from `core-systems.md` are untouched. No new data, no new state, no new coupling. This is where a layout proposal should live.

2. **Breakpoint strategy is sound.** Three layout paths (landscape phone, portrait phone, desktop) gated by CSS media queries with a `max-height: 500px` guard to exclude tablets. The conditions are mutually exclusive by construction. No runtime JS layout switching needed — the browser handles it.

3. **Prestige cluster structural change is correctly identified (§12).** This is the one JSX change: the prestige cluster currently renders outside `<main>` as `position: fixed; bottom: 16px; right: 16px`. For landscape, it moves into the CSS grid as an in-flow row. A conditional `className` or `grid-area` assignment handles this cleanly. Small change, clear migration path.

4. **PlatformPanel horizontal mode should be CSS-only.** The current `PlatformPanel.tsx` renders cards in a map loop with no layout assumptions baked into the JSX. Switching to `flex-direction: row` with compact sizing via the media query should work without conditional rendering or a `compact` prop. Push for CSS-only unless build-time testing proves otherwise — it keeps the component unaware of which layout it's in.

5. **CSS estimate in §12 is optimistic (non-blocking).** The ~300-400 line estimate for the new `@media` block will likely land at 500-600 lines once all specificity overrides for animations, floating numbers, state-specific rules, and the prestige cluster are accounted for. `GameScreen.css` is 3,860 lines with significant depth. Not a design concern — flagging for task estimation accuracy.

6. **Pill label abbreviation (§6.1) — implementation note (non-blocking).** The `LVL`/`BUY`/`AUTO` → `L`/`B`/`A` switch at sub-750px is the right call. Recommend either a CSS `content` replacement via pseudo-elements or a show/hide two-span pattern. Either works without JS. Noting so the engineer knows the expected approach upfront.

7. **OQ #6 (portrait ↔ landscape state preservation) — low risk.** React's component tree does not remount on CSS media query changes. Modal state, sweep state, and game state are held in React state and survive layout transitions. Scroll positions may reset when containers change shape — acceptable. The portrait spec's §13 "rotate to portrait" prompt should be removed as a follow-up task when this lands.

No blocking concerns. The implementation path is clear: one large CSS media block, one small conditional in `GameScreen.tsx` for prestige placement, and sizing overrides on existing components.

---
# Review: engineer

**Date**: 2026-04-07
**Decision**: Aligned

**Comments**

1. **Prestige cluster JSX change — recommend moving inside `<main>` unconditionally.** The prestige cluster currently renders after `</main>` (GameScreen.tsx ~line 449) with `position: fixed`. Rather than conditionally placing it inside or outside `<main>` based on layout, move it inside `<main>` for all layouts and use CSS to switch between `position: fixed` (desktop) and `grid-area` in-flow (landscape). One DOM location, two CSS presentations. Avoids conditional JSX and prevents the prestige cluster from existing in two possible DOM positions.

2. **PlatformPanel — agree with architect, push for CSS-only.** The current `PlatformPanel.tsx` renders cards in a `.platform-panel` flex-column container. Switching to `flex-direction: row` with compact sizing inside the landscape media query should work without a `compact` prop or conditional rendering. If the card's internal markup can't be restyled inline-only via CSS, that's a build-time discovery, not a design-time decision.

3. **CSS file size (non-blocking).** `GameScreen.css` is 3,864 lines with 21 `prefers-reduced-motion` blocks and zero responsive queries. Adding a ~500-600 line landscape `@media` block means every animation override needs a nested `prefers-reduced-motion` variant inside the landscape block. Not a reason to change the proposal — the file needs a structural split eventually, but that's a separate refactor.

4. **OQ #4 (safe area testing):** The Dynamic Island on iPhone 14 Pro creates a side inset in landscape (~59px on the notch side), not a top inset. The 40px top bar won't collide. The real risk is the verb column losing ~15px of its 160px width to `env(safe-area-inset-left)` on the notch side. Correct fix is `padding-left: env(safe-area-inset-left)` on the game screen container. Will verify at build time — no design change needed.

5. **OQ #5 (pill WCAG 2.5.5 compliance):** 36x24px visual pills with 44px row height providing the logical target is compliant. WCAG 2.5.5 requires 44x44 CSS pixels for the target size, which includes padding. As long as the row's touch target extends to 44px vertically (which it will with the 44px row height), no change needed.

6. **Pill label abbreviation (§6.1):** The `LVL`/`BUY`/`AUTO` → `L`/`B`/`A` switch will use a show/hide two-`<span>` pattern inside the media query. No JS needed.

7. **CSS estimate correction (agreeing with architect):** The §12 estimate of 300-400 lines will land at 500-600 once specificity overrides for animations, floating numbers, state-specific rules, and nested `prefers-reduced-motion` blocks are accounted for. Flagging for task estimation accuracy.

No blocking concerns. Implementation path is clear and well-specified.
