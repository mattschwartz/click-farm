---
name: Engagement Counter Interpolation
description: The engagement counter should update at 60fps via predictive interpolation rather than jumping on 100ms game loop ticks.
author: ux-designer
status: accepted
reviewers: []
---

# Proposal: Engagement Counter Interpolation

## Problem

The game driver ticks at 100ms intervals (10hz). The engagement counter in the top bar re-renders directly from game state on each tick. At mid-game production rates (~283M/sec), each tick adds ~28M — the counter jumps visibly 10 times per second and sits completely still between jumps. The screen reads as a static ledger updating in bursts rather than a live economy in motion. This is the primary contributor to the game feeling lifeless during normal play.

The counter is the player's primary trust signal and the single most-watched element on screen. If it doesn't feel alive, nothing else does.

## Proposal

The engagement counter display value is computed via **RAF-based predictive interpolation** in the UI layer. The game loop tick rate is unchanged.

### How it works

The `TopBar` component (or a hook it calls) runs a `requestAnimationFrame` loop independent of the game loop. On each animation frame it computes:

```
displayed_value = last_game_engagement + (engagement_rate_per_ms × elapsed_ms_since_last_tick)
```

Where:
- `last_game_engagement` — the engagement value from the most recent game tick
- `engagement_rate_per_ms` — derived from the `engagementRate` prop already passed to `TopBar`
- `elapsed_ms_since_last_tick` — wall-clock time since the last game state update

When the next real game tick arrives, the displayed value snaps to the true game value. Because the prediction is based on the current rate, the snap delta is within rounding error and imperceptible at 100ms intervals.

### What changes

- A `useInterpolatedValue(value: number, ratePerSec: number)` hook is added to the UI layer. It runs a RAF loop and returns the interpolated display value.
- `TopBar` uses this hook for the engagement counter only. All other values (followers, generator rates, platform counts) continue to update at game tick rate — they move slowly enough that jumping is not perceptible.
- No changes to the driver, game loop, or any game logic.

### Behavior at edge cases

- **Algorithm shift or large purchase mid-tick:** The rate changes at the next game tick. The display may briefly predict slightly wrong and snap at tick time. At 100ms intervals this is a sub-100ms visual error — imperceptible in practice.
- **Format boundary crossing (e.g. 999.99B → 1.00T):** The compact format threshold causes a visible label change at the boundary. This is expected and consistent with how the format works today — interpolation does not change this behavior.
- **Tab backgrounded:** RAF pauses automatically when the tab is not visible. On return, the displayed value snaps to the current game value on the next tick. No stale prediction accumulates.
- **Reduce Motion:** The interpolation loop is display-smoothing, not decorative animation. It SHOULD remain active under Reduce Motion — disabling it would reintroduce the jump behavior. The spec's Reduce Motion scope covers particle bursts and zoom pulses, not counter fidelity.

### What this is not

This is not a change to game logic, tick rate, or state management. The game loop continues to run at 100ms. This is purely how the UI renders a number that is already being computed correctly.

## References

1. `client/src/ui/TopBar.tsx` — where the engagement counter is rendered; receives `engagement` and `engagementRate` props
2. `client/src/driver/index.ts` — `TICK_INTERVAL_MS = 100`, game loop tick rate
3. `client/src/ui/useGame.ts` — `useSyncExternalStore` binding; feeds game state to the UI at tick rate
4. `ux/core-game-screen.md` §5.1 — "Live ticking: The number counts in real-time at the underlying production rate. Tick cadence matches earned increments — no batching."
5. `ux/core-game-screen.md` §5.1 — "Trust signal: The number must never jump backwards without a communicated reason."

## Open Questions

1. Is a `useInterpolatedValue` hook the right home for this, or should the RAF loop live directly in `TopBar`? A standalone hook is more testable and reusable (viral counter may want this too). **Owner: engineer**
   - [RESOLVED] Standalone hook. `useInterpolatedValue.ts` already exists and is consumed by `TopBar`. The pure `interpolateValue` function is extracted separately for unit testing without React or RAF.
2. Should the hook accept a `clamp` parameter to prevent the interpolated value from exceeding `last_game_value + (rate × tick_interval)`? This would prevent brief over-prediction if a rate spike resolves within one tick. **Owner: engineer**
   - [RESOLVED] Yes, with `clamp = true` as the default. Already implemented — `maxMs` defaults to `TICK_INTERVAL_MS`. Over-prediction is silently suppressed without requiring callers to opt in.

---
# Review: engineer

**Date**: 2026-04-05
**Decision**: Aligned

**Comments**

Both OQs are answered by the existing implementation — this proposal is already shipped.

1. **Standalone hook** — `useInterpolatedValue.ts` exists, exports `interpolateValue` as a pure function for unit testing, and is already consumed by `TopBar`. The viral counter will be able to reuse it directly.
2. **Clamp** — implemented as `clamp = true` default. `interpolateValue` takes `maxMs = TICK_INTERVAL_MS`. No caller opts in explicitly; the safe behavior is the default.

No issues. Proposal matches implementation. Moving to accepted.
