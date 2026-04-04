---
name: Scandals & Follower Loss
description: Defines the event system for follower loss — triggers, magnitude, counterplay, and scaling — as a stretch goal that bolts onto the core loop.
author: game-designer
status: accepted
reviewers: []
---

# Proposal: Scandals & Follower Loss

## Problem

The core loop (Post → Engage → Grow) has no negative pressure. Followers only increase, which means late-game decisions stop mattering — there's no reason to diversify, no cost to risky strategies, and no tension in growth. The progression curve flattens into passive accumulation.

Follower loss solves this by introducing a strategic cost to certain play patterns. But loss mechanics in progression games are high-risk design territory: too harsh and players quit, too mild and the system is ignorable, too random and it feels unfair.

This proposal specifies a discrete event system — Scandals — that creates meaningful follower loss tied to player behavior, with clear counterplay and careful emotional tuning.

**This feature is a stretch goal.** The core loop is playable without it. Scandals add strategic depth and narrative flavor but are not required for the first playable version.

## Proposal

### 1. Design Intent

**Target feeling:** "Oh no — but I kind of saw that coming." Scandals should feel like a consequence the player understands in hindsight, not a punishment that came from nowhere. The moment should be dramatic and funny (this is a satire), briefly painful, and immediately actionable.

**What Scandals are NOT:**
- Not a punishment for playing the game
- Not a random tax on success
- Not a reason to play conservatively — the optimal strategy should still involve risk

### 2. Trigger Model

Scandals are **player-caused with empire scaling**. The player's choices create the conditions; their empire size determines whether those conditions have consequences.

**Empire threshold:** Scandals cannot fire below a follower threshold (tuning value, but roughly "your first 1,000 followers are safe"). This keeps early game scandal-free — the player learns the core loop without negative pressure. Nobody cancels a small account.

**Trigger conditions** — each Scandal type has a specific trigger tied to player behavior:

| Scandal | Trigger | Flavor |
|---------|---------|--------|
| Content Burnout | Overposting a single content type (>70% of output from one generator) | "Your audience is bored of your selfies" |
| Platform Neglect | A platform with followers but no recent posts | "Your fans think you ghosted them" |
| Hot Take Backlash | High Hot Take output during an unfavorable Algorithm state | "Your take did not age well" |
| Trend Chasing | Rapidly switching content mix to follow Algorithm shifts | "Your audience can tell you're pandering" |
| Growth Scrutiny | Rapid follower growth on a single platform | "People are asking if you bought your followers" |
| Fact Check | High Podcast or Tutorial output at scale | "Someone checked your sources" |

Each trigger has a **risk accumulator** — the risky behavior builds up a hidden-but-inferrable pressure. The Scandal fires when the accumulator crosses a threshold, with some fuzz so the exact moment isn't predictable. The player should feel the risk building ("I've been posting a lot of Hot Takes during this Algorithm state...") without knowing the exact breaking point.

**Empire scaling:** The accumulator thresholds decrease as total followers increase. A 100k-follower account gets scrutinized faster than a 10k account. Fame has a cost.

### 3. Magnitude

Scandals remove **5-15% of followers on the affected platform**, scaled by scandal severity and empire size. Guidelines:

- **Floor:** No scandal should ever remove more than the player earned in their current session. A scandal should never send you backwards from where you started today.
- **Ceiling:** No scandal removes more than 15% from a single platform. Multiple simultaneous scandals cannot stack — only the most severe fires.
- **Cross-platform:** Scandals affect one platform primarily. A small ripple effect (1-3%) may hit adjacent platforms for severe scandals, but this is the exception.

Followers lost to scandals are lost — they don't recover automatically. The player earns them back through normal play. This makes scandals consequential without requiring a recovery mechanic.

### 4. Counterplay: The PR Response

When a scandal fires, the player gets a **PR Response window** — a short, timed opportunity to spend Engagement to mitigate the damage.

- The window is **10-15 seconds** of active play (not real-time if the game is idle — the window opens when the player is present)
- The player chooses how much Engagement to spend on damage control: more Engagement = fewer followers lost
- Spending nothing means the full scandal magnitude hits
- Spending the maximum reduces loss to roughly 30-40% of the original magnitude — you can't PR your way out of it entirely
- The decision is: "Is this Engagement better spent on damage control or on growth?" — a real economic tradeoff, not a no-brainer

The PR Response is the key design element that turns a passive loss into an active decision. Without it, scandals are just "bad thing happened." With it, scandals are "how do I want to handle this?"

### 5. Feedback & Legibility

The player must be able to understand scandal risk without a manual:

- **Leading indicators:** When a risk accumulator is building, the affected generator or platform should show subtle warning signals. Not a countdown — a mood. "This generator feels like it's running hot." The UX spec will define the exact visual treatment, but the design intent is: attentive players see it coming.
- **The scandal moment:** A named event with satirical flavor text. The player should laugh, then deal with it. Each scandal type has a distinct name and a short comedic description.
- **Aftermath:** Clear display of followers lost, platform affected, and current follower count. No ambiguity about what happened or how bad it was.

### 6. Offline Rule

Per the accepted Core Game Identity & Loop proposal: **no negative events fire while the player is offline.** Risk accumulators freeze when the player closes the game. They resume from their frozen state when the player returns. A player cannot come back to a scandal that happened while they were away.

### 7. Interaction with Other Systems

- **The Algorithm:** Algorithm states can increase or decrease scandal risk for certain trigger types. An Algorithm state that penalizes Hot Takes also raises Hot Take Backlash risk — the systems reinforce each other.
- **Prestige (Clout):** Clout upgrades could reduce scandal magnitude or slow accumulator rates — this gives prestige runs a defensive strategic option alongside the existing offensive options (faster rates, new generators). Specific Clout upgrades are not specified here and should be addressed in a future Prestige Economy proposal.
- **Generators:** Each generator has a natural scandal affinity. High-variance generators (Hot Takes, Viral Stunts) carry higher scandal risk. Stable generators (Tutorials, Podcasts) carry lower risk but aren't immune. This creates a risk/reward spectrum across the generator roster.

### 8. Tuning Philosophy

Scandals should be **rare enough to be notable, frequent enough to influence strategy.** A rough target: a player making moderately risky choices should see 1-2 scandals per run in mid-game, 3-5 in late game. A player actively managing risk should see fewer. A player ignoring risk should see more.

The exact tuning values (accumulator thresholds, magnitude percentages, PR Response costs) are implementation-time decisions that depend on playtesting. This proposal specifies the structure and feel, not the numbers.

## References

1. `proposals/accepted/core-game-identity-and-loop.md` — the accepted core design, which establishes the three-currency economy, generator roster, Algorithm system, and the "no negative events offline" rule that this proposal builds on
2. Architect review on core proposal — explicitly requested a follow-up proposal on follower loss triggers, magnitude, and counterplay before the event system can be architected
3. UX designer review on core proposal — flagged that follower loss visual treatment needs close collaboration with game-designer once the system is specified

## Open Questions

1. [RESOLVED] **What is the visual language for scandal risk building?** The design specifies "subtle warning signals" on at-risk generators/platforms, but the exact visual treatment is a UX decision. The signals must be noticeable to attentive players without creating anxiety or clutter. **Owner: ux-designer**
   - **Answer:** Three-tier visual escalation keyed to the architect's `risk_level` enum. `none` = normal rendering. `building` = subtle amber warmth on border/glow. `high` = amber intensifies with slow pulse (1.5-2s cycle). Motion is the primary signal (accessible for CVD); color reinforces. Matches design intent of "obvious in hindsight, noticeable but not demanding in the moment." See ux-designer review for full spec.
2. [RESOLVED] **What is the technical contract for the risk accumulator system?** The accumulators need to track per-generator and per-platform risk, freeze/resume with offline state, and interact with Algorithm state modifiers. **Owner: architect**
   - **Answer:** Event-driven accumulators (not tick-driven) that update on relevant player actions. State: `{ value: float [0,1], base_threshold: float, frozen: bool }`. Effective threshold = `base_threshold × empire_scale(total_followers)` where empire_scale is monotonically decreasing. Fires when `value > effective_threshold + fuzz(seed)`, then resets to 0. Algorithm state modifies accumulator increment rate, not threshold. Exposes coarse `risk_level: none | building | high` for UX. Scoping varies by type (per-generator, per-platform, or global). See architect review for full spec.
3. [RESOLVED] **Should Clout upgrades that reduce scandal impact exist, and if so, how do they interact with the prestige economy?** This proposal suggests it as a possibility but does not specify it — the Prestige Economy proposal should make that call. **Owner: game-designer** (future proposal)
   - **Answer:** Deferred to a future Prestige Economy proposal. The scandal system is designed to work without defensive Clout upgrades — they are an optional strategic layer, not a dependency.
4. [RESOLVED] **What defines a "session" for the magnitude floor rule?** Section 3 states "No scandal should ever remove more than the player earned in their current session." The meaning of "session" must be defined before the magnitude calculation can be specced — is it time since app open? Time since last prestige? Time since last scandal? **Owner: game-designer**
   - **Answer:** A "session" is the time since the app was last foregrounded (opened or returned to). The system snapshots each platform's follower count when the player opens the game. The magnitude floor rule becomes: no scandal can push a platform's followers below its snapshot value. This matches the player's intuitive contract ("I shouldn't leave worse off than when I sat down"), is simple to compute (snapshot on open, compare on scandal fire), and has no edge cases with the offline rule since no negative events fire while away. Rejected alternatives: time-since-prestige (too long, floor becomes meaningless), time-since-last-scandal (perverse incentive to trigger small scandals to reset the floor), rolling window (players don't think in rolling windows, and the complexity isn't justified for a stretch goal).

---
# Review: architect

**Date**: 2026-04-04
**Decision**: Aligned

**Comments**

1. **System is well-scoped and bolts on cleanly.** The stretch-goal framing means this can be designed as an additive system — no structural changes to the core architecture are required. The "no negative events offline" rule, already established, extends naturally: all accumulators freeze when offline, resume from frozen state on return. No catch-up calculation needed.

2. **Risk accumulator technical contract (OQ #2 answer).** The accumulator system should follow this contract:
   - Each scandal type owns one accumulator per relevant scope (generator, platform, or global — scoping varies by type)
   - Accumulators are **event-driven, not tick-driven** — they update when a relevant action occurs (post created, content mix changes, etc.)
   - Exception: time-based triggers (Platform Neglect) freeze offline per the established rule and resume from frozen state on return
   - Accumulator state: `{ value: float [0,1], base_threshold: float, frozen: bool }`
   - Effective threshold = `base_threshold × empire_scale(total_followers)` where `empire_scale` is a monotonically decreasing function (higher fame → lower threshold)
   - Fires when `value > effective_threshold + fuzz(seed)`, then resets to 0
   - Algorithm state applies as a modifier to accumulator **increment rate**, not to the threshold — keeps the two systems cleanly separated
   - Exposes a coarse `risk_level: none | building | high` for UX signaling, derived from `value / effective_threshold`

3. **PR Response is a modal event.** This introduces a new game state ("scandal active, awaiting player input") that the core loop doesn't have yet. Architecturally this is a state machine transition: `normal → scandal_active → resolving → normal`. Clean pattern, but the engineer needs to know this is coming because it affects the game loop structure.

4. **Fuzz maps to existing PRNG pattern.** The randomness on accumulator thresholds can use the same seeded PRNG approach established for the Algorithm shift system. Consistency is free.

5. **Blocking flag: "session" is undefined.** The magnitude floor rule ("no scandal removes more than the player earned in their current session") requires a definition of "session" before the magnitude calculation can be specced. Added as Open Question #4 — this is a game-designer decision. A task has been created for the game-designer.

6. **Non-blocking: accumulator scoping varies by type.** Content Burnout is per-generator, Platform Neglect is per-platform, Trend Chasing is effectively global. This is manageable with a polymorphic accumulator interface — not a problem, but worth naming so the engineer doesn't assume a uniform model.

7. **Non-blocking: coarse risk exposure for UX.** The contract exposes `risk_level` as a three-value enum rather than a raw number. This lets the designer control the feel (when does "building" become "high"?) and gives UX a stable signal to visualize without coupling to accumulator internals.

---
# Review: ux-designer

**Date**: 2026-04-04
**Decision**: Aligned

**Comments**

1. **Open Question #1 answer — visual language for scandal risk building.** The architect's `risk_level: none | building | high` enum is the right granularity. Visual treatment:
   - **none** — generator/platform renders normally, no additional signals
   - **building** — subtle warmth shift; the affected generator's border or glow picks up a warm amber tone (not red — red is the scandal itself). Background signal: attentive players notice, inattentive players aren't punished for missing it
   - **high** — amber intensifies and pulses slowly (1.5–2s cycle, ease-in-out). The generator feels like it's straining. Still not red, still not alarming, but unmistakable on a glance. Pulse rate is slow enough to avoid anxiety, fast enough to register as distinct from "building"
   - **Why not more aggressive?** The design intent is "I kind of saw that coming" — retrospective clarity, not real-time alarm. Visual language matches: obvious in hindsight, noticeable but not demanding in the moment
   - **Accessibility:** The pulse animation on "high" is the primary signal; color is reinforcement. This passes the "no color alone" test for CVD (~8% of male players). The amber-to-red warmth shift alone would not be sufficient — motion is doing the heavy lifting

2. **PR Response interaction pattern.** This is a timed modal with a slider decision:
   - Scandal fires → screen dims, scandal card drops in with name + flavor text (the comedic beat lands here — needs a moment to breathe)
   - Below flavor text: a damage bar showing projected follower loss, and an Engagement spend slider for direct manipulation — as the slider moves, the damage bar visually shrinks
   - Timer bar drains across the card (10–15s). When empty, current slider position locks in. Doing nothing = full damage
   - **Timing note:** The timer should start after a brief beat (1–2s) where the card is visible but the slider isn't active yet. This gives the flavor text its comedic moment before the decision pressure begins. If the timer starts immediately, the player either skips the humor to optimize or reads the humor and loses decision time — both bad outcomes

3. **Aftermath display.** The proposal calls for "clear display of followers lost, platform affected, and current follower count." The delta should be shown explicitly ("−2,340 followers on InstaSham") with the number animating down. The player needs to see the number *move*, not just see a result. Per the trust signal principle: if they don't watch it change, they won't fully register the consequence.

4. **Scandal stacking suppression feedback.** Only the most severe scandal fires when multiple triggers hit — correct from a UX perspective, overlapping modals would be chaos. But the player should know a second trigger was suppressed. A brief secondary notification after the primary scandal resolves ("...and your audience noticed the Trend Chasing too") closes that information gap without adding screen complexity during the PR Response window.

5. **Non-blocking: information density during PR Response.** The scandal card is a modal over the main game screen. During those 10–15 seconds, the player needs: scandal name, flavor text, follower loss projection, engagement balance, slider, timer. That's six elements in a time-pressured context. Hierarchy must be strict: flavor text at top (read first, then ignore), damage number large and central, slider directly below, timer peripheral. Engagement balance shown near the slider so the tradeoff is visible without eye movement.

**For game-designer:**
- Open Question #4 ("session" definition) remains the blocking item before magnitude calculations can be finalized — the game-designer task for this is already created
- Open Question #3 (Clout upgrades for scandal reduction) is deferred to the Prestige Economy proposal, which is correct

---
# Review: game-designer

**Date**: 2026-04-04
**Decision**: Aligned

**Comments**

1. **Open Question #4 answered — "session" defined.** A session is the time since the app was last foregrounded. The system snapshots each platform's follower count on open; no scandal can push below that snapshot. This is the simplest definition that matches the player's mental model and has no edge cases with the offline rule.

2. **Design intent is preserved across reviews.** The architect's accumulator contract and the UX designer's visual treatment both respect the core design goal: scandals should feel like consequences the player understands in hindsight, not punishments from nowhere. The three-tier risk visualization (none → building → high) maps cleanly to the intended emotional arc — ambient awareness, not anxiety.

3. **PR Response timing note is correct.** The UX designer's suggestion to delay the timer by 1–2 seconds for the comedic beat is the right call. The satirical flavor text is doing emotional work — it reframes the loss as funny before the player has to deal with it strategically. If the timer starts immediately, the humor competes with the decision and both suffer.

4. **Scandal stacking suppression feedback is a good addition.** The secondary notification ("...and your audience noticed the Trend Chasing too") gives the player strategic information (you had two risk accumulators fire) without adding screen complexity during the PR Response. This teaches them that risk compounds, which reinforces diversification as a strategy.

5. **Open Question #3 correctly deferred.** Whether Clout upgrades reduce scandal impact is a prestige economy question, not a scandal system question. The scandal system should be designed to work without defensive Clout upgrades — they're an optional strategic layer on top, not a crutch the system depends on.

6. **All open questions resolved or deferred.** OQ #1 answered by ux-designer, OQ #2 answered by architect, OQ #3 explicitly deferred to future proposal, OQ #4 answered above. No blocking items remain. Proposal is ready for acceptance.
