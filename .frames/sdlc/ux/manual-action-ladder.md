# Manual Action Ladder — UX Spec

> **Scope:** Defines the Actions-column layout, ghost-slot anatomy, live-verb-button anatomy, spotlight-slot transition, mobile anchor dynamics, scroll affordance, empty/edge states, per-verb iconography, motion briefs, and accessibility for the 5-verb manual action ladder (chirps → selfies → livestreams → podcasts → viral_stunts). This is the player-facing surface of the three-axis investment model: LVL UP (speed) / BUY (power) / Autoclicker (passive), per `proposals/accepted/level-driven-manual-cooldown.md`.
>
> **Not in scope:** LVL UP / BUY / Autoclicker purchase UI — all three tracks live in the Generators center column per `proposals/accepted/20260406-purchase-button-location.md`; the action button slab carries no purchase controls (separate spec pass needed for Generators-column layout). Brand-deal card (see `ux/brand-deal-card.md`, `ux/gig-cards.md`). Upgrade purchase flow (see `ux/purchase-feedback-and-rate-visibility.md`). Platform affinity visuals on verb cards (deferred — see §12 OQ2).
>
> **Implements:** `proposals/accepted/manual-action-ladder.md` — ux-designer follow-up commitment (review log lines 578–580, OQ3 + OQ6 resolutions). Updated per `proposals/accepted/level-driven-manual-cooldown.md` — badge semantics (Gap 1), autoclicker floating numbers (Gap 2), cooldown threshold (Gap 5), yield display formula (Gap 6).
>
> **Against contract:** `proposals/accepted/manual-action-ladder.md` §2, §4, §12, §14 (locked-in data contracts and balance cells); `proposals/accepted/actions-column.md` §4 (80px minimum tap target, internal scroll at 5+).
>
> **Integrates with:** `ux/core-game-screen.md` §2 (Actions zone = left column, 320px), `ux/mobile-layout.md` §7 (bottom-anchor Post bar), `ux/brand-deal-card.md` §2.1 (brand-deal slot — 88px reserved below ladder), `ux/visual-identity.md` §2 (generator color lanes + icon directions, reused by ladder verbs), `ux/purchase-feedback-and-rate-visibility.md` §5 (rate flare on yield change).

---

## Decisions Taken in This Spec

Calls this spec makes beyond what the accepted proposal locked in. Each is flagged so it can be challenged.

1. **Live-verb button height is 80px, ghost-slot height is 60px.** 80px is the `actions-column.md` OQ4 minimum and matches `ux/mobile-layout.md` §7's generator row height lineage. 60px ghost is *below* the tap-target minimum by design because ghost slots are not tappable until the condition is met — at which point the slot opacifies and **grows to 80px** before accepting the Unlock tap. Ghost height before condition-met signals "this is a preview, not an instrument."
2. **Cooldown visualization is a left-edge fill ring, not a circular ring.** A circular progress ring competes with per-verb iconography for the primary visual slot. A left-edge vertical fill (3px stripe that drains top-to-bottom as cooldown progresses) reads at a glance from peripheral vision, does not occlude the icon, and parallels the existing brand-deal corporate-green edge stripe pattern in `ux/brand-deal-card.md` §2.2.
3. **Autoclicker badge is a count pill showing army size, not yield multiplier.** The badge shows `autoclicker_count` (`×3`, `×47`) — the number of passive auto-tappers firing on this verb. The yield multiplier (`1 + count`) is communicated through the yield display instead. Rationale: when autoclickers fire and the badge pulses, the number on the badge answers "how many workers just fired?" — that's the visually active question. The yield multiplier is a static modifier the player checks in the yield display.
4. **The spotlight slot visually identifies itself via a 2px top-border accent in the verb's color lane, not via background tint or size change.** Size-change would violate the 80px floor. Background tint would fight per-verb color identity. A thin top-border accent (color lane, 100% opacity) is a recessive-but-legible spotlight signal that survives across all 5 verb colors.
5. **The ghost slot's condition-met moment plays a dedicated "awakening" animation, not just an opacity change.** Condition-met is the most important progression moment in the ladder — it earns its own motion signature (opacity climb + height grow + subtle chromatic bloom in the verb's color lane). This is separate from normal scroll motion so the player catches it in peripheral vision even when their hand is on another verb.
6. **Mobile bottom-anchor verb is the spotlight slot (sticky), with older verbs scrolling above it.** This inverts desktop's "sticky top" because mobile thumbs work from the bottom up — the most-recently-unlocked verb should be under the thumb, not at the top of the scroll region where it would be thumb-unreachable.
7. **No visual differentiation between "just-tapped" and "mid-cooldown" on the button itself — only the cooldown fill ring carries the state.** An extra flash-on-tap would compound with the existing rate-flare feedback in `ux/purchase-feedback-and-rate-visibility.md` §5.1. Keep the tap-feedback load on the rate display, not on the verb button.
8. **Chirps iconography proposed inline (§11) but flagged for game-designer confirmation.** Chirps is net-new per `manual-action-ladder.md` §14c. Icon direction + color token are proposed here for engineer implementability, but a game-designer pass on satirical tone is flagged as OQ1 before final visual-identity.md extension.

---

## 1. Emotional Arc — The Ladder Moment

The ladder's progression arc is **per-verb** (unlock → LVL UP → BUY → autoclicker) and **session-wide** (1 verb → 5 verbs + ghost → full instrument panel). Every element in the column should know which beat of which arc it serves.

### Session-level arc

| Beat | Player state | What the column owes them |
|------|--------------|---------------------------|
| **Start** (chirps only) | Fresh, learning | One live verb, one ghost silhouette. The column teaches the ladder exists simply by having a silhouette in it. Zero tutorial required. |
| **First unlock** (selfies, ~100 followers) | Rewarded, curious | The ghost awakens. The player taps it. A new live verb enters the column with its own rhythm. The spotlight accent signals "this one is newest." |
| **Interleaved tapping** (2–4 verbs live) | Performing, deciding | The column is an instrument panel. Multiple cooldown rings drain at different speeds. The player's hand rotates between verbs, choosing which to enrich. |
| **Crowding** (5 live + ghost = 6 items) | Orchestrating | Internal scroll activates. The spotlight slot carries progression recency; older verbs scroll. Density does not collapse — every verb retains its 80px identity. |
| **Full ladder** (5 live, ghost slot terminated) | Mastery | The ghost slot is gone. The column is a stable 5-verb instrument panel. Progression now lives in the Generators column (LVL UP, BUY, Autoclicker purchases). |

### Per-verb arc

| Beat | Source state | What the verb slot owes |
|------|--------------|-------------------------|
| **Promise** | `total_followers < unlock_threshold` | Ghost silhouette, 0.35 opacity, condition text visible, not tappable. |
| **Awakening** | `total_followers >= unlock_threshold`, not yet purchased | Silhouette opacifies, height grows 60→80px, unlock cost appears, becomes tappable. One-time animation. |
| **Unlocked** | Purchased, pre-first-tap | Live button, full opacity, cooldown ring at 100% (ready). Pulse indicator inviting first tap. |
| **Ready** | Cooldown elapsed | Pulse indicator on. Cooldown ring at 100%. Brightest state. |
| **Mid-cooldown** | `now - last_tap < cooldownMs` | Cooldown ring draining top-to-bottom. Button still legible, slightly desaturated (see §6.4). |
| **Just-tapped** | `now - last_tap < 120ms` | Rate-flare fires in engagement counter (§5.1 purchase-feedback spec). No button-level flash. |
| **Automating** | `autoclicker_count >= 1` | Autoclicker badge (`×N`) visible in button. Floating numbers emit on each autoclicker burst (§4.6). Cooldown ring continues to show the player's manual cooldown only. |

---

## 2. Zone Map — Actions Column Composition

Desktop canvas 320px wide (inherited from `ux/core-game-screen.md` §2). The Actions column composition under the ladder:

```
┌──────────────────────────────────┐
│  ACTIONS COLUMN (320px)          │
│                                  │
│  ┌──────────────────────────┐   │  ← spotlight slot (most-recently-unlocked)
│  │ ▣  LIVESTREAMS       ×3  │   │    2px top accent in verb color lane
│  │ │  80 eng/tap              │   │    80px height
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │  ← live verb (scrolls if crowded)
│  │ ▣  SELFIES            ×7  │   │    80px
│  │ │  25 eng/tap              │   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │ ▣  CHIRPS            ×12 │   │
│  │ │  1 eng/tap               │   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │  ← ghost slot (next verb in sequence)
│  │ ◌  PODCASTS               │   │    0.35 opacity, 60px
│  │    at 20,000 followers    │   │    not tappable
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │  ← brand-deal strip (88px, reserved)
│  │  BRAND DEAL        [3×]  │   │    per ux/brand-deal-card.md §2.1
│  └──────────────────────────┘   │
└──────────────────────────────────┘
```

**Column-internal stack order (top → bottom):**

1. **Spotlight slot** — most-recently-unlocked verb, sticky, 2px top-border accent.
2. **Other live verbs** — unlock order, top-most = earliest unlocked. Scrolls internally at density >4.
3. **Ghost slot** — next un-unlocked verb in sequence; present only while `remaining_verbs > 0`.
4. **Brand-deal strip** — 88px reserved, per `ux/brand-deal-card.md` §2.1 (unchanged).

**Density thresholds (desktop, 320px wide):**

| Live verbs | Ghost | Brand-deal | Items | Behavior |
|---|---|---|---|---|
| 1 (chirps) | 1 (selfies) | locked | 2 | Fits column natively. |
| 2 | 1 | unlocked | 4 | Fits column natively, within soft cap of 4. |
| 3 | 1 | unlocked | 5 | Internal scroll activates. Spotlight + brand-deal sticky; 3 middle items scroll. |
| 4 | 1 | unlocked | 6 | Internal scroll. |
| 5 (full ladder) | — | unlocked | 6 | Internal scroll. Ghost slot is gone. |

**Sticky rules:** spotlight slot is sticky top. Brand-deal strip is sticky bottom. Ghost slot scrolls with the middle (it is below the spotlight but above the brand-deal; when crowding forces scroll, the ghost rides with the live verbs, because demoting the ghost below brand-deal would hide the progression signal).

---

## 3. Ghost-Slot Anatomy

The ghost slot is a 60px single-silhouette reveal of the next un-unlocked verb. It is the zero-tutorial progression signal.

### 3.1 Dimensions and position

- **Height:** 60px (shorter than 80px live-verb; a promise, not an instrument).
- **Width:** fills column (320px desktop / full-width mobile).
- **Position:** directly below the last live verb, above the brand-deal strip.
- **Quantity:** exactly one ghost at a time — the next verb in sequence (selfies → livestreams → podcasts → viral_stunts). When unlocked, the slot is replaced by a live-verb button, and the next verb takes its place as the new ghost. When the last verb (viral_stunts) unlocks, the ghost slot disappears permanently.

### 3.2 Visual anatomy

```
┌──────────────────────────────────┐
│ ◌  PODCASTS                      │  ← verb name (left), silhouette icon
│    at 20,000 followers           │  ← condition text
└──────────────────────────────────┘
```

- **Silhouette icon** (left-anchored, 32px): the verb's icon from §11, rendered as a flat silhouette at 100% of the verb's color lane token, then the entire button is rendered at 0.35 opacity. The silhouette shows icon *shape*, not iconography detail — the player recognizes the shape without getting the full identity until unlock.
- **Verb name** (uppercase, Space Grotesk 500, 13px, 0.35 opacity against `#0b0d12`): the verb's display name (CHIRPS / SELFIES / LIVESTREAMS / PODCASTS / VIRAL STUNTS).
- **Condition text** (Space Grotesk 400, 11px, 0.35 opacity): the unlock-condition format is `"at {threshold} followers"` (e.g., "at 100 followers", "at 5,000 followers", "at 100,000 followers"). Threshold values use comma separators per the engagement counter convention.
- **No tap affordance.** No border highlight, no hover state, no ring. The ghost communicates "not yet" through opacity alone. Pointer is `default`, not `pointer`.
- **Background:** none. The ghost sits flush against the column background, no container.

### 3.3 Contrast — opacity trap resolution

0.35 opacity on text at base `#0b0d12` against the column background produces approximately 2.5:1 effective contrast at the rendered value for the condition text. **This is below WCAG AA 4.5:1 — accepted knowingly.** The ghost-slot text is informational but not operational: a player who cannot read it is not blocked from playing, because the ghost becomes fully opaque and operational at condition-met. The ghost is a *preview*, not a functional element. For color-blind and low-vision players, the verb name opacifies within minutes of normal play (chirps → selfies ~5–10 min per balance pacing note).

**Alternative considered and rejected:** raising ghost opacity to 0.55 to pass 4.5:1 would blur the promise/instrument distinction and make ghost slots compete with live verbs for attention.

### 3.4 Condition-met transition (the "awakening")

When `total_followers` crosses `unlock_threshold`, the ghost performs a one-time awakening animation:

- **T+0ms:** ghost detects threshold met. State machine transitions `promise → awakening`.
- **T+0 → 400ms:** opacity climbs 0.35 → 1.0, ease-out.
- **T+200 → 600ms:** height grows 60 → 80px, ease-out. The button pushes subsequent items downward smoothly.
- **T+300 → 900ms:** the verb's color-lane token renders as a chromatic bloom emanating from the silhouette icon (radial gradient, 40% opacity at center, 0% at 120px radius), then fades out over 600ms. This is the "verb arriving in the hand" moment.
- **T+400ms:** unlock cost text renders below verb name, fades in over 200ms. Format: `"Tap to unlock — {cost} engagement"` (e.g., "Tap to unlock — 10 engagement").
- **T+600ms:** tap affordance activates (cursor: pointer, border highlight on hover).

**Concurrent signal:** the first time the player's total_followers ever crosses a ladder threshold, `ux/purchase-feedback-and-rate-visibility.md`'s rate-flare system should NOT fire — the awakening is already loud. (Rate flare is for yield change; a ghost awakening is progression.)

**Post-awakening state (condition-met, not-yet-purchased):**
- Full opacity.
- 80px height.
- "Tap to unlock — {cost} engagement" visible.
- Tappable: one tap consumes `base_buy_cost` engagement and transitions the slot to a live-verb button (see §4).
- If the player's engagement balance is below `base_buy_cost`, the Unlock cost text renders in the disabled-amber color (`#c45a10` at 60% opacity, per `ux/visual-identity.md` risk amber). Button remains visually present at 80px but the tap is no-op with a 120ms horizontal shake motion as feedback.

### 3.5 Edge case — threshold crossed offline

If the player returns from an offline session and a threshold was crossed while away, the awakening animation plays on first render of the main game screen, **after** the offline-gains modal dismisses. This keeps the awakening from getting lost behind the modal.

---

## 4. Live-Verb-Button Anatomy

The live verb button is the permanent, tappable 80px element that replaces the PostZone for each unlocked verb. Every unlocked verb has one.

### 4.1 Dimensions

- **Height:** 80px (floor from `actions-column.md` OQ4; exceeds iOS 44px tap minimum).
- **Width:** fills column (320px desktop / full-width mobile).
- **Internal padding:** 16px horizontal, 12px vertical.
- **Border-radius:** 6px (matches brand-deal-card convention).

### 4.2 Visual anatomy

```
┌──┬───────────────────────────────────────┐
│░░│ ▣  LIVESTREAMS                    ×3  │  ← header row
│░░│                                       │
│░░│ 80 eng/tap         [pulse] ready      │  ← data row
└──┴───────────────────────────────────────┘
 ▲
 └─ 3px left-edge cooldown fill ring (verb color lane)
```

- **Cooldown fill ring** (3px left edge, full verb color lane): vertical stripe on the button's left edge. Fill drains top-to-bottom as cooldown elapses (see §4.4 interaction states). At 100% fill, the stripe is solid verb-color. At 0% fill, the stripe is an empty 3px channel at the same position (background-tinted slightly darker than column bg). The stripe is *the* cooldown signal.
- **Verb icon** (32px, left-anchored after the cooldown ring, 16px from left edge): per §11 iconography — each verb's icon in its color-lane token.
- **Verb name** (Space Grotesk 500, 14px uppercase, full opacity): the verb's display name, left-aligned after the icon.
- **Autoclicker badge** (`×N` pill, right-aligned in header row): shows `genState.autoclicker_count` — the number of passive auto-tappers firing on this verb. The badge answers "how many workers do I have?" at a glance. Pill structure: 13px Space Grotesk 700, verb color-lane text on a `rgba(verb-color, 0.25)` background, 4px border-radius, 4px horizontal padding, 2px vertical padding. Hidden when `autoclicker_count === 0`. **Note:** the yield multiplier (`1 + count`) is communicated through the yield display below, not through the badge. One badge, one meaning.
- **Yield display** (Space Grotesk 400, 11px, 4.5:1 contrast): format `"{base_event_yield × (1 + count)} eng/tap"` — the engagement yielded per manual tap (live-computed; `count` is the BUY count, not the autoclicker count). Left-aligned in the data row. When the player purchases a BUY, the yield display updates immediately and triggers a rate-flare per `ux/purchase-feedback-and-rate-visibility.md` §5 (semantic swap: rate-flare previously fired on Upgrade, which drove yield under the old model; it now fires on BUY, which drives yield under the three-axis model).
- **Pulse indicator** ("ready" label or pulsing dot): right-aligned in data row. See §4.4.

### 4.3 Number formatting

Yield display uses the engagement counter's number-formatting rules (see `ux/purchase-feedback-and-rate-visibility.md`): thousands get a comma separator, millions abbreviate to `12.4M`, etc. For the chirps-floor case where `base_event_yield × (1 + count)` at count=0 is `1`, the display reads `"1 eng/tap"` — the small number is legible and honest.

### 4.4 Interaction states

Four states, driven by cooldown timer and `last_manual_click_at[verbId]`:

**Idle (cooldown full, never tapped this session):**
- Cooldown fill ring: 100% solid verb-color.
- Pulse indicator: "ready" label (11px Space Grotesk 400, verb color-lane, 100% opacity).
- Button: full color, full opacity.

**Ready (cooldown elapsed after a prior tap):**
- Cooldown fill ring: 100% solid verb-color, and a soft pulsing glow (2px outer shadow, verb-color, 0.4 opacity, breathing 0.4 → 0.7 → 0.4 on a 1.2s sine cycle) once the ring refills.
- Pulse indicator: small pulsing dot (6px diameter, verb-color, 1.2s sine cycle matched to the glow).
- Tapping fires `postClick(verbId)` → engagement added, `last_manual_click_at[verbId] = now`.

**Mid-cooldown (`now - last_tap < cooldownMs`):**
- Cooldown fill ring: drains top-to-bottom over `cooldownMs` milliseconds, linear.
- Pulse indicator: hidden.
- Button color: desaturated 20% (verb color-lane at 80% saturation) to communicate "not ready." Contrast is preserved because desaturation reduces chroma, not luminance.
- Tapping the button while mid-cooldown: no-op, no animation (do NOT horizontal-shake — that would fight the cooldown ring's calm drain).

**Just-tapped (0–120ms after tap):**
- Cooldown fill ring: jumps from 100% → 0% and begins drain.
- Pulse indicator: hidden.
- No button-level flash; the rate-flare on the engagement counter carries tap feedback (per `ux/purchase-feedback-and-rate-visibility.md` §5.1).

**Note on autoclicker ticks:** when autoclickers fire (every `1/base_event_rate` seconds — the L1 base cooldown, not the player's leveled-up cooldown), the cooldown ring animates *only* for the player's separate manual cooldown timer. The autoclicker's internal timer is NOT visualized in the ring, because the ring represents the player's own cooldown, not the autoclickers'. Players see autoclicker output via floating numbers (§4.6) and the global engagement counter's climb rate. This keeps the button's signal "is MY hand ready?" clean.

**Autoclicker-tick subtle signal:** on each autoclicker burst firing, the autoclicker badge (`×N`) performs a subtle chromatic scale-pulse (scale 1.0 → 1.05 → 1.0 over 200ms, ease-out). This gives the player a peripheral confirmation that the autoclickers are active without cluttering the cooldown ring. At high autoclicker counts where the burst interval is short, the badge pulse may visually merge into a continuous shimmer — acceptable, since by that stage the player is reading the global rate counter, not per-verb cadence.

### 4.5 Cooldown floor and ring behavior at max level

Under the level-driven cooldown formula (`max(50, 1000 / (level × base_event_rate))`), the fastest manual cooldown is chirps at L10 = 200ms. No verb ever reaches sub-100ms cooldowns. The 50ms hard floor from `proposals/accepted/level-driven-manual-cooldown.md` is the safety clamp but is unreachable at max_level=10 for all current verbs.

**Implication for the cooldown ring:** the ring always has a human-readable drain duration (≥200ms at the fastest). The old §4.5 rule ("stop animating the ring at ≤100ms") is dead code — the threshold is never hit. The ring animates normally at all reachable cooldown values.

**If max_level is ever raised** beyond 10, the fastest cooldown would shrink. If a future balance change pushes any verb's cooldown below 100ms, re-add the "ring stops animating" rule at that threshold. For now: not needed, not implemented.

### 4.6 Autoclicker floating-number emissions

When autoclickers fire, the verb's action button emits floating numbers showing engagement generated — per `proposals/accepted/level-driven-manual-cooldown.md` §4. Autoclicker fires are burst-mode: all N autoclickers fire simultaneously every `1/base_event_rate` seconds. The UX layer visually staggers the emissions for a smoother feel.

**Stagger timing:** when N autoclickers fire in a burst, the floating numbers are emitted over a stagger window of `min(N × 60ms, 400ms)`. At 3 autoclickers: numbers pop at T+0, T+60ms, T+120ms. At 10+: numbers spread across 400ms (the cap prevents the stagger from bleeding into the next burst). Each number gets a random horizontal offset per §8.3 rapid-click stacking rules.

**Density cap:** when `autoclicker_count > 8`, stop showing individual floating numbers. Instead, show a single batched float: `+{total} ×{N}` (e.g., `+240 ×12`). The batched float uses the same drift-up animation but at 1.1× the standard size to carry the aggregate weight. The threshold of 8 is chosen because: (a) 8 staggered numbers across 400ms is visually busy but legible, (b) above 8, the numbers overlap into an unreadable stream, (c) the player at 8+ autoclickers has graduated from "counting my workers" to "reading the total."

**Visual differentiation from manual taps:**
- **Size:** autoclicker floats render at 80% of the manual float's font-size (currently 22px × 0.8 = ~18px). The player's hand is always the biggest number on the button.
- **Opacity:** autoclicker floats render at 0.7 opacity vs manual's 1.0. Slightly recessed — the army is background production, the hand is foreground.
- **Color:** same gold (`#FFD66B`) as manual floats. No hue differentiation — both are "you earned something." The size + opacity difference carries the distinction.
- **Batched floats** (at 8+ autoclickers): render at the standard manual float size (22px) but with a `×N` suffix in a slightly smaller weight (Space Grotesk 400 vs the number's 800). Opacity 0.85 — between manual and individual autoclicker floats.

**Interaction with manual taps:** manual and autoclicker floats coexist. If the player taps during an autoclicker burst, the manual float renders at full size and opacity, visually dominant over any concurrent autoclicker floats. No collision avoidance needed — the horizontal offset randomization from §8.3 handles spatial distribution.

**Reduced-motion fallback:** under `prefers-reduced-motion: reduce`, autoclicker floats are suppressed entirely. The autoclicker badge pulse (§4.4) is also suppressed under reduced motion. Autoclicker activity is communicated solely through the engagement counter's climb rate — which is always visible and non-animated. Manual tap floats still appear (they snap to position without drift animation, per §9.5's retained state-change principle).

---

## 5. Spotlight Slot — Transition Animation

The spotlight slot pins the most-recently-unlocked verb to the top of the scroll region (desktop) / bottom-anchor position (mobile). When a new verb unlocks, the spotlight demotes the prior spotlight and promotes the new verb.

### 5.1 Spotlight visual signature

- **2px top-border accent** in the verb's color-lane token, 100% opacity, runs full button width.
- No other visual differentiation (no size change, no background tint — per §Decisions #4).

### 5.2 Transition — demote + promote

Triggered the instant the player taps a ghost slot to Unlock (ghost → live-verb transition). The newly-unlocked verb becomes the new spotlight.

**Sequence (900ms total):**

- **T+0ms:** player taps awakened ghost. Unlock purchase fires (engagement debited, `genState.unlocked = true` or equivalent). Ghost slot transitions its content to a live-verb button (already at 80px from awakening animation).
- **T+0 → 100ms:** engagement debit animation plays on the global counter (per `ux/purchase-feedback-and-rate-visibility.md` — deduction flare, downward).
- **T+100 → 300ms:** old spotlight slot's 2px top-border accent fades to 0 opacity, ease-out. Old spotlight demotes to a regular live-verb position (no animation — the accent simply leaves).
- **T+300 → 600ms:** the new verb button reorders to the top of the scroll region. Items shift positionally using a 300ms ease-out translate. Old verbs slide down smoothly to accommodate.
- **T+600 → 900ms:** the new verb's 2px top-border accent fades in from 0 → 100% opacity, ease-out. The new spotlight is established.

**Scroll behavior during transition:** if the player was scrolled mid-column, the column auto-scrolls to the top (so the new spotlight is in view) over the same T+300→600ms window. 400ms ease-in-out scroll.

**First-verb case:** when the player unlocks selfies (their first ladder verb after chirps), chirps is already the spotlight (it was the only verb). On selfies' unlock, chirps demotes and selfies promotes, following the full sequence above. Chirps is never demoted silently — it always gets an animated farewell from the spotlight position.

### 5.3 Spotlight on return (offline transition)

If the player returns offline and a verb was unlocked via offline progress (which cannot happen in this model — Unlock is a manual purchase, never automated), the spotlight does not change. The spotlight only moves on live player-initiated Unlock taps.

However, if a ghost's threshold is crossed offline, the awakening animation plays on return (see §3.5), and the player may then tap to Unlock, at which point the spotlight transitions normally.

---

## 6. Mobile Anchor Dynamics

Mobile canvas 375×812 (per `ux/mobile-layout.md` §1). The Actions zone is a bottom-anchored region that grows upward as siblings arrive — per `ux/actions-column.md` OQ2 resolution.

### 6.1 Mobile zone stack (Actions region)

```
├────────────────────────────┤
│  ...main content above...  │
├────────────────────────────┤
│  GHOST SLOT      (60px)    │  ← scrolls with ladder
│  ◌ PODCASTS                 │
├────────────────────────────┤
│  LIVE VERBS     (scroll)   │  ← internal vertical scroll when crowded
│  ▣ CHIRPS           ×12    │
│  ▣ SELFIES          ×7     │
│  ...                        │
├────────────────────────────┤
│  SPOTLIGHT VERB  (80px)    │  ← sticky, most-recently-unlocked
│  ▣ LIVESTREAMS      ×3     │    2px top accent in color lane
├────────────────────────────┤
│  BRAND DEAL STRIP (88px)   │  ← per ux/brand-deal-card.md §6.1
├────────────────────────────┤
│  ...safe area...            │
└────────────────────────────┘
```

**Inversion from desktop:** on mobile, the spotlight slot sits *below* the scrolling live verbs and *above* the brand-deal strip. This puts the most-recently-unlocked verb directly under the player's thumb. Older live verbs scroll in the middle; the ghost slot sits at the top of the Actions region.

**Ghost-slot position on mobile:** directly below main content, *above* the scrolling live verbs. This inverts the desktop placement (where ghost sits below live verbs). Rationale: on mobile, the player's thumb rests at the bottom. The ghost should be peripheral ("something is coming"), not in the thumb zone competing with live instruments. Placing it above the scroll region lets the player glance up for progression context without their thumb hitting it.

### 6.2 Zone height caps

Per `ux/actions-column.md` OQ4 — the Actions zone caps at ~55% of mobile viewport height before introducing internal scroll. At 375×812, that is ~447px.

Component heights in the Actions zone:
- Ghost slot: 60px
- Live verbs (N): 80px each
- Spotlight verb: 80px (sticky bottom of live-verbs region, above brand-deal)
- Brand-deal strip: 88px

At 3 live verbs + ghost + brand-deal: 60 + 80×3 + 88 = 388px (within 447 cap, no scroll).
At 4 live verbs + ghost + brand-deal: 60 + 80×4 + 88 = 468px (exceeds cap → internal scroll).
At 5 live verbs + brand-deal (ghost gone): 80×5 + 88 = 488px (internal scroll).

### 6.3 Scroll affordance

When internal scroll activates, the middle "live verbs" region scrolls vertically. Spotlight (bottom) and ghost (top) are sticky.

**Scroll indicators:**
- **Gradient scroll edges:** when the middle region is scrolled away from the top, a 12px gradient (column-bg → transparent) appears at the top of the live-verbs region, signaling "more content above." Same treatment at bottom when scrolled away from end.
- **Thumb-scroll momentum:** native iOS/Android momentum scrolling. No rubber-banding restrictions.
- **No scrollbar rendered.** The gradient edges are the only scroll affordance.

**Sticky-element visual handshake:** the sticky spotlight slot's top border (2px verb color accent) provides a visual seam between the scrolling region and the spotlight. When the scrolling region scrolls behind the spotlight, the spotlight's color-accent edge is the break.

### 6.4 Bottom-anchor interaction with device keyboard

Not applicable — no text input in the Actions column. Keyboard-appearance edge case is out of scope.

### 6.5 Tap targets

All live-verb buttons at 80px height × full column width are well above the 44px iOS minimum. Ghost slot is 60px but not tappable until awakened (at which point it becomes 80px). No tap-target accessibility concerns.

---

## 7. Empty / Edge States

### 7.1 Session start — chirps only, selfies ghost

First-launch player sees:

```
┌──────────────────────────────────┐
│ ┌──────────────────────────┐    │
│ │ ▣  CHIRPS                 │    │  ← spotlight (only live verb)
│ │ │  1 eng/tap   [pulse] ready│  │    2px top accent (warm color lane)
│ └──────────────────────────┘    │
│ ┌──────────────────────────┐    │
│ │ ◌ SELFIES                 │    │  ← ghost slot
│ │   at 100 followers        │    │
│ └──────────────────────────┘    │
└──────────────────────────────────┘
```

The column is intentionally sparse. The ghost slot is the only progression signal — the player learns the ladder exists by seeing one silhouette. No tutorial text, no "tap chirps to begin" hint — the cooldown ring pulsing on chirps is the entire instructional surface.

**Motion at session start:** chirps' ready-pulse (per §4.4) is the only motion in the column. This draws the eye to the one tappable element.

### 7.2 Full ladder — 5 live verbs, ghost terminated

When viral_stunts is unlocked, the ghost slot is removed permanently. The column shows:

```
┌──────────────────────────────────┐
│  (spotlight — viral_stunts)      │  ← most-recent (sticky)
│  (livestreams)                   │
│  (podcasts)                      │  ← scrolls
│  (selfies)                       │
│  (chirps)                        │
│  [brand-deal strip]              │
└──────────────────────────────────┘
```

**Visual change on ghost termination:** when the last ghost (viral_stunts) awakens, the awakening animation plays (§3.4). On Unlock tap, the ghost slot transitions to a live-verb spotlight (normal §5.2 sequence). But **no new ghost appears below it** — the slot simply terminates. The column's stable endstate is 5 live verbs + brand-deal.

**Terminator animation:** 200ms after the spotlight transition completes (T+1100ms total), any residual ghost-slot DOM unmounts with a 200ms fade-out. The fade is slow enough to be noticed in peripheral vision but not slow enough to feel like lag.

### 7.3 Cooldown floor crossing (reserved)

Under the current level-driven cooldown formula, no verb reaches the ≤100ms threshold where the cooldown ring would need to stop animating (see §4.5). This edge case is reserved for future balance changes that raise `max_level` beyond 10. If triggered, the transition animation should: decelerate the ring drain to full-and-still over 400ms, then pulse the autoclicker badge once (1.0 → 1.15 → 1.0 over 300ms) to confirm the floor-crossing purchase.

### 7.4 Insufficient engagement for Unlock

Covered in §3.4 — the Unlock cost text renders in disabled-amber, tap is no-op with 120ms horizontal shake feedback.

---

## 8. Motion Briefs (Summary)

Consolidated reference — each motion was defined in its section above; this is the lookup table for implementation.

| Motion | Trigger | Duration | Easing | Communicates |
|---|---|---|---|---|
| Ghost awakening — opacity | `total_followers >= unlock_threshold` | 400ms | ease-out | threshold met |
| Ghost awakening — height grow | same | 400ms (T+200→600) | ease-out | ghost becoming instrument |
| Ghost awakening — chromatic bloom | same | 600ms (T+300→900) | radial fade | verb arriving |
| Ghost awakening — cost text fade-in | same | 200ms (T+400→600) | linear | call-to-action ready |
| Cooldown drain | `now - last_tap < cooldownMs` | = `cooldownMs` | linear | time-to-ready |
| Ready pulse (glow + dot) | cooldown = 100% | 1.2s loop | sine | this is tappable |
| Tap-not-ready shake | tap while mid-cooldown | — | — | (no shake — rejected per §4.4) |
| Insufficient-engagement shake | tap ghost unlock without funds | 120ms | horizontal oscillation | purchase blocked |
| Autoclicker-tick badge pulse | autoclicker burst fires | 200ms | ease-out | autoclickers active |
| Autoclicker float — individual | autoclicker burst (≤8 autoclickers) | 500ms per float, staggered over min(N×60ms, 400ms) | ease-out | passive earn attribution |
| Autoclicker float — batched | autoclicker burst (>8 autoclickers) | 500ms | ease-out | aggregate passive earn |
| Spotlight demote — accent fade | new verb unlocked | 200ms (T+100→300) | ease-out | old recency loss |
| Spotlight promote — reorder | new verb unlocked | 300ms (T+300→600) | ease-out | new verb in place |
| Spotlight promote — accent fade-in | new verb unlocked | 300ms (T+600→900) | ease-out | new recency set |
| Column auto-scroll to spotlight | new verb unlocked | 400ms | ease-in-out | attention recentered |
| Floor-crossed settle (reserved) | cooldown crosses ≤100ms (unreachable at current max_level) | 400ms | ease-out | permanent-ready |
| Floor-crossed badge celebration (reserved) | same | 300ms (T+400→700) | ease-out | purchase confirmed |
| Ghost slot termination | viral_stunts awakened + unlocked | 200ms (T+1100→1300) | fade-out | ladder complete |
| Scroll edge gradient | internal scroll active | static | — | more content above/below |

**Motion discipline:** every motion in the table communicates state, consequence, progression, or affordance. No decoration. Per `roles/ux-designer.md`: if a motion doesn't communicate, remove it.

---

## 9. Accessibility

### 9.1 Tap targets

- Live-verb button: 80px height × 320px width. Exceeds iOS 44px minimum, exceeds WCAG 2.5.5 recommended 44px, exceeds `actions-column.md` OQ4 80px floor.
- Ghost slot (pre-awakening): 60px, not tappable — no tap-target concern.
- Ghost slot (post-awakening): transitions to 80px before tap is accepted.
- Autoclicker badge: not independently tappable — part of the button hit area.
- Ready-pulse dot: not independently tappable — decorative.

All tap targets satisfy the 44px iOS minimum and the 80px Actions-column floor.

### 9.2 Color independence

Every color signal is paired with a non-color signal:

| Signal | Color | Paired signal |
|---|---|---|
| Verb identity | color lane (§11) | icon shape, verb name text |
| Cooldown state | fill ring (color lane) | fill height (drain position) |
| Ready state | pulse glow (color lane) | "ready" label / pulsing dot motion |
| Mid-cooldown state | 20% desaturation | draining ring animation |
| Spotlight slot | top-border accent (color lane) | position (sticky top/bottom) |
| Insufficient-engagement | disabled-amber text | shake motion on tap |
| Ghost slot | 0.35 opacity | silhouette rendering, "at N followers" text |
| Autoclicker active | badge color | `×N` count number + badge pulse motion |
| Autoclicker float vs manual float | opacity (0.7 vs 1.0) | size (18px vs 22px) |

No state in this spec is communicated by color alone.

### 9.3 Contrast targets

- Live-verb button text (verb name, yield, pulse label): 4.5:1 against column background `#0b0d12`. Each color-lane token's text variant was verified in `ux/visual-identity.md` §2 for the 4 existing verbs; chirps needs verification (§11).
- Live-verb cooldown fill ring: 3:1 against column background (WCAG 1.4.11). Color-lane tokens pass at 100% opacity per `ux/visual-identity.md`.
- Autoclicker badge: 4.5:1 text on a `rgba(verb-color, 0.25)` background. Verify per-verb in implementation — the 0.25 alpha may require lightening the text variant.
- Ghost slot text: **2.5:1 — below 4.5:1 minimum, accepted knowingly** (see §3.3).
- Disabled-amber (insufficient engagement): `#c45a10` at 60% opacity. Effective contrast ~3:1 — passes 1.4.11 for UI components.

### 9.4 CVD (color-vision-deficient) considerations

Per `ux/visual-identity.md` §2, the four existing ladder verbs' color lanes are CVD-reviewed. Chirps is net-new; CVD review of the proposed color token (§11) is part of the OQ1 game-designer consultation.

Within the Actions column, the spotlight slot's top-border accent is always the verb's own color lane — which means a CVD player may see the accent color less distinctly. **Compensating signal:** the spotlight slot's position (sticky top/bottom) is the primary differentiator. Position + 2px accent together carry the signal.

### 9.5 Reduced motion

Per `prefers-reduced-motion: reduce`:

- Ready-pulse glow/dot: disabled (static ready label instead).
- Autoclicker-tick badge pulse: disabled.
- Autoclicker floating numbers: suppressed entirely. Autoclicker activity communicated solely through the engagement counter's climb rate (always visible, non-animated).
- Manual tap floating numbers: still appear but snap to position without drift animation (instant appear + fade-out only).
- Cooldown drain animation: retained (it is the state, not decoration).
- Ghost awakening: plays but compressed to 200ms opacity change only, no bloom, no height animation.
- Spotlight transition: position change happens instantly; accent fade-in plays at 100ms.
- Ghost termination fade-out: plays at 100ms.
- Insufficient-engagement shake: disabled (use disabled-amber text color only as the block signal).

The reduced-motion mode preserves all state information; it only removes decorative emphasis.

### 9.6 Keyboard / screen-reader

- Each live-verb button is a `<button>` element with `aria-label="{verb name}, {yield} engagement per tap, cooldown {cooldownMs}ms"`.
- Ghost slot before awakening: rendered as non-interactive `<div>` with `aria-label="{verb name} locked at {threshold} followers"`.
- Ghost slot after awakening: rendered as `<button>` with `aria-label="Unlock {verb name} for {cost} engagement"`.
- Cooldown state is announced via `aria-live="polite"` on state change ready→cooldown and cooldown→ready. Polite (not assertive) because the player does not need urgent interruption.
- Autoclicker badge: included in the button's aria-label as "{autoclicker_count} autoclickers" when `autoclicker_count > 0`. Updated on purchase.

---

## 10. What Engineer Task E4 Needs From This Spec

Explicit handover — engineer task E4 (Actions-column ladder UI wiring) should find these in this doc:

1. **Component tree:** `<ActionsColumn>` renders a `<GhostSlot>` (0-or-1) and N `<LiveVerbButton>` components, plus the existing `<BrandDealSlot>` from `ux/brand-deal-card.md`.
2. **Per-verb data contract:** `LiveVerbButton` props = `{ verbId, yieldPerTap, autoclickerCount, count, cooldownMs, lastTapAt, isSpotlight, colorLane, icon }`. Derived from the `GeneratorDef` + `GeneratorState` union, per `manual-action-ladder.md` §12. Note: `autoclickerCount` drives the badge (§4.2); `count` drives the yield display formula (`base_event_yield × (1 + count)`); both are needed.
3. **Per-verb state machine:** `idle | ready | mid-cooldown | just-tapped | automating` — states drive ring fill + pulse indicator + badge pulse.
4. **Awakening state machine:** `promise | awakening | unlocked-pending-purchase` for ghost slots.
5. **Spotlight transition choreography:** §5.2 sequence, 900ms total.
6. **Motion specs:** all durations + easings in §8 Motion Briefs table.
7. **Sticky positioning rules:** spotlight top (desktop) / bottom (mobile), brand-deal sticky bottom (unchanged).
8. **Scroll affordance:** 12px gradient scroll edges, native momentum, no scrollbar.
9. **Reduced-motion fallbacks:** §9.5 list (note: autoclicker floats fully suppressed under reduced motion).
10. **Per-verb color lane tokens:** reuse from `ux/visual-identity.md` §2.1–2.7 for the 4 existing verbs; chirps per §11 below.
11. **Autoclicker floating-number emission contract (§4.6):** stagger window = `min(N × 60ms, 400ms)`, density cap at 8 (switch to batched `+total ×N` format), visual differentiation = 80% size + 0.7 opacity vs manual. Reduced-motion: suppress all autoclicker floats.
12. **Yield display formula:** `base_event_yield × (1 + count)` — updates on BUY purchase, triggers rate-flare per `ux/purchase-feedback-and-rate-visibility.md` §5.
13. **Badge semantics:** `×N` badge shows `autoclicker_count` (army size), hidden when 0. Badge pulses on each autoclicker burst (200ms scale 1.0→1.05→1.0).

Engineer should NOT need to make visual or interaction judgment calls implementing E4. If ambiguity surfaces, it is a spec bug — flag back to ux-designer.

---

## 11. Per-Verb Iconography

Four of five ladder verbs reuse existing `ux/visual-identity.md` §2 iconography and color lanes unchanged:

| Verb | Icon source | Color token |
|---|---|---|
| selfies | `ux/visual-identity.md` §2.1 | `#e07040` (warm) |
| livestreams | `ux/visual-identity.md` §2.6 | `#9a3adf` (saturated video) |
| podcasts | `ux/visual-identity.md` §2.5 | `#5a6adf` (text lane indigo) |
| viral_stunts | `ux/visual-identity.md` §2.7 | `#df3a5a` (saturated red-pink) |

**Chirps is net-new** — proposed iconography and color follows. Pending game-designer confirmation (OQ1).

### 11.1 Chirps — proposed icon + color

| Property | Value (proposed) |
|----------|-------|
| **Category badge** | Starter (circle — reused from §2 convention) |
| **Semantic lane** | Text — cool (shares lane with hot_takes, tutorials, podcasts) |
| **Color token** | `#4d9ef0` — sky-blue, distinct from Chirper platform (`#4da6ff`) by subtle hue + lower saturation |
| **Icon direction** | A small speech bubble with a single short horizontal line inside — a one-liner tweet. Simpler than hot_takes' speech-bubble-with-lightning. The single line inside is the joke: it's *just* a take, the most minimal content unit. Reads at 24px. |
| **Design note** | Chirps is the floor verb — text-medium, rapid-fire, low-yield. Color should feel cool and fast, distinct from the other text-lane generators (hot_takes electric blue, tutorials teal, podcasts indigo) and from Chirper platform's electric sky. Lower saturation (`#4d9ef0` vs Chirper's `#4da6ff`) differentiates them in-game. |

**CVD check:** sky-blue reads distinct under protanopia/deuteranopia/tritanopia. Within the text lane, the four blues (chirps `#4d9ef0`, hot_takes `#3a8ae0`, tutorials `#3aaad0`, podcasts `#5a6adf`) vary in lightness, warmth, and saturation. Tritanopia may compress chirps vs hot_takes — icon shape (minimal speech bubble vs bubble-with-lightning) carries the primary differentiation.

**Contrast check:** `#4d9ef0` on `#0b0d12` — estimated ~7:1. Passes 3:1 (UI component) and 4.5:1 (text) at full opacity.

**Relationship to Chirper platform:** the two are intentionally aligned ("Chirp" is the tweet verb, Chirper is the platform). The slight hue-saturation offset preserves per-entity identity. If the `platform-identity-and-affinity-matrix.md` proposal renames Chirper to Skroll, this color relationship resets — revisit the chirps color pass then.

---

## 12. Open Questions

1. **Chirps visual identity — satirical tone confirmation.** §11.1 proposes a minimal speech bubble with a single horizontal line, colored `#4d9ef0`, in the text-cool lane. The tone question — does "just a take, the most minimal content unit" correctly express chirps' satirical register as the rapid-fire floor verb? — is game-designer territory. **Owner: game-designer.** Resolution action: game-designer confirms or proposes alternative icon direction, then ux-designer extends `ux/visual-identity.md` §2 with a new subsection 2.8 Chirps.

2. **Platform affinity visuals on verb cards — deferred.** Per-verb iconography in this spec does NOT carry platform-affinity cues (e.g., a Chirper icon badge showing "this verb lands well on Skroll"). This was considered and deferred: the player's mental model at click time is "I am tapping a verb," not "I am routing to a platform" (per `manual-action-ladder.md` OQ17 resolution). Platform-affinity readouts live on platform cards (right column), not on verb buttons. Revisit if playtesting reveals players asking "which platform does this feed?" **Owner: ux-designer, post-playtest.**

3. **Cooldown ring edge-case during viral burst.** During a viral burst (per `ux/core-game-screen.md` §9), the screen-edge vignette takes on the originating platform's affinity color. The cooldown fill ring is also edge-mounted (left edge of button). Visual conflict risk: verb color ring vs viral-burst vignette edge color. Resolution direction: the 3px ring is inside the column (at 320px-mark from screen edge on desktop), so it is ~320px clear of the screen-edge vignette — no spatial overlap. Flagged as a concern to verify during the viral burst implementation pass. **Owner: ux-designer, verify in-context.**

4. **Follow-up spec updates:** `ux/core-game-screen.md` §2 and `ux/mobile-layout.md` §7 need edits to reflect the Actions zone's new composition (ladder + ghost + brand-deal) — flagged in `manual-action-ladder.md` review log line 581, not addressed in this spec. **Owner: ux-designer, follow-up task.**
