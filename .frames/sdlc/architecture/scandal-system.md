# Scandal System Architecture

> **Scope:** Defines the data model, pipeline, state machine, and contracts for the Scandal & Follower Loss event system — risk accumulators, scandal events, the PR Response modal, and session snapshots.

> **Not in scope:** Core game loop, generator/platform/economy architecture (see `architecture/core-systems.md`), specific tuning values, visual/UX treatment.

> **Dependency:** This system is additive. It bolts onto the core architecture without structural changes. The core game is fully playable without it.

---

## Data Model

### RiskAccumulator

Tracks how close a specific scandal trigger is to firing. Each scandal type owns one or more accumulators scoped to its trigger context.

| Field | Type | Constraints | Where | Notes |
|-------|------|-------------|-------|-------|
| `scandal_type` | `string (enum)` | one of defined scandal types | both | e.g. `content_burnout`, `platform_neglect`, `hot_take_backlash` |
| `scope_type` | `string (enum)` | `generator` \| `platform` \| `global` | both | What this accumulator is scoped to |
| `scope_id` | `string` | nullable (null when global) | both | The generator_id or platform_id this tracks, if scoped |
| `value` | `float` | [0, 1] | both | Current accumulation. Resets to 0 after firing |
| `base_threshold` | `float` | (0, 1], from static data | client | Base trigger threshold before empire scaling |
| `frozen` | `bool` | | both | True when player is offline. Accumulators do not advance while frozen |

**Scoping by scandal type:**

| Scandal Type | Scope | Instances |
|---|---|---|
| Content Burnout | per-generator | One per owned generator |
| Platform Neglect | per-platform | One per unlocked platform |
| Hot Take Backlash | per-generator (Hot Takes only) | One |
| Trend Chasing | global | One |
| Growth Scrutiny | per-platform | One per unlocked platform |
| Fact Check | per-generator (Podcasts, Tutorials) | One per applicable generator |

**Effective threshold formula:**
```
effective_threshold = base_threshold × empire_scale(total_followers)
```

Where `empire_scale` is a monotonically decreasing function: higher fame → lower threshold → scandals fire sooner. The specific curve is a tuning value in static data (e.g., `1 / (1 + total_followers / scale_constant)`).

**Firing condition:**
```
fires when: value > effective_threshold + fuzz(seed, accumulator_index)
```

`fuzz` uses the same seeded PRNG as the Algorithm system. The accumulator's position in the list provides a unique sub-seed so different accumulators don't fire in lockstep.

After firing: `value` resets to 0.

### ScandalEvent

A fired scandal. Created when an accumulator crosses its threshold.

| Field | Type | Constraints | Where | Notes |
|-------|------|-------------|-------|-------|
| `id` | `string (uuid)` | unique | both | |
| `scandal_type` | `string (enum)` | | both | Which scandal type fired |
| `target_platform` | `string (platform_id)` | | both | Primary platform affected |
| `raw_magnitude` | `float` | [0.05, 0.15] | both | Fraction of platform followers to remove (before PR Response mitigation) |
| `final_magnitude` | `float` | nullable | both | Set after PR Response resolves. Null while scandal is active |
| `engagement_spent` | `float` | ≥ 0 | both | How much Engagement the player spent on PR Response |
| `followers_lost` | `int` | ≥ 0 | both | Actual followers removed after all rules applied |
| `timestamp` | `timestamp` | | both | When the scandal fired |
| `resolved` | `bool` | | both | True after PR Response window closes |

**Magnitude calculation:**
```
raw_magnitude = base_magnitude(scandal_type) × severity_scale(accumulator_value_at_fire)
```

Clamped to [0.05, 0.15] — no scandal removes less than 5% or more than 15% of the affected platform's followers.

**Magnitude floor enforcement:**
```
max_loss = platform.followers - session_snapshot.platform_followers[platform_id]
actual_loss = min(raw_followers_lost, max_loss)
```

No scandal can push a platform below its session snapshot value (followers at last app foreground).

### SessionSnapshot

Captured when the player opens or foregrounds the game. Used to enforce the magnitude floor.

| Field | Type | Constraints | Where | Notes |
|-------|------|-------------|-------|-------|
| `timestamp` | `timestamp` | | both | When the snapshot was taken |
| `platform_followers` | `map<platform_id, int>` | | both | Follower count per platform at snapshot time |

**Lifecycle:** Created on app foreground. Overwritten on next foreground. Not persisted across sessions — it exists only in memory. If the app crashes without a clean close, the next open creates a fresh snapshot (which is the correct behavior: the player's "session" restarts).

---

## Scandal Pipeline

The pipeline from risk accumulation to resolution follows this sequence:

```
1. Player Action
   ↓
2. Accumulator Update (event-driven)
   ↓
3. Threshold Check (after each update)
   ↓  (if fires)
4. Scandal Type Selection (the accumulator that fired determines the type)
   ↓
5. Target Platform Selection (based on scandal type and scope)
   ↓
6. Magnitude Calculation (base × severity, clamped to [0.05, 0.15])
   ↓
7. Stacking Suppression Check (if another scandal is already active, suppress — queue secondary notification)
   ↓
8. PR Response State (modal, 10-15s window)
   ↓
9. Final Magnitude (raw magnitude × mitigation from Engagement spend)
   ↓
10. Magnitude Floor Enforcement (cannot push below session snapshot)
   ↓
11. Follower Removal (apply to platform)
   ↓
12. Resolution (update total_followers, log event, dismiss modal)
```

### Accumulator Update Triggers

Accumulators are **event-driven, not tick-driven.** They update in response to specific player actions:

| Scandal Type | Update Trigger | Increment Logic |
|---|---|---|
| Content Burnout | Post created / generator purchased | Increment proportional to that generator's share of total output. Decays toward 0 when output is balanced |
| Platform Neglect | Tick (time-based exception) | Increments by elapsed time since last post on platform. Resets to 0 on any post to that platform. **Freezes offline** |
| Hot Take Backlash | Post created (Hot Takes generator) | Increment scaled by algorithm modifier — higher increment when Algorithm penalizes Hot Takes |
| Trend Chasing | Content mix change | Increment when the player's generator purchase/level distribution shifts significantly within a short window |
| Growth Scrutiny | Follower gained (per-platform) | Increment proportional to follower growth rate on that platform relative to others |
| Fact Check | Post created (Podcasts, Tutorials) | Increment scaled by empire size — larger empires accumulate faster |

**Algorithm interaction:** Algorithm state modifies accumulator **increment rate**, not threshold. Example: an Algorithm state that penalizes Hot Takes multiplies the Hot Take Backlash increment by 1.5×. This keeps the two systems (Algorithm modifiers and accumulator thresholds) cleanly separated.

### Target Platform Selection

- **Per-platform accumulators** (Platform Neglect, Growth Scrutiny): the platform is the one the accumulator is scoped to.
- **Per-generator accumulators** (Content Burnout, Hot Take Backlash, Fact Check): the target platform is the one with the highest `content_affinity` for the triggering generator.
- **Global accumulators** (Trend Chasing): the target platform is the one with the most followers (highest-profile target).

### Stacking Suppression

Only one scandal can be active at a time. If a second accumulator fires while a PR Response window is open:
- The second scandal is suppressed (does not fire)
- The accumulator resets to 0 (the trigger is consumed, not deferred)
- After the active scandal resolves, a secondary notification is shown: brief text indicating the second trigger was noticed ("...and your audience noticed the Trend Chasing too")
- The suppressed scandal does NOT deal damage — it's informational only

This prevents modal stacking and teaches the player that risk compounds.

---

## PR Response State Machine

The scandal system introduces a modal game state. The core game loop's implicit state machine expands:

```
normal → scandal_active → resolving → normal
```

### States

**normal** — Default. Game loop ticks normally. Accumulators update. No scandal UI visible.

**scandal_active** — A scandal has fired. The PR Response modal is displayed. Game state:
- Game loop continues ticking (generators still produce, algorithm still advances)
- Accumulators are **paused** (no new scandals can fire during PR Response)
- The player sees the scandal card with flavor text, damage projection, Engagement spend slider, and timer
- Timer: 1-2 second read beat (flavor text visible, slider inactive), then 10-15 second decision window

**resolving** — Timer expired or player confirmed. Calculating final damage:
- Final magnitude = `raw_magnitude × (1 - mitigation_rate(engagement_spent))`
- Mitigation is capped: maximum spend reduces loss to ~30-40% of raw magnitude
- Apply magnitude floor (session snapshot enforcement)
- Remove followers from target platform
- Update `total_followers`
- Log the ScandalEvent with final values
- Transition to `normal`

### State Transitions

```typescript
interface ScandalStateMachine {
  state: 'normal' | 'scandal_active' | 'resolving';
  activeScandal: ScandalEvent | null;
  suppressedNotification: string | null;  // flavor text for suppressed scandal
  timerStartTime: number | null;
  timerDuration: number;                   // ms, includes read beat + decision window
  readBeatDuration: number;                // ms, before slider activates
}

function onAccumulatorFire(sm: ScandalStateMachine, event: ScandalEvent): ScandalStateMachine;
function onTimerExpire(sm: ScandalStateMachine): ScandalStateMachine;
function onPlayerConfirm(sm: ScandalStateMachine, engagementSpent: number): ScandalStateMachine;
```

**Integration with game loop tick:** The tick function checks `scandal_state_machine.state` and:
- If `normal`: update accumulators, check thresholds
- If `scandal_active`: skip accumulator updates, decrement timer
- If `resolving`: apply damage, transition to `normal`, show suppressed notification if any

---

## Interface Contracts

### Scandal System → Core Game Loop

The scandal system hooks into the game loop at two points:

**1. Post-tick accumulator update:**
```typescript
function updateAccumulators(
  accumulators: RiskAccumulator[],
  action: PlayerAction,
  state: GameState,
  staticData: StaticData
): { accumulators: RiskAccumulator[]; firedScandal: ScandalEvent | null };
```

Called after each tick when an action has occurred. Returns updated accumulators and optionally a fired scandal. The game loop then transitions the state machine if a scandal fired.

**2. Scandal resolution:**
```typescript
function resolveScandal(
  scandal: ScandalEvent,
  engagementSpent: number,
  sessionSnapshot: SessionSnapshot,
  state: GameState
): { followersLost: Record<PlatformId, number>; finalMagnitude: number };
```

Called when the PR Response window closes. Returns the follower changes to apply.

### Scandal System → Static Data

```typescript
interface ScandalStaticData {
  scandalTypes: Record<ScandalTypeId, ScandalTypeDef>;
  empirScaleCurve: {
    scaleConstant: number;           // denominator in empire_scale function
  };
  prResponse: {
    readBeatMs: number;              // 1000-2000
    decisionWindowMs: number;        // 10000-15000
    maxMitigationRate: number;       // 0.60-0.70 (reduces loss to 30-40% of raw)
    engagementCostCurve: string;     // reference to cost function
  };
}

interface ScandalTypeDef {
  id: ScandalTypeId;
  scopeType: 'generator' | 'platform' | 'global';
  applicableScopes: string[];        // which generator_ids or platform_ids, or ['*'] for global
  baseThreshold: number;
  baseMagnitude: number;             // base fraction of followers to remove
  incrementFormula: string;          // reference to increment logic
  algorithmModifierKey: string;      // which algorithm modifier affects this type's increment
}
```

### Scandal System → UI

The scandal system exposes signals for the UI layer:

```typescript
interface ScandalUIState {
  // Risk indicators (always available)
  riskLevels: Record<string, RiskLevel>;  // keyed by "generator:{id}" or "platform:{id}" or "global"

  // PR Response modal (only when scandal_active)
  activeScandal: {
    type: ScandalTypeId;
    targetPlatform: PlatformId;
    flavorText: string;
    projectedLoss: number;                // followers, at current slider position
    maxLoss: number;                      // followers, if no engagement spent
    minLoss: number;                      // followers, at max engagement spend
    engagementBalance: number;            // player's current engagement
    timerRemaining: number;               // ms
    sliderActive: boolean;                // false during read beat
  } | null;

  // Post-resolution notification
  lastResolution: {
    type: ScandalTypeId;
    platformAffected: PlatformId;
    followersLost: number;
    suppressedNotice: string | null;
  } | null;
}

type RiskLevel = 'none' | 'building' | 'high';
```

**`risk_level` derivation:**
```
ratio = value / effective_threshold
none:     ratio < 0.4
building: ratio >= 0.4 and ratio < 0.75
high:     ratio >= 0.75
```

Thresholds for the enum tiers are tuning values in static data. The values above are starting points.

---

## Offline Behavior

All accumulators **freeze** when the player closes the game:
- `frozen = true` on all accumulators at close
- `frozen = false` on all accumulators at open
- While frozen, no accumulator updates, no threshold checks, no scandals fire
- Accumulators resume from their frozen values — no catch-up, no decay

This is a direct consequence of the "no negative events offline" rule from the core design.

**Platform Neglect exception:** This accumulator is time-based and would theoretically accumulate while offline. Per the freeze rule, it does not. The player cannot return to a scandal caused by not posting while they were away. The accumulator resumes counting from the moment the player returns.

**Session snapshot:** Created fresh on each foreground. The offline calculator runs first (applying positive gains), then the snapshot is taken. This means the snapshot includes offline gains — the magnitude floor protects the player's "starting point" including what they earned while away.

---

## Assumptions

1. **Additive system.** The scandal system can be added to or removed from the game without structural changes to the core architecture. The game loop checks for scandal system presence and skips accumulator logic if absent. **Load-bearing: if scandals become deeply wired into core progression (e.g., scandals as a required prestige trigger), this assumption breaks.**

2. **Single active scandal.** Only one scandal can be in PR Response at a time. Stacking is suppressed. **If this changes to allow simultaneous scandals, the state machine and UI contract both need rework.**

3. **Accumulators are client-side only.** Like all game state, accumulators live on the client. No server validation of scandal events. **Same trust model as core game state — changes if competitive features are added.**

4. **Mitigation cap is a design constant, not a dynamic value.** The maximum PR Response mitigation (reducing loss to ~30-40%) is a static tuning value, not something that changes based on game state. Clout upgrades that modify this would change this assumption — the Prestige Economy proposal should address this explicitly.
