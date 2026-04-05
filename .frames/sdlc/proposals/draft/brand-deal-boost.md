---
name: Brand Deal Boost
description: Defines the appearance, activation, duration, and economy integration of brand deals — a randomly-appearing, player-triggered engagement rate boost that rewards timed activation during viral bursts.
author: game-designer
status: draft
reviewers: [architect]
---

# Proposal: Brand Deal Boost

## Problem

The core game loop has one peak emotional moment: the viral burst — automatic, engine-driven, happens to the player. There is no equivalent moment that the player *causes*. Brand deals introduce a second class of boost moment with a fundamentally different relationship: the player sees it, decides when to act, and is rewarded for timing that decision well.

## Proposal

### 1. Core Mechanic

A brand deal offer appears periodically on screen. The player taps it to activate an engagement rate multiplier for a short duration. If a viral burst is active when the player taps, both boosts run simultaneously — the compound effect is the reward for good timing.

---

### 2. Appearance & Expiry

- Brand deal offers appear at a **random interval of 1–2 minutes** (POC value — to be tuned upward for shipped balance)
- The offer appears as a card in the bottom of the screen
- The offer **expires after ~90 seconds** if not tapped — enough time to feel patient, not enough to forget about it
- The expiry window is the decision: *is a viral imminent enough to be worth waiting, or do I take the guaranteed boost now?*
- Only one deal offer is live at a time. A new offer does not appear until the previous one has been tapped or has expired.

---

### 3. Activation & Boost

On tap:

- The engagement rate is multiplied by `brandDeal.boostMultiplier` (starting value: **3×**) for `brandDeal.durationMs` (starting value: **20 seconds**)
- The boost applies on top of the base engagement rate — and on top of any active viral burst multiplier
- During a compound moment (deal + viral simultaneously), total engagement rate = `base × viralMultiplier × dealMultiplier`

The "zooOOOOOOM" the player feels during a compound moment is the design target. A solo deal activation is satisfying. A timed compound activation is exceptional.

---

### 4. Unlock: Follower Thresholds

Brand deals do not appear until the player crosses a follower threshold. Thematically: brands don't approach micro-influencers. Mechanically: gating deals behind follower milestones ties them to progression and prevents early-game noise when the player is still learning the core loop.

Multiple unlock tiers are possible — deals could become more frequent or more lucrative at higher thresholds. Specific threshold values are a balance question to be resolved after the progression curve is more defined.

---

### 5. Economy Integration

Brand deals boost **engagement** — the fast workhorse currency. This is the same currency as viral burst.

The differentiation is not currency — it is **agency**. Viral burst happens to the player (engine-driven, automatic). Brand deals happen by the player (triggered, timed). Two peak moments, one passive and one active, in the same economy.

This is intentional. The compound stacking mechanic is only interesting if they share a currency — otherwise compounding two separate rates produces no single dramatic counter moment.

---

### 6. Static Data

`StaticData.brandDeal` (new section):

```typescript
brandDeal: {
  intervalMsMin: number;         // 60000 (1 min) — POC value
  intervalMsMax: number;         // 120000 (2 min) — POC value
  expiryMs: number;              // 90000 (90 sec)
  boostMultiplier: number;       // 3.0
  durationMs: number;            // 20000 (20 sec)
  unlockFollowerThresholds: number[]; // TBD — see Open Questions
}
```

All values are starting points for tuning without code changes.

---

### 7. The Engagement Line Check

Three-question test:
1. **Is this mechanic honest?** Yes — the offer is visible, the boost is real, the expiry is clear. No hidden behavior.
2. **Can the player quit without loss?** Yes — missing a deal has no penalty beyond the missed opportunity. No streak, no punishment.
3. **Is progression tied to engagement or just time?** Yes — the player who times deals well earns more than the player who clicks blindly. Skill matters.

Brand deals pass. The expiry creates urgency but not guilt — you missed an opportunity, you didn't *lose* anything.

---

## References

1. `.frames/sdlc/proposals/accepted/core-game-identity-and-loop.md` §6 — three-currency economy definition; engagement as fast currency
2. `.frames/sdlc/proposals/accepted/viral-burst-event-signal.md` — viral burst trigger, magnitude, and duration model; compound stacking target

## Open Questions

1. **Follower unlock thresholds** — at what follower counts do brand deals unlock, and does the deal frequency or magnitude increase at higher tiers? **Owner: game-designer** (resolve in balance pass once progression milestones are defined)
2. **Deal magnitude vs. viral burst magnitude** — should brand deal boost multiplier (3×) match, exceed, or fall below the viral burst multiplier (3–5×)? Starting symmetric but worth tuning once both are implemented. **Owner: game-designer** (balance pass)
3. **Signal and state design** — how does active brand deal state live alongside `GameState.viralBurst`? Is a parallel `brandDeal.active` state the right model, and how does the driver expose the deal offer and activation callback? ~~Owner: architect~~ **[RESOLVED — game-designer, 2026-04-05]** Three sub-questions answered:

   **Offer vs. active state distinction:** Both phases must be first-class game state. The offer phase is not a UX detail — it is the decision window, and that window is the mechanic. If the offer lives only in the UI, the game engine cannot reason about it (for cooldown resets, future achievements, or any mechanic that cares whether an offer is currently live). The architect should model two distinct sub-states: `offer` (visible, untapped, expiry countdown running) and `active` (tapped, boost running). These are separate states — a player who taps immediately transitions from `offer` to `active`; a player who lets it expire transitions from `offer` to null with no active state ever entered.

   **Expiry handling:** No game-meaningful event. Expiry is a missed opportunity, not a loss event. When an offer expires, the state clears and the cooldown resets to begin spawning the next offer. No residue, no penalty flag, no expiry callback to the UI beyond the state clearing. The UX's slow fade communicates impermanence without the game needing to broadcast a loss signal.

   **Compound moment detection:** The compound moment is a UX presentation concern, not a first-class game state. The game does not need a `compoundActive` flag. The UI detects `GameState.viralBurst.active !== null && GameState.brandDeal.active !== null` simultaneously and applies the compound visual treatment (badge pulses gold per the UX review). Keeping compound detection in the UI prevents coupling two independent systems at the engine level and preserves the independent tick logic for each. The total engagement rate during a compound moment (`base × viralMultiplier × dealMultiplier`) is simply the natural arithmetic result of both boosts being applied — no special engine awareness required.
4. **Card UI and expiry feedback** — how does the offer card communicate urgency as expiry approaches without triggering anxiety? How does activation feel distinct from the viral burst visual? **Owner: ux-designer**
   - **[RESOLVED — ux-designer, 2026-04-05]** See review below for full UX direction. Summary: slow opacity fade communicates impermanence without alarm; activation uses a stamp/snap animation + corporate green color lane (distinct from viral gold) + a persistent deal-active badge at the counter.

---
# Review: ux-designer

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

The mechanic is sound from a UX perspective. Passive peak (viral) + active peak (deal) is a strong emotional structure — and the compound moment rationale is exactly right. Two distinct feel targets in the same economy means the counter is the star of both, which keeps information hierarchy clean.

**OQ4 — Expiry without anxiety**

The anxiety in expiry timers comes from "hurry up" signals — countdown numbers, color alarms, urgent sound cues. None of those belong here. The deal is an opportunity, not a threat. The UX treatment should communicate *impermanence*, not *urgency*.

Direction: the card fades out slowly. In the final 30 seconds of the 90s window (final 33%), the card's opacity begins a linear ease from 1.0 → 0.4. At expiry, it fades completely (400ms final fade). No timer text. No countdown. No color shift. The player who's paying attention sees it getting dim and understands. The player who doesn't notice it expire didn't lose anything that mattered to them in that moment.

**OQ4 — Activation distinctness from viral burst**

Viral burst is: automatic, full-screen, gold, sustained 5–10s chaos. Brand deal activation must feel significant but *different* — triggered, finite, and thematically on-brand (it's a corporate transaction).

Activation choreography:
1. **Tap → card snaps shut** (scale 1.0 → 0.0, 200ms spring, ease-in). Sound: a satisfying dry "stamp" or paper-slap — contract-signed, not explosion.
2. **Engagement rate numeral shifts to corporate green** (distinct from viral gold — green reads "money/deal" culturally). Rate flare fires per purchase-feedback spec §5.1.
3. **Deal-active badge appears near the engagement counter** — small pill label, corporate green, "BRAND DEAL" text with a linear progress bar depleting over the 20s duration. This timer is *fine* once activated — the player has committed, they want to know how long they have to maximize it.
4. No vignette override, no particle burst, no background change. The visual footprint is intentionally smaller than viral. During a compound moment, the smaller footprint of the deal *adds to* the viral rather than competing with it.

**Compound moment signal**

When deal and viral are simultaneously active, the deal-active badge pulses gold (viral color bleeds into the badge) for the duration of the overlap. Small acknowledgment that something exceptional is happening without adding new layers to an already intense screen.

**Follow-up needed**

A full brand deal card UX spec is required before the engineer builds this — card anatomy, positioning, appearance animation, the full activation choreography, and the deal-active badge spec. I will produce that spec as a follow-up task.

This proposal has enough direction for the architect to design the state model (OQ3). The card spec can follow once OQ3 is resolved.
