# Audience Mood — UX Spec

> **Scope:** Defines the visual treatment, motion choreography, copy pools, and layout integration for the Audience Mood retention system's player-facing surface — the mood strip on platform cards.
>
> **Not in scope:** Retention math, pressure accumulators, composition rule, tick integration (see `architecture/audience-mood.md`). Game-design rationale for the mechanic (see `proposals/accepted/audience-mood-retention.md`). Scandal system UI components — those are retired by the proposal and removed under task #100.
>
> **Against contract:**
> - `architecture/audience-mood.md` §"Contract for the UI" — the three fields rendered: `retention`, `dominant_pressure`, `dominant_generator`
> - `ux/core-game-screen.md` §2 zone map — platform cards live in the right-side 280px column
> - `ux/visual-identity.md` — risk-language amber token `--accent-amber: #C45A10`
> - `ux/accent-palette-light-mode.md` — contrast compliance values for `--accent-amber` on white panels
>
> **Supersedes:** `ux/scandal-system.md` (retained as historical record; no longer the active spec for negative-pressure UI).

---

## Decisions Taken in This Spec

1. **Strip absent = healthy.** The mood strip does not render when `retention >= degradation_threshold` (0.95). A platform card with no strip is fine. A card with a strip is asking for something. The player's peripheral vision learns this binary: "no strip = good, strip = look at this."
2. **Variable card height via reserved gutter, not reflow.** Platform cards always reserve 18px of vertical space for the strip slot. When the strip is absent, the gutter is empty. This eliminates layout reflow entirely — no card pushes its neighbors when mood degrades. Chosen over 200ms animated reflow because reflow on three platform cards simultaneously creates a distracting cascade, and the reserved 18px is negligible in the 280px column.
3. **Content Fatigue flavor text names the specific generator type.** When `dominant_pressure === "content_fatigue"`, the flavor line includes the generator's display name via `dominant_generator`. E.g., "Bored of your selfies" not "Bored of your content." This is what makes the diagnostic specific enough to act on.
4. **Amber tint from the risk-language palette, NOT algorithm-mood color vocabulary.** The strip uses `--accent-amber` (`#C45A10`) at controlled opacities. It must never be confused with the screen-wide algorithm-mood background color shifts.

---

## 1. When the Strip Renders

The strip renders when `retention < degradation_threshold` (0.95 per `architecture/audience-mood.md` static data).

- `retention >= 0.95` → strip hidden, gutter empty
- `retention < 0.95` → strip visible

The strip reads `dominant_pressure` to select the copy pool, and `dominant_generator` (non-null only for Content Fatigue) to name the specific content type. It reads `retention` to display the magnitude number.

---

## 2. Strip Anatomy

The strip is a single-row element appended below the platform card's existing content, inside the card's border radius.

```
┌─────────────────────────────────────────────────┐
│  PLATFORM NAME              [platform icon]      │
│  12,480 followers                                │
│  [influencer icons]   [+rate/s]                  │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  ┤
│  Bored of your selfies                    ×0.70  │  ← mood strip (18px)
└─────────────────────────────────────────────────┘
```

### 2.1 Dimensions

| Property | Value |
|----------|-------|
| Strip height | 18px (content + padding) |
| Horizontal padding | 8px left, 8px right (matches platform card body padding) |
| Separator | 1px hairline divider above the strip. Color: same muted divider as generator row separators. Not a border — a `::before` pseudo-element or equivalent, so the strip background tint bleeds to card edge. |

### 2.2 Flavor Text (left)

| Property | Value |
|----------|-------|
| Font size | 10px |
| Font weight | 400 |
| Font style | italic |
| Color | `color-mix(in srgb, var(--accent-amber) 85%, black)` — darkened amber for legibility. Must achieve ≥4.5:1 against the strip background at all severity tints. |
| Alignment | Left-aligned, vertically centered in strip |
| Overflow | `text-overflow: ellipsis; white-space: nowrap` — copy should never wrap. Longest expected string ~45 chars ("The algorithm definitely isn't into this"). |

### 2.3 Retention Number (right)

| Property | Value |
|----------|-------|
| Font size | 10px |
| Font weight | 500 |
| Color | Same darkened amber as flavor text. Must achieve ≥4.5:1 against the strip background. |
| Format | `×` prefix + retention value to 2 decimal places. E.g., `×0.70`, `×0.85`, `×0.40`. Always 2 decimals for stable character width — `×0.70` not `×0.7`. |
| Alignment | Right-aligned, vertically centered in strip |
| Min-width | Reserve enough width that `×0.30` (floor) does not clip. ~40px. |

### 2.4 Strip Background — Severity Tints

Three tint bands mapped to retention ranges. All use `--accent-amber` at controlled opacity over the card's white panel background.

| Retention range | Severity | Background |
|-----------------|----------|------------|
| `0.80 < r < 0.95` | Mild | `rgba(196, 90, 16, 0.06)` — barely visible warmth |
| `0.50 ≤ r ≤ 0.80` | Moderate | `rgba(196, 90, 16, 0.14)` — clearly tinted |
| `r < 0.50` | Severe | `rgba(196, 90, 16, 0.22)` — urgent but not alarming |

**Why not continuous opacity mapping:** Discrete bands are more readable at a glance. Three steps let the player build a fast mental model (faint = mild, warm = moderate, hot = severe) without parsing exact values. The retention number carries the precise magnitude.

**Transition between bands:** When retention crosses a band boundary, the background opacity transitions over 200ms ease-out. This avoids flickering when retention hovers near a boundary.

---

## 3. Vocabulary Separation from Algorithm Mood

The algorithm mood system (`proposals/accepted/algorithm-mood-visibility.md`) uses weather-like ambient vocabulary — screen-wide color palette shifts, atmospheric transitions, environmental "states." That is environmental and global.

Platform mood is interpersonal and diagnostic — localized to one card, naming a specific cause, addressing the player directly.

**The two systems MUST NOT share visual vocabulary:**

| | Algorithm Mood | Audience Mood (this spec) |
|---|---|---|
| **Scope** | Screen-wide background | Per-card strip |
| **Voice** | Environmental, impersonal | Interpersonal, satirical |
| **Color** | Algorithm-mood palette (weather hues) | `--accent-amber` at opacity steps |
| **Motion** | Slow environmental transitions (seconds) | Quick diagnostic fade (150ms) |

If a platform card sits against an amber-tinted algorithm mood background, the strip's amber must remain distinguishable. The strip's 1px hairline separator and contained position inside the card border provide this boundary. The card's white panel background isolates the strip from the algorithm mood's background tint.

---

## 4. Copy Pools

Voice: the platform's audience speaking in satire. Dry, direct, a little hurt. The joke is on the system, not the player. Never cruel.

When `dominant_generator` is available (Content Fatigue), the generator's display name is interpolated into the copy. Template placeholder: `{generator}`.

### 4.1 Content Fatigue (dominant_pressure: `content_fatigue`)

Copy uses `dominant_generator` display name. Pool per rotation — the UI picks randomly, avoiding consecutive repeats.

1. "Bored of your {generator}."
2. "Not the {generator} again."
3. "We've seen this {generator} before."
4. "{generator} every day. Every. Day."
5. "Your {generator} have gone cold."
6. "Even the bots are skipping your {generator}."
7. "Plot twist: nobody asked for more {generator}."
8. "Your {generator} are giving reruns."
9. "{generator}? In this economy?"
10. "Audience literally begging for variety."

### 4.2 Neglect (dominant_pressure: `neglect`)

No generator interpolation — neglect is about the platform, not the content type.

1. "Feels ghosted."
2. "Haven't heard from you."
3. "The algorithm noticed you left."
4. "Your followers are restless."
5. "Starting to forget your name."
6. "Your last post aged out of the feed."
7. "Engagement? Never heard of her."
8. "The platform sent a push notification. To itself."
9. "Your followers found someone else."
10. "Posting from the void, apparently."

### 4.3 Algorithm Misalignment (dominant_pressure: `algorithm_misalignment`)

No generator interpolation — misalignment is about timing, not the specific content.

1. "Off-trend."
2. "The algorithm isn't into this right now."
3. "Wrong content, wrong moment."
4. "Timing could be better."
5. "This isn't what they want today."
6. "The algorithm is looking the other way."
7. "You're zigging. The trend is zagging."
8. "Posted with confidence. Landed with silence."
9. "Algorithmically irrelevant."
10. "The feed buried this before anyone saw it."

### 4.4 Copy Rendering Rules

- One line of copy at a time per strip. No stacking, no scrolling.
- Copy is selected on strip appearance (when retention crosses the threshold) and when `dominant_pressure` changes. It does NOT re-roll on every tick — the player reads one stable message until the situation changes.
- Avoid consecutive repeats: track the last-displayed copy index per platform per pressure and exclude it from the next random pick.

---

## 5. Motion

### 5.1 Strip Appearance (retention crosses below degradation_threshold)

| Property | Value |
|----------|-------|
| Animation | Opacity `0 → 1` |
| Duration | 150ms |
| Easing | `ease-out` |
| Trigger | `retention` crosses below `degradation_threshold` (0.95) on this platform |

No slide, no bounce, no scale. The strip is diagnostic — it fades in like a status indicator lighting up. The reserved 18px gutter means no layout shift occurs.

### 5.2 Strip Disappearance (retention recovers to 1.0)

| Property | Value |
|----------|-------|
| Animation | Opacity `1 → 0` |
| Duration | 150ms |
| Easing | `ease-out` |
| Trigger | `retention` reaches `1.0` on this platform |

**Why fade-out at 1.0 and not at 0.95:** The strip appears at 0.95 (diagnostic onset) but stays visible until full recovery. If the strip disappeared at 0.95 on the way back up, the player would see it flicker in and out near the boundary. Staying visible until 1.0 means "you're not done recovering yet" — which is the truthful signal.

### 5.3 Severity Band Transition

When retention crosses a band boundary (0.80 or 0.50), the background opacity transitions:

| Property | Value |
|----------|-------|
| Property animated | `background-color` (opacity channel) |
| Duration | 200ms |
| Easing | `ease-out` |

### 5.4 Copy Change

When `dominant_pressure` changes (e.g., from neglect to content_fatigue), the flavor text cross-fades:

| Property | Value |
|----------|-------|
| Animation | Old text opacity `1 → 0` (100ms), then new text opacity `0 → 1` (100ms) |
| Total duration | 200ms |
| Easing | `ease-out` both phases |

No position shift. Text stays left-aligned, same baseline.

### 5.5 Reduce-Motion

When `prefers-reduced-motion: reduce` is active:

- Strip appears/disappears instantly (no fade)
- Severity band transitions are instant
- Copy changes are instant (swap, no cross-fade)

---

## 6. Accessibility & Color Independence

### 6.1 Non-Color Signals

The strip communicates cause and magnitude through two non-color channels:

- **Cause:** Flavor text names the exact problem in plain language ("Bored of your selfies," "Feels ghosted," "Off-trend")
- **Magnitude:** Retention number (`×0.70`) is a precise numeric readout

A player with any form of color vision deficiency can read the strip through text alone. The amber severity tint is a supplementary signal — it accelerates recognition for sighted players but is not required for comprehension.

### 6.2 Contrast Compliance

| Element | Background (worst case) | Foreground | Target ratio | Notes |
|---------|------------------------|------------|--------------|-------|
| Flavor text | `rgba(196, 90, 16, 0.22)` on `#FFFFFF` → effective `#FCDBC8` | Darkened amber (~`#7A3A08`) | ≥4.5:1 | 10px text at weight 400 — normal text rule applies. Measure actual rendered foreground against `#FCDBC8` at severe tint. |
| Retention number | Same as flavor text | Same darkened amber | ≥4.5:1 | Weight 500 provides additional legibility headroom. |
| Hairline divider | White panel `#FFFFFF` | Muted divider color | ≥3:1 | UI component (WCAG 1.4.11). Must match generator row separator contrast. |

**Implementation note:** `color-mix(in srgb, var(--accent-amber) 85%, black)` is a suggested starting point for the darkened amber foreground. The engineer MUST verify the actual rendered value achieves ≥4.5:1 against the `#FCDBC8` worst-case background (severe tint on white). If it doesn't, darken further — never lighten.

### 6.3 CVD Simulation

Before shipping, verify under protanopia, deuteranopia, and tritanopia simulators:

- [ ] Flavor text is fully legible
- [ ] Retention number is fully legible
- [ ] The strip is visually distinguishable from the surrounding card body (the hairline + text content provide this even without color)

---

## 7. Platform Card Height & Layout

### 7.1 Reserved Gutter

Platform cards always reserve 18px at the bottom for the mood strip slot. When the strip is not rendering, this space is an empty gutter.

```
Card with strip:
┌──────────────────────┐
│  Card content         │  ← existing content
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
│  Strip (18px)         │  ← populated
└──────────────────────┘

Card without strip:
┌──────────────────────┐
│  Card content         │  ← existing content
│                       │  ← 18px empty gutter
└──────────────────────┘
```

**Why reserved gutter over animated reflow:**

Three platform cards are visible simultaneously. If all three degrade at once (e.g., after an Algorithm shift), three cards reflowing simultaneously creates a visual cascade — distracting, and potentially disorienting. The reserved gutter eliminates this entirely. The 18px cost is negligible in the 280px-wide column.

### 7.2 Platform Column Scroll Behavior

If platform cards overflow the viewport (unlikely at desktop with 3 platforms, possible with future platform additions), the right column scrolls independently. The mood strip is inside each card and scrolls with it — no pinning, no overlay.

---

## 8. Integration With core-game-screen.md

The platform card zone map in `ux/core-game-screen.md` §2 is updated to reflect the mood strip slot:

```
┌──────────┐
│ Chirper   │
│  12.4K   │
│ [affin.] │
│ [mood]   │  ← 18px slot: strip when retention < 0.95, empty gutter otherwise
└──────────┘
```

The `[mood]` row is always present in layout. It renders content only when the strip is active.

---

## 9. Edge Cases

### 9.1 Multiple Pressures Transitioning Rapidly

If `dominant_pressure` changes twice within the 200ms copy cross-fade (§5.4), cancel the in-progress fade and snap to the newest copy. Do not queue animations.

### 9.2 Retention Exactly at Threshold

`retention === degradation_threshold` (0.95): strip is hidden. The strip renders strictly when `retention < degradation_threshold`. This prevents flicker at exact boundary values.

### 9.3 All Three Platforms Degraded Simultaneously

No special treatment. Each card shows its own strip independently. The player sees three amber strips — this is the diagnostic working as intended: "all three audiences are unhappy."

### 9.4 Offline Return

Mood does not degrade offline (per proposal). On return from an offline session, platform cards render with their pre-close retention values. If any were degraded before close, the strip is visible immediately on load — no entrance animation on load, just present.

### 9.5 New Platform Unlock

A newly unlocked platform starts with `retention = 1.0` and all pressures at 0. No strip on unlock. The first time the player sees a strip on a new platform, it's because they caused it — which is the correct teaching moment.
