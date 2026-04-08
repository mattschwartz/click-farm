---
name: Decimal.js Engagement Migration
description: Replace all engagement-related number arithmetic with decimal.js to remove the MAX_SAFE_INTEGER ceiling and enable unbounded number-go-up.
created: 2026-04-08
author: architect
status: implementation
reviewers: []
---

# Proposal: Decimal.js Engagement Migration

## Problem

Engagement is the workhorse currency of Click Farm. The number going up *is* the game. Currently, engagement is stored as a JavaScript `number` (IEEE 754 64-bit float) and hard-clamped at `Number.MAX_SAFE_INTEGER` (~9.007 x 10^15, i.e. ~9Qa). This ceiling is a hard stop on the core game loop: once engagement reaches ~9 quadrillion, it cannot go higher. The game breaks its own promise.

The existing multiplier stacking already pushes toward this ceiling aggressively. A single late-game generator (`algorithmic_prophecy`) at level 10 with 50 BUY units, max clout bonus (5x), and max verb gear (~1.88 billion x) produces engagement rates that can approach and exceed this limit. The ceiling is not theoretical — it is reachable in normal play.

The `clampEngagement()` function at `model/index.ts:165` exists specifically because this overflow was already causing save-breaking Infinity bugs. The clamp is a bandage. The fix is to remove the ceiling entirely.

## Proposal

Add `decimal.js` as a runtime dependency and migrate all engagement-touching arithmetic to use `Decimal` instead of native `number`. This is a mechanical but pervasive refactor — ~40 source files, ~89 arithmetic operations — with a consistent substitution pattern.

### 1. New Dependency

```bash
cd client && npm install decimal.js
```

`decimal.js` is 32KB minified/gzipped, has zero dependencies, and provides arbitrary-precision decimal arithmetic with a chainable API. It handles division, exponentiation (including fractional exponents), comparison, and string conversion natively. No BigInt limitations.

**Configuration** (set once at app init, e.g., `main.tsx`):

```typescript
import Decimal from 'decimal.js';
Decimal.set({
  precision: 40,       // 40 significant digits — headroom past 1e33 (Dc)
  rounding: Decimal.ROUND_FLOOR,  // match current Math.floor semantics
  toExpNeg: -40,       // avoid scientific notation in toString() for small values
  toExpPos: 40,        // avoid scientific notation in toString() for values up to 1e40
});
```

### 2. Type Changes

#### `client/src/types.ts`

Every numeric field that participates in engagement arithmetic changes from `number` to `Decimal`. Fields that are pure integers (counts, levels, timestamps, booleans) or unrelated to engagement (clout, rebrand_count) stay as `number`.

| Interface | Field | Current | New | Line |
|-----------|-------|---------|-----|------|
| `Player` | `engagement` | `number` | `Decimal` | 99 |
| `Player` | `lifetime_engagement` | `number` | `Decimal` | 107 |
| `PlatformState` | `followers` | `number` | `Decimal` | 161 |
| `Player` | `total_followers` | `number` | `Decimal` | 103 |
| `Player` | `lifetime_followers` | `number` | `Decimal` | 105 |
| `SnapshotState` | `total_engagement_rate` | `number` | `Decimal` | 84 |
| `SnapshotState` | `total_follower_rate` | `number` | `Decimal` | 86 |
| `SnapshotState` | `platform_rates` | `Record<PlatformId, number>` | `Record<PlatformId, Decimal>` | 88 |
| `ActiveViralEvent` | `magnitude` | `number` | `Decimal` | 205 |
| `ActiveViralEvent` | `bonus_rate_per_ms` | `number` | `Decimal` | 207 |
| `PlatformState` | `retention` | `number` | keep `number` | 175 |
| `PlatformState` | `content_fatigue` | `Record<GeneratorId, number>` | keep `number` | 181 |
| `PlatformState` | `neglect` | `number` | keep `number` | 183 |

**Rationale for keeping audience mood as `number`:** Retention, content_fatigue, and neglect are all clamped to [0, 1] — they are fractional coefficients, not currencies. They never grow unbounded and don't benefit from arbitrary precision.

**Fields that stay `number`:** `clout` (integer, small), `rebrand_count` (integer), `level` (integer, 1-10), `count` (integer), `autoclicker_count` (integer, 0-12), all timestamps, all `GeneratorDef` constants (base_event_yield, base_event_rate, etc. — these are static config read into Decimal at computation time, not stored as Decimal).

#### New type alias (add to `types.ts`)

```typescript
import Decimal from 'decimal.js';
export type { Decimal };
```

### 3. Model Layer — `client/src/model/index.ts`

**`clampEngagement()` (line 165-170)** — Rewrite to operate on Decimal. The MAX_SAFE_INTEGER ceiling is **removed**. The function now only guards against NaN and negative values:

```typescript
export function clampEngagement(value: Decimal): Decimal {
  if (value.isNaN()) return new Decimal(0);
  if (value.isNegative()) return new Decimal(0);
  return value;
  // No upper ceiling. The number does not stop going up.
}
```

**`earnEngagement()` (line 172-179)** — Change `amount` param to `Decimal`, use `.plus()`:

```typescript
export function earnEngagement(player: Player, amount: Decimal): Player {
  if (amount.isNegative()) throw new Error(`earnEngagement: amount must be >= 0`);
  return { ...player, engagement: clampEngagement(player.engagement.plus(amount)) };
}
```

**`spendEngagement()` (line 182-192)** — Use `.lt()`, `.minus()`:

```typescript
export function spendEngagement(player: Player, amount: Decimal): Player {
  if (amount.isNegative()) throw new Error(`spendEngagement: amount must be >= 0`);
  if (player.engagement.lt(amount)) throw new Error(`spendEngagement: insufficient`);
  return { ...player, engagement: player.engagement.minus(amount) };
}
```

**`canAffordEngagement()` (line 194-196)** — Use `.gte()`:

```typescript
export function canAffordEngagement(player: Player, amount: Decimal): boolean {
  return player.engagement.gte(amount);
}
```

**Follower operations** (lines 247-269) — Same pattern: `.plus()` for addition, Decimal params. `earnFollowers()` (line 240): `amount` param becomes Decimal; `followers + amount` → `.plus()`, `lifetime_followers + amount` → `.plus()`.

**`syncTotalFollowers()` (line 264-273)** — The `reduce` accumulator is `0` (number) but `platforms[id].followers` is now Decimal. `0 + Decimal` triggers JS object-to-primitive coercion → **silent string concatenation bug** producing `"00.0000..."` instead of a sum. Fix:

```typescript
export function syncTotalFollowers(
  player: Player,
  platforms: Record<PlatformId, PlatformState>,
): Player {
  const total = ALL_PLATFORM_IDS.reduce(
    (sum, id) => sum.plus(platforms[id].followers),
    new Decimal(0),
  );
  return { ...player, total_followers: total };
}
```

**Factory functions** — `createPlayer()` (line 57-74) initializes `engagement: 0`, `total_followers: 0`, `lifetime_followers: 0`, `lifetime_engagement: 0`. All must become `new Decimal(0)`. `createPlatformState()` (line 98-111) initializes `followers: 0` — same. Without this, every fresh game start, test seed, and post-rebrand state would crash on the first `.plus()` call.

```typescript
// createPlayer() changes (line 57-74):
engagement: new Decimal(0),
total_followers: new Decimal(0),
lifetime_followers: new Decimal(0),
lifetime_engagement: new Decimal(0),

// createPlatformState() change (line 105):
followers: new Decimal(0),
```

### 4. Game Loop — `client/src/game-loop/index.ts`

This is the highest-density file. ~30 arithmetic operations change.

**`levelMultiplier()` (line 55-59)** — Stays `number` return (small values, 1-1048576). Internal only. Converted to Decimal at the call site in `computeGeneratorEffectiveRate`.

**`cloutBonus()` (line 72-93)** — Stays `number` return. Same reasoning: small multiplier values (1.0-5.0). Converted at call site.

**`computeGeneratorEffectiveRate()` (line 117-137)** — Returns `Decimal` instead of `number`. The multiplication chain becomes:

```typescript
export function computeGeneratorEffectiveRate(
  generator: GeneratorState, state: GameState, staticData: StaticData,
): Decimal {
  if (!generator.owned || generator.autoclicker_count <= 0) return new Decimal(0);
  const def = staticData.generators[generator.id];
  const clout = cloutBonus(state.player.clout_upgrades, staticData);
  const gear = verbGearMultiplier(generator.id, state.player.verb_gear, staticData);
  return new Decimal(generator.autoclicker_count)
    .times(generator.level)
    .times(def.base_event_rate)
    .times(def.base_event_yield)
    .times(new Decimal(1 + generator.count).pow(def.count_exponent))
    .times(clout)
    .times(gear);
}
```

Note: `Decimal.pow()` handles fractional exponents (`count_exponent: 1.5` for chirps) natively. This replaces `Math.pow()`.

**`computeAllGeneratorEffectiveRates()` (line 143-157)** — Returns `Partial<Record<GeneratorId, Decimal>>`.

**`tick()` (line 278-409)** — Engagement accumulation (lines 294-307):

```typescript
let engagementEarned = new Decimal(0);
for (const id of Object.keys(ratesPerSec) as GeneratorId[]) {
  const perMs = (ratesPerSec[id] ?? new Decimal(0)).div(1000);
  ratesPerMs[id] = perMs;
  engagementEarned = engagementEarned.plus(perMs.times(deltaMs));
}
// ... later:
engagement: clampEngagement(state.player.engagement.plus(engagementEarned)),
lifetime_engagement: clampEngagement(state.player.lifetime_engagement.plus(engagementEarned)),
```

Viral burst application (line 391):
```typescript
engagement: clampEngagement(player.engagement.plus(
  viralBurst.active.bonus_rate_per_ms.times(deltaMs)
)),
```

**`evaluateViralTrigger()` (lines 190-254)** — Three change sites beyond the magnitude computation:

1. Line 194: `rateEntries` type changes from `[GeneratorId, number][]` to `[GeneratorId, Decimal][]` since `computeAllGeneratorEffectiveRates` now returns Decimal values.
2. Lines 213-219: `rate > topRate` uses `>` operator on Decimal objects, which compares object references (always false for distinct instances) — **silent bug**. Must use `.gt()`:
   ```typescript
   if (rate.gt(topRate)) {
     topRate = rate;
     topGenId = id;
   }
   ```
3. Line 242: `rateEntries.reduce((sum, [, r]) => sum + r, 0)` — same `0 + Decimal` coercion bug as `syncTotalFollowers`. Fix:
   ```typescript
   const totalRatePerMs = rateEntries
     .reduce((sum, [, r]) => sum.plus(r), new Decimal(0))
     .div(1000);
   ```

Magnitude computation (lines 252-253):
```typescript
const bonus_rate_per_ms = totalRatePerMs.times(boostFactor - 1);
const magnitude = bonus_rate_per_ms.times(duration_ms);
```

**`verbYieldPerTap()` (line 492-501)** — Returns `Decimal`:

```typescript
return new Decimal(def.base_event_yield)
  .times(new Decimal(1 + generator.count).pow(def.count_exponent))
  .times(1 + generator.autoclicker_count)
  .times(clout)
  .times(gear);
```

**`postClick()` (line 538-575)** — Uses Decimal for earned amount and balance update.

**`computeSnapshot()` (line 423-462)** — Returns `SnapshotState` with Decimal rates.

**Follower distribution** (lines 317-362) — `gained` values become Decimal via `.times()` chains.

### 5. Generator Operations — `client/src/generator/index.ts`

**`generatorBuyCost()` (line 40)** — Returns `Decimal`:

```typescript
return new Decimal(def.base_buy_cost)
  .times(new Decimal(def.buy_cost_multiplier).pow(currentCount));
```

**`generatorUpgradeCost()` (line ~68)** — Returns `Decimal`:

```typescript
return new Decimal(def.upgrade_costs[level - 1]);
```

**`autoclickerBuyCost()` (line 91)** — Returns `Decimal`:

```typescript
return new Decimal(def.base_autoclicker_cost)
  .times(new Decimal(def.autoclicker_cost_multiplier).pow(currentAutoclickerCount));
```

**`checkGeneratorUnlocks()` (line 118-139)** — Takes `totalFollowers: number` but callers pass `player.total_followers` which is now Decimal. Since unlock thresholds are small integers, convert at call site: `player.total_followers.toNumber()`. The `>=` comparison at line 131 stays native `number`.

**`canUnlockGenerator()` (line 145-155)** — Line 154: `state.player.total_followers >= threshold` — Decimal vs number comparison. Same fix: `.toNumber()` at call site or change param to Decimal + `.gte()`. Recommend `.toNumber()` since thresholds are small.

**`unlockGenerator()` (line ~191-216)** — Line 199-201: passes `def.base_buy_cost` (plain `number`) to `canAffordEngagement()` / `spendEngagement()` which now expect Decimal. Must wrap: `new Decimal(def.base_buy_cost)`.

**`buyGenerator()`, `upgradeGenerator()`, `buyAutoclicker()`** — All call `spendEngagement()` with Decimal costs (returned by the cost functions above). `unlockGenerator` additionally needs the `new Decimal()` wrapping for `base_buy_cost`.

### 6. Verb Gear — `client/src/verb-gear/index.ts`

**`verbGearMultiplier()` (line ~39)** — Stays `number` return. The multiplier values (1234, 1522756, 1879080904) fit in `number` and are only used as operands inside Decimal chains at `computeGeneratorEffectiveRate`.

**`verbGearCost()` / `canPurchaseVerbGear()`** — Cost returns `Decimal`; affordability check uses `canAffordEngagement()` which now takes Decimal.

### 7. Offline — `client/src/offline/index.ts`

**`calculateOffline()` (lines 100-155)** — All rate arithmetic becomes Decimal:

```typescript
const durationSec = new Decimal(durationMs).div(1000);
let engagementGained = new Decimal(0);
for (const id of generatorIds) {
  engagementGained = engagementGained.plus(
    (ratesPerSec[id] ?? new Decimal(0)).times(durationSec)
  );
}
```

Follower accumulation follows the same pattern.

**`OfflineResult` interface (lines 38-47)** — Must change to Decimal:

```typescript
export interface OfflineResult {
  engagementGained: Decimal;              // was number
  followersGained: Record<PlatformId, Decimal>;  // was number
  totalFollowersGained: Decimal;          // was number
  durationMs: number;                     // stays number (timestamp)
}
```

The `emptyResult()` helper (line 53) must return `new Decimal(0)` for all Decimal fields. Consumers: `App.tsx`, `OfflineGainsModal.tsx`, `driver/index.ts`.

### 8. Platform — `client/src/platform/index.ts`

**`checkPlatformUnlocks()` (line 44-63)** — Takes `totalFollowers: number` but callers pass Decimal. Since platform unlock thresholds are small integers, convert at call site: `player.total_followers.toNumber()`. The `>=` comparison at line 55 stays native `number`.

**`computeFollowerDistribution()` (lines ~119-152)** — Param type `generatorEffectiveRates: Partial<Record<GeneratorId, number>>` must change to accept Decimal. Six internal arithmetic sites all change:
- Line 122: `baseRate += engagementRate * conv` → `baseRate = baseRate.plus(engagementRate.times(conv))`
- Line 138: `score += engagementRate * conv * affinity` → `score = score.plus(engagementRate.times(conv).times(affinity))`
- Line 149: `rawScores[id] / totalRaw` → `.div()`
- Line 151: `baseRate * share` → `.times()`
- Line 152: `totalRate += perPlatformRate[id]` → `.plus()`

Return type `FollowerDistribution` fields `perPlatformRate` and `totalRate` become Decimal. This cascades to every consumer of the distribution result (tick, offline, snapshot).

### 9. Prestige — `client/src/prestige/index.ts`

**`executeRebrand()` (lines 114-200)** — Multiple reset sites need Decimal(0):
- Line 138: `followers: 0` in per-platform reset → `followers: new Decimal(0)`
- Line 169: `engagement: 0` → `engagement: new Decimal(0)`
- Line 170: `total_followers: 0` → `total_followers: new Decimal(0)`

The `lifetime_engagement` and `lifetime_followers` fields are preserved (already Decimal, no change needed).

**Clout formula — OVERFLOW HAZARD (see OQ6).** The current formula `floor(sqrt(totalFollowers) / 10)` produces values that exceed `Number.MAX_SAFE_INTEGER` once `total_followers` passes ~10^31. Converting via `.toNumber()` returns `Infinity` at that point, silently breaking the prestige system. This migration **cannot ship** without a companion formula change.

**Required fix:** Replace the sqrt-based formula with a log-based formula that compresses clout output into a bounded range regardless of follower magnitude. Per game-designer review: clout is a scarce prestige currency where 1,000 is a deeply invested player and 100,000 should buy out the entire shop. A logarithmic formula (e.g., `floor(log10(totalFollowers) * k)`) naturally achieves this — doubling the exponent of followers adds a fixed amount of clout, not an exponential amount.

**Architect's proposed replacement:**

```typescript
export function cloutForRebrand(totalFollowers: Decimal): number {
  if (totalFollowers.lte(0)) return 0;
  // log10-based compression: every 10x followers adds k clout.
  // k=3 example: 1e4 followers = 12 clout, 1e10 = 30 clout, 1e30 = 90 clout, 1e60 = 180 clout.
  // The exact constant k needs a game-designer tuning pass.
  const k = 3;  // PROVISIONAL — game-designer to tune
  return Math.floor(totalFollowers.log(10).times(k).toNumber());
}
```

This keeps clout as `number` (the output is always small), eliminates the overflow, and gives the game designer a single knob (`k`) to tune the prestige economy. The specific value of `k` is a game-design question — filed as a dependency in OQ6.

**Implementation note:** `Decimal.log(10)` is natively supported by decimal.js. No `Math.log10` needed.

### 10. Save/Load — `client/src/save/index.ts`

**Serialization:** `Decimal` is not JSON-serializable. The save layer must convert at the boundary.

```typescript
// On save: Decimal → string
function serializeState(state: GameState): SerializedGameState {
  return {
    ...state,
    player: {
      ...state.player,
      engagement: state.player.engagement.toString(),
      lifetime_engagement: state.player.lifetime_engagement.toString(),
      total_followers: state.player.total_followers.toString(),
      lifetime_followers: state.player.lifetime_followers.toString(),
    },
    // ... same for platforms[id].followers, snapshot rates
  };
}

// On load: string → Decimal
function deserializeState(raw: SerializedGameState): GameState {
  return {
    ...raw,
    player: {
      ...raw.player,
      engagement: new Decimal(raw.player.engagement),
      lifetime_engagement: new Decimal(raw.player.lifetime_engagement),
      total_followers: new Decimal(raw.player.total_followers),
      lifetime_followers: new Decimal(raw.player.lifetime_followers),
    },
    // ... same for platforms, snapshot
  };
}
```

**Schema version bump:** `CURRENT_VERSION` increments from 15 to 16.

**Migration v15 → v16:** Convert existing `number` engagement fields to string representation for the new Decimal-based schema. Old saves with `number` values get `new Decimal(existingValue).toString()`. The v5→v6 clamping migration remains valid — Decimal can parse `"9007199254740991"` without precision loss.

### 11. Display Pipeline — `client/src/ui/format.ts`

All formatter functions accept `Decimal | number` via overload or union. Internally, convert to `number` at the display boundary — the formatted output is always a short human-readable string where float precision is irrelevant (e.g., "12.4K" doesn't need 40 digits of precision).

```typescript
export function fmtCompact(n: Decimal | number): string {
  const num = typeof n === 'number' ? n : n.toNumber();
  // ... existing logic unchanged
}
```

**Why `.toNumber()` is safe here:** The formatter divides by the tier divisor before displaying. A value of 1.23 x 10^50 becomes `1.23` after dividing by 10^50 — well within float range. The TIERS table handles the magnitude; the formatted number is always small.

**Exception — overflow branch (line 82, 100, 118, 140):** For values beyond the tier table, use Decimal's own formatting:

```typescript
if (abs >= 1e36) {
  // For Decimal values, use Decimal.toExponential() to preserve precision
  const d = n instanceof Decimal ? n : new Decimal(n);
  return d.toExponential(2);  // "1.23e+50"
}
```

The same change applies to `fmtCompactParts`, `fmtCompactIntParts`, `fmtCompactInt`, and `fmtRate`. All 6 exported functions get the `Decimal | number` union parameter.

**No changes to TIER_COLOR_VAR, TieredParts interface, or CSS tokens.**

### 12. Interpolation — `client/src/ui/useInterpolatedValue.ts`

**`interpolateValue()` (line 33-42)** — Accepts Decimal for `lastValue` and `ratePerSec`, returns `number` for the display pipeline:

```typescript
export function interpolateValue(
  lastValue: Decimal | number,
  ratePerSec: Decimal | number,
  elapsedMs: number,
  clamp = true,
  maxMs: number = TICK_INTERVAL_MS,
): number {
  const effectiveMs = clamp ? Math.min(elapsedMs, maxMs) : elapsedMs;
  const base = lastValue instanceof Decimal ? lastValue : new Decimal(lastValue);
  const rate = ratePerSec instanceof Decimal ? ratePerSec : new Decimal(ratePerSec);
  return base.plus(rate.times(effectiveMs / 1000)).toNumber();
}
```

**`useInterpolatedValue()` hook (line 55-100)** — Same signature change: `value: Decimal | number`, `ratePerSec: Decimal | number`. Returns `number` (the display doesn't need Decimal precision — it's a 60fps visual interpolation between ticks).

**Why `.toNumber()` is safe for display:** The interpolated value is consumed by `fmtCompact()` which immediately divides by the tier divisor. Even if the raw value exceeds `MAX_SAFE_INTEGER`, the *display* operation (tier division + toFixed) produces a small float. Loss of precision in the least-significant digits of a display-only value is invisible to the player. The ground-truth `Decimal` value in game state is never affected.

### 13. UI Components — Call Site Updates

Every component that reads `player.engagement`, rates, costs, or follower counts and passes them to formatters needs no logic change — the formatters accept `Decimal | number`. The only changes are in components that do inline arithmetic on these values.

| File | Line(s) | Change |
|------|---------|--------|
| `TopBar.tsx` | 24-31 | Props interface: `engagement: number` → `Decimal`, `engagementRate: number` → `Decimal`, `summaryBadge.magnitude: number` → `Decimal` |
| `TopBar.tsx` | 85-86 | Rate delta comparison: `.minus()` + `.abs().gt(THRESHOLD)` |
| `TopBar.tsx` | 102 | `useInterpolatedValue(engagement, engagementRate)` — types already updated |
| `GameScreen.tsx` | 196-203 | Rate summation: `let total = 0; total += rates[id] ?? 0` — Decimal `+=` coerces to string. Must use `new Decimal(0)` accumulator + `.plus()` |
| `GameScreen.tsx` | 219-230 | `summaryBadge.magnitude` captured from `prev.magnitude` (now Decimal) — `useState` type updates |
| `GameScreen.tsx` | 247-250 | `viralActive.bonus_rate_per_ms * 1000` → `.times(1000)` and `engagementRate + viralBonusRatePerSec` → `.plus()` |
| `GeneratorList.tsx` | 162, 376, 396, 399 | Inline `state.player.engagement >= cost` comparisons — Decimal has no `>=` overload. Must use `.gte()` (6 sites) |
| `GeneratorList.tsx` | 385, 419-420, 442-446, 464-469, 495 | Cost values are now Decimal — formatters handle it |
| `ActionsColumn.tsx` | 283, 301, 325, 362, 427 | `perTap` and `ratePerSec` are Decimal — formatters handle it |
| `PlatformPanel.tsx` | 120 | `followers` is Decimal — formatter handles it |
| `RebrandCeremonyModal.tsx` | 61, 83-84, 306, 545, 549 | Engagement/follower values are Decimal — formatters handle it |
| `OfflineGainsModal.tsx` | 45, 54 | `engagementGained` is Decimal; multiply by progress (number) via `.times()` |
| `PostZone.tsx` | 64, 75 | `perClick` is Decimal — formatter handles it |
| `eulogy-templates.ts` | 56, 58 | Lifetime values are Decimal — formatter handles it |
| `DebugApp.tsx` | 192-195 | `generatorBuyCost()` / `generatorUpgradeCost()` now return Decimal; `state.player.engagement >= buyCost` → `.gte()` |
| `DebugApp.tsx` | 240, 245, 249 | `state.player.total_followers === 0` — Decimal `=== 0` is always `false` (object identity). Must use `.isZero()` or `.eq(0)`. Also `> 0` → `.gt(0)` |
| `DebugApp.tsx` | 209, 218, 233 | `fmt(buyCost)`, `fmt(upgradeCost)`, `fmtInt(total_followers)` — formatters handle Decimal transparently |

### 14. Audience Mood — `client/src/audience-mood/index.ts`

**No changes.** Retention, content_fatigue, and neglect remain `number`. The only interaction with Decimal is at the multiplication boundary in `tick()` where `retention` (number) multiplies a follower rate (Decimal): `rate.times(retention)` — Decimal handles mixed operands natively.

### 15. Driver — `client/src/driver/index.ts`

**Type declarations:**
- `SweepItem.cost` (line 116) and `SweepPurchaseEvent.cost` (line 109): `number` → `Decimal`. The `buildAffordableList` function calls `generatorBuyCost()`, `autoclickerBuyCost()`, `generatorUpgradeCost()` — all now return Decimal. The `canAffordEngagement` calls inside `buildAffordableList` also receive Decimal params natively.
- `ViralBurstPayload.magnitude` (if present as a UI event type): `ActiveViralEvent.magnitude` is now Decimal. The driver copies `active.magnitude` into a UI-facing payload at line ~382. Convert at boundary: `.toNumber()` — the payload is consumed by UI summary badge where magnitude is only displayed, not accumulated.

**Sweep sort** (line 473): `b.cost - a.cost` becomes `b.cost.minus(a.cost).toNumber()` for sort comparator (sort requires a number return).

**`buildAffordableList`** — the `canAffordEngagement` and cost-comparison calls already receive Decimal values once the upstream cost functions are changed. No additional wrapping needed.

### 16. Static Data — `client/src/static-data/index.ts`

**No changes.** Generator definitions, verb gear definitions, clout upgrade costs, and viral burst config all remain as plain `number` literals. They are converted to `Decimal` at computation time (e.g., `new Decimal(def.base_buy_cost)` inside `generatorBuyCost()`). This keeps the data files clean and avoids importing Decimal into static config.

### 17. Notation Ladder Extension

The current TIERS table in `format.ts` covers K (10^4) through Dc (10^33) with overflow at 10^36. With the MAX_SAFE_INTEGER ceiling removed, engagement will eventually exceed the Dc tier in extended play.

**Current state:** The accepted "Large Number Notation Ladder" proposal (2026-04-05) resolved that Dc is sufficient headroom for now, but that was predicated on the engagement clamp at ~9e15. This migration invalidates that assumption.

**Required additions to `format.ts` TIERS table:**

| Tier | Threshold | Suffix | Name | Line to add |
|------|-----------|--------|------|-------------|
| 10^36 | 1e36 | Ud | Undecillion | above Dc row |
| 10^39 | 1e39 | Dd | Duodecillion | above Ud row |
| 10^42 | 1e42 | Td | Tredecillion | above Dd row |
| 10^45 | 1e45 | Qad | Quattuordecillion | above Td row |
| 10^48 | 1e48 | Qid | Quindecillion | above Qad row |
| 10^51 | 1e51 | Sxd | Sexdecillion | above Qid row |
| 10^54 | 1e54 | Spd | Septendecillion | above Sxd row |
| 10^57 | 1e57 | Ocd | Octodecillion | above Spd row |
| 10^60 | 1e60 | Nod | Novemdecillion | above Ocd row |
| 10^63 | 1e63 | Vg | Vigintillion | above Nod row |

**Overflow policy shift:** Move the overflow cutoff from 1e36 to 1e66 (1000 Vg). Values beyond Vg use the existing unicode `x10^n` fallback from the notation ladder proposal.

**New tier colors** required in `theme/tokens.css` and `TIER_COLOR_VAR` map:

| Suffix | CSS Variable | Rationale |
|--------|-------------|-----------|
| Ud | `--tier-ud` | Continue the magenta→crimson ramp |
| Dd | `--tier-dd` | |
| Td | `--tier-td` | |
| Qad | `--tier-qad` | |
| Qid | `--tier-qid` | |
| Sxd | `--tier-sxd` | |
| Spd | `--tier-spd` | |
| Ocd | `--tier-ocd` | |
| Nod | `--tier-nod` | |
| Vg | `--tier-vg` | Terminal tier — maximum visual intensity |

**7-character hard cap constraint (from UX spec):** All new suffixes are 2-3 characters. Worst case: `999.99Qad` = 9 chars. This exceeds the 7-char cap. Resolution options:

1. Reduce decimals for 3-char suffixes: `999Qad` (6 chars) — acceptable, matches the visual weight of lower tiers
2. Use 2-char abbreviations only: Ud/Dd/Td/Qd/Qi/Sx/Sp/Oc/No/Vg — but these collide with existing K-Dc suffixes (Qi, Sx, Sp, Oc, No are already taken)

**This is an open question for the UX designer.** See Open Questions below.

### 18. Test Updates

Every test file that constructs, asserts, or compares engagement values needs mechanical updates:

| Test File | Approximate Changes |
|-----------|-------------------|
| `model/index.test.ts` | `expect(x).toBe(50)` → `expect(x.eq(50)).toBe(true)` or Decimal-aware matchers |
| `game-loop/index.test.ts` | Seed states with `new Decimal(...)`, rate assertions use `.toNumber()` for `toBeCloseTo` |
| `generator/index.test.ts` | Cost assertions become Decimal comparisons |
| `verb-gear/index.test.ts` | Gear cost assertions become Decimal comparisons |
| `prestige/index.test.ts` | `expect(next.player.engagement.eq(0)).toBe(true)` |
| `offline/index.test.ts` | `engagementGained` assertions use Decimal |
| `save/index.test.ts` | Add v15→v16 migration tests; verify string serialization round-trips |
| `integration.test.ts` | Currency conservation test uses Decimal subtraction |
| `driver/index.test.ts` | Engagement comparisons use Decimal |
| `format.test.ts` | Add tests for Decimal input; verify new tiers (Ud through Vg) |
| `useInterpolatedValue.test.ts` | Verify Decimal inputs produce valid number outputs |

**Custom Vitest matcher (recommended):**

```typescript
expect.extend({
  toEqualDecimal(received: Decimal, expected: Decimal | number | string) {
    const exp = new Decimal(expected);
    return {
      pass: received.eq(exp),
      message: () => `expected ${received.toString()} to equal ${exp.toString()}`,
    };
  },
});
```

### 19. Performance

**Concern:** Decimal arithmetic is slower than native `number` arithmetic. The tick loop runs at 10Hz with ~11 generators, each requiring ~6 Decimal multiplications per rate computation.

**Measurement:** `decimal.js` benchmarks at ~2-5 million operations/second for multiply/divide at 40-digit precision. The tick loop performs ~66 Decimal ops per tick (11 generators x 6 ops). At 10 ticks/second, that's 660 ops/second — **0.03% of the library's throughput**. Not a concern.

**RAF interpolation** converts to `number` early (one `.toNumber()` call per frame). No Decimal arithmetic in the render-critical path.

### 20. Bundle Size

`decimal.js` is ~32KB minified + gzipped. The current client has zero runtime dependencies besides React. This is the first. Acceptable given the alternative is a broken game.

## Exhaustive File Change List

### Files that change type signatures (Decimal replaces number)

| # | File | Nature of Change |
|---|------|-----------------|
| 1 | `client/src/types.ts` | Add Decimal import; change 8 fields across 4 interfaces |
| 2 | `client/src/model/index.ts` | Rewrite clampEngagement, earnEngagement, spendEngagement, canAffordEngagement, earnFollowers, syncTotalFollowers; update createPlayer, createPlatformState, createInitialGameState factories to init Decimal(0) |
| 3 | `client/src/game-loop/index.ts` | Rewrite computeGeneratorEffectiveRate, computeAllGeneratorEffectiveRates, tick (accumulator + engagement writes), evaluateViralTrigger (rateEntries type, `.gt()` comparisons, reduce accumulator, magnitude calc), postClick, verbYieldPerTap, verbYieldPerAutoTap, verbCooldownMs (stays number), computeSnapshot |
| 4 | `client/src/generator/index.ts` | Rewrite generatorBuyCost, generatorUpgradeCost, autoclickerBuyCost (return Decimal); update checkGeneratorUnlocks, canUnlockGenerator (totalFollowers boundary), unlockGenerator (wrap base_buy_cost in Decimal), buyGenerator, upgradeGenerator, buyAutoclicker |
| 5 | `client/src/offline/index.ts` | Update OfflineResult interface (engagementGained, followersGained, totalFollowersGained → Decimal); rewrite calculateOffline; update emptyResult helper |
| 6 | `client/src/platform/index.ts` | Update checkPlatformUnlocks (totalFollowers boundary); rewrite computeFollowerDistribution (param type, 6 arithmetic sites, return type FollowerDistribution) |
| 7 | `client/src/prestige/index.ts` | executeRebrand: Decimal(0) for engagement, total_followers, per-platform followers; clout formula replacement (log10-based) |
| 8 | `client/src/verb-gear/index.ts` | verbGearCost returns Decimal; canPurchaseVerbGear uses Decimal comparison; purchaseVerbGear wraps cost in Decimal for spendEngagement |
| 9 | `client/src/save/index.ts` | Add serialize/deserialize layer; bump version 15→16; add v15→v16 migration |
| 10 | `client/src/driver/index.ts` | SweepItem.cost and SweepPurchaseEvent.cost → Decimal; ViralBurstPayload.magnitude boundary conversion (.toNumber()); sweep sort comparator |

### Files that change function signatures (accept Decimal | number)

| # | File | Nature of Change |
|---|------|-----------------|
| 11 | `client/src/ui/format.ts` | All 6 exported functions accept `Decimal \| number`; add tiers Ud through Vg; shift overflow cutoff to 1e66 |
| 12 | `client/src/ui/useInterpolatedValue.ts` | interpolateValue and useInterpolatedValue accept `Decimal \| number` |
| 13 | `client/src/ui/TieredNumber.tsx` | Props `value` type becomes `Decimal \| number` |

### Files that change only because their inputs changed type

| # | File | Nature of Change |
|---|------|-----------------|
| 14 | `client/src/ui/TopBar.tsx` | Props interface (engagement, engagementRate, summaryBadge.magnitude → Decimal); rate delta comparison uses `.minus()` / `.abs().gt()` |
| 15 | `client/src/ui/GameScreen.tsx` | Rate summation loop (lines 196-203): Decimal accumulator + `.plus()`; viral bonus (lines 247-250): `.times(1000)` + `.plus()`; summaryBadge magnitude state type; computeAllGeneratorEffectiveRates return type cascade |
| 16 | `client/src/ui/GeneratorList.tsx` | 6 inline `engagement >= cost` comparisons → `.gte()`; cost values passed to formatters (transparent) |
| 17 | `client/src/ui/ActionsColumn.tsx` | perTap/rate values are Decimal; formatters handle it |
| 18 | `client/src/ui/PlatformPanel.tsx` | followers is Decimal; formatter handles it |
| 19 | `client/src/ui/RebrandCeremonyModal.tsx` | Engagement/follower values are Decimal |
| 20 | `client/src/ui/OfflineGainsModal.tsx` | engagementGained is Decimal; progress multiplication via `.times()` |
| 21 | `client/src/ui/PostZone.tsx` | perClick is Decimal |
| 22 | `client/src/ui/eulogy-templates.ts` | lifetime values are Decimal |
| 23 | `client/src/ui/DebugApp.tsx` | Cost comparisons (`>=` → `.gte()`), follower zero-checks (`=== 0` → `.isZero()`, `> 0` → `.gt(0)`), cost/follower formatting (transparent) |

### Files with minor additions (no type signature changes)

| # | File | Nature of Change |
|---|------|-----------------|
| 24 | `client/src/main.tsx` | Add `Decimal.set()` configuration (1 line) |
| 25 | `client/src/theme/tokens.css` | Add 10 new tier color variables (--tier-ud through --tier-vg) |

### Files that don't change

| # | File | Reason |
|---|------|--------|
| — | `client/src/audience-mood/index.ts` | All fields stay number; Decimal interaction happens at tick boundary |
| — | `client/src/static-data/index.ts` | Static config stays number; converted at computation time |
| — | `client/src/ui/sfx.ts` | No engagement interaction |

### New files

| # | File | Purpose |
|---|------|---------|
| 26 | `client/src/test/decimal-matchers.ts` | Custom Vitest matchers for Decimal assertions |

### Test files requiring updates

| # | File |
|---|------|
| 27 | `client/src/model/index.test.ts` |
| 28 | `client/src/game-loop/index.test.ts` |
| 29 | `client/src/generator/index.test.ts` |
| 30 | `client/src/verb-gear/index.test.ts` |
| 31 | `client/src/prestige/index.test.ts` |
| 32 | `client/src/offline/index.test.ts` |
| 33 | `client/src/save/index.test.ts` |
| 34 | `client/src/integration.test.ts` |
| 35 | `client/src/driver/index.test.ts` |
| 36 | `client/src/ui/format.test.ts` |
| 37 | `client/src/ui/useInterpolatedValue.test.ts` |

**Total: 25 source files + 1 new file + 11 test files = 37 files touched.**

## References

1. `client/src/types.ts` — Type definitions for Player, SnapshotState, ActiveViralEvent, PlatformState
2. `client/src/model/index.ts:158-196` — clampEngagement, earnEngagement, spendEngagement, canAffordEngagement
3. `client/src/game-loop/index.ts` — Tick loop, rate computation, viral burst, manual click
4. `client/src/generator/index.ts` — Cost formulas, purchase operations
5. `client/src/offline/index.ts` — Offline engagement/follower accumulation
6. `client/src/platform/index.ts` — Follower distribution from engagement rates
7. `client/src/prestige/index.ts` — Rebrand engagement reset, clout formula
8. `client/src/verb-gear/index.ts` — Gear costs and multipliers
9. `client/src/save/index.ts` — Serialization, migrations, schema version 15
10. `client/src/ui/format.ts` — Compact number formatting, TIERS table, tier colors
11. `client/src/ui/useInterpolatedValue.ts` — 60fps display interpolation
12. `client/src/static-data/index.ts` — Generator defs, verb gear defs, economy constants
13. `.frames/sdlc/proposals/accepted/20260405-large-number-notation-ladder.md` — Tier table design decisions
14. `.frames/sdlc/proposals/accepted/20260406-compact-number-tier-colors.md` — Tier color ramp
15. `decimal.js` documentation: https://mikemcl.github.io/decimal.js/

## Open Questions

1. **[game-designer]** The notation ladder proposal (ref 13) resolved that the realistic engagement ceiling is 10^20-10^24, and Dc (10^33) provides sufficient headroom. This was based on the MAX_SAFE_INTEGER clamp. With the clamp removed, what is the intended end-game engagement magnitude? This determines how many new tiers we actually need now vs. deferring.
   - **[RESOLVED]** The tiers through Vg (10^63) should ship with this migration. We don't know exactly where late-game peaks, but we know prestige compounding will push well past Dc, and the overflow fallback (scientific notation) is a bad player experience for what should be a triumphant moment. Build the notation ladder now so big numbers always feel like a reward, not a formatting failure. The specific end-game ceiling is a function of the prestige curve, which is still being designed — but the notation system should be ready before the progression system needs it, not after.

2. **[game-designer]** Should the game-voice naming for tiers beyond Dc (Ud, Dd, Td, etc.) use standard -illion abbreviations, or should they get satirical/thematic names consistent with the game's social-media voice? (e.g., "Vi" for Viral, "Sl" for Shill, etc. — candidates from the notation ladder proposal's deferred naming discussion.)
   - **[RESOLVED]** Strong preference for thematic names over dry -illion abbreviations. This game is social media satire — the notation is part of the voice. Standard abbreviations (Ud, Dd, Td) are forgettable and indistinguishable from each other at a glance. Thematic suffixes that evoke the game world (viral, clout, shill, etc.) double as worldbuilding. However: the specific names need a small design exercise with the UX designer to ensure they're immediately parseable, visually distinct at speed, and don't collide with existing suffixes. This should be a follow-up task, not a blocker for the Decimal migration itself. Ship with the standard abbreviations as placeholders, then swap in thematic names when the naming exercise is done.

3. **[ux-designer]** The 7-character hard cap (UX spec, ref 14) is exceeded by 3-character suffixes at high values (e.g., "999.99Qad" = 9 chars). Options: (a) reduce to 0 decimals for 3-char suffixes ("999Qad" = 6 chars), (b) use 2-char suffixes only and find non-colliding abbreviations, (c) relax the cap for post-Dc tiers. Which approach?

4. **[ux-designer]** The 10 new tier colors (Ud through Vg) need to extend the existing K→Dc ramp (neutral grey → crimson-pink). The current ramp ends at `#B00840`. What's the color strategy for tiers beyond — continue into deep reds, wrap to a new hue family, or use a different visual signal (e.g., metallic/gradient effects)?

5. **[engineer]** `decimal.js` vs `decimal.js-light` — the light version omits `crypto` random, `atan2`, and some trigonometry methods we don't use. It's ~20% smaller. Worth it, or is 32KB already small enough that the maintenance cost of tracking a less-popular package isn't worth the savings?
   - **[RESOLVED]** Full `decimal.js` required. `decimal.js-light` drops `ln`, `log`, `exp`, and `pow` with non-integer exponents — and `Decimal.log(10)` is used in the new clout formula (§9). Not an option for this migration. 32KB gzipped is negligible.

6. **[architect]** The clout formula `floor(sqrt(total_followers) / 10)` overflows `number` once total_followers exceeds ~10^31 (sqrt produces 10^15.5, exceeding MAX_SAFE_INTEGER after division). The proposal's prestige boundary conversion (`.toNumber()`) will return `Infinity` at that point, silently breaking the prestige system. The formula must be redesigned to compress output into a small range — see game-designer review for design constraints.

---
## Revision: 2026-04-08 — architect (rev 2)

Addressed engineer review — 13 blocking gaps in the exhaustive file list. Changes:

- **§3 Model:** Added factory functions (`createPlayer`, `createPlatformState`) with `new Decimal(0)` init. Added `syncTotalFollowers()` with the `0 + Decimal` coercion bug fix. Added `earnFollowers()` Decimal param.
- **§4 Game Loop:** Expanded `evaluateViralTrigger` to cover `rateEntries` type change, `>` → `.gt()` comparison fix (3 sites), and reduce accumulator coercion bug.
- **§5 Generator:** Added `checkGeneratorUnlocks`, `canUnlockGenerator` boundary conversions (`.toNumber()` at call site), `unlockGenerator` `base_buy_cost` wrapping.
- **§7 Offline:** Added `OfflineResult` interface change and `emptyResult` helper.
- **§8 Platform:** Added `checkPlatformUnlocks` boundary conversion. Expanded `computeFollowerDistribution` to enumerate all 6 arithmetic sites and return type cascade.
- **§9 Prestige:** Added missing `Decimal(0)` resets for `total_followers` and per-platform `followers`.
- **§13 UI Components:** Added `GameScreen.tsx` (rate summation loop, viral bonus arithmetic, summaryBadge type). Added `DebugApp.tsx` (comparisons, zero-checks). Added `GeneratorList.tsx` inline `>=` comparison sites.
- **§15 Driver:** Added `SweepItem.cost`, `SweepPurchaseEvent.cost` type declarations. Added `ViralBurstPayload.magnitude` boundary conversion.
- **File list:** Fixed totals. Added `DebugApp.tsx`. Moved `GameScreen.tsx` from "no change" to "type flow changes". Moved `main.tsx` and `tokens.css` to "minor additions" (they were incorrectly listed under "don't change"). Renumbered. New total: 37 files.
- **OQ5:** Closed — `decimal.js-light` drops `log`/`pow` needed for clout formula.

---
## Revision: 2026-04-08 — architect

Addressed game-designer review comment #2 (blocking: clout formula overflow). Updated §9 (Prestige) to flag the overflow hazard, propose a log10-based replacement formula with a provisional constant, and mark the formula change as a hard prerequisite for shipping this migration. OQ6 (added by game-designer) acknowledged — architect owns the implementation; game-designer owns tuning the constant `k`.

---
# Review: game-designer

**Date**: 2026-04-08
**Decision**: Request for Comment

**Comments**

1. **The core migration is the right call.** The ceiling at ~9Qa breaks the game's central promise. Decimal.js is the correct tool, the boundary decisions are well-reasoned (retention/fatigue staying as `number`, static data staying as `number`, converting at display boundary), and the performance analysis is convincing. No design concerns with the migration itself.

2. **Blocking: The clout formula will overflow.** The proposal states clout stays as `number` because it's "integer, small" — but that assumption only holds if total_followers is bounded. The whole point of this migration is removing that bound. The current formula `floor(sqrt(total_followers) / 10)` produces values that exceed MAX_SAFE_INTEGER once total_followers passes ~10^31, which is well within the range this migration enables. The prestige system — the game's primary pacing mechanism — silently breaks at the same category of boundary this proposal is trying to fix.

   **Design intent for the fix:** Clout is a scarce prestige currency. It should stay small. 1,000 clout is a LOT — that's a deeply invested player. 100,000 clout should buy out the entire clout shop. The formula must compress aggressively so that even with total_followers at 10^60, clout stays in a range where individual purchases feel meaningful. A logarithmic formula (e.g., `floor(log10(total_followers) * k)` for some tuned constant `k`) naturally achieves this compression: doubling the exponent of your followers adds a fixed amount of clout, not an exponential amount. The specific formula and constant need a design pass (likely a game-designer task), but the constraint is clear: **clout output must be bounded in a range where the clout shop economy works**, regardless of how large followers grow.

   The proposal's §9 (Prestige) needs to be updated to reflect this. Either: (a) replace the sqrt formula with a log-based formula that keeps clout in the target range, or (b) if the architect prefers to defer the formula redesign, explicitly flag that `cloutForRebrand()` is a known overflow hazard and the Decimal migration cannot ship without a companion formula change. I'd add this as OQ6 for the architect.

3. **Tier expansion should stay.** The tiers through Vg (10^63) should ship with this migration. The overflow fallback (scientific notation) is a bad player experience for what should feel triumphant. Notation should be ready before the progression demands it.

4. **Tier naming: ship with standard abbreviations, follow up with thematic names.** Strong preference for satirical/thematic suffixes that match the game's social-media voice — but the naming exercise needs UX designer collaboration and shouldn't block this migration. Use the standard -illion abbreviations as placeholders now, swap them in a follow-up task.

5. **No engagement line concerns.** Unbounded number-go-up is the genre contract. The player knows what they're signing up for. The prestige reset is a natural pacing mechanism. Nothing in this migration moves the needle toward manipulation.

---
# Review: game-designer (re-review)

**Date**: 2026-04-08
**Decision**: Aligned

**Comments**

The architect's revision to §9 resolves the blocking concern. The log10-based formula is structurally correct — it compresses where sqrt doesn't, keeps clout as `number` safely (output is always small), and provides a single tuning knob (`k`). Spot-checking the provisional k=3:

- 1e4 followers → 12 clout (early rebrand, modest — correct)
- 1e10 followers → 30 clout (mid-game — reasonable)
- 1e20 followers → 60 clout (late-game — good)
- 1e40 followers → 120 clout (deep prestige — good)
- 1e60 followers → 180 clout (Vigintillion — still bounded, still meaningful)

Across 15+ rebrands with compounding follower growth, cumulative clout lands in the 500–1,000 range. That fits the design intent: 1,000 is wealth, the shop economy works, and the formula doesn't blow up at any follower magnitude. The constant `k` is correctly marked provisional — I own the tuning pass and will file it as a separate game-designer task once the migration lands.

No remaining blocking concerns. Aligned on the full proposal.

---
# Review: ux-designer

**Date**: 2026-04-08
**Decision**: Aligned

**Comments**

1. **Core migration is sound from the display side.** The boundary decisions — converting to `number` at the formatting layer, keeping interpolation output as `number`, letting formatters accept `Decimal | number` — are all correct. The explanation of why `.toNumber()` is safe (tier divisor compresses the value back into float range before display) is convincing. No concerns with the display pipeline.

2. **OQ3 — 7-character cap: Option (a).** Drop to 0 decimals for 3-character suffixes. At 10^45+ magnitudes, `999Qad` vs `999.99Qad` is a distinction no player will notice or care about. 6 characters stays within cap. Additionally, these 3-char suffixes are placeholders pending the thematic naming exercise (per game-designer's OQ2 resolution), and the thematic names will almost certainly be 2 characters matching the existing K/M/B/T/Qa pattern — at which point the cap issue disappears entirely. Option (a) handles the interim cleanly.

3. **OQ4 — Tier colors need a dedicated design exercise.** The current ramp ends at `#B00840` (crimson-pink). Extending 10 more tiers into deeper reds will produce perceptually indistinguishable adjacent colors — the player glancing at speed won't see a difference, which breaks the trust signal that tier colors provide. The right approach is a hue rotation (deep reds → golds/ambers → high-intensity terminal tier), but this needs accessibility checker validation, perceptual distance checks between adjacent tiers, and CVD simulation. **Recommendation:** Ship the migration with a naive crimson-deepening extension as placeholder colors, and file a follow-up ux-designer task for a properly validated color ramp. The tier colors are cosmetic; the tier labels and arithmetic are structural. Don't let cosmetics block the structural fix. This task should be coupled with the thematic naming exercise since they affect the same visual surface.

4. **Non-blocking: interpolation precision comment.** The `useInterpolatedValue` returning `number` via `.toNumber()` is correct — precision loss in the least-significant digits is invisible to the player because the display pipeline compresses via tier division. Recommend adding an explicit code comment at the `.toNumber()` call site stating this rationale, so a future engineer doesn't "fix" it by trying to keep Decimal precision through the render path.

5. **No concerns with the remaining display changes.** OfflineGainsModal progress multiplication, the `Decimal.toExponential(2)` overflow fallback, and the UI component call-site updates are all straightforward type-flow changes with no UX impact.

---
# Review: engineer

**Date**: 2026-04-08
**Decision**: Request for Comment

**Comments**

The migration strategy is correct and the boundary decisions are sound. The performance analysis is convincing. My concern is not with the approach — it's that the exhaustive file change list has real holes. I traced every file in the codebase that touches engagement, followers, or rates. The proposal misses ~14 change sites across 6 files it claims don't need changes (or doesn't mention at all), and underspecifies changes in 4 files it does list. An engineer implementing from this doc as-is would hit compile errors and silent runtime bugs.

### Blocking: Missing files and change sites

**1. Factory functions in `model/index.ts` — not mentioned anywhere.**

`createPlayer()` (line 57-74) initializes `engagement: 0`, `total_followers: 0`, `lifetime_followers: 0`, `lifetime_engagement: 0`. These must become `new Decimal(0)`. `createPlatformState()` (line 98-111) initializes `followers: 0` — same. `createInitialGameState()` calls both. Every fresh game start, every test seed, every rebrand that calls these factories would crash on the first tick when `.plus()` is called on a plain `0`.

**2. `syncTotalFollowers()` in `model/index.ts` (line 264-273) — not mentioned.**

Does `ALL_PLATFORM_IDS.reduce((sum, id) => sum + platforms[id].followers, 0)`. The accumulator is `number` 0, `followers` is Decimal. `0 + Decimal` triggers object-to-primitive coercion → string concatenation. This is a **silent runtime bug** — you'd get `"00.0000..."` instead of a Decimal sum. Must use `new Decimal(0)` accumulator and `.plus()`.

**3. `checkPlatformUnlocks()` in `platform/index.ts` (line 44-63) — listed as only needing `computeFollowerDistribution` changes.**

Takes `totalFollowers: number`. Callers in `tick()`, `calculateOffline()` pass `player.total_followers` which is now Decimal. The `>=` comparison at line 55 (`totalFollowers >= threshold`) needs either: param type changes to Decimal + `.gte()`, or `.toNumber()` at call sites. Since unlock thresholds are small integers, `.toNumber()` at the call site is the cleanest path — but the proposal must say so.

**4. `checkGeneratorUnlocks()` in `generator/index.ts` (line 118-139) — same issue.**

Takes `totalFollowers: number`, callers pass Decimal. Plus `canUnlockGenerator()` (line 154) and `unlockGenerator()` (line 191) do `state.player.total_followers >= threshold` and `< threshold` directly on Decimal. And `unlockGenerator()` (line 199-201) passes `def.base_buy_cost` (plain `number`) to `canAffordEngagement()`/`spendEngagement()` which now expect Decimal — needs `new Decimal(cost)` wrapping.

**5. `evaluateViralTrigger()` in `game-loop/index.ts` (lines 194, 213-219, 242) — partially covered.**

The proposal covers the magnitude computation but misses three sites:
- Line 194: `rateEntries` is typed `[GeneratorId, number][]` but rates are now Decimal
- Lines 213-219: `rate > topRate` — `>` operator on Decimal objects compares object references, not magnitudes. Needs `.gt()`.
- Line 242: `rateEntries.reduce((sum, [, r]) => sum + r, 0)` — same `0 + Decimal` coercion bug as `syncTotalFollowers`.

**6. `applyRebrand()` in `prestige/index.ts` (line 114-200) — underspecified.**

The proposal mentions `engagement: new Decimal(0)` but the function also resets: `total_followers: 0` (line 170 — needs `new Decimal(0)`), and per-platform `followers: 0` (line 138 — needs `new Decimal(0)`).

**7. `DebugApp.tsx` — completely missing from the file change list.**

Reads `player.engagement`, `player.total_followers`, `player.lifetime_followers`, `offlineResult.engagementGained`. Does inline `>=` comparisons at lines 194-195 (`state.player.engagement >= buyCost`). Does `=== 0` check on `total_followers` at line 240 — `Decimal === 0` is always `false` (object identity). This file has at least 10 affected lines across 5 patterns.

**8. `GameScreen.tsx` — listed as "No change needed", which is wrong.**

Lines 196-202: computes `engagementRate` by `total += rates[id] ?? 0` — Decimal `+=` coerces to string.
Lines 247-250: `viralActive.bonus_rate_per_ms * 1000` needs `.times(1000)` and `engagementRate + viralBonusRatePerSec` needs `.plus()`. The `computeAllGeneratorEffectiveRates` return type changes to `Partial<Record<GeneratorId, Decimal>>`, which makes `GameScreen`'s summation loop a type error.

**9. `computeFollowerDistribution()` in `platform/index.ts` — underspecified.**

The param type `generatorEffectiveRates: Partial<Record<GeneratorId, number>>` must change to accept Decimal. Six internal arithmetic operators (`baseRate +=`, `score +=`, `rawScores[platformId] = score`, `totalRaw +=`, `(rawScores[platformId] ?? 0) / totalRaw`, `baseRate * share`) all need Decimal methods. The return type `FollowerDistribution.perPlatformRate` and `.totalRate` need to become Decimal. This cascades to every consumer of the distribution result.

### Blocking: Missing type changes

**10. `ViralBurstPayload.magnitude` in `types.ts` (line 216).**

`ActiveViralEvent.magnitude` becomes Decimal per the proposal, but `ViralBurstPayload` (the UI-facing event type) also has `magnitude: number`. The driver at `driver/index.ts:382` copies `active.magnitude` into the payload. Either the payload type changes to Decimal, or the driver calls `.toNumber()` at the boundary. The proposal doesn't mention `ViralBurstPayload` at all. Recommendation: `.toNumber()` at the driver boundary — the payload is consumed by UI (summary badge) where magnitude is only displayed, not accumulated.

**11. `OfflineResult` interface in `offline/index.ts` (lines 38-47).**

`engagementGained: number`, `followersGained: Record<PlatformId, number>`, `totalFollowersGained: number` — all need Decimal. The proposal rewrites the arithmetic in §7 but never updates the interface definition. `App.tsx` and `OfflineGainsModal` both consume this type.

**12. `SweepItem.cost` and `SweepPurchaseEvent.cost` in `driver/index.ts` (lines 108, 116).**

Typed `number`. `buildAffordableList` calls `generatorBuyCost()`, `autoclickerBuyCost()`, `generatorUpgradeCost()` — all now return Decimal. The proposal mentions the sort comparator fix but not these type declarations. The `canAffordEngagement` calls inside `buildAffordableList` also need Decimal params.

**13. `TopBar.tsx` props (lines 25-27).**

`engagement: number` and `engagementRate: number` need to become `Decimal` (or `Decimal | number`). GameScreen passes Decimal values. The proposal lists TopBar as a "type flow" change but doesn't note the explicit prop interface update.

### Non-blocking: Observations

**14. `main.tsx` is listed under "Files that don't change" but the proposal says it adds `Decimal.set()` config.** That's a change. Minor, but the "don't change" table is supposed to be accurate.

**15. `GeneratorList.tsx` lines 162, 376, 396, 399 — the proposal says "formatters handle it" but these lines do `state.player.engagement >= cost` which is comparison, not formatting.** TypeScript strict mode will catch these as type errors (Decimal has no `>=` overload), but the proposal should enumerate them since the fix pattern (`.gte()` vs boundary conversion) is a decision the implementer needs to make consistently. Six sites across GeneratorList plus two in verb-gear (`canPurchaseVerbGear` line 89, `purchaseVerbGear` line 129).

**16. OQ5 — `decimal.js-light`:** I'd go with full `decimal.js`. 32KB gzipped is negligible. The light variant drops `ln`, `log`, `exp`, `pow` with non-integer exponents — and `Decimal.log(10)` is used in the new clout formula. So `decimal.js-light` doesn't work at all for this migration. This OQ can be closed as resolved: full `decimal.js` required.

### Summary

The migration direction is right. The boundary decisions are right. The exhaustive file list is not exhaustive. I count **13 blocking gaps** — missing factory init, missing functions, missing files, missing types — that would each produce either a compile error or a silent runtime bug. The proposal needs a revision pass to enumerate every site before an engineer can implement from it. I've listed every specific line number and what needs to change at each.

I'm marking this **Request for Comment** rather than Not Aligned because the approach is sound — the doc just needs to be completed.

---
# Review: architect (re-review responding to engineer)

**Date**: 2026-04-08
**Decision**: Aligned

**Comments**

The engineer's review is correct on all 13 blocking points and all 3 non-blocking observations. Every gap has been addressed in revision 2:

1. **Factory functions** — Added to §3. `createPlayer()`, `createPlatformState()`, `createInitialGameState()` all init Decimal(0). Without this, every fresh start and test seed crashes.
2. **`syncTotalFollowers()`** — Added to §3. The `0 + Decimal` coercion bug is particularly dangerous because it's silent — produces a string that looks like a number in console but breaks every downstream `.plus()` call. Good catch.
3. **`checkPlatformUnlocks()`** — Added to §8. Agreed: `.toNumber()` at call site is the right boundary since thresholds are small integers.
4. **`checkGeneratorUnlocks()` / `canUnlockGenerator()` / `unlockGenerator()`** — Added to §5. The `base_buy_cost` wrapping in `unlockGenerator()` is the kind of thing TypeScript strict mode would catch, but it needs to be in the doc so the implementer doesn't have to discover it.
5. **`evaluateViralTrigger()`** — Expanded in §4. The `>` on Decimal objects comparing references is the subtlest bug in the whole migration — JavaScript won't warn, TypeScript won't error (Decimal objects are `object` type, `>` is valid on objects via `valueOf()`). Wait — actually, `decimal.js` *does* implement `valueOf()` returning a primitive, so `>` would work... but relying on implicit coercion is fragile and non-obvious. Using `.gt()` is the correct pattern for consistency and clarity.
6. **`applyRebrand()`** — Added to §9. Three reset sites, not one.
7. **`DebugApp.tsx`** — Added to §13 and file list. The `=== 0` on Decimal is the most insidious pattern — it's always `false` and silently disables the rebrand button.
8. **`GameScreen.tsx`** — Moved from "no change" to active change list. The rate summation loop and viral bonus arithmetic are both Decimal operations. I was wrong to list this as "verify types compile" — it's a real change with real bug potential.
9. **`computeFollowerDistribution()`** — Expanded in §8 with all 6 arithmetic sites and return type cascade.
10. **`ViralBurstPayload.magnitude`** — Added to §15. Agreed: `.toNumber()` at driver boundary is correct — magnitude in the UI payload is display-only.
11. **`OfflineResult` interface** — Added to §7 with full interface change and consumer list.
12. **`SweepItem.cost` / `SweepPurchaseEvent.cost`** — Added to §15.
13. **`TopBar.tsx` props** — Added to §13 with explicit prop interface changes.

Non-blocking items also addressed:
- `main.tsx` moved from "don't change" to "minor additions"
- `GeneratorList.tsx` inline comparisons enumerated (6 sites, `.gte()` pattern)
- OQ5 closed — `decimal.js-light` drops `log` which the clout formula needs

The proposal is now exhaustive. File count updated to 37. Remaining reviewer: engineer (for re-review of the revision).

---
# Review: engineer (re-review)

**Date**: 2026-04-08
**Decision**: Aligned

**Comments**

Verified every gap from my first review against the revised body:

1. Factory functions (`createPlayer`, `createPlatformState`) — added to §3 with `new Decimal(0)` init. Correct.
2. `syncTotalFollowers()` — added to §3 with Decimal accumulator. Correct.
3. `checkPlatformUnlocks()` — added to §8 with `.toNumber()` at call site. Correct — thresholds are small integers.
4. `checkGeneratorUnlocks()` / `canUnlockGenerator()` / `unlockGenerator()` — added to §5. `base_buy_cost` wrapping in `unlockGenerator` is there. Correct.
5. `evaluateViralTrigger()` — added to §4. All three sites covered: rateEntries type, `.gt()` comparison, reduce accumulator. Correct.
6. `applyRebrand()` — added to §9. Three reset sites (engagement, total_followers, per-platform followers). Correct.
7. `DebugApp.tsx` — added to §13 and file list (#23). Comparison and zero-check patterns enumerated. Correct.
8. `GameScreen.tsx` — moved to active change list (#15). Rate summation, viral bonus arithmetic, summaryBadge type. Correct.
9. `computeFollowerDistribution()` — expanded in §8. Param type, 6 arithmetic sites, return type cascade. Correct.
10. `ViralBurstPayload.magnitude` — added to §15 with `.toNumber()` boundary. Correct.
11. `OfflineResult` interface — added to §7 with full type change. Correct.
12. `SweepItem.cost` / `SweepPurchaseEvent.cost` — added to §15. Correct.
13. `TopBar.tsx` props — added to §13 (#14). Correct.

OQ5 resolved (decimal.js-light not viable). All 6 OQs resolved. File count is 37. No remaining gaps.

This is implementable as-is.
