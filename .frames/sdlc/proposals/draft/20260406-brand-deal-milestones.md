---
name: Brand Deal Milestones
description: Flat engagement multipliers that unlock at cumulative engagement savings thresholds, breaking mid-game plateaus before prestige.
created: 2026-04-06
author: game-designer
status: draft
reviewers: [architect, engineer]
---

# Proposal: Brand Deal Milestones

## Problem

Once the player maxes speed tiers (L10 on all verbs), engagement/sec plateaus around ~2B/s. The only remaining growth is linear count stacking (BUY at 1+count) against exponential costs — diminishing returns that flatten the curve before the player reaches prestige. The mid-to-late game needs a multiplicative breakthrough that rewards accumulation and breaks the plateau without requiring new content tiers or prestige.

The game currently has no milestone-based multiplier system. Clout upgrades (engagement_boost) cap at 5× and are post-prestige. Creator Kit items are per-run and cap at their max levels. There's nothing that says "you've saved up a huge amount of engagement — here's a step-function power spike."

## Proposal

### Brand Deals

Brand deals are **flat engagement multipliers** that unlock automatically when the player's **cumulative engagement earned (lifetime, not current balance)** crosses a threshold. They stack multiplicatively with all other modifiers.

The fiction: a brand notices your numbers and cuts you a deal. You're not a creator anymore — you're a billboard. The satire is in the naming and the scale.

### Milestone Table

| # | Threshold | Multiplier | Cumulative effect | Name (working) |
|---|---|---|---|---|
| 1 | 1B engagement | ×2 | ×2 | "Local Car Dealership" |
| 2 | 500B engagement | ×10 | ×20 | "Energy Drink Sponsorship" |

More milestones will be added as plateaus are discovered in playtesting. The table is a flat data structure — adding a row is a static-data change, not a code change.

### Design rationale

1. **Step-function, not continuous.** The multiplier jumps at specific thresholds. This produces a felt moment — "something just happened" — rather than a gradual slope the player doesn't notice. The jump is the reward for sustained play.

2. **Cumulative engagement, not current balance.** The threshold tracks total engagement ever earned, not what's in the bank. The player can spend freely without worrying about losing progress toward the next deal. This also prevents the degenerate strategy of hoarding engagement instead of investing it.

3. **Pre-prestige.** Brand deals apply within a single run. They don't survive rebrand — they're reclaimed each run as the player re-earns the thresholds. This preserves the prestige loop's power: rebranding resets brand deals, but Clout upgrades (engagement_boost, etc.) make re-earning them faster each run.

4. **Multiplicative stacking.** Brand deals multiply the entire engagement rate — they stack on top of count, level, clout, and kit. At milestone 2, the player's effective rate is 20× what it was at the start of the run (×2 from deal 1, ×10 from deal 2). This is the plateau-breaker: a flat 20× applied to everything.

5. **Satirical naming.** The deal names escalate in absurdity with the numbers. "Local Car Dealership" at 1B is relatable. Future milestones can escalate: "Crypto Exchange," "Defense Contractor," "Sovereign Wealth Fund." The names are flavor — they don't affect mechanics.

### Where it enters the formula

Brand deal multiplier enters as a single factor in the engagement production chain:

```
effective_rate = autoclicker_count × base_event_rate × base_event_yield
                × (1 + count) × clout × kit × brand_deal_multiplier
```

And in manual taps:

```
earned = base_event_yield × (1 + count) × (1 + autoclicker_count)
        × clout × kit × brand_deal_multiplier
```

`brand_deal_multiplier` is the product of all unlocked deal multipliers. At zero deals: 1.0. At deal 1: 2.0. At deals 1+2: 20.0.

### Data model

**New field on GameState or Player:**

```ts
cumulative_engagement: number  // lifetime total engagement earned this run
```

This counter increments every tick by engagement earned (before spending). It resets on rebrand.

**Static data:**

```ts
type BrandDeal = {
  id: string;
  threshold: number;        // cumulative engagement to unlock
  multiplier: number;       // flat multiplier applied when unlocked
  name: string;             // display name
};

brand_deals: BrandDeal[]    // on StaticData, sorted by threshold ascending
```

**Runtime computation:**

```ts
function brandDealMultiplier(cumulativeEngagement: number, deals: BrandDeal[]): number {
  let mult = 1.0;
  for (const deal of deals) {
    if (cumulativeEngagement >= deal.threshold) mult *= deal.multiplier;
  }
  return mult;
}
```

No new state beyond the counter. The multiplier is derived from static data + the counter.

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

1. **Should cumulative_engagement persist across rebrands (lifetime stat) or reset each run?** The proposal says reset — brand deals are per-run rewards, re-earned faster each run via Clout upgrades. But a lifetime counter could enable a separate "total career engagement" display or achievement system. **Lean: reset per run.** Keep it simple. A lifetime counter is a separate feature. **Owner: game-designer**
2. **Should the brand deal multiplier apply to follower conversion too, or only engagement?** If brand deals multiply engagement rate, followers (which derive from engagement) grow proportionally anyway. A separate follower multiplier would double-dip. **Lean: engagement only.** Followers inherit the boost naturally. **Owner: game-designer**

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
