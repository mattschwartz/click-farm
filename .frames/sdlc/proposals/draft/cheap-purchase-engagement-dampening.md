---
name: Cheap Purchase Engagement Dampening
description: Dampens engagement/sec contribution from purchases that are trivially cheap relative to current income, so outdated-tier generators stop distorting the late-game curve.
author: game-designer
status: draft
reviewers: [architect, engineer, ux-designer]
---

# Proposal: Cheap Purchase Engagement Dampening

## Problem

Each purchased generator unit contributes `base_rate × level_multiplier × algorithm_mod` to engagement/sec. Because `level_multiplier` compounds super-exponentially (`2^(level²/5)`, per the accepted Level Multiplier Curve), an outdated-tier generator's **per-unit rate contribution** stays large indefinitely — even when its **purchase cost** has become trivial relative to current income.

Concrete symptom: at 13B/sec income, buying a single 20K-cost unit of an outdated generator still produces a visible, substantial jump in engagement/sec. In economic terms the purchase is noise (0.00015% of one second's income). In rate terms the purchase is a real bump. The two are decoupled.

**What this breaks:**

- **The multiplier loses meaning.** Engagement/sec is the game's primary progress signal. Right now it measures "total button presses across all time" more than "current strategic position." Buying outdated inventory inflates the number without reflecting actual progression.
- **It rewards housekeeping over strategy.** Sweeping up cheap old generators is mechanically optimal because per-unit returns don't decay with relative obsolescence. The efficient late-game move is partly "remember to farm old tiers," which is not the feeling the game should be producing.
- **The designed "always buy the newest tier you can afford" intent is undermined.** The generator balance proposal explicitly says later generators are less efficient per-engagement-spent, and that players should always want the newest tier. That intent assumes purchase-cost is the binding constraint. When cheap purchases give full-strength rate bumps, that constraint loosens.

This is not a balance-knob tweak. The underlying formula decouples cost from contribution, and the decoupling gets worse as the player progresses. It needs a structural fix.

## Proposal

**Introduce a relevance-dampening factor on per-unit engagement contribution, scaled by the purchase cost's weight relative to current income.**

Specifically: when computing the engagement/sec contribution of a purchased generator unit, apply a dampening factor `D` where `D` approaches 1.0 when the purchase cost is meaningful relative to current income, and approaches a small floor (e.g. 0.05) when the purchase cost is trivial.

### Target Formula (proposed shape, not final)

```
D(cost, income_per_sec) = clamp(cost / (income_per_sec × T), floor, 1.0)
```

Where:
- `cost` — the next-unit purchase cost for this generator at its current owned count
- `income_per_sec` — player's current total engagement/sec
- `T` — a "relevance window" in seconds. If a purchase costs less than `T` seconds of current income, it starts to dampen. Suggested starting value: **T = 30 seconds**.
- `floor` — the minimum contribution a unit can provide. Suggested starting value: **0.05** (5% of full contribution).

**Effective per-unit rate:** `base_rate × level_multiplier × algorithm_mod × D`

### Behavior Under This Formula

| Scenario | cost | income/sec | cost/(income×30) | D | Contribution |
|---|---|---|---|---|---|
| Fresh tier purchase | 20K | 1K | 0.67 | 0.67 | 67% |
| At-tier purchase | 20K | 500 | 1.33 → clamp | 1.00 | 100% |
| Slightly outdated | 20K | 100K | 0.0067 | 0.05 | 5% (floored) |
| Badly outdated | 20K | 13B | 5e-8 | 0.05 | 5% (floored) |
| Endgame tier | 20M | 13B | 5e-5 | 0.05 | 5% (floored) |

The floor ensures purchasing never produces nothing — the "sweep the board" completionist impulse is still acknowledged, just no longer economy-distorting.

### Why This Shape

- **Cost-relative, not tier-relative.** Tiering (e.g. "generators more than 2 tiers below current are dampened") requires a concept of "current tier" that the code doesn't have and would need to maintain. `cost / income` is already derivable from existing state, with no new fields.
- **Single tuning knob.** `T` (the relevance window) is the one number to tune. Floor is a second knob but should be set once and left alone.
- **Honest.** The dampening factor is a direct expression of "how much does this purchase actually matter to my economy right now." It maps the aesthetic ("this purchase should feel like progress iff it's not trivial") to a mechanic that computes it.
- **Preserves intrinsic motivation.** The 5% floor means a cheap purchase still does *something* — the player isn't punished for exploring or completing, just not rewarded as if they'd made a meaningful investment.

### What This Does NOT Change

- Cost formulas (buy cost `ceil(base × 1.15^count)`, upgrade cost `ceil(base × 4^(level-1))`) — unchanged.
- Level multiplier curve — unchanged.
- Algorithm state modifiers and trend sensitivity — unchanged.
- Follower conversion (FCR) — unchanged, but note that FCR is applied to dampened engagement, so follower gain from cheap purchases dampens too. **This is intended.** Followers should track meaningful progress, same as engagement/sec.
- Per-click manual engagement — out of scope for this proposal (clicks don't have a "purchase cost").

### What This Locks In

- Per-unit engagement contribution is modulated by a cost/income relevance factor.
- Cheap purchases contribute a capped minimum (floor), not zero.
- Tuning is concentrated in one constant (`T`).

### What This Leaves Open

- Exact values of `T` and `floor` — design targets, to be tuned via playtesting.
- Whether the dampening should apply to **newly purchased units only** or to **all owned units continuously** (see Open Question #1 — this is the biggest design question here).
- Whether the UI should communicate the dampening to the player (see Open Question #2, UX).
- Whether upgrade actions should be dampened similarly (see Open Question #3).

### Player Psychology & Aesthetic

- **Target feeling:** "My progress signal tracks my actual strategic position." The number should mean something.
- **Target feeling (secondary):** "Buying a cheap leftover is fine but it's clearly housekeeping, not progress." The player should feel the difference without being told.
- **Intrinsic motivation:** Preserved — the core loop (earn, invest in the frontier, watch rates climb) is unchanged. What's removed is a degenerate optimization (farm old tiers) that was a shortcut around the designed loop.
- **Engagement line:** This proposal *softens* a number-go-up reinforcement, not hardens one. It's a step away from the compulsion edge, not toward it.

## References

1. `.frames/sdlc/proposals/accepted/generator-balance-and-algorithm-states.md` — per-unit rate formula, cost scaling, design intent ("always want the newest tier you can afford")
2. `.frames/sdlc/proposals/accepted/level-multiplier-curve.md` — `2^(level²/5)` super-exponential curve that creates the decoupling
3. `.frames/sdlc/proposals/accepted/generator-level-growth-curves.md` — recent tuning of generator growth at the level dimension
4. `client/src/game-loop/index.ts` — where per-unit engagement contribution is computed
5. `client/src/static-data/index.ts` — generator base_rates and costs

## Open Questions

1. **Does dampening apply to new purchases only, or to all owned units on an ongoing basis?**
   Option A: Dampening is computed **at purchase time** and baked into that unit's contribution permanently. Simple, stable, but allows players to "lock in" full-rate contribution by buying early, then income grows past it and the old units keep producing at full rate — which is the current behavior for already-owned units.
   Option B: Dampening is computed **continuously** based on current cost and current income. Every tick, each generator's contribution is re-evaluated. This fully solves the problem but means a player's passive income can fluctuate as their mix shifts — and the early-game units they bought honestly get dampened later, which may feel unfair.
   Option C: Hybrid — dampening applies to purchases, and a separate "obsolescence" curve on owned-unit rates kicks in at much wider thresholds (e.g. if a generator's cost is <0.1% of current income, all its units decay to floor). Gentler than B, still closes the loophole of A.
   **Owner: game-designer + architect.** This is the pivotal choice. My lean is **A for simplicity in v1**, accepting that pre-existing hoards keep producing at full rate. Revisit if playtesting shows late-game engagement still feels inflated.

2. **Should the dampening be visible to the player?**
   If a purchase contributes only 5% of "normal," should the UI say so? Showing it risks the player feeling cheated ("why did I only get 5%?"). Hiding it risks the player not understanding why their purchase didn't bump the rate. Possible middle ground: a subtle visual tell on the buy button (e.g. dimmed "trivial purchase" badge) when `D < 0.5`.
   **Owner: ux-designer.**

3. **Should upgrades be dampened the same way?**
   Upgrading a low-tier generator when its upgrade cost is trivial relative to income produces a large absolute rate bump via the `2^(level²/5)` curve. Same underlying pathology. Do we extend the dampening to upgrades, or leave upgrades alone? My lean: **extend, using upgrade cost as the input to `D` in place of buy cost**, because the pathology is identical. But this expands the scope and may need separate tuning.
   **Owner: game-designer.**

4. **Does this interact badly with algorithm states?**
   In a favorable algorithm state, engagement/sec is temporarily inflated. Does that mean purchases made during a favorable state are dampened *more* than they "should" be? Yes, mechanically. Is that a problem? Possibly — it could dissuade buying during good states, which is counter-intuitive. Mitigation: compute `D` against a rolling-average income rather than instantaneous, or against income at the neutral algorithm state. Needs architect input on feasibility.
   **Owner: architect + game-designer.**

5. **Tuning values for `T` and `floor`.**
   Starting values proposed: `T = 30s`, `floor = 0.05`. These are guesses. Need playtesting to confirm they produce the intended feel. **Owner: game-designer** (post-implementation, via playtesting).

---
# Review: architect

**Date**: 2026-04-05
**Decision**: Request for Comment

**Comments**

The design intent is sound and the `cost / (income × T)` shape is a good fit — it leans on state the system already has and keeps the tuning surface narrow. My concerns are structural, not directional. Three of the four need resolution in the proposal body before an engineer can plan or build; the rest is supplemental architectural guidance.

**Blocking — needs designer resolution before plan:**

1. **Open Question #1 (A/B/C) forces a data-model decision, not just a behavioral one.** Each option has a different cost profile:

   - **Option A (bake D at purchase time)** is not as simple as it reads. A generator's units accumulate at *different D values* across purchase history. You can't store a single D per generator without defining an aggregation rule. Cleanest form I see: a per-generator **`avg_D`** scalar, updated on each purchase as
     ```
     avg_D_new = (count_old × avg_D_old + 1 × D_new) / (count_old + 1)
     ```
     Effective rate becomes `count × base_rate × level_multiplier × avg_D × algoMod × clout × kit`. One new scalar field on `GeneratorState`, no per-unit history, tick hot-path structurally unchanged. Upgrades do not retro-touch `avg_D` (which matches the Option A semantic the designer described).

   - **Option B (continuous recompute)** introduces a bootstrapping problem: D's input is `income_per_sec`, which is itself the sum of per-generator effective rates — each of which depends on D. The engineer will pick silently if we don't name it. Resolvable (e.g. use prior-tick total or the undampened sum), but it is a required naming. B also changes the semantic of "cost" for existing units: a level-1 selfie's dampening depends on the *next* selfie's price, which is weird.

   - **Option C (threshold step-function on ownership)** is architecturally very close to A-with-`avg_D` plus a periodic `avg_D` decay when `cost < threshold × income`. It is a natural v2 extension of A, not a separate architecture.

   **Recommendation: Option A, implemented as per-generator `avg_D`.** It localizes change to the purchase path, leaves the tick hot-path shape identical, and keeps the door open to Option C as a follow-up without a data-model rewrite. I think the designer's lean toward A is right; I am naming the data-model form so the engineer doesn't have to infer it.

2. **Open Question #4 (algorithm-state inflation) has a clean non-rolling answer.** Compute D against *neutral-algorithm income* — i.e. the sum of `count × base_rate × level_multiplier × clout × kit` without `algoMod`. No rolling window, no new time-series state, deterministic and cheap (already computable from current state inside `computeAllGeneratorEffectiveRates`). This eliminates the "dampened more during favorable states" artifact the designer flagged, without introducing averaging infrastructure. I recommend adopting this as the income basis and resolving Q4 directly in the proposal body.

3. **Downstream coupling to viral burst and scandal accumulators — please confirm intent.** `computeGeneratorEffectiveRate` feeds three other subsystems beyond engagement accumulation:
   - **Viral burst** — top-generator selection and magnitude computation use effective rates. Dampening old-tier units will shift which generator is "top" and reduce bonus magnitude on old-heavy loadouts.
   - **Scandal accumulators** — `content_burnout`, `hot_take_backlash`, `fact_check`, and follower-distribution-driven accumulators (`platform_neglect`, `growth_scrutiny`) all key off per-generator shares or follower distribution, which ride on these rates. Dampening will reduce old-generator shares and therefore accumulator pressure from old-tier farming.
   - **Follower conversion** — the proposal already names this and says "intended." Good.

   I believe the viral-burst and scandal-accumulator effects are *also* intended — "engagement/sec should track current strategic position" naturally extends to "scandals should track current strategic position." But it silently shifts scandal trigger frequencies for players with heavy old-tier stacks, and the designer should confirm that is the desired behavior. If confirmed, a one-line note in the "What This Does NOT Change" / "What This Also Changes" sections would close the loop.

**Non-blocking — architectural notes:**

- The `avg_D` field is the only schema change implied by Option A. No migrations needed — existing saves default to `avg_D = 1.0` (undampened), which is behaviorally correct for pre-existing stacks and matches the designer's stated acceptance that "pre-existing hoards keep producing at full rate."
- One tuning knob (`T`) and one floor (`floor`) belong on a new `engagementDampening` config block in `static-data/index.ts` — not as magic numbers in the purchase flow. Trivial but worth naming.
- The dampening factor should be computed in one helper — e.g. `computeDampeningFactor(cost, neutralIncomePerSec, config)` — so viral/scandal debugging can introspect it without re-deriving.

**Summary of what I need to re-review:**

- Q1 answered with A/B/C named explicitly; if A, accept or push back on `avg_D` as the storage form.
- Q4 answered — ideally by adopting neutral-algorithm income as D's basis.
- Confirmation (or correction) on the viral-burst and scandal-accumulator coupling behavior.

Once those land, I can approve and decompose this into architecture notes + an engineer build task.
