---
name: Remove Viral Burst System
description: Delete the viral burst event system entirely — trigger logic, state, visual choreography, and all supporting code.
created: 2026-04-08
author: game-designer
status: accepted
reviewers: []
---

# Proposal: Remove Viral Burst System

## Problem

The viral burst system is a random event that periodically boosts engagement rate for 5-10 seconds with a visual flourish. It was designed to create "going viral" moments — surprise spikes that break the rhythm of idle accumulation.

In practice, the system has three problems:

1. **No player agency.** The viral fires on a probability roll. The player doesn't cause it, can't influence it, and can't meaningfully respond to it. It's a slot machine pull that happens to the player, not something the player does. This violates the design principle that systems should give the player something to engage with.

2. **Variable ratio schedule concern.** The viral burst is a textbook variable ratio reward — unpredictable timing, unpredictable magnitude, brief duration creating urgency. The game-designer role definition explicitly flags this: "If your core loop already has natural variance, do NOT layer additional variable ratio mechanics on top." The core loop (generators, verbs, gear) already has natural variance. The viral burst is a second variable ratio layer.

3. **Complexity cost.** The system touches 12 source files, has its own state machine (`ViralBurstState`), its own type hierarchy (`ActiveViralEvent`, `ViralBurstPayload`, `ViralBurstConfig`), phase-gated probability tiers, a cooldown counter, visual choreography (3-phase CSS animation system), and UI orchestration in `GameScreen.tsx`. This is significant surface area for a system the player has zero control over.

The viral burst system has an accepted proposal (`viral-burst-event-signal.md`) and was implemented. Removing it is a deliberate reversal — we built it, evaluated it, and concluded it doesn't earn its complexity.

## Proposal

Delete the viral burst system entirely. No replacement system. The engagement rate comes from generators, verbs, and gear — systems the player controls.

### 1. Types — `client/src/types.ts`

Delete:
- `ViralBurstState` interface
- `ActiveViralEvent` interface
- `ViralBurstPayload` interface
- `ViralBurstConfig` interface
- `viralBurst` field from `GameState`
- `viralBurst` field from `StaticData`

### 2. Static Data — `client/src/static-data/index.ts`

Delete:
- `VIRAL_BURST_CONFIG` constant and all its fields (`minCooldownTicks`, `baseProbabilityEarly/Mid/Late`, `durationMsMin/Max`, `boostFactorMin/Max`)
- The `viralBurst` field from the exported `StaticData` object

### 3. Game Loop — `client/src/game-loop/index.ts`

Delete:
- `evaluateViralTrigger()` function entirely (~70 lines)
- Viral burst evaluation call in `tick()` 
- Viral burst engagement application in `tick()` (the `bonus_rate_per_ms * deltaMs` accumulation)
- Viral burst expiry check in `tick()`
- `viralBurst` state initialization and carry-forward in `tick()` return

The tick loop simplifies: engagement comes from generators only, no viral bonus branch.

### 4. Model — `client/src/model/index.ts`

Delete:
- `viralBurst` from `createInitialGameState()` return value
- Any viral burst state initialization

### 5. Driver — `client/src/driver/index.ts`

Delete:
- `ViralBurstPayload` event dispatch logic
- Any viral burst event subscription/forwarding to UI

### 6. Prestige — `client/src/prestige/index.ts`

Delete:
- `viralBurst` reset in `applyRebrand()` (currently resets to `{ active_ticks_since_last: 0, active: null }`)

### 7. Offline — `client/src/offline/index.ts`

Verify: the offline calculation should not reference viral bursts (virals are active-play only and not persisted). Confirm no viral state leaks into offline calculations.

### 8. Save — `client/src/save/index.ts`

- `viralBurst` is noted as "never persisted across saves" in the type comments. Verify this is true — if the save layer strips it on serialize, remove that stripping logic. If it's included in saves, add a migration to strip it.
- Bump `CURRENT_VERSION` if save format changes.

### 9. UI — `client/src/ui/GameScreen.tsx`

Delete:
- `ViralPhase` type and `getViralPhase()` helper function
- `viralActive` / `viralPhase` derived state
- `prevViralRef` and the viral start/end detection effect
- `viralBonusRatePerSec` computation and its addition to `effectiveEngagementRate`
- `viralGold` prop passed to TopBar
- `viralGeneratorId` prop passed to GeneratorList
- `viralPlatformId` prop passed to PlatformPanel
- `viral-zoom-pulse` class on the main element
- The entire `viral-particles-overlay` div and its particle children
- `viral-summary-badge` rendering

### 10. CSS — `client/src/ui/GameScreen.css`

Delete the entire "Viral burst visual choreography" section (~120 lines):
- `.engagement-value.viral-gold` transition override
- `.viral-summary-badge` and its animations (`viral-badge-in`, `viral-badge-out`)
- `.generator-row.viral-halo` and its animation (`viral-row-halo`)
- `.platform-card.viral-illuminate` and its animation (`viral-card-illuminate`)
- `.game-screen.viral-zoom-pulse` and its animation
- `.viral-particles-overlay` and `.viral-particle` styles

### 11. Component Props Cleanup

Remove viral-related props from component interfaces:
- `TopBar.tsx`: remove `viralGold` prop
- `GeneratorList.tsx` (lines 47, 136, 191): remove `viralGeneratorId` prop definition, destructuring, and `viralHalo` pass-through to child rows
- `PlatformPanel.tsx` (lines 24, 31, 56): remove `viralPlatformId` prop definition, destructuring, and `viralIlluminate` pass-through to child cards

### 12. Audience Mood Stacking Order — `client/src/audience-mood/index.ts`

The stacking order comment (lines 10-18) lists "Event effects (viral burst, ...)" as step 5 and references "viral burst amplifiers" in step 6. Remove the viral burst reference from step 5. If no other event effects exist, remove step 5 entirely and renumber. Update step 6's description to remove the viral amplifier reference.

### 13. Theme Tokens — `client/src/theme/tokens.css`

`--glow-halo-rgb` (lines 93-96) is documented as "used in viral-burst halos." Check if `GameScreen.css` viral choreography is the only consumer. If so, remove the token. If other components use it for non-viral purposes, update the comment.

### 14. Debug Panel — `client/src/ui/DebugApp.tsx`

If the debug panel renders viral burst state or has controls to trigger virals, remove them.

### 15. Tests

Delete or update:
- `game-loop/index.test.ts` — All `evaluateViralTrigger` tests; viral burst accumulation tests in tick; viral probability phase tests
- `prestige/index.test.ts` — Viral burst reset assertions in rebrand tests
- `save/index.test.ts` — Verify whether any tests seed `viralBurst` state; remove if so
- `driver/index.test.ts` — Confirm `viral_stunts` references are about the generator (not the burst system); remove any viral dispatch tests
- Any test fixtures that seed `viralBurst` state

### 16. Architecture Specs

Update all architecture specs that reference the viral burst system:

| Architecture Spec | What needs updating |
|---|---|
| `core-systems.md` | Remove viral burst section |
| `visual-theming.md` | Viral burst vignette override mechanism (lines 157, 205, 221-253, 262, 289, 317). The vignette layer contract has a `viralBurst` field, component props include `viralActive`, coupling analysis names viral-burst override composition. The vignette contract section needs revision. |
| `verb-gear.md` | References to `evaluateViralTrigger()` (line 183), `kitViralBurstAmplifier` (lines 142, 225, 229), coupling analysis table, net coupling change summary. |
| `audience-mood.md` | Stacking order (line 166) places retention "before any viral-burst multipliers." |
| `manual-action-ladder.md` | Line 165 mentions "viral-burst rate queries" as a downstream caller of `computeGeneratorEffectiveRate`. |

### 17. UX Specs

File a follow-up task for the UX designer to update all UX specs that reference the viral burst system. The viral burst is deeply woven into 8 UX specs:

| UX Spec | What references viral burst |
|---|---|
| `core-game-screen.md` | §9 is the primary viral burst choreography spec (~50 lines). Also §10.3 (motion sensitivity/reduce-motion), §11 (open questions on viral frequency). Heaviest hit. |
| `brand-deal-card.md` | §5 compound moment (deal + viral overlap). §1 design principle #3 (corporate green vs viral gold). Emotional arc table. |
| `gig-cards.md` | Compound moment signal (§5.3) — badge border pulses viral gold. Integration references to core-game-screen §9. |
| `visual-identity.md` | Platform accent colors designed to work as viral burst vignette. Viral gold as a color lane. |
| `mobile-layout.md` | Platform strip auto-scroll during viral event (§7). Motion table entry. |
| `scandal-system.md` | Risk visuals pause during viral (Rule 1). Sound design contrast. |
| `settings-screen.md` | Viral event counter acceleration listed as reduce-motion exception. Sound mute list includes viral. |
| `creator-kit-panel.md` | Mogging flavor text "When going viral isn't enough" (thematic, low priority). |

These specs do not block this proposal, but stale UX specs are dangerous — the next designer who reads `core-game-screen.md` §9 will design around a system that no longer exists.

### 18. Accepted Proposal

The accepted proposal `viral-burst-event-signal.md` remains in `proposals/accepted/` as historical record. It is not deleted — it documents a decision that was made and later reversed. This proposal serves as the reversal record.

## References

1. `client/src/types.ts` — `ViralBurstState`, `ActiveViralEvent`, `ViralBurstPayload`, `ViralBurstConfig`
2. `client/src/game-loop/index.ts` — `evaluateViralTrigger()`, viral application in `tick()`
3. `client/src/static-data/index.ts` — `VIRAL_BURST_CONFIG`
4. `client/src/model/index.ts` — Viral state initialization
5. `client/src/driver/index.ts` — Viral event dispatch
6. `client/src/prestige/index.ts` — Viral state reset in rebrand
7. `client/src/offline/index.ts` — Verify no viral leakage
8. `client/src/save/index.ts` — Viral serialization handling
9. `client/src/ui/GameScreen.tsx` — Visual orchestration, phase derivation, props
10. `client/src/ui/GameScreen.css` — Viral choreography styles (~120 lines)
11. `client/src/ui/GeneratorList.tsx` — `viralGeneratorId` prop, `viralHalo` pass-through
12. `client/src/ui/PlatformPanel.tsx` — `viralPlatformId` prop, `viralIlluminate` pass-through
13. `client/src/audience-mood/index.ts` — Stacking order comment references viral burst
14. `client/src/theme/tokens.css` — `--glow-halo-rgb` documented as viral-burst halo token
15. `client/src/ui/DebugApp.tsx` — Possible viral burst debug controls
16. `.frames/sdlc/proposals/accepted/viral-burst-event-signal.md` — Original accepted proposal
17. `.frames/sdlc/proposals/accepted/20260408-decimal-js-engagement-migration.md` — References viral burst in §4 (tick), §12 (interpolation), §15 (driver); sections become historical after removal
18. Architecture specs: `core-systems.md`, `visual-theming.md`, `verb-gear.md`, `audience-mood.md`, `manual-action-ladder.md`
19. UX specs: `core-game-screen.md`, `brand-deal-card.md`, `gig-cards.md`, `visual-identity.md`, `mobile-layout.md`, `scandal-system.md`, `settings-screen.md`, `creator-kit-panel.md`

## Open Questions

1. **[architect]** [RESOLVED] The Decimal.js migration proposal (ref 12) includes viral burst fields in its type changes (`ActiveViralEvent.magnitude`, `ActiveViralEvent.bonus_rate_per_ms` → Decimal) and viral arithmetic in its game loop changes. If this removal lands first, those sections become dead code in the migration spec. If the migration lands first, this removal deletes code that was just converted. What's the preferred ordering, or should they be implemented together?
   - This removal should land first. The Decimal migration is in-progress (tasks #201-207) but the viral-touching sections (§4 tick viral arithmetic, §12 GameScreen viral bonus, §15 driver viral dispatch) haven't been converted yet. Removing the viral system first eliminates ~8 Decimal conversion sites from the migration scope, simplifying it. The Decimal migration proposal's references to viral code become historical (already deleted) — the engineer implementing remaining Decimal tasks simply skips those sections. No spec update needed on the Decimal proposal itself; the code won't exist to convert.

2. **[architect]** [RESOLVED] The `audience-mood/index.ts` stacking order comment (lines 10-18) lists "Event effects (viral burst, …)" as step 5 in the multiplier chain and references "viral burst amplifiers" in step 6's description. With the viral burst removed, step 5 is empty and step 6's description is stale. Should the stacking order be renumbered, or should step 5 be left as a placeholder for future event effects?
   - Remove step 5 entirely and renumber. We don't design for hypothetical future event effects (YAGNI). If a new event system is added later, it gets its own stacking order entry at that time. Leaving a placeholder creates the illusion that we planned for it, which misleads the next designer.

---
# Review: architect

**Date**: 2026-04-08
**Decision**: Request for Comment

**Comments**

1. **Open Question #1 resolved.** This removal should land before the Decimal migration. The viral-touching Decimal conversion sites haven't been implemented yet. Removing first eliminates ~8 conversion sites and simplifies the migration. Details in the Open Questions section above.

2. **Blocking: Missing source files.** The proposal covers 10 source files but misses 4 that contain viral burst system code or references:

   | File | What needs changing |
   |---|---|
   | `audience-mood/index.ts` | Stacking order comment (lines 10-18) lists viral burst as step 5 and references "viral burst amplifiers" in step 6. Must be updated or renumbered. Added as Open Question #2. |
   | `theme/tokens.css` | `--glow-halo-rgb` (line 93-96) is documented as "used in viral-burst halos." If no other consumer uses this token, it can be removed. If other consumers exist, update the comment. |
   | `PlatformPanel.tsx` | The proposal's §11 mentions removing `viralPlatformId` prop but doesn't name this file explicitly. Lines 24, 31, 56 — prop definition, destructuring, and pass-through to child `viralIlluminate` prop. |
   | `GeneratorList.tsx` | Same — §11 mentions removing `viralGeneratorId` but doesn't name the file. Lines 47, 136, 191 — prop definition, destructuring, and `viralHalo` pass-through. |

3. **Blocking: Missing architecture specs.** §13 only names `core-systems.md`. Three additional architecture specs reference the viral burst system by name:

   | Architecture Spec | What references viral burst |
   |---|---|
   | **`visual-theming.md`** | Viral burst vignette override mechanism (lines 157, 205, 221-253, 262, 289, 317). The vignette layer contract has a `viralBurst` field, the component props include `viralActive`, and the coupling analysis names viral-burst override composition. This is significant — the entire vignette contract section needs revision. |
   | **`verb-gear.md`** | References `evaluateViralTrigger()` removal (line 183), the old `kitViralBurstAmplifier` (lines 142, 225, 229). The coupling analysis table and net coupling change summary both reference viral burst. |
   | **`audience-mood.md`** | Stacking order (line 166) places retention "before any viral-burst multipliers." |
   | **`manual-action-ladder.md`** | Line 165 mentions "viral-burst rate queries" as a downstream caller of `computeGeneratorEffectiveRate`. |

4. **Blocking: Missing UX specs.** §13 says "Any UX specs referencing viral burst choreography (§9)" but doesn't enumerate them. The viral burst is deeply woven into UX specs — 8 specs reference it:

   | UX Spec | What references viral burst |
   |---|---|
   | **`core-game-screen.md`** | §9 is the primary viral burst choreography spec (~50 lines). Also §10.3 (motion sensitivity/reduce-motion), §11 (open questions on viral frequency). This is the heaviest hit. |
   | **`brand-deal-card.md`** | §5 compound moment when deal + viral overlap (gold pulse on badge border). §1 design principle #3 (corporate green vs viral gold). Emotional arc table. References throughout. |
   | **`gig-cards.md`** | Compound moment signal (§5.3) — badge border pulses viral gold when gig + viral overlap. Integration references to core-game-screen §9. |
   | **`visual-identity.md`** | Platform accent colors designed to work as viral burst vignette (OQ2 resolution). Viral gold as a color lane. |
   | **`mobile-layout.md`** | Platform strip auto-scroll during viral event (§7, line 319). Motion table entry (line 343). |
   | **`scandal-system.md`** | Risk visuals pause during viral (Rule 1, line 334). Sound design contrast (line 226). |
   | **`settings-screen.md`** | Viral event counter acceleration listed as reduce-motion exception (line 125). Sound mute list includes viral (line 151). |
   | **`creator-kit-panel.md`** | Mogging flavor text "When going viral isn't enough" (thematic, low priority). |

   These specs don't need to block *this* proposal, but the implementation task must include updating them or filing a follow-up task for the UX designer. Stale UX specs are as dangerous as stale architecture specs — the next designer who reads `core-game-screen.md` §9 will design around a system that no longer exists.

5. **Non-blocking: Test file coverage.** §12 names 3 test files. Two additional test files have viral burst references:
   - `driver/index.test.ts` — references `viral_stunts` ownership in state setup (lines 423, 428). These are the generator, not the burst system — confirm they don't also test viral dispatch.
   - `save/index.test.ts` — verify whether any test seeds `viralBurst` state.

6. **Non-blocking: `DebugApp.tsx`.** Not mentioned. If the debug panel renders viral burst state or has controls to trigger virals, those need removal.

7. **Non-blocking: Decimal migration proposal.** The accepted `20260408-decimal-js-engagement-migration.md` references viral burst in §4 (tick arithmetic), §12 (GameScreen), §15 (driver), revision notes, and the change table. These sections become historical — no spec update is needed since the code they describe won't exist. But this is worth noting in the implementation task so the engineer implementing remaining Decimal tasks knows to skip those sections.

8. **Non-blocking: `--glow-halo-rgb` token.** `theme/tokens.css` defines this token with the comment "used in viral-burst halos." Check if `GameScreen.css` viral choreography is the only consumer. If so, remove the token. If other components use it for non-viral purposes, update the comment.

**Summary:** The design rationale is sound — the viral burst doesn't earn its complexity, and removing it before the Decimal migration is the right sequencing call. Requesting comment on three gaps: (a) 4 missing source files, (b) 4 missing architecture specs, and (c) 8 UX specs that need updating or a follow-up task filed. The proposal should enumerate these explicitly so the implementation task is self-contained.

---
# Review: architect (re-review)

**Date**: 2026-04-08
**Decision**: Aligned

**Comments**

All three blocking concerns from the initial review are resolved:

1. **Missing source files:** §11 now names `GeneratorList.tsx` and `PlatformPanel.tsx` with line numbers. §12 covers `audience-mood/index.ts` stacking order. §13 covers `theme/tokens.css`. §14 covers `DebugApp.tsx`.

2. **Missing architecture specs:** §16 now enumerates all 5 architecture specs (`core-systems.md`, `visual-theming.md`, `verb-gear.md`, `audience-mood.md`, `manual-action-ladder.md`) with specific descriptions of what needs updating.

3. **Missing UX specs:** §17 enumerates all 8 UX specs with a clear directive to file a follow-up task for the UX designer. This is the right approach — the UX cleanup doesn't block the code removal.

Both open questions are resolved. OQ#1 (Decimal sequencing): removal lands first. OQ#2 (stacking order): remove step 5 and renumber. No remaining concerns.

---
# Review: engineer

**Date**: 2026-04-08
**Decision**: Aligned

**Comments**

Verified every viral burst reference in the codebase (26 files match `viral`/`Viral`). The proposal correctly scopes the deletion — files it doesn't name are all `viral_stunts` generator references (ActionsColumn, display.ts, RebrandCeremonyModal, verb-gear tests, generator tests), which are a different system.

No blocking concerns. Five non-blocking observations for the implementing engineer:

1. **Save migration is confirmed, not conditional.** §8 says "verify" whether viral state is persisted. It is — `save/index.ts` lines 92-108 handle `viralBurst` injection and clearing, lines 189-202 have a V1→V2 migration that injects defaults, and tests (lines 110-140, 291-302, 666-676) seed and assert on `viralBurst`. This requires a new migration (current version 16 → 17) that strips `viralBurst` from saved state.

2. **Offline references viral state.** §7 says "verify no viral state leaks into offline." `offline/index.ts` lines 183-185 explicitly resets `viralBurst` to `{ active_ticks_since_last: 0, active: null }`. This is a confirmed deletion, not a verification.

3. **Driver cleanup is larger than described.** §5 says "ViralBurstPayload event dispatch logic." The actual scope includes: `ViralBurstListener` type (line 60), `onViralBurst` subscription API (line 221), viral listener set (line 313), pre-tick capture and dispatch (lines 371-383), and the `onViralBurst` method on the returned object (lines 696-698). ~30 lines of listener infrastructure beyond just the dispatch.

4. **Task #205 scope shrinks.** Board task #205 is "Migrate driver to Decimal (sweep costs, viral payload, sort)." If this removal lands first (per OQ#1), the viral payload conversion disappears from #205's scope. The implementation task should note this dependency so the engineer on #205 knows to skip it.

5. **No files missed.** All 26 grep hits are accounted for — either in the proposal's deletion scope or correctly excluded as `viral_stunts` generator references.

Design rationale is sound, sequencing is right, removal scope is complete. Aligned.
