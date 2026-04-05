---
name: Large Number Notation Ladder
description: Extend the compact-number suffix ladder past Dc and define an overflow policy so late-game values never surface as raw `1.41e+151` exponential.
author: architect
status: draft
reviewers: [game-designer, ux-designer]
---

# Proposal: Large Number Notation Ladder

## Problem

The compact-number formatter in `client/src/ui/format.ts` has a suffix ladder that terminates at `Dc` (decillion, 10^33). Values ≥1e36 fall through to `n.toExponential(2)`, producing strings like `1.41e+151`. Two problems with this:

1. **Reads as broken.** Exponential notation in a clicker game's primary counters looks like a bug, not a design choice. It breaks the illusion that the engagement/follower/clout numbers are *real quantities the player is accumulating*.
2. **The ladder's upper bound is arbitrary.** `Dc` was picked because it's the last of the common Latin `-illion` suffixes without entering prefix-compound territory (`UDc`, `DDc`, etc.). But late-game content (G11 Parasocial Bonds, G12 Engagement Futures per `late-game-content-arc.md`) will push follower and engagement counts well past 10^33. So the ladder needs to extend, and we need a principled cutoff for when we *do* finally give up and emit scientific notation.

There is no accepted proposal governing late-game number scale. The UX spec (§5.1, §5.2) only defines the ≥10,000 threshold for compact notation kicking in — it is silent on the far end.

### What this proposal locks in vs. leaves open

**Locks in:** the structural pattern for extending the ladder (flat data table, single overflow point, shared contract for all three formatters), and the overflow-notation format when the ladder is exhausted.

**Leaves open:** (a) the specific symbols/names used for tiers past Dc, (b) how far to extend the ladder (depends on expected endgame value range), (c) whether numbers can exceed JS `Number` precision (~1.8e308) and require a BigInt/Decimal.js migration. These belong to game-designer, game-designer, and engineer respectively.

## Proposal

### Structural decisions (architect owns)

**1. Keep the flat `TIERS` data table. Extend it, don't restructure it.**

The current pattern — a descending array of `[threshold, divisor, suffix, decimals]` tuples — is correct. It's a single source of truth consumed by all three formatters (`fmtCompact`, `fmtCompactInt`, `fmtRate`). Adding tiers past Dc is an append-only operation: new rows in the table, no algorithm change.

**Alternative considered:** a generative rule (e.g., "every 3 orders of magnitude past Dc, compose a prefix like `U`/`D`/`T`/`Qa` with the previous tier") — rejected because it couples magnitude to naming. A flat table lets game-designer name tiers freely without the engineer deriving them from a formula.

**2. The ladder MUST terminate at a single defined `MAX_TIER`. Beyond that, fall back to clean scientific notation formatted per §Overflow Policy below.**

Extending the ladder indefinitely doesn't work: at some point the symbols become unreadable (players can't distinguish `Vg` from `Tg` at a glance) and the numbers exceed what `Number` can represent precisely. We need an explicit cutoff, not "oops we ran out."

**3. Overflow policy.** When `abs(n) >= threshold(MAX_TIER) * 1000`, emit scientific notation formatted as **`1.41×10⁵⁰`** (unicode `×` and superscript digits), NOT `1.41e+50`. The `e+` form reads as a bug. The `×10^` form reads as "yes, we mean this is an astronomical quantity."

Implementation note: superscript rendering can be done with unicode superscript characters (`⁰¹²³⁴⁵⁶⁷⁸⁹`) so the output is still a plain string, no JSX required, formatters stay pure functions. This preserves the current contract (`fmtCompact(n) → string`).

**Alternative considered:** `1.41e50` (drop the `+`, drop the `×10`) — more compact but still reads as developer output. Rejected.

**Alternative considered:** rendering as JSX/HTML with `<sup>` tags for true superscript — rejected because it breaks the current string-returning contract and would require every call site to change from text to element rendering.

**4. The ladder SHOULD extend at least through the standard compound `-illion` range (Undecillion through Vigintillion, 10^36 to 10^63) before any game-themed symbols take over.**

This is a weak opinion — final call is game-designer's. Reasoning: players who've seen other clicker games expect `UDc, DDc, TDc, …, Vg` as a continuation. Breaking into game-voice symbols *immediately* after Dc might surprise players who were tracking magnitude by reading the suffix. But holding the ladder to standard Latin past Vg is just inertia — the game's voice is satirical, and the late-game arc (Parasocial Bonds, Engagement Futures) is the perfect place to invent units that reinforce identity.

**Suggested structure for game-designer to react to:**
- 10^36 – 10^63: standard Latin continuation (`UDc`, `DDc`, `TDc`, `QaDc`, `QiDc`, `SxDc`, `SpDc`, `OcDc`, `NoDc`, `Vg`)
- 10^66 and beyond: game-voice custom symbols that match the satirical late-game tone (candidates: `Viral`, `Slop`, `Doom`, `Feed`, `Grid`, `Algo`, or something that pairs with G11/G12 narrative)
- Overflow (some value TBD, probably ~10^150–10^200): fall back to `×10^n` scientific

This keeps the "legible magnitude ladder" promise for the first chunk of late-game, then leans into voice once the numbers are so large that the *exact* magnitude stops mattering to the player — at that point the symbol is vibes, not measurement.

### Contract changes

No public API changes. `fmtCompact`, `fmtCompactInt`, `fmtRate` keep their signatures and return-types. Only the `TIERS` table and the overflow branch change.

New internal constant: `MAX_TIER_DIVISOR` (the divisor of the largest ladder entry) governs the overflow cutoff: overflow triggers at `abs(n) >= MAX_TIER_DIVISOR * 1000`.

### Data model

```ts
// Existing shape, unchanged:
type Tier = readonly [threshold: number, divisor: number, suffix: string, decimals: number];

// TIERS: ReadonlyArray<Tier>, descending by threshold.
```

The tier table IS the source of truth. No derived rule, no parallel config.

### Coupling analysis

- `format.ts` is consumed by: `GameScreen.tsx`, `TopBar.tsx`, `GeneratorList.tsx`, `PlatformPanel.tsx`, `CreatorKitPanel.tsx`, `UpgradeDrawer.tsx`, `CloutShopModal.tsx`, `RebrandCeremonyModal.tsx`, `ScandalModal.tsx`, `SettingsModal.tsx` (10+ UI sites). Changing the ladder is zero-risk for callers as long as return types stay `string`.
- `format.test.ts` owns the ladder's correctness contract. Every new tier MUST get a corresponding test case at the threshold boundary.
- No coupling to gameplay logic: formatters are pure presentation. Game state is not aware of the ladder.

## References

1. `client/src/ui/format.ts` — current formatter implementation
2. `client/src/ui/format.test.ts` — ladder correctness tests
3. `.frames/sdlc/proposals/accepted/engagement-counter-interpolation.md` — counter display contract
4. `.frames/sdlc/proposals/draft/late-game-content-arc.md` — G11/G12 content that will push numbers into this range
5. `.frames/sdlc/ux/` — §5.1/5.2 compact notation threshold rules (source spec for ≥10k behavior)

## Open Questions

1. **(game-designer)** What is the expected maximum value a player will see in late-game (after G12 prestige + extended play)? This sets how far the ladder needs to extend before overflow kicks in. Rough bracket: 10^60? 10^100? 10^200?
2. **(game-designer)** Should tiers past Dc follow standard Latin `-illion` (UDc, DDc, … Vg) for one segment before shifting to game-voice symbols? Or should game-voice symbols start *immediately* past Dc?
3. **(game-designer)** If game-voice symbols are used, what are they? The architect suggests they should pair with the satirical late-game arc (Parasocial, Engagement Futures) but the naming is yours. Candidates to react to: `Viral`, `Slop`, `Doom`, `Feed`, `Grid`, `Algo`, `Meme`, `Rot`.
4. **(ux-designer)** Maximum character budget for a compact number in the top bar and platform cards? Current Dc-era values top out at ~7 chars (`999.99Dc`). Game-voice symbols may be longer (`999.99Viral` = 11 chars). Does the existing layout absorb that, or does it need a width cap that forces shorter symbols (2–3 chars)?
5. **(ux-designer)** Is unicode superscript (`×10⁵⁰`) acceptable in the current typography system, or does it clash with the game's font stack? Fallback would be `×10^50` with a caret.
6. **[RESOLVED] (engineer)** JavaScript `Number` maxes out around 1.8×10^308. If game-designer's expected endgame range pushes past that, we need to migrate game-state numbers to BigInt or Decimal.js — which is a much larger change than this proposal. Is there any current or near-term path where values could exceed 1e300?
  - Answer (engineer): No. The codebase has two hard invariants that together bound all game-state values well below `Number.MAX_SAFE_INTEGER` (~9.007e15), five orders of magnitude below 1e300 and 292 orders of magnitude below `Number.MAX_VALUE`. **No BigInt/Decimal migration is needed or imminent.** (1) `clampEngagement` in `model/index.ts:194` pins every write to `player.engagement` at `Number.MAX_SAFE_INTEGER` — this is a permanent runtime invariant per `generator-level-growth-curves.md` Decision 3, enforced in the hot path and covered by tests in `model/`, `game-loop/`, `offline/`, and the V5→V6 save migration. (2) Generator levels are hard-capped at 10 and `levelMultiplier` clamps input to [1,20], with `Math.pow(2, 20²/5) = 2^80 ≈ 1.2e24` as the absolute ceiling of the multiplier term even in corrupted-state worst-case. Under the realistic max stack (`algorithmic_prophecy` base 20,000 × L=10 × 5× clout × 5× viral), per-unit rate is ~5.24e11/sec. Derived quantities inherit the bound: `total_followers` / per-platform `followers` are fed by engagement-converted-to-followers and bounded by its throughput; `lifetime_followers` is cumulative across rebrands but its growth rate is tick-bounded, giving a practical ceiling of ~1e20 over years of play; `clout = floor(sqrt(total_followers)/10)` is the square-root of a bounded value, capping around ~1e7. **Caveat for game-designer/architect:** if the answer to Open Question 1 puts expected endgame display values much above ~1e15, that creates a *design* tension with the existing engagement clamp (players would watch engagement pinned at MAX_SAFE_INTEGER) — that's a design-layer conversation, not a number-precision problem for this ladder proposal. The ladder can extend safely to whatever magnitude game-designer chooses; JS `Number` has the precision headroom.
7. **(architect — self)** Should the ladder definition move out of `format.ts` into `static-data/` to match the pattern used for other player-facing content data? Leaning no — the ladder is presentational, not game content — but worth naming.

---
# Review: engineer

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

Reviewed from the engineering-constraint angle. The proposal is safe to adopt against the current codebase — no BigInt/Decimal migration is needed or imminent.

**Q6 — can game-state values exceed 1e300?** No. Answer written inline at Open Question 6 with full mechanism trace. Short version: two hard invariants (the `clampEngagement` pin at `Number.MAX_SAFE_INTEGER` and the `max_level = 10` cap) keep every game-state value below ~9e15. Derived quantities (`total_followers`, `lifetime_followers`, `clout`) inherit the bound. JS `Number` has 292 orders of magnitude of headroom above the realistic game-state ceiling.

**On the structural decisions.** The flat `TIERS` table extension (Decision 1), the single `MAX_TIER` cutoff with defined overflow policy (Decisions 2 & 3), and the unicode `×10⁵⁰` string output (Decision 3) are all implementable without touching any contract in `format.ts` — pure function signature stays `(n: number) => string`, callers are unaffected. Superscript via unicode is the correct call — it preserves formatter purity, stays JSX-free, and keeps the 10+ UI call sites in `GameScreen.tsx`, `TopBar.tsx`, etc. unchanged. Non-blocking: every new tier needs a corresponding threshold-boundary test case in `format.test.ts` (the proposal says this; flagging to make sure it lands).

**On the "overflow is effectively dead code" observation.** Given the analysis above, the `×10⁵⁰` overflow branch will never fire in practice — no game-state value can reach the `MAX_TIER * 1000` threshold unless someone extends the ladder very short of `~10^18`, which nobody would. That does not mean remove it. Keep it as a defense-in-depth formatter guard for (a) direct formatter calls from tests/tooling with synthetic values, (b) future content that may introduce new currencies with different invariants, and (c) any hand-edited-save or corrupted-state code path that sneaks past the engagement clamp before the formatter sees it. A formatter that silently emits `1.41e+151` on malformed input is the bug the proposal exists to prevent; a formatter with an explicit overflow branch that never fires in production is a cheap invariant.

**Caveat surfaced for game-designer / architect (non-blocking).** If game-designer's answer to Open Question 1 lands above ~1e15 for expected endgame display values, that creates a design-layer tension with the existing engagement clamp — the player would watch engagement sit pinned at `Number.MAX_SAFE_INTEGER`, which the ladder would correctly format but which is a *gameplay* concern, not a precision concern. Resolving that tension is a separate proposal (revisit the clamp, rescale the economy, or accept the ceiling). This ladder proposal does not block or depend on it.

**Removing engineer from reviewers.** game-designer (Qs 1–3) and ux-designer (Qs 4–5) still own outstanding open questions.
