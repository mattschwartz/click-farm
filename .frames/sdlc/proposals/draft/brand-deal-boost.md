---
name: Brand Deal Boost
description: Defines the appearance, activation, duration, and economy integration of brand deals — a randomly-appearing, player-triggered engagement rate boost that rewards timed activation during viral bursts.
author: game-designer
status: draft
reviewers: [architect, ux-designer]
---

# Proposal: Brand Deal Boost

## Problem

The core game loop has one peak emotional moment: the viral burst — automatic, engine-driven, happens to the player. There is no equivalent moment that the player *causes*. Brand deals introduce a second class of boost moment with a fundamentally different relationship: the player sees it, decides when to act, and is rewarded for timing that decision well.

## Proposal

### 1. Core Mechanic

A brand deal offer appears periodically on screen. The player taps it to activate an engagement rate multiplier for a short duration. If a viral burst is active when the player taps, both boosts run simultaneously — the compound effect is the reward for good timing.

---

### 2. Appearance & Expiry

- Brand deal offers appear at a **random interval of 3–5 minutes** (average, with variance)
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
  intervalMsMin: number;         // 180000 (3 min)
  intervalMsMax: number;         // 300000 (5 min)
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
3. **Signal and state design** — how does active brand deal state live alongside `GameState.viralBurst`? Is a parallel `brandDeal.active` state the right model, and how does the driver expose the deal offer and activation callback? **Owner: architect**
4. **Card UI and expiry feedback** — how does the offer card communicate urgency as expiry approaches without triggering anxiety? How does activation feel distinct from the viral burst visual? **Owner: ux-designer**
