# Architecture: Auto-Buy Sweep System

## Scope

The auto-buy sweep orchestrates sequential purchase execution within the **driver layer**. It exposes sweep lifecycle to the UI via additions to the `GameDriver` interface. It is responsible for: building the affordable-purchase list, sorting it cheapest-first, firing purchases at 80ms intervals, re-evaluating the list after each purchase, and signalling sweep completion.

It is **not** responsible for: rendering the button or its visual states, playing audio, handling keyboard input. Those are UI concerns.

---

## Data Model

Sweep state is **driver-internal**. It is ephemeral — not written to `GameState`, not persisted to localStorage. On page reload, no sweep is in progress.

```typescript
// Internal to createDriver — not exported
interface SweepInternalState {
  active: boolean;
  timeoutHandle: number | null;
}

// Exported read model (returned by getSweepState)
interface SweepState {
  active: boolean;
  /** Number of affordable purchases right now, across all tracks and generators.
   *  Updated after each purchase fires. Used by the UI for the preview count. */
  previewCount: number;
}
```

`SweepState` is a computed read — derived on each call to `getSweepState()` from the current `GameState`. It is not stored.

---

## Purchase Item Model

The sweep works over a flat list of purchase candidates:

```typescript
type SweepItemType = 'buy' | 'upgrade' | 'autoclicker';

interface SweepItem {
  type: SweepItemType;
  generatorId: GeneratorId;
  cost: number;
}
```

**What's included:**
- Manual-clickable generators (chirps, selfies, livestreams, podcasts, viral_stunts): BUY, LVL UP (upgrade), HIRE (autoclicker) — all three tracks if affordable.
- Passive-only generators (memes, hot_takes, tutorials, etc.): LVL UP (upgrade) only — they have no SPEED or HIRE tracks.

**Affordability check:** uses `canAffordEngagement(state, cost)` from the model layer. Only items where `engagement >= cost` are included.

**Sort:** ascending by `cost`. Cheapest-first maximises coverage — the player's intent is to upgrade everything they can, not to spend on the single largest purchase.

---

## Interface Additions to `GameDriver`

```typescript
export interface GameDriver {
  // ... existing methods ...

  /**
   * Build the affordable purchase list and begin the 80ms sweep loop.
   * No-op if a sweep is already active.
   */
  startSweep(): void;

  /**
   * Cancel a sweep in progress. Already-fired purchases are not refunded.
   * No-op if no sweep is active.
   */
  cancelSweep(): void;

  /**
   * Synchronous read of current sweep status.
   * previewCount reflects the list as of the last re-evaluation.
   */
  getSweepState(): SweepState;

  /**
   * Subscribe to sweep-end events. Fires once when the sweep completes
   * naturally (list exhausted) or is cancelled. Returns an unsubscribe fn.
   * Used by the UI to trigger the sweep-end sound.
   */
  onSweepEnd(listener: () => void): Unsubscribe;
}
```

`SweepState` is exported from `driver/index.ts`.

---

## Algorithm

```
startSweep():
  if active → return (no-op)
  set active = true
  queue = buildAffordableList(currentState)   // cheapest-first
  if queue is empty → end sweep immediately (fire onSweepEnd, active = false)
  fire first purchase immediately
  schedule next via setTimeout(80)

firePurchase(item):
  call driver action for item.type (buy / upgrade / buyAutoclicker)
  state is updated and subscribers notified synchronously
  re-evaluate: queue = buildAffordableList(currentState)
  if queue is empty → end sweep (fire onSweepEnd, active = false, clear timeout)
  else → schedule next via setTimeout(80)

cancelSweep():
  if not active → return (no-op)
  clear pending setTimeout
  active = false
  fire onSweepEnd
```

**Re-evaluation after each purchase** handles: affordability changes as engagement is spent, newly affordable items unlocked by a prior purchase, cost escalation after each BUY.

**Internal purchase calls:** the sweep calls the existing model-layer functions directly (`buyGenerator`, `upgradeGenerator`, `buyAutoclicker`) — the same functions the driver's `buy()`, `upgrade()`, and `buyAutoclicker()` public methods call. This means:
- State subscribers are notified after each purchase (visual feedback — badge increments, rate updates, floating numbers from UI — works automatically).
- `playPurchase` in `useGame.ts` does **not** fire during sweep (it's called in action wrapper closures, not from state subscribers). This is the desired behaviour — per the proposal, only sweep-start and sweep-end sounds play, not a sound per purchase.

---

## Sound Architecture

Sound is a UI-layer concern. The driver does not call sfx functions.

| Sound | When | Who calls it |
|-------|------|--------------|
| `playSweepStart()` | User triggers the sweep (taps BUY ALL or presses B) | UI: immediately after calling `driver.startSweep()` |
| `playSweepEnd()` | Sweep completes or is cancelled | UI: in `onSweepEnd` listener |

Both functions are added to `sfx.ts`. Two new audio assets are required (ascending chime for start, resolving tone for end).

---

## Keyboard Shortcut

Handled at the `GameScreen` level. A `keydown` listener fires on key `B`:
- If no modal is open: call `driver.startSweep()` if not active, `driver.cancelSweep()` if active.
- "No modal open" guard: the same pattern used by other keyboard shortcuts in the codebase (check for open modal state in the hook or component).

---

## Coupling Analysis

| Dependency | Direction | Risk |
|------------|-----------|------|
| Sweep → model functions (buyGenerator, etc.) | Driver internal | Low — same module |
| UI → driver.startSweep / cancelSweep / getSweepState / onSweepEnd | UI→Driver | Low — extends existing interface |
| UI → playSweepStart / playSweepEnd | UI→sfx | Low — same pattern as existing sfx calls |
| Keyboard handler → driver | GameScreen→Driver | Low — same pattern as other shortcuts |

No new cross-module coupling is introduced. The sweep extends an existing boundary (driver ↔ UI) with new methods.

---

## Assumptions

- **Sweep state is not persisted.** A reload starts with no sweep in progress. There is no mid-sweep save state to worry about.
- **The 80ms timer is wall-clock, not tick-aligned.** The sweep is independent of the game tick loop (100ms). Occasional near-coincidence with a tick is benign.
- **Cancellation is immediate.** Pressing STOP or pressing B during a sweep cancels the remaining queue instantly. No animation or grace period.
- **Preview count reflects real-time state.** `getSweepState().previewCount` is always recomputed from current `GameState`, so it stays accurate as engagement flows in from the tick loop between purchases.

---

## Open Questions

None — all design questions resolved in the accepted proposal.
