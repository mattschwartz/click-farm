---
name: Viral Burst Event Signal
description: Defines the trigger condition, signal transport, and engagement application model for the viral burst event — the emotional peak of the core game loop.
author: architect
status: draft
reviewers: [engineer]
---

# Proposal: Viral Burst Event Signal

## Problem

The core game screen UX spec (§9) defines an extensive visual choreography for "going viral" — the game's peak emotional beat. That choreography assumes the engine signals a `ViralBurstPayload` with four fields: `source_generator_id`, `source_platform_id`, `duration_ms`, and `magnitude`. No such signal exists in the current game loop or driver. Task #29 (Core Game UI) has a dormant `viralEvent` hook waiting to be driven.

Three architectural questions were unresolved:

1. What simulation state triggers a viral burst?
2. How does the signal travel from the tick pipeline to the UI?
3. Is `magnitude` applied instantaneously or amortized across `duration_ms`?

## Proposal

### 1. Trigger: Per-tick probabilistic, gated by active-play cooldown and algorithm affinity

Each tick, the game loop evaluates whether to fire a viral burst. The trigger has three gates, all of which must pass:

**Gate 1 — Cooldown (hard floor)**
A viral cannot trigger until `viralBurst.active_ticks_since_last >= minCooldownTicks`. At 100ms/tick, `minCooldownTicks = 9000` = 15 minutes of active play. "Active play" is defined as any tick executed by the running driver — offline time does not accumulate ticks, and therefore does not count toward the cooldown.

**Gate 2 — Probability roll**
Each tick passing Gate 1 rolls `Math.random() < p_viral`. `p_viral` is drawn from `StaticData.viralBurst` based on game phase:

| Phase | Proxy condition | Target frequency | `p_viral` (approximate) |
|-------|----------------|-----------------|------------------------|
| Early | `tutorials` not unlocked | 45–60 min between virals | ~1/27,000 per tick |
| Mid | `tutorials` unlocked, `viral_stunts` not owned | 20–30 min between virals | ~1/15,000 per tick |
| Late | `viral_stunts` owned | 15–20 min between virals | ~1/10,500 per tick |

Generator-unlock state is the phase proxy because it is already available in `GameState.generators` with no additional fields. The specific `p_viral` values above are starting points; the engineer places them in `StaticData.viralBurst` so the game-designer can tune without code changes.

**Gate 3 — Algorithm affinity boost**
If the top-producing generator's effective algorithm modifier exceeds `viralBurst.algorithmBoostThreshold` (default: 1.5), `p_viral` is multiplied by `viralBurst.algorithmBoostMultiplier` (default: 2.0). This creates the "going viral because the algorithm likes your content right now" feel without fundamentally changing the mechanism.

**Source selection (at fire time)**

- `source_generator_id` = the generator with the highest effective engagement rate at the tick of trigger, computed via the existing `computeAllGeneratorEffectiveRates`.
- `source_platform_id` = the unlocked platform with the highest `content_affinity[source_generator_id]`, read from `StaticData.platforms`.

If no generators are producing (all counts = 0), no viral fires regardless of probability — a viral burst requires active content production.

---

### 2. Signal transport: `GameState.viralBurst` + driver `onViralBurst` callback

**State shape**

`GameState` gains a `viralBurst` field:

```typescript
interface ViralBurstState {
  /** Active-play ticks accumulated since the last viral ended (or run start). */
  active_ticks_since_last: number;
  /** Non-null while a viral is in progress. */
  active: ActiveViralEvent | null;
}

interface ActiveViralEvent {
  source_generator_id: GeneratorId;
  source_platform_id: PlatformId;
  /** Epoch ms when the viral started. */
  start_time: number;
  /** Total duration of the event (ms). 5000–10000. */
  duration_ms: number;
  /** Total bonus engagement the event produces above normal production. */
  magnitude: number;
  /** Precomputed: magnitude / duration_ms. Applied per ms in tick. */
  bonus_rate_per_ms: number;
}
```

**Payload to the UI** (exposed via the driver callback — internal fields stripped):

```typescript
interface ViralBurstPayload {
  source_generator_id: GeneratorId;
  source_platform_id: PlatformId;
  duration_ms: number;
  magnitude: number;
}
```

This matches the UX spec §9.1 exactly.

**Tick pipeline changes**

The `tick()` function gains a sixth step in its pipeline, executed after step 9 (algorithm advance):

```
10. Advance active_ticks_since_last by 1.
11. If viralBurst.active is non-null:
    a. If now >= active.start_time + active.duration_ms → clear active, done.
    b. Else → add active.bonus_rate_per_ms * deltaMs to player.engagement.
12. Else (no active viral):
    a. Evaluate trigger gates 1, 2, 3.
    b. If all pass → construct ActiveViralEvent, set viralBurst.active, reset active_ticks_since_last to 0.
```

Note: engagement added in step 11b is on top of normal engagement (step 2 in the existing pipeline). The counter ticks at `normal_rate + bonus_rate` — the speed increase is real, not cosmetic.

**Driver changes**

`GameDriver` gains:

```typescript
/** Subscribe to viral burst events. Fires once per event at the moment of trigger. */
onViralBurst(listener: (payload: ViralBurstPayload) => void): Unsubscribe;
```

The driver detects the `null → active` transition after `tick()` returns and fires all `onViralBurst` listeners synchronously before calling `notify()`. This ensures UI choreography starts from the correct frame.

**Save behavior**

`viralBurst.active` is NOT persisted across saves. On `load()`, if the deserialized state has a non-null `active`, it is cleared before the state is returned to the driver. `active_ticks_since_last` IS persisted so the cooldown survives a reload.

---

### 3. Magnitude: engine-driven amortized rate boost

`magnitude` is computed at trigger time as:

```
boost_factor = random(magnitudeBoostMin, magnitudeBoostMax)   // 3.0–5.0 per UX §9.2
magnitude = total_engagement_rate_per_ms * duration_ms * (boost_factor - 1)
bonus_rate_per_ms = magnitude / duration_ms
                  = total_engagement_rate_per_ms * (boost_factor - 1)
```

During the viral, total engagement rate = `normal_rate + bonus_rate = normal_rate * boost_factor`. This directly produces the "3–5× normal rate" the UX spec requires — the counter acceleration is the real production rate, not an animation over a pre-applied lump sum.

The UX's counter "monotonic-forward, never jumps backward" contract is preserved because engagement accumulates continuously.

---

### 4. Static data additions

`StaticData.viralBurst` (new section):

```typescript
viralBurst: {
  minCooldownTicks: number;         // 9000 (15 min at 100ms/tick)
  baseProbabilityEarly: number;     // ~0.000037
  baseProbabilityMid: number;       // ~0.000067
  baseProbabilityLate: number;      // ~0.000095
  algorithmBoostThreshold: number;  // 1.5
  algorithmBoostMultiplier: number; // 2.0
  durationMsMin: number;            // 5000
  durationMsMax: number;            // 10000
  magnitudeBoostMin: number;        // 3.0
  magnitudeBoostMax: number;        // 5.0
}
```

All values are starting points for the game-designer to tune without code changes.

---

### 5. Summary of code changes

| File | Change |
|------|--------|
| `types.ts` | Add `ViralBurstState`, `ActiveViralEvent`, `ViralBurstPayload`; extend `GameState` and `StaticData` |
| `game-loop/index.ts` | Add steps 10–12 to `tick()`; export viral trigger logic as a testable helper |
| `driver/index.ts` | Add `onViralBurst` to `GameDriver` interface and `createDriver` implementation |
| `save/index.ts` | Clear `viralBurst.active` on load; persist `active_ticks_since_last` |
| `static-data/` | Add `viralBurst` section with tuning values |

---

## References

1. `.frames/sdlc/ux/core-game-screen.md` §9 — visual choreography contract; §9.1 payload definition; §9.3 tick-rate drama requirement; §9.5 frequency target
2. `.frames/sdlc/architecture/core-systems.md` — existing tick pipeline contract, `GameState` shape, `StaticData` interface, driver boundary
3. `client/src/game-loop/index.ts` — current tick implementation; pipeline steps being extended
4. `client/src/driver/index.ts` — current driver interface; `onViralBurst` being added

## Open Questions

1. **Frequency tuning values** — the `p_viral` values in §1 are architectural starting points. Do the per-phase probabilities and `algorithmBoostMultiplier` produce the target frequencies in practice? **Owner: game-designer** (confirm via balance pass after engineer implements)
   - Game-designer input incorporated: hard floor 15 min confirmed; frequency bands (early 45–60 min, mid 20–30 min, late 15–20 min) confirmed; active-play-tick tracking confirmed.

2. **Tick signature** — the existing tick implementation has already extended the architecture contract with a `now` argument (see comment in `game-loop/index.ts`). The viral burst extension does not change the signature further. The architect contract update for `now` is still pending. **Owner: architect** (update `core-systems.md` interface contract in the same pass as this implementation).

---
# Review: game-designer

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

The trigger model is sound from a player psychology standpoint. Three notes for the team to preserve during implementation and tuning:

1. **OQ1 is answered — close it.** The frequency bands (early 45–60 min, mid 20–30 min, late 15–20 min) and the 15-minute active-play cooldown were confirmed in the prior design session and incorporated into this proposal. No further game-designer input is required on OQ1 before build — this is now an engineering tuning pass post-implementation.

2. **Algorithm affinity 2× boost is intentional design, not just an architectural feature.** The `algorithmBoostMultiplier: 2.0` effectively doubles viral frequency for players who have optimized their algorithm state. This is the reward for engaging deeply with the algorithm system — it's intrinsic motivation, not a dark pattern. It MUST NOT be tuned down to "fix" a perceived frequency problem without raising the question to the game-designer first. The doubled frequency is the point.

3. **Duration (5–10 seconds) is correct for the genre.** Short and urgent is the right feel — the emotion is "holy shit, I'm going viral right now," not "I am basking in virality." The UX choreography carries the weight; the engine just needs to deliver the real engagement boost in that window. The 3–5× amortized rate during that window is a meaningful economic reward at any game phase.
