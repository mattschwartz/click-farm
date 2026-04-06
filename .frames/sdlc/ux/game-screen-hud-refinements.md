# Game-Screen HUD Refinements — UX Spec

> **Scope:** Fixes four specific failures observed in the live GameScreen on 2026-04-05: (1) top-bar layer collision, (2) multiplier-pill contrast + magnitude encoding, (3) BUY vs LVL↑ price-column ambiguity, (4) platform-card number formatting + follower-count icon collision.
>
> **Not in scope:** L10/MAX state treatment — see `ux/generator-max-level-state.md`. Per-click delta coupling and rate visibility — see `ux/purchase-feedback-and-rate-visibility.md`. Overall layout — see `ux/core-game-screen.md`.
>
> **Against contract:** `ux/core-game-screen.md` §2 (zone map), §3 (information hierarchy), `ux/visual-identity.md` (token set).
>
> **Trigger:** screenshot review during active dev session. Each item below is a failure *already in the build*, not a speculative concern.

---

## 1. Top-Bar Layer Collision

### 1.1 The Failure

Three text layers are currently z-stacking in the top bar:

- The title "Short-Form Surge" is being overwritten by the primary currency number (422.39B).
- The "followers" label above the secondary currency renders as "YOU LOWERS" — the F-O-L- is being eaten by a peer element ("You are new again.") that is layering on top.
- The "↑ kit" micro-label is floating *on top of* the 422.39B number, reading as an undismissable tooltip.

The top bar is the first thing the player sees. A broken header poisons trust in every number below it.

### 1.2 Layout Rules

The top bar (80px per `core-game-screen.md` §2) is a **three-zone strip** with strict column reservations. No zone may bleed into a neighbor.

```
┌──────────────────────────────────────────────────────────────────┐
│ ZONE A (algorithm)    │ ZONE B (engagement)  │ ZONE C (followers)│
│ left-weighted          │ center, primary      │ right-weighted    │
│ max 40% width          │ min 30% width        │ max 30% width     │
└──────────────────────────────────────────────────────────────────┘
```

**Required constraints:**

1. **No absolute-positioned children.** Every text element in the top bar is a flow child of its zone column. No `position: absolute` overlays, no negative margins. If a layer is currently absolute-positioned, relocate it into flow.
2. **Ephemeral toast messages (e.g. "You are new again.") MUST NOT render inside the top-bar layout.** They belong in a dedicated toast layer positioned outside the header bounds — recommend top-center, 16px below the top-bar strip, with a 2.4s dismiss.
3. **Currency-unit labels (e.g. "↑ kit") attach inline-below the numeric value, not overlaid.** The number is P0; the unit label is a P2 annotation beneath it at the baseline. Never on top.
4. **Zone A title + subtitle stack vertically within their own column** and MUST NOT depend on Zone B's width to avoid collision. If Zone B grows (large numbers), Zone A compresses the subtitle first (ellipsis) before the title.

### 1.3 Overflow Policy

When a number grows large enough to threaten its neighbor:

- **Engagement (Zone B):** truncate at 6 significant digits with SI suffix (422.39B → 422B only when column is tight). Never wrap. Never overflow.
- **Followers (Zone C):** same rule.
- **Algorithm title (Zone A):** title is fixed-length (algorithm state names are ≤24 chars); subtitle truncates with ellipsis before title does.

### 1.4 Acceptance Check

Load GameScreen, inspect the top bar:
- [ ] No two text elements share pixels at any viewport width ≥1024px.
- [ ] "followers" label is fully legible.
- [ ] "↑ kit" (or equivalent unit label) sits below the value, not on it.
- [ ] "You are new again." (and peers) render outside the top-bar element bounds.

---

## 2. Multiplier Pills — Contrast + Magnitude

### 2.1 The Failure

The row multiplier pills (×1.06, ×1.64, ×0.96, ×0.90, etc.) have two problems:

- **Contrast.** The red/orange pills for negative multipliers (×0.96 on Tutorials, ×0.90 on Podcasts) sit on the warm rust page background. Measured contrast is approximately 2.5:1 — **below the WCAG 1.4.11 floor of 3:1 for UI components.** The ▲▼ directional icons save the color-only-signal problem, but the pills themselves are underlegible.
- **Magnitude is not encoded.** ×0.96 (barely negative) and ×0.90 (meaningfully negative) look identical at a glance. The multiplier is a trust signal about generator performance — distance from 1.0 should be visible without parsing digits.

### 2.2 Contrast Fix

- Negative pills MUST achieve ≥3:1 against the page background.
- Recommend moving negative pills to a **filled chip** treatment (solid background, light text) rather than outlined. Solid fills survive the rust-background problem; outlines do not.
- Use the existing `--accent-penalty` / `--accent-boost` tokens defined in `ux/visual-identity.md`. If those tokens do not currently hit 3:1 on the rust background, route back to `ux/accent-palette-light-mode.md` for a darker penalty hue.

### 2.3 Magnitude Encoding

Pair the numeric multiplier with a **single inline magnitude cue** — not a replacement for the number, an addition to it.

**Decision (game-designer, 2026-04-06): Option A — chevron count.**

- `|Δ| < 0.10` → single chevron (▲ or ▼)
- `0.10 ≤ |Δ| < 0.25` → double chevron (▲▲ or ▼▼)
- `|Δ| ≥ 0.25` → triple chevron (▲▲▲ or ▼▼▼)

So ×0.96 shows ▼ ×0.96, ×0.90 shows ▼ ×0.90 still — but ×1.64 shows ▲▲▲ ×1.64 and ×1.06 shows ▲ ×1.06. The player reads *magnitude* in the glyph and *exact value* in the number.

**Rationale:** Chevrons are discrete, countable, and accessible. ▲▲▲ reads as "strong boost" instantly; ▲ reads as "mild." No need to parse continuous opacity or compare saturations — count glyphs. Option B (fill opacity) requires distinguishing subtle saturation differences on small pills, which fails for colorblind players and anyone glancing quickly. Standard game UI vocabulary.

Option B (pill fill intensity, mapping `|Δ|` to opacity/saturation) was rejected.

### 2.4 Acceptance Check

- [ ] Every multiplier pill, positive or negative, achieves ≥3:1 against the rust page background under measurement (not estimation).
- [ ] Given two multipliers with different magnitudes (e.g. ×0.96 and ×0.60), a player can distinguish the larger one without reading the digits.

---

## 3. BUY vs LVL↑ Price-Column Ambiguity

### 3.1 The Failure

Each generator row currently shows two adjacent action buttons with visually similar price labels:

```
[ BUY     ]   [ LVL↑      ]
[ 1,762   ]   [ 1.36T     ]
```

Both buttons display a price at identical visual weight. Under time pressure the player cannot distinguish frequent action (BUY) from rare milestone (LVL↑) at a glance, and may mis-tap.

### 3.2 Hierarchy Rules

BUY is the **frequent, expected action** of the early-to-mid game. LVL↑ is a **rare milestone**. They are not peers and MUST NOT look like peers.

**BUY button (frequent):**
- Full button chrome, primary affordance treatment.
- Price label at full weight, primary numeric style.
- Always ready to tap unless explicitly disabled.

**LVL↑ button (rare milestone):**
- **Only renders chrome when affordable-or-close.** When the player cannot afford the level-up price *and* is less than 50% of the way there, the LVL↑ slot renders as a **compact status line** (no button chrome): `LVL 7 · next: 99.84B`. This is a progress annotation, not an action.
- When the player is ≥50% of the level-up price, chrome returns and it becomes armed (amber border per existing `ready`/`armed` states).
- When affordable, it goes fully gold (per `core-game-screen.md` affordance rules).
- When L=max, it becomes the platinum plaque per `generator-max-level-state.md`.

**Threshold decision (game-designer, 2026-04-06): 50% confirmed.** LVL UP is a rare milestone under the level-driven-cooldown model (speed axis, 10 levels max, super-exponential cost). It should be quiet most of the time and announce itself when genuinely approaching. 50% is the "I can see it coming" moment — early enough to build anticipation, late enough to keep the row clean during the long save-up. Earlier (25%) adds visual noise during a period where the player can't act. Later (75%) suppresses the anticipation beat.

Effect: under normal play, **only BUY is button-shaped** on most rows. LVL↑ steps forward when it's relevant.

### 3.3 Positioning

Keep both in the same row column. The state change is visual weight, not position — players learn the column meaning through stable placement.

### 3.4 Acceptance Check

- [ ] On a fresh game, the LVL↑ column shows as a flat status line on all rows where the player is <50% of the level-up cost.
- [ ] BUY and LVL↑ do not both read as "clickable primary" on the same row.
- [ ] A player glancing at the screen can identify the BUY target within 300ms.

---

## 4. Platform Cards — Formatting + Icon Collision

### 4.1 The Failures

**(a) Inconsistent number formatting.** Generator rows use SI notation (`868.43M/s`, `41.13M/s`). Platform cards render the same kind of value as raw digits with a decimal (`+127097600.7/s`, `+82904347.2/s`). Same game, same data class, two formats. This is a trust-signal failure — players who see inconsistent number formatting lose confidence in all numbers on the screen.

**(b) Follower-count / influencer-icon collision.** The follower-count numbers beside each platform's influencer icons are rendering as corrupted strings (strikethroughs or icon overlap), e.g. `1̶6̶3̶2̶7̶3̶1̶5̶`. Either the icon is painting into the number's bounds, or a strikethrough style is being applied unintentionally.

### 4.2 Formatting Fix

**Single SI formatter across the whole screen.** Apply identical number formatting to every rate display, every count, every delta:

| Range | Format | Example |
|-------|--------|---------|
| `< 1_000` | integer, no suffix | `427` |
| `1K ≤ n < 1M` | 2 decimal + K | `12.40K` |
| `1M ≤ n < 1B` | 2 decimal + M | `868.43M` |
| `1B ≤ n < 1T` | 2 decimal + B | `22.87B` |
| `≥ 1T` | 2 decimal + T | `1.36T` |

Rate values append `/s`. Deltas prefix `+` or `−`. No exceptions by surface.

`+127097600.7/s` becomes `+127.10M/s`.

### 4.3 Icon Collision Fix

Follower counts and influencer icons must not share pixels. Recommend:

- Fixed-width icon column (24px or 32px) at the left of the influencer strip.
- Follower count in its own text column with min 8px gutter.
- Inspect the current render for stray `text-decoration: line-through` — if present, remove; it is semantically wrong for numeric readouts (it means "invalid" to players).

### 4.4 Acceptance Check

- [ ] Every numeric rate/count on GameScreen passes through the same formatter.
- [ ] No platform-card follower count renders with visible strikethrough or overlapping glyph pixels.
- [ ] `+127097600.7/s` and similar no longer appear anywhere.

---

## 5. Open Questions

| # | Question | Owner |
|---|----------|-------|
| 1 | ~~Multiplier magnitude encoding — Option A (chevron count) or Option B (fill intensity)?~~ **RESOLVED: Option A (chevron count).** See §2.3. | game-designer |
| 2 | ~~LVL↑ "flat status line" threshold — is 50% the right tip-over point, or earlier/later?~~ **RESOLVED: 50% confirmed.** See §3.2. | game-designer |
| 3 | Does the existing `--accent-penalty` token hit 3:1 on the current rust background, or does `ux/accent-palette-light-mode.md` need a darker penalty hue? | ux-designer (self, via measurement) |

---

## 6. Implementation Order

Recommended to engineer:

1. **§1 Top-bar layer collision** — the header is visibly broken; nothing else lands cleanly until this is fixed.
2. **§4 Number formatting** — single formatter is a small change with outsized trust impact.
3. **§4 Icon collision** — likely a one-line CSS fix.
4. **§2 Multiplier pill contrast** — accessibility floor.
5. **§2 Magnitude encoding** — requires game-designer sign-off on Option A vs. B first.
6. **§3 BUY vs LVL↑ hierarchy** — touches existing affordance logic, do last.
