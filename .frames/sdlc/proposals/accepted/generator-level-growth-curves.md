---
name: Generator Level Growth Curves
description: Resolves the runaway upgrade ROI that drives engagement to Infinity by restoring cost/reward parity, imposing a generator level cap, and adding a runtime safety clamp.
author: game-designer
status: accepted
reviewers: []
---

# Proposal: Generator Level Growth Curves

## Problem

The current per-generator economy is broken. Two formulas fall out of step as levels rise:

- **Reward:** `levelMultiplier(L) = 2^(L² / 5)` — polynomial-in-exponent (super-exponential).
- **Cost:**   `upgradeCost(L) = base × 4^(L − 1)` — plain exponential (`≈ 2^(2L)`).

Because the reward's exponent is quadratic in L and the cost's exponent is linear, the gap widens every level. Marginal reward-per-cost of the *next* upgrade:

| L | levelMultiplier | upgradeCost (base 100) | marginal reward / cost |
|---|---|---|---|
| 5  | 32×        | 25,600           | ~1×        |
| 10 | 1.05M×     | 6.5M             | ~4.5×      |
| 20 | 1.1T×      | 27T              | ~81×       |
| 30 | 1.6e18     | 1.1e20           | ~1,448×    |
| 40 | 3.6e24     | 4.6e26           | ~26,000×   |
| 50 | 3.3e30     | 3.2e31           | ~46M×      |
| 72 | **Infinity** | 5.6e44         | broken     |

At L=72, `Math.pow(2, 72²/5) = Math.pow(2, 1036.8)` exceeds `Number.MAX_VALUE (~1.8e308)` and returns `Infinity`. That Infinity flows into `player.engagement` and every subsequent `canAffordEngagement` check returns true forever. The save is unrecoverable.

**The player experience:** past roughly L20–L30 the next upgrade pays for itself in a single tick, so spam-clicking Upgrade snowballs the run to Infinity in seconds. That is the "spam click until it breaks" symptom.

### Crucially: the implementation diverged from the accepted spec

The accepted proposal `level-multiplier-curve.md` resolves its open question with:

> `upgrade_cost(generator, target_level) = base_upgrade_cost[generator] × level_multiplier(target_level)`

That formula was chosen specifically so that **cost grows at the same rate as output**, keeping marginal ROI stable. But `client/src/generator/index.ts:59` implements `base × 4^(L-1)` instead (and `generator-balance-and-algorithm-states.md` records the same mismatched formula on line 172, contradicting the earlier proposal it cites on line 186). This bug was not baked into the design — it was introduced during the balance-formalisation pass, and never flagged because `4^(L-1)` *looks* like an aggressive-enough cost curve at a glance.

So there are two decisions in play:

1. **Cost parity** — should cost track reward as `level-multiplier-curve.md` already decided, or is a different shape wanted now?
2. **Ceiling** — even with cost parity, `2^(L²/5)` overflows Number at L~72. Should levels be capped?

## Proposal

### Decision 1 — Restore cost/reward parity (honour the accepted spec)

**Adopt the cost formula already accepted in `level-multiplier-curve.md`:**

```
upgradeCost(generatorId, targetLevel) =
  ceil( base_upgrade_cost[generatorId] × levelMultiplier(targetLevel) )
```

Where `targetLevel` is the level the player is buying (i.e. `currentLevel + 1`).

**Why:** cost and reward grow on the same curve, so the marginal ROI of "spend X engagement to buy the next upgrade" stays roughly flat over the whole level range. Upgrades always feel worth buying (endowment-safe — you never *lose* by upgrading), but you never get a snowball where the next level pays itself off in one tick. Progression pacing comes from the growing *absolute* engagement requirement, not from a degrading cost/benefit ratio. This is exactly what the previously-accepted proposal argued for.

**What it does NOT do:** it does not prevent the overflow at L~72. That is Decision 2.

### Decision 2 — Hard cap at L=10 per generator

**Each generator has `max_level = 10`.** The Upgrade affordance shows `MAX` once `level === 10`, matching the established treatment of Clout upgrades (which already use `max_level`).

**Why 10 specifically:**

- The accepted curve was designed with ten named phases. `level-multiplier-curve.md` explicitly enumerates the feel of L1–L10 and labels L9–L10 as "post-prestige, unlocked via Clout upgrades" where "numbers stop making sense."
- At L=10, `levelMultiplier = 2^20 ≈ 1,048,576×`. That is comfortably within `Number.MAX_SAFE_INTEGER` (~9.0e15) even when multiplied by the largest per-generator base rate (`viral_stunts` at 500/s) and any clout bonus stack.
- L=10 at `viral_stunts` produces roughly 524M engagement/sec per unit. A moderate count (5–10 units) plus a strong algorithm state lands the player in the 10–50G engagement/sec range before they cap, which is satirically large but not nonsense-large. That is the tonal target — "my content empire is absurd" — without becoming "my content empire has broken arithmetic."
- Any cap beyond ~14 risks overflow once stacked with clout bonuses and viral bursts; 10 leaves comfortable headroom for multipliers.

**Per-generator or global?** Per-generator, and the cap is the same (10) for all seven generators. Differentiation between generators comes from `base_engagement_rate`, `trend_sensitivity`, and unlock gating — not from differing ceilings. A uniform cap keeps the mental model simple: "each generator maxes at 10."

**What changes in data contracts:** `GeneratorDefinition` in static-data gains a `max_level: 10` field. The Generator data model on `GameState` is unchanged (the `level` integer field already exists). `generatorUpgradeCost` and `upgradeGenerator` throw or refuse when `currentLevel >= max_level`. The UI swaps the cost label for `MAX` at the cap.

### Decision 3 — Runtime safety clamp (belt-and-braces)

Even with Decisions 1 and 2 in place, add a hard clamp in `levelMultiplier` and on the `engagement` balance:

- `levelMultiplier(level)` clamps `level` to `[1, 20]` before the `Math.pow` call. Passing a higher level (e.g. from a corrupted save, a future balance change, or a scandal/viral code path that forgot a cap) never produces Infinity.
- `player.engagement` is clamped to `Number.MAX_SAFE_INTEGER` on every tick write. An engagement value above MAX_SAFE_INTEGER is already meaningless — floats round to even at that magnitude — so the clamp costs nothing the player would feel.

**Why the belt-and-braces:** player saves persist across sessions and are hard to migrate. If *any* future code path (a scandal bug, an offline-calc miscount, a viral burst with a broken multiplier, a hand-edited save) produces a single Infinity write, the save becomes permanently unrecoverable under the current implementation. The clamp is cheap (two `Math.min` calls in hot paths that already do arithmetic) and guarantees the bug class cannot re-emerge. I am specifically asking for this regardless of how Decisions 1 and 2 land.

### Decision 4 — Relationship to rebrand

The level cap intentionally sits **slightly above** the point where a rebrand is the best strategic move, not below it. Rationale:

- The prestige system already uses `sqrt(total_followers) / 10` to award Clout, which flattens Clout gain relative to follower growth. This means "one more level" on a late-game generator gives diminishing Clout return — the player's incentive to rebrand is already built in.
- If the cap were below the rebrand break-even point, players would hit walls and feel punished. If the cap sits *just above* it, players naturally rebrand because rebranding looks more attractive than grinding the last one or two levels — but hitting MAX is still a legitimate badge for a completionist run.
- L=10 on a single generator is reachable within one long run once the economy is fixed; maxing *all seven* generators is deliberately a stretch goal that spans multiple rebrands (post-prestige clout upgrades make later-level costs tractable).

So: rebrand remains driven by strategy, not by hitting a wall. The cap is a ceiling, not a gate.

### What this locks in

- Upgrade cost formula: `ceil(base_upgrade_cost × levelMultiplier(targetLevel))`, restoring the shape already accepted in `level-multiplier-curve.md`.
- Hard `max_level = 10` on every generator, exposed in `StaticData` / `GeneratorDefinition`.
- Runtime clamps on `levelMultiplier` input and on `player.engagement` writes.

### What this leaves open

- Precise per-generator `base_upgrade_cost` values may still need a tuning pass once cost parity is live. The seed values in `generator-balance-and-algorithm-states.md` (selfies 100, memes 1,000, …, viral_stunts 200M) are provisional and are *not* changed here — the shape is what is being locked.
- Whether a future "ascension" feature raises the cap beyond 10 for players who have rebranded many times. Out of scope for this proposal; revisit when/if that feature is designed.

## References

1. `client/src/game-loop/index.ts:78` — current `levelMultiplier` implementation
2. `client/src/generator/index.ts:59` — current `generatorUpgradeCost` implementation (the diverged formula)
3. `.frames/sdlc/proposals/accepted/level-multiplier-curve.md` — reward curve and the originally-accepted cost formula (Open Question #1 resolution)
4. `.frames/sdlc/proposals/accepted/generator-balance-and-algorithm-states.md` — provisional base_upgrade_cost values and the contradictory `4^(L-1)` line that encoded the bug
5. `.frames/sdlc/proposals/accepted/clout-upgrade-menu.md` — existing `max_level` precedent on Clout upgrades
6. `.frames/sdlc/ux/prestige-rebrand-screen.md` — Rebrand ceremony flow, relationship to level progression
7. `client/src/prestige/index.ts` — `cloutForRebrand` and the `sqrt(total_followers)/10` curve that already flattens late-run Clout gain

## Open Questions

1. **[RESOLVED] Architect — `max_level` on `GeneratorDefinition`.** Adding `max_level: number` to `GeneratorDefinition` in `StaticData` is a data-contract change. Is that contract edit acceptable in the same PR that fixes the formula, or does it need a separate architecture update first? **Owner: architect**
  - Answer (architect): Same-PR is fine. `GeneratorDef` lives in `StaticData` (seeded from config, never deserialised), so this is a static-data contract edit, not a save-schema edit. Precedent exists on `CloutUpgradeDef.max_level`. Splitting the PR would be worse because cost parity without the cap still hits the overflow at L~72.

2. **[RESOLVED] Architect / engineer — migration of in-flight saves.** Players who have already broken their save with `engagement = Infinity` or `level > 10` need a one-time migration on load. What's the right shape — silent clamp on load, or a one-time "your save was repaired" notice? **Owner: architect** for the contract, **engineer** for the load-path code.
  - Answer (architect): Bump `CURRENT_VERSION` to 5; add `migrateV4toV5(data)` that clamps `player.engagement` to `Number.MAX_SAFE_INTEGER` and each `generators[id].level` to `max_level` (10). Append to the existing `migrate()` chain. Keep runtime clamps from Decision 3 regardless — permanent invariants, not migration logic.
  - Answer (game-designer): **Silent clamp — no player-facing notice.** The Infinity state and over-cap levels were a bug, not earned progress; at that magnitude floats had already rounded to even and the value was arithmetically meaningless. A modal would force the player to reckon with loss that wasn't real. `console.warn` for diagnostic trace is fine and desired.

3. **[RESOLVED] Engineer — verify overflow headroom with stacked multipliers.** At L=10, `levelMultiplier = 2^20 ≈ 1.05M`. Multiplied by `viral_stunts.base_engagement_rate = 500`, then count=10, then a 3× clout bonus, then a ~5× viral burst boostFactor, gives ~7.8e10 engagement/sec — still comfortably inside MAX_SAFE_INTEGER. Please sanity-check this at implementation time with the actual max stack and confirm the L=10 cap holds with real numbers. If it doesn't, flag back for a L=9 cap. **Owner: engineer**
  - Answer (engineer): True worst-case is `algorithmic_prophecy` (base 20,000), not `viral_stunts`. Maxed stack per unit/sec = `20,000 × 2^20 × 1.0 × 5.0 × 5.0 ≈ 5.24e11`. ~4 orders of magnitude of headroom below `MAX_SAFE_INTEGER` remain. L=10 holds. **Do not raise the cap without re-analysis** — L=14 already blows past `MAX_SAFE_INTEGER` under the same stack.

4. **[RESOLVED] Game-designer (self) — base_upgrade_cost rebalance after the fix.** With cost tracking reward 1:1, the provisional base_upgrade_cost values from `generator-balance-and-algorithm-states.md` may produce runs that feel too long or too short. This is a balance pass — not a blocker — but I want to revisit seed costs once the fixed economy has been playtested. **Owner: game-designer**
  - Answer (game-designer): Deferred to post-fix playtesting. Seed values ship as-is with the correctness fix; a dedicated balance-pass task will be filed once the fixed economy can be felt end-to-end. Not a blocker for acceptance — the *shape* is what's locked by this proposal, tuning is downstream.

---
# Review: architect

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

Both architect-owned questions have concrete answers. Answers below; proposal is architecturally sound to proceed.

**Q1 — `max_level` on `GeneratorDefinition`: acceptable as a same-PR contract change.**

This is a static-data contract edit, not a save-schema edit. `GeneratorDef` lives in `StaticData` (types.ts:358), which is seeded from config at startup and never deserialised from localStorage. Adding a required field to it changes the shape the balance config must provide — it does not change anything persisted in saves. The precedent is already in the type file: `CloutUpgradeDef.max_level: number` (types.ts:412) has the exact shape being proposed. Reusing the same field name on `GeneratorDef` is consistent and carries no new architectural surface.

Splitting the PR would be structurally worse than combining them. The cost-parity fix (Decision 1) depends on the cap (Decision 2) to be safe — without the cap, cost parity alone still hits the Infinity overflow at L~72. Landing the fix without its guard creates a window where the economy is formally "fixed" but still overflows, which is harder to reason about than a single coherent change. Same PR.

Non-blocking note: `GeneratorDef.base_upgrade_cost` in types.ts:390 carries an out-of-date doc comment — "Each subsequent level costs 4× the previous: base_upgrade_cost × 4^(currentLevel - 1)" — which encoded the bug. Updating that comment to match the accepted `levelMultiplier` formula belongs in the same PR as a correctness fix to the contract's documentation, not a separate sweep.

**Q2 — Migration of in-flight saves: schema migration (V4→V5) with silent clamp, plus the runtime clamps as permanent invariants.**

Treat this as two separate architectural mechanisms serving two different purposes:

1. **Runtime clamps (Decision 3)** are permanent invariant enforcement. They live in the hot path. They guard against *any* future code path that might produce Infinity or a level beyond the cap — corrupted saves, future balance changes, bugs in scandal/viral code paths, hand-edited saves. Cheap, cheap, cheap. Keep them regardless of whether a migration runs.

2. **One-time schema migration (V4→V5)** is a data-repair step at a known schema-version boundary. Bump `CURRENT_VERSION` to 5 and add `migrateV4toV5(data: SaveData): SaveData` that does two things:
   - Clamp `player.engagement` to `Number.MAX_SAFE_INTEGER`.
   - For each `generators[id]`, clamp `level` to the new `max_level` (10).
   
   This follows the existing migration pattern in `client/src/save/index.ts` exactly (V1→V2, V2→V3, V3→V4 are already in place). Append to the `migrate()` chain at line 225. Engineer owns the code; the contract here is just "bump version, write a migration, clamp the two fields."

**On UX — silent clamp, not a "your save was repaired" notice.** The Infinity state and level > 10 values were a bug, not progress the player earned. The engagement above MAX_SAFE_INTEGER was arithmetically meaningless — floats round to even at that magnitude, so the value stopped being real long before we read it. Surfacing a modal forces the player to reckon with "what did I lose" when the honest answer is "nothing felt — the numbers were broken." A `console.warn` in the migration function for diagnostic trace is fine and desirable; a player-facing notice is not.

*Caveat to the UX call:* if game-designer wants a one-time notice for tonal reasons (e.g. satirical framing fits the game's voice), that's a design call, not an architecture call. I'm flagging the architecturally-cheapest shape. The migration function body is unchanged either way — the notice would be a flag returned from load() that the UI layer consumes.

**Summary of the architecture answer:**
- Same PR is fine for the `max_level` field on `GeneratorDefinition`.
- Bump save version to 5; add `migrateV4toV5` that clamps engagement and per-generator levels.
- Keep the runtime clamps from Decision 3 regardless — they're permanent invariants, not migration logic.
- Silent clamp recommended; player-facing notice is a game-designer call.

No blocking concerns. Removing architect from reviewers.

---
# Review: engineer

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

All three decisions are implementable and the runtime clamps (Decision 3) are the right guard. Answering engineer-owned Open Question 3 with the actual worst-case stack below. One non-blocking correction to the headroom analysis — the cap holds, but the proposal's math underestimates the true ceiling by ~40×.

**Q3 — L=10 safety under the full runtime multiplier stack.**

The proposal's Q3 walks the math against `viral_stunts.base_engagement_rate = 500`, but `static-data/index.ts` ships three post-prestige generators with strictly higher base rates already wired into the code path (unlocked via Clout `generator_unlock` upgrades):

- `ai_slop` — 4,000 (8× viral_stunts)
- `deepfakes` — 7,500 (15× viral_stunts)
- **`algorithmic_prophecy` — 20,000 (40× viral_stunts)**

The true worst case is `algorithmic_prophecy` at L=10, not `viral_stunts`. Redoing the stack:

- `levelMultiplier(10) = 2^20 = 1,048,576`
- algorithm_modifier: all post-prestige generators have raw modifier 1.0 in every algorithm state (see `ALGORITHM_STATE_DEFS` in `static-data/index.ts`) → `effectiveAlgorithmModifier = 1.0` regardless of `trend_sensitivity`
- clout: `cloutBonus` multiplies every `engagement_multiplier` upgrade. Currently only `engagement_boost` exists, max level 3, `values[2] = 5.0` → max clout stack is 5.0× today
- viral burst: effective 5× (magnitudeBoostMax = 5.0; bonus_rate line replaces 1× with 5× against the same base)

Per unit per second, maxed stack: `20,000 × 1,048,576 × 1.0 × 5.0 × 5.0 ≈ 5.24e11`.

For the per-second rate to reach `Number.MAX_SAFE_INTEGER` (~9.007e15), count would need to exceed ~17,200 units of algorithmic_prophecy. With `buy_cost_multiplier = 1.15` and `base_buy_cost = 20e9`, reaching that count costs on the order of `20e9 × 1.15^17,199` — astronomically infeasible even with clout discounts. **Rate computation at L=10 is safe from Infinity and from per-tick precision loss.**

Per-tick earned engagement at 100ms: `rate_per_sec × 0.1`. Even for absurd counts, single-tick engagement stays many orders of magnitude below `Number.MAX_VALUE` (~1.8e308). No single-tick overflow path exists at L=10.

**The engagement accumulator is the real pressure point, and Decision 3's clamp is the correct answer.** At realistic late-late-game counts (e.g. 50 units of algorithmic_prophecy at L=10 during a viral burst ≈ 2.6e13 engagement/sec), the `player.engagement` total crosses `MAX_SAFE_INTEGER` in ~6 minutes of continuous play. At that magnitude floats round to even, so the stored value is already arithmetically meaningless before it overflows — clamping to MAX_SAFE_INTEGER on every tick write loses nothing the player would feel, and it eliminates the Infinity-on-save failure mode permanently. I endorse keeping Decision 3's engagement clamp independent of Decisions 1 and 2.

**Headroom for future stacking.** `cloutBonus` multiplies across all `engagement_multiplier` upgrades, not just one. If future Clout upgrades add additional engagement multipliers (e.g. a second 5× upgrade stacks to 25×), per-unit rate at L=10 scales linearly with the stack — 25× clout only raises worst-case per-unit rate to ~2.6e12/sec, still comfortably safe at realistic counts. Brand deals / gigs referenced in task context are not yet wired into `computeGeneratorEffectiveRate`; when they are, they'll add one more multiplicative factor. The ~4 orders of magnitude of headroom between current worst-case (5.24e11/unit·sec) and MAX_SAFE_INTEGER is comfortable for any plausible stack extension.

**If the cap were raised beyond 10:** the quadratic exponent bites hard. L=14 gives `2^(196/5) = 2^39.2 ≈ 6.3e11` — the per-unit rate under the same stack jumps to ~3.2e17, already past MAX_SAFE_INTEGER before any count multiplier. So the proposal's "beyond ~14 risks overflow" statement is correct, and L=10 has the right margin of safety. **Do not raise the cap without revisiting this analysis.**

**Non-blocking implementation note.** When `max_level: 10` is added to `GeneratorDef` and `generatorUpgradeCost` gains its at-cap guard, please also swap the cost formula at `client/src/generator/index.ts:59` (the `4^(currentLevel-1)` line) to the `levelMultiplier(targetLevel)` shape from Decision 1, and update the `base_upgrade_cost` doc comment in `types.ts:390` that still encodes the old `4^(currentLevel-1)` formula — architect's review already flagged this. Same PR, as architect recommended.

**Protocol note.** Q4 (`base_upgrade_cost` rebalance after the fix) is game-designer-owned and unresolved. It is explicitly flagged as non-blocking balance work, but per the proposals protocol (matching the precedent from `level-multiplier-curve.md` where engineer added game-designer for formal self-closure), I'm adding game-designer to the reviewers list so the self-question can be formally marked [RESOLVED] — even if the resolution is "deferred to post-fix playtesting" — before the proposal moves to accepted. Process step only; no content concerns.

Removing engineer from reviewers. Adding game-designer.

---
# Review: game-designer

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

Closing this out as author and final reviewer. Both technical reviews are Aligned and the headroom math is solid. Two things to put on record:

**On the migration UX (Q2 tonal call).** Silent clamp, no player-facing notice. Architect flagged this as a design call — I'm making it. The Infinity state and over-cap levels were not earned progress. At that magnitude floats were rounding to even, so the value was arithmetically meaningless before it got read back. Forcing a "your save was repaired" modal makes the player reckon with a loss that wasn't real — it fails the honesty leg of the three-question test by implying something was taken away. The satirical voice of the game *could* carry a cheeky notice ("the algorithm had a stroke, we fixed it"), but only at the cost of pretending there was something to lose. Don't do that. `console.warn` in the migration function for diagnostic trace is the correct shape.

**On the relationship to rebrand.** Worth reiterating, because this is the thing most likely to drift during implementation: L=10 is a **ceiling, not a gate**. The `sqrt(total_followers)/10` prestige curve already flattens late-run Clout gain, so rebrand remains strategy-driven, not wall-driven. Maxing all seven generators is a stretch goal across multiple rebrands. If during implementation it turns out the cap *feels* like a wall in playtest — players hitting MAX and feeling punished rather than rewarded — that's a signal to revisit the rebrand break-even point, not to raise the cap. Engineer has already ruled out raising the cap on overflow grounds.

**On Q4 (base_upgrade_cost rebalance).** Resolved as deferred. The seed values from `generator-balance-and-algorithm-states.md` ship as-is with the correctness fix. The *shape* is what this proposal locks. A dedicated balance-pass task gets filed after the fixed economy has been playtested end-to-end — likely as a game-designer design-state task once there's real play data to respond to.

No open concerns. Removing game-designer from reviewers. Moving to accepted.
