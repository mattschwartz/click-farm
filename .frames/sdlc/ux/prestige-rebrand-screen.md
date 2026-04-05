# Prestige / Rebrand Screen — UX Spec

> **Scope:** Defines the two surfaces of the prestige system: the persistent Clout Shop (accessible during a run) and the Rebrand Ceremony (the theatrical reset flow). Covers entry points, layout, upgrade presentation, purchase flow, ceremony choreography, and post-rebrand re-entry.
>
> **Not in scope:** Individual Clout upgrade balance/tuning values (game-designer territory), persona/handle naming feature (open question, see §9), settings screen prestige controls (see Settings Screen spec when available).
>
> **Implements:** `proposals/accepted/core-game-identity-and-loop.md` §7 (Prestige: The Rebrand)
>
> **Against contract:** `architecture/core-systems.md` — `CloutUpgrade`, `calculateRebrand`, `applyRebrand`, `clout_upgrades` map
>
> **Related:** `ux/core-game-screen.md` §5.3 (Clout visibility) and the Rebrand button affordance

---

## Decisions Taken in This Spec

1. **Two surfaces, not one.** A persistent Clout Shop (modal, accessible during a run) + a distinct Rebrand Ceremony (triggered, theatrical). Players can spend Clout between rebrands — the ceremony remains a discrete ritual.
2. **Clout Shop is a modal, not a full-screen destination.** The current run continues ticking in the background. Shopping is planning, not leaving.
3. **Clout balance lives on prestige affordances only.** Hovering the Upgrades button shows balance; hovering Rebrand shows Clout-on-rebrand preview. Extends core-game-screen.md §5.3 rather than contradicting it.
4. **Rebrand Ceremony is 4 phases, 6–10s total:** Threshold → Eulogy → Commit → Dissolution→Rebirth. Earned runtime because it fires rarely (handful per session max).
5. **Post-rebrand re-entry is silent.** No "Welcome back!" modal. The cleared main screen and the tactile feel of starting over is the communication. A fresh run speaks for itself.
6. **Eulogy phase is skippable.** Satire lands harder when it's optional. First rebrand plays in full; subsequent rebrands can skip.
7. **The Commit tap is irreversible with no second confirmation.** The user crosses threshold review before reaching Commit. Layering a second "are you sure?" would dilute the weight of the first decision.

---

## 1. Emotional Arc Map — The Prestige Beat

The prestige flow has its own arc, distinct from normal play. Every element should know which beat it serves.

| Beat | Player state | What the screen owes them |
|------|--------------|---------------------------|
| **Contemplation** (browsing Clout Shop) | Planning, strategizing | A clear picture of what upgrades do and what's next. No pressure. This is the quiet between storms. |
| **Approach** (hovering Rebrand button) | Weighing | "Am I ready?" The tooltip shows Clout-on-rebrand — enough signal to weigh, not enough to over-analyze. |
| **Threshold Review** (Phase 1 of ceremony) | Sobering | A clear-eyed account of what resets and what persists. Not punitive, not celebratory — factual and respectful. |
| **Eulogy** (Phase 2) | Affectionate letting-go | A brief satirical acknowledgment of the current identity. "They will not remember you." This is where the game's voice lives hardest. |
| **Commit** (Phase 3) | Decisive | One button, large, unambiguous. No second-guessing. The decision is done when the button is tapped. |
| **Dissolution** (Phase 4a) | Surrender | Counters fall, screen desaturates, the current run visibly ends. The player watches it go. |
| **Rebirth** (Phase 4b) | Fresh start | Return to a clean main screen. Energy resets. No welcome modal — the silence is the point. |
| **First Click** (post-rebrand) | Re-engagement | The tactile click + number tick lands in a new context. Engagement = 12 hits differently than the 847K they just let go of. |

**The arc shape:** Contemplation is flat and low-stakes. Approach tilts upward. Threshold Review is clinical. Eulogy dips into melancholy-satire. Commit spikes. Dissolution is a slow decay. Rebirth is silent. First Click is the new baseline.

If the shape is wrong — if Eulogy is too loud, or Commit too quiet — the prestige moment will feel cheap the second time.

---

## 2. Entry Points

### 2.1 The Prestige Cluster

The bottom-right of the core game screen holds a **prestige cluster** — two related affordances, visually grouped.

```
          ┌──────────────┐  ┌──────────────┐
          │  Upgrades    │  │   Rebrand    │
          │    [⚙]       │  │    [↻]       │
          └──────────────┘  └──────────────┘
               bottom-right of main screen
```

- **Visually grouped:** the two buttons sit together with ~12px spacing, bordered or tinted to indicate they share a domain (prestige).
- **Visually deferential:** the cluster does not compete with the engagement counter or generator list. It sits quietly until the player seeks it.
- **Unlock gating:** both buttons are inactive (3:1 contrast, not hidden) until the player reaches a first-rebrand threshold (game-designer owns the threshold value; flagged in §9). Seeing them while locked teases the system, per the Discovery aesthetic.

### 2.2 Upgrades Button

- **Icon:** gear / upgrade glyph, 24px
- **Label:** "Upgrades"
- **Hover (desktop):** tooltip shows current Clout balance — e.g., "42 Clout"
- **Tap:** opens Clout Shop modal (§3)
- **Disabled state (no Clout, no owned upgrades):** still opens the modal, which shows the empty state (§3.6)

### 2.3 Rebrand Button

The Rebrand button is already specified at `core-game-screen.md §5.3` (tooltip shows Clout-on-rebrand preview). This spec extends it:

- **Hover:** tooltip shows `clout_on_rebrand` calculation — e.g., "Rebrand → +8 Clout" (using `floor(sqrt(total_followers) / 10)`)
- **Tap:** opens Rebrand Ceremony at Phase 1 (§4.2)
- **Locked state:** before first eligibility, shown at 3:1 contrast with tooltip "Rebrand at 1,000 followers" (or equivalent eligibility threshold, see §9)

**Why not combine into one button with a menu?** Two affordances is clearer — Upgrades and Rebrand do genuinely different things, and collapsing them into a menu adds a click without earning anything. Real influencer panels look like cluttered toolbars; the satire tolerates a little visual density here.

---

## 3. Clout Shop Modal

### 3.1 Layout

Modal, centered, ~720×560px. Dark backdrop dims the main screen to ~30% opacity but **the game keeps running** — engagement counter ticks are still visible at the modal edges. This is a planning surface, not an escape.

```
┌─────────────────────────────────────────────────┐
│  Rebrand Upgrades                          [×]  │  ← header
├─────────────────────────────────────────────────┤
│                                                 │
│   Clout: 42                                     │  ← balance (P0)
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│   [category: ENGAGEMENT]                        │
│   ▸ Algorithm Whisperer   Lv 2/5   cost: 8  ⬆  │
│   ▸ Viral Instinct        Lv 0/3   cost: 15 ⬆  │
│                                                 │
│   [category: UNLOCKS]                           │
│   ▸ AI Slop (generator)   locked   cost: 25 ⬆  │
│   ▸ Grindset Headstart    owned     ✓           │
│                                                 │
│   [category: INSIGHT]                           │
│   ▸ Shift Lookahead       Lv 1/3   cost: 12 ⬆  │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Why a modal:** Full-screen would break the background metaphor — your empire is still running, so the empire should still be visible. The modal is large enough to feel like a destination, small enough that the game's continued existence is never in doubt.

**Close affordances:** × in corner, Esc key, click backdrop. All close the modal without state changes.

### 3.2 Clout Balance Display

- **Position:** top of modal body, own row
- **Format:** `Clout: 42` — large numeral (36px weight 600), label 16px
- **Contrast:** P0 level (15.8:1 against modal background)
- **On purchase:** value animates downward (ticks over ~400ms) to new total. Monotonic — never skips, lands clean.

**Why a numeral, not an icon-and-count:** Clout is a currency of time investment. The number is the thing. An icon next to it would add decoration without meaning.

### 3.3 Upgrade Row Anatomy

```
┌─────────────────────────────────────────────────────┐
│  [icon]  Name               Lv N/M   cost: X    ⬆  │
│           description text                          │
└─────────────────────────────────────────────────────┘
```

- **Icon:** 28px, upgrade-specific glyph
- **Name:** 16px weight 500
- **Description:** 12px, muted contrast (7:1). Shown always, not on hover — players need to read these while planning.
- **Level indicator:** "Lv N/M" for multi-level, "owned" or "locked" for one-shot
- **Cost:** Clout cost for next purchase. For maxed items, shows `MAX` instead. For owned one-shots, shows ✓.
- **Upgrade button (⬆):** primary affordance, right-aligned. Disabled if insufficient Clout or at max level.

**Row height:** 72px (label row + description row + padding).

### 3.4 Upgrade Categories

Per architecture (`CloutUpgrade.effect` tagged union), four effect types map to three UX categories:

| Category | Effect types | Feel |
|----------|--------------|------|
| **ENGAGEMENT** | `engagement_multiplier` | Steady multipliers. The "make everything faster" lane. Multi-level. |
| **UNLOCKS** | `generator_unlock`, `platform_headstart` | One-shots. Each row is a discrete permanent unlock. |
| **INSIGHT** | `algorithm_insight` | Reveal upcoming Algorithm shifts. Multi-level (more lookahead). |

**Why merge unlocks into one category:** generators and platforms both unlock new *things* the player didn't have before. From the player's strategic surface they're the same shape of decision: "spend Clout to get a new toy." Splitting would atomize the list without clarifying anything.

**Stable ordering:** categories always appear in the order ENGAGEMENT → UNLOCKS → INSIGHT. Within a category, rows are ordered by cost ascending (so the next affordable item is always near the top of its category).

### 3.5 Purchase Flow

1. **Tap upgrade button (⬆) on a row**
2. **Button state:** briefly depresses (scale 0.97, 60ms)
3. **Row pulses:** scale 1.0 → 1.02 → 1.0 (250ms, same as generator upgrade pulse in core-game-screen.md §6.3)
4. **Clout balance ticks down:** value animates to new total (400ms)
5. **Row updates:** level indicator advances, cost updates to next level's cost, or row transitions to MAX / ✓ state
6. **Sound:** a small positive chime — warmer than the click-to-post cue, shorter than the viral sound

**No confirmation dialog.** The cost is visible, the button requires an intentional tap, and the action is contained (upgrades persist, can't be "undone" but also don't destroy anything). Layering a confirmation would make every purchase feel consequential in a way most aren't.

**Insufficient Clout:**
- Button state: 3:1 contrast, not faded out (per core-game-screen.md accessibility standard)
- Cost label: shown in amber (not red — amber is "can't yet," red is "something wrong")
- On tap: button briefly shakes (4px horizontal, 200ms), no state change, no sound

### 3.6 States

**Empty state (no Clout, no upgrades owned — first visit):**
- Balance shows `Clout: 0`
- Upgrade list renders with all rows in locked/insufficient state
- A single header line reads: "Earn Clout by rebranding. Your first rebrand is ahead." (11px, muted, above the category dividers)
- No blocking overlay, no tutorial modal — the player sees the shop they'll eventually use

**All-maxed state (late game, everything purchased):**
- Balance still shows current Clout (which may have excess with nothing to spend on)
- Rows all show MAX or ✓
- A single footer line: "You've mastered the system. Rebrand to reset the stage." — hint that further progression is via new runs, not more upgrades
- Footer line is 11px, muted, not a CTA

**Partial state (normal play):** the default. Mix of purchasable, owned, locked, and insufficient rows.

---

## 4. Rebrand Ceremony

Triggered by tapping the Rebrand button (§2.3) when `total_followers ≥ rebrand_threshold`.

### 4.1 Trigger & Preconditions

- **Eligibility:** `total_followers ≥ rebrand_threshold` (threshold is a tuning value, see §9)
- **Pre-ceremony:** main screen dims to ~20% opacity, ceremony modal fades in (300ms)
- **During ceremony:** the game loop pauses — production halts, Algorithm shifts pause. The ceremony is outside normal time.
- **Cancellation:** available in Phases 1 and 2. Not available in Phase 3 or 4 (see §4.6).

**Why pause the game loop:** the ceremony is a discrete moment of decision. Ticks during the ceremony would either create FOMO ("I'm losing earn time!") or pollute the rebrand calculation (followers accumulating mid-ceremony would change the Clout earned). Pausing is the honest choice.

### 4.2 Phase 1 — Threshold Review (static, ~2s to read)

A full-modal layout showing a clinical account of what's about to happen.

```
┌──────────────────────────────────────────────┐
│                                              │
│        You are about to rebrand.             │
│                                              │
│   ┌────────────────────────────────────┐    │
│   │  Current followers:   47,230       │    │
│   │  Clout earned:        +68          │    │
│   │  New Clout balance:   110          │    │
│   └────────────────────────────────────┘    │
│                                              │
│   What resets:                               │
│     ▸ Engagement             (847,200)       │
│     ▸ Generators owned       (6 types)       │
│     ▸ Platforms unlocked     (3 platforms)   │
│     ▸ Follower counts        (all)           │
│                                              │
│   What persists:                             │
│     ▸ Clout                                  │
│     ▸ Clout upgrades         (4 owned)       │
│     ▸ Lifetime followers     (compounding)   │
│     ▸ Rebrand count          (→ 3)           │
│                                              │
│            [  Cancel  ]  [  Continue  ]      │
│                                              │
└──────────────────────────────────────────────┘
```

- **Tone:** factual, respectful. No exclamation marks. No celebration yet.
- **The math is shown:** Clout earned + current Clout = new balance. The player should not have to trust a black box at the moment of commitment.
- **Cancel returns to main screen** (game loop resumes, no state change)
- **Continue proceeds to Phase 2**

### 4.3 Phase 2 — Eulogy (dynamic, ~3–4s, skippable)

The game's voice gets louder here. This is where the satirical tone of the project lives hardest.

**Structure:** 3–4 short stanzas appear sequentially, each fading in over 600ms and lingering for ~1s before the next arrives.

**Example stanzas (generated from run state):**
> "You had 47,230 followers on Chirper, InstaSham, and Grindset."
>
> "They will not remember you."
>
> "Your Selfies generated 847,200 engagement. A legacy."
>
> "The Algorithm favored you in Engagement Bait for 14 minutes. Brief but meaningful."

- **Content sources:** top platform by followers, top generator by lifetime engagement, longest-held Algorithm state during run, total engagement earned
- **Tone:** affectionate, deadpan, satirical. Punchlines land via juxtaposition ("A legacy" after a mediocre number).
- **Background:** desaturates slowly across the phase (0% → 40% desaturation over 3s)
- **Skip:** "Skip" link bottom-right, always available. First rebrand does NOT show the skip until the 3rd stanza (protect the first experience). Subsequent rebrands show skip immediately.

**Stanza copy is data-driven** — engineer pulls from a template library with run-state substitution. Game-designer owns the template library (template writing flagged as follow-up in §9).

**After all stanzas play:** screen holds on the final stanza for 1s, then auto-advances to Phase 3. No manual advance — the pacing is controlled.

### 4.4 Phase 3 — Commit (~1s)

A single button. Minimal copy. Maximum weight.

```
┌──────────────────────────────────────────────┐
│                                              │
│                                              │
│                                              │
│              Become someone new.             │
│                                              │
│            ┌─────────────────────┐           │
│            │                     │           │
│            │       Rebrand       │           │
│            │                     │           │
│            └─────────────────────┘           │
│                                              │
│                                              │
│                                              │
└──────────────────────────────────────────────┘
```

- **Headline:** 24px weight 500, centered
- **Button:** 280×80px. Larger than the post button. The biggest button in the game. This is deliberate — the irreversibility deserves physical weight.
- **No cancel button in Phase 3.** The player passed cancel in Phase 1. Adding it here dilutes the commit moment. If they close the modal (backdrop click, Esc), it DOES cancel — but it's a deliberate off-path action, not a displayed option.
- **On tap:** button scales 0.96 (80ms), then the screen transitions to Phase 4.
- **Sound:** a single low tone — not a click cue, a commitment cue. Lower register than any other sound in the game.

### 4.5 Phase 4 — Dissolution → Rebirth (~3–4s)

**Dissolution (first half, ~2s):**
1. **t=0 → 1000ms:** All visible counters in the backdrop tick downward rapidly. Engagement, followers, generator counts — all falling toward zero. Fast but visible (the player should see the cost).
2. **t=500 → 2000ms:** Background desaturates fully to ~10% saturation. Color leeches out of the scene.
3. **t=800 → 1800ms:** A soft dissolution sound — layered whoosh descending in pitch. Not violent. A cleansing.
4. **t=1500 → 2000ms:** The screen fades to a transitional wash (deep muted blue, near-black).

**Rebirth (second half, ~2s):**
5. **t=2000 → 2400ms:** Brief held silence on the dark wash. ~400ms of stillness.
6. **t=2400 → 2600ms:** A single clean tone. Higher register than the Commit tone — an opening, not a closing.
7. **t=2600 → 3500ms:** Screen fades back in to the fresh main screen. Color returns over 900ms.
8. **t=3200 → 3800ms:** (Optional, see §9) New persona name flashes briefly in the top-left if persona feature is scoped in.

**Total Phase 4 duration:** ~3.8s. Combined with Phases 1–3, total ceremony runtime is **~8s for first rebrand (unskipped)**, **~5s for subsequent (eulogy skipped)**.

### 4.6 Cancellation

- **Phase 1:** "Cancel" button available. Closes ceremony, resumes game loop, no state change.
- **Phase 2:** Backdrop click or Esc cancels. No visible Cancel button (it would compete with Skip). Closing behaves identically to Phase 1 cancel.
- **Phase 3:** Backdrop click or Esc cancels. No visible Cancel button (per §4.4).
- **Phase 4:** **No cancellation.** The rebrand calculation has been committed to state. Once Phase 4 begins, the rebrand has happened; only the visual is playing out.

---

## 5. Post-Rebrand Re-Entry

The player arrives at a fresh main screen. No welcome modal.

**What they see:**
- Engagement counter: `0`
- Total followers: `0`
- Generator list: all rows in locked/unowned state (at 3:1 contrast, thresholds visible)
- Platform cards: all locked, except any purchased via `platform_headstart` upgrades
- Algorithm mood: the new state from the new seed, displayed silently
- Rebrand count indicator: small badge somewhere quiet (top-bar left, next to or under algorithm state name) — shows `RUN 3` or equivalent

**What they don't see:**
- No modal
- No "Welcome back" copy
- No tutorial
- No encouragement

**Why silence:** this is the second (third, fourth...) time the player has done this. A welcome modal would feel condescending. The cleared screen is the reward — it's the canvas. The first Post click lands with different weight now. Let the player discover that themselves.

**Exception for first rebrand:** a single line of quiet copy appears in the top-right for 4s then fades: `You are new again.` No interaction, no button. Purely ambient.

**Rebrand count badge:**
- Position: inline with algorithm state name, top-left
- Format: `RUN 3` — 11px, muted contrast (4.5:1), uppercase
- First rebrand introduces the badge (RUN 2). It persists across all subsequent runs.

---

## 6. Edge Cases & Empty States

**Zero Clout at rebrand:** Phase 1 shows `Clout earned: +0`. Not blocked — the player may rebrand with zero Clout if they're below the shop's cheapest item. The ceremony still runs in full; the math just shows zero.

**First rebrand (rebrand_count = 0 → 1):**
- Eulogy plays in full, skip hidden until 3rd stanza
- Post-rebrand shows "You are new again." ambient copy
- Rebrand count badge appears for the first time (RUN 2)

**Rebrand with all Clout upgrades maxed:** ceremony runs normally. Clout still earned, just has nothing to spend on until new upgrades exist. Clout balance grows unused — this is the signal that the player has mastered the meta-game and further progression is via runs, not upgrades.

**Rebrand while Clout Shop modal is open:** not possible — Rebrand button is on the main screen, shop is modal, player must close shop first. If the player has the shop open and taps the prestige cluster via keyboard, shop closes first, then ceremony opens.

**Network loss during ceremony:** not applicable — ceremony is client-side only. Save triggers after `applyRebrand` writes new state; if save fails, engineering handles retry per save module spec.

---

## 7. Accessibility

- **Contrast:** Clout balance display uses P0 15.8:1. Upgrade names use P1 7:1. Descriptions use P2 4.5:1. All per role standards.
- **No color-only signals:** upgrade state (owned, locked, insufficient, max) uses text labels and glyphs (✓, MAX, cost number, locked icon). Amber cost label pairs with position/icon, never color alone.
- **CVD safe:** upgrade category colors (if used) pass protanopia/deuteranopia/tritanopia simulators. The UNLOCKS category should not rely on green-only signaling for "available" state.
- **Motion sensitivity:** the Rebrand Ceremony has significant motion in Phase 4. Reduce Motion (per core-game-screen.md §12) must:
  - Replace the counter-ticking dissolution with a single fade to zero (1s)
  - Replace background desaturation animation with an instant desaturation
  - Preserve the sound design (sound is not motion)
  - Preserve the held silence and fade-back (those are timing, not motion)
- **Keyboard navigation:** all modals fully keyboard-navigable. Esc closes (where cancellation is allowed). Enter confirms primary action. Tab cycles focus. Shop modal traps focus while open.
- **Hit areas:** Commit button (§4.4) at 280×80px vastly exceeds the 44×44px minimum. Upgrade buttons (⬆) are 44×44px minimum.
- **Font weights:** Clout balance uses weight 600. No weight <400 for numerals. Per role standards.
- **Screen reader support:** Phase 2 stanzas must render as live text (aria-live="polite") so screen readers announce them. Phase 4 dissolution should have an aria-live announcement: "Rebranding. Run 3 beginning."

---

## 8. Motion Brief Summary

| Element | Triggers | Duration | Easing | Communicates |
|---------|----------|----------|--------|--------------|
| Upgrades button hover tooltip | Hover | 150ms fade | ease-out | Clout balance |
| Rebrand button hover tooltip | Hover | 150ms fade | ease-out | Clout-on-rebrand preview |
| Clout Shop modal open | Tap Upgrades | 300ms fade + scale 0.98→1.0 | ease-out | Surface appearance |
| Upgrade row purchase pulse | Tap upgrade | 250ms | ease-out | Upgrade applied |
| Clout balance tick-down | After purchase | 400ms | ease-out | Cost paid |
| Insufficient-clout shake | Tap disabled button | 200ms | spring | Cannot afford |
| Rebrand Ceremony modal open | Tap Rebrand | 300ms fade | ease-out | Entering ceremony |
| Phase 2 stanza fade-in | Phase 2 advances | 600ms | ease-out | New stanza |
| Phase 2 background desaturation | Phase 2 duration | 3000ms | linear | Letting go |
| Phase 3 button press | Tap Rebrand | 80ms down / 120ms up | ease-out | Commitment |
| Phase 4 counter dissolution | Phase 4 begins | 1000ms | ease-in | Reset |
| Phase 4 desaturation | Phase 4 begins | 1500ms | ease-in | End of run |
| Phase 4 fade-to-wash | Phase 4 mid | 500ms | ease-in | Passage |
| Phase 4 held silence | After fade | 400ms | — | Liminal |
| Phase 4 fade-to-fresh | Rebirth | 900ms | ease-out | New run |
| "You are new again" ambient | First rebrand only | 600ms in / 4s hold / 600ms out | ease-in-out | Gentle welcome |
| Rebrand count badge appears | First rebrand | 400ms fade | ease-out | Run indicator |

---

## 9. Open Questions

1. **Rebrand eligibility threshold.** At what `total_followers` value can the player first rebrand? Too low and prestige loses weight; too high and new players never see it. **Owner: game-designer.**
2. **Persona / handle naming on rebrand.** Does each rebrand assign a new generated persona name (e.g., "@realtaydaly_" → "@taylor.codes")? Low scope, high flavor. This spec is designed to work with or without it — Phase 4b includes an optional step if the answer is yes. **Owner: game-designer.**
3. **Eulogy stanza template library.** Phase 2 pulls from a template library with run-state substitution. Who writes the templates? Initial set needs ~20 templates for variety. **Owner: game-designer (voice), ux-designer (format).**
4. **First Clout upgrade costs and level caps.** Affects the Clout Shop's empty-state readability — if the first upgrade costs 50 Clout and a player's first rebrand yields 8, the shop feels empty for a long time. **Owner: game-designer.**
5. **Do Clout upgrades have prerequisite chains?** E.g., "must own Algorithm Whisperer Lv 3 before Viral Instinct unlocks." This spec assumes a flat list, but a tree would change §3.1 layout. **Owner: game-designer.**
6. **Post-rebrand Algorithm state visibility.** The new run starts with a new seed, so a new Algorithm state. Does the new state name flash on arrival (like Phase 4b persona name) or appear silently? This spec defaults to silent, but the first shift the player witnesses is implicitly a storytelling beat. **Owner: ux-designer (follow-up pass).**
   - **[RESOLVED — ux-designer, 2026-04-05]** Silent confirmed. The new algorithm state name appears in the top bar immediately as the main screen fades back in (Phase 4 Rebirth). No flash, no call-out. The player discovers the new weather as they would mid-session — by glancing. This is consistent with the "no welcome modal, no instructions" post-rebrand philosophy. The first Algorithm shift the player *witnesses* in the new run is the storytelling beat; the starting state is just the canvas.
7. **Clout Shop access from the ceremony.** Should Phase 1 allow the player to open the Clout Shop inline ("spend this Clout first")? This spec says no — the shop is accessible before the ceremony, and once in the ceremony the player is committed to the flow. But some players will want to buy-then-rebrand in one session. **Owner: game-designer / ux-designer.**

---

## 10. References

1. `proposals/accepted/core-game-identity-and-loop.md` §7 — prestige mechanic, Clout economy, narrative framing
2. `architecture/core-systems.md` — `CloutUpgrade`, `calculateRebrand`, `applyRebrand`, `clout_upgrades` map, what persists vs. resets
3. `ux/core-game-screen.md` §5.3 — Clout visibility rules, Rebrand button affordance
4. `ux/core-game-screen.md` §6.3 — upgrade row pattern (reused for Clout Shop rows)
5. `ux/core-game-screen.md` §12 — accessibility standards, Reduce Motion behavior
6. `roles/ux-designer.md` — contrast standards, accessibility floor, motion discipline
7. Cookie Clicker — reference for ascension/prestige ceremonies in the clicker genre
8. Adventure Capitalist — reference for persistent-shop + ceremonial-prestige pattern (Angel Investors)
