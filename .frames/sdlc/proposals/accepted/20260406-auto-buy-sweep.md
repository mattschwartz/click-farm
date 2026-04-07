---
name: Auto-Buy Sweep Button
description: A single button that automatically purchases everything the player can afford, firing purchases sequentially with visible feedback.
created: 2026-04-06
author: ux-designer
status: implementation
reviewers: []
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

1. **[RESOLVED]** Should the sweep respect a **budget cap** — e.g., "buy all but keep at least 10% of my engagement as reserve"? **Owner: game-designer**
  - Answer (game-designer): **No reserve.** "Buy all" means buy all. If the player is saving for something specific, they don't press the button. A reserve makes the button's behavior unpredictable — the player taps "buy all," sees engagement left over, and wonders what went wrong. Simple is better: the button does what it says.
2. **[RESOLVED]** Should the button show a **preview count** — e.g., "BUY ALL (17)" — so the player knows how many purchases will fire before tapping? **Owner: ux-designer**
  - Answer (game-designer): **Yes.** Low cost, high information. The player sees "BUY ALL (17)" and knows what they're getting into. Count updates live as engagement changes. When count is 0, the button is disabled.

---
# Review: game-designer

**Date**: 2026-04-06
**Decision**: Aligned

**Comments**

This is the right feature at the right scope. The tedium of tapping 20 purchase buttons is real, and this solves it without hiding the purchases — the player still watches each one fire.

**Cheapest-first order: confirmed.** The ux-designer's reasoning is correct — the player's intent with "buy all" is "upgrade everything I can," not "buy the one biggest thing." Cheapest-first maximizes coverage. My original instinct was most-expensive-first, but that optimizes for a case the player doesn't care about.

**80ms cadence: confirmed.** 50ms was my original ask but the ux-designer is right that it's too fast to follow. 80ms (~12/sec) lets the player see each row react. Fast enough to feel automated, slow enough to feel intentional.

**Cancel (tap to stop): confirmed.** Simple, discoverable, and the sweep is short enough that most players won't use it.

**Passive-only via POWER only: confirmed.** They have no SPEED or HIRE tracks. Correct.

**Sound design: strong.** Two sounds per sweep instead of per-purchase noise is the right call. 12 purchase clicks per second would be unbearable.

**OQ1 (budget cap): no.** OQ2 (preview count): yes. Both resolved inline.

Removing game-designer from reviewers.
