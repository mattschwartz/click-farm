---
name: Generator Level Growth Curves
description: Resolves the runaway upgrade ROI that drives engagement to Infinity by restoring cost/reward parity, imposing a generator level cap, and adding a runtime safety clamp.
author: game-designer
status: draft
reviewers: [engineer]
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

1. **Architect — `max_level` on `GeneratorDefinition`.** Adding `max_level: number` to `GeneratorDefinition` in `StaticData` is a data-contract change. Is that contract edit acceptable in the same PR that fixes the formula, or does it need a separate architecture update first? **Owner: architect**

2. **Architect / engineer — migration of in-flight saves.** Players who have already broken their save with `engagement = Infinity` or `level > 10` need a one-time migration on load. What's the right shape — silent clamp on load, or a one-time "your save was repaired" notice? **Owner: architect** for the contract, **engineer** for the load-path code.

3. **Engineer — verify overflow headroom with stacked multipliers.** At L=10, `levelMultiplier = 2^20 ≈ 1.05M`. Multiplied by `viral_stunts.base_engagement_rate = 500`, then count=10, then a 3× clout bonus, then a ~5× viral burst boostFactor, gives ~7.8e10 engagement/sec — still comfortably inside MAX_SAFE_INTEGER. Please sanity-check this at implementation time with the actual max stack and confirm the L=10 cap holds with real numbers. If it doesn't, flag back for a L=9 cap. **Owner: engineer**

4. **Game-designer (self) — base_upgrade_cost rebalance after the fix.** With cost tracking reward 1:1, the provisional base_upgrade_cost values from `generator-balance-and-algorithm-states.md` may produce runs that feel too long or too short. This is a balance pass — not a blocker — but I want to revisit seed costs once the fixed economy has been playtested. **Owner: game-designer**

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
