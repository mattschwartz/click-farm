# Brand Deal Card — UX Spec

> **Extended by:** `ux/gig-cards.md` — Brand Deal is one variant of the Gigs system (per `proposals/accepted/gigs-system.md`). `gig-cards.md` supersedes this spec's **card anatomy**, **entrance motion**, and **color values** with per-variant treatments and light-mode-aligned accent values. The **expiry behavior**, **activation choreography**, **deal-active badge structure**, **compound moment signal**, **mobile adaptation**, and **accessibility** sections below remain authoritative and are extended per-variant in `gig-cards.md`.
>
> **Scope:** Defines the deal offer card, its appearance and expiry behavior, the activation choreography, and the deal-active badge that tracks a running boost. This is the player-facing surface for the brand deal mechanic — the game's active-agency counterpart to the passive viral burst.
>
> **Not in scope:** Brand deal trigger frequency, boost magnitude, follower unlock thresholds (game-designer territory), game state model for `brandDeal.active` (architect territory — see `proposals/draft/brand-deal-boost.md` OQ3).
>
> **Implements:** `proposals/draft/brand-deal-boost.md` — ux-designer review (OQ4 resolution)
>
> **Against contract:** `proposals/draft/brand-deal-boost.md` §6 — `StaticData.brandDeal`; pending architect answer on `GameState.brandDeal` shape
>
> **Integrates with:** `ux/core-game-screen.md` §9 (viral burst choreography — compound moment), `ux/purchase-feedback-and-rate-visibility.md` §5.1 (rate flare)

---

## Decisions Taken in This Spec

1. **The offer card lives in the post zone, below the Post button.** The post zone (left column) is the player's primary action surface in early game. Surfacing the deal card here keeps the deal in the same physical zone the player is already looking at. It does not displace the Post button.
2. **Expiry is communicated via slow opacity fade, not a timer.** A countdown creates urgency-as-anxiety. Fading communicates impermanence without alarm. The player who notices the card dimming understands; the player who misses it loses only an opportunity, not a resource.
3. **Corporate green is the deal color lane.** The viral burst owns gold. The deal needs its own color identity. Corporate green (`#2a7a3b` → `#3aaa50` range) reads "money / deal / transaction" culturally, maps to the game's satirical corporate aesthetic, and does not conflict with the amber risk language or viral gold.
4. **Activation feels like signing a contract, not triggering an explosion.** The deal is a deliberate business transaction. The stamp/snap activation differentiates it from the viral burst's chaotic energy — same economy, opposite emotional register.
5. **The deal-active badge lives below the rate sub-label in the engagement counter zone.** It needs to be glanceable alongside the rate display — the player monitoring their rate during a boost needs both pieces of info in one zone. It does not displace the rate sub-label.
6. **Compound signal is minimal by design.** When deal + viral overlap, adding another full visual layer to an already intense screen would compete rather than celebrate. The compound signal belongs on the deal badge — a gold pulse on the corporate green badge acknowledges "both are running" without adding a third visual system.

---

## 1. Emotional Arc — The Deal Moment

| Beat | Player state | What the screen owes them |
|------|--------------|---------------------------|
| **Notice** | Playing normally | Card appears in peripheral view. Player sees it without it interrupting focus. |
| **Consider** | Aware of the deal | "Do I take it now or wait for a viral?" Low pressure. The deal will be here for 90 seconds. |
| **Decide** | Watching the clock (dimming) | The fading card is the prompt. Not a countdown — a gradual disappearance. |
| **Activate** | Taps the card | Satisfying, corporate. The transaction is done. |
| **Monitor** | Running boost | Rate is visibly higher. Badge shows remaining time. The player knows it's working. |
| **Compound** (if viral fires) | Elation | Both things are happening at once. The counter is the star. The badge acknowledges the overlap quietly. |
| **Expiry** | Boost ends | Badge fades. Rate returns to baseline. Rate flare fires (penalty direction, per §5.3 of purchase-feedback spec). |

---

## 2. The Offer Card

### 2.1 Position and dimensions

- **Position:** Bottom of the post zone column, below the `[rate display]` label. Floats over the column bottom — does not push the Post button or rate display upward.
- **Width:** 288px (post zone is 320px; 16px margin each side)
- **Height:** 88px
- **Z-order:** Above the main screen content, below modals.

**Desktop layout in context:**

```
┌──────────────────────────────────────────┐
│   POST ZONE (320px)                      │
│                                          │
│   ┌──────────────────────────────────┐   │
│   │           POST                   │   │
│   │           +12                    │   │  ← 260×220px post button
│   └──────────────────────────────────┘   │
│                                          │
│   [+6.8/sec]                             │  ← rate display
│                                          │
│   ┌──────────────────────────────────┐   │
│   │  BRAND DEAL               [3×]  │   │  ← offer card (88px)
│   │  "SponsoredContent™ is          │   │
│   │   interested."                   │   │
│   └──────────────────────────────────┘   │
└──────────────────────────────────────────┘
```

### 2.2 Card anatomy

```
┌─────────────────────────────────────────────────┐
│  BRAND DEAL                              [3×]   │  ← header row
│                                                  │
│  "SponsoredContent™ is interested."             │  ← flavor text
│  20 sec boost                                    │  ← duration label
└─────────────────────────────────────────────────┘
```

**Header row:**
- **"BRAND DEAL"** — 11px uppercase, weight 500, corporate green (`#3aaa50`), left-aligned
- **Multiplier badge `[3×]`** — pill label, 14px weight 700, corporate green text on dark-green background (`rgba(42, 122, 59, 0.25)`). This is the largest visual element. The player's eye should hit it immediately.

**Flavor text:**
- 13px, weight 400, full contrast (P2 4.5:1)
- One line, italic, satirical-corporate tone (see §2.5 for copy direction)

**Duration label:**
- 11px, muted contrast (4.5:1), not a timer — just metadata. "20 sec boost."

**Card visual style:**
- Background: panel color with a subtle corporate-green left-edge stripe (3px, `#2a7a3b` at 70% opacity)
- Border: 1px solid corporate green at 30% opacity
- Border-radius: 6px
- Drop shadow: 0 2px 8px rgba(0,0,0,0.4) — slight elevation to indicate it's a new layer on the screen

### 2.3 Appearance animation

The card **slides up** from below the bottom edge of the post zone:
- `translateY` from +88px → 0, `opacity` from 0 → 1.0
- Duration: 300ms, ease-out
- Sound: a soft "ping" — short, higher-register, distinctly different from click-to-post (warm) and viral (sweeping). Corporate notification aesthetic.

**Why slide-up:** the card originates from below, reinforcing its arrival into the player's space. It draws the eye downward-then-upward naturally, distinct from the Post button's centered presence above it.

### 2.4 Expiry behavior

The card is live for 90 seconds after appearance.

| Time window | Visual state |
|---|---|
| t=0 → t=60s (first 67%) | Full opacity (1.0). No change. |
| t=60s → t=90s (final 33%) | Linear opacity fade: 1.0 → 0.4 over 30s |
| t=90s | Final fade-out: opacity 0.4 → 0 over 400ms |

**No countdown text. No timer bar. No color alarm.** The fading card is the only expiry signal. A player paying attention sees it dimming and understands. A player who doesn't notice it expire lost only an opportunity — not a resource, not a streak.

**Interaction during fade:** the card remains fully tappable even at 0.4 opacity. Opacity affects only appearance, not hit area.

### 2.5 Flavor text copy direction

The flavor text reads as a corporate solicitation — dry, satirical, slightly too enthusiastic. One line per offer, drawn at random from the rotation pool.

**Voice targets:** straight-corporate, corporate jargon, AI-era tells, meta-satirical. Mix across the pool so consecutive deals don't feel like one note.

**Launch copy pool (game-designer, 2026-04-05):**

| # | Line | Voice register |
|---|---|---|
| 1 | *"SponsoredContent™ is interested."* | straight-corporate |
| 2 | *"A brand noticed you."* | straight-corporate |
| 3 | *"Partnership opportunity detected."* | straight-corporate |
| 4 | *"Your metrics are attractive."* | slightly-uncomfortable |
| 5 | *"Algorithmic synergy confirmed."* | jargon |
| 6 | *"You're on our radar."* | straight-corporate |
| 7 | *"Our AI flagged your vibes."* | AI-era tell |
| 8 | *"Let's circle back on leverage."* | jargon |
| 9 | *"Your reach aligns with our KPIs."* | jargon |
| 10 | *"A deck with your name exists."* | meta-satirical |
| 11 | *"VibeShift™ sees potential."* | fictional-brand |
| 12 | *"You tested well with our AI."* | AI-era tell |
| 13 | *"Brand-safe and ready to activate."* | jargon |
| 14 | *"Synergistic fit identified."* | jargon |
| 15 | *"Your aesthetic is on-trend."* | straight-corporate |

**Format constraint:** one line, ≤40 characters. Engineers can treat this as a static rotation array in `StaticData.brandDeal.flavorLines`. Selection: uniform random per offer. No "don't repeat" logic required — the pool is large enough and the cadence slow enough that occasional repeats read as natural, not broken.

**What to preserve on future additions:** lines should read as *solicitations* (someone reaching out), not as *awards* (the player being recognized). The player should feel noticed, not celebrated. The joke is that you are a unit of attention the market has identified, not a person with merit. Affectionate, not cruel — the satire is on the corporate voice, not the player.

### 2.6 Only one card at a time

Per proposal §2: only one deal offer is live at a time. The card does not stack. If a new deal would spawn while one is already visible (unlikely given 1–2 min intervals vs. 90s expiry), the new spawn is deferred until the current card expires or is activated.

---

## 3. Activation

### 3.1 On tap

1. **t=0–200ms:** Card **snaps shut** — `scale` from 1.0 → 0, `opacity` from 1.0 → 0. Spring easing (high stiffness, low damping — the card collapses with a physical snap feel, not a gentle fade).
2. **t=0–16ms:** Sound: a dry, short stamp/paper-slap. Not a click, not a sweep — the sound of signing something. Corporate. Satisfying.
3. **t=100–500ms:** Rate display flares per `purchase-feedback-and-rate-visibility.md §5.1` — rate snaps to `current_rate × 3`, numeral scales 1.0→1.12→1.0, color shifts to corporate green.
4. **t=200–350ms:** Deal-active badge appears (§4) — fade in, 150ms.

### 3.2 What activation is not

The activation is **not** an explosion. No particles. No screen-edge flash. No background change. The corporate aesthetic of the deal demands a contained, deliberate visual treatment. The rate flare is the signal that something real just happened to production. The badge is the ongoing monitor. Everything else stays out of the way.

---

## 4. Deal-Active Badge

### 4.1 Position

Below the rate sub-label in the engagement counter zone (top bar). The zone becomes:

```
  Engagement
     12,480
    +20.4/sec
  ┌──────────────────────┐
  │ BRAND DEAL  ▰▰▰▰▰▰░░ │  ← deal-active badge
  └──────────────────────┘
```

The badge does not displace the rate sub-label — it appears below it. Top bar height expands by 28px while the badge is active (from 80px to 108px). This is the only time the top bar changes height.

### 4.2 Anatomy

- **Width:** ~180px (wide enough for label + progress bar, narrow enough to not crowd the engagement counter zone)
- **Height:** 22px
- **Border-radius:** 4px
- **Background:** `rgba(42, 122, 59, 0.15)` — very subtle green wash
- **Border:** 1px solid `#3aaa50` at 60% opacity

Content (left to right):
- **"BRAND DEAL"** label — 9px uppercase weight 500, corporate green, left side
- **Progress bar** — right side, depleting left-to-right over the boost duration (`brandDeal.durationMs`, default 20s)
  - Track: transparent with green border at 30% opacity
  - Fill: corporate green at 70% opacity
  - Width: ~80px

### 4.3 Progress bar depletion

Linear depletion over `durationMs`. The bar communicates "how much time is left" so the player knows when to expect the boost to end. This timer is fine once the boost is active — the player has already committed, they want to monitor the window.

**No numeric timer alongside the bar.** The bar is the timer. A number would add clutter to an already information-dense top bar.

### 4.4 Boost expiry

When the boost ends (`durationMs` elapsed):
1. **Rate flares again** — this time in the penalty direction (per `purchase-feedback-and-rate-visibility.md §5.3`) — rate returns to baseline, numeral pulses amber-red briefly to communicate "the boost ended."
2. **Badge fades out** — opacity 1.0 → 0 over 400ms, ease-out.
3. **Top bar height contracts** — 108px → 80px over 200ms ease-out. Smooth, not jarring.

**Why flare on expiry:** the player needs to know the boost ended. Without a signal, they may not notice the rate dropped, or may distrust the counter. The penalty-direction flare is honest — the rate went down, here's when.

---

## 5. Compound Moment Signal

When a brand deal boost and a viral burst are simultaneously active:

- The deal-active badge's border pulses **viral gold** (`#f0a500` range) at a 1.5s cycle — on top of the corporate green fill.
- The pulse is opacity-only on the border (60%→100%), not a scale change — the badge doesn't move.
- Duration: for as long as the overlap persists.
- On viral decay: border returns to corporate green immediately (100ms crossfade).

**What this communicates:** "Two things are running at once." The player who is watching the badge sees the gold pulse and understands the stacking. The player who isn't watching the badge just sees the counter climbing faster than they've ever seen it — that's the real signal.

**This is the only additional visual element during compound.** No new particles, no background change, no additional vignette layer. The viral event owns the screen during its peak; the deal badge just acknowledges the overlap quietly.

---

## 6. Mobile Adaptation

### 6.1 Card position on mobile

The post zone is a fixed bottom bar on mobile. The deal card appears **above the post bar** — a full-width strip between the prestige row and the post bar.

```
├────────────────────────────┤
│  PRESTIGE ROW       (48px) │
├────────────────────────────┤
│  BRAND DEAL     [3×]       │  ← deal card, full-width (88px)
│  "Partnership detected."   │
│  20 sec boost              │
├────────────────────────────┤
│  POST ZONE          (96px) │
└────────────────────────────┘
```

- **Width:** full screen width minus 24px horizontal padding
- **Behavior:** identical to desktop — slides up from bottom, fades on expiry, snaps on activation

### 6.2 Deal-active badge on mobile

Same position as desktop — below the rate sub-label in the top bar. Top bar height expands from 72px to 100px while active. Same anatomy. Badge width adjusts to fit the compact top bar.

---

## 7. States

| State | Visual |
|---|---|
| No deal available | Nothing. No placeholder, no empty space. The post zone bottom is just the rate display. |
| Deal offered | Card visible, full opacity. |
| Deal fading (final 33% of expiry) | Card at reduced opacity (1.0 → 0.4 over 30s). |
| Deal expired | Card fades out and disappears. Nothing replaces it. |
| Deal active (boost running) | Card gone. Deal-active badge in top bar. Rate in corporate green. |
| Deal active + viral active | Same as above, badge border pulses viral gold. |
| Boost expired | Badge fades, rate flares penalty-direction, top bar contracts. |

---

## 8. Accessibility

- **Contrast:** card text at P2 (4.5:1). Multiplier badge at P1 (7:1) — it's the primary data element on the card. Deal-active badge label at 4.5:1 against top bar background.
- **Color independence:** the corporate green color lane is paired with text ("BRAND DEAL", "3×") — never color alone.
- **CVD safe:** corporate green (`#3aaa50`) is distinguishable under protanopia and deuteranopia simulation — it reads as a lighter, more yellow-green to CVD players, distinct from the amber risk color and the white/grey of normal elements. Test in simulator before shipping.
- **Reduce Motion:** slide-up appearance becomes a 150ms fade-in. Snap activation becomes a 150ms fade-out. Deal-active badge fades in/out (no height transition on top bar — it snaps). Compound pulse on badge is replaced with a static gold border.
- **Hit area:** card is the full 288×88px — well above the 44×44px minimum. On mobile, the card spans full width.
- **Keyboard:** card focusable via Tab. Enter activates. Screen reader announces: "Brand deal available: 3× engagement rate for 20 seconds. Tap to activate."

---

## 9. Motion Brief

| Element | Triggers | Duration | Easing | Communicates |
|---|---|---|---|---|
| Card slide-up | Deal spawns | 300ms | ease-out | Offer arrived |
| Card opacity fade | Final 33% of expiry window | 30s linear | linear | This won't last forever |
| Card expiry fade-out | t=90s | 400ms | ease-out | Offer gone |
| Card snap-shut | Tap to activate | 200ms | spring | Transaction complete |
| Rate flare (green) | Activation | 400ms | ease-out | Rate just increased |
| Badge fade-in | Activation | 150ms | ease-out | Boost is running |
| Badge progress depletion | Boost duration | duration_ms linear | linear | Time remaining |
| Badge compound pulse | Viral fires during boost | 1.5s cycle | ease-in-out | Both are running |
| Rate flare (penalty) | Boost expires | 400ms | ease-out | Boost ended, rate fell |
| Badge fade-out | Boost expires | 400ms | ease-out | Boost over |
| Top bar height expand | Badge appears | 200ms | ease-out | New info in bar |
| Top bar height contract | Badge disappears | 200ms | ease-out | Bar returning to normal |

---

## 10. Open Questions

1. **Data contract for the offer card.** The card needs: boost multiplier, boost duration, a flavor text key or string, and the current expiry timestamp (or remaining ms). OQ3 from `proposals/draft/brand-deal-boost.md` was resolved by the game-designer — the state model has two sub-states: `offer` (visible, untapped) and `active` (tapped, running). The architect implements this model. The UI subscribes to `GameState.brandDeal.offer` to render the card, and `GameState.brandDeal.active` to render the badge. **Owner: architect (implement the state model per game-designer's OQ3 resolution)**
2. ~~**Flavor text copy pool.** Minimum 10 satirical-corporate one-liners needed for rotation. **Owner: game-designer (copy pass)**~~ **[RESOLVED — game-designer, 2026-04-05]** 15-line launch pool written into §2.5 above, with voice-register labels for tonal balance and a guideline for future additions.
3. **Top bar height expansion on mobile.** Expanding the top bar from 72px to 100px may cause a reflow in the zone stack. Engineer to test — if reflow is jarring, the badge can instead overlay the post zone area rather than expanding the top bar. **Owner: engineer (implementation call)**
4. **Multiple simultaneous deal offers (future).** This spec and the proposal both state one deal at a time. If multi-tier deals are introduced post-launch (e.g., a "mega deal" at higher follower counts), this spec would need revision. Not a current concern. **Owner: game-designer / ux-designer (post-launch, if needed)**

---

## 11. References

1. `proposals/draft/brand-deal-boost.md` — game mechanic spec; ux-designer review section contains the design direction this spec formalizes
2. `ux/core-game-screen.md` §9 — viral burst choreography; compound moment interaction
3. `ux/purchase-feedback-and-rate-visibility.md` §5.1, §5.3 — rate flare on change (success and penalty direction)
4. `ux/core-game-screen.md` §2 — zone map; post zone layout that this card occupies
5. `ux/mobile-layout.md` §7 — post zone on mobile; card position adaptation
6. `roles/ux-designer.md` — trust signal design, motion as communication, CVD accessibility
