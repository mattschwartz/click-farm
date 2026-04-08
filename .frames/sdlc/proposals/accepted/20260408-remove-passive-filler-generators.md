---
name: Remove Passive Filler Generators
description: Remove hot_takes, tutorials, ai_slop, deepfakes, and algorithmic_prophecy — cutting the generator roster from 11 to 6.
created: 2026-04-08
author: game-designer
status: accepted
reviewers: []
---

# Proposal: Remove Passive Filler Generators

## Problem

The game has 11 generators. Five of them are passive-only — the player never taps them, never makes a decision about them, never interacts with them beyond buying and upgrading. They tick in the background. That's not a system the player engages with — it's wallpaper.

The five generators being removed:

| Generator | Type | Unlock | Why it's cut |
|-----------|------|--------|-------------|
| **hot_takes** | passive-only | 200 followers | No verb, no gear, no identity. Fills a slot in the unlock ladder but doesn't give the player anything to do. |
| **tutorials** | passive-only | 1,000 followers | Same. A slightly bigger number in the same empty pattern. |
| **ai_slop** | passive-only | clout unlock | Post-prestige generator with no design identity. Exists only to be "8x viral_stunts." Provisional costs, no verb, no gear. |
| **deepfakes** | passive-only | clout unlock | Same. "15x viral_stunts." |
| **algorithmic_prophecy** | passive-only | clout unlock | Same. "40x viral_stunts." The biggest number with the least player agency. |

What remains — 6 generators, all with clear identity:

| Generator | Type | Unlock |
|-----------|------|--------|
| **chirps** | manual + auto | starter |
| **memes** | passive-only | 50 followers |
| **selfies** | manual + auto | 100 followers |
| **livestreams** | manual + auto | 25,000 followers |
| **podcasts** | manual + auto | 250,000 followers |
| **viral_stunts** | manual + auto | 5,000,000 followers |

Note: **memes** is passive-only but survives because it has thematic identity (meme content is a distinct content type in the social-media world) and fills the early progression gap between chirps and selfies. The five being removed don't carry that weight.

## Proposal

Remove `hot_takes`, `tutorials`, `ai_slop`, `deepfakes`, and `algorithmic_prophecy` entirely from the game. This means:

### 1. Static Data

Remove all five entries from `GENERATOR_DEFS` in `static-data/index.ts`. Remove their entries from `unlockThresholds.generators`. Remove their entries from every platform's `content_affinity` map. Remove their IDs from `GeneratorId` in `types.ts`.

### 2. Clout Shop — Generator Unlock Upgrades

The clout shop currently sells three `generator_unlock` upgrades (ai_slop_unlock, deepfakes_unlock, algorithmic_prophecy_unlock). With those generators gone, these upgrades are deleted. This reduces the clout shop's offering significantly.

**This is acceptable** because task #166 ("Re-design the Clout upgrade system") already exists and will redesign what clout buys. The current generator unlocks were provisional. Removing them now cleans the slate for that redesign rather than carrying dead upgrades.

Remove the three unlock upgrade IDs from `UpgradeId` in `types.ts` and their entries from `CLOUT_UPGRADES` in `static-data/index.ts`. Remove the corresponding head-start logic in `prestige/index.ts` that checks these upgrades during rebrand.

### 3. Unlock Progression Gap

Removing hot_takes (200) and tutorials (1,000) creates a gap in the follower unlock ladder:

**Before:** chirps(0) → memes(50) → selfies(100) → hot_takes(200) → tutorials(1,000) → livestreams(25,000) → podcasts(250,000) → viral_stunts(5,000,000)

**After:** chirps(0) → memes(50) → selfies(100) → **[gap: 100 → 25,000]** → livestreams(25,000) → podcasts(250,000) → viral_stunts(5,000,000)

The 100 → 25,000 gap is too wide. The player has nothing new to discover for a long stretch. The thresholds for livestreams, podcasts, and viral_stunts should be retuned to compress the ladder. This is a balance question — see Open Questions.

### 4. Save Migration

Existing saves contain state for the removed generators. The save migration must:
- Strip the five generator entries from `state.generators`
- Strip the three clout unlock upgrade entries from `state.player.clout_upgrades`
- If a player owned any removed generator, their engagement/follower rates will drop — this is acceptable; the remaining generators will be rebalanced to compensate
- Bump `CURRENT_VERSION`

### 5. Platform Content Affinity

Each platform has a `content_affinity` map that weights generators. The removed generators' entries must be deleted from every platform's affinity map. The remaining affinities stay unchanged — the follower distribution math normalizes across whatever generators are active.

### 6. UI

- `GeneratorList.tsx` will render fewer rows (6 instead of 11). No logic changes needed — it iterates over whatever generators exist in state.
- Ghost slots for locked generators will show fewer empty slots. The visual density of the generator column changes. UX designer may want to review spacing.
- Any hardcoded references to removed generator IDs in UI components must be cleaned up.

### 7. Save Migration — Preserve Historical Migrations

Existing save migrations (v3→v4 and later) reference removed generators by name. These migrations must NOT be deleted — they're needed for saves created before this change. The new migration strips the five generators and three clout unlock upgrades going forward; old migrations continue to handle old save formats.

### 8. Prestige Head-Start Logic

The proposal originally called for removing head-start logic in `prestige/index.ts`. Per architect review: the head-start logic (`generatorsUnlockedByCloutUpgrade`) is generic — it iterates `clout_upgrades` and checks `effect.type === 'generator_unlock'`. No generator-specific code exists in prestige. Removing the upgrades from static data and types is sufficient; the generic loop handles the rest.

### 9. Tests

All tests that reference removed generators need updating. Tests that seed state with specific generators need to use only the surviving six. Generator-count-dependent assertions (e.g., "11 generators") need correction.

## References

1. `client/src/static-data/index.ts` — Generator definitions, platform content affinities, clout upgrades
2. `client/src/types.ts` — `GeneratorId`, `UpgradeId` type definitions
3. `client/src/prestige/index.ts` — Head-start logic (generic, no generator-specific code to remove)
4. `client/src/save/index.ts` — Save migrations (add new, preserve old)
5. `client/src/model/index.ts` — `ALL_GENERATOR_IDS` array; `createPlayer()` initializes unlock upgrade IDs
6. `client/src/game-loop/index.ts` — Static data comments referencing removed generators
7. `client/src/ui/display.ts` — Display names, emoji, colors for removed generators; post-prestige ordering arrays
8. `client/src/ui/DebugApp.tsx` — Hardcoded unlock upgrade IDs and post-prestige generator IDs
9. `client/src/ui/CloutShopModal.tsx` — Display metadata for 3 unlock upgrades
10. `client/src/ui/GeneratorList.tsx` — Comment referencing post-prestige generators by name
11. Architecture specs: `core-systems.md`, `manual-action-ladder.md`, `auto-buy-sweep.md`
12. Task #166 — "Re-design the Clout upgrade system" (absorbs the clout shop impact)
13. Task #88 — "Balance pass: base_upgrade_cost seed values" (absorbs threshold retuning)

### Test files with references to removed generators

| File | What needs updating |
|------|-------------------|
| `client/src/ui/CloutShopModal.test.ts` | Unlock upgrade fixtures |
| `client/src/ui/RebrandCeremonyModal.test.ts` | `ai_slop` state; `clout_upgrades` shape |
| `client/src/audience-mood/index.test.ts` | `hot_takes` in `content_fatigue` fixture |
| `client/src/game-loop/index.test.ts` | Expected rates for removed generators; clout upgrade fixtures |
| `client/src/generator/index.test.ts` | Unlock threshold tests; ownership assertions |
| `client/src/verb-gear/index.test.ts` | Passive-only and post-prestige test cases |
| `client/src/prestige/index.test.ts` | `ai_slop_unlock` head-start test; `hot_takes` in state fixture |
| `client/src/platform/index.test.ts` | `hot_takes` affinity test; `tutorials` affinity comparison |
| `client/src/save/index.test.ts` | Multiple migration tests referencing removed generators and upgrades |

## Open Questions

1. **[game-designer]** [RESOLVED] The unlock gap from selfies (100) to livestreams (25,000) will be filled with new generators designed to have real player identity and interaction — not passive filler. The specific generators are a future design task. For now, the gap is acceptable; this proposal only covers removal.

2. **[architect]** [RESOLVED] Are there any architecture specs (core-systems.md, verb-gear.md, etc.) that reference the removed generators by name and need updating?
   - Yes. Three architecture specs reference removed generators and must be updated:
     - **`core-systems.md`** (line 37) — Generator data model table lists `hot_takes` and `tutorials` as launch generators. The enum must shrink from 11 to 6.
     - **`manual-action-ladder.md`** (lines 22, 30, 38, 40, 70-77, 284) — Heavy references throughout: `manual_clickable` table, post-prestige paragraph, unlock flow table, `GeneratorId` type union, save migration assertion.
     - **`auto-buy-sweep.md`** (line 51) — Lists `hot_takes` and `tutorials` as examples of passive-only generators.
   - `verb-gear.md` and `audience-mood.md` are clean — no references found.

3. **[game-designer]** [RESOLVED] The viral probability phase gate that depended on `tutorials.owned` is moot — the entire viral burst system is being removed in a companion proposal (`20260408-remove-viral-burst-system.md`). No replacement trigger needed.

---
# Review: architect

**Date**: 2026-04-08
**Decision**: Request for Comment

**Comments**

1. **Open Question #2 resolved.** Three architecture specs reference removed generators by name: `core-systems.md`, `manual-action-ladder.md`, and `auto-buy-sweep.md`. Details added to the Open Questions section above. These must be updated as part of implementation or engineers will build against stale contracts.

2. **Blocking: Viral phase gate depends on `tutorials.owned`.** `game-loop/index.ts` line 199 branches viral probability on whether `generators.tutorials.owned` is true. Removing tutorials without replacing this gate changes viral event frequency for all players in the early-to-mid phase. This is a game design decision — added as Open Question #3 for the game designer.

3. **File inventory is incomplete.** The proposal correctly identifies `static-data/index.ts`, `types.ts`, `prestige/index.ts`, and `save/index.ts`, but the following files also contain direct references to removed generators and should be listed explicitly in the References section so the implementing engineer has a complete checklist:

   | File | What needs changing |
   |---|---|
   | `model/index.ts` | `ALL_GENERATOR_IDS` array; `createPlayer()` initializes 3 post-prestige unlock upgrade IDs |
   | `ui/display.ts` | Display names, emoji, colors for all 5 removed generators; post-prestige ordering arrays |
   | `ui/DebugApp.tsx` | Hardcoded unlock upgrade IDs and post-prestige generator IDs |
   | `ui/CloutShopModal.tsx` | Display metadata for 3 unlock upgrades |
   | `ui/CloutShopModal.test.ts` | Extensive test fixtures referencing unlock upgrades |
   | `ui/RebrandCeremonyModal.test.ts` | Test state with `ai_slop`; expected `clout_upgrades` shape |
   | `ui/GeneratorList.tsx` | Comment referencing post-prestige generators by name |
   | `audience-mood/index.test.ts` | `hot_takes` in `content_fatigue` test fixture |
   | `game-loop/index.ts` | Viral phase gate on `tutorials.owned`; static data comments |
   | `game-loop/index.test.ts` | Expected rates for all 5 removed generators; clout upgrade fixtures |
   | `generator/index.test.ts` | Unlock threshold tests, ownership assertions for removed generators |
   | `verb-gear/index.test.ts` | Passive-only and post-prestige generator test cases |
   | `prestige/index.test.ts` | `ai_slop_unlock` head-start test; `hot_takes` in state fixture |
   | `platform/index.test.ts` | `hot_takes` affinity test; `tutorials` affinity comparison test |
   | `save/index.test.ts` | Multiple migration tests referencing removed generators and upgrades |

4. **Existing save migrations must NOT be deleted.** `save/index.ts` contains historical migrations (v3→v4 and later) that reference removed generators. These must remain — they're needed for saves created before this change. The new migration strips the generators going forward. Worth calling out explicitly so the engineer doesn't accidentally clean up old migration code.

5. **Prestige head-start logic is generic.** The proposal says to "remove the corresponding head-start logic in `prestige/index.ts`." Having inspected the code, the head-start logic (`generatorsUnlockedByCloutUpgrade`) is generic — it iterates `clout_upgrades` and checks `effect.type === 'generator_unlock'`. No generator-specific code needs removal in prestige. Removing the upgrades from static data and types is sufficient; the generic loop handles the rest. The proposal's §3 wording could mislead the engineer into looking for code that doesn't exist.

**Summary:** Aligned on the design intent — cutting passive filler is the right call. Requesting comment on two items before I can fully align: (a) the viral phase gate needs a replacement trigger (Open Question #3), and (b) the References/file inventory should be expanded so the implementation task is self-contained.

---
# Review: architect (re-review)

**Date**: 2026-04-08
**Decision**: Aligned

**Comments**

Both blocking concerns from the initial review are resolved:

1. **Viral phase gate (OQ#3):** Moot — the entire viral burst system is being removed in `20260408-remove-viral-burst-system.md`. The `tutorials.owned` gate and all viral probability logic will be deleted, not replaced.

2. **File inventory:** The proposal body has been updated with the expanded References section and test file table. The prestige head-start section (§8) now correctly notes the generic logic. The save migration section (§7) now calls out preserving historical migrations. The implementation task will be self-contained.

All three open questions are resolved. No remaining concerns.

---
# Review: engineer

**Date**: 2026-04-08
**Decision**: Aligned

**Comments**

Verified all references to removed generators across the codebase. Grep finds exactly 18 files containing `hot_takes`, `tutorials`, `ai_slop`, `deepfakes`, or `algorithmic_prophecy`. The proposal's References section and test file table name all 18. No files are missed — `ActionsColumn.tsx`, `offline/`, and `driver/` are clean.

No blocking concerns. Four non-blocking observations for the implementing engineer:

1. **Save migration ordering.** This proposal needs a `CURRENT_VERSION` bump (currently 16). The companion viral burst removal proposal also needs one. If both land, they need sequential version numbers. The implementing engineer should coordinate or implement both in the same migration to avoid a collision.

2. **`types.ts` line 352** has a comment on `ViralBurstConfig` referencing "before tutorials are unlocked." This becomes stale if this proposal lands before the viral burst removal. Minor — the companion proposal deletes the entire type.

3. **`types.ts` lines 253-254** have a comment listing "passive-only generators (memes, hot_takes, tutorials) and post-prestige generators (ai_slop, deepfakes, algorithmic_prophecy)." After removal, this should read "passive-only generators (memes)."

4. **No hidden UI references.** `ActionsColumn.tsx` asset import map only covers the surviving six generators. Confirmed clean.

File inventory is complete, design rationale is sound, save migration strategy is correct (strip forward, preserve historical migrations). Aligned.
