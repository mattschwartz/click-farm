# Mobile Layout — UX Spec

> **Scope:** The mobile-specific adaptation of the core game screen and surrounding surfaces. Specifies canvas target, zone stack, section-by-section adaptations from the desktop spec, touch-specific interactions, and modal/drawer behaviors on small screens.
>
> **Structure:** This spec is written as a **diff** from the desktop specs. Sections reference their desktop counterparts; only mobile-specific changes are described in full. If a behavior is not explicitly modified here, assume it matches the desktop spec.
>
> **Implements:** `ux/core-game-screen.md` §14 (mobile deferral, rough sketch).
>
> **Parallels:** `ux/core-game-screen.md` (desktop layout), `ux/prestige-rebrand-screen.md`, `ux/upgrade-curve-drawer-spec.md`, `ux/purchase-feedback-and-rate-visibility.md`, `ux/settings-screen.md`.

---

## Decisions Taken in This Spec

1. **Portrait only at launch.** Landscape is deferred. Players who rotate their phones see a "rotate to portrait" prompt rather than a landscape layout. A landscape pass can happen post-launch if demand warrants.
2. **Canvas target: 375×812 (iPhone 12/13 class).** Supports 360–430px widths. Devices wider than 768px (tablets) fall back to the desktop layout.
3. **Algorithm mood stays full-background.** The §14 open question is resolved here: mood does not collapse into a top-strip element on mobile. The weather metaphor is preserved. A compact state-name chip lives in the top bar alongside other top-bar content.
4. **Post Zone is a fixed bottom bar, not floating.** A floating action button (FAB) pattern was considered and rejected — the post button is the primary interaction, and anchoring it as a full-width bottom bar prioritizes thumb reach and tactile presence over visual elegance.
5. **Platform strip is horizontally scrollable, not paginated.** Scroll is a better fit for idle glancing than swipe-between-pages. With 3 platforms at launch, they usually all fit on-screen anyway.
6. **Modals on mobile are bottom sheets, not centered overlays.** Thumb-reachable, dismissable via swipe-down. Exception: the Rebrand Ceremony is fullscreen (its theatrical weight justifies the context switch).
7. **Generator row height grows to 88px on mobile.** Extra vertical space accommodates touch targets and the dual-line row anatomy.

---

## 1. Canvas & Breakpoints

| Breakpoint | Layout |
|------------|--------|
| < 360px | Not supported. Minimum width is 360px. |
| 360px – 767px | **Mobile layout** (this spec). |
| 768px – 1279px | Desktop layout, scaled down. No tablet-specific layout at launch. |
| ≥ 1280px | Desktop layout (core-game-screen.md). |

**Reference canvas:** 375×812. All measurements in this spec are calibrated to this canvas. Adapt proportionally for 360–430px.

**Safe areas:** respect iOS/Android safe areas. Top bar content below the status bar notch; Post Zone above the home indicator.

---

## 2. Zone Stack (Portrait)

Vertical stack, top to bottom:

```
┌────────────────────────────┐  ← status bar safe area
│  TOP BAR            (72px) │
│  [mood] Eng  Fol    [⚙]   │
├────────────────────────────┤
│  PLATFORM STRIP     (96px) │  ← horizontal scroll
│  [Chirper][InstaSham][…]  │
├────────────────────────────┤
│                            │
│  GENERATOR LIST    (flex)  │  ← vertical scroll
│  ▸ Selfies ×3   [L][B][A] │
│  ▸ Memes ×1          [B] │
│  ▸ Hot Takes (locked)     │
│  ...                       │
│                            │
├────────────────────────────┤
│  PRESTIGE ROW      (48px)  │
│  [Upgrades]     [Rebrand] │
├────────────────────────────┤
│  POST ZONE         (96px)  │  ← fixed bottom
│  [        POST       +12] │
└────────────────────────────┘  ← home indicator safe area
  Background: algorithm mood (full-screen)
```

**Why this stack:**
- **Top bar stays top** — gravitational convention for status info
- **Platform strip below top bar** — secondary context, glanceable without scrolling
- **Generators flex** — the list absorbs all available height, the primary strategic surface
- **Prestige row is thin and between** — present without competing
- **Post Zone bottom** — thumb reach for the most frequent interaction

**Why Prestige row separate from Post Zone:** combining them would mean mixing a primary action (Post) with occasional actions (Upgrades, Rebrand). Mis-taps would be frequent. A thin row above the post bar separates the frequencies.

---

## 3. Top Bar (Compact)

**Desktop:** 80px tall, horizontal layout: [Algorithm] [Engagement] [Followers]

**Mobile:** 72px tall, compressed layout:

```
┌─────────────────────────────────────────────────┐
│ [mood chip]   Engagement   Followers     [⚙]    │
│              48px P0 num   20px P1 num          │
│              +6.8/sec      12.4K                │
└─────────────────────────────────────────────────┘
```

- **Mood chip (left):** 32px pill showing algorithm state name. E.g., `Short-Form Surge` in a colored chip. Text is 10px, uppercase, truncates with ellipsis if state name exceeds 14 characters.
- **Engagement (center-left):** count 32px weight 600, rate `+6.8/sec` 14px weight 500 directly below
- **Followers (center-right):** 20px weight 500
- **Settings gear (far right):** 24×24px icon, 44×44px hit area

**Rate display on mobile:** count and rate stack vertically in the center. This is the single biggest shift from desktop. The count shrinks from 48–56px to 32px; the rate stays at 14–16px. Together they occupy the vertical space that the desktop uses horizontally.

**Contrast:** P0 count at 15.8:1, P1 rate/followers at 7:1. Unchanged from desktop standards.

**Compact state name (the §14 open question answered):** the mood chip carries the state name. The mood *itself* stays in the background — the chip is just the label. This preserves the weather metaphor and gives the player a quick-glance text reference.

---

## 4. Platform Strip (Horizontal Scroll)

**Desktop:** 280px right-side panel with stacked cards.

**Mobile:** 96px horizontal strip below the top bar, containing horizontally-scrollable platform cards.

### 4.1 Card anatomy (mobile)

```
┌────────────────┐
│ Chirper        │  ← 12px weight 500
│                │
│  12,480        │  ← 20px weight 600
│   followers    │  ← 10px
│                │
│ 📸 📝 🎙  ▲+3.2│  ← chips + rate inline
└────────────────┘
```

- **Card width:** 140px
- **Card height:** 88px (fits in 96px strip with padding)
- **Card spacing:** 8px between cards
- **Scroll behavior:** horizontal scroll, snap-to-card on flick. With 3 cards at 140px + 16px padding, ~460px — all 3 fit without scrolling on most phones. Scroll-snap handles 4+ platforms if post-launch expansion happens.

**Why snap:** flicking between cards should feel decisive. Free scroll on small items creates visual noise.

### 4.2 Interaction

- **Tap card:** opens platform detail sheet (see §9 modal adaptations)
- **Swipe left/right:** scrolls the strip
- **Floating follower tick (`+2` per core-game-screen.md §7.2):** renders at the card's top-right corner when followers arrive — unchanged

### 4.3 Locked platform card

Same treatment as desktop §7.3, sized to mobile card dimensions. Unlock transition motion holds.

---

## 5. Generator List (Vertical Scroll)

**Desktop:** fixed-height center column, category dividers, scrolling only if list exceeds column.

**Mobile:** full-width vertical scroll, category dividers carry over, row height grows to accommodate touch.

### 5.1 Row anatomy (mobile)

Row height: **88px** (up from ~56px desktop).

```
┌──────────────────────────────────────────────────────┐
│  [badge]  Name                  ×N  [chip]           │  ← line 1 (28px)
│   40px    Rate /sec             [LVL] [BUY] [AUTO]  │  ← line 2 (20px + pills)
└──────────────────────────────────────────────────────┘
```

- **Badge:** 40px (up from 32px desktop) — easier to parse at arm's length
- **Line 1:** name + count + modifier chip
- **Line 2:** rate + purchase pills right-aligned. Passive-only generators show `[BUY]` only.

**Name weight:** 16px weight 500. Rate: 13px weight 500 (up from 14px@400 per purchase-feedback spec §2.2).

### 5.2 Purchase pills (mobile)

- **Size:** 44px min-width × 28px height per `ux/generator-purchase-pills.md` §7.
- **Position:** right-edge of row line 2, inline.
- **Labels:** on viewports < 360px, abbreviate to single-letter (L / B / A).
- **Tap:** fires purchase immediately (no drawer). Cost shown on long-press (300ms) ghost label.
- **Row tap (not on a pill):** opens Upgrade Drawer (see §9 for drawer adaptation on mobile).

### 5.3 Category dividers

Same as desktop §6.1 — `STARTER` / `MID` / `LATE` / `ABSURD` labels with stable ordering. Divider label is 11px uppercase, muted contrast, 24px padding above.

### 5.4 Generator breathing pulse

Per `purchase-feedback-and-rate-visibility.md` §6.2 and `proposals/draft/generator-badge-breathing.md` — unchanged on mobile. Breathing happens on the badge (40px on mobile), 2.5s uniform staggered cadence, still contained. Rate-coupled cadence was rejected — see badge breathing proposal for rationale.

### 5.5 Scroll behavior

- Standard vertical scroll
- Momentum + overscroll per platform defaults
- No sticky headers (category dividers scroll with content) — the list is short enough that stickies would add complexity without earning it

---

## 6. Prestige Row (New Zone)

A thin 48px row between the generator list and the Post Zone.

```
┌─────────────────────────────────────────┐
│  [  Upgrades  ]        [  Rebrand  ]    │
└─────────────────────────────────────────┘
```

- **Buttons:** 2 side-by-side, each 44px tall, width = (screen_width - 24px padding) / 2
- **Visual weight:** secondary — outlined or low-saturation fill, not primary-color solid
- **Spacing:** 8px gap between them, 12px horizontal padding

**Interactions unchanged:** Upgrades opens Clout Shop, Rebrand opens Rebrand Ceremony. Clout balance shown via long-press (replacing hover on desktop) — see §8.

**Locked state:** same 3:1 muted treatment as desktop, threshold label shown inline.

---

## 7. Post Zone (Fixed Bottom Bar)

**Desktop:** 320px left-anchored block with 260×220px button.

**Mobile:** full-width fixed bottom bar, 96px tall.

### 7.1 Anatomy

```
┌─────────────────────────────────────────┐
│                                         │
│     POST           +12                  │  ← press target
│     Selfie → Chirper                    │
│                                         │
└─────────────────────────────────────────┘
```

- **Bar height:** 96px
- **Tap area:** full width of bar (minus 12px horizontal padding) — the bar IS the button
- **"POST" label:** 28px weight 600, left-aligned with 24px padding
- **Sub-label ("Selfie → Chirper"):** 12px, muted, below POST
- **Delta number (`+12`):** 20px weight 500, right-aligned, matches generator semantic color

### 7.2 Press feedback

Same three-part grammar as desktop (press scale → brighten → commit). Because the bar is so large:
- **Press scale:** reduced to 0.99 (from 0.97 desktop) — at this size, 3% scale is visually jarring
- **Brighten:** 10% lightness bump, 150ms
- **Floating delta:** emerges from the tap location, drifts up toward the engagement count

**Tap location:** the floating number emerges from wherever the thumb actually tapped, not from a fixed center. Tactile attribution.

### 7.3 Rapid-tap handling

Per desktop §8.3 — each tap is discrete, no rate limiting, delta numbers stagger slightly to avoid overlap. Sound pool to survive browser throttling.

### 7.4 Auto-posting indicator

Per desktop §8.4 — once a generator is owned, sub-label updates to "Selfie → Chirper + auto". No other visual change. The player still taps to post; auto adds on top.

---

## 8. Touch-Specific Interactions

Desktop hover interactions must be replaced or removed on touch.

| Desktop | Mobile replacement |
|---------|--------------------|
| Hover Rebrand button → Clout-on-rebrand tooltip | **Long-press** (500ms) Rebrand button → same tooltip as a temporary popover |
| Hover Upgrades button → Clout balance tooltip | **Long-press** Upgrades button → popover |
| Hover purchase pill on generator row → cost ghost label | **Long-press** (300ms) on pill → ghost label above pill per `ux/generator-purchase-pills.md` §7.3. |
| Hover action row in upgrade drawer → tint bump | Removed. Action row is always visually distinguished. |

**Long-press feedback:** haptic (if supported) + scale 0.96 on the element. Popover appears after 500ms.

**Double-tap:** no double-tap interactions in the game. Avoid — conflicts with browser zoom.

---

## 9. Modal & Drawer Adaptations

### 9.1 Bottom sheets (default modal pattern on mobile)

Most modals adapt to **bottom sheets** on mobile:
- Slides up from bottom edge
- Width: full screen
- Max height: 75% of viewport (20% of viewport visible above sheet as dimmed backdrop)
- Dismiss: swipe down, tap backdrop, or tap ×

**Surfaces using the bottom-sheet pattern on mobile:**
- Clout Shop (desktop §3.1 was a centered modal — becomes bottom sheet)
- Offline Gains modal (desktop §11)
- Settings modal (per `ux/settings-screen.md` §2)
- Platform detail (tap-card on platform strip)
- Import Save confirmation (per `ux/settings-screen.md` §5.2)

### 9.2 Full-screen (ceremonial surfaces)

The **Rebrand Ceremony** is fullscreen on mobile, not a bottom sheet. Its four phases run as fullscreen states. The ceremony's theatrical weight justifies the context switch; making it a bottom sheet would dilute the beat.

Phase-by-phase adaptation:
- **Phase 1 (Threshold Review):** fullscreen card, scrollable if content exceeds viewport. "Cancel" and "Continue" buttons sticky at bottom.
- **Phase 2 (Eulogy):** fullscreen, stanzas center-justified
- **Phase 3 (Commit):** fullscreen, button centered, 88px tall (exceeds desktop 80px for thumb emphasis)
- **Phase 4 (Dissolution → Rebirth):** fullscreen, motion as specified in prestige-rebrand-screen.md §4.5

### 9.3 Upgrade drawer adaptation

Desktop drawer slides out from right of row. On mobile, there is no room to slide right — the row occupies full width.

**Mobile adaptation:** the upgrade drawer becomes a **bottom sheet** triggered from a row tap (not on a purchase pill — pill taps fire purchases directly per `ux/generator-purchase-pills.md`). Height: ~360px. Content identical to desktop drawer spec — header, current level readout, 3 level rows, close button.

**On-close-after-upgrade:** bottom sheet slides down (150ms). Row behind pulses + rate flares per purchase-feedback spec.

---

## 10. Going Viral on Mobile

Per desktop §9, adapted:

- **Counter acceleration:** unchanged — the counter is 32px on mobile, still the star
- **Particle burst:** scaled proportionally, emitted from the source row + arriving at the source platform card in the horizontal strip
- **Screen edge vignette:** edges of the full screen glow (not just the top bar) — the whole phone is the canvas
- **Zoom pulse (±1%):** unchanged, preserved (respects Reduce Motion)
- **Sound signature:** unchanged
- **Summary badge ("VIRAL +43,200"):** renders beneath the engagement count, 14px, 1.5s duration

**Source platform highlighting:** on desktop, the source platform card (right panel) is easy to highlight. On mobile, the platform is in the horizontal strip. If the source platform is currently off-screen in the strip, the strip auto-scrolls to bring it center-view during the viral event (300ms scroll, smooth).

---

## 11. Accessibility (Touch-Specific)

- **Touch targets:** all interactive elements ≥ 44×44px per WCAG 2.5.5. Purchase pills are 44px min-width × 28px height (row padding clears the 44px logical target). Platform cards large enough to tap without precision.
- **Reduced motion:** honors OS `prefers-reduced-motion` and in-game Reduce Motion toggle. Mobile-specific motion (bottom sheet slides) replaced with fades when enabled. Snap-scroll behavior preserved (it's ergonomic, not decorative).
- **Dynamic type:** respect OS font scaling. All font sizes specified here are at 100% scale; they scale proportionally. Layout must not break at 150% text scale — test at 1.5× during implementation.
- **Screen reader:** all screens navigable via VoiceOver/TalkBack. Platform strip announces as "Platform list, 3 items, horizontal scroll." Generator list announces each row's name, count, rate, upgrade availability.
- **Color independence:** all signals (modifier chips, insufficient states, boost/penalty) use text or glyph in addition to color — identical to desktop standards.
- **Contrast:** identical to desktop standards. P0 15.8:1, P1 7:1, P2 4.5:1, UI components 3:1.

---

## 12. Motion Brief (Mobile-Specific Additions)

Only mobile-specific motion is listed. All other motion carries from desktop specs.

| Element | Triggers | Duration | Easing | Communicates |
|---------|----------|----------|--------|--------------|
| Bottom sheet slide-up | Open modal/drawer | 280ms | ease-out | Surface appearing |
| Bottom sheet slide-down | Dismiss | 200ms | ease-in | Surface closing |
| Bottom sheet swipe-to-dismiss | Drag ≥60px down | tracks gesture | — | Player-controlled dismissal |
| Platform strip auto-scroll (viral) | Viral event, source off-screen | 300ms | ease-in-out | Bring source into view |
| Long-press popover | Hold 500ms | 150ms fade-in | ease-out | Tooltip equivalent |
| Post bar tap (reduced scale) | Tap | 60ms / 120ms | ease-out | Tactile confirm (scale 0.99) |
| Rotate-to-portrait prompt | Landscape detected | 200ms fade | ease-out | Rotate your device |

---

## 13. Landscape / Rotation Handling

Portrait is the only supported orientation at launch.

**On rotation to landscape:** display a fullscreen prompt:
```
┌──────────────────┐
│                  │
│    [↻ icon]      │
│                  │
│  Rotate to       │
│  portrait.       │
│                  │
└──────────────────┘
```

- No "continue in landscape" option at launch
- Game continues ticking in the background — rotation back to portrait returns the player to normal state
- Modal/drawer state is preserved across rotation
- Post-launch: revisit if usage data shows meaningful landscape demand

---

## 14. Open Questions

1. **Landscape layout.** This spec explicitly defers landscape. If post-launch data shows landscape demand, a follow-up spec is needed. **Owner: ux-designer (post-launch).**
2. **Tablet-specific layout (768–1279px).** This spec falls tablets back to the desktop layout. If tablet UX feels cramped or awkward, a tablet-specific pass may be needed. **Owner: ux-designer (post-launch observation).**
3. **Haptic feedback design.** Long-press triggers haptic (if supported). Should other actions (Post tap, Buy confirm, viral peak) have haptic signatures? Low-priority polish, flagged for consideration. **Owner: ux-designer (post-launch polish pass).**
4. **Notch/dynamic island interference with top bar.** On devices with aggressive notches, the top bar may have awkward safe-area padding. Engineer to test on notched devices during implementation. **Owner: engineer (build-time verification).**
5. **Scroll performance with generator breathing pulses.** If many rows are breathing simultaneously, will scroll performance degrade on mid-tier Android devices? **Owner: engineer (performance test at build).**
6. **Upgrade bottom sheet vs. expand-inline alternative.** Current spec uses bottom sheet for upgrade drawer. An alternative is inline expansion (row pushes subsequent rows down). This spec chose bottom sheet for consistency with other modals. Revisit if players find the sheet disruptive. **Owner: ux-designer (post-implementation observation).**

---

## 15. References

1. `ux/core-game-screen.md` — desktop layout this spec adapts from. Every section in this spec references a corresponding section in the desktop spec.
2. `ux/core-game-screen.md` §14 — original mobile sketch this spec formalizes.
3. `ux/prestige-rebrand-screen.md` — prestige flow adapted to fullscreen ceremony + bottom-sheet shop.
4. `ux/upgrade-curve-drawer-spec.md` — drawer spec adapted to bottom sheet on mobile.
5. `ux/purchase-feedback-and-rate-visibility.md` — rate flare, delta readout, breathing pulse — all preserved on mobile.
6. `ux/settings-screen.md` — settings modal adapted to bottom sheet.
7. WCAG 2.5.5 — touch target size minimum (44×44px).
8. Apple Human Interface Guidelines — safe area handling, dynamic type.
9. Material Design — bottom sheet patterns and motion.
