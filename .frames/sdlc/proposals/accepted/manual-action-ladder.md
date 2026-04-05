---
name: Manual Action Ladder
description: Replaces the single Post button with a ladder of content verbs (Chirp, Selfie, Livestream, …) where each verb follows a three-step lifecycle — unlock, upgrade, automate — and every verb stays permanently manual-clickable. Automators are parallel actors that press each verb on their own cooldowns, not replacements for the player's hand.
created: 2026-04-05
author: game-designer
status: implementation
reviewers: []
---

# Proposal: Manual Action Ladder

## Problem

The Post button is the player's only manual verb. It carries the entire "I am a creator" fantasy for the full session. Two problems follow:

1. **The verb goes stale.** Whatever the player's hand is doing at minute 2 is the same thing their hand is doing at minute 200. Even with rate-scaled clicks (see `proposals/draft/post-button-rate-scaled-clicks.md`) making the number meaningful late-game, the *action* never evolves. A clicker game's hero verb should feel like it matures.
2. **The economy has no "manual-tier" purchases.** The current progression model jumps straight from "you click Post" to "you buy generators that produce passively." The familiar first-tier clicker pattern — "buy a thing that makes your CLICKS worth more" — is missing. The player never gets the feeling of upgrading their own hand before they delegate to automation.

Meanwhile, the Actions Column (`proposals/accepted/actions-column.md`) has already named the left column as a class of discrete taps that grows over time. That proposal names Post as the "baseline member" but doesn't prescribe how the baseline evolves when the player progresses. This proposal fills that gap.

## Proposal

**Replace the single Post button with a Manual Action Ladder — a sequence of content verbs where each verb has a three-step lifecycle (unlock → upgrade → automate). Every unlocked verb remains permanently manual-clickable. Automators are parallel actors: they press the verb on their own internal cooldown, independently of the player, and can be upgraded separately.**

### 1. The Ladder Structure

The ladder is **5 verbs** representing content MEDIUMS the player personally performs:

**Chirp → Selfie → Livestream → Podcast → Viral Stunt**

Each rung is a distinct physical act — text, photo, video, audio, event. Chirp is unlocked from the start and inherits Post's diegetic-anchor role in the Actions column. Each subsequent rung unlocks behind an engagement or follower threshold.

The remaining generators in the roster (`memes`, `hot_takes`, `tutorials`) are **passive-only** — they do not appear in the Actions column and are not manually clickable. Narratively, they are content the player's team/audience produces *about* them; mechanically, they sit in the Upgrades column as pure passive generators, same as today. This split — "what I personally perform" (manual-clickable) vs. "what my team farms" (passive-only) — gives the player's hand a focused, teachable 5-rung ladder while preserving the economic depth of the 8-generator roster.

### 2. Per-Verb Lifecycle: Unlock → Upgrade → Automate

Every verb passes through three purchase states:

| State | Purchase | Effect |
|---|---|---|
| **Unlock** | One-time cost | Verb becomes manually clickable. A new button appears in the Actions column. |
| **Upgrade** | Multi-level cost | Per-click engagement yield increases. Levels stack. |
| **Automate** | Multi-level cost | An **automator** begins pressing this verb on its own internal cooldown timer. Each Automate level also **reduces the verb's cooldown value itself** — which is shared by both the automator and the player's manual clicks. One purchase, dual effect: passive income rises AND the player's hand gets faster on that verb. The cooldown value has a floor (~0.01s) so it never degenerates to zero. |

Upgrade and Automate are purchased in the Upgrades middle column, alongside existing generator upgrades. Unlock may live in the Actions column (a "ghost" slot the player taps to unlock) or the Upgrades column — that's a UX call (OQ6).

### 3. Verb Differentiation

Each verb has distinct mechanical properties so that every moment the player is deciding *which verb(s) to tap*:

- **Chirp** — short starting cooldown (e.g. 0.3–0.5s), low-yield per click. The rapid-fire baseline. Text medium.
- **Selfie** — medium starting cooldown (e.g. 2–3s), higher-yield per click. Requires attention. Photo medium.
- **Livestream** — long starting cooldown (e.g. 8–12s), higher-yield. A big-moment verb. Video medium.
- **Podcast** — longer-form starting cooldown (e.g. ~30s+), higher-yield still. Audio medium; commits the player to a longer-form beat.
- **Viral Stunt** — capstone cooldown (e.g. minutes), highest-yield per click. Rare event-verb; the player taps when they're "ready for a big moment."

Every verb has *some* starting cooldown so that every verb's Automate track has dual payoff (automator firing rate AND player manual rate). Cooldowns can be reduced via the verb's Automate upgrades down to the ~0.01s floor.

The skill layer: spam Chirp between Selfie cooldowns; time Livestream for maximum impact. This is the decision texture the current single-Post design lacks. Because verbs stay manual forever, this rhythm decision exists at every stage of the game — early (when few verbs exist and none are automated), mid (when the player interleaves manual clicks between running automators), and late (when the player chooses whether to add manual yield on top of fast automators, or let them run).

### 4. The Automator Is a Parallel Actor

An automator is not a replacement for the player's hand. It is a second actor pressing the same verb, on its own independent cooldown. Both contribute yield; neither interrupts the other.

Concretely: if Selfie has a 3-second cooldown and the player has bought Selfie automation level 1, then two timers run in parallel:

1. The **automator** fires Selfie every 3 seconds on its own internal timer.
2. The **player** may also tap Selfie manually, on their own separate 3-second cooldown timer — independent of the automator's cycle.

The two timers are independent, but the **cooldown value** (3s) is shared between them. When the player buys Automate level 2, the verb's cooldown drops to e.g. 2.9s, then 2.8s, ..., then 0.01s — and *both* the automator's firing rate AND the player's manual re-click window shorten together. The Automate upgrade track is the cooldown track for the verb. This is the dual payoff: upgrading Automate is felt in the player's hand, not just on the rate counter.

This preserves player agency by construction: the game never takes the verb away from the player, because automators and manual clicks occupy different timers. If a player enjoys spamming Chirp in late game, they are *allowed to*, and their clicks stack cleanly on top of automator output. Automation is a floor, not a ceiling.

The Actions column, under this model, is less a "current verb" cursor and more an **instrument panel** — every unlocked verb is always reachable, and the player chooses which to tap, when, and how often.

### 5. The Economic Decision Surface

At any moment in the ladder's middle, the player is choosing between at least four spends:

1. **Unlock the next verb** — expand the ladder (biggest change in feel)
2. **Upgrade a verb's yield** — make each click of that verb worth more (applies equally to manual clicks and automator clicks)
3. **Upgrade a verb's Automate track** — reduces the verb's shared cooldown, speeding up both the automator AND the player's manual tap rate
4. **Buy a generator / clout upgrade** (existing systems) — invest in passive infrastructure

This is a stronger decision space than the current model because it introduces a *horizontal* dimension (which verb) alongside the *vertical* dimension (how much). Within each verb, the player chooses whether to invest in yield or cadence, knowing that cadence investments pay out twice (passive rate + tactile feel in their own hand). The player is always balancing wider vs. deeper.

### 6. Relationship to the Actions Column

This proposal **extends**, not replaces, the Actions Column taxonomy. The Actions Column says the left column is a class of discrete taps with Post as the baseline and brand deals as the second member. Under this proposal:

- **Post is superseded by Chirp** as the baseline member. The "I am a creator" fantasy anchor moves from the single Post button to whatever manual verb is currently in the player's hand (Chirp early, newer verbs later).
- **Ladder verbs are a new sibling class within Actions.** They share the column's grammar (single tap, immediate effect, meaningful for life) but they unlock and evolve over time, unlike brand deals which fire episodically.
- **Brand deals remain unchanged** as an orthogonal event-driven sibling.

Both the Actions Column soft cap of 4 members and the mobile bottom-bar-anchor conventions may need revisiting as the ladder grows — flagged to ux-designer (OQ3).

### 7. Relationship to the Existing Generator / Platform / Algorithm Systems

**[RESOLVED by architect, 2026-04-05 — see review log.]** The ladder **consolidates** with the existing Generator entity: ladder verbs ARE generators, and the Actions column becomes a new view onto existing generator state rather than a new entity class. The `base_engagement_rate` field splits into `base_event_yield × base_event_rate` to decouple Upgrade (yield) from Automate (cadence) — see OQ12 resolution. Migration is backward-compatible: seed existing generators with `base_event_yield=1.0, base_event_rate=base_engagement_rate` and their effective rate is unchanged.

The discussion of options below is retained for historical context.

**Generator system collision (`generator-balance-and-algorithm-states.md` §Generator Rate Table).** The accepted generator roster is: `selfies`, `memes`, `hot_takes`, `tutorials`, `livestreams`, `podcasts`, `viral_stunts`. The user's example verbs — **Chirp, Selfie, Livestream** — directly collide with `selfies` and `livestreams`. Possible resolutions:

- **(a) Parallel systems, renamed verbs.** Keep the generator roster untouched; rename ladder verbs (e.g. Chirp, Snap, GoLive) so the two economies coexist without lexical overlap. Simplest. But players run two engagement economies side by side — conceptually heavy.
- **(b) Consolidation — verbs ARE generators.** Each ladder verb *is* a generator. "Unlock" maps to follower-threshold unlock (already in the data model). "Upgrade yield" maps to generator level-up. "Automate" maps to buying generator count. Manual click on a verb adds engagement at that generator's base rate (inheriting its algorithm modifier and platform affinity). Structurally cleanest, inherits existing balance, but rewrites how the middle column (Upgrades) and left column (Actions) relate.
- **(c) Parallel systems, keep colliding names.** Tolerate "Selfie" in the Actions column and "selfies" in the Generators list with different meanings. Confusing for players and implementers — not recommended.

**Lean: (b) consolidation.** Reasoning: the existing generator system already solves for unlock thresholds, level scaling, platform affinity, algorithm sensitivity, and follower-distribution routing. Running the ladder parallel to it would duplicate every one of those. But this is a structural refactor that reaches into data model, tick pipeline, and the middle column's identity — architect call.

**Cooldown model mismatch.** Existing generators produce continuously at `base_engagement_rate` (engagement/sec). My ladder assumes discrete-tick verbs with cooldowns (e.g. Selfie every 3s). These are different production models. Under option (b), either verb cooldowns need a new data field on Generator, or rate-based production needs to be reframed as "one event every 1/rate seconds." **Owner: architect.**

**Platform affinity (`platform-identity-and-affinity-matrix.md` §4).** Platforms boost/penalize follower gain per-generator (✓ ×1.5, – ×1.0, ✗ ×0.6). Ladder verbs need affinity assignments. Under option (b) they inherit existing generator affinities for free. Under option (a) they need their own affinity matrix (3 platforms × ~5 verbs = 15 new cells to assign). **Owner: game-designer (if (a)); auto-resolved if (b).**

**Algorithm state modifiers (`generator-balance-and-algorithm-states.md` §Algorithm States).** Each Algorithm state has a per-generator `raw_modifier` that folds with `trend_sensitivity`. Ladder verbs need trend sensitivities and per-state modifiers. Same shape as platform affinity: option (b) inherits for free; option (a) adds a new set of tunable numbers for every verb × every Algorithm state. **Owner: game-designer.**

**Current `postClick()` implementation (`client/src/game-loop/index.ts` L575–597).** Today's click uses a single hard-coded `CLICK_GENERATOR_ID = 'selfies'` for its algorithm-modifier lookup. Per-verb manual clicks will each need their own generator-id binding (under (b)) or a new per-verb trend sensitivity field (under (a)). **Owner: architect + engineer.**

### 9. Relationship to Rate-Scaled Clicks (Draft)

The draft proposal `post-button-rate-scaled-clicks.md` makes a single Post click scale with current engagement rate, solving "the verb goes inert late-game." Under the Manual Action Ladder, the problem shape shifts:

- **Newly-unlocked manual verbs** are already calibrated to matter at the progression stage where they unlock, so rate-scaling may be unnecessary *for the current top rung*.
- **Older verbs** that the player may still manually click, even once automated, risk going inert in the same way Post does today. Rate-scaling (or another mechanism) may still be needed *for those*.

The two proposals are not mutually exclusive, but the Manual Action Ladder may supersede the motivating problem of rate-scaled clicks for the top rung. Resolution flagged as OQ7.

### 10. Player Psychology & Aesthetic

- **Target feeling:** "I am conducting an orchestra of content — and every upgrade I buy, I feel in my own hand." The Actions column grows into an instrument panel — every verb the player has ever unlocked is still in their hand, and each verb's cadence gets tangibly faster as the player invests in it. A freshly-upgraded Selfie rewards the tapping hand directly; the tactile acceleration is the receipt for the purchase. Early game, the player plays one instrument loudly. Mid-game, automators form an ambient rhythm section while the player adds layered manual taps on whichever verbs they feel like playing. Late game, the player is orchestrating a stack of parallel automators AND choosing which verbs their hand enriches further. This mirrors real creator-economy progression — every format a creator has ever adopted is still available to them; they add new formats without abandoning old ones.
- **Intrinsic motivation:** Strongly reinforced. Every new verb is a skill-reset — the player relearns rhythm, timing, and yield each rung. The core loop never stops teaching.
- **Endowment effect:** Each verb is earned three times (unlock, upgrade, automate), so the player's sense of ownership over the ladder compounds. Automating a verb feels like graduation, not retirement.
- **Loss aversion:** Not touched — this system has no loss state. (Ladder interactions with scandal-class loss systems are out of scope.)
- **Variable ratio risk:** None added. All three purchase thresholds are deterministic.

### 11. Engagement Line Check

1. **Is this mechanic honest?** Yes — every verb does what it says, every purchase has a visible effect, every click produces a visible result.
2. **Can the player quit without loss?** Yes — the ladder has no decay, no penalty for absence, no FOMO mechanics.
3. **Is progression tied to skill/engagement, or just time?** Both, correctly: engagement scales with hand-speed and attention during manual phases; time still matters because automation accumulates offline. Engaged players progress faster without locking out idle players.

No concerns.

### 12. What This Locks In

- The Actions Column starts with Chirp, not Post.
- **The ladder is 5 verbs: `chirps → selfies → livestreams → podcasts → viral_stunts`** (OQ14 resolved). Content mediums the player personally performs. Chirp is unlocked at 0.
- **3 generators are passive-only and do not appear in the Actions column:** `memes`, `hot_takes`, `tutorials`. They remain purchased in the Upgrades column as pure passive generators, unchanged from today.
- **`GeneratorDef.manual_clickable: boolean` flag** distinguishes ladder verbs (true: 5 entries) from passive-only generators (false: 3 entries). The Actions column view filters to `manual_clickable: true`. `postClick(verbId)` only accepts verbIds where the generator is manual_clickable.
- **Full roster grows from 7 to 8 generators** by adding `chirps` at position 0. Existing 7 retain identities, unlock thresholds, balance tuning, and platform affinities unchanged. Only chirps needs net-new balance + affinity cells.
- **Unlock-purchase cost reuses `base_buy_cost`** (no new data-model field). Each ladder verb's Unlock costs `base_buy_cost` engagement; first Automate purchase (count 0→1) costs the same; total onramp per verb is `2 × base_buy_cost`. Threshold unit is **total_followers**, consistent with existing code.
- Manual verbs follow a three-state lifecycle: unlock, upgrade, automate.
- **Ladder verbs ARE generators** (OQ11 resolved). The Actions column is a view onto the existing Generator entity; no new entity class.
- **`base_engagement_rate` splits into `base_event_yield × base_event_rate`** (OQ12 resolved). Upgrade scales yield via `level_multiplier(level)`; Automate scales rate via `count`. For the 3 passive-only generators (memes, hot_takes, tutorials): seed `base_event_yield=1.0`, `base_event_rate=<old base_rate>` (backward-compatible). For the 5 ladder verbs: split chosen so pre-Automate manual cooldown matches §3 targets while preserving passive-economy output; exact values in §14a/b.
- Every unlocked verb remains permanently manual-clickable — no button is ever retired.
- Automators are parallel actors with their own independent cooldown timers; manual and auto stack by construction.
- **Manual-tap cooldown is a derived view:** `cooldown_manual = 1 / (max(1, count) × base_event_rate)`. The `max(1, count)` floor models the player's own hand as the first actor on every unlocked verb, so manual cooldown is defined from the moment of Unlock (pre-Automate). Upgrading Automate (count) shrinks the manual cooldown; first Automate level halves it. Cooldown floor is ~0.01s.
- **The `max(1, count)` floor is scoped to manual-cooldown derivation ONLY.** The passive-rate tick formula stays unfloored — `effective_rate = count × base_event_rate × base_event_yield × level_multiplier × algoMod × clout × kit`. Floor at `postClick`'s cooldown gate and any manual-cooldown display; NO floor at `computeGeneratorEffectiveRate`. Otherwise count=0 generators would spuriously produce 1-actor-worth of passive output.
- **Per-manual-tap earned formula:** `earned = base_event_yield × level_multiplier(level) × algoMod × clout_bonus × kit_bonus`. No platform-affinity term at tap time — platform routing applies downstream at `computeFollowerDistribution`. Symmetric with passive generator treatment.
- **Cooldown gate signature:** `postClick` rejects when `now - (state.player.last_manual_click_at[verbId] ?? 0) < cooldownMs`. The `?? 0` makes "never clicked" explicit.
- Every verb starts with some cooldown so that every verb's Automate track has dual payoff (passive rate + manual tap rate).
- Verbs are differentiated by starting yield and starting cooldown, not reskinned.
- `postClick()` becomes `postClick(state, staticData, verbId)`; new `Player.last_manual_click_at: Record<GeneratorId, timestamp>` field gates per-verb manual cooldowns.

### 13. What This Leaves Open

**Nothing structural.** All OQs are resolved. Balance cells are locked in §14 below. Only post-playtest fine-tuning remains — flag-and-adjust per the accepted generator-balance-and-algorithm-states.md's "design targets, not sacred numbers" discipline.

### 14. Balance Cells

All values below are the design target. Engineer implements these as the seeded static-data for the refactor. Playtest-driven fine-tuning may adjust them, but the structural relationships (yield × rate = preserved passive output; cooldown = `1/(max(1,count) × base_event_rate)`) are fixed.

#### 14a. Yield/Rate Split — 5 Ladder Verbs

The split is chosen so each ladder verb's **pre-Automate manual cooldown** matches §3's design target, while **`base_event_yield × base_event_rate` equals the verb's old `base_rate`** — preserving passive-economy output unchanged.

| Verb | Cooldown target (count=0) | `base_event_rate` | `base_event_yield` | Passive at count=1, level=1 |
|---|---|---|---|---|
| chirps | 0.4s | 2.5 | 1 | 2.5 eng/sec *(new generator)* |
| selfies | 2.5s | 0.4 | 2.5 | 1.0 eng/sec *(preserved from old base_rate)* |
| livestreams | 10s | 0.1 | 800 | 80 eng/sec *(preserved)* |
| podcasts | 30s | 0.033 | 4,545 | 150 eng/sec *(preserved)* |
| viral_stunts | 120s | 0.0083 | 60,240 | 500 eng/sec *(preserved)* |

#### 14b. Passive-Only Generators — Seeded Split (Unchanged)

Not manual-clickable, so base_event_rate doesn't need to meet a cooldown target. Seeded per architect's backward-compatible migration.

| Generator | `base_event_rate` | `base_event_yield` | Passive at count=1, level=1 |
|---|---|---|---|
| memes | 5.0 | 1 | 5.0 eng/sec *(preserved)* |
| hot_takes | 12.0 | 1 | 12.0 eng/sec *(preserved)* |
| tutorials | 30.0 | 1 | 30.0 eng/sec *(preserved)* |

#### 14c. Chirps — Net-New Balance Cells

| Cell | Value |
|---|---|
| `unlock_threshold` | 0 |
| `base_event_rate` | 2.5 |
| `base_event_yield` | 1 |
| `fcr` (follower conversion rate) | 0.07 |
| `trend_sensitivity` | 0.7 |
| `base_buy_cost` | 2 |
| `base_upgrade_cost` | 20 |
| `manual_clickable` | `true` |

**Chirps algorithm-state modifiers:**

| State | Raw modifier | Effective at ts=0.7 |
|---|---|---|
| short_form_surge | 1.7 | +49% |
| authenticity_era | 0.8 | −14% |
| engagement_bait | 1.5 | +35% |
| nostalgia_wave | 1.0 | 0% |
| corporate_takeover | 0.7 | −21% |

**Chirps platform affinity row:** Skroll ✓×1.5 (tweet-native), Instasham –×1.0 (neutral), Grindset ✗×0.6 (too ephemeral for long-form platform).

#### 14d. Unlock Thresholds (OQ5 Resolution)

**Threshold unit: total followers** (not engagement). `unlock_threshold` reads against `player.total_followers` per the existing code semantics (`generator/index.ts` checkGeneratorUnlocks, `types.ts` GeneratorDef). No code-path change — the existing gate carries forward unchanged for ladder verbs and passive-only generators alike.

Only one change from the accepted generator-balance spec: **selfies moves from 0 → 100** because chirps now holds the threshold=0 starter position. All other thresholds carry over unchanged.

| Generator | unlock_threshold (followers) | Surface |
|---|---|---|
| chirps | 0 | Actions (starter, unlocked by default) |
| memes | 50 | Upgrades (passive-only) — *unchanged* |
| selfies | **100** | Actions (ladder Unlock purchase) — **NEW** |
| hot_takes | 200 | Upgrades (passive-only) — *unchanged* |
| tutorials | 1,000 | Upgrades (passive-only) — *unchanged* |
| livestreams | 5,000 | Actions (ladder Unlock) — *unchanged* |
| podcasts | 20,000 | Actions (ladder Unlock) — *unchanged* |
| viral_stunts | 100,000 | Actions (ladder Unlock) — *unchanged* |

For manual_clickable generators the threshold gates both the Actions column ghost-slot reveal AND the Unlock purchase. For passive-only generators it gates visibility in the Upgrades column as today.

**Pacing note:** at chirps' early-game rate (yield=1, base_event_rate=2.5, fcr=0.07), pure manual tapping converts to ~0.175 followers/sec, so Selfies' 100-follower threshold would take ~10 minutes of manual tapping alone. In practice the player buys chirps automators along the way (first automator at base_buy_cost=2 engagement, trivially affordable) and memes (50-follower threshold, passive-only) unlocks around minute 3-5 to keep progression density healthy. Selfies typically unlocks in the 5-10 minute range. Post-playtest retune if pacing feels off.

#### 14d-i. Unlock Purchase Cost

Each ladder verb's Unlock purchase (the one-time cost to move from ghost-slot → manual-clickable, per §2's lifecycle table) **reuses the generator's existing `base_buy_cost` value** — no new data-model field. Semantics: player pays `base_buy_cost` engagement to Unlock (enable manual tapping) and pays the same amount again for the first Automate purchase (count: 0 → 1, cost = `base_buy_cost × 1.15^0`). Total onramp per ladder verb: `2 × base_buy_cost`.

| Verb | Unlock cost (engagement) | First Automate cost (engagement) |
|---|---|---|
| chirps | *(n/a — unlocked by default)* | 2 |
| selfies | 10 | 10 |
| livestreams | 130,000 | 130,000 |
| podcasts | 1,400,000 | 1,400,000 |
| viral_stunts | 20,000,000 | 20,000,000 |

Chirps has no Unlock step — it is the starter, available from the first frame. Its `base_buy_cost=2` is solely the first-automator cost.

Doubling the onramp cost per ladder verb is inside the existing cost curve: at each verb's follower threshold the player's engagement balance is comfortably above `2 × base_buy_cost` (e.g., Selfies unlocks at 100 followers, by which time the player has earned far more than 20 engagement).

#### 14e. Automation Curve (OQ2 Resolution)

Automation = `count` purchases. Cost follows the existing accepted formula `ceil(base_buy_cost × 1.15^count_owned)` unchanged. No new curve. The manual-cooldown rate-reduction emerges from the derived-view formula `cooldown = 1/(max(1,count) × base_event_rate)`:

| Verb | count=1 | count=10 | count=100 | Floor reached at count |
|---|---|---|---|---|
| chirps | 0.4s | 0.04s | 0.01s (floor) | 40 |
| selfies | 2.5s | 0.25s | 0.025s | 250 |
| livestreams | 10s | 1s | 0.1s | 1,000 |
| podcasts | 30s | 3s | 0.3s | 3,030 |
| viral_stunts | 120s | 12s | 1.2s | 12,048 |

#### 14f. Manual-Supplementary Ratio at the Cooldown Floor (OQ15 Resolution)

At the 0.01s cooldown floor, max human tap = 100/sec and passive throughput scales linearly with count. The 10% ceiling (manual ≤ 10% passive) emerges naturally from the cooldown floor + yield-preserving split — **no separate per-verb yield tuning needed**. The ratio is `100 / (N × base_event_rate)`:

| Verb | Count N at which manual = passive (1:1) | Count N at which manual = 10% of passive |
|---|---|---|
| chirps | 40 | 400 |
| selfies | 250 | 2,500 |
| livestreams | 1,000 | 10,000 |
| podcasts | 3,030 | 30,303 |
| viral_stunts | 12,048 | 120,482 |

Nice gradient by design: early verbs fade to supplementary quickly (chirps at count=4 is already 10% of automator throughput pre-floor); late verbs stay manually meaningful deep into endgame. The player's hand focus naturally migrates up the ladder over time.

## Supersession Notes

This proposal modifies or extends several accepted decisions. On acceptance, the cited sections should be updated in place with a reference back to this proposal.

1. **`actions-column.md` §2 "Post Is the Baseline Member"** — the baseline Actions member is no longer Post; it is Chirp, the first rung of the ladder. The "always available" and "diegetic anchor" properties transfer to Chirp.
2. **`generator-balance-and-algorithm-states.md` §Manual Click Value** — the flat `CLICK_BASE_ENGAGEMENT = 1.0` assumption does not survive. Manual click value becomes per-verb, each calibrated to the verb's yield. The spirit of "generators take over" is modified: automators take over *per verb*, while the player's hand retains meaningful contribution via any verb it chooses to tap.
3. **`core-game-identity-and-loop.md` §2 Core Loop** — the "Click to post. Watch likes come in. Buy your first auto-poster." early-game beat is extended: the "auto-poster" becomes a per-verb automator, and the "click to post" becomes a rotating ladder of click verbs.
4. **Possible:** `post-button-rate-scaled-clicks.md` (draft, unaccepted) may be superseded depending on OQ7 resolution.

## References

1. `.frames/sdlc/proposals/accepted/actions-column.md` §2, §5 — baseline member (superseded) and "future actions plug into this column" discipline constraint (preserved)
2. `.frames/sdlc/proposals/accepted/core-game-identity-and-loop.md` §1 fantasy, §2 core loop, §3 generators, §6 economy — full game-identity context
3. `.frames/sdlc/proposals/accepted/generator-balance-and-algorithm-states.md` §Generator Rate Table, §Algorithm States, §Manual Click Value — generator roster, per-state modifiers, and the CLICK_BASE_ENGAGEMENT assumption this proposal modifies
4. `.frames/sdlc/proposals/accepted/brand-deal-boost.md` §1, §5 — orthogonal Actions-column sibling; agency framing (passive peak vs. active peak); unchanged
5. `.frames/sdlc/proposals/draft/post-button-rate-scaled-clicks.md` — may be superseded or composed with; see §9 and OQ7
6. `.frames/sdlc/proposals/draft/platform-identity-and-affinity-matrix.md` §4 affinity matrix — per-generator platform affinity that ladder verbs must plug into under §7
7. `client/src/game-loop/index.ts` L55 (`CLICK_BASE_ENGAGEMENT`), L62 (`CLICK_GENERATOR_ID = 'selfies'`), L575–597 (`postClick()`) — current manual-click implementation sites the ladder refactors

## Open Questions

1. ~~**Do manual clicks on an automated verb stack with the auto-tick, or share its cooldown?**~~ **[RESOLVED — game-designer, 2026-04-05]** Stack, by architecture. The automator is a parallel actor with its own independent cooldown; manual clicks run on the player's own cooldown (or on no cooldown, for verbs like Chirp). The two never share a timer. See §4.

2. ~~**How many automation levels per verb, and what is the tick-interval progression?**~~ **[RESOLVED — game-designer, 2026-04-05]** Automation = `count` purchases, using the existing cost formula `ceil(base_buy_cost × 1.15^count_owned)` unchanged from the accepted generator-balance spec. Cooldown rate-reduction emerges naturally from `1/(max(1,count) × base_event_rate)` — each count purchase proportionally shrinks both automator-firing and manual-tap cooldowns. No net-new tuning curve. Progression table and per-verb floor-reached counts locked in §14e.

3. ~~**Does the Actions Column soft cap (4 members) need to change?**~~ **[RESOLVED — ux-designer, 2026-04-05]** Soft cap of 4 stands; internal scroll at 5+. Auto-compacting automated verbs rejected (contradicts §3's interleaved-tapping intent; 40px violates 44px iOS minimum + 80px floor from `actions-column.md` OQ4). Refinement added: **spotlight slot (sticky top)** pins the most-recently-unlocked verb to the top of the scroll region (desktop) / bottom-anchor position (mobile), carrying the progression signal. Instrument-panel aesthetic holds at 5+ tap targets because hierarchy comes from motion/recency/touch, not equal-weight scanning. See ux-designer's review.

4. ~~**Are verbs coupled to platforms, or platform-agnostic?**~~ **[RESOLVED — game-designer, 2026-04-05]** Verbs inherit platform affinity from the existing content-affinity matrix (`platform-identity-and-affinity-matrix.md`). Selfies/Livestreams/Podcasts/Viral Stunts already have affinity cells authored under today's roster — those cells carry over unchanged. **Only `chirps` needs net-new affinity cells:** high on Skroll (✓×1.5 — tweet-native), neutral on Instasham (–×1.0), low on Grindset (✗×0.6 — short-form text plays poorly on long-form platform). The affinity matrix remains the single source of truth for platform routing and applies at `computeFollowerDistribution` only, not at `postClick` tap time (per OQ17). **Note:** the naming mismatch "Chirp-on-Chirper vs. Chirp-on-Skroll" is resolved in-fiction by letting Chirper *be* Skroll's in-game name — or by making Skroll the platform and Chirp just the verb-name for the text medium on it. Final platform-name alignment is deferred to the platform-proposal's acceptance pass.

5. ~~**What unlock-threshold formula scales across the full ladder?**~~ **[RESOLVED — game-designer, 2026-04-05; refined 2026-04-05 post-#115]** **Follower-based thresholds** (existing code semantic, unchanged — `unlock_threshold` reads against `player.total_followers`). Only one change from the accepted thresholds: **selfies moves from 0 → 100** because chirps now holds the threshold=0 starter position. All other ladder thresholds (livestreams 5_000, podcasts 20_000, viral_stunts 100_000) and passive-only thresholds (memes 50, hot_takes 200, tutorials 1_000) carry over unchanged. Threshold gates both ghost-slot reveal AND Unlock purchase for ladder verbs. Full table + pacing note in §14d. Unlock-purchase cost reuses `base_buy_cost` (see §14d-i).

6. ~~**Where does the Unlock purchase surface live?**~~ **[RESOLVED — ux-designer, 2026-04-05]** Actions column **ghost slot** (option a). Zero-tutorial, diegetic, Cookie-Clicker-proven. Spec: one ghost slot at a time (next verb in sequence), silhouette icon + unlock-condition text, 0.35 opacity, 60px height (shorter than 80px live-verb height — a promise, not an instrument), not tappable until condition met; on condition-met the slot opacifies and becomes tappable. Density stays within soft cap. Mobile: ghost sits directly above the bottom-anchor verb. See ux-designer's review; full anatomy in follow-up UX ladder spec.

7. ~~**Does this supersede `post-button-rate-scaled-clicks.md`, or compose with it?**~~ **[RESOLVED — game-designer + architect, 2026-04-05]** **Option (b): supersede.** The ladder's fresh-calibration-per-verb story substantively solves what rate-scaled-clicks was reaching for: every verb the player taps is individually calibrated against its own Automate throughput, so "my click is meaningful" is already structural, not bolted-on. Options (a)/(c) would introduce ladder-rank as a load-bearing input to `postClick` (per architect's cost assessment: "apply rate-scaling only to non-top-rung" couples click-time logic to ladder ordering). Option (b) is zero structural cost and narrative-coherent: every verb is a live instrument, not a decaying one. **Action on acceptance:** mark `post-button-rate-scaled-clicks.md` as superseded-by this proposal.

8. ~~**How does this land against the `generator-balance-and-algorithm-states.md` §Manual Click Value directive?**~~ **[RESOLVED — architect, 2026-04-05]** Defensible supersession. The flat `CLICK_BASE_ENGAGEMENT = 1.0` is subsumed by per-verb `base_event_yield`. At the 0.01s cooldown floor, human peak tap rate (~10/sec) is bounded at <10% of automator throughput (~100/sec), so "automators take over *per verb*" holds numerically. Revised balance target — "automators take over per verb; manual hands stay meaningfully supplementary at every rung" — is architecturally sound. See architect's review for full reasoning.

9. ~~**How does this interact with offline progression?**~~ **[RESOLVED by corollary — architect, 2026-04-05]** No new offline machinery required. Because the `max(1, count)` floor is scoped to manual-cooldown derivation only (per OQ16), the passive tick formula is unfloored: automated verbs (count≥1) produce offline through the existing passive-rate pipeline; manual-only verbs (count=0) produce nothing offline because the tick has no floor and the player's hand is not tapping while away. Natural-incentive semantics ("automate before logging off") emerge for free from the floor's scoping. Game-designer accepts.

10. ~~**Is there a separate Upgrade path for manual cooldown, or does Upgrade only affect yield-per-click?**~~ **[RESOLVED — game-designer, 2026-04-05]** No separate manual-cadence path. The Automate track *is* the cooldown track: each Automate level reduces the verb's shared cooldown, which applies to both the automator's timer and the player's manual tap rate. One purchase, dual payoff. See §2, §4.

11. ~~**[LOAD-BEARING] Does the ladder run PARALLEL to the existing 7-generator roster, or CONSOLIDATE with it?**~~ **[RESOLVED — architect, 2026-04-05]** **Consolidate (option b).** Ladder verbs ARE generators. The Actions column becomes a new *view* onto the existing Generator entity, not a new entity class. The existing 7-generator roster absorbs the ladder's verbs by renaming/reusing entries rather than duplicating the data model. Parallel systems would be a shared-state-in-two-places antipattern — rejected. See architect's review for full reasoning.

12. ~~**How does the cooldown production model resolve against the existing continuous-rate generator model?**~~ **[RESOLVED — architect, 2026-04-05]** **Split `base_engagement_rate` into `base_event_yield × base_event_rate`.** Yield (engagement per event) scales with `level_multiplier(level)` → Upgrade track. Rate (events/sec) scales with `count` → Automate track. Mathematically identical to today's formula (`count × base_event_rate × base_event_yield × level_multiplier × algorithm_modifier × clout_bonus`). Backward-compatible migration: seed existing generators with `base_event_yield=1.0, base_event_rate=base_engagement_rate`. Displayed cooldown = `1 / (count × base_event_rate)` — a derived view, not a new production mode. Continuous-rate semantics preserved end-to-end; no tick-pipeline changes required. See architect's review for full reasoning and the new `last_manual_click_at: Record<GeneratorId, timestamp>` Player field.

13. ~~**Per-verb algorithm-modifier binding.**~~ **[RESOLVED — architect, 2026-04-05]** `postClick()` takes `verbId: GeneratorId` as a parameter. Delete the `CLICK_GENERATOR_ID` and `CLICK_BASE_ENGAGEMENT` constants; look up the verb's generator def for yield, trend_sensitivity, and state_modifiers. Add a per-verb cooldown gate: reject if `now - state.player.last_manual_click_at[verbId] < 1 / (genState.count × def.base_event_rate)`. Under consolidation, every verb-as-generator already has trend_sensitivity and state_modifiers — no new balance cells for algorithm binding. See architect's review for the 5-step refactor spec.

14. ~~**Verb-to-generator roster mapping.**~~ **[RESOLVED — game-designer, 2026-04-05]** **5-verb ladder, 3 passive-only generators.** The Actions column exposes a focused ladder of 5 content-medium verbs representing what the player personally performs; the remaining generators stay passive-only behind the scenes.

    **Ladder (manual-clickable): `chirps → selfies → livestreams → podcasts → viral_stunts`** — content mediums (text, photo, video, audio, event) the player physically performs. Each goes through Unlock → Upgrade → Automate. Each appears in the Actions column.

    **Passive-only (not in Actions column): `memes`, `hot_takes`, `tutorials`** — content styles (remix, opinion, how-to) the player's team/audience produces. Narratively: content the audience makes *about* the player, or that the player's team farms. Mechanically: purchased in Upgrades column as pure passive generators, same as today. Unchanged balance tuning.

    **Chirps is net-new.** Added at position 0 of the roster, unlocked at engagement 0. Freshly calibrated per §3 (short cooldown 0.3–0.5s, low per-tap yield). Platform affinity: high on Skroll (Twitter analog), low on Instasham/Grindset.

    **Full roster (8 generators): `chirps, selfies, memes, hot_takes, tutorials, livestreams, podcasts, viral_stunts`.** The existing 7 keep their identities, unlock thresholds, balance tuning, and platform affinities unchanged. The roster grows by one entry (chirps). Selfies' role shifts from "first generator" to "first unlockable ladder rung after Chirp."

    **Implementation implication:** new `manual_clickable: boolean` field on `GeneratorDef`. Actions column view filters to `manual_clickable: true`. `postClick(verbId)` only accepts verbIds where the generator is manual_clickable; passive-only generators are not valid verb dispatch targets. No other architecture changes. See §12 for the locked-in spec.

    **Rationale:** (a) 5 ladder rungs is teachable — each verb has room to feel distinct before the next arrives; 8 would crowd intermediate verbs. (b) "What I personally perform" vs. "what my team produces for me" is a clean narrative split honest to the social-media-fame fiction. (c) Actions column stays within soft-cap-4 range most of the session (5 live-verb slots + 1 ghost kicks internal scroll only at ladder-complete). (d) Late-game depth comes from Podcasts/Viral Stunts' long automation curves, not from more new-verb unlocks.

15. ~~**`base_event_yield` tuning to preserve "meaningfully supplementary" feel.**~~ **[RESOLVED — game-designer, 2026-04-05]** The 10%-ceiling emerges structurally from the cooldown-floor + yield-preserving split; **no separate per-verb yield tuning is needed**. At the 0.01s cooldown floor, manual output = 100 × yield, passive output = N × rate × yield, so the ratio is `100 / (N × base_event_rate)` — pure function of base_event_rate and count, yield cancels out. This produces a deliberate gradient: chirps fade to supplementary at count=4 (very early); viral_stunts stay manually meaningful until count=1,200+ (super-endgame). The player's hand focus naturally migrates up the ladder over time, matching §10's "orchestra of content" target. Full ratio table in §14f. Post-playtest number-legibility tuning (e.g., is "60,240 per Viral Stunt tap" readable?) is legitimate playtest-pass work, not a pre-acceptance concern.

16. ~~**Cooldown is undefined at `count === 0` (pre-Automate).**~~ **[RESOLVED — game-designer, 2026-04-05, pending architect sign-off]** The derived formula `cooldown = 1 / (count × base_event_rate)` is undefined for a freshly-unlocked verb that has not yet been Automated (count = 0 → Infinity cooldown → verb is uncliсkable), which contradicts §3's "short starting cooldown" requirement. **Resolution: phantom-hand floor — `cooldown = 1 / (max(1, count) × base_event_rate)`** (engineer's option ii). Pre-Automate, the player's own hand *is* the single actor firing the verb, so the formula correctly models "one actor's worth" of firing rate. Post-Automate, each purchased `count` adds a parallel automator and cooldown divides proportionally — first Automate level halves the cooldown, exactly matching §4's "you feel the Automate upgrade in your own hand" dual-payoff. Preserves the architect's derived-view principle (one-line formula change, no new fields, no mode-switch). Rejected alternatives: (i) seeding count=1 at Unlock conflates the Unlock and Automate lifecycle steps and breaks the teaching clarity that "Automate is when the first non-player actor shows up"; (iii) a separate `base_manual_cooldown` field violates "cooldown is a derived view." **Architect: please sign off on the formula change.**

17. **Does `postClick` apply platform affinity at click time?** Engineer's non-blocking flag #1 from the implementation review: today's `postClick` adds flat engagement, and platform affinity enters only at the follower-distribution stage (`computeFollowerDistribution` in `platform/index.ts`). Architect's earned-formula includes `× platform_affinity_if_applicable`, which is ambiguous for manual clicks. **Game-designer resolution: no platform affinity at click time.** Manual taps add flat engagement per verb; platform routing happens downstream at the existing engagement→distribution split. Reasoning: (a) the player is tapping a content *verb*, not targeting a *platform* — the verb's yield is its own identity, independent of which platform harvests the followers; (b) introducing per-platform multipliers at tap time would force the player to mentally optimize "which verb is Skroll-hot right now" during every tap, which pulls focus from the rhythm-based "conductor" fantasy (§10); (c) preserving today's engagement→distribution split keeps the ladder orthogonal to the platform matrix (no coupling cost). **Owner: architect** (confirm this preserves the intent of the earned-formula).

---
## Revision: 2026-04-05 — game-designer (task #115 — Unlock-phase balance gap fixes, post-acceptance)

Two balance/data gaps surfaced during architect's planning of #114 that the original balance pass missed. Resolved both:

**Q1 — Threshold unit:** was slipped as "engagement" in OQ5's rationale text; actually **follower-based**, matching the existing code semantic (`generator/index.ts` checkGeneratorUnlocks reads unlock_threshold against player.total_followers). Numbers in §14d table were already correct; only the rationale text needed fixing. §14d updated with explicit "follower-based" callout + pacing note against followers instead of engagement. OQ5's resolution text corrected in place with a refined-post-#115 marker.

**Q2 — Unlock-purchase cost:** added new subsection §14d-i naming the resolution: **reuse `base_buy_cost` as the Unlock cost** (no new data-model field). Unlock cost = first Automate cost per verb = `base_buy_cost`. Total onramp per ladder verb: `2 × base_buy_cost`. Existing base_buy_cost values (selfies 10, livestreams 130k, podcasts 1.4M, viral_stunts 20M) carry over as Unlock costs. Chirps has no Unlock step (starter, threshold=0); its base_buy_cost=2 is solely the first-automator cost. §12 updated with the unlock-cost reuse + threshold unit explicit.

These resolutions unblock engineer task E3 (lifecycle-expansion). E2 (engine-refactor) was never blocked.

---
## Revision: 2026-04-05 — game-designer (balance pass — OQ2/OQ5/OQ15 + chirps cells)

Balance pass complete. Key finding: the yield/rate split is load-bearing for manual cooldowns — a naive backward-compat seed (`base_event_yield=1.0, base_event_rate=old_base_rate`) produces sub-millisecond cooldowns on livestreams/podcasts/viral_stunts, breaking §3's "big moment verb" intent. Resolution: re-split base_event_rate to hit §3 cooldown targets per ladder verb, compensating yield so passive output is preserved. Added §14 "Balance Cells" with 6 subsections: (a) yield/rate split for 5 ladder verbs, (b) seeded split for 3 passive-only generators, (c) chirps net-new cells (all fields), (d) unlock thresholds (selfies 0 → 100 is the only change), (e) automation curve table derived from existing cost formula, (f) manual-supplementary ratio table showing the 10% ceiling emerges structurally. OQ2/OQ5/OQ15 resolved with pointers to §14. OQ2 & OQ15 resolve structurally (no net-new tuning needed). OQ5 resolves with minimal change (one threshold). §12 updated with the split locked in. §13 now says "nothing structural open" — only post-playtest fine-tuning remains, per the "design targets, not sacred numbers" discipline inherited from generator-balance-and-algorithm-states.md. All 17 OQs resolved.

---
## Revision: 2026-04-05 — game-designer (OQ14 + OQ4 resolution)

Locked the ladder roster at 5 verbs: `chirps → selfies → livestreams → podcasts → viral_stunts`. `memes`/`hot_takes`/`tutorials` become passive-only generators (still in the roster, not in the Actions column). Narrative framing: "what I personally perform" (manual-clickable) vs. "what my team produces for me" (passive-only). Keeps the ladder teachable at 5 rungs and keeps the Actions column within the soft-cap-4 + spotlight-slot visual discipline through most of the session. §1 rewritten to name the 5-verb ladder explicitly and describe the split. §3 extended with Podcast + Viral Stunt differentiation. §12 locked in: new `GeneratorDef.manual_clickable: boolean` flag, roster grows 7→8 (chirps at position 0, existing 7 unchanged). OQ14 resolved with full rationale. OQ4 resolved: existing affinity cells carry over for the 4 existing ladder verbs; chirps gets net-new cells (✓Skroll, –Instasham, ✗Grindset). §13 trimmed — only balance-pass tuning remains open (OQ2, OQ5, OQ15, chirps balance cells). All structural decisions are now locked.

---
## Revision: 2026-04-05 — game-designer (post-architect-re-review)

Integrated architect's re-review (OQ16 + OQ17 approved). Key additions: (a) §12 now explicitly scopes the `max(1, count)` floor to **manual-cooldown derivation only** — passive-rate tick formula stays unfloored, preventing silent balance regression on existing count=0 generators; (b) §12 adds the corrected earned-formula (no platform-affinity term) and the `?? 0` cooldown-gate guard; (c) OQ9 (offline progression) closed as resolved-by-corollary of OQ16's floor-scoping — no new offline machinery required; (d) OQ3 and OQ6 marked resolved from the ux-designer review (soft cap + spotlight slot refinement; ghost slot for Unlock purchase); (e) OQ7 resolved as supersession of `post-button-rate-scaled-clicks.md` (option b) — ladder's fresh-calibration-per-verb substantively solves the decay problem rate-scaled-clicks was reaching for, with zero structural coupling cost. §13 updated: trimmed resolved items, restored OQ2 (per-verb automation tuning curve). Remaining open: OQ2, OQ4, OQ5, OQ14, OQ15 — all game-designer-owned balance/naming decisions.

---
## Revision: 2026-04-05 — game-designer (post-engineer-review)

Integrated engineer's OQ16 (count=0 cooldown-undefined gap) and non-blocking platform-affinity flag. OQ16 resolved with engineer's recommended **phantom-hand floor** — `cooldown = 1 / (max(1, count) × base_event_rate)` — pending architect sign-off. OQ17 added and resolved from the game-designer side: `postClick` does NOT apply platform affinity at tap time, preserving today's engagement→distribution split. §12 "What This Locks In" updated with the `max(1, count)` floor and the platform-affinity-at-tap-time exclusion. Architect is requested to sign off on OQ16's formula change and confirm OQ17 preserves the earned-formula's intent.

---
# Review: architect (re-review)

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

Re-review per game-designer's 2026-04-05 revision. Two items required architect sign-off (OQ16, OQ17). Both approved. No remaining architectural concerns.

**OQ16 — Phantom-hand cooldown floor → APPROVED.**

`cooldown = 1 / (max(1, count) × base_event_rate)` is the right resolution. It's the one I would have picked if I'd caught the gap myself during my first pass; the engineer surfaced it correctly, the game-designer adopted the right option. It preserves every property of my derived-view contract:

- No new data field.
- No formula mode-switch — still a one-liner, still derived from `count` and `base_event_rate`.
- Semantically honest: the player's hand is actor #1 on every unlocked verb; automators are actors #2+. The floor names that relationship directly in the math.
- First Automate purchase (count: 0 → 1) halves the cooldown, which lands §4's "dual payoff is felt in the player's hand" teaching moment on the most important purchase — the first one. After that, 1/n diminishing returns on the cooldown dimension are fine because the automator-throughput dimension is compounding multiplicatively.

**One scoping clarification that must be explicit in implementation:** the `max(1, count)` floor belongs to the *manual-cooldown derivation only*. The passive-rate production formula inside the tick loop stays unfloored:

```
effective_rate = count × base_event_rate × base_event_yield × level_multiplier × algo_mod × clout × kit
```

If the floor were applied to passive production, a freshly-unlocked existing generator (count=0) would spuriously produce 1-actor's-worth of passive output — wrong, and a silent balance regression for the existing 7-generator roster. The floor exists because a manual cooldown has no natural "zero" meaning (the player's hand is always available), whereas passive production does have a natural zero ("no automators = no passive output"). Keep these two surfaces separated: floor at `postClick`'s cooldown gate and at any cooldown-display derivation; no floor at `computeGeneratorEffectiveRate` / tick-loop production.

Concretely, the cooldown gate in `postClick` (step 5 of my original OQ13 spec) should read:

```
const cooldownMs = 1000 / (Math.max(1, genState.count) × def.base_event_rate);
if (now - (state.player.last_manual_click_at[verbId] ?? 0) < cooldownMs) return state;
```

This also addresses engineer's non-blocking flag #2 on `last_manual_click_at` missing-key semantics — the `?? 0` makes "never clicked" semantically explicit at the gate site.

Incidental corollary for OQ9 (offline progression): because the floor is scoped to cooldown-only, the architecture already gives the designer-intended answer for free. Automated verbs (count ≥ 1) produce offline through the existing passive-rate pipeline; manual-only verbs (count = 0) produce nothing offline because the tick formula has no floor and the player's hand is not tapping while away. No special-casing needed. Game-designer can close OQ9 with "no new offline machinery required" when they sweep the remaining OQs.

**OQ17 — No platform affinity at `postClick` tap time → CONFIRMED. Preserves earned-formula intent.**

My step-4 formula's trailing `× platform_affinity_if_applicable` was a hedge because I hadn't locked the designer's intent on per-verb-to-platform coupling at tap time. Game-designer's resolution — manual clicks add flat engagement, platform routing happens downstream at `computeFollowerDistribution` — is the architecturally correct resolve, and I should have written the formula more precisely the first time.

Reasoning: today's passive generators already produce platform-agnostic engagement. `base_engagement_rate` (now `base_event_yield × base_event_rate`) has no per-platform multiplier at production time; content affinity enters at the distribution stage when engagement is partitioned into per-platform follower gain. Manual clicks matching that same discipline keeps the engagement→distribution split clean: one generation surface (production), one routing surface (distribution), no cross-contamination.

**Formula of record — corrected per-manual-tap engagement earned:**

```
earned = def.base_event_yield × level_multiplier(genState.level) × algoMod × clout_bonus × kit_bonus
```

No platform affinity term. Algorithm modifier stays at production (it's a yield-per-event multiplier, not a routing multiplier — same role as for passive generators). Platform affinity applies at distribution, not production, for both manual and automator output. Symmetric treatment, zero new coupling.

Architectural benefits of this resolve:

- `postClick` stays stateless with respect to platform selection — no "which platform is this verb tapping?" decision at runtime.
- Actions column does not couple to the platform matrix at click time.
- Content_affinity table remains the single source of truth for platform routing, applied in one place (`computeFollowerDistribution`).
- Matches today's engineer-observed behavior (engineer's non-blocking flag #1) — no behavior change needed beyond the `postClick(verbId)` signature refactor.

**Non-blocking observations (carried forward or new):**

1. *My OQ11/12/13 resolutions remain unchanged.* Consolidation, yield/rate split, and `postClick(verbId)` stand as authored. Only step-4's formula is corrected (platform-affinity term removed) and step-5's cooldown gate gains the `max(1, count)` floor and the `?? 0` missing-key guard.
2. *OQ7 (rate-scaled clicks interaction) is game-designer + architect jointly-owned, but game-design-weighted.* Architectural cost assessment: option (a) "apply rate-scaling only to non-top-rung" requires per-verb ladder-rank state at click time — introduces coupling from `postClick` to ladder ordering. Option (b) "reject rate-scaled clicks" is zero structural cost. Option (c) "stale-verb boost keyed to non-top-rung" is option (a) with extra tuning dimension. I lean (b) on architecture grounds — the fresh-calibration-per-verb story in this proposal substantively solves what rate-scaled-clicks was solving, and option (a)/(c) lock us into ladder-rank as a load-bearing click-time input. But this is a game-design call; I'm naming the cost, not making the call.
3. *Non-blocking: `last_manual_click_at` is a `Record<GeneratorId, number>` keyed by the union type.* Under consolidation every verb is a GeneratorId, so the Record's key space is stable and TypeScript will flag unknown verb IDs at compile time. Engineer may implement as `Partial<Record<GeneratorId, number>>` if a tighter optional-key type is preferred — either shape satisfies the contract.

Removing architect from reviewers. Engineer still listed pending re-review of OQ16 resolution (their blocking concern); game-designer still listed per the engineer's RFC loop. Both concerns are architecturally cleared from my side.

---
## Revision: 2026-04-05 — game-designer

Integrated architect's OQ11/12/13/8 resolutions. §7 opens with a [RESOLVED] callout pointing to consolidation + the yield/rate split; historical context retained below. OQs 8, 11, 12, 13 marked RESOLVED inline with summaries of the architect's answers. Added OQ14 (verb-to-generator roster mapping — game-designer to author) and OQ15 (`base_event_yield` tuning to preserve "meaningfully supplementary" feel — from architect's non-blocking flag). §12 "What This Locks In" updated with the new architectural commitments (verbs-are-generators, yield/rate split, derived cooldown, `postClick(verbId)` signature, `last_manual_click_at` field). §13 "What This Leaves Open" trimmed to remove resolved items.

---
# Review: architect

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

Reviewed from a data-model, component-boundary, and coupling perspective. Providing concrete resolutions to the load-bearing architectural OQs so the game-designer can integrate them and move the proposal forward.

**OQ11 — Parallel vs. consolidation → CONSOLIDATE (option b).**

Consolidation wins decisively on architectural grounds. The Generator entity already solves every structural question the ladder needs: `unlock_threshold`, `level`, `count`, `trend_sensitivity`, `state_modifiers`, `content_affinity`, and follower-distribution routing. Running parallel (option a) is a shared-state-in-two-places antipattern — two engagement economies riding the same tick pipeline, coupled implicitly through `player.engagement`. That is distributed-monolith shape at the module level and we should not sign up for it.

Under consolidation, the Actions column becomes a new *view* onto the existing Generator entity, not a new entity class. Cheap, clean, and the existing 7-generator roster can absorb the ladder's verbs by renaming/reusing entries rather than duplicating the data model.

**OQ12 — Cooldown vs. continuous-rate reconciliation → SPLIT `base_engagement_rate` into `base_event_yield × base_event_rate`. Keep continuous-rate as the canonical production model; cooldown is a derived view.**

This is the load-bearing architectural move. Today's effective-rate formula (see `core-systems.md` §Generator L53) conflates yield and cadence:

```
effective_rate = count × base_engagement_rate × level_multiplier(level) × algorithm_modifier × clout_bonus
```

The ladder needs them separable: Upgrade track scales yield, Automate track scales cadence. Decompose as:

- `base_event_yield` (engagement per event) ← scaled by `level_multiplier(level)` → Upgrade track
- `base_event_rate` (events/sec) ← scaled by `count` → Automate track

Substitute and the effective-rate output is mathematically identical:

```
effective_rate = count × base_event_rate × base_event_yield × level_multiplier(level) × algorithm_modifier × clout_bonus
```

**Migration is backward-compatible by construction.** For the existing 7 generators, seed `base_event_yield = 1.0` and `base_event_rate = base_engagement_rate`. Product unchanged, existing balance preserved exactly. Only manual-clickable generators (ladder verbs) read the split as independent fields.

**Displayed cooldown (for the button pulse and the manual-click cooldown gate) = `1 / (count × base_event_rate)`** — unaffected by Upgrade purchases, shrinks with Automate purchases. Matches designer intent in §2 and §4 exactly.

**Per manual tap, engagement earned = `base_event_yield × level_multiplier(level) × algo_mod × platform_affinity × clout_bonus × kit_bonus`** — grows with Upgrade, does not shrink cooldown.

One new Player field is required to gate per-verb manual cooldowns:

```
last_manual_click_at: Record<GeneratorId, timestamp>
```

Cheap addition. Fits the existing Player save root.

This resolution rejects the designer's options (a) and (c) from §7. Option (a) (discrete-tick production) is a rewrite of the tick pipeline — destructive and unnecessary. Option (c) (dual production models) is implicit coupling at the data-model level; architecturally disqualified.

**OQ13 — Per-verb algorithm-modifier binding → `postClick()` takes a `verbId: GeneratorId` parameter.**

Concrete changes to `client/src/game-loop/index.ts`:

1. Delete the `CLICK_GENERATOR_ID = 'selfies'` hardcode (L62).
2. Delete the `CLICK_BASE_ENGAGEMENT = 1.0` constant (L55); yield now comes from the verb's generator def.
3. Change signature to `postClick(state, staticData, verbId: GeneratorId) → GameState`.
4. Inside `postClick`: look up the verb's generator def, compute `algoMod = effectiveAlgorithmModifier(getAlgorithmModifier(state.algorithm, verbId), def.trend_sensitivity)`, then `earned = def.base_event_yield × level_multiplier(genState.level) × algoMod × clout × kit × platform_affinity_if_applicable`.
5. Add a cooldown gate: reject (or return unchanged state) if `now - state.player.last_manual_click_at[verbId] < 1 / (genState.count × def.base_event_rate)`. On success, update `last_manual_click_at[verbId] = now`.

Under consolidation every verb-as-generator already has trend_sensitivity and state_modifiers in static data — no new balance cells need to be authored for algorithm binding. (Content affinity on platforms still applies; see below.)

**OQ8 — Manual Click Value supersession → DEFENSIBLE. Accept the revised balance target.**

The flat `CLICK_BASE_ENGAGEMENT = 1.0` is subsumed by per-verb `base_event_yield`. The *spirit* of `generator-balance-and-algorithm-states.md` §Manual Click Value — "generators take over" — holds under the new framing, because at late-game Automate levels (cooldown floor ~0.01s → 100 events/sec per verb), human peak tap rate (~10/sec) is bounded at <10% of automator throughput. Automators dominate numerically, per verb. Manual clicks add a tactile feel layer, not a throughput layer.

The revised target — "automators take over *per verb*; manual hands stay meaningfully supplementary at every rung" — is structurally sound. I support supersession of the §Manual Click Value directive with this language.

**Non-blocking observations (for the record):**

1. *Tuning flag to game-designer (non-blocking):* at the 0.01s cooldown floor, manual contribution is bounded at ~10% of automator output. For "meaningfully supplementary" to *feel* true, per-tap `base_event_yield × level_multiplier` must be tuned high enough that 10% still feels like the hand matters. Balance-pass concern, not architecture.

2. *Static data shape:* ladder verbs that don't map to an existing generator id (e.g. Chirp, if not renamed from a current generator) need new entries in `staticData.generators` with seeded `base_event_yield`, `base_event_rate`, `trend_sensitivity`, `follower_conversion_rate`, `unlock_threshold`, plus content_affinity cells on each platform. This is authoring work for game-designer (per OQ4 and the roster decision), not architecture.

3. *No tick-pipeline changes required.* The yield/rate split is purely a data-model refinement. `computeEffectiveRate` inside the tick loop becomes `count × base_event_rate × base_event_yield × level_multiplier × algo × clout × kit`, which is mathematically identical to today's formula for existing generators. The continuous-rate production model is preserved end-to-end.

4. *No performance concern.* I verified the 0.01s cooldown floor against the tick model: because cooldown is a derived view on continuous rate (not discrete event-ticks), the underlying tick loop does not scale with cooldown floor. The "100 events/sec" is display cadence for the button pulse, not loop frequency.

Removing myself from reviewers. Architecture is resolved pending the game-designer integrating these resolutions into §7, §12, §13 and the OQ list, and pending ux-designer + engineer reviews.

---
# Review: ux-designer

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

Reviewed from a layout-composition, information-hierarchy, and interaction-pattern perspective. The instrument-panel metaphor is structurally strong and the Unlock → Upgrade → Automate lifecycle maps cleanly onto the existing Actions taxonomy. No blocking concerns. Answers to the UX-owned OQs follow.

**OQ3 — Actions Column soft cap tension → soft cap of 4 stands; internal scroll at 5+ stands; no new compaction model.**

I considered auto-compacting fully-automated verbs to a 40px "ensemble" row and rejected it for two reasons:

1. **§3 explicitly wants interleaved manual tapping** — "spam Chirp between Selfie cooldowns" is a design target, so a Chirp that is fully automated is still the player's rhythm verb. Auto-compacting based on automate-level contradicts the design intent that every verb stays a live instrument in the player's hand.
2. **Tap-target math.** 40px is below the 44px iOS minimum and below the 80px floor I committed to in `actions-column.md` OQ4. Halving is an accessibility regression.

One refinement tied to the ladder's texture, added on top of the existing answer:

- **Spotlight slot (sticky top).** The most-recently-unlocked verb pins to the top of the scroll region on desktop, and to the bottom-anchor position on mobile. This carries the progression signal — the player sees the newest instrument without scrolling for it. Older verbs scroll.

The instrument-panel aesthetic holds at 5+ tap targets because the screen never asks the player to scan-compare all verbs simultaneously. Hierarchy emerges from motion (which cooldown is pulsing right now), recency (which just fired), and touch (which the hand is on). The eye goes to what is moving and what the hand is on — not to a wall of equal buttons.

**OQ6 — Unlock purchase surface placement → Actions column ghost slot (option a).**

The ghost slot is zero-tutorial. The player learns the ladder exists simply by looking at the column — silhouetted next verb, unlock threshold printed, teasing what's next. Cookie Clicker's dimmed-locked-buildings pattern has proven this pattern works. Placing Unlock as an Upgrades-column line item buries the progression signal inside a list and weakens the diegetic receipt of unlock (a depleting list item vs. a silhouette lighting up and becoming tappable).

Concrete ghost-slot spec (starting direction — full spec in the follow-up UX task):

- One ghost slot at a time (the next verb in sequence).
- Anatomy: verb name, silhouette icon, unlock condition ("100 followers" or "500 engagement"), 0.35 opacity, no tap affordance until unlock condition is met.
- When condition is met: slot fully opacifies, shows unlock cost, becomes tappable. One tap consumes cost, verb unlocks, slot is replaced by the live verb button, next ghost appears below.
- Slot height ~60px — shorter than the 80px live-verb height, because it is a promise, not an instrument.
- Mobile: ghost slot sits directly above the current bottom-anchor verb, below any active brand-deal strip.

**Density check:** at 3 live verbs + ghost = 4 visual items (within cap); at 4 live + ghost = 5 items and the ghost scrolls with the rest. No cap revision required.

**§2 supersession (Chirp as baseline Actions member) — confirmed.**

The diegetic anchor moves cleanly from "pressing Post is being a poster" to "whatever manual verb is currently in the player's hand" (§6, §10). Chirp inherits the "I am a creator" fantasy intact — a tweet-poster is a poster. The visual grammar of the Actions column survives the supersession: single tap, immediate effect, meaningful for life.

**Instrument-panel aesthetic at 5+ simultaneous tap targets — holds.**

As laid out under OQ3, the aesthetic survives because hierarchy comes from motion, recency, and touch — not from all slots screaming for equal attention. The design's target feeling ("I am conducting an orchestra") is served by visible-but-not-equal verbs, and that is achievable within the existing soft-cap + internal-scroll model plus the spotlight-slot refinement.

**Non-blocking flags (for the record, not blocking acceptance):**

1. A full **Actions-column ladder UX spec** is needed before engineer builds — covering ghost-slot anatomy, live-verb-button anatomy (pulse indicator, cooldown ring, automate-level badge, per-verb iconography), spotlight-slot transition animation, and mobile anchor-dynamics. I will open this as a follow-up task after acceptance.
2. `ux/core-game-screen.md` and `ux/mobile-layout.md` will need updates after acceptance — the Actions zone description changes from "Post + brand-deal slot" to "ladder + ghost slot + brand-deal strip." UX owns that edit.
3. OQ4 (verb-to-platform coupling) has visual consequences for per-verb iconography once platforms are locked in, but this is downstream of game-designer's OQ4 resolution and fits into the follow-up ladder UX spec. Not blocking here.

Removing myself from reviewers. Engineer review remains.

---
# Review: engineer

**Date**: 2026-04-05
**Decision**: Request for Comment

**Comments**

Reviewed from an implementation-feasibility, refactor-scope, and migration-concerns perspective, per task #113. The architectural skeleton laid down by the architect is sound and the refactor is small; I'm aligned on everything except one boundary-condition gap that needs resolving before I can build without guessing.

**Overall feasibility — confirmed.** Under consolidation + yield/rate split, the engine changes are tightly scoped and backward-compatible by construction. No tick-pipeline reordering. No offline-snapshot rework. Save migration is one field.

**Refactor-scope estimate under both OQ11 options** (per AC):

*Option (b) — Consolidation [architect's resolution].* ~1 session, sonnet-complexity engine work:
- `client/src/types.ts` — add `last_manual_click_at: Record<GeneratorId, number>` to `Player`; split `GeneratorDef.base_engagement_rate` into `base_event_yield` + `base_event_rate` (optionally keep `base_engagement_rate` as a computed getter for grep-ability during a deprecation window).
- `client/src/game-loop/index.ts` — delete `CLICK_BASE_ENGAGEMENT` (L55) and `CLICK_GENERATOR_ID` (L62); update `computeGeneratorEffectiveRate` (L156–177) multiplication to `count × base_event_rate × base_event_yield × level_multiplier × algoMod × clout × kit` (mathematically identical for seeded existing generators); refactor `postClick(state, staticData, verbId)` per architect's 5-step spec with the cooldown gate.
- `client/src/driver/index.ts` — `click()` → `click(verbId: GeneratorId)`; the runAction wrapper is unchanged.
- `client/src/save/index.ts` — add `migrateV8toV9` seeding `player.last_manual_click_at = {}` on every existing save; bump `CURRENT_VERSION = 9`; add to the chain.
- `client/src/static-data/index.ts` — split the 7 generator defs' `base_engagement_rate` into `base_event_yield=1.0` + `base_event_rate=<current value>`.
- `client/src/game-loop/index.test.ts` — update `postClick` call sites to pass a verbId; add cooldown-gate tests; update the `CLICK_BASE_ENGAGEMENT` assertion at L524/L532 to express the new per-verb formula.
- UI wiring for per-verb Actions buttons — separate follow-up task, depends on the UX ladder spec ux-designer already committed to authoring.

*Option (a) — Parallel.* ~2–3 sessions, effectively opus-complexity: new `VerbDef`/`VerbState` types, parallel tick contribution summing into `player.engagement`, new 3×N platform-affinity matrix authoring, new algorithm-modifier wiring for every verb × every algorithm state, new balance-cell authoring for `trend_sensitivity` and `state_modifiers` per verb, new offline-snapshot handling, plus all the same UI. On top of this: two engagement economies sharing `player.engagement` is exactly the implicit-coupling / shared-state-in-two-places antipattern the architect called out. Maintenance cost compounds with every future engagement-touching feature (viral burst, content fatigue, algorithm states all have to decide whether they apply to generators, verbs, or both).

Consolidation wins decisively. Nothing in the codebase resists it.

**Non-obvious migration concerns (flagging all three per AC):**

1. **Save version bump is required, and the scope is tiny.** One v8→v9 migration that seeds `player.last_manual_click_at = {}`. `GeneratorDef` shape changes do NOT need a save migration because GeneratorDef lives in `static-data/index.ts` (code, not save root). The existing migration chain pattern (L450–485) handles this cleanly.
2. **Tick pipeline — no reordering, no contract changes.** Verified: `computeGeneratorEffectiveRate` preserves mathematical output for existing generators under the yield/rate split; `applyTickPosts` in `audience-mood/index.ts` iterates owned generators and auto-includes ladder verbs for content-fatigue with zero new wiring; `computeSnapshot` / offline calculation is transparent to the split; `evaluateViralTrigger` picks top-rate generator and verbs-as-generators are eligible without change.
3. **Driver contract change is the only externally-visible API break.** `click()` → `click(verbId)` affects every Actions-column tap handler. Predictable, typed (`GeneratorId` is a string-literal union), and the TypeScript compiler will surface every call site.

**One blocking semantic gap I need resolved before building — surfaced as proposed OQ16:**

The architect's derived-cooldown contract is `cooldown = 1 / (count × base_event_rate)`. That formula is undefined at `count === 0`, which is precisely the state a verb sits in after **Unlock** but before any **Automate** level is bought (designer §2: Unlock makes the verb clickable, Automate buys count ≥ 1). Division by zero → Infinity cooldown → the player can never manually click a freshly-unlocked verb. This directly contradicts §3 ("Chirp — short starting cooldown e.g. 0.3–0.5s"), which assumes a live cooldown the moment the verb becomes clickable.

Three resolution paths, each cheap, with different semantics:

- **(i) Unlock seeds `count = 1` implicitly.** The player's own hand is the "first automator," and Automate purchases start at count = 2. Simplest from the formula's point of view, but contradicts designer §2 wording ("An automator *begins* pressing this verb" at Automate — implies none exists pre-Automate) and conflates Unlock with Automate's mechanical footprint.
- **(ii) Phantom-hand floor: `cooldown = 1 / (max(1, count) × base_event_rate)`.** A one-line formula change. No count is seeded; the automator is absent pre-Automate as designer intended, but the player's hand runs on the base rate alone. First Automate purchase (count=1) halves the cooldown immediately, which matches §4's "Automate upgrade is felt in the player's hand" framing.
- **(iii) Separate `base_manual_cooldown` field** used pre-Automate, switching to the derived formula once count ≥ 1. Most flexible but adds a data field and a formula mode-switch — violates the architect's "cooldown is a derived view" principle.

**My recommendation: (ii).** Cheapest, preserves the architect's derived-view model exactly, and satisfies the designer's "every verb stays a live instrument from unlock onward." But this is a game-designer + architect call, not mine to make silently.

**Adding game-designer and architect back to reviewers for OQ16 resolution.** Once OQ16 is resolved, my Aligned decision is essentially pre-cleared — I have no other blocking concerns.

**Non-blocking flags for the record:**

1. **`postClick` + platform affinity ambiguity.** Architect's step-4 earned-formula ends with `… × platform_affinity_if_applicable`. Today's `postClick` does *not* apply platform affinity — manual clicks add flat engagement, and platform affinity enters only at the follower-distribution stage (see `platform/index.ts` + `computeFollowerDistribution`). If manual verb clicks now apply platform affinity at click time, that's a behavior change requiring a binding spec (which platform? max-affinity? player's focused platform?). Unless told otherwise, I'll implement `postClick(verbId)` *without* platform affinity at click time, preserving today's engagement→distribution split. Flag for architect confirmation.
2. **`last_manual_click_at` missing-key semantics.** `now - undefined = NaN`; `NaN < anything = false`, so a missing key (e.g. verb unlocked post-migration) passes the cooldown gate on first click. That's correct behavior ("never clicked" → not on cooldown), but I'll add an explicit `?? 0` or a guard comment at the gate site so the intent is legible.
3. **Test-surface expansion.** The existing `postClick` test suite (`game-loop/index.test.ts` L517+) needs updating to cover: verb dispatch by id, cooldown-gate accept/reject paths, yield/rate formula equivalence across existing generators (regression check that the split produces identical output to pre-split), and `last_manual_click_at` write-back. ~5-8 new assertions; in scope for the build task.
4. **Deprecation of `base_engagement_rate` on GeneratorDef.** Keeping it as a computed getter (`get base_engagement_rate() { return this.base_event_yield * this.base_event_rate; }`) would preserve grep-ability for any downstream code I miss during the refactor sweep. Not strictly necessary under a TypeScript rename — compiler catches everything — but cheap insurance. Engineer's call at build time.

Leaving myself in reviewers pending OQ16 resolution.

---
# Review: engineer (re-review)

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

Re-review after game-designer's post-architect-re-review revision. My prior RFC was pre-cleared pending OQ16 resolution; both OQ16 and OQ17 are now resolved with implementation-ready detail. No remaining blockers.

**OQ16 (phantom-hand floor) — resolved as recommended, with the scoping clarification I needed.**

Game-designer picked option (ii) (`cooldown = 1 / (max(1, count) × base_event_rate)`), which was my recommendation. Architect's re-review approved and added the load-bearing detail: **the floor applies ONLY to the manual-cooldown derivation at `postClick`'s gate; it MUST NOT be applied inside `computeGeneratorEffectiveRate` in the tick loop.** Without that scoping, every existing count=0 generator would spuriously produce one-actor's-worth of passive engagement — a silent balance regression against the existing 7-generator roster. §12 now names this explicitly, which is exactly what the implementation needs.

Concretely at build time:
- `postClick` cooldown gate: `const cooldownMs = 1000 / (Math.max(1, genState.count) * def.base_event_rate);` — per architect's re-review snippet.
- `computeGeneratorEffectiveRate`: formula stays `count * base_event_rate * base_event_yield * level_multiplier * algoMod * clout * kit` — unfloored, so count=0 yields zero passive output as today.

Two gates, two surfaces, one floor. Clean.

**OQ17 (no platform affinity at `postClick` tap time) — confirmed, matches today's behavior.**

Today's `postClick` adds flat engagement and platform affinity enters only at `computeFollowerDistribution`. The resolution preserves that split. Architect's formula of record is now:

```
earned = def.base_event_yield × level_multiplier(genState.level) × algoMod × clout_bonus × kit_bonus
```

No platform-affinity term. No new routing decisions at click time. The `postClick(verbId)` refactor is a pure dispatch rename plus the cooldown gate — zero behavior change beyond per-verb yield/rate lookup.

**My prior non-blocking flags — all addressed in §12 or left to build-time discretion:**

1. *Platform-affinity ambiguity (flag #1)* — resolved by OQ17.
2. *`last_manual_click_at` missing-key semantics (flag #2)* — the `?? 0` guard is now in §12's cooldown-gate signature: `state.player.last_manual_click_at[verbId] ?? 0`. Intent is legible at the gate site.
3. *Test-surface expansion (flag #3)* — my responsibility at build time. In scope for the engine refactor task.
4. *`base_engagement_rate` deprecation getter (flag #4)* — engineer's call at build time; leaning toward adding the getter as grep-insurance during the deprecation window, but not proposal-level.

**Remaining open questions do not block engineering.**

OQ2 (per-verb automation tuning curve), OQ4 (verb-to-platform coupling), OQ5 (unlock-threshold formula), OQ14 (verb-to-generator roster mapping), OQ15 (`base_event_yield` tuning) are all game-designer-owned balance/naming decisions. The engine refactor skeleton — yield/rate split, `postClick(verbId)` signature, `last_manual_click_at` field, save v8→v9 migration — is fully specified by §12 and the architect's resolutions. I can build the refactor without waiting for these; roster wiring and balance tuning plug into the refactor at defined seams (`staticData.generators` entries, content-affinity cells).

**Engineering readiness summary:**

- Scope: ~1 session, sonnet-complexity (per my prior estimate).
- Save migration: one v8→v9 seeding `player.last_manual_click_at = {}`.
- Driver API break: `click()` → `click(verbId)` — typed, compiler-surfaced.
- Tick pipeline: mathematically identical output for seeded existing generators. No reordering, no contract changes.
- UI wiring (per-verb Actions buttons): separate follow-up task gated on ux-designer's ladder UX spec.

Removing engineer from reviewers. Game-designer remains per RFC loop self-inclusion and because OQ2/4/5/14/15 are theirs to close. Proposal stays in `draft/` — cannot move to `accepted/` while open questions remain, per review-state rules.
