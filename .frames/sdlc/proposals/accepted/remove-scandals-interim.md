---
name: Remove Scandals From Build (Interim)
description: Rip the live Scandals system out of the client immediately; game runs with no negative-pressure system until Audience Mood is implemented.
author: game-designer
status: accepted
reviewers: []
---

# Proposal: Remove Scandals From Build (Interim)

## Problem

The Scandals & Follower Loss system is fully implemented and live in the client (`client/src/scandal/`, `client/src/types.ts`, `client/src/ui/display.ts`, scandal-related test suites, UI surfaces). It is also **already superseded on paper**: `proposals/accepted/audience-mood-retention.md` replaces it with a softer retention-based system. That replacement has been accepted across reviewers but no implementation work has been done — zero code exists for Audience Mood today.

The live Scandals system is actively harming the design process:

1. **Player experience is unacceptable.** The game-designer has lost confidence in the live system. Modal-style scandal pops ("Your followers fact-checked you") are the specific friction — they violate the engagement-line stance the project has otherwise committed to (modal interrupts, symptom-not-cause, perceived-unfair loss).
2. **Playtest data is polluted.** Several open design tasks depend on felt pacing — #88 (seed cost balance), #94 (rebrand cadence), #95 (tension audit). All of them are currently being playtested against a system the designer has already killed on paper. Data collected against Scandals cannot inform Audience Mood tuning.
3. **Tension Audit (#95) is specifically chartered to ask whether the post-Audience-Mood game is too soft.** Removing Scandals now puts the build into a state very close to that question and produces the exact playtest signal #95 needs.

The question this proposal answers: **what does the build look like in the interim between "Scandals dies" and "Audience Mood ships"?**

## Proposal

**Remove the Scandals system from the client immediately. Until Audience Mood is implemented, the game runs with no negative-pressure system at all.**

This is an explicit **interim state**, not an end state. Audience Mood remains the committed end-state replacement per its accepted proposal.

Scope of removal (architect/engineer to confirm the exact surface):

- `client/src/scandal/` module and its test suite
- Scandal-related types in `client/src/types.ts` (accumulators, scandal events, scandal snapshots, risk levels, scandal state machine, PR response state)
- Scandal UI surfaces in `client/src/ui/display.ts` and any screen/modal components that render scandals, risk meters, PR response flows, or suppressed-scandal flavor text
- Scandal save-state fields — existing saves must migrate cleanly (strip the fields on load; do not fail to load a save that contains them)
- Static data for scandals in whatever data module holds it
- Any algorithm/generator hooks that feed scandal accumulators

What stays:
- The `scandals-and-follower-loss.md` and `audience-mood-retention.md` proposal docs — both remain in `accepted/` as historical record
- The architecture doc `.frames/sdlc/architecture/scandal-system.md` — marked superseded, not deleted
- The Tension Audit draft (#95) — its premise is strengthened, not invalidated

### Design rationale

- **The designer's frustration is a signal, not noise.** Continuing to playtest against a system the designer has publicly killed biases every downstream tuning decision. Remove the bias source.
- **The "game feels flat" risk is the feature, not the bug.** Task #95 is literally asking that question. An interim period with zero negative pressure is the clearest possible test of whether negative pressure is even needed in the shape Audience Mood proposes.
- **Throwaway placeholders are rarely throwaway.** A stub negative-pressure system (Option C in the design conversation) was considered and rejected: placeholder code becomes load-bearing, biases Audience Mood tuning, and adds engineering cost for no design information.
- **Save migration is non-destructive.** Players' existing runs do not break — scandal state is stripped silently on load.

### Out of scope

- Implementation of Audience Mood. That is a separate, larger work item downstream of this one.
- Any decision about whether Audience Mood's specced values (retention floor, per-platform-per-generator fatigue, mood math) need revision. Those decisions wait for playtest data from the interim state.
- UI replacement for the emptied space where scandal risk meters / PR response flows previously lived. If the interim state leaves visible holes in the screen, that is a UX task downstream of this removal — not blocking.

## References

1. `.frames/sdlc/proposals/accepted/scandals-and-follower-loss.md` — the system being removed
2. `.frames/sdlc/proposals/accepted/audience-mood-retention.md` — the committed end-state replacement
3. `.frames/sdlc/architecture/scandal-system.md` — architecture contract for the live system
4. `.frames/sdlc/proposals/draft/tension-audit-post-audience-mood.md` — the design question this interim state is the clearest test of
5. `client/src/scandal/` — the module being removed
6. `client/src/types.ts` — scandal-related type definitions
7. `client/src/ui/display.ts` — scandal display metadata

## Open Questions

1. **Does save-state migration need a version bump, or can scandal fields be stripped silently on load?** Owner: architect
2. **[RESOLVED] What UI surfaces get left empty by removal, and does any of them need a holding state before Audience Mood ships?** Owner: ux-designer (follow-up task, not blocking this proposal)
  - Answer (ux-designer, 2026-04-05): No holding state needed. Every scandal UI surface is either *event-gated* (only renders while a scandal is active) or *decorative* (an amber class layered on top of a row/card that renders normally without it). Traced surfaces: (1) `ScandalModal` + `ScandalAftermathCard` in `GameScreen.tsx` — event-gated, never visible without an active scandal, leaves zero hole when removed. (2) `riskLevels` prop on `GeneratorList`/`GeneratorRow` — adds `.risk-building`/`.risk-high` class to an existing row; removing the prop returns the row to its neutral rendering with no layout shift. (3) `riskLevels` prop on `PlatformPanel`/`PlatformCard` — same pattern, same clean removal. (4) CSS rules `.generator-row.risk-*` and `.platform-card.risk-*` (≈4 selectors + a reduce-motion override) are pure augments over base styles; deleting them is non-destructive. (5) `GameScreen.css` scandal block (~26 rules, `.scandal-*` prefixed, overlay/card/timer/damage/spend/aftermath) is only reachable through the modals being deleted — dead code after removal. No layout reflows, no emptied slots, no "where did the thing go" gap. The top-bar global-risk glyph specced in `ux/scandal-system.md` §1 was never wired into `TopBar.tsx`, so there is nothing to un-wire there. The interim build reads as the same screen minus amber warmth on at-risk rows/cards — which is exactly right, because there is no risk to communicate.
3. **[RESOLVED] Are there existing balance/playtest tasks (#88, #94) that should be explicitly paused until this removal lands, so no one is collecting data against a system about to die?** Owner: producer / game-designer
  - Answer (game-designer, 2026-04-05): **Yes — pause both.** Task #88 (seed-cost balance pass) and task #94 (rebrand cadence intent) are both explicitly playtest-dependent, and playtesting against the live Scandals system is exactly the bias source this proposal is removing. Any seed-cost retune or rebrand-pacing call made right now would be tuned against a negative-pressure system about to be deleted. Reactivate both once the removal lands — at that point, playtest data reflects the game's actual interim shape (no negative pressure) which is a truer baseline for Audience Mood tuning anyway. Producer should mark both tasks as blocked on this proposal's implementation task.
4. **[RESOLVED] Once removed, does the Tension Audit draft (#95) get promoted to higher priority, since the game is now in the state it was chartered to evaluate?** Owner: game-designer
  - Answer (game-designer, 2026-04-05): **Yes — promote it.** Task #95 was chartered specifically to ask "does the post-Audience-Mood game have enough felt stakes?" Once Scandals is ripped out, the build is in a state *even softer* than post-Audience-Mood (zero negative pressure vs. retention drag). That is the cleanest possible environment to evaluate whether the game needs negative pressure at all, what shape, and how much. Promote #95 to active once the removal lands and playtest a full session or two against the zero-pressure build before Audience Mood gets built — the answers may reshape Audience Mood's tuning priorities or even its scope.
5. **Should the Settings module's `reduceTimePressure` flag be kept (dormant) or removed now?** The field is in the settings schema v1 and would require a settings-schema migration to remove cleanly. Keeping it dormant costs nothing and avoids bumping the settings version twice if Audience Mood reuses the same affordance. Owner: engineer (recommend: keep the schema field, hide the toggle from the Settings UI until it has a real referent).
6. **[RESOLVED] Does the `SettingsModal.tsx` toggle copy ("Doubles the scandal decision window...") get removed, reworded, or left in place for the interim?** Owner: ux-designer — the control will be visible but functionally inert once scandal is gone. Recommend hiding the toggle row in the interim rather than leaving misleading copy in the UI.
  - Answer (ux-designer, 2026-04-05): **Hide the "Reduce Time Pressure" row entirely during the interim.** Agreeing with the engineer's recommendation and making it a UX call, not just an engineering shortcut. Reasoning: (a) a visible toggle with no referent is a trust-signal failure — the player flips it, nothing happens, they stop trusting every other Settings control on the screen. (b) rewriting copy ("doubles the countdown window for future stressful decisions") sells a promise the build can't deliver and pre-commits the UI to a design Audience Mood may not need a time-pressure affordance for at all. (c) leaving it in place with scandal-specific copy is the worst option — it implies a system the player will never encounter. Implementation: render the row conditionally on a `SCANDALS_ENABLED` feature flag, OR simply delete the `<SettingsToggle label="Reduce Time Pressure" />` block and its wiring from `SettingsModal.tsx`. Keep the `reduceTimePressure` *schema field* in `settings/index.ts` per OQ5 — the field stays dormant, the UI surface goes away. When Audience Mood ships, its UX spec decides whether to resurrect the control (same name, new description) or replace it. The MOTION section will still contain "Reduce Motion" so the section header remains legitimate and the modal doesn't shrink visibly. Non-blocking note: if the engineer prefers to land the removal in one commit without the feature-flag scaffold, a straight delete of the toggle row is fine — the schema field costs nothing to keep orphaned.

---
# Review: architect

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

1. **Scope of removal is accurate and complete.** I traced every `scandal|Scandal|accumulator` reference in `client/src/`. The touchpoints are:
   - `client/src/scandal/` (module + test suite)
   - `client/src/types.ts` — `RiskAccumulator`, `ScandalEvent`, `ScandalSessionSnapshot`, `ScandalStateMachine`, `ScandalTypeId`, `ScandalTypeDef`, `ScandalStaticData`, plus the `accumulators` / `scandalStateMachine` / `scandalSessionSnapshot` fields on `GameState` and the `scandal:` key on `StaticData`
   - `client/src/static-data/index.ts` — `SCANDAL_TYPE_DEFS` (lines ~391–467) and the `scandal:` key on the static data export
   - `client/src/ui/display.ts` — `ScandalDisplay` interface and `SCANDAL_DISPLAY` map
   - `client/src/ui/ScandalModal.tsx` + `ScandalModal.test.ts`
   - `client/src/save/index.ts` — migration V2→V3 and the load-path scandal-field defaulting block
   - `client/src/game-loop/index.ts` — the entire §13 "Scandal accumulator updates" block (lines ~475–577), plus the return payload fields
   - `client/src/model/index.ts` — `createInitialState` calls `createDefaultStateMachine`
   - `client/src/driver/index.ts` — `dismissScandalResolution`, session snapshot creation on open, imports from `../scandal/index.ts`
   - `client/src/prestige/index.ts` — preserves `scandalStateMachine`/`scandalSessionSnapshot` across rebrand (lines 197–207)
   - `client/src/ui/{GameScreen.tsx, GameScreen.css, GeneratorList.tsx, PlatformPanel.tsx, useGame.ts, SettingsModal.tsx}` — will need a scan for scandal references (risk-meter rendering, modal wiring, etc.)
   - `client/src/offline/index.ts` — grep was negative; no accumulator advancement during offline catch-up. Good.

   The proposal's listed scope is correct but should be expanded by the engineer to include: `model/index.ts` (initial-state construction), `driver/index.ts` (the `dismissScandalResolution` method on the Driver interface and the session-open snapshot wiring), `prestige/index.ts` (rebrand passthrough), and `static-data/index.ts` (both the SCANDAL_TYPE_DEFS block and the `scandal:` key on the StaticData export).

2. **No coupling into other accepted systems.** I grepped for `scandal|Scandal` across `algorithm/`, `generator/`, `creator-kit/`, and `offline/` — zero matches. Scandal is genuinely additive: the `ScandalTypeDef.amplifiedBy` field references generator IDs by string, but the dependency points *into* scandal, not out of it. Removing scandal does not require changes to algorithm, generators, creator-kit, prestige economics, or offline catch-up. The `Driver` interface loses one method (`dismissScandalResolution`) — UI callers are in `useGame.ts`/`ScandalModal.tsx` which are also being removed, so this is self-contained.

3. **Open Question 1 (save migration) — answer: do a version bump, not a silent strip.** The proposal's current load-path strip would work, but it's the wrong call. Reasoning:
   - The save format has an explicit `version` field and an explicit migration chain (currently at V5). The convention is established: every schema change is a numbered migration. Silently stripping fields on load would be the first break from that convention and creates an undocumented "field was here, now it isn't" gap that the next engineer has to rediscover.
   - The existing `load()` function has a block (lines 100–121) that *defaults scandal fields back in* if missing. A silent strip would require simultaneously deleting that defaulting block. If both changes aren't made in the same commit, a V5 save with no scandal fields will get scandal fields re-synthesized on load — confusing state.
   - **Recommended path:** bump `CURRENT_VERSION` to 6. Add `migrateV5toV6` that deletes `accumulators`, `scandalStateMachine`, and `scandalSessionSnapshot` from `state` (and the V2→V3 migration stays untouched as historical record — a V2 save still walks V2→V3→V4→V5→V6 and ends up in the right shape). Update the load-path to no longer synthesize scandal defaults. Delete `ScandalStateMachine`/`RiskAccumulator` imports from `save/index.ts`.
   - This is cheaper than it sounds: one migration function, ~10 lines, matches existing conventions, and leaves an auditable trail. Audience Mood will later add V6→V7 for its own new fields.

4. **Architecture doc `scandal-system.md` should be marked superseded, not deleted.** Insert a banner at the very top (above the current `> **Scope:**` blockquote):
   ```
   > **SUPERSEDED (2026-04-05):** This system was removed from the client per
   > `proposals/accepted/remove-scandals-interim.md`. The end-state replacement
   > is Audience Mood — see `proposals/accepted/audience-mood-retention.md`.
   > This document is retained as historical record of the removed system's
   > contracts.
   ```
   Deletion would lose the contract history that the Audience Mood architecture work will want to reference (the retention model explicitly defines itself against the scandal model's failure modes). Superseding is the right move.

5. **Non-blocking observation — the interim save is a legitimate published format.** Once V6 ships, some players will have V6 saves. When Audience Mood lands and adds its fields, that becomes V7, and the V6→V7 migration is where mood defaults get seeded. This is fine and normal, but worth naming: the "interim state" is not just a build state, it is a save-format generation that will exist in real localStorage blobs. The migration chain handles it correctly.

6. **Non-blocking observation — Open Question 3 (paused tasks).** Not architect's call, but I'll note: #88 (seed cost) and #94 (rebrand cadence) also touch `prestige/index.ts` which this removal touches. Producer should sequence these so the removal lands first and those tasks rebase onto the cleaned-up state.

**Summary.** The scope is accurate (with the expansion noted in §1), no other system has hooks into scandal that would break, save migration has an obvious right answer (version bump to V6 with an explicit strip migration — do NOT silent-strip on load), and `scandal-system.md` should get a superseded banner. Nothing in this proposal is blocking from an architecture perspective.

I'm removing myself from `reviewers`. Engineer still needs to sign off on implementation scoping/effort.

---
# Review: engineer

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

Implementation scope and effort check. I independently traced every scandal reference in `client/src/` and confirm the architect's scope expansion is correct. Concrete line-level surface area the build task will touch:

**Files to delete outright (~2450 LOC):**
- `client/src/scandal/index.ts` (990 lines)
- `client/src/scandal/index.test.ts` (1215 lines)
- `client/src/ui/ScandalModal.tsx` (211 lines)
- `client/src/ui/ScandalModal.test.ts` (34 lines)

**Files to edit (scandal touchpoints only, line ranges verified):**
- `client/src/types.ts` — remove lines 223–379 (all scandal type definitions) plus four fields on `GameState` (`accumulators`, `scandalStateMachine`, `scandalSessionSnapshot`) and `StaticData.scandal`.
- `client/src/save/index.ts` — strip the load-time scandal hydration block (lines 100–121), drop `ScandalStateMachine`/`RiskAccumulator` imports, bump `CURRENT_VERSION` to 6, add `migrateV5toV6` per the architect's guidance.
- `client/src/model/index.ts` — lines 18–21 (imports), 147–159 (scandal init in `createInitialGameState`).
- `client/src/driver/index.ts` — lines 37–43 (imports), 148–156 (state-machine methods on Driver interface), 245–256 (open/foreground snapshot), 342–343 (freeze-on-save), 388–397 (Trend-Chasing hook on buy), 471–482 (`confirmScandalSpend`, `dismissScandalResolution`). This is the largest surgical edit — the Driver public API loses methods.
- `client/src/game-loop/index.ts` — lines 39–43 (imports), 475–577 (entire §13 state-machine advancement block). Sizable but cleanly fenced.
- `client/src/prestige/index.ts` — lines 197–207 (scandal fields preserved across rebrand).
- `client/src/static-data/index.ts` — lines 21–23 (imports), 391–473 (SCANDAL_TYPE_DEFS + SCANDAL_STATIC_DATA), 591 (`scandal:` key on export).
- `client/src/ui/useGame.ts` — lines 11, 46–47, 51, 147, 154–161 (`computeScandalUIState`, `scandalUIState` hook output, `dismissScandalResolution` action).
- `client/src/ui/GameScreen.tsx` — lines 38, 106, 108, 259–273, 408, 421, 458–471 (modal rendering, aftermath card, `riskLevels` props to generator/platform components).
- `client/src/ui/GeneratorList.tsx` — lines 20, 34, 52, 101–102, 237–238 (optional `riskLevels` prop + `RiskLevel` type import + per-row rendering path).
- `client/src/ui/PlatformPanel.tsx` — parallel edit (optional `riskLevels` prop + `RiskLevel` import).
- `client/src/ui/display.ts` — lines 16, 249–259+ (`SCANDAL_DISPLAY` map and `ScandalDisplay` type).
- `client/src/ui/GameScreen.css` — 26 scandal-scoped CSS rules (`.scandal-overlay`, `.scandal-card`, `.scandal-timer-*`, etc.) starting around line 1749. All `.scandal-*` prefixed; zero selector-collision risk.

**Files the proposal's "Scope of removal" list did NOT call out:**
- `client/src/settings/index.ts` line 22 — `reduceTimePressure` comment references scandal (see new open question 5).
- `client/src/ui/SettingsModal.tsx` line 205 — visible toggle copy reads "Doubles the scandal decision window." Will be misleading once scandal is gone (see new open question 6).
- `client/src/index.css` line 5 — stylesheet comment mentions scandals as a "witness moment." Trivial.

**Test suite impact — this is surprisingly clean.** Only two test files reference scandal: `scandal/index.test.ts` (deleted) and `ScandalModal.test.ts` (deleted). **Zero other test files reference scandal, accumulator, or RiskLevel symbols.** No integration, game-loop, driver, save, prestige, generator, algorithm, offline, creator-kit, model, static-data, or UI tests need to be refactored for scandal-specific reasons. A couple of `GameState`-shape-aware tests may need trivial fixture updates if their fixtures include scandal fields, but the designer's instinct that this is a self-contained module is correct at the test layer.

**Type-level coupling — not a concern.** No non-scandal type references `ScandalTypeId`, `RiskAccumulator`, `ScandalEvent`, `ScandalStateMachine`, `ScandalSessionSnapshot`, `ScandalTypeDef`, `ScandalStaticData`, or `RiskLevel`. `GameState` embeds three scandal fields but only scandal-module code reads them. `StaticData.scandal` is read only by scandal. `RiskLevel` is consumed as an optional UI prop type by two components and both props go away with the removal. Clean cut at the type layer.

**Save-state compatibility — aligned with architect's V5→V6 migration path.** The V2→V3 migration stays as historical record; V5→V6 strips the three scandal fields; the `load()` hydration block at lines 100–121 must be deleted in the same commit (not conditionalized) so we don't re-synthesize scandal fields on V6 saves. Importing via `importSaveJSON` works unchanged because it routes through the same migration chain. Runtime behavior is correct as long as the two changes (migration + hydration-block removal) ship together.

**Effort estimate — roughly 1 solid day (6–8 hours) for a careful engineer, not a few hours.**
- ~0.5h file deletions (scandal module + ScandalModal) and commit
- ~1h types.ts edit + downstream typecheck sweep
- ~1h save migration + its test (one new `migrateV5toV6` test case, plus deleting any old fixtures that embed scandal state)
- ~2h driver + game-loop surgery — these have the largest surface and public-API impact
- ~1h model.ts + prestige.ts + static-data.ts
- ~1h UI props cleanup across useGame/GameScreen/GeneratorList/PlatformPanel/display
- ~0.5h CSS cleanup
- ~1h typecheck + test + manual-verify loop

**Hidden costs I'd flag:**
1. **Driver public API changes.** `confirmScandalSpend` and `dismissScandalResolution` are part of the Driver interface contract. Removing them changes the contract. Low risk (only consumers are UI files that are also being edited), but the Driver-interface typechange will cascade.
2. **Risk-meter UI state disappears on generator/platform rows.** Row components lose their optional `riskLevels` prop. Non-blocking visual consequence; already acknowledged as UX follow-up in the proposal's Out-of-Scope section.
3. **Settings toggle goes dormant.** The `reduceTimePressure` Settings field remains wired through the settings module but has nothing to affect. Cheapest handling is to hide the toggle row in `SettingsModal.tsx` without removing the schema field (see new open questions 5 + 6).

**Additional risks / closing notes:**
- Rebrand passthrough removal is clean — nothing else needs a rebrand-spanning accumulator contract.
- `offline/index.ts` does not touch scandal. Offline catch-up does not need to change.
- All scandal CSS is prefixed; no bleed risk from deletion.
- The UX-designer is not on this review but will need to decide (non-blocking) whether Settings toggle rows hide or reword. Added as open question 6.

Summary: scope is accurate with the architect's expansion, effort is ~1 day (not a few hours), test footprint is genuinely self-contained, save migration path is the right call, no engineering blockers. I'm approving and removing myself from `reviewers`. Two new non-blocking open questions added (5 and 6) for producer/UX follow-up — these do not gate implementation.

---
# Review: ux-designer

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

I focused on what the player actually sees after the removal lands, traced every scandal surface in the UI layer, and answered OQ2 and OQ6 inline (both [RESOLVED] above). No blocking UX concerns.

1. **Empty UI surfaces — there are none worth holding space for.** I traced scandal UI across `GameScreen.tsx`, `GeneratorList.tsx`, `PlatformPanel.tsx`, `ScandalModal.tsx`, `SettingsModal.tsx`, and `GameScreen.css` §scandal block. Every surface falls into one of two clean categories: *event-gated* (the PR Response modal and Aftermath card — only render while a scandal is live, so removing them leaves no visible hole on the base screen) or *decorative augment* (amber `.risk-building` / `.risk-high` classes layered on top of generator rows and platform cards, which render normally without the class). No layout reflows. No emptied slots staring back at the player. The screen reads as the same surface minus amber warmth — which is correct, because there is no risk to communicate in the interim. This confirms the proposal's "Out of scope" call: no holding state is needed. See OQ2 answer above for surface-by-surface trace.

2. **Settings toggle — hide the row, keep the schema field.** Answered in detail at OQ6. Short version: agreeing with the engineer's "hide the toggle row" recommendation as a UX call. A control with no referent is a trust-signal failure that bleeds into every other control in the same modal. Reworded copy pre-commits Audience Mood's UX to a time-pressure affordance it may not need. Keep `settings.reduceTimePressure` in the schema dormant (per OQ5) so Audience Mood can resurrect the toggle without a settings-version double-bump.

3. **UX specs need superseded banners, mirroring the architect's recommendation for `architecture/scandal-system.md`.** Two docs describe the removed system as live:
   - `ux/scandal-system.md` — whole spec is about risk indicators, PR Response modal, aftermath, stacking. Should get a superseded banner at the top matching the architect's wording, pointing at `proposals/accepted/remove-scandals-interim.md` and `proposals/accepted/audience-mood-retention.md`. Retain as historical record — Audience Mood's UX spec will want to reference the specific pain points (modal interruption, countdown pressure, symptom-not-cause framing) it's designed to avoid.
   - `ux/visual-identity.md` — has a dedicated §3 "Scandal Visual Identity" defining the scandal red accent (`#df3a3a`), scandal icons, and CVD separation notes. Does NOT need a full-doc supersede banner (the platform + generator sections remain live and correct), but §3 should get a section-scoped `> **SUPERSEDED (2026-04-05):**` banner at its top with the same pointer. The scandal-red token (`--scandal-accent`) in §3 can stay documented for future reference — if Audience Mood introduces a negative-event accent it may or may not reuse this red, and having the historical token documented is cheaper than rediscovery.
   
   I'll take this as a follow-up ux-designer task after the build lands — non-blocking for this proposal. Adding it as a new open question (OQ7) below so it doesn't get lost.

4. **Transitional player experience — acceptable, no onboarding work needed.** When a player loads a V6 save, the migration strips their `accumulators`, `scandalStateMachine`, and `scandalSessionSnapshot`. If they were mid-scandal at last save, the scandal silently vanishes. There is no UI artifact: no "a scandal was about to fire but no longer will" notification, no empty modal shell, no orphaned risk indicator. The player simply resumes without the thing they may have been worrying about. This is the *right* player experience for this interim: we are deliberately removing a system the designer has killed, and an in-game acknowledgement ("we deleted your scandal") would both confuse players who never noticed the scandal coming and undermine the rationale for removing the system quietly. If we wanted a safety net, a one-time release-note banner ("Scandals are removed while we rework audience reactions") could live above the save-error banner slot — but I'd argue *against* shipping it. Two reasons: (a) most playtesters are in the design loop and already know; (b) any in-game copy naming "scandals" recommits us to the vocabulary Audience Mood is designed to replace. Ship silently.

5. **Additional UX observations (non-blocking):**
   - The engineer's trace noted `client/src/index.css` line 5 mentions scandals as a "witness moment." Trivial, but while we're here: update the comment to generalize, or delete the reference. Not worth a round-trip.
   - The `SettingsModal.tsx` "MOTION" section header remains legitimate with just the "Reduce Motion" toggle underneath — section doesn't need to be renamed or collapsed. Modal will lose ~52px of vertical height, which is fine; the modal body is flex-column and doesn't depend on a fixed height.
   - When Audience Mood ships, the amber risk vocabulary (`.risk-building` amber warmth, `.risk-high` pulsing amber) should be considered *available* for mood's pre-churn signaling. Deleting the CSS rules in this pass is correct — the vocabulary can be redefined against mood's specific semantics rather than inherited from scandal's accumulator model. Flagging for future-me: don't resurrect the classes as dead code.

6. **Screen-reader / accessibility impact — clean.** The scandal modal has its own `role="dialog"` / focus trap / Esc handler, which goes away with the modal. No `aria-live` regions or announcements outside the scandal module reference scandal state. Removal does not leave dangling ARIA attributes or focus traps.

**New open question added:**

7. **Do `ux/scandal-system.md` and `ux/visual-identity.md` §3 need superseded banners matching the architect's recommendation for `architecture/scandal-system.md`?** Owner: ux-designer (follow-up task, recommend tackling in the same PR that supersedes the architecture doc — banners are cheap and co-located with the removal, not blocking).

**Summary.** No UI holes worth holding, no onboarding concerns, no blocking UX issues. OQ2 answered (no holding state needed), OQ6 answered (hide the "Reduce Time Pressure" row, keep the schema field). Recommend superseding `ux/scandal-system.md` and scoping a supersede banner onto `ux/visual-identity.md` §3 as a follow-up (new OQ7). I'm aligned and removing myself from `reviewers`. With architect + engineer + ux-designer all aligned, this proposal is ready for the author to move to `accepted/`.
