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

### 7. Relationship to Rate-Scaled Clicks (Draft)

The draft proposal `post-button-rate-scaled-clicks.md` makes a single Post click scale with current engagement rate, solving "the verb goes inert late-game." Under the Manual Action Ladder, the problem shape shifts:

- **Newly-unlocked manual verbs** are already calibrated to matter at the progression stage where they unlock, so rate-scaling may be unnecessary *for the current top rung*.
- **Automated verbs** that the player still manually clicks on top of auto-ticks risk going inert in the same way Post does today. Rate-scaling (or another mechanism) may still be needed *for those*.

The two proposals are not mutually exclusive, but the Manual Action Ladder may supersede the motivating problem of rate-scaled clicks for the active top rung. Resolution flagged as OQ7.

### 8. Player Psychology & Aesthetic

- **Target feeling:** "I am conducting an orchestra of content — and every upgrade I buy, I feel in my own hand." The Actions column grows into an instrument panel — every verb the player has ever unlocked is still in their hand, and each verb's cadence gets tangibly faster as the player invests in it. A freshly-upgraded Selfie rewards the tapping hand directly; the tactile acceleration is the receipt for the purchase. Early game, the player plays one instrument loudly. Mid-game, automators form an ambient rhythm section while the player adds layered manual taps on whichever verbs they feel like playing. Late game, the player is orchestrating a stack of parallel automators AND choosing which verbs their hand enriches further. This mirrors real creator-economy progression — every format a creator has ever adopted is still available to them; they add new formats without abandoning old ones.
- **Intrinsic motivation:** Strongly reinforced. Every new verb is a skill-reset — the player relearns rhythm, timing, and yield each rung. The core loop never stops teaching.
- **Endowment effect:** Each verb is earned three times (unlock, upgrade, automate), so the player's sense of ownership over the ladder compounds. Automating a verb feels like graduation, not retirement.
- **Loss aversion:** Not touched — this system has no loss state. (Ladder interactions with scandal-class loss systems are out of scope.)
- **Variable ratio risk:** None added. All three purchase thresholds are deterministic.

### 9. Engagement Line Check

1. **Is this mechanic honest?** Yes — every verb does what it says, every purchase has a visible effect, every click produces a visible result.
2. **Can the player quit without loss?** Yes — the ladder has no decay, no penalty for absence, no FOMO mechanics.
3. **Is progression tied to skill/engagement, or just time?** Both, correctly: engagement scales with hand-speed and attention during manual phases; time still matters because automation accumulates offline. Engaged players progress faster without locking out idle players.

No concerns.

### 10. What This Locks In

- The Actions Column starts with Chirp, not Post.
- Manual verbs follow a three-state lifecycle: unlock, upgrade, automate.
- Every unlocked verb remains permanently manual-clickable — no button is ever retired.
- Automators are parallel actors with their own independent cooldown timers; manual and auto stack by construction.
- A verb's cooldown **value** is shared between automator and manual — upgrading the Automate track speeds up both, giving the player a tactile feel of the upgrade through their own tap rate. Cooldown floor is ~0.01s.
- Every verb starts with some cooldown (even Chirp) so that every verb's Automate track has dual payoff.
- Verbs are differentiated by starting yield and starting cooldown, not reskinned.

### 11. What This Leaves Open

- The full sequence and count of ladder rungs.
- The unlock-threshold formula (engagement milestones vs. other triggers).
- Whether manual clicks on automated verbs stack with or share the auto-tick cooldown.
- The interaction between ladder verbs and platform affinity (if platforms ever get per-verb coupling).
- Whether rate-scaled clicks remain needed for automated verbs.

## References

1. `.frames/sdlc/proposals/accepted/actions-column.md` — Actions Column taxonomy; this proposal extends §2 (baseline member) and §5 (future actions plug into this column)
2. `.frames/sdlc/proposals/accepted/core-game-identity-and-loop.md` — "I am a creator" fantasy anchor
3. `.frames/sdlc/proposals/accepted/generator-balance-and-algorithm-states.md` — existing generator/upgrade economy this ladder must coexist with
4. `.frames/sdlc/proposals/accepted/brand-deal-boost.md` — orthogonal Actions Column sibling, unchanged
5. `.frames/sdlc/proposals/draft/post-button-rate-scaled-clicks.md` — may be superseded or composed with; see §7 and OQ7
6. `.frames/sdlc/proposals/draft/platform-identity-and-affinity-matrix.md` — potential per-verb platform coupling, flagged in OQ4
7. `client/src/game-loop/index.ts` — current Post click implementation site

## Open Questions

1. ~~**Do manual clicks on an automated verb stack with the auto-tick, or share its cooldown?**~~ **[RESOLVED — game-designer, 2026-04-05]** Stack, by architecture. The automator is a parallel actor with its own independent cooldown; manual clicks run on the player's own cooldown (or on no cooldown, for verbs like Chirp). The two never share a timer. See §4.

2. **How many automation levels per verb, and what is the tick-interval progression?** E.g., auto-Chirp I fires every 5s, auto-Chirp II every 3s, III every 1s. Needs a tuning curve that respects the overall economy. **Owner: game-designer** (tune during balance pass).

3. **Does the Actions Column soft cap (4 members) need to change?** The ladder could realistically reach 4–6 verbs over a full session. At 4+, the column scrolls internally per ux-designer's answer on `actions-column.md` OQ4. Is internal scroll acceptable for the ladder, or does the ladder need a visual compaction model (e.g., collapsed-verb strip for automated rungs)? **Owner: ux-designer.**

4. **Are verbs coupled to platforms, or platform-agnostic?** Chirp reads as Chirper-native. Is Selfie a different platform's format (Instagram analog)? Livestream (Twitch analog)? This could tie into `platform-identity-and-affinity-matrix.md` and give the ladder a second narrative dimension — or it could over-couple two systems that are better kept orthogonal. **Owner: game-designer** (make the call after reading the platform affinity draft).

5. **What unlock-threshold formula scales across the full ladder?** The user's example was "10 engagement to unlock Selfie." For a ladder of 5+ verbs, is the threshold an escalating engagement amount, a follower milestone, a prior-verb-upgrade prerequisite, or a combination? **Owner: game-designer** (economy tuning).

6. **Where does the Unlock purchase surface live — Actions column (ghost slot) or Upgrades column (as a line item)?** A ghost slot is diegetically strong ("the next verb is visibly waiting") but consumes Actions column space pre-unlock. A line item is quieter but hides the progression signal. **Owner: ux-designer.**

7. **Does this supersede `post-button-rate-scaled-clicks.md`, or compose with it?** The top-rung manual verb may not need rate-scaling because it's freshly calibrated. Automated verbs (which the player may still manually click) may still need rate-scaling to stay meaningful. Three options: (a) accept this proposal *and* rate-scaled clicks, applying rate-scaling only to automated-verb manual taps; (b) accept this proposal and reject rate-scaled clicks, relying on fresh calibration; (c) accept this proposal and refactor rate-scaled clicks into a "stale-verb boost" mechanism. **Owner: game-designer + architect.**

8. **Does this invalidate any existing generator balance assumptions?** The current generator economy assumes passive income dominates click income. A ladder that produces strong manual income early could shift that balance. **Owner: architect** (assess data-model and balancing implications against `generator-balance-and-algorithm-states.md`).

9. **How does this interact with offline progression?** Automated verbs produce offline; manual verbs do not. A player who quits before automating a verb gets zero contribution from that verb while away. Is that fine (natural incentive to automate before logging off), or does offline need a "ghost manual" contribution? **Owner: game-designer + architect.**

10. ~~**Is there a separate Upgrade path for manual cooldown, or does Upgrade only affect yield-per-click?**~~ **[RESOLVED — game-designer, 2026-04-05]** No separate manual-cadence path. The Automate track *is* the cooldown track: each Automate level reduces the verb's shared cooldown, which applies to both the automator's timer and the player's manual tap rate. One purchase, dual payoff. See §2, §4.
