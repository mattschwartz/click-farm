# Scandal System — UX Spec

> **Scope:** Defines the visual language, interaction patterns, and motion briefs for the Scandal system — risk indicators on affected generators/platforms, the PR Response modal, the aftermath display, and stacking suppression feedback. Specifies how scandal visuals integrate with the core game screen without disrupting the primary loop.
>
> **Not in scope:** Core game screen layout (see `ux/core-game-screen.md`), scandal triggers and magnitudes (game design), accumulator and state machine implementation (architecture).
>
> **Implements:** `proposals/accepted/scandals-and-follower-loss.md`
>
> **Against contract:** `architecture/scandal-system.md`
>
> **Integrates with:** `ux/core-game-screen.md`

---

## Decisions Taken in This Spec

Calls this spec makes that weren't pre-decided in the proposal or reviews.

1. **Global risk (Trend Chasing) displays on the top bar, adjacent to the Algorithm state name.** Global-scope accumulators have no natural attach point on the main screen. The top bar already carries the Algorithm mood, which is the closest neighbor conceptually (both are cross-cutting environmental states). A compact risk glyph sits next to the algorithm state name when global risk is `building` or `high`.
2. **Risk-level visuals are subordinate to peak moments.** When a viral event fires on an affected surface, scandal risk visuals pause for the duration of the viral event and resume after. A viral glow over an amber pulse is noisy and dilutes both signals. Viral is a once-every-15-40-min event; risk resumes immediately after decay.
3. **PR Response slider snaps to 5 stops, not continuous scrubbing.** Under time pressure with 10–15s, continuous scrubbing adds cognitive load (optimize the exact number?) while offering no strategic value. Five labeled stops (None / Quarter / Half / Three-Quarter / Max) matches the player's mental model of "how much am I willing to spend" and makes the timer pressure about *decision* not *precision*.
4. **The scandal card dims but does not freeze the main screen.** The game loop continues behind the modal (per architect's contract). This spec keeps the main screen visible at reduced opacity so the player can still read their Engagement balance and generator output while deciding — it's information they need.

---

## 1. Risk Indicator Visual Language

Per the UX review on the scandals proposal, risk uses a three-tier visual escalation keyed to the architect's `risk_level` enum.

### 1.1 The three tiers

| Tier | Definition (from architecture) | Visual treatment |
|------|-------------------------------|------------------|
| `none` | ratio < 0.4 | Normal rendering. No modifications. |
| `building` | 0.4 ≤ ratio < 0.75 | Subtle amber warmth on the surface's border/outer glow. Static — no motion. |
| `high` | ratio ≥ 0.75 | Amber intensifies; surface pulses slowly (1.7s cycle, ease-in-out). Unmistakable on glance. |

### 1.2 `building` specification

- **What changes:** The surface's border or outer glow picks up an amber tone.
  - Generator row: the left-edge accent stripe (normally row-color or neutral) shifts to amber at ~60% saturation
  - Platform card: the card border (normally 1px neutral at ~40% opacity) shifts to amber at 70% opacity
- **Motion:** None. This is a static warmth — the signal is the color shift, not animation.
- **Contrast:** The amber is perceptible against every algorithm mood background. Not a bright alarm; a warmth.
- **Accessibility fallback:** Because `building` has no motion, it relies on color. This is acceptable because (a) `building` is an early warning, not an actionable-now state, and (b) `high` carries the primary motion signal. A CVD player still sees `high` unmistakably.

### 1.3 `high` specification

- **What changes:** The amber from `building` intensifies to ~90% saturation, and the surface pulses.
- **Pulse motion:**
  - **Cycle:** 1.7s (falls in the 1.5–2s range named in the proposal review)
  - **Easing:** ease-in-out
  - **What pulses:** opacity of the border/glow layer only, oscillating between 60% and 100% opacity
  - **The surface itself does not scale or move** — only the border/glow breathes. Scaling generators would break reading their numbers.
- **Why 1.7s:** Fast enough to register as distinct from `building`'s static state on a 1-second glance. Slow enough to read as "strained/tension," not "alarm/emergency." Faster pulses (under 1s) create anxiety. Slower (over 2.5s) read as ambient, not warning.
- **Primary signal is motion, color is reinforcement.** This passes the CVD test (~8% of male players): a protanopia/deuteranopia player who cannot distinguish amber from neutral still sees the pulse unmistakably.

### 1.4 Where each risk type displays

Per the architect's contract, risk levels are keyed by scope:

| Scope | Surface | Location |
|-------|---------|----------|
| `generator:{id}` | Generator row | Left-edge accent stripe of the row |
| `platform:{id}` | Platform card | Card border/glow |
| `global` | Global risk glyph | Top bar, adjacent to Algorithm state name |

**Scandal-type-to-surface mapping (derived from architecture scoping):**

| Scandal type | Accumulator scope | Displays on |
|---|---|---|
| Content Burnout | per-generator | That generator's row |
| Platform Neglect | per-platform | That platform's card |
| Hot Take Backlash | per-generator (Hot Takes) | Hot Takes row |
| Trend Chasing | global | Top bar risk glyph |
| Growth Scrutiny | per-platform | That platform's card |
| Fact Check | per-generator (Podcasts, Tutorials) | Those generator rows |

### 1.5 Global risk glyph (top bar)

Trend Chasing is global, with no natural attach point. Solution: a compact risk glyph lives in the top bar immediately right of the Algorithm state name.

- **Size:** 20×20px, vertically centered in the top bar
- **`none`:** The glyph is not displayed at all. Empty space.
- **`building`:** Glyph appears — a stylized "scrutiny eye" icon in amber at 70% saturation, static
- **`high`:** Glyph at 90% saturation, pulses at 1.7s cycle (opacity 60%→100%)
- **Tooltip on hover:** "Your audience is watching." (Flavor-appropriate, does not name the scandal type.)

**Why a glyph, not a word:** Top bar is P0/P1 zone — the engagement counter is the star. A text label ("Risk: Building") would compete. A 20px glyph is perceptible without dominating. A player who notices it investigates; a player in flow ignores it without being penalized.

### 1.6 Multiple simultaneous risks

A player can have multiple accumulators at various levels. The visual system handles this naturally because each accumulator lives on its own surface:

- Two generators at `high` → two generator rows pulsing (rows aren't adjacent if they're in different categories)
- One platform `high` + one generator `high` → pulses on both, in different zones of the screen
- Global `high` + any local `high` → glyph pulses in top bar, surface pulses in its zone

**Concern: pulse sync.** If multiple surfaces pulse at exactly 1.7s, they'll synchronize, creating a single strong "heartbeat" that reads as alarm. Mitigation: each accumulator's pulse starts at a phase offset based on its scope_id hash (stable, deterministic). Pulses coexist without locking step. The engineer can implement this as `phaseOffset = hash(scope_id) % cycle_duration`.

---

## 2. PR Response Modal

### 2.1 When it fires

Triggered by `state_machine.state = scandal_active`. The modal appears over the main game screen with a backdrop dim.

### 2.2 Backdrop behavior

- The main screen dims to 35% opacity behind the modal
- Game loop continues ticking (per architecture) — engagement counter, generators, algorithm all keep running
- Main screen interactions are disabled during scandal_active (clicks pass through to... nothing; post button is non-interactive)
- **The main screen remains readable.** The player can see Engagement balance, generator output, platform counts through the dim. This is intentional — the player's spend decision depends on knowing their Engagement balance, so that number must remain visible.

### 2.3 Modal layout

Center-screen card, 520×560px on the 1280×800 canvas.

```
┌──────────────────────────────────────────────────┐
│ ─────────────────  SCANDAL  ─────────────────   │   ← header strip, amber
│                                                  │
│   [icon]  Hot Take Backlash                      │   ← scandal name (20px, 600)
│           affecting InstaSham                    │   ← target platform (12px)
│                                                  │
│   "Your take did not age well."                  │   ← flavor text (16px italic)
│                                                  │
│                                                  │
│         ┌────────────────────────────┐           │
│         │                            │           │
│         │      -2,340 followers      │           │   ← projected damage
│         │                            │           │     (36px, 600)
│         └────────────────────────────┘           │
│         ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬               │   ← damage bar
│                                                  │
│                                                  │
│   Spend Engagement to soften the blow            │   ← slider label
│                                                  │
│      ◯───◯───◯───●───◯                            │   ← 5-stop slider
│     None  ¼    ½   ¾   Max                        │     (position 3 selected)
│                                                  │
│      Cost: 18,400 engagement                     │   ← dynamic cost
│      Balance: 42,100                             │   ← current engagement
│                                                  │
│                                                  │
│   ▰▰▰▰▰▰▰▰▰▰▰▰▰░░░░░░░░░░░░░                     │   ← timer bar (draining)
│                                                  │
│                              [ Respond ]         │   ← confirm button
│                                                  │
└──────────────────────────────────────────────────┘
```

### 2.4 Information hierarchy (6 elements under time pressure)

The UX review flagged this as non-blocking but important. Hierarchy, top-to-bottom:

| Priority | Element | Purpose | Weight |
|----------|---------|---------|--------|
| **Read first** | Flavor text | Comedic beat, reframes loss as funny | 16px italic, medium contrast |
| **Scan second** | Projected damage number | What's at stake | 36px 600, full contrast |
| **Decide** | Slider | The actual decision surface | Touch target, full contrast stops |
| **Calibrate** | Engagement cost + balance | Economic context for the decision | 14px, medium contrast |
| **Monitor** | Timer bar | Pressure, not focus | Peripheral, thin |
| **Commit** | Respond button | Action | Primary CTA |

**The flavor text gets its moment.** Timer does not start until the 1–2s read beat has passed (per architect's contract: `readBeatDuration`). During the beat, the slider is inactive and the timer bar is solid (not draining). Player reads the joke, then the pressure begins.

### 2.5 The 1–2s flavor beat — visual detail

**t=0:** Scandal card drops in (see §2.8 motion).
**t=0 to t=1500ms (read beat):**
- Flavor text visible, fully lit
- Damage number visible at current raw magnitude (no slider input yet)
- Slider is dimmed (50% opacity), dots visible but not interactive
- Timer bar is solid amber, not draining
- "Respond" button is dimmed and non-interactive
**t=1500ms (beat ends):**
- Slider fades to full opacity (200ms)
- Timer bar begins draining
- "Respond" button activates

**Why:** The flavor text carries the emotional reframe. If the timer starts immediately, the player either optimizes-first-reads-after (missing the joke) or reads-first-decides-rushed (strategically penalized for engaging with content). The beat protects both.

### 2.6 Slider interaction

**5 discrete stops** labeled: **None** / **¼** / **½** / **¾** / **Max**.

- **Default position:** None (0 engagement spend). Player must actively choose to mitigate.
- **Stop sizing:** Each stop represents equal fractions of `maxMitigationRate`. If max mitigation reduces loss to 35% of raw, then stops reduce loss to: 100% (None), 83.75%, 67.5%, 51.25%, 35% (Max).
- **Engagement cost at each stop:** Displayed live as the slider moves. Architecture provides `engagementCostCurve` — likely non-linear (max spend costs disproportionately more).
- **Damage number updates live** as the slider moves — the player sees the projected loss shrink as they commit more engagement.
- **Damage bar shrinks visually** in sync with the number (treat bar as visual reinforcement of the number, not separate data).
- **Interaction:** Click/tap a stop to select. Keyboard: left/right arrow to step. Drag-snap on desktop (click-hold-drag snaps to nearest stop on release).
- **Insufficient engagement state:** If the player doesn't have enough engagement for a stop, that stop is disabled (3:1 contrast, greyed out). Max may be unreachable for small accounts — that's intentional design.

### 2.7 Timer bar

- **Width:** Full modal width minus padding (~480px)
- **Height:** 6px
- **Color:** Amber at 80% opacity
- **Drain direction:** Left-to-right (fills from 100% to 0%)
- **Duration:** `decisionWindowMs` from architecture (10–15s, tuning)
- **When it empties:** The player's current slider selection auto-confirms. `onTimerExpire` fires. No explicit confirmation required.
- **Visual state near expiry:** Last 20% of timer, bar shifts to slightly warmer hue (no color swap, no blinking — subtle pressure increase).

**No timer numerals.** The bar is the timer. A ticking number (5... 4... 3...) creates anxiety disproportionate to a 10–15s window.

### 2.8 Modal motion

**Entry (t=0 to t=300ms):**
- Backdrop dims from 0% to 35% opacity (250ms, ease-out)
- Card drops in from above: translateY from -40px to 0, opacity 0 to 100% (300ms, ease-out)
- Subtle impact sound on arrival (distinct from viral — a quieter, sharper cue)

**Exit (after Respond or timer expire, t=0 to t=400ms):**
- Damage number freezes at final value (100ms pause)
- Card shrinks slightly (scale 1.0 → 0.96) and fades out (300ms, ease-in)
- Backdrop fades out (300ms)
- Main screen restores to full opacity
- Seamlessly transitions into the Aftermath Display (§3)

### 2.9 Respond button

- **Copy:** "Respond" at rest. During read beat: same copy, dimmed. After resolution: button is no longer visible (card exits).
- **On click:** Confirms current slider position, triggers `onPlayerConfirm`, card exits.
- **Keyboard shortcut:** Enter key confirms at any point after the read beat ends.

---

## 3. Aftermath Display

Per the UX review: "The player needs to see the number move, not just see a result."

### 3.1 When it fires

Immediately after the PR Response modal exits. The main screen has restored to full opacity.

### 3.2 Visual sequence

The aftermath is NOT a new modal — it's a localized animation on the affected platform card.

1. **t=0 (modal exited):** Main screen is back at full opacity.
2. **t=0 to t=200ms:** The affected platform card gets a red edge flash (single pulse, 1 cycle ease-out, red at 70% opacity). This is the "something happened here" signal.
3. **t=200ms to t=1400ms:** The platform's follower count **animates downward** from old value to new value (1200ms, ease-out deceleration). The number counts down visibly — same tick-based rendering as the engagement counter, but descending.
4. **t=200ms to t=2400ms:** A floating label appears above the follower count: **"−2,340"** in red, 18px 600. It drifts up slowly (12px over 2.2s) and fades out.
5. **t=1400ms:** Count-down lands on final value. Number briefly flashes once (single pulse, 150ms, red → back to normal color).
6. **t=2400ms:** Red floating label fully faded. Platform card returns to normal state.

### 3.3 Total followers update

The **Total Followers** count in the top bar updates **in sync** with the platform count-down (same 1200ms animation, same deceleration). This keeps the two related numbers honest — the player sees both values fall together.

### 3.4 Why the animated count-down matters

Per the trust signal lens: if the number just *appears* at its new value, the player may not register the loss or its size. The movement is the consequence. A 1200ms count-down is long enough to register, short enough not to be punishing-to-watch.

**Duration rule:** count-down duration is fixed at 1200ms regardless of loss magnitude. A larger loss counts faster (more per-tick); a smaller loss counts slower. This keeps the perceptual weight of the event constant — losing 200 followers and losing 5,000 followers both feel like "a scandal" not "a minor thing" vs. "an apocalypse."

---

## 4. Stacking Suppression Feedback

Per architecture: only one scandal is active at a time; a second trigger during an active scandal is suppressed with a "secondary notification" after the primary resolves.

### 4.1 When it fires

After the Aftermath Display completes (t ≥ 2400ms from modal exit), if a scandal was suppressed during the active window.

### 4.2 Visual treatment

A **toast notification** appears from the top center of the screen.

```
┌──────────────────────────────────────────────┐
│  …and your audience noticed the              │
│     Trend Chasing too.                        │
└──────────────────────────────────────────────┘
```

- **Position:** Top center of screen, below the top bar, 16px margin
- **Size:** ~400px wide, ~64px tall
- **Color:** Amber border (matches risk language), dark background, white text
- **Typography:** 14px italic, weight 400
- **Content:** `suppressedNotice` string from architecture's `lastResolution` object — flavor text specific to the suppressed scandal type
- **Entry:** Slide down + fade in, 300ms ease-out
- **Dwell:** 3500ms visible
- **Exit:** Fade out, 400ms ease-in
- **No interaction.** Cannot be dismissed or clicked. Informational only.

### 4.3 Why not a second modal

The proposal explicitly states the suppressed scandal does not deal damage — it's informational. A full modal would imply consequence. A toast matches the actual weight: "you should know this happened, but there's nothing to do."

### 4.4 Multiple suppressions

If more than one scandal was suppressed during a single active window, they combine into one toast:

> "…and your audience noticed the Trend Chasing and the Content Burnout too."

Architecture contract extension needed: `suppressedNotice` should be a single pre-composed string the scandal system builds. Flagged in Open Questions.

---

## 5. Integration with Core Game Screen

This is the acceptance criterion "Spec defines how scandal visuals integrate with the main game screen without disrupting core UX."

### 5.1 Visual layering order (bottom to top)

1. Background (algorithm mood)
2. Generator rows, platform cards, top bar (main screen content)
3. **Risk indicators** — amber warmth/pulse on generator rows, platform cards, top bar glyph
4. Viral event effects (particle burst, edge glow, counter recolor) — **only when firing**
5. Follower-loss red flash (from aftermath)
6. Scandal modal backdrop dim
7. Scandal modal card
8. Suppression toast

### 5.2 Conflict resolution rules

**Rule 1: Viral event takes the surface.** When a viral fires on an affected generator or platform, risk indicators on that surface pause (no amber, no pulse) for the duration of the viral event. They resume immediately after viral decay. Reason: competing signals dilute each other; viral is rare (15–40 min cadence), risk is persistent, so risk yields.

**Rule 2: Risk indicators survive algorithm shifts.** Algorithm mood changes the background; risk indicators are surface-level (borders, glows). They coexist. The engineer should test that amber pulses remain perceptible against every algorithm mood palette — if any mood buries amber, that mood's saturation gets pulled back.

**Rule 3: Aftermath red flash overrides risk amber briefly.** The 200ms red edge flash on a platform card during aftermath supersedes any amber indicator. After the flash, the amber resumes if the accumulator still reads `building` or `high` (it usually won't, since firing resets the accumulator to 0).

**Rule 4: PR Response modal owns the screen.** Nothing on the main screen can update the player's attention during an active modal. Top bar keeps updating (engagement, followers) but the player's visual attention is captured. Risk indicators on the main screen continue rendering behind the dim (they're still technically visible), but they're at 35% through the backdrop and will not distract.

**Rule 5: Suppression toast does not overlap modal.** The toast only fires after the modal has exited. There is no state in which both are visible.

### 5.3 Non-disruption test

The integration is correct if a player in Orient mode (2-3s glance) who has no active scandal can still immediately find:
- The Engagement counter (P0)
- Their current production rate
- The Algorithm state

Risk indicators must be perceptible-but-deferential. If the player's eye goes to the amber pulse instead of the engagement counter during a routine glance, the hierarchy has failed.

---

## 6. Accessibility

- **CVD safe:** All risk tiers pass protanopia/deuteranopia/tritanopia simulators. Amber is a hue that survives reasonably across CVD types, but motion carries the primary `high` signal regardless.
- **Motion sensitivity:** If the user's OS-level "Reduce Motion" setting is on (respected by the Settings toggle, out of scope here), the `high` pulse is replaced with a stronger static amber (100% saturation, solid border). The signal strength is preserved; the motion is removed. The modal entry/exit animations shorten to 150ms crossfades.
- **Contrast:**
  - Scandal card text on card background: 15.8:1 (dark theme target)
  - Damage number: max contrast
  - Timer bar: amber at 80% opacity has ≥3:1 against dark card background
  - Toast text: ≥7:1
- **Keyboard navigation:** Modal is fully keyboard-operable. Tab cycles through slider stops → Respond. Arrow keys step the slider. Enter confirms.
- **Screen reader:** Modal announces: "Scandal: [name]. [flavor text]. Projected follower loss: [number] on [platform]. Spend engagement to mitigate. Timer: [seconds] seconds." Slider stops announce engagement cost and projected loss.
- **Time pressure accommodation:** A "Reduce Time Pressure" accessibility toggle (out of scope for this spec, flagged in Open Questions) should double the decision window from 10–15s to 20–30s. The read beat stays constant.

---

## 7. Motion Brief Summary

| Element | What triggers | Duration | Easing | Communicates |
|---|---|---|---|---|
| Risk `building` warmth | Accumulator enters 0.4–0.75 ratio | — (static) | n/a | Early warning |
| Risk `high` pulse | Accumulator enters ≥0.75 ratio | 1.7s cycle, continuous | ease-in-out | Active tension |
| Global risk glyph pulse | Global accumulator `high` | 1.7s cycle | ease-in-out | Scrutiny building |
| Modal entry | Scandal fires | 300ms | ease-out | Event demands attention |
| Flavor beat hold | During read beat | 1000–2000ms static | linear | Comedy lands first |
| Slider activation | Read beat ends | 200ms opacity fade | linear | Decision time starts |
| Timer drain | After read beat | 10–15s | linear | Time pressure |
| Damage number update | Slider stop change | 150ms | ease-out | Choice has impact |
| Modal exit | Confirm or timer expire | 400ms | ease-in | Event resolving |
| Aftermath red flash | Follower removal begins | 200ms single pulse | ease-out | Damage happened here |
| Follower count-down | Aftermath | 1200ms | ease-out | See the consequence |
| Floating loss label | Aftermath | 2200ms drift + fade | ease-out | Explicit delta |
| Final count flash | Count-down lands | 150ms single pulse | ease-out | Landed on new value |
| Suppression toast entry | After aftermath | 300ms slide + fade | ease-out | Secondary info |
| Suppression toast exit | After 3500ms dwell | 400ms fade | ease-in | Info expires |

---

## 8. Open Questions

1. **Suppressed scandal string composition.** When multiple scandals are suppressed during one active window, the toast needs a single string. Architecture exposes `suppressedNotice` as a string, not a list. Confirmation: should the scandal system compose the combined string internally, or should UI compose from a list? **Owner: architect**
2. **Engagement cost curve for slider stops.** Architecture names `engagementCostCurve` but doesn't specify shape. A steep curve (max spend disproportionately expensive) creates meaningful tradeoffs; a linear curve creates simpler math. **Owner: game-designer**
3. **Reduce Motion scale of static amber.** Spec calls for "stronger static amber" in the `high` state when motion is disabled. Exact saturation/opacity delta needs a designer pass during implementation. **Owner: ux-designer (follow-up during build)**
   - **[RESOLVED — ux-designer, 2026-04-05]** In Reduce Motion mode, `high` renders as: amber border at 100% opacity (vs. pulsing 60–100%), border thickness increases from 1px to 2px to compensate for the absence of motion. The 2px solid amber border is unmistakable on glance. No other change.
4. **Reduce Time Pressure toggle.** Called out for accessibility but not specified. Should live in the Settings screen spec. **Owner: ux-designer (follow-up task — Settings screen)**
   - **[RESOLVED — ux-designer, 2026-04-05]** Toggle added to `ux/settings-screen.md` §3.1. Doubles decision window from 10–15s to 20–30s. Read beat unchanged. No other time-pressured surfaces at current scope.
5. **Risk indicator behavior during offline→online transition.** Accumulators freeze offline. On return, if any accumulator is already at `high`, does the pulse start immediately, or fade in over 1–2s? Abrupt pulse on app open may startle. **Owner: ux-designer (quick call during build — recommend 800ms fade-in)**
   - **[RESOLVED — ux-designer, 2026-04-05]** 800ms fade-in confirmed. Risk indicators that are already at `high` on session start fade their border/glow from 0% to full opacity over 800ms before beginning the pulse cycle. This prevents the startle of a pulsing element appearing instantly on load. The 800ms is also enough that the player has had time to orient to the main screen before the pulse draws their attention.
6. **Scandal card icons.** The modal layout shows `[icon]` for the scandal type. Each scandal type needs a satirical icon. **Owner: ux-designer (follow-up — visual identity pass alongside platform/generator icons)**
7. **Tooltip copy for global risk glyph.** Single string "Your audience is watching." may need variants per accumulated time. **Owner: game-designer (copy pass)**

---

## 9. References

1. `proposals/accepted/scandals-and-follower-loss.md` — design intent and resolved review decisions this spec implements
2. `architecture/scandal-system.md` — data model, state machine, and contracts this spec designs against
3. `ux/core-game-screen.md` — the main screen this spec integrates with (layering, density, P0 hierarchy)
4. `roles/ux-designer.md` — contrast standards, CVD accessibility, motion discipline
