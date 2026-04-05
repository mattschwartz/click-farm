---
name: Large Number Notation Ladder
description: Extend the compact-number suffix ladder past Dc and define an overflow policy so late-game values never surface as raw `1.41e+151` exponential.
created: 2026-04-05
author: architect
status: draft
reviewers: [architect]
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

1. **[RESOLVED] (game-designer)** What is the expected maximum value a player will see in late-game (after G12 prestige + extended play)? This sets how far the ladder needs to extend before overflow kicks in. Rough bracket: 10^60? 10^100? 10^200?
  - Answer (game-designer): Peak realistic display values land in the **10^20–10^24 range** (`Sx`–`Sp` on the existing ladder). Mechanism: `lifetime_followers` is the fastest-growing visible counter per engineer's invariant analysis, tick-bounded by engagement throughput and realistically reaching ~1e20 over years of extended play; `total_followers` and per-platform followers peak lower; `clout = floor(sqrt(total_followers)/10)` caps around ~1e7; engagement is pinned at `Number.MAX_SAFE_INTEGER` (~9e15) by `clampEngagement`. The current `Dc` (10^33) ladder endpoint has **9 orders of magnitude of headroom above anything we will actually display.** The ladder does not need to extend.
2. **[RESOLVED] (game-designer)** Should tiers past Dc follow standard Latin `-illion` (UDc, DDc, … Vg) for one segment before shifting to game-voice symbols? Or should game-voice symbols start *immediately* past Dc?
  - Answer (game-designer): **Do not extend the ladder past `Dc` in this proposal.** Given Q1's realistic ceiling, extension is speculative and premature. Adopt the proposal's structural decisions (flat TIERS table, single MAX_TIER cutoff, unicode `×10ⁿ` overflow format) against the *current* `Dc` endpoint. The overflow branch triggers at `Dc * 1000` = 10^36 — safely above any value the player will reach, and serving as defense-in-depth per the engineer's dead-code-branch reasoning. If future content (post-G12 expansion, a new prestige tier, a currency without the engagement clamp) ever pushes values toward 10^33, revisit the ladder with concrete numbers in hand — do not decide the shape of the extension now.
3. **[RESOLVED] (game-designer)** If game-voice symbols are used, what are they? The architect suggests they should pair with the satirical late-game arc (Parasocial, Engagement Futures) but the naming is yours. Candidates to react to: `Viral`, `Slop`, `Doom`, `Feed`, `Grid`, `Algo`, `Meme`, `Rot`.
  - Answer (game-designer): **Defer.** Naming tier symbols in the abstract, before knowing which satirical arc (Parasocial Bonds / Engagement Futures / whatever lands in the accepted `late-game-content-arc` proposal) pairs with which magnitude, will prematurely lock voice to numeric scale. Voice symbols should be decided *inline with the content that forces us to reach their magnitude* — the symbol `Vi`/`Sl`/`Dm`/etc. should belong to the generator or fiction that first produces values at that scale, so the two reinforce each other. Since Q2 defers the extension entirely, Q3 has no immediate work.
4. **(ux-designer)** Maximum character budget for a compact number in the top bar and platform cards? Current Dc-era values top out at ~7 chars (`999.99Dc`). Game-voice symbols may be longer (`999.99Viral` = 11 chars). Does the existing layout absorb that, or does it need a width cap that forces shorter symbols (2–3 chars)?
  - Answer (ux-designer): **Hard cap of 7 characters** for all values rendered at P0/P1 numeric sizes. This matches the `999.99Dc` budget the layout was designed around. Game-voice symbols past 10^63 **MUST be 2-3 characters** (e.g., `Vi`, `Sl`, `Dm`, `Fd`, `Gr`, `Al`, `Mm`, `Rt`). The 5-char `Viral`/`Slop`/`Doom`/`Feed` candidates from Q3 exceed the budget — an 11-char value at 48px (P0 engagement) runs ~280-320px in Space Grotesk tabular-nums, eating a substantial portion of the top bar and competing with the rate sub-label for horizontal space. Full layout analysis in the review log below.
5. **(ux-designer)** Is unicode superscript (`×10⁵⁰`) acceptable in the current typography system, or does it clash with the game's font stack? Fallback would be `×10^50` with a caret.
  - Answer (ux-designer): **Accept unicode superscript as primary format, with `×10^50` caret-form as documented fallback.** Unicode superscript digits (U+2070–U+2079) are present in Space Grotesk's Google Fonts Latin-Extended subset, and the engineer's analysis confirms this overflow branch will never fire against real game state — so minor baseline-alignment imperfections in the superscript glyphs are acceptable for a dead-code safety net. QA step: render a synthetic overflow value during formatter unit tests and verify the superscript baseline does not look broken next to tabular-nums digits. If it ships looking wrong, swap to caret form — it's pure ASCII, bulletproof across any font stack.
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

---
# Review: ux-designer

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

Reviewed from the layout / typography angle. Aligned on the structural direction — flat `TIERS` table, single `MAX_TIER` cutoff, unicode `×10⁵⁰` overflow — with answers to Q4 and Q5 and a non-blocking constraint that flows back to game-designer's Q3.

**Q4 — Character budget: hard cap of 7 characters at P0/P1 numeric sizes.**

The current layout was designed around `999.99Dc` (7 chars). Two surfaces drive this budget:

- **P0 engagement counter** — 48px, weight 600, Space Grotesk tabular-nums, top bar right-center (`GameScreen.css:163`, core-game-screen.md §5.1). At this size, each tabular-nums digit advances ~24-28px. A 7-char value runs ~170-195px. An 11-char value like `999.99Viral` runs ~280-320px — a ~65% widening that eats into the rate sub-label's horizontal space and pushes the top bar's `1fr auto auto auto` grid toward crowding. The top bar is explicitly called "sacred" in core-game-screen.md §9 — I do not want to redesign its column rhythm to accommodate a late-game edge case.
- **P1 platform followers** — 24px, weight 600, Space Grotesk tabular-nums, inside narrow platform cards (`GameScreen.css:738`, platform-card padding 14px, max-width ~260px per panel column). At 24px, each digit advances ~12-14px. A 7-char value runs ~85-100px (comfortable). An 11-char value runs ~135-155px (tight, reduces headroom for the affinity-chip row below).

**Implication for game-designer's Q3.** The suggested symbol candidates `Viral`, `Slop`, `Doom`, `Feed`, `Grid`, `Algo`, `Meme`, `Rot` are 3-5 characters — `Rot` passes, the rest do not. The tier symbols that land in the ladder past 10^63 MUST be **2-3 characters** to preserve layout rhythm. Suggested shortenings in the satirical register: `Vi` (Viral), `Sl` (Slop), `Dm` (Doom), `Fd` (Feed), `Gr` (Grid), `Al` (Algo), `Mm` (Meme), `Rt` (Rot). Two-letter abbreviations also visually echo the existing Latin ladder (`Qa`, `Qi`, `Sx`, `Sp`, `Oc`, `No`, `Dc`), which preserves the "continuation, not rupture" read even as voice shifts.

**Alternative if game-designer wants full words.** The layout can be adapted — e.g., scale the P0 numeral down at extreme magnitudes, or render the suffix as a smaller secondary line. Both are non-trivial visual-design cost and I would rather not pay it for a rare late-game surface when 2-char symbols serve the same purpose. Flagging it as available if game-designer's voice/identity concern outweighs the layout cost.

**Q5 — Unicode superscript: accept as primary, with caret-form documented fallback.**

Unicode superscript digits (U+2070–U+2079) are in the Latin Extended range that Space Grotesk's Google Fonts subset covers. They will render. The risk is cosmetic: superscript glyphs in UI sans-serifs often sit slightly high against tabular-nums digits, which can look mechanically off when both are adjacent (e.g., `1.41×10⁵⁰` where the `10` is tabular-nums and the `50` is superscript digits at a different baseline). This is standard font-design behavior, not a Space Grotesk-specific defect.

The engineer's analysis (Review log above) confirms this overflow branch will never fire against real game-state — both invariants (the `clampEngagement` pin and the L=10 cap) keep values well below the overflow threshold. So this is dead-code rendering in practice, and aesthetic perfection isn't required. Accept unicode superscript.

**Single QA step:** during formatter unit-test development, render a synthetic overflow value in a browser against the Space Grotesk stack and eyeball the baseline alignment. If it looks broken, fall back to `×10^50` (caret form) — pure ASCII, bulletproof, slightly uglier but will never render wrong. Document the decision either way in `format.ts` alongside the overflow branch.

**Non-blocking observation — widening contract across UI sites.**

The proposal correctly notes that `format.ts` is consumed by 10+ UI sites. That list includes modals and drawers (CloutShopModal, RebrandCeremonyModal, ScandalModal, UpgradeDrawer) where numeric values appear at varying sizes (16-32px range). The 7-char budget is set by the top-bar's 48px context, which is the most constrained. Modal contexts have more horizontal room — but because formatters are shared, the budget cap is the floor for ALL surfaces, not a per-surface budget. I am aligned on this behavior; flagging it only so game-designer understands the cap is driven by one site and cannot be relaxed for modal usage without forking the formatter (which we should not do).

**Summary.** Aligned on the ladder extension + overflow format. Q4 answers with a 7-char hard cap that constrains game-designer's Q3 symbol candidates. Q5 answers accept-with-QA-step. Removing ux-designer from reviewers. game-designer remains on for Qs 1-3.

---
# Review: game-designer

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

Aligned on the structural proposal (flat TIERS table, single MAX_TIER cutoff, unicode `×10ⁿ` overflow format). Qs 1–3 resolved inline, summary below.

**On scope.** Engineer's invariant analysis changes the conversation: `clampEngagement` pins engagement at ~9e15, L=10 caps per-unit rates, and realistic `lifetime_followers` ceilings around 1e20 over years of play. Peak display values across all surfaces land in the `Sx`–`Sp` range (10^21–10^24). The current `Dc` ladder (10^33) has nine orders of magnitude of headroom above anything a player will ever see. **Extending the ladder past Dc now is speculative.** This proposal should lock in (a) the structural pattern and (b) the `×10ⁿ` overflow format against the *existing* Dc endpoint — not a new tier rollout.

**Q1 (expected endgame values).** 10^20–10^24 realistic ceiling. Mechanism traced in the resolved open question.

**Q2 (standard Latin past Dc, or game-voice immediately?).** Neither — do not extend past Dc in this proposal. The overflow branch at `Dc * 1000` = 10^36 is now defense-in-depth (engineer's reasoning applies: keep it even though it never fires in production). If future content introduces an uncapped currency or a post-G12 tier that pushes values past 10^30, *that's* the moment to decide the next segment of the ladder — with concrete numbers, not speculation.

**Q3 (game-voice symbols).** Defer. Naming tier symbols in the abstract couples voice to numeric magnitude before we know which satirical arc pairs with that scale. Voice symbols should be authored *alongside the content that produces those values*, so symbol and fiction reinforce each other. UX's 2-char constraint is filed for whenever this comes up — their shortlist (`Vi`/`Sl`/`Dm`/`Fd`/`Gr`/`Al`/`Mm`/`Rt`) is a good starting palette if/when we need it.

**On the engineer's flagged design tension.** Engineer noted: "if expected endgame display values land above ~1e15, players watch engagement pinned at MAX_SAFE_INTEGER, which is a gameplay concern not a precision concern." I'm not resolving that here — it's a separate proposal about whether the engagement clamp is the right ceiling for the late-game economy. Filing it mentally for the late-game arc conversation. This proposal is unaffected.

**Non-blocking: Q7 (architect-self) still open.** The architect's self-directed question about whether the ladder belongs in `format.ts` or `static-data/` is unresolved. My instinct matches the architect's stated lean (it's presentational, belongs in `format.ts`), but the question is architect-owned — I am not resolving it. Adding architect back to `reviewers` so they can self-finalize Q7 and move the proposal to accepted.

**Removing game-designer from reviewers.** Qs 1–3 resolved. Adding architect for Q7 self-resolution.
