---
name: Generator Balance & Algorithm States
description: Formalises the generator rate table, trend sensitivities, and algorithm state definitions as official design targets, replacing the provisional values in static-data/index.ts.
created: 2026-04-04
author: game-designer
status: accepted
reviewers: []
---

# Proposal: Generator Balance & Algorithm States

## Problem

The static data module (`client/src/static-data/index.ts`) contains fully functional but explicitly provisional values — the engineer left `TODO(game-designer)` markers throughout. Two things need formal design decisions before this data can be considered stable:

1. **Algorithm states** — five states are coded with provisional modifiers. Their strategic character has never been formally specified. The engineer made reasonable guesses, but "guess" is not a design target.

2. **Generator balance** — rates, trend sensitivities, and costs are all marked provisional. The engineer's directional choices are sound, but the values need to be affirmed or adjusted with explicit rationale so the engineer has a clear tuning target rather than placeholders.

There is also a **clout upgrade discrepancy** that needs to be flagged: the code has completely different values from the accepted clout-upgrade-menu draft proposal. This is tracked as an open question below.

---

## Proposal

### Design Target: What the Algorithm Should Feel Like

The Algorithm is the primary source of strategic variety. When it shifts, the player should:

- Immediately understand what the new state rewards
- Have a clear "right move" (even if they can't always execute it)
- Feel the shift as an opportunity, not a punishment

Each state should have a distinct personality — not just different numbers, but a different vibe. The player learns the 5 states over multiple sessions and starts predicting how to react.

**States are not balanced.** Some states are objectively better for certain loadouts. That's the point. The strategic lever is "adapt or persist," and both are valid playstyles.

---

### Algorithm States

The five states below are the official design target. The `state_modifiers` are raw modifiers, which are then folded with each generator's `trend_sensitivity` via:

```
effectiveModifier = 1 + trend_sensitivity × (raw_modifier - 1)
```

This means high-sensitivity generators (memes, hot_takes, viral_stunts) swing hard. Low-sensitivity generators (tutorials, podcasts) barely feel the shift. This is intentional — trend immunity is a distinct playstyle, not a bug.

---

#### short_form_surge

**Character:** The feed wants quick hits. Memes and hot takes dominate. Long-form content gets buried. The algorithm is rewarding brevity and emotional reaction.

**Strategic signal:** Pivot to memes and hot takes immediately. If you're podcasting, you're leaving engagement on the floor.

**Why this matters:** The most "natural" starting state for a social media game — the player's first experience of the algorithm feeling like a puzzle to solve.

| Generator | Raw Modifier | Effective at max sensitivity (ts=1.0) |
|---|---|---|
| selfies | 1.2 | +20% |
| memes | 1.8 | +64% effective |
| hot_takes | 1.6 | +54% effective |
| tutorials | 0.6 | -10% effective (ts=0.1, nearly immune) |
| livestreams | 1.3 | +18% effective |
| podcasts | 0.5 | -10% effective (ts=0.2, nearly immune) |
| viral_stunts | 1.4 | +40% effective |

---

#### authenticity_era

**Character:** The backlash has arrived. Audiences are exhausted by manufactured content. Real, personal, live content wins. Hot takes and memes feel hollow. Livestreams and selfies feel earned.

**Strategic signal:** Livestreams are the big winner (+60% effective). Selfies benefit too. Hot takes take a serious hit (-45% effective). This state punishes the engagement_bait loadout hardest.

**Why this matters:** Forces players to invest in livestreams, which are expensive and high-investment. Creates a "rising tide lifts boats" moment for players who did invest.

| Generator | Raw Modifier | Effective at max sensitivity |
|---|---|---|
| selfies | 1.8 | +24% effective |
| memes | 0.7 | -24% effective |
| hot_takes | 0.5 | -45% effective |
| tutorials | 1.4 | +10% effective (nearly immune to loss but benefits mildly) |
| livestreams | 2.0 | +60% effective |
| podcasts | 1.5 | +10% effective |
| viral_stunts | 0.6 | -40% effective |

---

#### engagement_bait

**Character:** Pure controversy. The algorithm has optimised entirely for reaction. Hot takes and viral stunts are printing followers. Thoughtful long-form content is invisible.

**Strategic signal:** The highest-output state in the game for a hot_takes/viral_stunts loadout. Hot takes get +90% effective, viral_stunts +80% effective. The downside: this is a temporary spike — players who bet too hard on it will be caught off-guard by corporate_takeover.

**Why this matters:** This is the "chaos state." Players who can capitalise on it get the biggest short-term gains. It also pairs deliberately with Algorithm Insight (clout upgrade) — knowing this is coming lets you pre-position.

| Generator | Raw Modifier | Effective at max sensitivity |
|---|---|---|
| selfies | 0.8 | -6% effective (nearly immune) |
| memes | 1.5 | +40% effective |
| hot_takes | 2.0 | +90% effective |
| tutorials | 0.7 | -7% effective (nearly immune) |
| livestreams | 1.2 | +12% effective |
| podcasts | 0.6 | -8% effective |
| viral_stunts | 1.8 | +80% effective |

---

#### nostalgia_wave

**Character:** The internet is feeling sentimental. Throwback aesthetics, classic meme formats, relatable everyday content. Spectacle and controversy feel exhausting. This is the "comfort food" state.

**Strategic signal:** Memes win big (+56% effective) but in a different way than short_form_surge — this state rewards meme *quality* alongside viral_stunts punishment. Tutorials surprisingly benefit (+20% effective). The broadest spread of winners.

**Why this matters:** The most forgiving state. Players who don't adapt still do reasonably well. Good for recovery after a hard engagement_bait crash. The strategic lesson is "memes work everywhere, just differently."

| Generator | Raw Modifier | Effective at max sensitivity |
|---|---|---|
| selfies | 1.5 | +15% effective |
| memes | 1.7 | +56% effective |
| hot_takes | 0.8 | -18% effective |
| tutorials | 1.2 | +20% effective |
| livestreams | 0.9 | -6% effective |
| podcasts | 1.4 | +8% effective |
| viral_stunts | 0.7 | -30% effective |

---

#### corporate_takeover

**Character:** The suits have arrived. Brand-safe, evergreen, professional content wins. The algorithm has been sold to advertisers. Anything edgy or spectacular gets suppressed. Tutorials and podcasts print money.

**Strategic signal:** The complete inversion of engagement_bait. Viral_stunts get crushed (-50% effective). Memes take a serious hit (-32% effective). Tutorials and podcasts benefit most (both +20% effective). This is the "boring wins" state — funny and punishing simultaneously.

**Why this matters:** Forces players who've over-invested in high-sensitivity content to feel the cost. Creates demand for tutorials and podcasts, which are easy to neglect. The satire writes itself.

| Generator | Raw Modifier | Effective at max sensitivity |
|---|---|---|
| selfies | 0.7 | -9% effective |
| memes | 0.6 | -32% effective |
| hot_takes | 0.9 | -9% effective |
| tutorials | 2.0 | +20% effective |
| livestreams | 1.0 | 0% (neutral) |
| podcasts | 2.0 | +20% effective |
| viral_stunts | 0.5 | -50% effective |

---

### Generator Rate Table

The following values are affirmed as the design target. The engineer's provisional values are correct directionally. What this section adds is the **intent** behind each number, so future tuning passes have something to measure against.

**Design constraints:**
- Payback period for the first unit of each generator at level 1: ~10 seconds
- Each tier is ~10× more expensive than the previous
- Each tier produces ~3–5× more engagement per unit than the previous
- This means later generators are less efficient per-engagement-spent — intentional; you always want the newest tier you can afford

| Generator | base_rate | fcr | trend_sensitivity | unlock_threshold | Design intent |
|---|---|---|---|---|---|
| selfies | 1.0/s | 0.10 | 0.3 | 0 | The floor. Always relevant, never spectacular. Immune-ish to algorithm swings. High follower conversion for tier 1. |
| memes | 5.0/s | 0.08 | 0.8 | 50 | First taste of trend-sensitivity. High-sensitivity means players immediately feel the algorithm shift when they buy memes. FCR slightly lower — viral ≠ loyal. |
| hot_takes | 12.0/s | 0.05 | 0.9 | 200 | High output, high volatility, low loyalty. The most algorithm-sensitive generator before viral_stunts. FCR lowest of the bunch — controversy gets engagement, not followers. |
| tutorials | 30.0/s | 0.07 | 0.1 | 1_000 | Reliable and boring by design. Nearly immune to algorithm (ts=0.1). The "set it and forget it" generator. Good follower conversion — audiences who stick around for tutorials are more loyal. |
| livestreams | 80.0/s | 0.09 | 0.6 | 5_000 | Mid-range sensitivity. Shines in authenticity_era. Second-highest follower conversion — live audiences feel personal. This is where the "attention" layer of the game opens up. |
| podcasts | 150.0/s | 0.11 | 0.2 | 20_000 | Slow build, compounding. Highest follower conversion in base game — podcasts build the most loyal audiences. Low sensitivity pairs with corporate_takeover benefits. |
| viral_stunts | 500.0/s | 0.06 | 1.0 | 100_000 | Maximum sensitivity. In engagement_bait: extraordinary (+80%). In corporate_takeover: catastrophic (-50%). The endgame spectacle generator. Low FCR — stunts get eyeballs, not fans. |

**Buy cost formula:** `ceil(base_buy_cost × 1.15^count_owned)`
**Upgrade cost formula:** `ceil(base_upgrade_cost × 4^(level - 1))`

Base costs follow the ~10× tier progression:

| Generator | base_buy_cost | base_upgrade_cost |
|---|---|---|
| selfies | 10 | 100 |
| memes | 100 | 1,000 |
| hot_takes | 1,100 | 11,000 |
| tutorials | 12,000 | 120,000 |
| livestreams | 130,000 | 1,300,000 |
| podcasts | 1,400,000 | 14,000,000 |
| viral_stunts | 20,000,000 | 200,000,000 |

**Note on upgrade costs:** The 4× upgrade cost multiplier per level pairs with the super-exponential level multiplier curve (`2^(level²/5)`) defined in the accepted Level Multiplier Curve proposal. Players should always buy multiple units before upgrading — upgrading a single-unit generator is inefficient. This is a feature, not a bug: it creates a clear strategic rhythm.

---

### Platform Unlock Thresholds & Content Affinities

Platform thresholds and affinities are affirmed as-is from the provisional values. They are part of the balance but are secondary to the generator/algorithm decisions here. Threshold adjustments should be driven by playtesting data once UX task #40 (Purchase Feedback & Rate Visibility) lands and rate changes become perceptible.

---

### Algorithm Schedule Timing

**Base interval:** 5 minutes ± 1 minute variance.

This is affirmed as the starting target. Five minutes is long enough to feel the current state (not just adapt and immediately shift again), but short enough that multiple shifts happen within a play session. Flag for revisit once the algorithm state UI (UX task, to be filed) is implemented — the timing should feel contextually right once the player can *see* the state clearly.

---

### Manual Click Value

> **[SUPERSEDED by `proposals/accepted/manual-action-ladder.md` — 2026-04-05]** The flat `CLICK_BASE_ENGAGEMENT = 1.0` constant does not survive. Manual click value becomes **per-verb**, calibrated to each verb's own `base_event_yield` (the yield half of the `base_engagement_rate` split introduced by manual-action-ladder §12/§14). The spirit of "generators take over" is preserved but reframed: **automators take over per verb**, while the player's hand retains meaningful contribution via any verb they choose to tap. At the 0.01s cooldown floor (human peak tap ~10/sec bounded against automator throughput ~100/sec), manual output is structurally capped at ~10% of passive output per verb — the "supplementary" target holds numerically, without a flat constant. See manual-action-ladder §14f for the per-verb supplementary-ratio table. Historical text below preserved for context.

`CLICK_BASE_ENGAGEMENT = 1.0` is affirmed. This mirrors the selfies base rate, making clicking roughly equivalent to one selfies generator at level 1 (before level multiplier). The intent: clicking is the early-game bootstrap mechanism, not a primary long-term income source. Once the player has several generators, clicking becomes supplementary. The value should not be raised — that would undermine the "generators take over" arc.

---

### What This Locks In

- Algorithm state identities, modifiers, and strategic characters
- Generator rates, trend sensitivities, and follower conversion rates
- Buy/upgrade cost structure and scaling
- Manual click value

### What This Leaves Open

- Fine-tuning after playtesting — these are design targets, not sacred numbers. The engineer should flag if anything feels dramatically off in practice.
- Platform affinity values — not finalised here, reviewed separately.
- Post-prestige generator stats — defined in the Clout Upgrade Menu proposal.

---

## References

1. `.frames/sdlc/proposals/accepted/core-game-identity-and-loop.md` — generator flavors and strategic intent (Section 3)
2. `.frames/sdlc/proposals/accepted/level-multiplier-curve.md` — level multiplier formula that upgrade costs are designed against
3. `client/src/static-data/index.ts` — the provisional values being formalised here
4. `client/src/game-loop/index.ts` — `effectiveAlgorithmModifier` formula, `levelMultiplier` formula, `CLICK_BASE_ENGAGEMENT`

---

## Open Questions

1. **Clout upgrade code discrepancy.** The code at `client/src/static-data/index.ts` has placeholder clout upgrade values (`faster_engagement` at [1,3,8,20,50] Clout with 1.25× multiplier) that do not match the design in the draft proposal `clout-upgrade-menu.md`. The engineer used correct placeholders pending acceptance of that proposal. Once `clout-upgrade-menu.md` is accepted, the engineer must update the static data to match. This is a tracking note, not a blocker for this proposal. **Owner: engineer** (update static data when clout-upgrade-menu is accepted)

2. **Algorithm schedule timing revisit.** The 5-minute base interval should be reassessed after UX task #40 (rate visibility and purchase feedback) ships. The right timing depends partly on how legible the algorithm state is to the player — hard to evaluate until that UI exists. **Owner: game-designer**

---
# Review: engineer

**Date**: 2026-04-04
**Decision**: Aligned

**Comments**

Formula, rate table, and cost structure are all clear and implementable. No blocking concerns.

**Non-blocking: algorithm state table arithmetic inconsistencies.**

The per-state tables show an "Effective at max sensitivity (ts=1.0)" column, but the values are calculated using each generator's actual `trend_sensitivity`, not ts=1.0. That's more useful anyway — the column header is just wrong. More importantly, the `tutorials` generator is consistently off by a factor of ~2.5×:

- `short_form_surge`: formula `1 + 0.1 × (0.6 − 1) = 0.96` → −4%, table shows −10%
- `authenticity_era`: formula `1 + 0.1 × (1.4 − 1) = 1.04` → +4%, table shows +10%

I'll implement the stated formula (`effectiveModifier = 1 + trend_sensitivity × (raw_modifier − 1)`) as authoritative. The table numbers are illustrative. Flagging in case the tutorials values were intentional and the formula needs updating — if so, the game-designer should clarify before the build task ships.

**Open question #1 acknowledged.** I'll update static data for clout upgrades once `clout-upgrade-menu.md` is accepted (which it now is, as I'm approving it in the same session).

**Open question #2** is a future revisit tied to UX task #40 — noted, no action needed now.
