---
name: Brand Deal Boost
description: Defines the appearance, activation, duration, and economy integration of brand deals — a randomly-appearing, player-triggered engagement rate boost that rewards timed activation during viral bursts.
author: game-designer
status: accepted
reviewers: []
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

1. **Follower unlock thresholds** — at what follower counts do brand deals unlock, and does the deal frequency or magnitude increase at higher tiers? ~~Owner: game-designer (resolve in balance pass once progression milestones are defined)~~ **[RESOLVED — game-designer, 2026-04-05]** Both frequency and magnitude increase at higher follower tiers, but on a slower ramp than other scaling curves. Brands reward sustained growth, not just crossing a single gate. Specific threshold values and per-tier multipliers remain a balance pass item once the progression curve is finalized.
2. **Deal magnitude vs. viral burst magnitude** — should brand deal boost multiplier (3×) match, exceed, or fall below the viral burst multiplier (3–5×)? ~~Starting symmetric but worth tuning once both are implemented. Owner: game-designer (balance pass)~~ **[RESOLVED — game-designer, 2026-04-05]** Brand deal boost should fall slightly below viral burst magnitude — still impressive, but clearly the lesser of the two peak moments. The viral burst is the ceiling; the deal is the strong but achievable floor. Starting value of 3× is a placeholder — tune down (toward ~2.5×) in balance pass once both are implemented and the compound feel can be validated.
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

---
# Review: architect

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

The mechanic is structurally sound and maps cleanly onto the existing engine patterns from viral burst. OQ3 is answered — the full state model and driver contracts are specified below.

---

## State Model

`GameState` gains a `brandDeal` field:

```typescript
interface BrandDealState {
  /**
   * Milliseconds remaining until the next offer spawns.
   * Ticks down only when offer is null and active is null.
   * Reset to a new random interval (drawn from StaticData.brandDeal) each time
   * an offer is resolved — whether tapped or expired.
   */
  ms_until_next_offer: number;

  /** Non-null when an offer is visible and awaiting player action. */
  offer: BrandDealOffer | null;

  /** Non-null while the deal boost is running. */
  active: ActiveBrandDeal | null;
}

interface BrandDealOffer {
  /** Epoch ms when the offer appeared. UI uses this to compute opacity for the expiry fade. */
  appeared_at: number;
  /** Epoch ms when the offer expires. Tick pipeline checks this each tick. */
  expires_at: number;
}

interface ActiveBrandDeal {
  /** Epoch ms when the deal was activated. */
  start_time: number;
  /** Total duration of the boost in ms. Snapshot from StaticData at activation time. */
  duration_ms: number;
  /** Engagement rate multiplier. Snapshot from StaticData at activation time. */
  boost_multiplier: number;
}
```

`offer` and `active` are mutually exclusive states. A player who taps transitions `offer → null, active → set`. A player who lets the offer expire transitions `offer → null` with `active` never set. The two fields cannot both be non-null.

---

## Driver Contract

`GameDriver` gains two new members:

```typescript
/**
 * Subscribe to brand deal offer events.
 * Fires once per offer at the moment the offer spawns — before notify().
 * Use this to trigger offer card entrance animation.
 */
onBrandDealOffer(listener: (offer: BrandDealOffer) => void): Unsubscribe;

/**
 * Activate the current brand deal offer (player tap).
 * - If no offer is live: no-op.
 * - If offer is live: transitions offer → null, active → set. Fires notify().
 * Safe to call from UI event handlers between ticks — JS single-threaded; tick loop cannot interrupt.
 */
activateBrandDeal(): void;
```

The driver detects the `null → offer` transition after `tick()` returns and fires `onBrandDealOffer` listeners synchronously before calling `notify()`, matching the pattern established for `onViralBurst`.

---

## Tick Pipeline Changes

New steps added after the existing viral burst steps (current step 12):

```
13. Brand deal — expiry check:
    a. If brandDeal.offer is non-null AND now >= offer.expires_at:
       → Clear offer. Reset ms_until_next_offer to random(intervalMsMin, intervalMsMax).
    b. Else if brandDeal.active is non-null AND now >= active.start_time + active.duration_ms:
       → Clear active. Reset ms_until_next_offer to random(intervalMsMin, intervalMsMax).

14. Brand deal — countdown and spawn:
    a. Evaluated only if offer is null AND active is null.
    b. Subtract deltaMs from ms_until_next_offer.
    c. If ms_until_next_offer <= 0 AND player.followers >= current unlock threshold:
       → Set offer = { appeared_at: now, expires_at: now + expiryMs }.
       → (Driver detects null → non-null transition and fires onBrandDealOffer before notify().)

15. Brand deal — engagement boost:
    a. Evaluated only if brandDeal.active is non-null.
    b. Apply boost_multiplier to this tick's engagement delta before committing.
    c. "Engagement delta this tick" at this step = base production + any viral burst bonus already added in step 11b.
       The deal multiplier therefore applies to the post-viral total, producing:
       base × viralMultiplier × dealMultiplier during compound moments — no special compound detection required.
```

**Engineering note on step 15:** The viral burst currently adds its bonus as an additive `bonus_rate_per_ms * deltaMs`. The brand deal multiplier must apply to the combined total (base + viral bonus), not to base alone. The simplest path: accumulate the tick's engagement delta in a local variable through steps 2 and 11b, then multiply that variable by `boost_multiplier` in step 15 before writing to `player.engagement`. The engineer should confirm whether this refactor fits within the current tick structure or propose an alternative contract-preserving approach.

---

## Follower Threshold Check

Brand deals are gated behind `StaticData.brandDeal.unlockFollowerThresholds`. For launch, this is a single-element array. The tick pipeline checks `player.followers >= unlockFollowerThresholds[0]` before spawning an offer. If the threshold is not yet met, `ms_until_next_offer` continues counting down — once the threshold is crossed mid-countdown, the next offer spawns on schedule (no reset needed).

The architecture accommodates future tiered variants (more frequent or more lucrative at higher follower counts) without structural changes — `unlockFollowerThresholds` is an array and the active tier is the highest threshold the player has crossed.

---

## Save Behavior

| Field | Persisted? | Notes |
|-------|-----------|-------|
| `ms_until_next_offer` | Yes | Timer survives reload |
| `offer` | No | Transient; re-spawns after countdown |
| `active` | No | 20s boost; not worth restoring across reload |

Adding `brandDeal` to `GameState` requires a save version bump. The engineer should bump `CURRENT_VERSION` from 2 → 3 and implement `migrateV2toV3` injecting `{ ms_until_next_offer: 0, offer: null, active: null }` as the default for pre-brandDeal saves. On `load()`, if a deserialized state has a non-null `offer` or `active`, clear them before returning to the driver.

---

## Summary of Code Changes

| File | Change |
|------|--------|
| `types.ts` | Add `BrandDealState`, `BrandDealOffer`, `ActiveBrandDeal`; extend `GameState.brandDeal`; extend `StaticData.brandDeal` (already partially defined in proposal §6) |
| `game-loop/index.ts` | Add steps 13–15 to `tick()`; export brand deal spawn/expiry logic as testable pure helpers; refactor engagement delta accumulation to support step 15 multiplier |
| `driver/index.ts` | Add `onBrandDealOffer` and `activateBrandDeal` to `GameDriver` interface and `createDriver` implementation; detect `null → offer` transition after `tick()` |
| `save/index.ts` | Bump version 2 → 3; implement `migrateV2toV3`; clear transient `offer` and `active` on load |
| `static-data/` | Add remaining `brandDeal` fields (interval, expiry, unlock thresholds) alongside the fields already specified in §6 |
