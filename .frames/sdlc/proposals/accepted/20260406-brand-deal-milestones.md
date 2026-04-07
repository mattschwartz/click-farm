---
name: Brand Deal Milestones (Creator Kit Integration)
description: Milestone-based brand deals that auto-unlock within the Creator Kit, granting base yield multipliers and feature unlocks at cumulative engagement thresholds.
created: 2026-04-06
author: game-designer
status: accepted
reviewers: []
---

# Proposal: Brand Deal Milestones (Creator Kit Integration)

## Problem

Once the player maxes speed tiers (L10 on all verbs), engagement/sec plateaus around ~2B/s. The only remaining growth is linear count stacking (BUY at 1+count) against exponential costs — diminishing returns that flatten the curve before the player reaches prestige. The mid-to-late game needs a multiplicative breakthrough that rewards accumulation and breaks the plateau without requiring new content tiers or prestige.

The game currently has no milestone-based multiplier system. Clout upgrades (engagement_boost) cap at 5× and are post-prestige. Creator Kit items are per-run and cap at their max levels. There's nothing that says "you've saved up a huge amount of engagement — here's a step-function power spike."

## Proposal

### Brand Deals

Brand deals are **flat engagement multipliers** that unlock automatically when the player's **cumulative engagement earned (lifetime, not current balance)** crosses a threshold. They stack multiplicatively with all other modifiers.

The fiction: a brand notices your numbers and cuts you a deal. You're not a creator anymore — you're a billboard. The satire is in the naming and the scale.

### Milestone Table

| # | Threshold | Reward | Cumulative effect | Name (working) |
|---|---|---|---|---|
| 1 | 1B engagement | ×2 base yield | ×2 | "Local Car Dealership" |
| 2 | 500B engagement | ×10 base yield + **unlocks Buy All button** | ×20 + Buy All | "Energy Drink Sponsorship" |

More milestones will be added as plateaus are discovered in playtesting. The table is a flat data structure — adding a row is a static-data change, not a code change.

**Milestones are not limited to multipliers.** They can unlock features, tools, or UI affordances. The Buy All button (per accepted auto-buy-sweep proposal) is gated behind milestone 2 — the player earns the tool by playing, not by finding a menu. This makes the moment of unlocking feel like a power-up, not a setting. Future milestones can similarly unlock tools or mechanics alongside multipliers.

### Creator Kit integration

The Creator Kit already owns within-run power progression. Brand deals are the same concept — per-run bonuses that reset on rebrand. Rather than creating a parallel system, brand deals live inside the Creator Kit as a new acquisition type: **milestone-unlocked items** alongside the existing **engagement-purchased items**.

The Kit becomes two categories:
- **Purchased items** (camera, phone, wardrobe, mogging) — player buys with engagement, 3 levels each
- **Brand deals** (milestone items) — auto-unlock when cumulative engagement crosses a threshold, no purchase required

Both categories live in the same UI surface (the Kit panel) and follow the same per-run lifecycle (reset on rebrand). The difference is acquisition: purchased items cost engagement now, brand deals reward cumulative output.

This eliminates the system overlap the architect flagged — one system for within-run bonuses, not two.

### Design rationale

1. **Step-function, not continuous.** The multiplier jumps at specific thresholds. This produces a felt moment — "something just happened" — rather than a gradual slope the player doesn't notice. The jump is the reward for sustained play.

2. **Cumulative engagement, not current balance.** The threshold tracks total engagement ever earned, not what's in the bank. The player can spend freely without worrying about losing progress toward the next deal. This also prevents the degenerate strategy of hoarding engagement instead of investing it.

3. **Pre-prestige.** Brand deals apply within a single run. They don't survive rebrand — they're reclaimed each run as the player re-earns the thresholds. This preserves the prestige loop's power: rebranding resets brand deals, but Clout upgrades (engagement_boost, etc.) make re-earning them faster each run.

4. **Multiplicative stacking.** Brand deals multiply the entire engagement rate — they stack on top of count, level, clout, and kit. At milestone 2, the player's effective rate is 20× what it was at the start of the run (×2 from deal 1, ×10 from deal 2). This is the plateau-breaker: a flat 20× applied to everything.

5. **Satirical naming.** The deal names escalate in absurdity with the numbers. "Local Car Dealership" at 1B is relatable. Future milestones can escalate: "Crypto Exchange," "Defense Contractor," "Sovereign Wealth Fund." The names are flavor — they don't affect mechanics.

### Where it enters the formula

Brand deals **scale the base yield** of every generator, not a separate end-of-chain multiplier. When a deal triggers, every generator's effective `base_event_yield` is multiplied by the cumulative deal factor. The player sees their per-tap numbers and per-autoclicker rates change directly — "0.5 eng/tap" becomes "1.0 eng/tap" at deal 1, then "10.0 eng/tap" at deal 2.

```
effective_base_yield = base_event_yield × brand_deal_factor
```

This modified base feeds into all existing formulas unchanged:

```
// Passive:
effective_rate = autoclicker_count × base_event_rate × effective_base_yield
                × (1 + count) × clout × kit

// Manual tap:
earned = effective_base_yield × (1 + count) × clout × kit
```

`brand_deal_factor` is the product of all unlocked deal multipliers. At zero deals: 1.0. At deal 1: 2.0. At deals 1+2: 20.0.

**Why base yield, not a separate multiplier:** the player sees the numbers they tap with get bigger. The per-tap display, the floating numbers, the rate readout — all grow visibly. A separate multiplier badge would be abstract ("×20 somewhere"). Scaling the base is tangible — every number the player looks at reflects the deal.

**Stacking order:** Brand deal multiplier is applied at **§5 (event effects)** in the creator-kit stacking chain (`creator-kit.md` §Stacking Order), after Clout (§3) and Kit (§4). The player perceives bigger base numbers, but the implementation multiplies at the event-effects position to preserve the chain convention.

### Data model

**New field on `Player`:**

```ts
cumulative_engagement: number  // total engagement earned this run (resets on rebrand)
```

This counter increments in both the tick pipeline (passive/autoclicker engagement) AND in `postClick` (manual tap engagement). Both paths must increment `cumulative_engagement` by the amount earned. It resets on rebrand.

**Static data — extends the existing Kit item model:**

```ts
type BrandDealReward =
  | { type: 'yield_multiplier'; multiplier: number }
  | { type: 'unlock_feature'; feature: string };

type BrandDeal = {
  id: string;
  threshold: number;          // cumulative engagement to unlock
  rewards: BrandDealReward[]; // one or more rewards per milestone
  name: string;               // display name
};

// On StaticData, alongside existing creatorKitItems:
brand_deals: BrandDeal[]      // sorted by threshold ascending
```

Brand deals are a new collection on `StaticData`, separate from `creatorKitItems` in data shape (milestone-unlocked vs. purchased) but unified in the UI as part of the Creator Kit panel. A milestone can grant multiple rewards — e.g., milestone 2 gives both a ×10 yield multiplier AND unlocks the Buy All feature.

**Runtime computation:**

```ts
function brandDealMultiplier(cumulativeEngagement: number, deals: BrandDeal[]): number {
  let mult = 1.0;
  for (const deal of deals) {
    if (cumulativeEngagement >= deal.threshold) {
      for (const reward of deal.rewards) {
        if (reward.type === 'yield_multiplier') mult *= reward.multiplier;
      }
    }
  }
  return mult;
}
```

Feature unlock check:

```ts
function isBrandDealFeatureUnlocked(
  cumulativeEngagement: number, deals: BrandDeal[], feature: string
): boolean {
  for (const deal of deals) {
    if (cumulativeEngagement >= deal.threshold) {
      for (const reward of deal.rewards) {
        if (reward.type === 'unlock_feature' && reward.feature === feature) return true;
      }
    }
  }
  return false;
}
```

No new state beyond the counter. Both functions are pure derivations from static data + the counter.

### UI treatment

When a brand deal unlocks:
- A brief toast notification: "Brand Deal: Local Car Dealership — ×2 engagement"
- The engagement rate visibly jumps (the counter acceleration is the primary feedback)
- No modal, no interruption. The game's tone is deadpan — a toast is enough.

The current brand deal multiplier should be visible somewhere persistent (top bar? generator column header?) so the player knows their cumulative bonus. Format: "×20 Brand Deal" or similar.

### What this locks in

- Brand deals are flat multipliers unlocked at cumulative engagement thresholds
- They stack multiplicatively with all other modifiers
- They reset on rebrand (per-run, not permanent)
- The cumulative engagement counter tracks total earned, not current balance
- Two initial milestones: 1B (×2) and 500B (×10)
- Adding milestones is a static-data change

### What this leaves open

- Exact threshold and multiplier values for milestones 3+ — added during playtesting
- Whether the brand deal multiplier display belongs in the top bar or elsewhere — ux-designer
- Whether brand deal names get their own copy pass — game-designer, later
- Whether cumulative_engagement should be visible to the player as a stat — ux-designer
- Offline catch-up: cumulative_engagement must also increment during offline calculation

## References

1. `client/src/game-loop/index.ts` — `computeGeneratorEffectiveRate`, `postClick` — where the multiplier enters
2. `client/src/static-data/index.ts` — where `BrandDeal[]` data lives
3. `.frames/sdlc/proposals/accepted/clout-upgrade-menu.md` — engagement_boost caps at 5×, brand deals fill the gap below prestige
4. `.frames/sdlc/proposals/accepted/level-driven-manual-cooldown.md` — the three-axis model that produces the plateau this fixes

## Open Questions

1. **[RESOLVED]** Should cumulative_engagement persist across rebrands (lifetime stat) or reset each run? **Answer (game-designer): Reset per run.** Brand deals are the mid-run power spike. Resetting on rebrand means the player re-earns them faster each run via Clout upgrades — that's the prestige loop's payoff. A lifetime counter is a separate feature if needed later.
2. **[RESOLVED]** Should the brand deal multiplier apply to follower conversion too, or only engagement? **Answer (game-designer): Engagement only.** The base yield scales up, engagement goes up, followers inherit the boost naturally through the existing engagement-to-follower conversion. No double-dip.

---
## Revision: 2026-04-07 — game-designer (2)

Addresses engineer's two blocking items: (1) `(1 + autoclicker_count)` compounding with brand deals on manual taps is confirmed intended — hiring empowers the hand, brand deals compound with that investment, the big multiplier at scale is the plateau breaker. No change. (2) `cumulative_engagement` locked to `Player` (not ambiguous GameState-or-Player) — same lifecycle as `creator_kit`. Also added `isBrandDealFeatureUnlocked` helper for feature-gate rewards (engineer's non-blocking item 3).

---
## Revision: 2026-04-07 — game-designer

Addresses architect's three blocking items: (1) cumulative_engagement now explicitly incremented in both tick and postClick paths. (2) brandDealMultiplier pseudocode fixed to iterate deal.rewards and filter for yield_multiplier type, matching the BrandDeal data model. (3) Brand deal multiplier declared at §5 (event effects) in the stacking chain per creator-kit.md convention. Also noted: save migration needed for cumulative_engagement field (version bump, default 0).

---
# Review: ux-designer

**Date**: 2026-04-06
**Decision**: Aligned

**Comments**

The mechanics are clean — step-function multipliers at cumulative thresholds, multiplicative stacking, per-run reset. The satirical naming ladder is the right tone. Two UX notes and one flag:

**1. Toast is the right treatment for the unlock moment.** A modal would interrupt the flow and over-weight what's essentially a passive reward. The toast should be warm-gold tinted (same `--glow-halo-rgb` family as the HIRE flame and viral burst glow) to signal "you just got richer." 3-second hold, fade out. The engagement rate jump is the primary feedback — the toast is the label.

**2. Persistent multiplier display — bottom of the generator column header, not top bar.** The top bar is already carrying engagement + rate + title + run badge. Adding a "×20 Brand Deal" label crowds the P0 zone. The generator column header (above the first category divider, same strip where the proposed BUY ALL button would live) is the strategic surface — the player reads it when they're thinking about investment. A compact `⚡×20` pill in the column header says "everything you buy here is 20× amplified" at the moment the player is making purchase decisions. When no deals are active, the pill is hidden.

**3. Manual tap formula has a typo.** The manual tap formula shows `(1 + autoclicker_count)` which is wrong — manual taps don't multiply by autoclicker count. The accepted level-driven-manual-cooldown proposal has: `earned = base_event_yield × (1 + count) × algoMod × clout × kit`. Brand deal multiplier should enter that chain, but the `(1 + autoclicker_count)` factor doesn't belong in manual taps. Flag for the game-designer to correct before the engineer implements.

Removing myself from reviewers.

---
# Review: architect

**Date**: 2026-04-07
**Decision**: Request for Comment

**Comments**

Three items need resolution before I can align. All are small text corrections to the proposal — the design itself is sound.

**1. Manual tap engagement must also increment `cumulative_engagement`.** The proposal says the counter increments "every tick," but `postClick` adds engagement outside the tick pipeline. Manual taps are the entire early game — if they don't count toward brand deal thresholds, the first milestone is unreachable at the expected pace. Both `postClick` and the tick must increment `cumulative_engagement`. The proposal text needs to say so explicitly.

**2. `brandDealMultiplier` pseudocode doesn't match the data model.** The `BrandDeal` type defines `rewards: BrandDealReward[]`, but the runtime function accesses `deal.multiplier` — a field that doesn't exist on `BrandDeal`. The function needs to iterate `deal.rewards`, filter for entries where `type === 'yield_multiplier'`, and accumulate those multipliers. An engineer copying the pseudocode verbatim gets `NaN`. Flag for correction.

**3. Brand deals must declare their position in the stacking order.** The creator-kit architecture (`creator-kit.md` §Stacking Order) defines the canonical evaluation chain and states: "Future effect types MUST declare where they fall in the chain." The chain already reserves §5 ("Event effects — Brand Deal, Viral Burst, etc.") for this. The proposal should explicitly state: **brand deal multiplier is applied at §5 (event effects) in the stacking chain**, after Clout (§3) and Kit (§4). The player perceives bigger base numbers — that's correct — but the implementation multiplies at the event-effects position to preserve the chain convention.

**Non-blocking observations (for awareness, not blocking alignment):**

**4. Offline calculation and brand deal threshold crossings.** The offline calculator currently segments by algorithm shifts. If `cumulative_engagement` crosses a brand deal threshold mid-offline-period, the effective rate changes for the remainder. Per `core-systems.md` §Assumptions #6, offline calculation is already accepted as approximation. Recommend the simple path: compute offline gains at the rate as-of-close, then reconcile `cumulative_engagement` and brand deal state on open. Avoids doubling segmentation complexity.

**5. Save migration.** Adding `cumulative_engagement` to `Player` requires a version bump and a migration defaulting to `0`. Same trivial pattern as `creator_kit`. Not called out in the proposal — should be noted for the engineer.

Leaving myself in reviewers pending game-designer updates to items 1–3.

---
# Review: architect (re-review)

**Date**: 2026-04-07
**Decision**: Aligned

**Comments**

All three blocking items resolved in the 2026-04-07 revision. Cumulative engagement now explicitly incremented in both tick and postClick. Pseudocode matches the data model. Stacking position declared at §5. Save migration noted.

Removing myself from reviewers. Engineer is the remaining reviewer.

---
# Review: engineer

**Date**: 2026-04-07
**Decision**: Request for Comment

**Comments**

Two blocking items from code inspection.

**1. `verbYieldPerTap` includes `(1 + autoclicker_count)` — brand deals will compound with it.** The proposal scales `base_event_yield` by the brand deal factor. In the live codebase (`game-loop/index.ts:527`), `verbYieldPerTap` multiplies by `(1 + generator.autoclicker_count)`:

```ts
return def.base_event_yield * (1 + generator.count) * (1 + generator.autoclicker_count) * clout * kit;
```

At milestone 2 (×20 brand deal factor) with 50 autoclickers, a single manual tap yields `base × 20 × 51 × count × clout × kit` — a 1020× multiplier from two sources the player doesn't think of as connected. The UX-designer flagged the proposal's manual tap formula as a typo, but the code itself has this factor. Game-designer needs to confirm whether the `autoclicker_count` amplifier on manual taps is intended behavior that should compound with brand deals, or whether `verbYieldPerTap` should be corrected before/alongside this feature.

**2. `cumulative_engagement` must be specified on `Player`, not left ambiguous.** The proposal says "New field on GameState or Player" without deciding. In the codebase, `Player` is the persisted save root; `GameState` is the in-memory composite (`player` + `generators` + `platforms` + `viralBurst`). Since `cumulative_engagement` resets on rebrand but persists across saves within a run, it has the same lifecycle as `creator_kit` — it belongs on `Player`. The proposal should lock this in explicitly.

**Non-blocking observations (for awareness):**

**3. Feature unlock rewards need a consumer contract.** Milestone 2 grants `{ type: 'unlock_feature', feature: 'buy_all' }`, but the proposal doesn't specify how UI code checks whether a feature is unlocked. The `brandDealMultiplier` function handles yield multipliers; there's no equivalent for feature gates. Something like `isBrandDealFeatureUnlocked(cumulativeEngagement, deals, featureName): boolean` is needed, or the Buy All button won't know what to check. This can be an engineer implementation detail if the game-designer prefers — just needs to be stated either way.

**4. `brand_deals` on `StaticData` is a clean addition.** `STATIC_DATA` in `static-data/index.ts` and the `StaticData` type in `types.ts` both need the new field. No structural concerns.

Leaving myself in reviewers pending resolution of items 1–2. Adding game-designer to reviewers for item 1.

---
# Review: engineer (re-review)

**Date**: 2026-04-07
**Decision**: Aligned

**Comments**

Both blocking items resolved in the 2026-04-07 (2) revision. Autoclicker compounding on manual taps confirmed intended by game-designer — the big multiplier at scale is the plateau breaker. `cumulative_engagement` locked to `Player`. Feature unlock helper `isBrandDealFeatureUnlocked` now specified. No remaining concerns from the engineering side — the data model is clear, the stacking position is declared, and the pseudocode matches the types. Ready to build.

Removing myself from reviewers.
