# Core Game Screen — UX Spec

> **Scope:** Defines the layout, information hierarchy, visual language, interaction patterns, and motion briefs for the main game screen — the surface the player sees during a normal play session. Covers the Algorithm state visualization, three-currency display, generator display system, platform display, click-to-post interaction, and the "going viral" peak beat.
>
> **Not in scope:** Scandal UX (see `ux/scandal-system.md` when available), prestige/rebrand screen, upgrade modals beyond affordance rules, settings, onboarding-specific flows, mobile layout (flagged as follow-up).
>
> **Implements:** `proposals/accepted/core-game-identity-and-loop.md`
>
> **Against contract:** `architecture/core-systems.md`

---

## Decisions Taken in This Spec

These are calls this spec makes that were not pre-decided. Each is flagged so it can be challenged.

1. **Desktop-first layout, target canvas 1280×800.** The mid-game density problem (3 platforms + engagement + algorithm + 5–8 generators) resolves cleanly at desktop widths. Mobile requires a separate pass; a mobile-compatible stacked variant is sketched in §10 but not fully specified.
2. **Click-to-post is the primary early-game input — no hold-to-autopost.** Holding dilutes the satire ("the click *is* the content"). Auto-posting is unlocked by the first generator, as designed.
3. **Platform display is a right-side panel, not a top strip.** Platforms are persistent secondary context, not a navigation element. A side panel keeps them visible without competing with the primary currency.
4. **Cross-posting has no explicit interaction.** Per architecture: follower distribution is automatic, affinity-weighted. The UX job is to make the *flow* visible so the player understands the system, not to surface a control that doesn't exist.
5. **Generator scaling uses four differentiators:** icon + semantic color + category badge shape + stable-order grouping with category dividers. Label is always present but is the fallback signal, not the primary.

---

## 1. Emotional Arc Map

One session moves through these beats. Every element on the screen should know which beat it serves.

| Beat | Player state | What the screen owes them |
|------|--------------|---------------------------|
| **Return** (offline gains) | Curious, validated | A modal that shows what accumulated. Generous, not transactional. Celebrates the empire running without them. |
| **Orient** (first 2–3s on main screen) | Scanning | Instant legibility: am I earning? how fast? is anything urgent? Engagement counter and algorithm state must answer in a glance. |
| **Active play** (early game) | Tight feedback loop | Click → post → number climbs. Under 50ms latency between click and number tick. The number is the reward. |
| **Strategic play** (mid game) | Reading, deciding | Multiple generators producing, algorithm modifying, platforms diverging. Information hierarchy must hold under pressure. |
| **Shift** (algorithm transition) | Adjusting | The environment changes. Affected generators must show the change — what got boosted, what got penalized, without a text explanation. |
| **Peak** (going viral) | Elation | The screen breaks its own rhythm. Sustained cascade, not a flash. This is the emotional payoff — the reason to come back. |
| **Lull** (post-peak, between shifts) | Contemplating next move | Numbers are trustworthy again. Upgrade and unlock affordances step forward gently. |

The screen that serves Orient well tends to fail Peak (too calm). The screen that serves Peak tends to fail Lull (too loud). The resolution is **amplitude** — the screen has a resting state and a peaked state, and motion carries the player between them.

---

## 2. Screen Layout — Zone Map

Desktop canvas, 1280×800 reference.

```
┌─────────────────────────────────────────────────────────────┐
│  TOP BAR (80px)                                             │
│  [Algorithm state + mood]      [Engagement]    [Followers]  │
│       (ambient, left-weighted)   (primary)      (secondary) │
├─────────────────────┬──────────────────────┬────────────────┤
│                     │                      │                │
│   POST ZONE         │   GENERATORS         │   PLATFORMS    │
│   (320px)           │   (flex)             │   (280px)      │
│                     │                      │                │
│   ┌───────────┐     │   [category: STARTER]│   ┌──────────┐ │
│   │           │     │   ▸ Selfies   ×N  ⬆  │   │ Chirper  │ │
│   │   POST    │     │   ▸ Memes     ×N  ⬆  │   │  12.4K   │ │
│   │           │     │                      │   │ [affin.] │ │
│   │   +12     │     │   [category: MID]    │   │ [mood]   │ │
│   │           │     │   ▸ Hot Takes ×N  ⬆  │   └──────────┘ │
│   └───────────┘     │   ▸ Tutorials ×N  ⬆  │   ┌──────────┐ │
│                     │                      │   │InstaSham │ │
│   [rate display]    │   [category: LATE]   │   │   8.1K   │ │
│                     │   ▸ Livestreams      │   │ [affin.] │ │
│                     │   ...                │   │ [mood]   │ │
│                     │                      │   └──────────┘ │
│                     │                      │   ┌──────────┐ │
│                     │                      │   │ Grindset │ │
│                     │                      │   │   3.9K   │ │
│                     │                      │   │ [mood]   │ │
│                     │                      │   └──────────┘ │
└─────────────────────┴──────────────────────┴────────────────┘
    Background: ambient algorithm mood (color + slow motion)
```

**Why these zones:**
- **Post zone is left-anchored, large.** The click target is the most frequent interaction in early game. Left-anchored supports right-handed trackpad/mouse reach on desktop. Large area = forgiving click target = trustworthy tactile feel.
- **Generators occupy the flex center column.** They are the player's strategic surface — where they allocate attention. Vertical list with fixed row height reads as a ledger.
- **Platforms on the right.** They are persistent context, not interactive (no controls on the card itself in core loop — upgrades live in platform detail drawer).
- **Top bar is thin and disciplined.** It holds only what must be visible always.

**Background layer:** The algorithm mood lives in the background tint and motion. It is not a widget. It is the weather. All content sits on top of it with enough contrast to remain legible through any mood state (see §7).

---

## 3. Information Hierarchy

Per the UX review on the core proposal, three currencies at three speeds map cleanly to three priority levels.

| Priority | Element | Weight | Location |
|----------|---------|--------|----------|
| **P0 — Primary** | Engagement count + per-sec rate | Largest numerals, maximum contrast | Top bar, right-center |
| **P1 — Secondary** | Total Followers, per-platform follower counts | Medium numerals, secondary contrast | Top bar (total) + right panel (per-platform) |
| **P1 — Ambient** | Algorithm state name + mood | Name medium, mood environmental | Top bar left + background layer |
| **P2 — Strategic** | Generator rows (count, rate, upgrade cost) | Standard text weight | Center column |
| **P2 — Situational** | Upgrade affordances, unlock teasers | Compact, in-row | Right edge of generator rows |
| **P3 — On-demand** | Individual generator detail, upgrade curves, history | Drawer / modal | Behind tap on generator row |
| **P3 — Elsewhere** | Clout | Not on this screen | Prestige screen |

**Contrast discipline:**
- P0 numerals: 15.8:1 against background (dark theme baseline, per role contrast standards)
- P1 numerals: 7:1
- P2 text: 4.5:1 minimum
- Disabled/unowned state: 3:1 minimum — never fade below perceptibility. If an element isn't worth being perceptible, remove it.

**What recedes, not what disappears:** The mid-game density resolution is that every element has a reason to be on screen, but P1/P2 elements are visually deferential to the P0 counter. The player who needs detail can look. The player in flow only sees the counter move.

---

## 4. Algorithm State Visualization

Per proposal §4 and UX review Q1: ambient weather metaphor. The Algorithm is the weather of the screen, not a dashboard widget.

### 4.1 Components

1. **State name** — text label, top bar left. ~18px weight 500. E.g., "Short-Form Surge."
2. **State mood** — background color palette + background motion signature. Each algorithm state has a named mood definition.
3. **Instability indicator** — visual tension that builds before a shift. No countdown.
4. **Shift transition** — the environmental change at the moment of shift.
5. **Generator modifier chips** — per-row multipliers that reflect the current state's effect on that generator.

### 4.2 Mood library (reference palette per state)

**Base:** Fixed warm near-white `#FAF8F5` across all states. Per-state color is carried by a shifting accent layer (screen-edge mood vignette), not by per-state background gradients. See `proposals/draft/algorithm-mood-visibility.md` for the authoritative edge-color values, opacities, and the Corporate Takeover light-mode signature. This table no longer duplicates those values.

The **Motion signature** column is color-space independent and stands as written.

| State | Mood direction | Motion signature |
|-------|----------------|------------------|
| `short_form_surge` | Electric, impatient | Fast-drifting particles, 6s cycle |
| `authenticity_era` | Cool, quiet | Slow breathing gradient, 12s cycle |
| `engagement_bait` | Garish, pulsing | Jittery pulse at 4s cycle |
| `algorithm_winter` | Flat, cold | Near-still, very slow drift 20s |
| `viral_storm` | Chaotic, energetic | Fast streaks, 3s cycle |

**Rule:** Every mood must pass the P0 contrast check for the engagement counter. Counter-readability trumps mood fidelity — if a mood makes the counter illegible, desaturate the mood.

**Scope note — state-name drift:** This table uses `algorithm_winter` and `viral_storm`, matching the rest of this spec (§4.3–§4.5) and the accepted `generator-balance-and-algorithm-states` proposal. The `algorithm-mood-visibility` draft uses `nostalgia_wave` and `corporate_takeover` in place of those two states. Reconciliation (pick one set of names across spec + proposal + code) is **out of scope** for this revision and needs a follow-up task.

### 4.3 Instability indicator

As `shift_time` approaches, the background motion **intensifies** rather than a new element appearing. Specifically:
- Particle drift speed scales up: from baseline × 1.0 at t-full to × 1.4 at t-0
- Background saturation nudges up 10–15% in the final 20% of the shift interval
- No text, no countdown, no timer bar. The player feels it.

**Why:** A countdown creates clock-watching. Ambient intensification creates anticipation without precision, honoring the fuzzy shift window.

### 4.4 Shift transition

At the shift moment (length: 1.2s):
1. **t=0 → t=400ms:** Background crossfade from old mood to new mood
2. **t=200 → t=600ms:** State name label slides up and out, new label slides in from below (200ms overlap)
3. **t=400 → t=1200ms:** Generator modifier chips on affected rows pulse once (scale 1.0 → 1.15 → 1.0) in their new multiplier color — **green for boosted, amber for penalized, white for neutral**
4. **t=0 → t=300ms:** Brief swell of ambient sound signature (subtle, non-interrupting)

**What the player should understand in 1.2s:** the weather changed, the name is new, and these specific generators (pulsed) are now affected.

### 4.5 Generator modifier chips

Each generator row displays a small multiplier chip inline: e.g., `×1.8` or `×0.6`.

- Chip color: green (boosted, > 1.0), amber (penalized, < 1.0), neutral (≈ 1.0)
- Color is reinforced by a small arrow glyph (▲ / ▼ / —) — no color-only signal
- Chip updates live on shift (see §4.4)

**CVD accessibility:** arrow glyph carries the boost/penalty signal independently of color.

---

## 5. Currency Display

### 5.1 Engagement (P0)

- **Display:** Top bar, center-right. Large numeral (48–56px), weight 600.
- **Format:** Compact notation at thresholds — `12,480` → `12.4K` → `1.2M` → `1.2B`. The compacted form kicks in at ≥10,000.
- **Live ticking:** The number counts in real-time at the underlying production rate. Tick cadence matches earned increments — no batching, no animation between values.
- **Rate sub-label:** Immediately below the numeral, in smaller text (14px): `+18/sec` or `+1.2K/sec`. Same weight, lower contrast.

**Trust signal:** The number must *never* jump backwards without a communicated reason (a spend, a scandal). Its monotonic-forward behavior in normal play is a promise.

### 5.2 Followers (P1)

- **Total Followers:** Top bar, far right. Medium numeral (24px), weight 500. Compact format at ≥10K.
- **Per-platform:** On platform cards in right panel (§6).
- **Ticking:** Same cadence as engagement, but slower-moving since followers gain slowly.
- **Decrease treatment (follower loss):** On decrease, the number does NOT animate downward. It blinks once to the new value with a brief red flash (200ms). Full loss treatment is specified in the Scandal UX spec — this screen only specifies that the visual moment of loss is *perceptible but not sustained*.

### 5.3 Clout (P3 on this screen)

Not displayed on the core game screen. Displayed on the prestige/rebrand screen. This is deliberate: Clout is a cross-run currency, and showing it on the main screen would confuse its scope and pull attention from the in-run economy.

**Exception:** If the player hovers the Rebrand button (prestige affordance, bottom-right), a preview of Clout-on-rebrand is shown in a tooltip. This is the only Clout visibility on this screen.

---

## 6. Generator Display

Per AC: visual language must scale beyond 8 types. The scaling strategy is four differentiators.

### 6.1 The four differentiators

| Differentiator | Purpose |
|----------------|---------|
| **Icon** | Unique glyph per generator. Recognizable at 32px. |
| **Semantic color** | Grouped by content family (images warm, text cool, video saturated, prestige-tier metallic). Same-family generators share a color lane. |
| **Category badge shape** | Pre-attentive grouping: circle (starter), hexagon (mid), diamond (late), star (prestige-unlocked). |
| **Stable ordering + dividers** | Rows are ordered by unlock order, grouped under category dividers (`STARTER` / `MID` / `LATE` / `ABSURD`). Muscle memory builds. |

**Why four:** Icon + color fails around 6–8 items because similar glyphs at similar colors blur. Adding shape (pre-attentive) and spatial grouping (muscle memory) restores differentiation at 12+ items.

### 6.2 Row anatomy

```
┌─────────────────────────────────────────────────────────┐
│  [badge]  Icon  Name            Count  Rate  [chip]  ⬆  │
│           32px  weight 500      (×N)   /sec  (×1.8)     │
└─────────────────────────────────────────────────────────┘
```

- **Badge:** Category shape, holds icon. 32px.
- **Name:** 16px weight 500.
- **Count (×N):** How many owned. 14px.
- **Rate:** Effective engagement/sec from this generator line. 14px.
- **Modifier chip:** Current algorithm effect (§4.5).
- **Upgrade button (⬆):** Primary affordance. Cost shown on hover/tap; executes on confirm tap (see §6.3).

### 6.3 Upgrade interaction

- **Default (hover on desktop):** cost appears next to the upgrade button as a ghost label
- **On tap:** drawer slides out from right of row, showing upgrade path (next 3 levels), cost, and effect delta
- **Confirm in drawer:** spends engagement, row pulses briefly (scale 1.0 → 1.02 → 1.0, 250ms), rate updates, counter ticks down to new value
- **Insufficient engagement:** button shows disabled state (3:1 contrast, not faded out), cost ghost-label in amber

### 6.4 Unowned / locked generators

- Unowned generators are shown in the list at 3:1 contrast (perceptible, receded) with the unlock threshold as a label ("Unlocks at 500 followers")
- The row's badge is hollow (outlined shape, no fill)
- On crossing the threshold, the row animates: fill pours into the badge (400ms), name brightens to full contrast, a one-time sparkle pulse, sound cue

**Why show locked rows at all:** Teasing discovery is core to Target aesthetic #1 (Discovery). The player must see what's coming. Too subtle, no anticipation; too loud, the current row loses focus.

---

## 7. Platform Display & Cross-Posting Flow

### 7.1 Platform card anatomy

```
┌───────────────────┐
│ Chirper           │  ← name, 14px weight 500
│                   │
│  12,480           │  ← follower count, 24px weight 600
│   followers       │  ← label, 11px
│                   │
│ [📸][📝][🎙️]      │  ← affinity chips: generators this platform favors
│                   │
│ ▲ +3.2/sec        │  ← rate indicator
└───────────────────┘
```

- **Affinity chips:** Up to 3 most-favored generator icons with their affinity multiplier. A player glancing should immediately see "this platform loves selfies."
- **Rate indicator:** Per-platform follower earn rate. Arrow-up for gaining, flat-dash for stalled.

### 7.2 Cross-posting flow visualization

Cross-posting is automatic (per architecture). But the *flow* must be visible so the player understands the system.

- When followers tick into a platform, a small floating number (`+2`) rises briefly (600ms) from the platform's footer and fades. Same treatment as a counter tick, localized to the card.
- When a generator contributes heavily to a platform (e.g., a Selfie-heavy run pouring into a photo-favoring platform), the affinity chip for that generator on the platform card gets a subtle glow (1.5s cycle).
- **No flow lines or arrows between generators and platforms.** Those become visual spaghetti at mid-game density. The proximity of floating tick numbers is sufficient.

### 7.3 Locked platform teaser

A locked platform shows as a greyscale card with its unlock threshold ("Unlocks at 2,000 total followers"). Cannot be tapped. On unlock, the card transitions from greyscale to full color over 600ms with a sound cue.

---

## 8. Click-to-Post Interaction

### 8.1 The button

- **Size:** 260×220px — intentionally large. It's the most frequent tap. Forgiveness matters.
- **Copy:** "Post" (primary label, 32px weight 600), with context sub-label showing current active content/platform ("Selfie → Chirper"). The sub-label is muted contrast, 12px, and updates as the player's default content/platform changes.
- **Affordance states:** resting, hover (scale 1.02, 120ms), pressed (scale 0.97, 60ms down / 120ms up).
- **Hit area:** 12px invisible padding extends the hit area beyond the visual edge.

### 8.2 Feedback on click

1. **t=0–60ms:** Button presses (scale 0.97), impact sound cue (short, dry, percussive — think a polaroid shutter)
2. **t=0–500ms:** A small floating number (`+12` or current per-click yield) emerges from the button center, drifts up and toward the engagement counter, fading
3. **t=0–120ms:** Engagement counter ticks to new value (synchronized with float arrival)
4. **t=120–240ms:** Button returns to resting

**Latency target:** Perceived response ≤ 50ms. The impact sound and the button press must begin within one frame of click (<16ms). The floating number can emerge slightly after without breaking tactile feel.

### 8.3 Rapid clicking

Players will spam-click in early game. The interaction must hold up.

- Each click is a discrete event — no batching, no rate limiting
- Sound cue plays every click (browser audio engines may throttle; design around this with a sample pool or short cue)
- Floating number stacks: if multiple clicks fire within 200ms, the floats offset slightly horizontally so they don't overlap into one blob
- **No combo counter.** A combo counter would gamify the click itself, which is mis-aligned — the goal is for generators to replace clicking, not for the player to optimize clicks.

### 8.4 Auto-posting

Once the first generator is owned (`count ≥ 1` of any generator), auto-posting begins. The click button remains active and functional — clicking still adds posts on top of auto-production. The button's sub-label updates to "+ auto" to signal auto is now running.

**Rule:** The click always produces at least as much as one auto-tick would, so clicking always feels rewarded.

---

## 9. Going Viral — Peak Moment

Per proposal Q5 answer and UX review: a sustained 5–10s cascade event that breaks the screen's rhythm.

### 9.1 Trigger

Viral triggers are determined by the game loop, not this spec. The UX assumes the engine signals a "viral burst" event with:
- `source_generator_id`
- `source_platform_id`
- `duration_ms` (5000–10000)
- `magnitude` (total bonus engagement)

### 9.2 Visual choreography

**Phase 1 — Build (0–1500ms):**
- Engagement counter tick rate visibly accelerates beyond normal
- Counter numerals shift to viral gold color (over 300ms)
- Source generator row gains a glow halo (pulsing, 1s cycle)
- Source platform card edges illuminate
- Ambient background saturation bumps up 20%
- Sound: a tonal rising sweep begins (2s duration)

**Phase 2 — Peak (Build end → event_end − decay window, variable):**
- Counter ticks at 3–5× normal rate (visually — math is sampled from the engine signal)
- Particle burst from source generator row, drifting toward the platform card (sustained, not single-shot)
- Screen edge vignette glow (platform-affinity color) pulses at 2s cycle — see note below on vignette layer
- Subtle camera-style zoom pulse (±1%) on bass beats of the sound cue
- Sound: sustained layered whoosh + harmonic bed

**Vignette layer during viral burst:** The screen-edge vignette (defined in `proposals/draft/algorithm-mood-visibility.md`) normally carries the current algorithm mood color. During a viral burst, the viral platform-affinity color takes over: crossfade in over 300ms at burst start, pulse at 2s cycle through Phase 2, crossfade back to mood color over 400ms at Phase 3 end. The two states share the same CSS layer — they do not stack.

**Phase 3 — Decay (last 1000–1500ms):**
- Tick rate decelerates to baseline
- Counter color returns to baseline (400ms fade)
- Particles dissipate
- Screen edge glow fades
- Summary badge appears briefly near counter: "VIRAL +43,200" (1.5s display, then fades)
- Sound: decays with a final chime

### 9.3 The tick-rate drama

Per proposal Q5 answer: "the tick speed itself is the drama." The counter is the star. All other effects frame it. If the counter animation is wrong, nothing else saves the moment.

**Implementation note for engineer:** The counter during viral should maintain monotonic-forward behavior and land on the correct final value. Easing the tick rate across the 3 phases (accelerate → sustain → decelerate) is essential. A flat burst feels cheap; an arced burst feels earned.

### 9.4 Sound signature

**The viral sound is a brand asset.** Recognizable by sound alone after the first time. Engineer should treat this as a single mixed audio stem, not a layering of effects assembled on the fly. Direction: rising tonal sweep → sustained harmonic wash → final chime. Tempo: ~90 BPM. Length: matches event duration (cut or loop the middle as needed).

### 9.5 Frequency and saturation

Viral events must remain rare enough to retain their weight. Target: a fully-engaged mid-game player sees a viral event every 15–40 minutes of active play. If virals fire more than ~3×/session, saturation kills the peak. Tuning owner: game-designer. Flagged in Open Questions.

---

## 10. Mid-Game Density Resolution

The UX review flagged this as "the single biggest UX challenge in the proposal." Here's how this spec resolves it.

**The problem:** at mid-game, the screen carries engagement + total followers + 3 platform follower counts + 5–8 generator rows with modifier chips + algorithm state + upgrade affordances. That's 15–20 live elements.

**The resolution:** three-tier zoning + strict hierarchy.

1. **Top bar is sacred.** Only P0 + P1 live there. No generator info, no upgrade affordances, no secondary CTAs.
2. **Generators own the center.** The list is long but has category grouping, stable order, and consistent row anatomy — the player reads it as a ledger, not as 8 competing elements.
3. **Platforms are peripheral persistence.** Right-side cards do not compete for attention — they provide glanceable context.
4. **Detail is on-demand.** Upgrade curves, generator stats, platform affinity breakdowns live behind tap interactions. The main screen never shows them all at once.
5. **Ambient is backgrounded.** The algorithm mood is on the background layer, which content sits on top of. It never competes for foreground attention except at shift transitions (1.2s).

**The stress test:** at max density (all 3 platforms unlocked, 6+ generators owned, algorithm mid-shift), the player's eye should still land on the engagement counter first. If it doesn't, hierarchy has failed and tuning is needed.

---

## 11. Offline Gains Modal (Return Beat)

Brief spec — this is a supporting screen but belongs on the return beat of the arc.

- **Appears:** On session open if `time_elapsed > 60s` since `last_close_time`
- **Layout:** Center modal, ~480×360px, backdrop dims main screen
- **Content:**
  - Headline: "Welcome back."
  - Time away: "You were away for 3h 42m."
  - Gains list: engagement gained, followers gained per platform, algorithm shifts that occurred
  - Single CTA: "Nice." (primary button, dismisses)
- **Tone:** Generous, validating. Does not guilt, does not urge, does not count down. The CTA copy is satirical-casual — "Nice." / "About time." / "Obviously."
- **Motion:** Modal fades in (200ms), numbers count up from zero to final value over 800ms. CTA is interactive throughout — impatient players can skip the count-up.

---

## 12. Accessibility

Applied throughout, summarized here.

- **Contrast:** All text meets or exceeds WCAG 2.1 AA. Dark-theme targets per role standards (15.8:1 for P0 text).
- **No color-only signals:** Every directional color pairs with an icon or glyph (modifier chip arrows, disabled-state glyphs, trend arrows on platform cards).
- **CVD safe:** All mood palettes and modifier chips pass protanopia, deuteranopia, and tritanopia simulators.
- **Motion sensitivity:** Viral event and algorithm intensification include motion. Settings screen (out of scope here) must include a "Reduce Motion" toggle that: disables particle bursts, replaces background drift with static gradients, and replaces viral zoom pulse with a static glow. The tick-rate drama is preserved — it is not decorative motion, it is the content.
- **Font weights:** P0 and P1 numerals use weight 500+. No weight-300 or thinner fonts are used for game data, per role standards.
- **Hit areas:** Primary CTAs are ≥ 44×44px. The post button vastly exceeds this.

---

## 13. Motion Brief Summary

Quick reference for all named motion.

| Element | What triggers it | Duration | Easing | Communicates |
|---------|------------------|----------|--------|--------------|
| Engagement counter tick | Per-tick earn | — (continuous) | linear | Rate of earning |
| Click feedback press | Click | 60ms down / 120ms up | ease-out | Tactile confirmation |
| Click floating number | Click | 500ms | ease-out | Earn attribution |
| Algorithm background drift | Ambient | 6–20s cycle (per state) | ease-in-out | Current mood |
| Instability intensification | Approaching shift | Scales over final 20% of interval | linear | Something is coming |
| Shift transition | Shift moment | 1.2s | ease-in-out | Weather changed |
| Modifier chip pulse | Shift affecting row | 400ms | ease-out | This generator was affected |
| Upgrade confirm pulse | Upgrade purchase | 250ms | ease-out | Upgrade applied |
| Unlock fill | Crossing unlock threshold | 400ms | ease-out | New thing available |
| Viral build | Viral event start | 1500ms | ease-in | Something big is starting |
| Viral peak tick-rate | Viral sustained | event duration | arc | This is the peak |
| Viral decay | Viral event end | 1000–1500ms | ease-out | Returning to normal |
| Offline modal numbers | Modal appear | 800ms count-up | ease-out | Gains summary |

---

## 14. Mobile (Deferred)

A rough sketch, not a spec. To be specified in a follow-up task.

- Top bar remains full-width but compacts
- Post zone moves to bottom (thumb reach)
- Generators become a vertical scroll list occupying the center
- Platforms become a horizontal scroll strip above the generators
- Algorithm mood still lives in background
- Viral event design largely holds — particle and glow effects scale naturally

**Open question for mobile pass:** can the Algorithm state name + mood be combined into a single top-strip element, or does mood need to remain full-background on mobile?

---

## 15. Open Questions

1. **Viral event frequency target.** This spec assumes 15–40 minutes of active play between virals. If actual tuning is tighter or looser, the motion budget may need revisiting (more frequent → shorter/less energetic events). **Owner: game-designer**
2. **Algorithm state count at launch.** The mood library shows 5 states. Is that the launch count? **Owner: game-designer / architect**
3. **Platform names and content affinities at launch.** Referenced as `chirper`, `instasham`, `grindset` in architecture. Visual identity of each platform (icon, default accent color) needs definition. **Owner: game-designer** (names + satire tone), **ux-designer** (visual identity pass)
4. **Upgrade curve visualization.** Each generator row has an upgrade drawer. The drawer spec is gestured at here but deserves its own pass alongside the balance curves. **Owner: ux-designer (follow-up task)**
5. **Prestige/Rebrand screen.** Out of scope here, but needs its own UX spec. **Owner: ux-designer (follow-up task)**
6. **Mobile layout pass.** Flagged throughout. **Owner: ux-designer (follow-up task)**
7. **Settings screen (Reduce Motion, audio, save management).** Out of scope here. **Owner: ux-designer (follow-up task)**

---

## 16. References

1. `proposals/accepted/core-game-identity-and-loop.md` — design intent and resolved open questions that this spec implements
2. `architecture/core-systems.md` — data contracts and game loop shape this spec designs against
3. `roles/ux-designer.md` — contrast standards, accessibility floor, motion discipline
4. Cookie Clicker — reference for escalating absurdity and trustable number display
5. Universal Paperclips — reference for narrative discovery via ambient system change
