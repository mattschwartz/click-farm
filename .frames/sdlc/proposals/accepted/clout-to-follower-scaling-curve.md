---
name: Clout-to-Follower Scaling Curve
description: Defines the formula mapping total_followers at rebrand → Clout awarded, determining prestige pacing.
created: 2026-04-04
author: game-designer
status: accepted
reviewers: []
---

# Proposal: Clout-to-Follower Scaling Curve

## Problem

The architecture supports any monotonically increasing function for mapping followers to Clout at rebrand, but defers the specific curve to design (core-systems.md Open Question #1). Without a defined formula, task #28 (Prestige: The Rebrand) cannot be implemented — and an undefined curve means the engineer silently picks one that sets the prestige tempo by accident.

The formula must produce the prestige tension named in the accepted design proposal: "rebrand now for a small Clout boost, or push further for a bigger one but with diminishing returns."

## Proposal

### Formula

```
clout_awarded = floor(sqrt(total_followers) / 10)
```

`total_followers` is the sum of all platform follower counts at time of rebrand — the per-run metric that resets on rebrand. The divisor `10` is the single tuning knob.

### Value Table

| total_followers | Clout Awarded |
|----------------|---------------|
| 1,000 | 3 |
| 5,000 | 7 |
| 10,000 | 10 |
| 25,000 | 15 |
| 50,000 | 22 |
| 100,000 | 31 |
| 500,000 | 70 |
| 1,000,000 | 100 |

### Why Square Root

Square root produces **diminishing returns in percentage terms with real returns in absolute terms**. Doubling your followers does not double your Clout — it adds about 41%. But pushing from 10k to 100k still meaningfully increases your Clout payout (10 → 31). The curve never flatlines, so there's always a reason to push further, but the marginal gain shrinks enough to make "rebrand now vs. push further" a genuine decision.

Simpler curves fail this:
- **Linear** has no diminishing returns — always worth pushing, never a real tension.
- **Logarithmic** flattens too quickly — late-run progress stops mattering.
- **Power < 0.5** is too punishing — late runs feel like they barely scale.

Square root (`power = 0.5`) sits at the right balance point for the genre.

### Prestige Tension by Phase

**Early rebrand (~1,000–5,000 followers): "Not yet."**
3–7 Clout. Real reward but not enough for a meaningful upgrade if the first upgrade tier costs 10. The player who rebrands early gets something but is aware they left value on the table. This is intentional — teaches the player that patience pays.

**First clean milestone (~10,000 followers): "Now."**
10 Clout. Enough for one first-tier upgrade. This is the designed "good first rebrand" target. The player feels the investment was worth it.

**Mid-game rebrands (~50,000–100,000 followers): "Strong run."**
22–31 Clout. Two to three upgrades per rebrand. Each subsequent run starts visibly stronger. The meta-progression loop is working.

**Late/optimized runs (500k–1M+ followers): "Empire."**
70–100 Clout per rebrand. Numbers are large but still grounded. The player has mastered the system — the Clout reflects that.

### Clarification on `total_followers` vs. `lifetime_followers`

The architecture's `calculateRebrand` comment references `lifetime_followers` (current run contribution). This proposal defines the curve using `total_followers` — the sum of current platform follower counts, which resets on rebrand — because:

1. It matches the accepted design intent: "Clout scales with total followers at time of rebrand."
2. `lifetime_followers` compounds across all runs, which would make later rebrands exponentially more rewarding regardless of current-run performance — undermining the per-run prestige tension.
3. Using `total_followers` means each rebrand is evaluated on its own merits.

The architect should update the `calculateRebrand` comment to clarify it uses `total_followers`, not `lifetime_followers`.

### Upgrade Cost Assumption

The formula above assumes first-tier Clout upgrades cost approximately 10 Clout, making 10,000 total followers the natural first-rebrand milestone. If upgrade costs are tuned significantly higher or lower, the divisor in this formula should be adjusted proportionally. Upgrade cost definitions are a separate balance task.

## References

1. `.frames/sdlc/architecture/core-systems.md` — Open Question #1, `calculateRebrand` interface, `total_followers` and `lifetime_followers` field definitions
2. `.frames/sdlc/proposals/accepted/core-game-identity-and-loop.md` — Section 7 (Prestige: The Rebrand), Clout economy design intent

## Open Questions

1. [RESOLVED] **Clout upgrade costs.** The formula is calibrated against an assumed first-tier cost of ~10 Clout. If upgrade costs are defined at a significantly different scale, the divisor needs to adjust. **Owner: game-designer** (cost calibration is a balance decision, requires knowing the upgrade menu)
   - **Answer:** The ~10 Clout first-tier assumption is confirmed. First-tier Clout upgrades cost exactly 10 Clout. The divisor `10` in the rebrand formula stands. Full upgrade menu with all costs is defined in `.frames/sdlc/proposals/accepted/clout-upgrade-menu.md`.

---
# Review: architect

**Date**: 2026-04-04
**Decision**: Aligned

**Comments**

Architecturally clean. `floor(sqrt(total_followers) / 10)` requires no new fields, no new entities, and no changes to data model shape. The single tuning knob (divisor `10`) is easy to adjust at balance time without structural surgery.

The clarification on `total_followers` vs. `lifetime_followers` is correct and necessary. The `calculateRebrand` comment in `core-systems.md` was referencing `lifetime_followers` — I have updated that comment in the architecture spec to match this proposal. The corrected wording: "computes Clout earned from `total_followers` (sum of current platform follower counts, resets on rebrand — not `lifetime_followers`, which compounds across runs)."

Open question on upgrade costs is a balance decision owned by game-designer. It does not affect the formula or architecture — the divisor is a single constant and can be adjusted when upgrade costs are defined. This does not block acceptance.

---
# Review: engineer

**Date**: 2026-04-04
**Decision**: Aligned

**Comments**

The formula is implementable without ambiguity. `Math.floor(Math.sqrt(total_followers) / 10)` maps directly to standard JavaScript — no special-casing, no library dependencies.

Edge cases are handled:
- `total_followers = 0`: evaluates to `floor(0 / 10) = 0`. Defined behavior, no crash, no NaN. A zero-follower rebrand awards 0 Clout. That's correct.
- `total_followers` is always a non-negative integer (sum of follower counts), so no negative or fractional inputs are possible under normal operation.

The `total_followers` field name is consistent with the architecture spec as corrected by the architect. No naming ambiguity. The formula uses a single field with a clear definition — straightforward to wire into `calculateRebrand`.

The single tuning knob (divisor `10`) is a plain numeric constant. Adjusting it during balance doesn't touch structure.

One protocol note: the open question on upgrade costs (owned by game-designer) is unresolved. I agree with the architect that it doesn't affect the formula itself — the divisor is independent of cost definitions. However, per the proposals protocol, I've added game-designer to the reviewers list so this question is formally resolved before the proposal is accepted. This is a process requirement, not a technical one.

---
# Review: game-designer

**Date**: 2026-04-04
**Decision**: Aligned

**Comments**

Open question resolved. The ~10 Clout first-tier assumption is confirmed — the divisor `10` stands. The full Clout upgrade menu is defined in a companion proposal. The calibration holds: 10,000 followers → 10 Clout → one tier-1 upgrade. That's the designed "good first rebrand" moment and the formula delivers it cleanly.
