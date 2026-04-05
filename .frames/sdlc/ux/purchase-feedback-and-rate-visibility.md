# Purchase Feedback & Rate Visibility — UX Spec

> **Scope:** Sharpens the feel of rate visibility and the purchase-moment delta. Targets a specific feel gap observed in the running game: button presses feel imperceptible, rate isn't surfaced, generators don't communicate that they're running. This spec is an extension and sharpening of patterns already defined in `core-game-screen.md` — not a replacement.
>
> **Not in scope:** Overall layout (see core-game-screen.md §2), the broader click-to-post flow (§8), the upgrade drawer pattern (§6.3, see also `ux/upgrade-curve-drawer-spec.md` when available).
>
> **Implements:** The feel target from `proposals/accepted/core-game-identity-and-loop.md` §1 (Target aesthetic: *Submission* — "the satisfying trance of numbers climbing and systems humming").
>
> **Against contract:** `architecture/core-systems.md` — `Generator` entity, effective engagement rate formula, follower conversion.

---

## Decisions Taken in This Spec

1. **Rate is P0, not P1.** In the core-game-screen.md hierarchy, engagement count is P0 and the rate sub-label is implied secondary. This spec promotes the rate to full P0 weight alongside the count — they are two halves of the same moment. Without a visible rate, the count is just a number. With a visible rate, the count becomes *motion*.
2. **The delta moment is a distinct event, not just a state change.** When the player buys a generator, upgrades one, or posts a click, the rate changes. This change needs its own visual treatment — a brief flare that communicates "this just got faster" without asking the player to read and compare numbers.
3. **Every owned generator pulses at its tick cadence.** The row itself *breathes* — a subtle visual tied to its production rate. This makes "this generator is running" ambient and unmissable without extra UI.
4. **Buy button follows the same press/confirm pattern as Post button.** Not a new interaction grammar. Consistent feedback across all player-initiated actions.
5. **The counter ticks visibly, even for fractional earn rates.** A rate of 6.8/sec must produce visible ticks ~7 times per second, not batched jumps every few seconds.

---

## 1. The Three Feelings

This spec exists to deliver three specific feelings. Every design decision below serves one of them.

| Feeling | Moment | What delivers it |
|---------|--------|------------------|
| **"My rate is X."** | At rest, any time | A prominent, always-visible rate readout (§2). |
| **"I just did that."** | At the moment of purchase or click | Button press feedback + rate flare + row pulse (§4, §5). |
| **"It's working."** | Between purchases | Counter ticking visibly + generator rows breathing at their cadence (§6, §7). |

If any one of these is absent, the game feels dead. All three together produce the trance state the Submission aesthetic depends on.

---

## 2. Rate Visibility

### 2.1 Primary rate display

The **engagement rate** is displayed directly beneath the engagement count, as a first-class number — not a sub-label.

```
  Engagement
     12,480
    +6.8/sec
```

- **Position:** Top bar, immediately below the engagement count (core-game-screen.md §2 top bar zone)
- **Format:**
  - Numeral: `+6.8/sec` or `+18/sec` or `+1.2K/sec`
  - Always shows leading `+` (monotonic forward in normal play — the `+` is a trust signal)
  - Same compact notation thresholds as the count (≥10K compacts to K, ≥1M to M)
- **Weight:** 20px weight 500 (vs. 48–56px weight 600 for the count). Clearly secondary to the count, but unmistakable.
- **Contrast:** 7:1 against background (P1 level, per core-game-screen.md §3)

**Why not a sub-label:** A 14px muted sub-label is exactly what's in the game now (or implied by the main spec), and it's not landing. The rate needs visual weight. Promoting it to P1 with its own line and 20px numeral makes it a first-class readout.

### 2.2 Per-generator rate

Each generator row already displays its effective rate per core-game-screen.md §6.2. This spec holds that.

**Sharpening:** the rate text in each row uses weight 500 (not 400) at 14px. Thin-weight fonts at this size fail legibility under peripheral attention, which is exactly how players glance at generator rows.

### 2.3 Per-platform rate

Already specified at core-game-screen.md §7.1 (`▲ +3.2/sec`). This spec holds that.

---

## 3. Counter Tick Animation

### 3.1 Tick cadence

The engagement count **must tick at the rate it is earning**. At 6.8/sec, the count ticks ~7 times per second. At 120/sec, it ticks at every visual frame (clamped to render rate).

**Rule:** The count never batches. A 3-second batched jump from 100 to 120 feels dead. A 60-tick climb from 100 to 120 feels alive.

**Implementation:** This behavior is delivered by RAF-based predictive interpolation in the UI layer — the game loop tick rate is unchanged. See `proposals/draft/engagement-counter-interpolation.md` for the full spec. The `useInterpolatedValue` hook defined there is what makes §3.1 and §3.2 possible at mid-to-late game rates.

### 3.2 Tick increment sizing

At high rates, integer ticks are visually appropriate. At low rates (<1/sec), **fractional accumulation must still produce visible motion**. Options:

- **For rates ≥ 1/sec:** integer ticks at the rate cadence.
- **For rates < 1/sec:** the count accumulates with one decimal place shown briefly (~600ms after each integer tick), then drops back to integer display. This gives the player visible proof of motion even when earning is slow.

**Example:** at 0.4/sec, the count shows `12 → 12.4 → 12.8 → 13 → 13.2 → 13.6 → 14 ...` with fractional values held briefly.

**Why show fractions at low rates:** early-game the player earns <1/sec. If the count sits on an integer for seconds at a time, the game appears broken. Brief fractional display communicates "the number is moving, just slowly" without cluttering the readout at higher rates.

### 3.3 Rate display update

The rate numeral (`+6.8/sec`) updates live as the underlying rate changes. It does not tick — it snaps to the current value when it changes, with the flare treatment in §5.1.

---

## 4. Button Feedback

### 4.1 Post Content button (click-to-post)

Already specified at core-game-screen.md §8.2. This spec confirms and sharpens:

- **Press state:** scale 0.97, 60ms down / 120ms up — per main spec
- **Confirmation flash:** on release, the button's background briefly brightens (10% lightness bump, 150ms fade-out)
- **Floating delta number:** a `+N` number emerges from button center, drifts up and toward the engagement counter, fading (500ms) — per main spec §8.2
- **Sound:** short percussive click cue — per main spec

**Sharpening:** the main spec's "impact sound begins within one frame of click (<16ms)" is a hard requirement. Any perceived delay here destroys the tactile feel.

### 4.2 Buy button (purchasing generators)

The Buy button is the primary strategic affordance. It must feel at least as weighty as the Post button.

**Button anatomy:**
```
┌─────────────────────────────────┐
│  Buy Selfies                    │
│  cost: 15 engagement            │
└─────────────────────────────────┘
```

- **Size:** minimum 180×64px
- **Label:** "Buy {generator name}" — 16px weight 500
- **Cost sub-label:** "cost: N engagement" — 12px, muted contrast (7:1)

**Press feedback:**
- **t=0–60ms:** scale 0.97, background brightens 15% (brighter than Post — this is a bigger commitment)
- **t=0–200ms:** confirmation flash — button's border glows in the generator's semantic color for 200ms
- **t=60–180ms:** scale returns to 1.0

**On successful purchase:**
- **Counter decrement:** engagement counter ticks *down* to new value (monotonic-backward is allowed here because it's a communicated spend)
- **Rate display flares** (§5.1)
- **Generator row comes to life** (§6)
- **Sound:** a warmer tone than click-to-post — a confirmation chime, not a percussive click

**On insufficient engagement:**
- **Button state:** 3:1 contrast, not faded out
- **Cost sub-label:** amber color
- **On tap:** button briefly shakes (4px horizontal, 200ms), no state change, soft dull thud sound

### 4.3 Shared press grammar

Both Post and Buy follow the same three-part grammar: **press → confirm flash → commit event**. This consistency lets the player transfer tactile expectation between the two most common actions.

---

## 5. The Delta Moment

The single most important feel event in the game is **the moment rate changes**. Buying a generator, upgrading one, or taking any action that shifts production. This is where the player feels "I did that."

### 5.1 Rate display flare

When the rate changes, the rate numeral (`+6.8/sec` → `+12.3/sec`) does not just snap. It **flares**:

1. **t=0ms:** new value snaps in
2. **t=0–100ms:** numeral scales from 1.0 → 1.12
3. **t=100–300ms:** numeral scales back to 1.0
4. **t=0–400ms:** numeral color briefly shifts to a warm success color (green-gold range), then fades back to baseline
5. **Sound:** not needed — the row pulse and buy confirm chime cover the auditory channel

**Duration: 400ms total.** Noticeable but not interrupting.

### 5.2 Delta readout (inline)

Immediately to the right of the rate numeral, a **delta readout** appears briefly on rate change:

```
  +6.8/sec  →  +12.3/sec  +5.5
               (flared)   (green, fading)
```

- **Format:** `+N.N` in the generator's semantic color
- **Position:** immediately right of the rate numeral
- **Duration:** 800ms (emerges in 100ms, holds 500ms, fades 200ms)
- **Weight:** 16px weight 500

**Why explicit delta:** the flare communicates "something changed" at a glance. The delta readout answers "by how much" for the player who looks. Low-attention players get the flare; high-attention players get the number. Both are served.

### 5.3 Rate decrease (algorithm penalty, generator spend)

If rate decreases (e.g., algorithm state shift penalizes active generators), the same flare fires but in a **penalty color** (amber-red range) with a `-N.N` delta. The flare is identical in duration. Honesty about rate changes — in both directions — is a trust signal.

---

## 6. Generator "Running" State

Currently generators look identical before and after purchase. The row needs to communicate `owned & running` ambiently.

### 6.1 Idle vs running visual contrast

| State | Row treatment |
|-------|---------------|
| Unowned / locked | Badge hollow, row at 3:1 contrast (per main spec §6.4) |
| **Owned & running (new in this spec)** | Badge filled, row at full contrast, **pulsing at tick cadence** |
| Being upgraded (transient) | Row pulses scale 1.02 for 250ms (main spec §6.3) |

### 6.2 The breathing pulse

Every owned generator row has a **breathing indicator** — a subtle pulse tied to its production rate.

- **Treatment:** the badge (icon + category shape) has a soft glow that pulses at the tick cadence
- **Pulse cadence:** matches the generator's individual tick rate. A generator producing 1/sec pulses once per second. A generator producing 20/sec pulses rapidly.
- **Amplitude:** very subtle — glow opacity oscillates between 15% and 35%, no scale change. Should not compete with the upgrade pulse or algorithm shift pulse.
- **Color:** the generator's semantic color

**Why on the badge, not the whole row:** pulsing the whole row at 20Hz would be visually exhausting. Pulsing the badge contains the motion and makes "this thing is running" a property of the item itself, not the list.

### 6.3 First-purchase animation

The moment a generator is first purchased (row transitions from unowned → owned):

1. **t=0–200ms:** Badge fills — color pours into the outlined shape (per main spec §6.4, extended here)
2. **t=100–400ms:** Row brightens from 3:1 to full contrast
3. **t=200–600ms:** One-time sparkle pulse at badge center
4. **t=400ms onward:** Breathing pulse begins
5. **Sound:** a distinct unlock cue (already in main spec §6.4)

### 6.4 Count-up feedback on quantity purchase

When buying additional units of an already-owned generator (`count: 3 → count: 4`):

- **Count numeral** (the `×N` in row anatomy): briefly scales 1.0 → 1.15 → 1.0 (250ms, ease-out)
- **Count numeral flashes** in the generator's semantic color (400ms fade back to default)
- **Row does not pulse** — the count is what changed, focus is there

---

## 7. Putting It Together — The Purchase Moment Choreography

A full purchase event plays out in this order:

1. **t=0ms:** Player taps Buy button
2. **t=0–60ms:** Button presses (scale 0.97)
3. **t=0–16ms:** Confirmation sound fires
4. **t=0–200ms:** Button border glows in generator color
5. **t=60–180ms:** Button scales back to 1.0
6. **t=0–400ms:** Engagement counter ticks down to new value (visible decrement)
7. **t=60–460ms:** Generator row badge fills (if first purchase) OR count numeral pulses (if additional)
8. **t=100–400ms:** Rate display flares (scale + color shift)
9. **t=100–900ms:** Delta readout appears inline (`+5.5`) and fades
10. **t=400ms onward:** Breathing pulse begins or continues at the new rate cadence

**Total choreography:** ~900ms. Layered, not serial — multiple elements animate simultaneously. The player's eye has multiple points of confirmation, so attention can land wherever and find "yes, that happened."

---

## 8. Motion Brief Summary

| Element | Triggers | Duration | Easing | Communicates |
|---------|----------|----------|--------|--------------|
| Counter tick | Per-tick earn | continuous | linear | Rate of earning |
| Counter fractional display | Rates < 1/sec | 600ms hold per fraction | — | Slow motion is still motion |
| Rate display flare (scale) | Rate change | 400ms | ease-out | Rate just changed |
| Rate display flare (color) | Rate change | 400ms | ease-out | Direction of change (success/penalty) |
| Delta readout | Rate change | 800ms | ease-out | How much the rate changed |
| Post button press | Click | 60ms / 120ms | ease-out | Tactile confirm |
| Post button confirm flash | Click release | 150ms | ease-out | Action completed |
| Buy button press | Tap | 60ms / 120ms | ease-out | Tactile confirm |
| Buy button border glow | Tap | 200ms | ease-out | Purchase committed |
| Counter decrement on buy | Purchase | 400ms | ease-out | Cost paid |
| First-purchase badge fill | First buy of type | 200ms | ease-out | Generator now owned |
| First-purchase sparkle | First buy of type | 400ms | ease-out | Unlock celebration |
| Breathing pulse | While owned | cadence = tick rate | ease-in-out | Generator is running |
| Count numeral pulse | Additional buy | 250ms | ease-out | Quantity increased |
| Count numeral flash | Additional buy | 400ms | ease-out | Focus on count |
| Insufficient-engagement shake | Disabled Buy tap | 200ms | spring | Cannot afford |

---

## 9. Relationship to `core-game-screen.md`

This spec:
- **Extends §5.1** by promoting the rate sub-label to a full P1 readout with its own weight
- **Extends §6.2** by specifying the breathing pulse on owned generator rows
- **Extends §6.4** by specifying the first-purchase animation and the subsequent breathing state
- **Extends §8.2** by sharpening the Post button's confirmation flash
- **Adds** the Buy button spec (the main spec didn't cover it — purchase was routed through the upgrade drawer)
- **Adds** the delta moment choreography (rate flare + delta readout)
- **Adds** the counter tick animation requirements (including fractional display for low rates)

When this spec and the main spec disagree, **this spec wins** for the elements it covers. The main spec should be updated to reference this spec in its own §5, §6, §8 sections in a follow-up.

---

## 10. Open Questions

1. **If the UX treatment doesn't resolve the feel problem, the numbers themselves may need tuning.** (Carried from task #40.) After this spec is implemented, observe the game again. If the feel is still flat, the game-designer should revisit the upgrade delta curve — rates too small to feel even with perfect UX are a tuning problem, not a design problem. **Owner: game-designer (post-implementation check).**
2. **Does the breathing pulse need a Reduce Motion alternative?** The breathing pulse is persistent and runs at variable cadence. For players with motion sensitivity, the pulse could be replaced with a static glow halo on owned rows. **Owner: ux-designer (settings spec integration).**
3. **At very high rates (100+/sec), does the breathing pulse become stroboscopic?** A generator pulsing 100×/sec would flicker. Cap: once rate exceeds 10/sec, the pulse transitions to a steady glow rather than a rapid flicker. This is specified in §6.2 amplitude, but the transition threshold needs confirmation during implementation. **Owner: engineer (tune at build time).**
4. **Should the delta readout stack on rapid successive purchases?** If the player buys 3 generators in quick succession, do they see three delta readouts? **[RESOLVED — ux-designer, 2026-04-05]** No stacking. Latest delta replaces prior (previous fades immediately on supersession). The rate flare already communicates "multiple things changed" — stacking delta readouts adds noise with no additional insight. The cumulative change is visible in the rate numeral itself.

---

## 11. References

1. `ux/core-game-screen.md` §5.1 (engagement display), §6.2 (generator row anatomy), §6.4 (unlock animation), §8.2 (click-to-post feedback) — the baseline this spec extends
2. `proposals/accepted/core-game-identity-and-loop.md` §1 — Submission aesthetic target (the trance state this spec exists to serve)
3. `architecture/core-systems.md` — Generator effective rate formula, tick contract
4. `roles/ux-designer.md` — Trust signal design (numbers as design problem, not formatting problem), Motion as communication
5. Cookie Clicker — reference for count ticking and rate readout discipline
6. Adventure Capitalist — reference for purchase-moment rate flare + breathing state on active managers
