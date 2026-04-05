# Gig Cards — UX Spec

> **Scope:** Defines the per-variant card treatment for the three launch Gig variants — Brand Deal, Livestream, and Convention. Covers visual hierarchy, card anatomy, entrance motion, color accents, iconography, flavor copy, and active-badge behavior for each variant. The expiry fade, activation stamp/snap, and compound-moment signal are carried forward from `brand-deal-card.md` with per-variant deltas called out explicitly.
>
> **Supersedes (in part):** `ux/brand-deal-card.md` — card anatomy and entrance motion sections are superseded by this spec. Expiry, activation, deal-active badge, compound signal, mobile layout, and accessibility sections of `brand-deal-card.md` remain authoritative and are extended here.
>
> **Implements:** `proposals/draft/gigs-system.md` — OQ3 (card visual treatment) and OQ6 (on-card label) resolved in that proposal and carried forward here.
>
> **Against contract:** `proposals/draft/gigs-system.md` §2 (variant roster), §3 (rarity weights), architect review (GigOffer/ActiveGig state model). Card renders `GigOffer.variant_id` → variant config from `StaticData.gigs.variants[variant_id]`.
>
> **Integrates with:** `ux/brand-deal-card.md` §4 (deal-active badge), §5 (compound moment signal), `ux/core-game-screen.md` §9 (viral burst choreography)

---

## Decisions Taken in This Spec

1. **Duration is the loudest element on every variant card.** Variant recognition at tap-time is decision-critical — Convention's 10s window leaves no room to misread and hesitate. The card hierarchy inverts the conventional card-reading order: duration first, variant name second, icon third, flavor copy fourth. This is intentional.
2. **Rarity signals through arrival motion, not static art.** The three variants share a card grammar. Differentiation comes from how the card enters — timing, easing, spring behavior, and sound. A uniform entrance with different icons kills the emotional register; a fast spring-overshoot entrance with a chime-pop on Convention produces "Oh, a con!" even when the player isn't looking at the screen.
3. **Convention's entrance gets a dedicated SFX.** Visual signature alone requires the player to be watching the right area of the screen at the moment of arrival. Audio reaches the player regardless of gaze. The "Oh, a con!" emotion — the named design target — must be deliverable even when the player is watching the engagement counter. The SFX asset cost is one file. The payoff is a reliable emotional register on the game's highest-ceiling gig. No equivalent justification exists for Brand Deal or Livestream — their emotional targets don't require head-lifting recognition.
4. **Three distinct accent colors within the corporate-green lane.** All three variants stay recognizably "Gig" (as opposed to viral gold or risk amber). Within that lane, each variant carries a secondary accent that encodes its payoff character: Brand Deal neutral corporate green, Livestream warm green-toward-amber (steady, productive), Convention cooled green-toward-teal (crisp, event-like).
5. **Active badge inherits variant accent.** The badge that lives in the engagement counter zone during a running boost shows the variant name and depletes in the variant's accent color. Progress bar depletion speed is itself a signal — Convention's bar burns fast; Livestream's bar barely moves.
6. **Flavor copy pools are per-variant.** Brand Deal copy carries over from `brand-deal-card.md §2.5`. Livestream and Convention pools are specified in this document. All pools share the same format constraint (one line, ≤40 characters) and the same voice direction (satirical-corporate, affectionate, reads as solicitation not award).

---

## 1. Hierarchy Rule — All Variants

Every Gig card obeys this visual hierarchy, regardless of variant. The reading order produced by type size, weight, and color must match this priority sequence:

```
1. Duration          ← loudest: largest type, highest weight, full accent color
2. Variant name      ← second: medium caps, slightly receded
3. Icon              ← third: single glyph, card-header scale, aligned with variant name
4. Flavor copy       ← quietest: small, muted contrast, italicized
```

**Multiplier** is displayed alongside duration in the duration row — it is part of the primary payoff information but visually subordinate to the duration numeral. Duration is the strategy; multiplier is the reward. The player decides *when* based on duration, then accepts or rejects based on multiplier.

This inverts the old `brand-deal-card.md` layout (which put the multiplier badge as the largest element). The inversion is deliberate and must not be reverted for individual-variant convenience.

---

## 2. Card Anatomy — New Layout

All three variants use this layout. Per-variant values are specified in §§3–5.

**Desktop (288×88px):**

```
┌─────────────────────────────────────────────────┐
│  20s                                       3×   │  ← Row 1: Duration + Multiplier
│  BRAND DEAL                           [icon]    │  ← Row 2: Variant name + Icon
│  "SponsoredContent™ is interested."             │  ← Row 3: Flavor copy
└─────────────────────────────────────────────────┘
  ▲
  3px left-edge accent stripe (variant accent color at 70% opacity)
```

**Row specifications:**

| Row | Element | Size | Weight | Color | Notes |
|-----|---------|------|--------|-------|-------|
| 1 | Duration numeral | 28px | 700 | Variant accent, full opacity | "20s", "60s", "10s" — includes unit |
| 1 | Multiplier | 15px | 600 | Variant accent, 80% opacity | "3×", "2×", "5×" — right-aligned, vertically centered with duration |
| 2 | Variant name | 10px | 500 | Variant accent, 70% opacity | Uppercase. "BRAND DEAL", "LIVESTREAM", "CONVENTION" |
| 2 | Icon | 16px glyph | — | Variant accent, 70% opacity | Right-aligned. Single glyph per §2.1 |
| 3 | Flavor copy | 12px | 400 | Full contrast (4.5:1 min) | Italic. One line, ≤40 chars, drawn from variant pool |

**Internal padding:**
- Top: 10px
- Left/Right: 12px
- Between rows: 4px gap
- Total content height: 28 + 4 + 16 + 4 + 12 = 64px. With top 10px + bottom 4px = 78px — fits within 88px.

**Card visual style (all variants):**
- Background: panel color (dark)
- Left-edge stripe: 3px, variant accent color at 70% opacity
- Border: 1px solid variant accent color at 30% opacity
- Border-radius: 6px
- Drop shadow: `0 2px 8px rgba(0,0,0,0.4)`

### 2.1 Icons

One glyph per variant, rendered at 16px at card-header scale (Row 2, right-aligned). These are UI glyphs — not emoji, not illustrations. Single-color, variant accent color.

| Variant | Icon | Description |
|---------|------|-------------|
| Brand Deal | phone/handshake | Phone handset or handshake silhouette. Final asset: engineer to choose from system glyph set; either reads as "transaction/deal." |
| Livestream | broadcast dot / go-live badge | Circle with radiating waves (broadcast/live indicator). Distinct from notification dot — must suggest "on-air." |
| Convention | crowd / badge-lanyard | Badge-on-lanyard silhouette or simplified crowd/people cluster. Must read as "event/gathering" not "notification." |

Final icon assets are selected by the engineer from the project's icon set. The descriptions above specify the semantic — the glyph that best delivers that semantic within the available set is the right choice. If the icon set lacks a close match for any variant, flag to ux-designer before substituting.

---

## 3. Brand Deal Variant

### 3.1 Values

| Field | Value |
|-------|-------|
| Duration | 20s |
| Multiplier | 3× |
| On-card label | BRAND DEAL |
| Icon | phone/handshake |
| Accent color | `#3aaa50` (corporate green baseline) |
| Accent dark (stripe) | `#2a7a3b` |

### 3.2 Entrance animation

This is the **baseline**. Livestream and Convention are specified as deltas from this.

- **Transform:** `translateY(+88px) → translateY(0)`, `opacity: 0 → 1.0`
- **Duration:** 300ms
- **Easing:** `ease-out` — decelerates into final position. Clean, no overshoot.
- **Sound:** Soft "ping." Short, higher-register. Corporate notification aesthetic — distinct from the warm click-to-post sound and the sweeping viral sound. Sustain: brief (~150ms).

### 3.3 Flavor copy pool

From `ux/brand-deal-card.md §2.5`. 15-line pool; selection is uniform random per offer. Carried forward without change.

---

## 4. Livestream Variant

### 4.1 Values

| Field | Value |
|-------|-------|
| Duration | 60s |
| Multiplier | 2× |
| On-card label | LIVESTREAM |
| Icon | broadcast dot / go-live badge |
| Accent color | `#72aa28` (warm green, shifted toward yellow-green ~85°) |
| Accent dark (stripe) | `#537a1e` |

**Contrast:** `#72aa28` against dark panel (~`#1a1a1a`): approximate contrast ratio 5.8:1. Passes WCAG 1.4.11 3:1 for UI components. Engineer to validate against actual rendered panel color before ship.

**Color character:** shifts the corporate green baseline toward warmer, more productive yellow-green. Reads as "growth," "output," "steady yield" — distinct from the neutral corporate green but still within the same family. Does not edge into amber (risk language) or gold (viral language).

### 4.2 Entrance animation

**Delta from Brand Deal baseline:**

- **Duration:** 450ms (50% slower)
- **Easing:** `ease-out` (same, but the slower duration means the card settles in rather than snapping into position)
- **Transform:** same `translateY(+88px) → 0`, `opacity 0 → 1.0` — no additional behavior
- **Sound:** Same register as Brand Deal ping, but slightly lower in pitch (not dramatically — one semitone down is sufficient) and with slightly longer sustain (~250ms). Character: "settling in" rather than "arriving." The audio communicates duration/weight before the player reads the card.

**What this communicates:** Livestream is the long game. The slower entrance encodes that feeling before the player reads "60s." A player who has seen all three variants learns to predict: slow entrance = long window, fast entrance = short window.

### 4.3 Flavor copy pool

Voice direction: streaming culture, parasocial dynamic, the mundanity of being-on-camera, satirical-warm. One line, ≤40 characters. Reads as solicitation, not award.

| # | Line | Voice register |
|---|------|----------------|
| 1 | *"Going live. Mute the dog."* | practical/mundane |
| 2 | *"You are now live."* | flat-corporate |
| 3 | *"Stream started. Comments incoming."* | flat-corporate |
| 4 | *"Your audience is here. Perform."* | slightly uncomfortable |
| 5 | *"The algorithm wants you live."* | jargon |
| 6 | *"Technically, just be yourself."* | meta-satirical |
| 7 | *"Your internet held up. Stream it."* | practical/mundane |
| 8 | *"A platform needs your face."* | slightly uncomfortable |
| 9 | *"Live content detected."* | flat-corporate |
| 10 | *"You're on. The lag is acceptable."* | practical/mundane |
| 11 | *"Parasocial index rising."* | jargon |
| 12 | *"Live. They're watching."* | slightly uncomfortable |

**What to preserve on future additions:** Livestream lines should reflect the ongoing, committed nature of streaming — you're there for a while, it's a sustained relationship with the audience. The tension between "this is normal work" and "strangers are watching you be normal" is the tonal target.

---

## 5. Convention Variant

### 5.1 Values

| Field | Value |
|-------|-------|
| Duration | 10s |
| Multiplier | 5× |
| On-card label | CONVENTION |
| Icon | crowd / badge-lanyard |
| Accent color | `#28aa82` (cool green, shifted toward teal ~165°) |
| Accent dark (stripe) | `#1e7a5e` |

**Contrast:** `#28aa82` against dark panel (~`#1a1a1a`): approximate contrast ratio 5.4:1. Passes WCAG 1.4.11 3:1. Engineer to validate against actual rendered panel color before ship.

**Color character:** shifts the corporate green baseline toward cooler teal. Reads as "event," "crisp," "distinct" — the gig that isn't just a business transaction. Still within the corporate-green lane; does not read as viral gold or risk amber under CVD simulation. Protanopia safe: teal-green reads as a distinctly lighter, more cyan tone, separate from brand deal's warmer green. Verify in CVD simulator.

**On-card label:** "CONVENTION" — full word. "Con" is not permitted on the primary card label at any size or in any abbreviation. See `proposals/draft/gigs-system.md OQ6` for rationale (Scandal system semantic collision). Short forms ("con") may appear in secondary copy only (toast text, acknowledgment lines — not on the card itself).

### 5.2 Entrance animation

**Delta from Brand Deal baseline — significant:**

- **Duration:** 180ms (40% faster)
- **Easing:** `spring(stiffness: 400, damping: 20)` — overshoot. The card arrives at `translateY(0)` and bounces to `translateY(-6px)` before settling. Total settle time ~300ms (within the 180ms motion plus spring tail).
- **Scale:** `scale(1.08) → scale(1.0)` layered over the translate. A slight pop on arrival — the card feels like it landed with more energy than it has mass. The pop eases out over the spring tail.
- **Opacity:** `0 → 1.0` over the first 120ms (front-loaded relative to baseline)
- **Sound:** A chime-pop. Short, bright attack, faster decay than Brand Deal's ping (~80ms sustain). Distinctly different from all other UI sounds in the game — this is not a notification, it is an event. The sound should create the "what was that?" reflex that makes the player look at the card. Avoid sustained tones; the brevity is the character.

**What this communicates:** Convention is rare and brief. The entrance is punchy because the window is punchy. The overshoot spring mimics physical energy — the card doesn't ease into place, it lands. The chime-pop works even when the player is watching the engagement counter and has to lift their eyes to find the card.

**Reduce Motion:** Spring overshoot collapses to `ease-out 150ms` (same duration reduction from baseline). Scale pop: removed. Chime-pop sound remains — audio-only Convention signal is appropriate even under reduce-motion preference.

### 5.3 Flavor copy pool

Voice direction: creator convention culture, the community aspect, panels, badges, the slightly surreal experience of being recognized-but-also-a-unit-of-content. Satirical-warm. Reads as invitation, not award.

| # | Line | Voice register |
|---|------|----------------|
| 1 | *"You've been added to a lineup."* | straight-corporate |
| 2 | *"Badge picked up. Conference begins."* | flat-procedural |
| 3 | *"The venue is expecting you."* | straight-corporate |
| 4 | *"Your lanyard has your name on it."* | mundane-specific |
| 5 | *"You're on a panel. Good luck."* | slightly alarmed |
| 6 | *"Creator Summit™ is calling."* | fictional-brand |
| 7 | *"The community is assembled."* | straight-corporate |
| 8 | *"A con. A real one."* | meta-satirical |
| 9 | *"A gathering of your peers awaits."* | slightly formal |
| 10 | *"You've been invited to speak."* | straight-corporate |
| 11 | *"They want your opinion on things."* | slightly incredulous |
| 12 | *"Event badge: activated."* | flat-procedural |

**What to preserve on future additions:** Convention lines should carry the slight unreality of "I belong here, I think." The player is a content-producing unit who has been deemed sufficiently large to appear at an event — the joke is that this is exciting and also a little absurd. Affectionate, not sneering.

---

## 6. Expiry Behavior — Carried Forward

**Identical across all variants.** No per-variant deltas.

From `brand-deal-card.md §2.4`:

| Time window | Visual state |
|---|---|
| t=0 → t=60s (first 67%) | Full opacity (1.0). No change. |
| t=60s → t=90s (final 33%) | Linear opacity fade: 1.0 → 0.4 over 30s |
| t=90s | Final fade-out: 0.4 → 0 over 400ms ease-out |

No countdown. No timer bar. No color alarm. No per-variant urgency escalation — Convention's 10s window is short enough that the player either recognizes it at card-arrival and decides immediately, or they don't. Adding expiry urgency to Convention would push it from "exciting rare opportunity" into "anxiety spike," which crosses the engagement/manipulation line. The existing fade model is sufficient.

**Tappable at all opacity levels.** The card remains fully interactive even at 0.4 opacity.

---

## 7. Activation — Carried Forward with Variant Stamp

**Shared behavior** from `brand-deal-card.md §3.1`:

1. **t=0–200ms:** Card snaps shut — `scale(1.0) → scale(0)`, `opacity 1.0 → 0`. Spring easing (high stiffness, low damping).
2. **t=0–16ms:** Sound: dry stamp/paper-slap. Corporate. The deal is signed.
3. **t=100–500ms:** Rate display flares in variant accent color (not always corporate green — see below).
4. **t=200–350ms:** Deal-active badge appears (§8), fade-in 150ms.

**Per-variant delta — rate flare color:**
The rate flare on activation (`purchase-feedback-and-rate-visibility.md §5.1`) uses the variant's accent color instead of always using Brand Deal's corporate green. This is the only activation delta:

| Variant | Rate flare color |
|---------|-----------------|
| Brand Deal | `#3aaa50` (corporate green) |
| Livestream | `#72aa28` (warm yellow-green) |
| Convention | `#28aa82` (cool teal-green) |

The numeral color shift signals "which gig is running" at the engagement counter — useful during Livestream's 60s window when the player will be watching the counter for a long time.

---

## 8. Deal-Active Badge — Per-Variant Treatment

Extends `brand-deal-card.md §4`. The badge structure, position, and behavior are carried forward. Per-variant deltas:

| Element | Brand Deal | Livestream | Convention |
|---------|------------|------------|------------|
| Label text | "BRAND DEAL" | "LIVESTREAM" | "CONVENTION" |
| Accent color | `#3aaa50` | `#72aa28` | `#28aa82` |
| Progress bar fill | Corporate green 70% | Warm yellow-green 70% | Teal-green 70% |
| Progress bar depletes over | 20s — moderate pace | 60s — barely moves | 10s — burns fast |
| Bar depletion character | Steady | Patient | Urgent |

**Livestream at 60s — bar pacing note:** The Livestream badge progress bar depletes so slowly that it may read as broken to a first-time player. This is intentional: the slowly-moving bar *communicates* the uptime nature of Livestream. No numeric timer is added (consistent with `brand-deal-card.md §4.3`) — the bar is the signal. The label "LIVESTREAM" combined with a barely-moving bar is the complete communication.

**Convention at 10s — bar urgency:** The bar depletes fast enough to be visually tracking in real time. This is correct: during a Convention boost, the player is watching the bar. No additional urgency treatment needed — the fast depletion is the urgency signal.

**Screen reader:** The screen reader announcement (from `brand-deal-card.md §8`) updates per variant:
- Brand Deal: "Brand deal available: 3× engagement rate for 20 seconds. Tap to activate."
- Livestream: "Livestream available: 2× engagement rate for 60 seconds. Tap to activate."
- Convention: "Convention available: 5× engagement rate for 10 seconds. Tap to activate."

---

## 9. Compound Moment Signal — Carried Forward

**Identical across all variants.** No per-variant deltas.

From `brand-deal-card.md §5`: when any Gig boost and viral burst are simultaneously active, the deal-active badge's border pulses viral gold (`#f0a500` range) at a 1.5s cycle. The pulse is opacity-only on the border (60%→100%) — no scale change. Returns to variant accent on viral decay (100ms crossfade).

The compound signal is variant-agnostic by design. The badge label already tells the player which gig is running. The gold pulse communicates "both are running" — that is the full message.

---

## 10. States

| State | Visual |
|---|---|
| No gig available | Nothing. Post zone bottom shows only rate display. |
| Gig offered (any variant) | Card visible at full opacity. Variant-specific entrance has played. |
| Gig fading (final 33%) | Card at 1.0 → 0.4 opacity fade over 30s. Same for all variants. |
| Gig expired | Card fade-out (400ms). Nothing replaces it. |
| Gig active — Brand Deal | Badge shows "BRAND DEAL," corporate green, 20s bar. Rate numeral in `#3aaa50`. |
| Gig active — Livestream | Badge shows "LIVESTREAM," warm green, 60s bar (slow). Rate numeral in `#72aa28`. |
| Gig active — Convention | Badge shows "CONVENTION," teal-green, 10s bar (fast). Rate numeral in `#28aa82`. |
| Any gig active + viral active | Badge border pulses viral gold at 1.5s cycle. |
| Boost expired | Badge fades, rate flares penalty-direction (per `purchase-feedback §5.3`), top bar contracts. |

---

## 11. Motion Brief

| Element | Variant | Trigger | Duration | Easing | Communicates |
|---------|---------|---------|----------|--------|--------------|
| Card slide-up | Brand Deal | Gig spawns | 300ms | ease-out | Offer arrived |
| Card slide-up | Livestream | Gig spawns | 450ms | ease-out | Offer arrived (steady, unhurried) |
| Card spring-in + pop | Convention | Gig spawns | 180ms motion + spring tail | spring(400,20) | Rare event — pay attention |
| Card opacity fade | All | Final 33% of 90s expiry | 30s linear | linear | This won't last forever |
| Card expiry fade-out | All | t=90s | 400ms | ease-out | Offer gone |
| Card snap-shut | All | Tap to activate | 200ms | spring | Transaction complete |
| Rate flare (variant color) | All | Activation | 400ms | ease-out | Rate increased, this gig is running |
| Badge fade-in | All | Activation | 150ms | ease-out | Boost is running |
| Badge bar depletion | Brand Deal | Boost running | 20s linear | linear | Time remaining |
| Badge bar depletion | Livestream | Boost running | 60s linear | linear | Time remaining (patient) |
| Badge bar depletion | Convention | Boost running | 10s linear | linear | Time remaining (urgent) |
| Badge compound pulse | All | Viral fires during boost | 1.5s cycle | ease-in-out | Both are running |
| Rate flare (penalty) | All | Boost expires | 400ms | ease-out | Boost ended, rate fell |
| Badge fade-out | All | Boost expires | 400ms | ease-out | Boost over |
| Top bar height expand | All | Badge appears | 200ms | ease-out | New info in bar |
| Top bar height contract | All | Badge disappears | 200ms | ease-out | Bar returning to normal |

---

## 12. Accessibility

**Contrast targets:**

| Element | Minimum required | Notes |
|---------|-----------------|-------|
| Duration numeral (28px 700) | 3:1 (large text) | Target 4.5:1 — primary data |
| Multiplier (15px 600) | 4.5:1 (normal text) | At 80% opacity, measure rendered value against panel |
| Variant name (10px 500 uppercase) | 4.5:1 | Small text; uppercase does not earn large-text exemption at this size |
| Icon glyph (16px) | 3:1 (UI component) | |
| Flavor copy (12px 400) | 4.5:1 | |
| Left-edge stripe (3px) | 3:1 (UI component) | At 70% opacity; measure rendered value |
| Card border (1px) | 3:1 (UI component) | At 30% opacity; measure rendered value |
| Badge label (9px uppercase) | 4.5:1 | |
| Badge progress bar fill | 3:1 (UI component) | At 70% opacity; measure against track background |

**Opacity trap:** All accent colors are specified at base opacity. The 70%/30%/80% opacity values applied to stripe, border, and multiplier must be validated against actual rendered backgrounds — not estimated. Measure with the DevTools color picker against the rendered panel color.

**CVD simulation:** Run all three variant accent colors through protanopia, deuteranopia, and tritanopia simulation before ship. Confirm:
- Brand Deal (`#3aaa50`) and Livestream (`#72aa28`) remain distinguishable under deuteranopia (most common)
- Convention (`#28aa82`) reads distinctly from Brand Deal under all three
- No variant accent reads as viral gold (`#f0a500`) under any simulation

**Color independence:** Every accent color is paired with text (duration numeral, variant name, multiplier). No information is communicated by color alone. The variant name label disambiguates for players who cannot distinguish the accent colors.

**Reduce Motion:**
- Brand Deal: slide-up → 150ms fade-in
- Livestream: slide-up → 150ms fade-in (same reduction)
- Convention: spring/pop → 150ms fade-in (overshoot and scale pop removed); chime-pop SFX remains
- Compound badge pulse → static gold border (no animation)
- Top bar height changes → snap (no transition)

**Keyboard:** All three cards focusable via Tab. Enter activates. Screen reader text per §8 (variant-specific).

---

## 13. Open Questions

1. ~~**Should Convention's distinct entrance have a dedicated SFX?**~~ **[RESOLVED — ux-designer, 2026-04-05]** Yes. The "Oh, a con!" emotional register requires audio to work even when the player isn't watching the card area. The visual spring entrance alone requires the player to be looking at the right zone at the right moment. The chime-pop SFX is the minimal asset cost for a reliably-delivered emotional target. Specified in §5.2.

2. **CVD simulation pass.** Convention's teal-green (`#28aa82`) and Brand Deal's corporate green (`#3aaa50`) must be confirmed distinct under deuteranopia before ship. If they collapse to indistinguishable, the Convention accent should shift further toward cyan (e.g., `#20a890`). **Owner: engineer (validate, flag to ux-designer if adjustment needed)**

3. **Icon asset availability.** Three icons are specified semantically in §2.1. Final glyph selection depends on available icon set. Engineer to choose closest match and flag to ux-designer if the available set lacks a strong match for any variant. **Owner: engineer**

4. **Livestream badge at 60s on mobile.** The compact top bar on mobile expands from 72px to 100px (per `brand-deal-card.md §6.2`) while the badge is active. At 60s, this is a sustained expansion. If reflow causes layout issues on small screens, the badge can overlay the post zone area instead — same contingency as Brand Deal. **Owner: engineer (implementation call; flag if reflow is jarring)**

---

## 14. References

1. `ux/brand-deal-card.md` — baseline card spec; expiry, activation, badge, compound signal, mobile, and accessibility sections authoritative here unless explicitly overridden
2. `proposals/draft/gigs-system.md` — variant roster (§2), OQ3 resolution (card direction), OQ6 resolution (Convention label)
3. `proposals/accepted/brand-deal-boost.md` — core mechanic spec; ux-designer review contains original activation direction
4. `proposals/accepted/viral-burst-event-signal.md` — viral burst mechanic; compound-moment timing partner
5. `ux/purchase-feedback-and-rate-visibility.md` §5.1, §5.3 — rate flare on activation and boost expiry
6. `ux/core-game-screen.md` §9 — viral burst choreography; compound moment zone
7. `roles/ux-designer.md` — motion as communication, trust signal design, color contrast standards
