---
name: Creator Kit — Per-Verb Gear Upgrades
description: Replaces the entire Creator Kit system with per-verb equipment items that provide massive (~10x) yield multipliers per level, forming the Phase 2 progression layer after POWER/SPEED/HIRE plateaus.
created: 2026-04-07
author: game-designer
status: implementation
reviewers: []
---

# Proposal: Creator Kit — Per-Verb Gear Upgrades

## Problem

Phase 1 progression — the POWER/SPEED/HIRE loop (level-driven cooldown, count-driven yield, stackable autoclickers) — plateaus. Once a player has maxed speed tiers (L10 on all verbs) and stacked meaningful BUY counts and autoclickers, engagement/sec growth flattens against exponential costs. The player needs a new multiplicative breakthrough that breaks the plateau without introducing new content tiers or requiring prestige.

The existing Creator Kit system (Camera, Phone, Wardrobe, Mogging) was designed as a generic 5-axis modifier layer — engagement rate, platform head-start, follower conversion, viral burst amplification. This design has three problems:

1. **It's disconnected from the verbs.** The player's identity is their verb ladder — chirps, selfies, livestreams, podcasts, viral stunts. The old kit items don't touch verbs; they modify global rates. The player never feels "I upgraded my chirps gear."

2. **It's too many abstract axes.** Five items modifying five different systems (engagement rate, algorithm lookahead, platforms, follower conversion, viral burst) is a lot of mental surface area for modifiers the player can't see working. The verb buttons are where the player looks. Multipliers should land there.

3. **It doesn't break the plateau.** The old kit items were incremental multipliers (1.5x, 2x engagement rate). The plateau needs order-of-magnitude jumps — 10x, 100x, 1000x — to feel like a breakthrough.

## Proposal

### 1. One Gear Item Per Verb

Each of the 5 manual verbs gets one Creator Kit item — a piece of equipment thematically tied to that verb's content medium:

| Verb | Kit Item | Fantasy |
|---|---|---|
| Chirps | Mechanical Keyboard | You type faster, hit harder, every keystroke thunders |
| Selfies | Phone | Better camera, better angles, every shot is a banger |
| Livestreams | Camera | Pro rig, studio lighting, the production value explodes |
| Podcasts | Microphone | Broadcast quality, your voice carries authority |
| Viral Stunts | Shameless | You've lost all inhibition — nothing is off limits |

Each item has **3 levels**. Each level provides a **~10x multiplier** to that verb's yield. At max level, a single verb's kit multiplier is ~1000x.

### 2. The Multiplier

Creator Kit gear **replaces the existing `kit` factor** in both the manual-tap and passive-rate formulas with a per-verb `gear_multiplier`. The transformation is: everywhere the current codebase multiplies by the global `kit` engagement bonus, substitute the per-verb gear multiplier for that specific generator. No other formula terms change.

**Per-tap yield** (`verbYieldPerTap`):
```
// Current:
base_event_yield × (1 + count)^count_exponent × (1 + autoclicker_count) × clout × kit

// After:
base_event_yield × (1 + count)^count_exponent × (1 + autoclicker_count) × clout × gear_multiplier
```

**Passive rate** (`computeGeneratorEffectiveRate`):
```
// Current:
autoclicker_count × level × base_event_rate × base_event_yield × (1 + count)^count_exponent × clout × kit

// After:
autoclicker_count × level × base_event_rate × base_event_yield × (1 + count)^count_exponent × clout × gear_multiplier
```

Where `gear_multiplier` is the cumulative Creator Kit multiplier for that specific verb's gear item. At level 0: ×1. At level 1: ×10. At level 2: ×100. At level 3: ×1000. For generators with no gear item (passive-only generators, post-prestige generators), `gear_multiplier` is always 1.0.

This multiplier applies to **both manual taps and autoclicker fires** for that verb. It's a gear upgrade to the verb itself — the keyboard doesn't care who's typing.

### 3. Cost Structure

Creator Kit items are purchased with **Engagement**. Costs are structured in a two-dimensional table: scaled by verb (higher verbs cost more) and scaled by level (each level costs dramatically more than the last).

**Design intent:** L1 of the cheapest verb (chirps) is the entry point at **2B engagement**. Each subsequent level jumps by roughly **1000x**. Higher verbs' L1 costs are spaced so the player works through them sequentially but not linearly — there should be a "little while" between each verb's first kit purchase.

**Starting balance cells** (all values are tuning targets, not sacred numbers):

| Verb | L1 Cost | L2 Cost | L3 Cost |
|---|---|---|---|
| Chirps (Mechanical Keyboard) | 2B | 2T | 2Qa |
| Selfies (Phone) | 20B | 20T | 20Qa |
| Livestreams (Camera) | 200B | 200T | 200Qa |
| Podcasts (Microphone) | 2T | 2Qa | 2Qi |
| Viral Stunts (Shameless) | 20T | 20Qa | 20Qi |

**Multiplier values per level** (cumulative):

| Level | Multiplier | Effect |
|---|---|---|
| 0 (unpurchased) | x1 | No gear bonus |
| 1 | x10 | 22K -> 220K |
| 2 | x100 | 220K -> 2.2M |
| 3 | x1000 | 2.2M -> 22M |

These tables are the **entire balance surface** for the Creator Kit. Adding, removing, or retuning items is a static-data change. See §5 for the data model.

### 4. Per-Run Lifecycle

Creator Kit gear is **wiped on rebrand**. The player re-earns their gear every run.

This is the same lifecycle as the old Creator Kit and for the same reason: Clout upgrades (permanent, earned via prestige) make re-earning kit faster each run. The 2B+ entry price means kit purchases are a mid-to-late-run investment. Losing them on rebrand gives the prestige loop its payoff — "this run I got Mechanical Keyboard by minute 8 instead of minute 20."

### 5. Data Model

The balance must be easy to configure. All kit item definitions live in static data as a flat lookup table.

**Static data:**

```ts
type VerbGearId = 'chirps' | 'selfies' | 'livestreams' | 'podcasts' | 'viral_stunts';

interface VerbGearDef {
  id: VerbGearId;
  name: string;                 // "Mechanical Keyboard", "Phone", etc.
  max_level: number;            // 3
  cost: number[];               // length = max_level, ascending
  multipliers: number[];        // length = max_level, cumulative per-level
}

// On StaticData:
verbGear: Record<VerbGearId, VerbGearDef>
```

`VerbGearId` is a narrow union of the 5 manual-clickable generator IDs — not an alias for `GeneratorId`. This prevents passing passive-only or post-prestige generator IDs as gear IDs at the type level. The `VerbGearId` value doubles as the `GeneratorId` of the verb it upgrades — the 1:1 mapping is the key in the Record, no separate `generator_id` field needed.

**Player state:**

```ts
// On Player (wiped on rebrand):
verb_gear: Record<VerbGearId, number>   // gear_id -> current level (0 = unowned)
```

**Runtime computation:**

```ts
function verbGearMultiplier(
  generatorId: GeneratorId,
  verbGear: Record<VerbGearId, number>,
  staticData: StaticData,
): number {
  const def = staticData.verbGear[generatorId as VerbGearId];
  if (!def) return 1.0;
  const level = verbGear[def.id] ?? 0;
  return level <= 0 ? 1.0 : def.multipliers[level - 1];
}
```

No new state beyond the level counter per gear item. The multiplier is a pure derivation from static data + level. The lookup is O(1) — direct key access on the Record.

### 6. What Gets Ripped Out

The entire existing Creator Kit system is removed:

**Code deletions:**
- `client/src/creator-kit/` — entire module (index.ts, index.test.ts)
- `client/src/ui/CreatorKitPanel.test.ts` — existing panel tests
- All Creator Kit UI components (CreatorKitPanel and related)

**Type deletions:**
- `KitItemId` type (`'camera' | 'phone' | 'wardrobe' | 'mogging'`)
- `KitEffect` tagged union
- `KitItemDef` interface
- `Player.creator_kit` field
- `StaticData.creatorKitItems` field

**Static data deletions:**
- `CREATOR_KIT_ITEM_DEFS` object in `static-data/index.ts`

**Integration point removals:**
- `kitEngagementBonus()` calls in the tick pipeline (`game-loop/index.ts`)
- `kitFollowerConversionBonus()` calls in follower distribution (`game-loop/index.ts` L466–469 `computeSnapshot`, `offline/index.ts` L31/L119–121/L134)
- `kitViralBurstAmplifier()` calls in viral burst trigger
- `kit` factor in `verbYieldPerTap` and `computeGeneratorEffectiveRate` (replaced by `gear_multiplier`)
- Phone head-start logic in `purchaseKitItem`
- Creator Kit wipe in `applyRebrand` (replaced by `verb_gear = {}`)
- `buyKitItem` on the driver interface and useGame hook
- Stacking order comment referencing `kitEngagementBonus` in `audience-mood/index.ts` L11
- Creator Kit panel styles in `ui/GameScreen.css`
- Creator Kit CSS tokens in `theme/tokens.css`
- Static data tests validating `CREATOR_KIT_ITEM_DEFS` in `static-data/index.test.ts`

**Save migration chain:**
- `migrateV4toV5` (introduces `player.creator_kit`) and `migrateV9toV10` (strips `laptop`) remain in the chain for forward-compatibility with ancient saves — they produce a field the new migration subsequently removes
- New migration: version bump, strip `player.creator_kit`, add `player.verb_gear = {}`

**Architecture doc:**
- `.frames/sdlc/architecture/creator-kit.md` — entire doc is dead, replaced by a new `architecture/verb-gear.md` (architect follow-up task)

**Autoclicker cap scaling removal:**
- `generator/index.ts` L96–100: `autoclickerCap(rebrandCount)` → flat constant `12`
- `generator/index.ts` L351–354: `buyAutoclicker` cap check — remove `rebrand_count` parameter
- `driver/index.ts` L450–452: HIRE track cap check — remove `rebrand_count` lookup

**Proposal supersessions:**
- `proposals/accepted/creator-kit-upgrades.md` — fully superseded
- `proposals/accepted/brand-deal-boost.md` — fully superseded
- `proposals/accepted/20260406-brand-deal-milestones.md` — fully superseded

All three proposals are dead. The new system replaces the entire Creator Kit concept with per-verb gear.

### 7. What Gets Added

**New module:** `client/src/verb-gear/` (or folded into an existing module — architect's call)

**New types:**
- `VerbGearId` — narrow union: `'chirps' | 'selfies' | 'livestreams' | 'podcasts' | 'viral_stunts'`
- `VerbGearDef` interface
- `Player.verb_gear: Record<VerbGearId, number>`
- `StaticData.verbGear: Record<VerbGearId, VerbGearDef>`

**New integration points:**
- `verbGearMultiplier(generatorId, verbGear, staticData)` called in:
  - `verbYieldPerTap` (manual taps)
  - `computeGeneratorEffectiveRate` (passive/autoclicker rate)
- `purchaseVerbGear(state, gearId, staticData)` — spend engagement, increment level
- `verb_gear = {}` added to `applyRebrand` reset pass
- Save migration: version bump, default `verb_gear = {}`

**New static data:**
- `VERB_GEAR_DEFS` — the 5-item table from §3

### 8. Engagement Line Check

1. **Is this mechanic honest?** Yes — each gear item says what it does (x10 to this verb), the effect is immediate and visible in the floating numbers, no hidden modifiers.
2. **Can the player quit without loss?** Yes — gear is wiped on rebrand anyway. No penalty for absence, no streak, no FOMO.
3. **Is progression tied to engagement or just time?** Yes — reaching 2B+ engagement requires active play and smart investment in Phase 1. Kit purchases are earned, not waited for.

No concerns.

### 9. Player Psychology

**Target feeling:** "I just strapped a rocket to my chirps." The 10x jump is the plateau-breaker. The player has been grinding Phase 1, watching diminishing returns on BUY and SPEED, and then they cross 2B and suddenly their chirps output jumps by an order of magnitude. That's the moment.

**Endowment effect:** Each gear level is expensive enough that losing it on rebrand stings — which makes the prestige loop's "re-earn it faster" payoff land harder.

**Intrinsic motivation:** The per-verb binding means the player thinks about their verbs as individuals. "My chirps are geared up but my selfies aren't yet" creates a natural goal ladder within each run.

**Loss aversion:** Per-run wipe is a loss event. Mitigated by the same mechanism as generators: the player chooses when to rebrand, and Clout makes re-earning faster. The loss is voluntary and the recovery is visible.

### 10. HIRE Button Transformation & Autoclicker Cap Change

#### Autoclicker cap — flatten to 12

The current autoclicker cap is `12 * (1 + rebrand_count)` (`generator/index.ts` L99–100, `autoclickerCap()`). This scales with prestige: 12 on first run, 24 after first rebrand, 36 after second, etc. **This scaling is removed.** The cap becomes a flat **12 autoclickers per verb**, regardless of rebrand count.

**Code sites to change:**
- `generator/index.ts` L96–100: `autoclickerCap(rebrandCount)` → return flat `12`
- `generator/index.ts` L351–354: `buyAutoclicker` cap check — remove `rebrand_count` parameter
- `driver/index.ts` L450–452: HIRE track cap check — remove `rebrand_count` lookup

The `rebrand_count` parameter is no longer needed by the cap function. The cap is a static constant.

#### HIRE → SUPER button lifecycle

When a verb's `autoclicker_count` reaches the cap (12), the HIRE button **transforms into a SUPER button**. The button does not add more autoclickers — it purchases the next gear level for that verb.

**Per-verb button lifecycle:**

```
HIRE (0/12) → HIRE (1/12) → ... → HIRE (12/12) → SUPER I → SUPER II → SUPER III → maxed
```

- **HIRE phase (0–11):** Button buys autoclickers as today. Shows count progress (e.g., "4/12").
- **SUPER phase (I–III):** Button purchases the next gear level. Shows gear name + cost. When the player can afford it, the button glows and flashes — high-visibility "something big is available" signal.
- **Maxed:** After SUPER III, the button is complete. Visual treatment TBD (greyed, hidden, or celebratory state — **Owner: ux-designer**).

**No reset on SUPER purchase.** Autoclickers stay at 12. Count stays. Level stays. The player's existing army immediately benefits from the 10× multiplier. SUPER is purely additive — spend engagement, get 10×, keep everything else.

**Purchase mechanics:** SUPER purchases use the same `purchaseVerbGear` function specified in §7. The only difference from the original proposal is that the purchase is gated behind `autoclicker_count >= 12` in addition to the engagement cost. The HIRE button in the UI checks both conditions to determine whether to show HIRE or SUPER.

**Why this works (UX rationale from ux-designer):** No new UI elements are needed. The HIRE button is already per-verb, already in the Actions Column, already the right size on mobile. Reusing it for gear purchases solves the mobile spacing problem entirely. The transformation is also a natural progression signal — the button the player has been tapping changes appearance, which teaches without a tutorial.

#### OQ1 revision — "all visible" applies to SUPER state, not separate gear UI

The original OQ1 answer ("all 5 visible from the start, greyed when unaffordable") was written assuming gear items would have their own UI surface. Under the HIRE→SUPER model, gear visibility is implicit: the player sees the SUPER button when they've maxed HIREs for that verb. The "all visible" intent is preserved because all 5 verb buttons are always visible in the Actions Column — the player can see which verbs have reached SUPER and which haven't.

### 11. What This Locks In

- Creator Kit is 5 per-verb gear items, one per manual verb
- Each item has 3 levels, each level ~10x multiplier (cumulative: x10, x100, x1000)
- Purchased with Engagement, wiped on rebrand
- Cheapest entry point is 2B (Mechanical Keyboard L1)
- Multiplier applies to both manual taps and autoclicker fires
- **Autoclicker cap is flat 12** — the rebrand-scaling formula (`12 * (1 + rebrand_count)`) is removed
- **HIRE button transforms into SUPER at cap** — no new UI element, no separate gear panel
- **No reset on SUPER purchase** — autoclickers, count, and level all stay; SUPER is purely additive
- The entire old Creator Kit system (Camera, Phone, Wardrobe, Mogging) is removed
- Brand Deal Boost and Brand Deal Milestones proposals are dead
- All balance values live in static data and are easy to retune

### 11. What This Leaves Open

- Exact cost and multiplier values — balance pass after playtesting (§3 provides starting cells)
- [RESOLVED] UI placement of gear purchases — **Owner: ux-designer**
  - **Answer (ux-designer + game-designer):** HIRE button transforms into SUPER at autoclicker cap. No new UI element. See §10.
- Visual treatment of the SUPER button (glow, flash, color) and the 10x moment — **Owner: ux-designer**
- Visual treatment of the maxed state (after SUPER III) — **Owner: ux-designer**
- Whether passive-only generators (memes, hot_takes, tutorials) ever get gear items — currently no, only manual verbs. **Owner: game-designer** (future scope)
- Save migration strategy for existing saves with old creator_kit data — **Owner: engineer**
- [RESOLVED] Whether `VerbGearId` is truly an alias for `GeneratorId` or a distinct type — **Owner: architect**
  - **Answer (architect):** Distinct narrow union. See §5 and architect review B2.

## References

1. `proposals/accepted/level-driven-manual-cooldown.md` — defines the Phase 1 POWER/SPEED/HIRE system this proposal builds on top of
2. `proposals/accepted/manual-action-ladder.md` — defines the 5-verb ladder and per-verb yield/rate split
3. `proposals/accepted/creator-kit-upgrades.md` — the old Creator Kit this proposal fully supersedes
4. `proposals/accepted/brand-deal-boost.md` — superseded, removed
5. `proposals/accepted/20260406-brand-deal-milestones.md` — superseded, removed
6. `client/src/creator-kit/index.ts` — existing implementation to be ripped out
7. `client/src/types.ts` L58–91 — existing KitItemId, KitEffect, KitItemDef types to be removed
8. `client/src/static-data/index.ts` L425–496 — existing CREATOR_KIT_ITEM_DEFS to be removed
9. `client/src/game-loop/index.ts` — tick pipeline integration points where old kit factor is removed and new gear_multiplier is added
10. `.frames/sdlc/architecture/verb-gear.md` — architecture spec for the new system (replaces `architecture/creator-kit.md`)

## Open Questions

1. [RESOLVED] **Should gear items for different verbs unlock progressively, or are all 5 visible from the start?** **Owner: game-designer**
   - **Answer (game-designer):** All 5 visible from the start. The player sees the full gear wall and knows what's coming. Unaffordable items are greyed out but present — the goal ladder is always legible.
2. [RESOLVED] **Does the gear multiplier enter the formula at the same stacking position as the old kit factor, or does it need a new position?** The old `kit` factor was at §4 in the stacking chain. The new per-verb gear multiplier is architecturally different (per-generator, not global). **Owner: architect**
   - **Answer (architect):** Same position — §4 in the stacking chain. The per-verb scoping changes which value is read (per-generator lookup instead of a global product), but the position in the multiplicative chain is identical. The stacking order convention in `architecture/creator-kit.md` §Stacking Order remains correct with the substitution `kit_engagement_multiplier → gear_multiplier`. No new position needed.
3. [RESOLVED] **Should gear purchases have a confirmation step?** At 2B+ engagement, a mis-tap is expensive. The old kit items had no confirmation. **Owner: ux-designer**
   - **Answer (ux-designer):** Yes — lightweight two-tap pattern. First tap reveals purchase details (cost, multiplier preview), second tap confirms. Prevents accidental purchases without blocking flow. Full spec in the replacement UX spec for verb gear. See ux-designer review O2.

---
## Revision: 2026-04-07 — game-designer (2)

Adds §10 (HIRE Button Transformation & Autoclicker Cap Change). Per ux-designer feedback on mobile spacing: gear purchases are not a new UI surface — the HIRE button transforms into SUPER when autoclicker_count reaches cap (12). Autoclicker cap flattened from `12 * (1 + rebrand_count)` to flat 12. No reset on SUPER purchase — autoclickers, count, and level all stay. Rip-out of the rebrand-scaling cap formula added to §6. OQ1 revised — "all visible" now implicit via verb button visibility. UI placement OQ resolved. New OQs added for SUPER button visual treatment and maxed state.

---
## Revision: 2026-04-07 — game-designer

Addresses architect's two blocking items: (1) §2 formulas rewritten to show the actual codebase formulas (before/after), not simplified versions — the transformation is now explicitly "replace `kit` with `gear_multiplier`, nothing else." (2) `VerbGearId` changed from `GeneratorId` alias to narrow 5-member union; `generator_id` field dropped from `VerbGearDef`; lookup function simplified to O(1). Also expanded §6 rip-out inventory with all files flagged in architect's N1, added save migration chain detail per N3, and noted architecture doc replacement per N2. Resolved OQ on VerbGearId type. `generator_id` field dropped per YAGNI — if a future design decouples gear from the 1:1 verb mapping, that's a redesign.

---
# Review: architect

**Date**: 2026-04-07
**Decision**: Request for Comment

**Comments**

The architectural direction is sound. Replacing a 5-axis global modifier system with per-verb gear is a genuine simplification — fewer effect types, fewer integration points, tighter coupling to the thing the player actually interacts with. The data model is clean (static defs + level counter), the purchase/rebrand lifecycle matches the existing pattern, and no new architectural patterns are required. I'm supportive of the overall design.

Two items must be corrected before I can align. Several additional observations for implementation planning follow.

### Blocking

**B1 — Formulas in §2 don't match the codebase.**

The proposal shows:
```
earned = base_event_yield × (1 + count) × algoMod × clout × kit × gear_multiplier
```

The actual `verbYieldPerTap` (game-loop/index.ts L520–529) is:
```
base_event_yield × (1 + count)^count_exponent × (1 + autoclicker_count) × clout × kit
```

Errors in the proposal formula:
- `algoMod` was removed (algorithm weather system is dead per `proposals/accepted/20260406-remove-algorithm-weather-system.md`)
- `count_exponent` is missing — current code uses `Math.pow(1 + count, count_exponent)`, not `(1 + count)`
- `(1 + autoclicker_count)` is missing from the manual tap formula
- `kit` appears alongside `gear_multiplier` despite the text saying kit is removed entirely

The passive formula (`computeGeneratorEffectiveRate`, game-loop/index.ts L121–141) has corresponding issues. The actual formula is:
```
autoclicker_count × level × base_event_rate × base_event_yield × (1 + count)^count_exponent × clout × kit
```

The correct transformation is: replace `kit` with `gear_multiplier` in the existing formulas, nothing else. The proposal as written could mislead the engineer into implementing wrong formulas.

**B2 — `VerbGearId` must be a distinct narrow union, not an alias for `GeneratorId`.**

This resolves OQ §11 bullet 6 (explicitly directed at architect).

`GeneratorId` includes 11 values — 5 manual verbs, 3 passive-only (memes, hot_takes, tutorials), 3 post-prestige (ai_slop, deepfakes, algorithmic_prophecy). Gear only covers the 5 manual verbs. `type VerbGearId = GeneratorId` is a type-system lie: it compiles when you pass `'memes'` as a gear ID, but the runtime silently returns 1.0 (no gear found). That's a category of bug the type system should prevent.

The correct type:
```ts
type VerbGearId = 'chirps' | 'selfies' | 'livestreams' | 'podcasts' | 'viral_stunts';
```

This also eliminates the O(n) scan in the proposed `verbGearMultiplier` function. With VerbGearId as a proper subset, the Record is keyed by VerbGearId and the lookup is O(1):
```ts
function verbGearMultiplier(
  generatorId: GeneratorId,
  verbGear: Record<VerbGearId, number>,
  staticData: StaticData,
): number {
  const def = staticData.verbGear[generatorId as VerbGearId];
  if (!def) return 1.0;
  const level = verbGear[def.id] ?? 0;
  return level <= 0 ? 1.0 : def.multipliers[level - 1];
}
```

The `generator_id` field on `VerbGearDef` becomes redundant (it equals `id` by construction). I'd drop it and let the key in the Record be the linkage.

### Non-blocking observations

**N1 — Deletion inventory is incomplete.**

The proposal lists the major touchpoints (§6) but misses these files that also reference the old Creator Kit:

| File | What to remove |
|---|---|
| `client/src/offline/index.ts` L31, L119–121, L134 | Imports `kitFollowerConversionBonus`, uses it in offline earnings calc |
| `client/src/game-loop/index.ts` L466–469 (`computeSnapshot`) | Uses `kitFollowerConversionBonus` for snapshot — not just the tick pipeline |
| `client/src/save/index.ts` L287–312 (`migrateV4toV5`) | Introduces `player.creator_kit` field |
| `client/src/save/index.ts` L627–702 (`migrateV9toV10`) | Strips `laptop` from `creator_kit` |
| `client/src/audience-mood/index.ts` L11 | Stacking order comment references `kitEngagementBonus` |
| `client/src/ui/GameScreen.css` | Creator Kit panel styles |
| `client/src/theme/tokens.css` | Creator Kit CSS tokens |
| `client/src/static-data/index.test.ts` | Tests validating `CREATOR_KIT_ITEM_DEFS` |
| `.frames/sdlc/architecture/creator-kit.md` | Entire architecture doc is dead |

None of these are hard to handle, but the engineer will discover them one by one if they aren't listed. The rip-out task should enumerate every file.

**N2 — Architecture doc lifecycle.**

`architecture/creator-kit.md` must be replaced with a new `architecture/verb-gear.md` documenting the new system's data model, interface contracts, stacking position, and coupling analysis. Without it, the engineer implements from a game design proposal rather than an architecture spec. I will file this as a follow-up task for myself after acceptance.

**N3 — Save migration note.**

The proposal correctly flags save migration as an open question for the engineer. From the architecture side: the migration is a version bump that strips `player.creator_kit` and adds `player.verb_gear = {}`. The existing migration chain runs through V10 (`migrateV9toV10`). Straightforward, but must be sequenced after the old kit code is removed to avoid type conflicts during the transition. The old `migrateV4toV5` (which introduced `creator_kit`) and the `laptop` strip in `migrateV9toV10` remain in the chain for forward-compatibility with ancient saves — they just produce a field that the new migration subsequently removes.

### Architect follow-ups before acceptance

1. **Write `architecture/verb-gear.md`** — I want this spec written before the proposal moves to accepted, so the engineer has a proper architecture doc to build from rather than reverse-engineering the contract from a design proposal. I will do this in my next session.
2. ~~**Answer: should the `generator_id` field survive on `VerbGearDef`?**~~ Resolved by game-designer in revision: dropped per YAGNI.

---
# Review: architect (re-review)

**Date**: 2026-04-07
**Decision**: Aligned

**Comments**

Both blocking items are resolved. §2 now shows the actual codebase formulas with a clean before/after transformation. `VerbGearId` is a proper narrow union, `generator_id` field dropped, lookup is O(1). The rip-out inventory in §6 now covers every file I flagged. Save migration chain is documented.

Remaining follow-up: I will write `architecture/verb-gear.md` before this proposal moves to accepted. OQ#3 (confirmation step) is owned by ux-designer and does not block architectural alignment.

---
# Review: engineer

**Date**: 2026-04-07
**Decision**: Aligned

**Comments**

Technically sound. The formulas are correct, the rip-out inventory is complete, the new system is simpler than what it replaces, and the architecture spec (`architecture/verb-gear.md`) gives a clear contract to build against. No blocking concerns.

### Verification against the codebase

I traced every integration point through the actual source files:

**Formula accuracy — confirmed.**
- `verbYieldPerTap` (`game-loop/index.ts` L520–529): current formula is `base_event_yield * Math.pow(1 + count, count_exponent) * (1 + autoclicker_count) * clout * kit`. The proposal's before/after in §2 matches exactly. The transformation is `kit -> gear_multiplier`, nothing else.
- `computeGeneratorEffectiveRate` (`game-loop/index.ts` L121–141): same structure confirmed — `autoclicker_count * level * base_event_rate * base_event_yield * Math.pow(1 + count, count_exponent) * clout * kit`. Same substitution.
- `verbYieldPerAutoTap` (`game-loop/index.ts` L536–542): delegates to `verbYieldPerTap` — no separate change needed, the substitution propagates automatically.

**Rip-out inventory — confirmed complete.** Every file listed in §6 exists and contains the referenced code:
- `creator-kit/index.ts` L1–295: `kitEngagementBonus`, `kitViralBurstAmplifier`, `kitFollowerConversionBonus`, `kitItemCost`, `canPurchaseKitItem`, `applyPhoneHeadStart`, `purchaseKitItem` — all dead.
- `ui/CreatorKitPanel.tsx`, `ui/CreatorKitPanel.test.ts` — confirmed present, to be deleted.
- `types.ts` L58–91: `KitItemId` (4-member union), `KitEffect` (tagged union), `KitItemDef` interface — all dead.
- `static-data/index.ts` L425–464: `CREATOR_KIT_ITEM_DEFS` object (camera, phone, wardrobe, mogging) — dead. L496: `creatorKitItems` on the exported `STATIC_DATA` — dead.
- `game-loop/index.ts` L131: `kitEngagementBonus` call in `computeGeneratorEffectiveRate` — replaced by `verbGearMultiplier`.
- `game-loop/index.ts` L527: `kitEngagementBonus` call in `verbYieldPerTap` — replaced by `verbGearMultiplier`.
- `game-loop/index.ts` L256–260: `kitViralBurstAmplifier` call in `evaluateViralTrigger` — removed, no replacement.
- `game-loop/index.ts` L466–469 (`computeSnapshot`): `kitFollowerConversionBonus` call — removed, no replacement. The `kitFollowerMult` factor in the `platform_rates` computation (L480) is eliminated.
- `offline/index.ts` L31: `kitFollowerConversionBonus` import — removed.
- `offline/index.ts` L119–121: `kitFollowerConversionBonus` call — removed.
- `offline/index.ts` L134: `kitFollowerMult` usage in follower gain computation — removed.
- `prestige/index.ts` L167–178: `creator_kit: {} as Record<KitItemId, number>` wipe — replaced by `verb_gear: {} as Record<VerbGearId, number>`.
- `prestige/index.test.ts` L224–231: test "wipes creator_kit" — must be rewritten for `verb_gear`.
- `driver/index.ts` L63: `'buyKitItem'` in `ActionName` union — replaced by `'buyVerbGear'`.
- `driver/index.ts` L191: `buyKitItem(itemId: KitItemId)` on interface — replaced by `buyVerbGear(gearId: VerbGearId)`.
- `driver/index.ts` L646–649: `buyKitItem` implementation calling `purchaseKitItem` — replaced.
- `ui/useGame.ts` L30: `buyKitItem` binding — replaced by `buyVerbGear`.
- `ui/useGame.ts` L220–223: `buyKitItem` delegation — replaced.
- `ui/GameScreen.tsx`: imports/renders `CreatorKitPanel` — removed.
- `ui/GameScreen.css`: Creator Kit panel styles — removed.
- `theme/tokens.css`: Creator Kit CSS tokens — removed.
- `audience-mood/index.ts` L7–11: stacking order comment references `kitEngagementBonus` — updated to `verbGearMultiplier`.
- `static-data/index.test.ts`: tests validating `CREATOR_KIT_ITEM_DEFS` — removed.
- `save/index.ts` L295 (`migrateV4toV5`): introduces `player.creator_kit` — remains in chain, new migration strips it.
- `save/index.ts` L506 (`migrateV9toV10`): strips `laptop` from `creator_kit` (L661–662) — remains in chain.
- `save/index.test.ts` L11, L15, L418–486, L770–839: tests for `migrateV4toV5` and `migrateV9toV10` — remain (they test the old migrations, which still run for ancient saves).
- `architecture/creator-kit.md`: entire doc dead, superseded by `architecture/verb-gear.md`.

**Type safety — sound.**
- `VerbGearId` as a narrow 5-member union (`'chirps' | 'selfies' | 'livestreams' | 'podcasts' | 'viral_stunts'`) is correct. The `as VerbGearId` cast in `verbGearMultiplier` fails gracefully — returns 1.0 when the key doesn't exist in the Record. No throw in the hot path. Right behavior.
- The existing `GeneratorId` includes 11 values (5 manual + 3 passive-only + 3 post-prestige). The narrow union prevents passing `'memes'` or `'ai_slop'` as a gear ID at the type level while still allowing the runtime fallback for the tick pipeline where `GeneratorId` is the input.

**Net coupling reduction — real.** Old system: 4 effect types (`engagement_multiplier`, `platform_headstart_sequential`, `follower_conversion_multiplier`, `viral_burst_amplifier`) touching 6 integration points across 4 modules (`game-loop`, `offline`, `prestige`, `creator-kit`). New system: 1 effect type (yield multiplier) touching 2 integration points (`verbYieldPerTap`, `computeGeneratorEffectiveRate`) in 1 module (`game-loop`). Three old integration points (follower conversion in `computeSnapshot` and `offline`, viral burst amplifier in `evaluateViralTrigger`) are removed with no replacement.

### Non-blocking observations

**N1 — Save migration test coverage.** The existing tests for `migrateV4toV5` (`save/index.test.ts` L418–486) assert `creator_kit` ends up as `{}` after the full chain (L456, L485). The new migration needs tests asserting: (a) `creator_kit` is absent from the output, (b) `verb_gear` defaults to `{}`, (c) a save with mid-run `creator_kit` data (e.g., `{camera: 2}`) is correctly stripped. Implementation note for the build task.

**N2 — `verbYieldPerAutoTap` is a pass-through.** The architecture spec lists `verbYieldPerTap` and `computeGeneratorEffectiveRate` as the two integration points. `verbYieldPerAutoTap` (`game-loop/index.ts` L536–542) is technically a third call site, but it delegates to `verbYieldPerTap` (`return verbYieldPerTap(generator, state, staticData)`), so no separate change is needed. Worth a note in the build task so the implementing engineer doesn't chase it.

**N3 — `GameScreen.tsx` import site.** The proposal's §6 says "All Creator Kit UI components (CreatorKitPanel and related)" but doesn't explicitly call out the `GameScreen.tsx` import and render site. Any engineer deleting `CreatorKitPanel.tsx` will hit the compile error immediately, so this is a non-issue in practice — but the build task should list it for completeness.

**N4 — OQ#3 (confirmation step) is UX-owned and does not block engineering alignment.** The `purchaseVerbGear` contract is a pure state transform — a confirmation gate lives entirely in the UI layer and does not affect the data model, the purchase function signature, or any integration point. The implementation can ship with or without it.

**N5 — Routing to ux-designer.** OQ#3 remains unresolved. Adding `ux-designer` to the reviewers list so the question is visible to the next agent in the next session.

---
# Review: ux-designer

**Date**: 2026-04-07
**Decision**: Aligned

**Comments**

The per-verb binding is a genuine UX improvement over the old global-modifier system. The old Creator Kit had five abstract modifiers (engagement rate, algorithm lookahead, follower conversion, viral burst amplification) that the player couldn't see working — the effect was invisible at the surface where the player looks. Per-verb gear fixes this: the player upgrades Chirps gear, taps Chirps, sees 10x numbers. Cause and effect are visible at the same interaction surface. This is the correct architecture for trust-signal design (ref: `roles/ux-designer.md` §Trust signal design) — the player trusts numbers they can see changing in response to actions they took.

The 10x moment is the right magnitude for the target feeling described in §9. The floating numbers (ref: `proposals/accepted/ratio-scaled-manual-tap-floats.md`, implemented in `client/src/ui/ActionsColumn.tsx` `floatStyle()`) already ratio-scale font size by tap significance. A 10x jump will produce a visibly larger float on the very next tap — no additional UX work needed for the numbers themselves to communicate the breakthrough.

No blocking concerns. Three observations for downstream UX work:

### O1 — Placement: gear purchases belong on the verb buttons, not in a separate panel

The old Creator Kit panel (ref: `ux/creator-kit-panel.md`) was designed for global modifiers that didn't belong to any specific verb. A collapsible panel at the bottom of the generator column was the right placement for that system. The new system has a 1:1 verb binding — separating the gear purchase from the verb button it modifies breaks the spatial relationship that makes the design legible.

Recommendation: gear purchase affordance lives directly on or adjacent to the verb button in the Actions Column (ref: `client/src/ui/ActionsColumn.tsx`, screen layout in `client/src/ui/GameScreen.tsx` L401–426). The player looks at their Chirps button, sees the gear upgrade, and purchases right there. No panel navigation, no mental mapping between "item in a list" and "verb it modifies." The 1:1 binding is expressed spatially.

This will be developed in a new UX spec replacing the dead `ux/creator-kit-panel.md`. Not blocking for this proposal.

### O2 — OQ#3 answer: confirmation step — yes, lightweight two-tap pattern

At 2B+ engagement, a mis-tap is expensive. A full modal confirmation is disproportionate — gear purchases are exciting moments, not Rebrand-level deliberations. Recommended pattern: **two-tap.** First tap reveals the purchase details (cost, multiplier preview). Second tap confirms. This prevents accidental purchases while keeping the moment fast (~200ms for an intentional buyer). The player who fat-fingered sees the expanded state and backs out.

Per engineer's N4 (this document), the confirmation gate lives entirely in the UI layer — `purchaseVerbGear` is a pure state transform and doesn't care about the gate. No contract changes needed.

### O3 — Progressive disclosure of gear slots

The game-designer's answer to OQ#1 ("all 5 visible from the start, unaffordable greyed out") is correct as a data-availability decision. From a presentation standpoint, a player at 100K engagement seeing five slots priced at 2B–20T is visual noise — they can't act on any of it and don't have context to understand it yet. This violates the no-tutorial test (ref: `roles/ux-designer.md` §The "no tutorial" test).

The old spec's peek-signal concept (ref: `ux/creator-kit-panel.md` §5) is worth preserving in adapted form: the gear affordance for a given verb becomes noticeable when the player is approaching the cost threshold. The exact threshold and reveal treatment are UX spec decisions. This doesn't contradict the game-designer's intent — all 5 exist in the data from the start; the UX question is when they become visible on screen. That's downstream of this proposal.

### Dead UX artifacts

The following UX artifacts are fully superseded and should be marked dead or replaced:

- `ux/creator-kit-panel.md` — entire spec is dead; designed for the old global-modifier panel. Will be replaced by a new verb-gear UX spec.
- Kit accent color tokens in `theme/tokens.css` L97–106 (`--kit-accent`, `--kit-accent-rgb`) — the new system's visual identity will be defined in the replacement spec; these tokens may or may not survive depending on whether the per-verb color lanes (ref: `client/src/ui/ActionsColumn.tsx` L43–49 `VERB_COLOR`) are used instead.
- `client/src/ui/CreatorKitPanel.tsx` and `client/src/ui/CreatorKitPanel.test.ts` — dead, as already listed in §6.

### References consulted

1. `client/src/ui/ActionsColumn.tsx` — current verb button implementation, verb color lanes, float feedback system
2. `client/src/ui/GameScreen.tsx` — screen layout, column structure, existing CreatorKitPanel comment at L424
3. `client/src/ui/CreatorKitPanel.tsx` — old panel implementation (dead)
4. `client/src/theme/tokens.css` — kit accent color tokens (dead)
5. `ux/creator-kit-panel.md` — old UX spec (dead, to be replaced)
6. `.frames/sdlc/architecture/verb-gear.md` — architecture spec for the new system
7. `prog/Screenshot 2026-04-07 at 2.31.11 PM.png` — current game screen state

---
# Review: architect (post-acceptance implementation audit)

**Date**: 2026-04-07
**Decision**: Aligned (no status change — proposal already accepted)

**Comments**

Deep code trace through all integration points against the committed codebase and the engineer's in-progress rip-out (task #185). The proposal, architecture doc, and prior reviews are correct on all major points. Four implementation-planning gaps surfaced that should be captured in build tasks.

**Note:** The engineer is actively removing the old Creator Kit system (task #185). Working directory diffs confirm the rip-out is clean: `kitEngagementBonus`, `kitFollowerConversionBonus`, and `kitViralBurstAmplifier` calls removed from `game-loop/index.ts`; `KitItemId`, `KitEffect`, `KitItemDef` stripped from `types.ts`; `buyKitItem` removed from driver interface; `creator_kit` wipe removed from `prestige/index.ts`. The rip-out correctly removes `kit` from the formulas without adding `gear_multiplier` — that's the build task's job.

### Flags for implementation task planning

**F1 — Sweep engine needs a `'gear'` purchase type.**

`driver/index.ts` `buildAffordableList()` (L432–472) builds BUY, HIRE, and LVL UP items. When autoclicker_count reaches cap (12), that verb's HIRE row is skipped. After the HIRE→SUPER transformation, gear purchases should appear in the sweep when autoclickers are capped and engagement is sufficient. Without this, the auto-buy sweep button (ref: `proposals/accepted/20260406-auto-buy-sweep-button.md`) will skip gear purchases entirely.

Needs: new `SweepItemType` value (`'gear'`), priority slot in the sort (likely between HIRE and BUY — SUPER is a bigger breakthrough than a single autoclicker but less urgent than a level-up), and the `fireSweepPurchase` dispatch case.

**F2 — `createPlayer()` in `model/index.ts` L69 is not listed as an integration point.**

`createPlayer()` currently initializes `creator_kit: {} as Record<KitItemId, number>`. The rip-out removes this line. The verb-gear build task must add `verb_gear: {} as Record<VerbGearId, number>` here. This call site is absent from both the proposal's §6/§7 and the architecture doc's integration points list. The compiler will catch it (Player requires the field), but it should be explicit in the task.

**F3 — `purchaseVerbGear` contract doesn't specify the autoclicker-cap gate.**

The architecture doc's `purchaseVerbGear` contract (§Interface Contracts) validates level < max and engagement >= cost. §10 of this proposal adds a third gate: `autoclicker_count >= 12`. The arch doc is silent on where this gate lives. Two options:

- **In `purchaseVerbGear` itself** — safer, enforced at the model layer, testable. Requires passing `generators` state or the autoclicker count as an additional parameter.
- **UI-only gate** — simpler function signature, but a direct call to `purchaseVerbGear` bypasses the check. Integration tests won't catch it.

Recommendation: enforce in the model layer. The gate is a game rule, not a presentation concern. The arch doc should be updated to include it in the contract.

**F4 — Architecture doc source path is stale.**

`architecture/verb-gear.md` header references `proposals/draft/20260407-creator-kit-verb-gear.md`. The proposal has since moved to `proposals/accepted/`. Quick fix.

---
# Review: ux-designer (re-review)

**Date**: 2026-04-07
**Decision**: Aligned (no status change — proposal already in implementation)

**Comments**

Re-review prompted by §10 addition (HIRE→SUPER transformation, autoclicker cap flattened to 12) and architect's post-acceptance implementation audit (F1–F4). Still aligned. §10 is a genuine improvement — it solves placement, progressive disclosure, and mobile spacing in one move and is better than my original O1 suggestion (gear affordance adjacent to verb button in the Actions Column).

### What §10 gets right from a UX perspective

**Self-teaching progression.** The player has tapped AUTO for the entire early game. When it transforms into SUPER, the change *is* the lesson — no tutorial text, no new panel to discover, no mental mapping between "item in a list" and "verb it modifies." Passes the no-tutorial test.

**Progressive disclosure is structural.** My original O3 flagged the concern that showing five 2B–20T gear slots to a player at 100K engagement is visual noise. Under HIRE→SUPER, gear is invisible until the player has *earned* visibility by capping autoclickers for that verb. The game progression handles disclosure. Cleaner than the threshold-based reveal I was proposing.

**Mobile spacing: non-issue.** No new UI elements. The AUTO pill is already there, already the right size, already per-verb.

### Deliverables produced

**New UX spec written:** `ux/verb-gear-super-button.md` — covers the full SUPER pill lifecycle (AUTO→SUPER arrival, two-tap confirmation pattern, the 10x moment feedback, maxed state ceremony). Resolves all three ux-designer-owned open questions from §11:

1. **SUPER button visual treatment:** verb's own color lane at higher opacity (25% vs AUTO's 15%), 2px border (vs 1px), static glow `box-shadow`. The visual distinction from AUTO comes from weight and glow, not from a new color — preserving per-verb identity.
2. **Maxed state (after SUPER III):** platinum treatment, identical to the LVL maxed pill from `ux/generator-max-level-state.md` §3.3. `MAX` label, platinum background, inset shadow, participates in the shared shine sweep. Consistency — "MAX" means "MAX" everywhere.
3. **OQ#3 (confirmation step):** two-tap pattern. First tap reveals purchase details (gear name, cost, multiplier preview) and arms the button. Second tap confirms. 3-second timeout reverts if abandoned. Prevents accidental 2B+ spends without blocking flow for intentional buyers.

**Dead UX artifact:** `ux/creator-kit-panel.md` is fully superseded by `ux/verb-gear-super-button.md`. The old spec was designed for a collapsible panel housing global modifiers. That system no longer exists.

### Notes on architect's implementation flags

**F1 (sweep engine + gear):** confirmed — sweep will NOT include gear purchases. No UX surface needed for sweep-triggered gear. The 10x moment is player-driven (manual SUPER purchase), not automated.

**F3 (autoclicker-cap gate):** agree with architect — enforce in the model layer. The cap gate is a game rule. If it were UI-only, a direct call to `purchaseVerbGear` could bypass it. The UX spec assumes the model validates `autoclicker_count >= 12` as a precondition; the UI simply doesn't show SUPER until the cap is reached.
