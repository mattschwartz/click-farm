---
name: Manual Action Ladder
description: Replaces the single Post button with a ladder of content verbs (Chirp, Selfie, Livestream, …) where each verb follows a three-step lifecycle — unlock, upgrade, automate — and every verb stays permanently manual-clickable. Automators are parallel actors that press each verb on their own cooldowns, not replacements for the player's hand.
author: game-designer
status: draft
reviewers: [architect, ux-designer, engineer]
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

The first rung of the ladder is **Chirp** — the in-fiction equivalent of a tweet on the platform Chirper. Chirp replaces Post as the starting verb and inherits Post's diegetic-anchor role in the Actions Column. Subsequent rungs are content formats like **Selfie**, **Livestream**, and additional formats to be named. Each rung introduces a new manual click verb with its own yield, cooldown, and feel.

The ladder's full length and the exact sequence are not locked in this proposal — only the *shape* of the ladder is.

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

- **Chirp** — short starting cooldown (e.g. 0.3–0.5s), low-yield per click. The rapid-fire baseline.
- **Selfie** — medium starting cooldown (e.g. 2–3s), higher-yield per click. Requires attention.
- **Livestream** — long starting cooldown (e.g. 8–12s), highest-yield per click. A big-moment verb.
- **Further rungs** — TBD.

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

This proposal overlaps significantly with three accepted systems. Surfacing every interaction here so reviewers can make informed calls.

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
- Manual verbs follow a three-state lifecycle: unlock, upgrade, automate.
- Every unlocked verb remains permanently manual-clickable — no button is ever retired.
- Automators are parallel actors with their own independent cooldown timers; manual and auto stack by construction.
- A verb's cooldown **value** is shared between automator and manual — upgrading the Automate track speeds up both, giving the player a tactile feel of the upgrade through their own tap rate. Cooldown floor is ~0.01s.
- Every verb starts with some cooldown (even Chirp) so that every verb's Automate track has dual payoff.
- Verbs are differentiated by starting yield and starting cooldown, not reskinned.

### 13. What This Leaves Open

- Whether the ladder runs parallel to the existing generator roster or consolidates with it (major OQ11).
- The full sequence, count, and final naming of ladder rungs (given the Selfie / Livestream name collision with existing generators).
- The unlock-threshold formula (engagement milestones vs. follower thresholds vs. prior-verb prerequisites).
- How verb production model resolves against the existing continuous-rate generator model (cooldown vs. rate/sec).
- The per-verb platform-affinity and algorithm-modifier assignments (auto-resolved under consolidation, newly-authored under parallel).
- Whether rate-scaled clicks remain needed for non-top-rung verbs.

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

2. **How many automation levels per verb, and what is the tick-interval progression?** E.g., auto-Chirp I fires every 5s, auto-Chirp II every 3s, III every 1s. Needs a tuning curve that respects the overall economy. **Owner: game-designer** (tune during balance pass).

3. **Does the Actions Column soft cap (4 members) need to change?** The ladder could realistically reach 4–6 verbs over a full session. At 4+, the column scrolls internally per ux-designer's answer on `actions-column.md` OQ4. Is internal scroll acceptable for the ladder, or does the ladder need a visual compaction model (e.g., collapsed-verb strip for automated rungs)? **Owner: ux-designer.**

4. **Are verbs coupled to platforms, or platform-agnostic?** Chirp reads as Chirper-native — but the platform proposal names the Twitter-analog platform **Skroll**, not Chirper. Is Chirp a Skroll-native verb, a new platform's verb, or platform-agnostic? Similar question for Selfie (Instasham?) and Livestream (which platform?). Under consolidation (OQ11-b), verbs inherit the platform-affinity matrix already defined — see `platform-identity-and-affinity-matrix.md` §4 for the 3×7 matrix. Under parallel (OQ11-a), verbs would need their own matrix. **Owner: game-designer** (name the couplings once OQ11 resolves).

5. **What unlock-threshold formula scales across the full ladder?** The user's example was "10 engagement to unlock Selfie." For a ladder of 5+ verbs, is the threshold an escalating engagement amount, a follower milestone, a prior-verb-upgrade prerequisite, or a combination? **Owner: game-designer** (economy tuning).

6. **Where does the Unlock purchase surface live — Actions column (ghost slot) or Upgrades column (as a line item)?** A ghost slot is diegetically strong ("the next verb is visibly waiting") but consumes Actions column space pre-unlock. A line item is quieter but hides the progression signal. **Owner: ux-designer.**

7. **Does this supersede `post-button-rate-scaled-clicks.md`, or compose with it?** The top-rung manual verb may not need rate-scaling because it's freshly calibrated. Older verbs (which the player may still manually click) may still need rate-scaling to stay meaningful. Note that rate-scaled-clicks is currently unaccepted (draft, architect and engineer reviews pending), so this is a resolution-before-acceptance question, not a supersession of an accepted decision. Three options: (a) accept this proposal *and* rate-scaled clicks, applying rate-scaling only to non-top-rung manual taps; (b) accept this proposal and reject rate-scaled clicks, relying on fresh calibration of new verbs; (c) accept this proposal and refactor rate-scaled clicks into a "stale-verb boost" mechanism keyed to non-top-rung verbs. **Owner: game-designer + architect.**

8. **How does this land against the `generator-balance-and-algorithm-states.md` §Manual Click Value directive?** That section explicitly says "The value should not be raised — that would undermine the 'generators take over' arc." Adding multiple manual verbs with yield upgrades and shared cooldown reductions directly modifies this. The spirit is preserved if automators remain the dominant passive engine — but the letter is superseded. Architect + game-designer should confirm the new balance target: "*automators* take over per verb; manual hands stay meaningfully supplementary at every rung." **Owner: game-designer + architect.**

9. **How does this interact with offline progression?** Automated verbs produce offline; manual verbs do not. A player who quits before automating a verb gets zero contribution from that verb while away. Is that fine (natural incentive to automate before logging off), or does offline need a "ghost manual" contribution? **Owner: game-designer + architect.**

10. ~~**Is there a separate Upgrade path for manual cooldown, or does Upgrade only affect yield-per-click?**~~ **[RESOLVED — game-designer, 2026-04-05]** No separate manual-cadence path. The Automate track *is* the cooldown track: each Automate level reduces the verb's shared cooldown, which applies to both the automator's timer and the player's manual tap rate. One purchase, dual payoff. See §2, §4.

11. **[LOAD-BEARING] Does the ladder run PARALLEL to the existing 7-generator roster, or CONSOLIDATE with it?** This is the structural question this proposal cannot resolve alone. Options per §7: (a) parallel systems with renamed verbs to avoid collision; (b) consolidation — verbs ARE generators; (c) parallel with colliding names (not recommended). **Lean: (b) consolidation**, because it inherits all existing balance (unlocks, levels, platform affinity, algorithm modifiers, follower-distribution routing) and avoids two parallel engagement economies. But (b) is a structural refactor of the Upgrades column's identity and the tick pipeline. **Owner: architect + game-designer** (architect assesses feasibility; game-designer confirms the consolidated model still delivers the instrument-panel feel).

12. **How does the cooldown production model resolve against the existing continuous-rate generator model?** Existing generators produce continuously (`base_engagement_rate` eng/sec). Ladder verbs have discrete cooldowns. Under consolidation (OQ11-b), the two models must reconcile. Options: (a) add a `cooldown_ms` field to Generator and switch production to discrete event-ticks; (b) treat `base_engagement_rate` as `1 / cooldown_seconds` and multiply per-event yield accordingly, keeping continuous-rate semantics under the hood; (c) keep both models, letting some generators be rate-based and others event-based. **Owner: architect.**

13. **Per-verb algorithm-modifier binding.** Today's `postClick()` hard-codes `CLICK_GENERATOR_ID = 'selfies'` for algorithm-modifier lookup on manual clicks. Per-verb manual clicks each need their own algorithm-modifier mapping. Under consolidation: each verb-as-generator already has its own trend_sensitivity and per-state modifiers — solved for free. Under parallel: each verb needs new trend_sensitivity and per-state modifier assignments (5 verbs × 5 algorithm states = 25 new cells). **Owner: game-designer (assignments) + engineer (binding).**
