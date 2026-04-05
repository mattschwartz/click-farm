# Creator Kit Panel — UX Spec

> **Scope:** Defines placement, open/close interaction, peek-signal affordance, visual weight, icon set, flavor copy, and first-run behavior for the Creator Kit per-run upgrade panel. The five kit items (Camera, Laptop, Phone, Wardrobe, Mogging) are purchased with Engagement and wiped on rebrand.
>
> **Not in scope:** Kit item stat values, cost curves, level counts, or balance parameters (game-designer balance pass). State model and data contract for kit upgrade effects (architect). Kit-wipe moment in the rebrand ceremony (flagged to rebrand ceremony spec in the ux-designer review of `proposals/draft/creator-kit-upgrades.md`).
>
> **Implements:** `proposals/draft/creator-kit-upgrades.md` — OQ6 (menu placement) and OQ7 (icons and copy) resolved in that proposal and carried forward here.
>
> **Against contract:** Kit rows render from `StaticData.creatorKit.items[id]` — cost, levels, and effects are StaticData-driven. Current level read from per-run player state (structure TBD by architect; spec assumes it exposes `currentLevel` and `maxLevel` per item, and `nextLevelCost` or equivalent).
>
> **Integrates with:** `ux/core-game-screen.md` (screen zone layout, generator list column), `proposals/accepted/clout-upgrade-menu.md` (structural template for multi-level upgrade rows)

---

## Decisions Taken in This Spec

1. **Dedicated collapsible panel, not inline with the generator list.** Kit items share the visual grammar of generator upgrades (multi-level, Engagement-priced). Placing them in the same scroll forces the player to parse "is Camera L3 a generator peer or a generator modifier?" Separation preserves the generator list's role as the first-glance primary loop. This is the decision from OQ6 of the parent proposal.
2. **Panel always defaults to collapsed on load.** Including the first-ever run. The peek-signal — not the panel — is the mechanism for first discovery. The collapsed strip is always visible; it establishes "this thing exists" without front-loading five new rows onto a player still learning the core loop.
3. **Peek-signal is kit-exclusive.** Generator affordability is already communicated through the Lvl↑ button affordance states on each generator row (per `proposals/accepted/lvl-up-button-three-affordance-states.md`). Adding a currency-readout signal for generators on top of that would create two signals at one location. The peek-signal at the currency readout is reserved for kit — the system the player is least likely to discover unprompted.
4. **Kit rows use a smaller type scale and more receded visual treatment than generator rows throughout.** Generator rows are the primary decision surface; kit rows are a secondary decision surface. The visual hierarchy must reflect this at every size and color choice. Any future change that increases kit row visual weight must be reviewed against the generator list contrast relationship.
5. **Flavor copy is a draft pending game-designer review.** The copy written here delivers the satirical-but-warm register and follows the game's parody-with-affection voice. It should be treated as a working draft — the game-designer should review phrasing before ship. Direction is locked; wording is not.

---

## 1. Screen Position — Generator-List Column

The Creator Kit panel lives at the **bottom of the generator-list column**, below the last generator row, as a **sticky footer** within that column.

```
┌──────────────────────────────────────────────────────┐
│  TOP BAR — Engagement, Followers, Clout, Rebrand     │
├─────────────────┬────────────────────┬───────────────┤
│  POST ZONE      │  GENERATOR LIST    │  ACTIONS COL  │
│  (left column)  │                    │               │
│                 │  Selfies       →   │  Alg. Mood    │
│  POST           │  Memes         →   │               │
│  +12            │  Hot Takes     →   │  Scandal(s)   │
│                 │  Tutorials     →   │               │
│  rate display   │  Livestreams   →   │               │
│                 │  ...               │               │
│  [Gig card]     ├────────────────────┤               │
│                 │  CREATOR KIT   ⌄   │  ← Sticky     │
│                 │  ──────────────    │    footer     │
└─────────────────┴────────────────────┴───────────────┘
```

**Sticky behavior:** the panel header strip is always visible at the bottom of the generator-list column without scrolling, regardless of list length. The generator list scrolls above it; the kit panel strip does not scroll away. This ensures the peek-signal's pairing with the collapsed header is always discoverable.

**Vertical boundary:** the strip sits flush against the bottom edge of the generator-list column. If the generator list is shorter than the column (early game, few generators unlocked), the strip still anchors to the column bottom.

**No horizontal collision with the Actions column.** The kit panel occupies the full width of the generator-list column only. It does not extend into the Actions column and does not affect it.

---

## 2. Collapsed State

The collapsed strip is the default and resting state of the panel.

### 2.1 Collapsed anatomy

```
┌──────────────────────────────────────────────────────┐
│  [kit icon]  CREATOR KIT           2 active    ⌄     │
└──────────────────────────────────────────────────────┘
```

| Element | Spec |
|---------|------|
| Height | 36px |
| Background | Panel color, no fill distinction from column background |
| Top border | 1px solid divider color (same hairline as between generator rows) |
| Hit area | Full 36px strip — tap anywhere to expand |
| Label "CREATOR KIT" | 10px uppercase, weight 500, kit accent color (`#6868b8`) at 70% opacity |
| Chevron ⌄ | 12px, right-aligned, same muted kit accent, rotates on expand |
| Count label "N active" | 9px, weight 400, neutral muted text — shows count of kit items at L1 or above; "0 active" on fresh run; hidden when N=0 (first-ever load, panel is new) |
| Left-edge accent | None in collapsed state. The collapsed strip does not carry an accent stripe — it does not compete with generator rows that do. |

The count label communicates "there's state here" to a returning player without requiring them to open the panel. A player on run 4 who sees "2 active" knows they had Camera and Wardrobe last run — but that's wrong context, because kit is wiped on rebrand. The count label therefore shows current run state: it reads 0 after rebrand until the player purchases something this run.

### 2.2 Peek-signal in collapsed state

When the peek-signal is active (see §5), the collapsed strip gains a subtle left-edge stripe:

- **Left-edge stripe:** 3px, kit accent color `#6868b8` at 50% opacity
- **Appears:** simultaneously with the peek-signal appearing at the currency readout (§5)
- **Clears:** simultaneously with the peek-signal clearing

This stripe is a secondary reinforcement. The primary peek-signal lives at the currency readout — the stripe is backup for players whose gaze is already on the generator-list column.

---

## 3. Expanded State

### 3.1 Expanded anatomy

```
┌──────────────────────────────────────────────────────┐
│  [kit icon]  CREATOR KIT                       ∧     │  ← header strip (36px)
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  ┤
│  [📷]  Camera      Better glass. Better content.     │
│        L0 → L1                       220 eng   [▲]   │  ← kit row (40px)
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  ┤
│  [💻]  Laptop      You're analyzing trends.          │
│        L0 → L1                       350 eng   [▲]   │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  ┤
│  [📱]  Phone       Always online. Always.            │
│        L0 → L1                       180 eng   [▲]   │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  ┤
│  [👔]  Wardrobe    Dress like a creator. Become one. │
│        L0 → L1                       280 eng   [▲]   │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  ┤
│  [💪]  Mogging     When going viral isn't enough.    │
│        L0 → L1                       400 eng   [▲]   │
└──────────────────────────────────────────────────────┘
```

**Total expanded height:** 36px header + (5 × 40px rows) + (4 × 1px hairlines) = 240px. Panel pushes down the page below it (if the column is inside a scroll container) or expands the column height.

### 3.2 Kit row anatomy

Each item occupies 40px. Internal layout (two micro-rows within 40px):

**Micro-row 1 (top 20px):** icon + item name + flavor copy
- **Icon:** 14px glyph, kit accent at 60% opacity, left-aligned with 12px left padding
- **Item name:** 11px, weight 500, full contrast text (4.5:1), 6px left of icon
- **Flavor copy:** 10px, weight 400, muted text (60% opacity of base text), italic, truncated with ellipsis if overlong. Same line as item name on desktop (right of name), wraps below icon on narrow layouts.

**Micro-row 2 (bottom 20px):** level indicator + cost + purchase button
- **Level indicator:** "L0 → L1" (or "L2 → L3" etc.) — 10px, weight 400, muted. When at max level: "MAX" in muted text, no arrow.
- **Cost:** Engagement cost of next level — 10px, weight 500, muted text. Right-aligned. Hidden when item is at max level.
- **Purchase button [▲]:** compact upward chevron in a 22×22px tap target, right-aligned. Three affordance states:

| Button state | Condition | Appearance |
|---|---|---|
| Affordable | Engagement ≥ cost | Kit accent `#6868b8` at full opacity. Tap purchases. |
| Unaffordable | Engagement < cost | Kit accent at 25% opacity. Not interactive (visual only). |
| Max level | Item at max | Button absent. Level indicator shows "MAX". |

**Row background:** panel color — no fill, no stripe. The row does not compete with generator rows which carry their own left-edge stripe identifiers.

**Row divider:** 1px hairline between items, same muted divider as between generator rows but at 60% opacity (lighter, to reinforce the secondary hierarchy position of the panel).

### 3.3 Visual weight — explicit comparison

| Element | Generator rows | Kit rows | Rationale |
|---------|---------------|----------|-----------|
| Item name type size | ~14px | 11px | Kit names are smaller across the board |
| Item name weight | 500–600 | 500 | Same weight, smaller size = less mass |
| Item name color | Full contrast | Full contrast 4.5:1 | Both legible; size carries the hierarchy difference |
| Description/flavor | ~12px, moderate | 10px, italic, 60% opacity | Deliberately quieter |
| Level indicator | Full Lvl↑ button (per affordance spec) | Compact [▲] 22px | Different element shape entirely — not the same button |
| Row height | ~52px (inferred) | 40px | 25% shorter — kit list is more compact |
| Row left-edge stripe | Present (generator identity) | Absent | Stripe absence signals "not a generator" |
| Row background | Panel default | Panel default | No fill added — kit rows do not elevate |

The visual weight rule: a player who glances at the screen and looks away should be able to reconstruct that "there are generators above a smaller section of other things." The kit panel MUST NOT compete for that first glance.

---

## 4. Open / Close Interaction

### 4.1 Trigger

- **Desktop:** Click anywhere on the collapsed/expanded header strip (36px, full width). The header strip is always the toggle target.
- **Mobile:** Same — tap the header strip.
- **Keyboard:** Header strip focusable via Tab. Enter or Space toggles.

### 4.2 Expand transition (collapsed → expanded)

1. **Height:** 36px → 240px over 220ms, `ease-out`. Panel grows downward.
2. **Chevron:** Rotates ⌄ → ∧ (0° → 180°) over 220ms in sync.
3. **Kit rows:** Fade in — `opacity 0 → 1.0` over 140ms, beginning at t=80ms of the expansion (front-loaded to the second half of the height transition so rows don't appear in a half-open panel).

### 4.3 Collapse transition (expanded → collapsed)

1. **Kit rows:** Fade out — `opacity 1.0 → 0` over 80ms beginning immediately at collapse trigger.
2. **Height:** 240px → 36px over 220ms, `ease-out`. Begins at t=60ms (rows mostly gone before height contracts).
3. **Chevron:** Rotates ∧ → ⌄ over 220ms in sync with height.

The row fade-then-height-contract sequencing prevents the rows from being visible in a half-collapsed container, which reads as broken.

### 4.4 Default and persistence

| Context | Default state | Reason |
|---------|--------------|--------|
| First-ever game load (pre-first-rebrand) | Collapsed | New player is already processing generators, algorithm mood, Gig cards, and currency. Five new kit rows on first load crosses the no-tutorial threshold. |
| After any rebrand | Collapsed | Kit is wiped on rebrand — re-expanding to a list of L0 items reads as "here's a thing you haven't started" which is correct onboarding. Collapsed-to-discover is the right flow. |
| Game reload within a run | Collapsed | Simple and consistent. Kit state is already visible in the count label ("N active") without opening. |
| Within a session | Remembers last state | If the player explicitly opened the panel and closed the game (tab close, not rebrand), re-opening restores the panel to its last state. Prevents annoying re-discovery for an engaged player. |

**No persistence of "expanded" state across rebrands.** Even if the player had the panel open at rebrand time, they see it collapsed at the start of the next run.

---

## 5. Peek-Signal Affordance

### 5.1 Trigger condition

The peek-signal is active when:
> `current Engagement ≥ min(nextLevelCost for all kit items where currentLevel < maxLevel)`

In plain terms: when the player can afford the cheapest available kit upgrade. The signal does not distinguish which item — it signals "something in the kit is purchasable now." The player must open the panel to see which.

**Kit-exclusive:** the peek-signal does NOT fire for generator-unit affordability. Generator affordability is communicated through the Lvl↑ button affordance states on each generator row. Two signals for the same Engagement balance at the currency readout would degrade both signals. The kit signal is reserved and meaningful because it fires exclusively.

### 5.2 Primary signal — currency readout

Position: **below the Engagement counter value** in the top bar. A secondary annotation appears when the condition is met:

```
  Engagement
   12,480
  ↑ kit
```

| Element | Spec |
|---------|------|
| Text | "↑ kit" — upward arrow + word, lowercase |
| Size | 9px, weight 400 |
| Color | Kit accent `#6868b8` at 65% opacity |
| Position | Below the Engagement value, same left alignment |
| Appear transition | Fade in over 300ms. No pulse, no bounce. |
| Disappear transition | Fade out over 200ms when condition clears. |

**Static, not pulsing.** The signal appears and stays. It does not flash or pulse on a timer — pulsing signals urgency. This is an affordance, not an alarm. The player who sees it understands "I can afford something in the kit." They act when ready.

### 5.3 Secondary signal — collapsed panel header

When the peek-signal is active, the collapsed kit panel strip gains a left-edge accent stripe (§2.2). This is a passive backup for players already looking at the generator-list column when the condition triggers.

### 5.4 Signal clearing

The peek-signal clears (fades out) when:
- `current Engagement < nextLevelCost for all affordable items` — i.e., the player spent enough that nothing in the kit is affordable anymore
- All kit items are at max level — nothing left to purchase

The signal does NOT clear just because the player opened the panel. Opening the panel reveals which items are affordable; closing it without purchasing leaves the signal active if the condition still holds. The signal is an ongoing state indicator, not a one-time notification.

---

## 6. Icons

One glyph per item at list-row scale (14px). Single-color, rendered in kit accent at 60% opacity. Not emoji — UI glyphs from the project's icon set.

| Item | Semantic | Description |
|------|---------|-------------|
| Camera | camera / lens | Camera body silhouette with lens circle. "Photography tool." Not a phone camera — a proper camera with a distinct lens shape. |
| Laptop | laptop / screen | Laptop silhouette, screen open at ~110°. Must read as "computer" not "phone." |
| Phone | phone silhouette | Rectangular smartphone, portrait. Distinct from Camera's lens and Laptop's open-lid shape. |
| Wardrobe | clothes hanger | Single hanger silhouette, hook at top, triangular bar below. Reads as "clothing/style" immediately. Alternative: jacket/blazer outline if hanger is too abstract at 14px. |
| Mogging | flexed arm / muscle | Classic flexed-bicep silhouette. Immediately reads as "physical dominance / strength" — the correct semantic for "mogging" without requiring the player to know the term. |

Final asset selection follows the same rule as gig card icons (§2.1 of `ux/gig-cards.md`): engineer chooses closest match from the available icon set. Flag to ux-designer if no strong match exists for any item.

---

## 7. Flavor Copy

One short line per item. Displayed in the kit row as muted secondary text (§3.2). Voice: satirical-but-warm, parody-with-affection. The joke is the creator's earnest self-seriousness, not the creator as a target. The player is the protagonist — the satire is on the system, not on them.

**Format constraint:** ≤45 characters. One line, no wrap.

> **Draft status:** These lines are authored by ux-designer for tone and format fit. Game-designer review is requested before ship — any line that reads as punching down rather than affectionate satire should be flagged and revised.

| Item | Flavor copy | Character |
|------|------------|-----------|
| Camera | *"Better glass. Better content. Allegedly."* | Dry, mock-earnest. The "Allegedly" deflates the self-justification. |
| Laptop | *"You're analyzing trends. Definitely."* | Ironic affirmation. The player knows they're probably just browsing. |
| Phone | *"Always connected. Always online. Always."* | Three-beat rhythm. The third "Always" tips into comedy — a little too much. |
| Wardrobe | *"Dress like a creator. Become one."* | Earnest, slightly absurd advice. Actually good advice, which is the joke. |
| Mogging | *"When going viral isn't enough."* | Escalation. Assumes the player is already going viral. Of course they are. |

**Tone guidance for future additions or revisions:**
- Lines SHOULD read as advice or product description, not commentary on the player
- The humor lives in the gap between the mundane item and the outsized claim — Camera doesn't just take photos, it makes your content *better* (allegedly)
- Lines MUST NOT imply the player is doing something embarrassing. The player is a creator. The game respects that fiction even while satirizing it.

---

## 8. First-Run Cognitive Load

The no-tutorial test for the Creator Kit panel:

**What a first-run player sees at game load:**
- Collapsed panel strip (36px): "CREATOR KIT ⌄ 0 active" — present but quiet
- No expanded rows, no prompts, no callout

**What a first-run player sees before they can afford anything:**
- The collapsed strip sits at the bottom of the generator column, unremarkable
- No peek-signal fires (they can't afford anything yet)
- The player focuses on generators, algorithm mood, and the Post button — the actual tutorial-free onboarding surface

**What a first-run player sees when they first cross an affordable threshold:**
- Peek-signal appears: "↑ kit" below the Engagement counter
- Collapsed header stripe appears: 3px accent stripe on the panel strip
- Player curiosity is engaged: "What's 'kit'?"
- Player taps the strip: panel expands, rows appear, first affordable item's purchase button is lit

**First-run cognitive load budget:**
The kit contributes exactly: one 36px strip in the bottom of the generator column, plus eventually a 9px annotation below the Engagement counter. This is the minimum possible footprint for a system with five items. It respects the no-tutorial test: the player discovers the kit because an affordance pointed them there, not because a tutorial appeared.

**What the no-tutorial test requires of this design:**
A first-time player who opens the panel for the first time (prompted by the peek-signal) should understand: "I can buy upgrades here with Engagement, they cost different amounts, and I can only afford some right now." The kit row anatomy delivers this: icon + name (what it is) + flavor (what it does, obliquely) + cost + affordance state (can I afford it?). No instructions needed.

**The one risk:** a player who opens the panel, sees five items and no explanation of *what they do*, and closes it without understanding. Mitigation: the flavor copy functions as a one-line description of effect. "Better glass. Better content." is enough to understand Camera boosts content quality/production. "When going viral isn't enough." is enough to understand Mogging amplifies burst moments. The player doesn't need the stat — they need the decision frame. The flavor copy is that frame.

---

## 9. Accessibility

**Contrast:**

| Element | Minimum required | Notes |
|---------|----------------|-------|
| Item name (11px, weight 500) | 4.5:1 | Full contrast — primary data on the row |
| Flavor copy (10px, italic, 60% opacity) | 4.5:1 measured rendered | At 60% opacity on panel background; measure actual rendered value. If it fails, increase to 75% opacity. |
| Level indicator (10px, 400) | 4.5:1 | Muted, but legible |
| Cost label (10px, 500) | 4.5:1 | Same |
| Purchase button [▲] in affordable state | 3:1 UI component | Kit accent `#6868b8` against panel background |
| Purchase button in unaffordable state (25% opacity) | Not required to pass | Non-interactive. Presence communicates "button exists here but inactive." If 25% is invisible, increase to 35%. |
| Header label "CREATOR KIT" (10px, 500, 70% opacity) | 3:1 | At 70% opacity; measure rendered value. |
| Peek-signal "↑ kit" (9px, 400, 65% opacity) | Not required to pass 4.5:1 | This is a supplementary signal. Must not fail to the point of invisibility. If measured contrast <2:1 against top bar background, increase opacity. |

**Color independence:** The kit accent color is never the sole differentiator. Affordable/unaffordable button state pairs color with button presence (✓ present + lit vs. present + dimmed) and with cost label (shown vs. absent at max). CVD simulation: `#6868b8` is a blue-violet and should be distinct from the game's green (corporate, Gigs) and amber (risk) lanes under protanopia and deuteranopia. Verify before ship.

**Keyboard:**
- Panel header: Tab-focusable, Enter/Space to toggle
- Kit row purchase buttons: Tab-navigable when panel is expanded
- Screen reader announcements:
  - Header (collapsed): "Creator Kit, 2 items active, collapsed. Press Enter to expand."
  - Header (expanded): "Creator Kit, expanded. Press Enter to collapse."
  - Purchase button (affordable): "Camera, Level 0 to 1. Cost: 220 Engagement. Press Enter to purchase."
  - Purchase button (unaffordable): "Camera, Level 0 to 1. Cost: 350 Engagement. Not enough Engagement."
  - Purchase button (max): "Wardrobe, Max level."

**Reduce Motion:**
- Expand/collapse: height transition collapses to snap (no animation). Kit rows appear/disappear without fade.
- Chevron rotation: snaps to final state.
- Peek-signal: appears/disappears without fade.

---

## 10. Motion Brief

| Element | Trigger | Duration | Easing | Communicates |
|---------|---------|----------|--------|--------------|
| Panel expand (height) | Tap header (collapsed) | 220ms | ease-out | Panel opening |
| Panel collapse (height) | Tap header (expanded) | 220ms | ease-out | Panel closing |
| Kit rows fade-in | During panel expand | 140ms, starts at t=80ms | ease-out | Rows arriving |
| Kit rows fade-out | During panel collapse | 80ms, starts at t=0 | ease-out | Rows leaving before container closes |
| Chevron rotation | Any toggle | 220ms in sync | ease-out | Direction indicator updating |
| Peek-signal appear | Affordability threshold crossed | 300ms | ease-out | "Something is available" |
| Peek-signal disappear | Affordability condition clears | 200ms | ease-out | Signal no longer relevant |
| Header stripe appear | With peek-signal | 300ms | ease-out | Secondary reinforcement |
| Header stripe disappear | With peek-signal clears | 200ms | ease-out | |

---

## 11. Mobile Adaptation

The generator-list column on mobile is a vertical scroll that takes the full screen width (minus any fixed chrome). The kit panel continues to anchor to the bottom of this column:

- Collapsed strip spans full screen width, same 36px height
- Expanded panel pushes content below it down within the scroll (not a fixed overlay)
- Peek-signal remains in the top bar, below the Engagement counter, same spec as desktop
- Row width: full column width minus standard 16px horizontal padding

No additional mobile-specific behavior. The generator-list column's responsive behavior (handled in `ux/core-game-screen.md`) governs the column width; the kit panel follows it.

---

## 12. Open Questions

1. ~~**Should the panel default to collapsed or open on first-ever run?**~~ **[RESOLVED — ux-designer, 2026-04-05]** Collapsed always. Including first run. See §4.4 and §8 for full rationale. The peek-signal is how first discovery is prompted; the collapsed strip is how the player knows the panel exists.

2. ~~**Does the peek-signal fire for generator-unit affordability, or is it kit-exclusive?**~~ **[RESOLVED — ux-designer, 2026-04-05]** Kit-exclusive. Generator affordability is already served by the Lvl↑ button affordance states on each generator row. Adding a currency-readout signal for generators would create two signals at one location, degrading both. See §5 for the full peek-signal spec.

3. **Kit accent color validation.** `#6868b8` is specified as the kit accent. This must be confirmed against the full visual identity color system (`proposals/accepted/visual-identity-light-mode-and-color-system.md`) before ship — it must be distinct from all existing color lanes (corporate green, viral gold, risk amber, algorithm mood palette). If the color system has already allocated blue-violet to another element, the kit accent should shift. **Owner: ux-designer (validate against color system before ship; substitute if conflicting)**

4. **Flavor copy game-designer review.** The five flavor lines in §7 are a draft authored by ux-designer. They deliver the correct tone and format. Game-designer should review for character fit (any line that reads as punching down rather than affectionate satire should be flagged). **Owner: game-designer (copy pass before ship)**

5. **Peek-signal at 9px — legibility on physical screens.** 9px at standard screen density is 12dp on retina — small. If the top bar is already information-dense on mobile, the "↑ kit" label may be too small to be noticed at a glance. Contingency: increase to 10px, or replace the text with a dot indicator (●) at 8px. Engineer to validate on physical device at common screen sizes and flag if too small. **Owner: engineer (validate; flag to ux-designer if adjustment needed)**

6. **Kit row height on narrow viewports.** At 40px row height with two micro-rows of 10–11px text, very narrow viewports (below ~320px) may clip flavor copy. The flavor copy line may be removed on narrow layouts if it causes overflow — item name + level indicator + cost is the minimum viable row. **Owner: engineer (implementation call)**

---

## 13. References

1. `proposals/draft/creator-kit-upgrades.md` — parent proposal; five kit items, economy integration, OQ6 (placement) and OQ7 (icons/copy) resolutions
2. `proposals/accepted/clout-upgrade-menu.md` — structural template for multi-level upgrade rows (shape the kit rows mirror)
3. `proposals/accepted/core-game-identity-and-loop.md` §1 (parody-with-affection tone), §2 (core loop), §6 (economy — Engagement as fast currency)
4. `proposals/accepted/lvl-up-button-three-affordance-states.md` — generator row affordance states; kit rows use a separate button shape to avoid visual collision
5. `ux/core-game-screen.md` — generator-list column layout; screen zone map
6. `roles/ux-designer.md` — information hierarchy in dense interfaces, no-tutorial test, color contrast standards
