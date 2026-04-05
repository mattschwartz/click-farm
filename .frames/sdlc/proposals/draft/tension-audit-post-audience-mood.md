---
name: Tension Audit — Post-Audience-Mood Felt Stakes
description: Assesses whether the game has sufficient felt stakes after Audience Mood replaced Scandals, and takes a written position on whether to add a consented-risk mechanic.
author: game-designer
status: draft
reviewers: [game-designer]
---

# Proposal: Tension Audit — Post-Audience-Mood Felt Stakes

## Problem

Replacing Scandals with Audience Mood removed active follower loss from the game. Growth is now monotonically non-decreasing: retention ∈ [floor, 1.0] scales gains downward but never subtracts. This was the correct ethical call — loss-aversion pain is 2–2.5× gain pleasure, the four Scandal-failure mechanisms (modal interrupt, symptom-not-cause, unrecoverable loss, single-signal overload) were demonstrably producing dread instead of recognition, and dark-pattern avoidance is a named design principle.

But the migration may have over-corrected. The game currently has **no moment where the player feels "something I built is at risk."** Audience Mood's retention drag is a slow-down, not a stake. The Scandals' dramatic "oh no" beat is gone and has not been replaced.

This audit asks: does the game have enough felt stakes now, or is an additional, carefully-scoped consented-risk mechanic needed?

The output is a written design position — not necessarily a new mechanic — so future balance passes and playtests have a stated target.

## Proposal

### 1. Audit of Current Negative Pressure

The game today carries negative pressure through four mechanisms:

| Mechanism | What it is | Stake type | Felt as |
|---|---|---|---|
| Audience Mood retention drag | Per-platform multiplier in [floor, 1.0] | Opportunity cost | Slow-down, "my gains are smaller than they should be" |
| Algorithm state misalignment | Content mix penalized during unfavored states | Opportunity cost | "My mix is wrong this shift" |
| Rebrand timing | Choose when to wipe for Clout | Voluntary sacrifice | "Is this the right moment?" |
| Content Fatigue per platform-generator | Overposting same generator on same platform | Opportunity cost (specific) | "Audience is bored of my selfies" |

**All four are opportunity costs, not losses.** None of them can send a player backwards. None of them produce a moment where the player says "something I built just went away."

### 2. Assessment: Is This Sufficient?

**Position: YES — the game has enough felt stakes without adding a risk-of-loss mechanic.** Three reasons:

**(a) Opportunity cost at 40–60% efficiency is large.** The Audience Mood proposal names the tuning target: a player ignoring mood runs at ~40–60% efficiency; a player reading mood runs at ~90%+. A 40-point efficiency delta across a 30-minute run is huge — large enough to be felt as pressure without requiring loss to communicate. Clicker players read multipliers reflexively. When ×0.5 shows on a platform card, that *is* a stake.

**(b) The strategic layer is the tension layer.** Click Farm's tension does not need to come from loss. It can — and does — come from decisions:
- **Rebrand timing** (task #94): "cash out at 100k or push to 500k" is a live strategic tension, especially R10+.
- **Gigs**: time-boxed offers create moment-to-moment pressure without loss.
- **Algorithm states**: re-mixing content in response to state shifts is a skill expression.
- **Platform diversification vs. specialization**: genuine strategic fork, not a trap.
- **Creator Kit choices**: which per-run equipment to stack.

These are the tension mechanisms. The player is never *losing* — they are *choosing*. That is the correct shape for this game.

**(c) Clicker-genre players do not require loss stakes.** Cookie Clicker, the reference game, has no active loss. Grandmapocalypse is optional, cosmetic, and consented — the player opts in by clicking a button, and it can be paused. The genre contract is: accumulation is safe, depth comes from optimization. Click Farm should honor that contract. The satire does not require loss to land — the late-game generators (AI Slop, Deepfakes, Algorithmic Prophecy) land the satirical beat through escalation, not punishment.

**The current tension level is sufficient. The game is done adding negative pressure.**

### 3. Risks of This Position (named explicitly)

A responsible audit names the ways this position could be wrong:

1. **Playtest may reveal the game feels "flat."** If players describe the game as "numbers go up, I click a lot, nothing happens to me" — that is a stakes problem. If this feedback emerges, §4 sketches a safety-valve mechanic.
2. **Retention drag may be invisible at low tuning.** If the retention floor is tuned too high (e.g., 0.7+), the drag is never large enough to feel like pressure. This is a balance problem, not a structural one — tune the floor down before considering new mechanics.
3. **Late-game may thin out.** Once the player owns Engagement Boost L3 and most Clout upgrades, the strategic layer may feel solved. If R15+ feels routine, the tension gap is real. But this is a late-game content problem (see task #93), not a loss-mechanic problem.

**If playtest validates any of these risks, the response is: tune retention floor down, enrich late-game content, and/or file a follow-up design. It is NOT: add a loss mechanic.**

### 4. Safety Valve — A Consented-Risk Sketch (only if stakes gap proves real)

If playtest later proves the "flat" concern is real, here is the shape any new tension mechanic must take. **This is NOT being proposed today** — it is a parking-lot sketch so a future designer does not re-derive the constraints.

**Name (working): Risky Post**

**Mechanic:** An optional player action on any platform. The player elects to post off-trend or off-brand for a shot at a disproportionate viral burst. Outcome is stochastic:
- ~60%: modest extra gain (1.5–2× normal)
- ~30%: neutral outcome (normal gain)
- ~10%: the audience reacts badly — that platform's retention drops by a fixed, tempered amount (e.g., −0.2 retention, recoverable in ~5 corrective posts)

**Why this passes the engagement line:**
- **Player-initiated.** The player clicks a specific "Risky Post" button. No surprise fires.
- **Reversible.** The downside is a retention hit, recoverable through normal play. Follower count never drops.
- **Offline-safe.** The action only exists when the player is active. No risk resolves while away.
- **Honest.** The odds are posted on the button. The player can read "60% / 30% / 10%" before acting.
- **Skill-tied.** Best play is to Risky Post during favorable Algorithm states, amplifying strategy.
- **Three-question test:** honest ✓, quittable ✓, skill-tied ✓.

**Why this avoids all four Scandal failure mechanisms:**
- Not modal (inline button, no screen dim, no timer).
- Treats cause (player choice), not symptom.
- Downside is tempered and recoverable, never unrecoverable loss.
- Single clear signal (the button and its posted odds), not six-trigger overload.

**Variable-ratio caution:** The stochastic payout risks a variable-ratio schedule. Two guardrails:
- The base core loop must remain strictly better than Risky Post in expected value when the player is playing well. Risky Post is a choice *against* optimal, not a replacement for it.
- Daily/session use caps are NOT added — that would introduce FOMO. Instead, Risky Post outcomes diminish under repeated identical use in a session, so the mechanic cannot become the core loop.

**Decision today: we do not ship this.** The above exists so that if task #88's balance playtest or later playtest surfaces a genuine stakes gap, the team has a pre-vetted shape to evaluate rather than reopening the whole question.

### 5. What This Locks In

- **Position:** the game has sufficient felt stakes through opportunity cost + strategic decisions + rebrand timing. No additional loss mechanic is being added today.
- **Target retention drag efficacy:** 40–60% efficiency for ignored mood vs. 90%+ for managed mood — this is the stakes delta.
- **The four guardrails for any future tension mechanic:** player-initiated, reversible, offline-safe, honest.

### 6. What This Leaves Open

- Whether playtest will validate this position (empirical, not decidable here).
- Exact retention-floor value — separate balance task.
- Whether task #93 (late-game content arc) needs a dedicated stakes pass — that proposal's call to make.

## References

1. `.frames/sdlc/proposals/accepted/audience-mood-retention.md` — the replacement system, retention model, 40–60% tuning target
2. `.frames/sdlc/proposals/accepted/scandals-and-follower-loss.md` — the superseded system and the four failure mechanisms being avoided
3. `.frames/sdlc/proposals/accepted/core-game-identity-and-loop.md` — §8 The Engagement Line, three-question test
4. `.frames/sdlc/proposals/draft/rebrand-cadence-intent.md` — rebrand timing as a source of strategic tension
5. `.frames/sdlc/proposals/accepted/gigs-system.md` — time-boxed decisions as tension
6. `.frames/sdlc/proposals/accepted/algorithm-mood-visibility.md` — algorithm state shifts as strategic pressure

## Open Questions

1. Should we establish a playtest checkpoint (e.g., after task #88 balance pass lands) to explicitly test "does this game feel flat?" against real players? **Owner: game-designer**
2. Is the Risky Post sketch concrete enough to file as a parking-lot reference, or should it be deleted from this proposal to avoid implying future implementation? **Owner: game-designer / user**
3. Does the retention floor value (tuned in Audience Mood: 0.3–0.5 range) need to be explicitly named now to anchor the 40–60% efficiency target, or does it belong in a pure balance task? **Owner: game-designer**
