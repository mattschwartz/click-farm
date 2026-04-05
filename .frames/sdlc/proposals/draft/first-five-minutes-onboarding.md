---
name: First Five Minutes — Onboarding Through Progressive Reveal
description: Defines the teaching philosophy, sequence, and safety rails for the player's first five minutes — progressive affordance-driven reveal with a single anchoring voice moment, no modal tutorials, and Algorithm + Audience Mood held back until they can do design work.
author: game-designer
status: draft
reviewers: [game-designer]
---

# Proposal: First Five Minutes — Onboarding Through Progressive Reveal

## Problem

Click Farm has 6–7 interlocking systems (generators, platforms, algorithm, gigs, creator kit, audience mood, clout) and an explicit rule against modal tutorials. No artifact currently defines what the player does in their first 60 seconds, what they understand by minute 5, or how each system first appears.

Clicker games live or die on whether the player feels agency within ~5 minutes. Every system added since the core identity spec raises the teaching burden. Without a sequenced onboarding design, each system will surface "whenever its threshold hits," which in aggregate risks producing an overwhelming opening or a mechanically thin one.

This proposal defines the philosophy, the sequence, and the specific first-run accommodations that make the opening legible.

## Proposal

### 1. Philosophy: Progressive Reveal With a Whisper of Voice

**Core commitment:** Systems appear in the UI **only when they become relevant to the player**. The screen grows with the player. No system is pre-rendered as "locked and dimmed" aspiration scaffolding; no system is explained via modal. The existing Lvl↑ affordance-state pattern is generalised to **every system**.

**The single exception:** one line of anchoring voice copy at t=0, on the empty feed, that fades out on first click. Purpose — land the satirical tone before any mechanic engages, so the numbers-going-up that follows has a fictional home. Everything after that is evergreen; no first-run-only copy reappears.

**Why this philosophy:**
- It honours the "no modal tutorials" rule from `core-game-identity-and-loop.md` §8
- It compounds the affordance-state work already accepted in `lvl-up-button-affordance-states.md`
- It produces the Discovery aesthetic continuously rather than front-loading it
- It matches Cookie Clicker's proven pattern — buildings appear as you can afford them, not before

**What this philosophy rejects:**
- Full-canvas dimmed scaffolding at t=0 — hostile to skill floor; fights information hierarchy from minute one
- Scripted multi-beat tutorials — fragile, breaks the idle-game contract, and ages badly
- First-run-only copy beyond the one anchoring line — first-run copy is a maintenance burden and a retention trap (players on second accounts feel the rails)

---

### 2. Minute-By-Minute Sequence

This sequence is a **design target**, not a hard schedule. Timings are approximate — actual timing depends on click rate and generator balance. What matters is the **order** of reveals and the **relative** timing.

| ~Time | What appears | What the player learns |
|---|---|---|
| t=0 | Empty feed, Post button, Selfies row at base cost, one line of anchoring voice copy | This game has a voice. Clicking is the verb. |
| ~t=0 (first click) | Voice copy fades. Engagement counter begins visibly accumulating. | Click → Engagement. |
| ~t=10s | First follower conversion visible. | Engagement → Followers. Two currencies, two cadences. |
| ~t=20–30s | First Selfies unit becomes affordable; Lvl↑ row enters affordable state. | Spending produces production. |
| ~t=2–3min | Memes unlock (at 50 followers). Selfies→Memes reveal is the player's first generator-tier jump. | There is more than one kind of content. |
| ~t=4.5–5.5min | **First Algorithm shift fires.** Readable Algorithm UI element surfaces for the first time (state name, indicator). | The environment changes. Memes' output just shifted visibly — **so THAT'S what the vignette was.** |
| ~t=5min+ | Platform 2 becomes unlockable; affordance prompts its unlock. | Parallel tracks exist. |
| ~t=5–7min | First Gig offer eligible to fire (once player has meaningful empire to boost). | Timed opportunity is a layer. |

**Deferred past the first five minutes (see §4):**
- **Audience Mood** — silent until the player can produce mood drift with real agency
- **Creator Kit menu** — surfaced after player has demonstrated they understand per-run spending (first Lvl↑, first unit-buy loop completed)
- **Clout** — structurally unreachable until first Rebrand

---

### 3. The First Meaningful Decision

Clicking is not a decision — it's a motor action. The first *decision* with a real tradeoff is:

> **"Should I buy a second Selfies unit, or save for Memes?"**

This is the first fork where both options are legitimate and the player has to read the state of the game to choose. It should land **~t=45s–2min**, once the player has enough Engagement on the table to feel the choice.

Everything before this moment is motor-loop bootstrap (click, watch numbers, click again). Everything after is strategy. The transition from "playing the animation" to "playing the game" happens here, and the game should be tuned so this fork is crisp and unavoidable — not hidden behind a dominant-strategy.

Design ask: **the cost curve of Selfies units vs the unlock threshold of Memes must produce a real tension at this fork.** If Selfies-stacking is strictly dominant until after Memes unlock, the decision is fake. If Memes are strictly dominant the moment they're visible, the decision is fake the other way. Balance passes (task #88 and successors) should test against this fork explicitly.

---

### 4. System Introduction Rules

Each system has an **entry condition** that governs when its UI first appears. No modal. No announcement. The entry condition trips, the UI element reveals, the player discovers it.

| System | Entry condition | Teaching mechanism |
|---|---|---|
| Selfies (generator) | t=0 | Present from start; only clickable thing besides Post button |
| Lvl↑ button | First time it becomes affordable | Affordance-state pattern (accepted) — button lights up |
| Second+ generator | Follower threshold crossed | Generator row appears in list with cost display; affordance lights up if affordable |
| Platform 2/3 | Follower threshold crossed | Platform card appears in platform strip, visibly "unlockable" |
| Algorithm (readable UI) | First algorithm shift fires (~5min) | Shift animation is the teaching moment; state name and indicator surface together |
| Algorithm (vignette) | t=0 | Already ambient per `algorithm-mood-visibility.md` — no UI change, just presence |
| Gigs | Follower threshold crossed AND first Gig offer actually fires | The offer card itself is the introduction |
| Audience Mood | 2+ generators owned AND t > 5 min (see safety rail §5) | First mood strip appears on a platform card when retention drops below 0.95 |
| Creator Kit menu | Player completes first Lvl↑ action | Menu reveal as reward for demonstrating mastery of per-run spending |
| Clout / Rebrand | First Rebrand completed | Unreachable during first run; inherently deferred |

---

### 5. Safety Rails (First-Run Accommodations)

Four small accommodations to the opening that respect existing specs:

#### 5.1 Audience Mood safety rail

**Rule:** Audience Mood's retention drag does not activate until the player has **2+ generators owned AND has been playing for more than 5 minutes** (cumulative play time, not wall-clock).

**Rationale:** Retention drag without context feels like the game is broken. The player has no frame of reference for "×0.8 retention on Platform A" if they've never seen ×1.0 feel normal. Audience Mood's diagnostic register ("my audience is telling me something") requires an audience the player knows they built — which takes at least a few minutes.

**Mechanical implementation (engineer scope):** pressure accumulators (content fatigue, neglect, algorithm misalignment) remain frozen at 0 until the entry condition is satisfied. After that, they behave exactly per `audience-mood-retention.md`. No special rules post-entry.

**This does not modify the accepted Audience Mood proposal** — it is a first-run-only freeze on the pressure accumulators, consistent with the "no negative events offline" rule that already freezes them in other contexts.

#### 5.2 Starter Algorithm state pinned to `short_form_surge`

**Rule:** Fresh saves begin with Algorithm state = `short_form_surge`. After the first shift, normal seeded timing and state selection take over.

**Rationale:** The balance proposal (`generator-balance-and-algorithm-states.md`) already describes `short_form_surge` as "the most natural starting state — the player's first experience of the algorithm feeling like a puzzle to solve." This rule formalises that intent as a hard guarantee. Selfies under `short_form_surge` receive a mild +6% effective boost — positive framing, no penalty, and the eventual shift away from it produces maximum contrast for teaching.

**This modifies `generator-balance-and-algorithm-states.md` slightly** — it pins the starter state where the existing proposal only describes preference. First-run-only; zero impact on balance after shift #1.

#### 5.3 Tightened variance on first shift

**Rule:** Shift #1 on a fresh save fires at **5 min ± 30 seconds** (tighter than the normal ±1 min variance). After shift #1, normal variance (±1 min) resumes.

**Rationale:** The onboarding window is narrow. A 4-min shift risks firing before the player has Memes unlocked (teaching moment wasted). A 6-min shift risks firing after the player has mentally checked the Algorithm as "just weather" (teaching moment missed). The tighter window guarantees shift #1 lands in the sweet spot where Memes are present and the player is still actively decoding the game.

**This modifies `generator-balance-and-algorithm-states.md` slightly** — first-run-only variance tightening. Zero impact on balance after shift #1.

#### 5.4 Anchoring voice copy at t=0

**Rule:** One line of satirical flavor copy appears on the empty feed at t=0. It fades on first click and does not reappear for the rest of that run or any subsequent run.

**Rationale:** The game's voice is its biggest differentiator; landing it before mechanics engage pre-loads the fiction. Fading on first click means the player never feels pinned by the copy. Not reappearing means no maintenance burden and no "skip intro" irritation for returning players.

**Copy direction (not final line — game-designer to write):** Something in the register of *"It's time to become someone,"* or *"Post your first post. Change nothing. Watch what happens."* — voice is dry, self-aware, implicating. Final copy drafted at build time.

---

### 6. What This Locks In

- Teaching philosophy: **progressive affordance-driven reveal** for all systems, with **one anchoring voice moment** at t=0
- No modal tutorials, ever
- Entry conditions per system (§4) — the engineer and UX designer implement against these conditions
- First meaningful decision is the Selfies-vs-Memes fork and balance passes must protect it
- Four first-run safety rails (§5)

### 7. What This Leaves Open

- Final anchoring copy line (game-designer, at build time)
- Exact follower thresholds for non-first-five-minutes system reveals (Gigs, Creator Kit, etc.) — those remain in their own specs
- Whether the second-platform unlock affordance uses a different visual language than the generator-unlock affordance (ux-designer call)
- Playtest validation that the Selfies/Memes fork is actually crisp at current balance values (game-designer + playtesting, task #88 territory)

---

## References

1. `.frames/sdlc/proposals/accepted/core-game-identity-and-loop.md` — §1 Fantasy & Tone, §2 Core Loop, §8 Engagement Line, target aesthetics (Discovery, Expression, Submission)
2. `.frames/sdlc/proposals/accepted/generator-balance-and-algorithm-states.md` — Algorithm state definitions, 5-minute base interval, `short_form_surge` as the natural starting state
3. `.frames/sdlc/proposals/accepted/algorithm-mood-visibility.md` — ambient vignette layer, visual presence independent of readable UI
4. `.frames/sdlc/proposals/accepted/audience-mood-retention.md` — the system the §5.1 safety rail defers
5. `.frames/sdlc/proposals/accepted/lvl-up-button-affordance-states.md` — the affordance-state pattern this proposal generalises
6. `.frames/sdlc/proposals/accepted/creator-kit-upgrades.md` — per-run menu whose introduction is gated on the first Lvl↑ action
7. `.frames/sdlc/proposals/accepted/clout-upgrade-menu.md` — structurally deferred until first Rebrand
8. `.frames/sdlc/proposals/accepted/gigs-system.md` — timed-offer layer introduced via its own fire event

---

## Open Questions

1. **Is the anchoring voice copy one static line for all first-runs, or does it rotate from a small pool?** A rotating pool gives repeat-account players variety; a single line gives a stronger identity moment. Leaning: single line for v1, revisit if playtesting shows it getting stale. **Owner: game-designer**
2. **Should the second-platform unlock affordance look different from the generator-unlock affordance, or share the same visual language?** Affordance consistency vs. moment-differentiation. **Owner: ux-designer**
  - Answer (ux-designer): **Share the same affordance visual language.** The moment-differentiation comes from the spatial event — a new platform card appearing in a previously-one-card strip — not from button styling. Reasoning in the review log below.
3. **[RESOLVED] Does "5 minutes of cumulative play time" for the Audience Mood safety rail use wall-clock, in-game tick time, or session time?** Engineer-level distinction that affects save-file semantics. **Owner: engineer**
  - Answer (engineer): **Tick-time (cumulative active-tick ms).** Wall-clock (`Date.now() - run_start_time`) would count *offline* time — player walks away for 6 minutes, mood drag activates when they return without them having experienced anything, breaking the teaching intent. Session time resets on tab close/reopen, making the rail non-deterministic across sessions. Tick-time accurately tracks "foreground engaged time" — doesn't count offline, doesn't reset on close, persists with the save, matches the natural-language meaning of "has been playing for 5 minutes." **Cost:** one new field on `Player` (or `GameState`), e.g. `active_playtime_ms: number`, incremented by the `dtMs` the tick loop already dispatches. One line in `doTick`. Save-schema bump (V6→V7 migration initializes existing saves to 0, which correctly leaves the rail gating them for whatever remaining play time they owe). The field is independently useful for other future features (achievement timers, cooldowns) and is the correct primitive to have in the save.
4. **What is the player-visible surface, if any, for the Audience Mood safety rail?** Option A: entirely silent — mood strips simply don't appear until the rail lifts. Option B: a very subtle "learning your audience" flavor moment when the rail lifts. Leaning A (silent), but flagging. **Owner: game-designer + ux-designer**
  - Answer (ux-designer, pending game-designer concurrence): **Option A — silent.** Aligns with the proposal's own teaching philosophy (§1 "no first-run-only copy beyond the one anchoring line"). The mood strip's first appearance on a platform card IS the teaching moment; adding flavor copy explains something that should be discovered. Reasoning in the review log below.
5. **[RESOLVED] Is the first-shift tightened variance (±30s) implementation-cheap, or does it require a special first-run branch in the seed logic?** Implementation cost may push this to "just accept ±1min and let the seed roll." **Owner: engineer**
  - Answer (engineer): **Cheap. ~10–15 lines, no save-schema change, determinism preserved.** `getShiftAtIndex` in `client/src/algorithm/index.ts:61` computes duration as `baseIntervalMs + (durationRng.value * 2 - 1) * varianceMs`. Thread an `isFirstRun` flag (derived at the call site from `player.rebrand_count === 0`) into `getShiftAtIndex`, and when `shiftIndex === 1 && isFirstRun`, override `varianceMs` with a new `firstRunVarianceMs: 30_000` field on `algorithmSchedule`. The PRNG walk is unchanged — still 2 values consumed per shift, same seed-derivation — only the duration-mapping denominator changes. Callers (`advanceAlgorithm`, `getUpcomingShifts`) already have game state in scope. `algorithmSchedule` gains one optional field — additive, no migration. The `rebrand_count === 0` gate is exactly "first run of the save" per the proposal's intent; post-rebrand runs roll normal variance. No reason to fall back to the "just accept ±1min" option — ship the tightened variance.

---
# Review: engineer

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

Both engineer-owned questions resolved inline at Open Questions 3 and 5. Summary below, plus two non-blocking scope notes surfaced during the code inspection.

**Q3 (play-time semantics).** Tick-time (`active_playtime_ms` incremented per `dtMs` in `doTick`). Rationale and cost written inline. This is the only option of the three that survives the offline/close/reopen cases honestly — wall-clock counts offline time as play, session time is non-deterministic across closures.

**Q5 (first-shift ±30s variance).** Cheap. One new optional field on `algorithmSchedule`, a `rebrand_count === 0` gate threaded through two call sites. Determinism preserved; no save-schema change. Ship the tightened variance.

**Scope note 1 — §5.2 starter state pin is not already implemented.** The proposal says "fresh saves begin with Algorithm state = `short_form_surge`." Current code in `createInitialGameState` picks the first entry of `staticData.algorithmStates` (via `Object.keys(...)[0]`), which is whichever state happens to be listed first in static-data. If `short_form_surge` is already first in that list, this is a no-op; if not, it's a ~2-line fix (hardcode the starter state id OR reorder the list and add a test that asserts first-entry identity). This is a distinct implementation task from Q5's variance tightening — worth filing alongside, both are trivial, both sit in the same module. Flagging so the task decomposition doesn't miss it.

**Scope note 2 — Entry conditions (§4) need first-class save-state representation for several systems.** The table at §4 specifies entry conditions like "first time Lvl↑ becomes affordable" (Creator Kit menu reveal) and "player completes first Lvl↑ action." These are one-shot latches — once revealed, stays revealed. Each needs a persisted boolean (or a revealed-set) on save state so the condition doesn't re-evaluate on every load. Concretely: `ui_reveals: { creator_kit: boolean; algorithm_ui: boolean; ... }` on `GameState`, set-once in doTick or the relevant action handler, persisted across sessions. Saves initialize with all false; first time each condition trips, the flag flips and the UI reveals. Not architecturally controversial, but it's new state that doesn't exist today — flagging so build planning sizes it. A few of these might collapse into existing conditions already encoded in game state (e.g. "completed first Lvl↑ action" is equivalent to `any generator.level > 1`, which is already present — no new flag needed). I'd want to walk through the §4 table with game-designer during planning to identify which entry conditions are derivable from existing state and which need new latches.

**Removing engineer from reviewers.** ux-designer still owns Open Questions 2 and 4.

---
# Review: ux-designer

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

Strongly aligned on the overall direction — progressive affordance-driven reveal is exactly the right teaching philosophy for this game, and it compounds work already accepted (the Lvl↑ affordance-state pattern, algorithm vignette presence). Answering my two open questions and leaving two non-blocking observations.

**Q2 — Second-platform unlock affordance: share the same visual language.**

The instinct to reach for moment-differentiation here is understandable — unlocking Platform 2 is a bigger structural beat than unlocking a third generator. A whole parallel track becomes visible. That wants to feel special.

But the moment is **already carried by the spatial event**: a new platform card appearing in a previously-one-card strip. That's the theatrical beat. The platform strip grows. That's not a subtle change — a previously-empty region of the screen suddenly contains a second, distinct, platform-accented card. The player will see it. Adding bespoke button styling on top of the new-card-appearing event would compete with the spatial event for attention, not reinforce it.

There's a deeper reason too. The proposal's core teaching philosophy (§1) is that **the affordance-state pattern generalises to every system**. That only works if the pattern means the same thing everywhere it appears. If generator-unlock affordance and platform-unlock affordance look different, "unlockable" stops being a consistent visual signal — it's now a stylistic choice per-system. The player has to learn the visual language twice. That contradicts the philosophy the proposal commits to in its first paragraph.

**Direction: reuse the accepted Lvl↑ affordance-state pattern verbatim for the platform-unlock button.** The gold `ready` breathing state, the ⊖ deficit glyph for `armed`, the `dormant` dim-placeholder treatment — all of it transfers. The platform card itself provides the moment (card appears; platform-accent color band at the top identifies *which* platform; platform name reads in Fraunces per typography spec). The unlock button is just the pull-mechanism; it should feel familiar.

**One small allowance.** The platform card's top-border accent color (`--platform-accent`) can legitimately reach into the unlock button's state styling — e.g., the `ready` breathing on Platform 2's unlock button could pull from the Chirper/InstaSham/Grindset accent rather than `--accent-gold`. This preserves affordance consistency at the structural level while letting platform identity flavor the pulse. Small delta, carries the brand, doesn't break the pattern's promise. Leaving this as a refinement for the platform-unlock implementation task — not prescribing it here.

**Q4 — Audience Mood safety rail surface: Option A, silent.**

Option A, firmly. Option B ("learning your audience" flavor moment) has three failure modes:

1. **It breaks the teaching philosophy the proposal just established.** §1 says "no first-run-only copy beyond the one anchoring line." §5.1 is a first-run-only rail. Option B adds first-run-only copy for the rail. That directly weakens a principle stated 140 lines above. Either the principle holds or it doesn't — a single exception creates the precedent for more.
2. **"Learning your audience" is a confession that the training wheels were on.** Players who didn't notice the wheels suddenly know they were being managed. That's endowment in reverse — the rail, which was previously invisible and frictionless, becomes a labeled *thing the game was doing for me*, which makes the game feel more paternal, not less.
3. **The moment is already there without copy.** When the rail lifts (2+ generators, 5min tick-time), the first pressure accumulator that reaches its threshold produces a mood strip on a platform card. That strip appearing **IS** the teaching moment. The player sees a new visual element, reads retention data that was previously implicit, and connects it to the generator/platform state they've been building. No copy needed. The player discovers rather than being told.

**Direction for the mood-strip reveal itself (downstream UX spec work, flagging here):** when the FIRST mood strip ever appears on a platform card, it should enter with a small one-shot entrance animation — the kind of motion that draws the eye *without* requiring reading. A slide-in or fade-in with a subtle highlight pulse, ~400-500ms, then settles. No copy, no label, no "learning your audience" — just enough motion to ensure the player notices this thing that just appeared. That is the appropriate UX substitute for Option B's flavor moment: motion-as-teaching instead of text-as-teaching. Fits the idle-game contract and the proposal's philosophy.

**Non-blocking observation 1 — the Algorithm vignette/UI reveal cadence.**

§2 notes the vignette is ambient from t=0 while the readable Algorithm UI surfaces at ~5min (shift #1). This is good sequencing, but it creates a teaching moment that UX owns: the **first shift** is when the ambient vignette (which has been quietly present) transforms into the readable UI (state name, indicator). That transformation IS the "oh THAT'S what the vignette was" moment the proposal correctly identifies.

The UX implication: the shift #1 animation should be *more* pronounced than subsequent shifts, because it's also the introduction of the readable UI. After shift #1, subsequent shifts can animate at normal intensity — the player has a vocabulary now. Before shift #1, the vignette pulse is ambient. During shift #1, the vignette flares, the readable UI materializes, and the player stitches the two together. This is an animation-intensity delta for the first shift only, analogous to §5.4's anchoring copy delta — first-run-only theatrical amplification for a teaching moment. Not changing anything in this proposal; flagging that shift #1's animation spec is a separate UX deliverable that needs to acknowledge its dual role.

**Non-blocking observation 2 — "no first-run-only copy beyond the anchoring line" is a strong principle that should be named in §1.**

The proposal states this rule twice (§1 philosophy bullet and §7 what this leaves open). The second statement in §1 ("no first-run-only copy beyond the one anchoring line — first-run copy is a maintenance burden and a retention trap") is the load-bearing one. My Q4 answer above leans on it hard, and the engineer's §4-entry-condition scope note will lean on it too (any per-system reveal that's tempted to add copy will test this principle). Consider elevating it from a bullet inside the philosophy section to a named, bolded rule — "**Rule: No First-Run-Only Copy Beyond t=0.**" — so downstream reviewers/implementers don't have to excavate it from prose. The principle is load-bearing and deserves surface.

**Removing ux-designer from reviewers.** My Q2 and Q4 answers require no further UX input. Game-designer remains on for Q1 (anchoring copy pool vs. single line) and for concurrence on Q4's Option A landing.
