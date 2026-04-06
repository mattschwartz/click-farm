---
name: Remove Algorithm Weather System
description: Strip the rotating algorithm-state system from the game entirely, simplifying the core loop to remove a system that adds complexity without proportional player value at this stage.
created: 2026-04-06
author: game-designer
status: accepted
reviewers: []
---

# Proposal: Remove Algorithm Weather System

## Problem

The Algorithm state system ("weather") rotates through five named states (short_form_surge, authenticity_era, engagement_bait, nostalgia_wave, corporate_takeover) on a ~5-minute cycle, modifying each generator's effective rate via per-state multipliers folded through `trend_sensitivity`. It was designed to create a strategic reading layer — "what's hot right now?" — that rewards players who adapt their content mix.

In practice, the system has three problems:

1. **It doesn't produce decisions.** The player has no way to shift their content mix in response to algorithm changes. Generators produce passively; the player's only active lever is which verb to tap. The "read the weather and adapt" intent requires a content-steering mechanic that doesn't exist. Without it, algorithm states are a passive modifier the player watches but can't respond to — a number that changes their rate for reasons they can't control.

2. **It adds complexity without proportional value.** The algorithm system touches 18 source files, 15 test files, 2 CSS files, and an entire module directory. It introduces per-algorithm-segment offline calculations, audience mood pressure (algorithm_misalignment), a PRNG seed chain across rebrands, two clout upgrades (algorithm_insight), a kit item (laptop/lookahead), and UI for state display + upcoming shifts. This is a large surface area for a system that currently produces "your numbers wiggle every 5 minutes."

3. **It will need fundamental rework.** If algorithm states return, they need to be paired with a content-steering mechanic that gives the player agency. The current implementation (per-generator multiplier table, trend_sensitivity interpolation, PRNG-driven schedule) may or may not be the right shape for that reworked system. Carrying the current implementation forward risks anchoring a future redesign to the wrong structure.

**Decision: remove the system now, rework it later when there's a mechanic that makes it matter.**

## Proposal

### 1. What Gets Removed

**Entire module:**
- `client/src/algorithm/` — PRNG, state advancement, modifier lookup

**Entire UI component:**
- `client/src/ui/AlgorithmBackground.tsx` — background vignette keyed to algorithm state

**From types:**
- `AlgorithmStateId` type
- `AlgorithmStateDef` interface
- `AlgorithmState` interface
- `algorithm` field on `GameState`
- `algorithm_seed` field on `PlayerState`
- `algorithm_state_index` on `LastCloseState`
- `algorithm_misalignment` on platform state
- `'algorithm_misalignment'` from `PressureId` union
- `'algorithm_insight'` from `UpgradeEffect` union
- `'algorithm_lookahead'` from `KitEffect` union
- `algorithmStates` and `algorithmSchedule` from `StaticData`
- `algorithmBoostThreshold` and `algorithmBoostMultiplier` from `ViralBurstConfig`

**From static data:**
- `ALGORITHM_STATE_DEFS` (all 5 states and their per-generator modifier tables)
- `algorithmStates` and `algorithmSchedule` from exported `STATIC_DATA`
- `algorithm_insight` clout upgrade definition (removes 55 Clout from menu: 15 + 40)
- `laptop` Creator Kit item (its only effect is `algorithm_lookahead`)
- `trend_sensitivity` field from every generator definition
- `algorithmBoostThreshold` and `algorithmBoostMultiplier` from viral burst config

**From game loop:**
- `effectiveAlgorithmModifier()` helper — delete entirely
- `algoMod` computation in `computeGeneratorEffectiveRate` — remove the factor (effective rate becomes `autoclicker_count * rate * yield * (1+count) * clout * kit`)
- `algoMod` in `postClick` per-tap earned — remove the factor
- Algorithm boost gate in `checkViralBurst` — viral burst probability becomes unmodified by algorithm state
- `advanceAlgorithm()` calls in the tick pipeline — remove
- `algorithm` from returned state objects

**From offline:**
- Per-algorithm-segment loop — simplify to a single-pass calculation (no segment boundaries)
- `algorithmAdvances` from `OfflineResult`

**From prestige:**
- `deriveNewSeed` / PRNG seed chain — remove
- `getUpcomingShifts()` — delete entirely
- Algorithm state initialization in `applyRebrand` — remove
- `algorithm_seed` from new player state

**From audience mood:**
- `algorithm_misalignment` pressure accumulation and decay logic — remove
- `misalignment_weight` from mood config
- `'algorithm_misalignment'` from `composition_priority`
- Audience mood becomes two-pressure: content_fatigue + neglect

**From driver:**
- `getUpcomingShifts()` — remove from interface and implementation

**From creator kit:**
- `kitAlgorithmLookaheadBonus()` — delete entirely

**From save:**
- `algorithm_insight` migration references — remove
- `algorithm_misalignment` platform field — remove
- New migration version to strip algorithm fields from persisted state

**From UI:**
- `AlgorithmBackground.tsx` — delete
- `TopBar.tsx` — remove algorithm state display from Zone A
- `GameScreen.tsx` — remove `<AlgorithmBackground>` and algorithm prop passing
- `GeneratorList.tsx` — remove modifier computation and state-change pulse animation
- `display.ts` — remove `AlgorithmMood` and `ALGORITHM_MOOD` constant
- `OfflineGainsModal.tsx` — remove "Algorithm shifts" row
- `CloutShopModal.tsx` — remove `algorithm_insight` display metadata
- `DebugApp.tsx` — remove algorithm state display and related debug entries
- `eulogy-templates.ts` — remove `currentAlgorithmStateName` and algorithm references in eulogies

**From CSS/theming:**
- `tokens.css` — remove `--palette-mood-*` properties and `[data-algorithm-state]` rule blocks
- `GameScreen.css` — remove `.algorithm-background`, `.algorithm-vignette`, `.vignette-pulse`, and related rules

### 2. What Stays

- **`algorithmic_prophecy` generator** — keeps its name, stats, and Clout unlock. It's a post-prestige generator whose identity is satirical ("you've become the algorithm"), not mechanically tied to the algorithm state system. The name is fiction, not function.
- **`algorithmic_prophecy_unlock` clout upgrade** — stays, it unlocks the generator.
- **Viral burst system** — stays, but simplified. Burst probability becomes flat (no algorithm boost gate). `magnitudeBoostMin/Max` and `durationMs` are unchanged.
- **Audience mood** — stays as a two-pressure system (content_fatigue + neglect). The removal of algorithm_misalignment simplifies mood but does not break it.

### 3. Economy Impact

**Clout menu:** `algorithm_insight` removal subtracts 55 Clout (L1: 15, L2: 40) from the menu. Total drops from 425 to 370 Clout. This shifts the full-menu completion target from the rebrand-cadence-intent's R15-R20 window slightly earlier. Acceptable — the cadence proposal is still in draft and can absorb this.

**Creator Kit:** `laptop` removal subtracts one kit item. The kit drops from 5 items to 4 (camera, phone, wardrobe, mogging). The laptop's per-run cost slot is freed. No rebalance needed — the remaining 4 items are independent.

**Generator rates:** With `algoMod` removed, generators produce at a flat rate (no +-30% swing from algorithm states). This makes income more predictable and slightly reduces the variance that viral bursts depended on for the "algorithm is hot" boost. The burst system still fires on its base probability — it just loses the 2x frequency boost during favorable states.

### 4. Top Bar Zone A

Zone A currently displays the algorithm state name ("Short-Form Surge", "Engagement Bait", etc.). With the algorithm removed, Zone A is empty.

**Decision: leave Zone A empty for now.** The top bar simplifies to engagement (center) + followers (right). When a replacement system is designed that warrants a top-bar presence, it claims Zone A. Do not fill it with placeholder content — an empty zone is better than a noisy one.

### 5. What This Locks In

- The algorithm weather system is removed from the codebase
- Generator effective rates are algorithm-independent
- Audience mood is a two-pressure system (fatigue + neglect)
- Viral burst probability is flat (no algorithm boost)
- Clout menu drops to 370 total
- Creator Kit drops to 4 items
- Top bar Zone A is empty
- `algorithmic_prophecy` generator and its unlock survive unchanged

### 6. What This Leaves Open

- Whether a replacement "environmental pressure" system is needed and what it looks like — future design task
- Whether the Clout menu needs a replacement upgrade to fill the 55-Clout gap — future balance concern
- Whether the Creator Kit needs a replacement 5th item — future design concern
- What populates top bar Zone A — depends on what system, if any, replaces the algorithm

## References

1. `client/src/algorithm/` — module being removed
2. `.frames/sdlc/proposals/accepted/generator-balance-and-algorithm-states.md` — original algorithm state design
3. `.frames/sdlc/proposals/accepted/audience-mood-retention.md` — audience mood system that loses one pressure axis
4. `.frames/sdlc/proposals/accepted/creator-kit-upgrades.md` — kit system that loses the laptop item
5. `.frames/sdlc/proposals/accepted/clout-upgrade-menu.md` — Clout menu that loses algorithm_insight
6. `.frames/sdlc/proposals/draft/rebrand-cadence-intent.md` — cadence targets affected by Clout menu change
7. `.frames/sdlc/architecture/core-systems.md` — architecture spec referencing algorithm integration points

## Open Questions

1. **[RESOLVED] Should `trend_sensitivity` be preserved as a dormant field on generator defs for future use, or stripped entirely?** **Answer (game-designer): Strip it.** YAGNI — if a replacement system uses per-generator sensitivity, it will want different values tuned against different mechanics. Dead fields invite confusion.
2. **[RESOLVED] Does the viral burst system need a replacement boost mechanic now that algorithm-state boost is gone?** **Answer (game-designer): No.** Leave burst probability flat. If bursts feel too rare after removal, retune the base probabilities directly. Don't replace one conditional boost with another.
3. **[RESOLVED] Save migration: should old saves have their algorithm fields silently stripped, or should the migration preserve `algorithm_insight` Clout upgrade purchases as refunded Clout?** **Answer (game-designer): Silent strip, no refund.** The game is still in development — there is no player population to protect. Migrations should be clean, not compensatory.

---
# Review: architect

**Date**: 2026-04-06
**Decision**: Aligned

**Comments**

The removal is architecturally sound. This eliminates the system that `core-systems.md` itself identifies as the tightest coupling point (OfflineCalculator ↔ Algorithm) and simplifies the offline calculator from a segmented multi-pass walk to a single-pass multiplication. The enumeration of touchpoints is exhaustive — I could not find a gap. The effective rate formula loses a factor cleanly with no stacking-order ambiguity, and the three resolved open questions are all the right calls for a dev-phase codebase.

**Action items for downstream tasks:**

1. **`core-systems.md` architecture update (architect task).** The following must be removed or updated after the build lands: AlgorithmState entity, Generator `trend_sensitivity` field, Player `algorithm_seed` field, SnapshotState `algorithm_state_index` field, `algorithm` on GameState, `algorithmStates`/`algorithmSchedule` on StaticData, `algorithmAdvances`/`newAlgorithmState` on OfflineResult, Generator↔Algorithm and OfflineCalculator↔Algorithm coupling sections, and the seeded PRNG technology decision. The offline calculator contract comment explaining why it needs full GameState (per-segment algorithm recomputation) should be rewritten — a pre-summed rate snapshot would now suffice, though the current signature is fine to keep.

2. **"Algorithm Mood Visibility" proposal is in implementation status.** That proposal designs UI for displaying algorithm state, which this proposal removes. The `display.ts` removals listed here (AlgorithmMood, ALGORITHM_MOOD) are artifacts of that implementation. The build task for this removal should explicitly note that it is unwinding an in-flight implementation, not just deleting unused code.

3. **Seeded PRNG becomes unused.** The Mulberry32 utility was purpose-built for algorithm shift scheduling. With no remaining consumer, it can be removed as part of the `client/src/algorithm/` module deletion. No strong opinion on keeping it — it's a few lines — but dead code is dead code.

---
# Review: engineer

**Date**: 2026-04-06
**Decision**: Aligned

**Comments**

The enumeration is exhaustive. I checked every file in the codebase containing "algorithm" (39 files) against the proposal's listed touchpoints — no gaps. The `algoMod` factor in `computeGeneratorEffectiveRate` and `postClick` is a standalone multiplicative term; removing it from the product is mechanically safe with no stacking-order ambiguity.

**Notes for the build task:**

1. **Test files are implicit.** The proposal enumerates source files but not the 15+ test files that need modification. The full list: `algorithm/index.test.ts` (delete with module), `audience-mood/index.test.ts`, `creator-kit/index.test.ts`, `driver/index.test.ts`, `game-loop/index.test.ts`, `generator/index.test.ts`, `integration.test.ts`, `model/index.test.ts`, `offline/index.test.ts`, `prestige/index.test.ts`, `save/index.test.ts`, `static-data/index.test.ts`, `CloutShopModal.test.ts`, `RebrandCeremonyModal.test.ts`, `eulogy-templates.test.ts`, `ActionsColumn.autoclicker.test.ts`. The builder will find them, but having the list prevents missed cleanup.

2. **`model/index.ts` owns `createAlgorithmState` factory.** Not explicitly called out in the proposal's removal sections. It initializes `AlgorithmState` for new games and is called from `createInitialGameState`. Must be deleted and its call site simplified.

3. **`platform/index.ts` has a stale comment** referencing "algorithm modifier" in a docstring. Comments referencing a dead system should be cleaned.

4. **`integration.test.ts` loses an entire test case** ("algorithm shift alters trend-sensitive generator output mid-run"). Expected — the system is being removed — but the builder should confirm remaining integration coverage is adequate for the surviving systems.

5. **Confirm "Algorithm Mood Visibility" implementation scope.** Per the architect's review, that proposal is in implementation status. The `display.ts` artifacts (AlgorithmMood, ALGORITHM_MOOD) are from that implementation. The build task should treat this as unwinding in-flight work, not just deleting unused code — verify no other artifacts from that proposal landed beyond what's listed here.
