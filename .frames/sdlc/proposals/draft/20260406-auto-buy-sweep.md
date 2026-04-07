---
name: Auto-Buy Sweep Button
description: A single button that automatically purchases everything the player can afford, firing purchases sequentially with visible feedback.
created: 2026-04-06
author: ux-designer
status: draft
reviewers: [game-designer]
---

# Proposal: Auto-Buy Sweep Button

## Problem

As generators multiply and three purchase tracks per verb stack up (SPEED, POWER, HIRE), the player accumulates many affordable purchases. Manually tapping each one is tedious — it's bookkeeping, not gameplay. The player needs a way to say "buy everything I can afford" in one action, while still seeing each purchase happen (so they understand where their engagement went).

## Proposal

A single "Buy All" button that sweeps through all affordable purchases sequentially, firing them one at a time with visible feedback. The effect is a speed-run through the buy menu — the player watches their engagement count down as generators, levels, and autoclickers tick up.

### 1. Button placement

The button lives at the **top of the generator column**, above the first category divider. It's a full-width bar matching the column width, visually distinct from generator rows (not a row — a toolbar element).

```
┌──────────────────────────────────────────────────────────────┐
│  ⚡ BUY ALL                                                   │
└──────────────────────────────────────────────────────────────┘
  STARTER
  ▸ Chirps ...
```

- **Height:** 36px.
- **Border-radius:** 6px.
- **Typography:** 12px Space Grotesk 700, uppercase.
- **Background:** `rgba(var(--glow-halo-rgb), 0.12)` — warm gold tint, same family as the HIRE flame.
- **Border:** 1px solid `rgba(var(--glow-halo-rgb), 0.25)`.
- **Text color:** `var(--accent-gold)` — `#A0730E`.

**Why here:** the generator column is where all purchases live. The button sits at the top of the purchase surface, not floating detached in a toolbar. The player's eyes are already on this column when they're buying.

### 2. Purchase order — cheapest first

Cheapest-first maximizes the number of purchases per sweep. Most-expensive-first risks burning 90% of engagement on one big buy and stopping. The player's intent with "buy all" is "upgrade everything I can" — cheapest-first serves that intent by spreading engagement across many small improvements rather than one large one.

**Sort:** collect all affordable purchases across all generators (SPEED, POWER, HIRE for manual-clickable; POWER only for passive-only), compute cost for each, sort ascending. Fire sequentially.

### 3. Sweep cadence — 80ms between purchases

50ms is too fast for the player to follow. 80ms gives ~12 purchases per second — fast enough to feel automated, slow enough that the player can see individual generator rows react (badge increments, rate updates). At 30 affordable purchases, the sweep takes ~2.4 seconds.

### 4. Sound design

Do NOT play the per-purchase sfx on every sweep step. At 12/sec it becomes noise. Instead:

- **Sweep start:** a single ascending chime (distinct from the normal purchase click).
- **During sweep:** silence. The visual feedback (numbers ticking, badges incrementing) carries the feel.
- **Sweep end:** a single satisfying "done" tone — lower, resolving.

Two sounds total per sweep, regardless of purchase count.

### 5. Scope — all generators, all tracks

The sweep includes:
- **Manual-clickable verbs** (chirps, selfies, livestreams, podcasts, viral_stunts): SPEED, POWER, HIRE — all three tracks.
- **Passive-only generators** (memes, hot_takes, tutorials, etc.): POWER only (they have no SPEED or HIRE).

Everything the player could manually tap, the sweep taps for them.

### 6. Cancel mechanism

**Tap the button again to cancel mid-sweep.** The button label changes from "BUY ALL" to "STOP" while a sweep is in progress. Cancelling stops the sweep immediately — purchases already made stay, remaining purchases are skipped. Engagement spent is not refunded.

The sweep is fast enough (2-3 seconds) that cancellation is a safety valve, not a primary interaction. Most players will let it run.

### 7. Visual states

| State | Background | Text | Border | Behavior |
|-------|-----------|------|--------|----------|
| **Idle (purchases available)** | Gold tint | `BUY ALL` | Gold border | Tappable |
| **Idle (nothing affordable)** | Transparent | `BUY ALL` in `--text-receded` | `--border-subtle` | Disabled, no pointer |
| **Sweeping** | Gold tint, pulsing | `STOP` | Gold border | Tappable (cancels) |

The pulsing during sweep: `opacity 0.8 → 1.0` on a 400ms sine cycle. Subtle — the cascading row updates are the primary visual, not the button itself.

### 8. Re-evaluation after each purchase

After each purchase fires, the sweep re-computes all affordable purchases and re-sorts. This handles:
- Purchases that became unaffordable because engagement was spent.
- Purchases that became newly affordable (e.g., a generator that was locked behind ownership but was just bought).
- Cost changes from escalation (BUY cost increases after each BUY).

### 9. Keyboard shortcut

`B` key triggers the sweep (when no modal is open). Same key cancels if a sweep is in progress. Documented in the settings/controls area.

## References

1. `client/src/ui/GeneratorList.tsx` — purchase button rendering, feedback chains
2. `client/src/generator/index.ts` — cost functions, purchase actions
3. `client/src/driver/index.ts` — driver interface for purchase actions
4. `ux/generator-purchase-pills.md` — purchase pill spec, feedback chains

## Open Questions

1. Should the sweep respect a **budget cap** — e.g., "buy all but keep at least 10% of my engagement as reserve"? This prevents the player from accidentally spending everything and being unable to afford a specific purchase they were saving for. **Owner: game-designer**
2. Should the button show a **preview count** — e.g., "BUY ALL (17)" — so the player knows how many purchases will fire before tapping? **Owner: ux-designer**
