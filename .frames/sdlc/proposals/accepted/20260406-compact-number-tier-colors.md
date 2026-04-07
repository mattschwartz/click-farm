---
name: Compact Number Tier Colors
description: A progressive color ramp for compact number suffixes (K through Dc) that communicates magnitude at a glance — cool/muted at K, warm/intense at Dc.
created: 2026-04-06
author: ux-designer
status: accepted
reviewers: []
---

# Proposal: Compact Number Tier Colors

## Problem

All compact number suffixes (K, M, B, T, Qa, Qi, Sx, Sp, Oc, No, Dc) render in the same text color. The player must parse the suffix letters to understand magnitude. At a glance, "422.39K" and "422.39Dc" look identical in visual weight. The game-designer wants magnitude to be readable from color alone — a visual temperature ladder where bigger numbers feel bigger.

## Proposal

Apply a progressive color ramp to the suffix portion of formatted numbers. The number itself stays in the default text color (`--text-primary`); only the suffix letter(s) carry the tier color. This preserves the number's legibility while making the suffix a magnitude signal.

### Color ramp

The ramp moves from **neutral grey through cool blue, into violet-purple, ending at hot magenta**. It avoids the three reserved functional hues: green (boost), amber-orange (penalty), and red (danger/loss).

| Tier | Suffix | Token | Hex | Hue | Contrast on #FAF8F5 | Feel |
|------|--------|-------|-----|-----|-------------------|------|
| 1 | K | `--tier-k` | `#6E6E6E` | Neutral | 4.8:1 | Mundane — just thousands |
| 2 | M | `--tier-m` | `#5B748A` | Steel blue | 4.6:1 | Getting somewhere |
| 3 | B | `--tier-b` | `#3E6B8F` | Blue | 5.3:1 | Billions — real money |
| 4 | T | `--tier-t` | `#355FA0` | Deep blue | 6.0:1 | Trillions — serious |
| 5 | Qa | `--tier-qa` | `#4E4FA0` | Indigo | 6.7:1 | Entering absurd territory |
| 6 | Qi | `--tier-qi` | `#6640A0` | Violet | 7.1:1 | Deep space |
| 7 | Sx | `--tier-sx` | `#7E3090` | Purple | 7.3:1 | Rich |
| 8 | Sp | `--tier-sp` | `#922080` | Magenta | 7.2:1 | Hot |
| 9 | Oc | `--tier-oc` | `#A01868` | Fuchsia | 7.0:1 | Burning |
| 10 | No | `--tier-no` | `#A81050` | Hot pink | 6.9:1 | Nearly maxed |
| 11 | Dc | `--tier-dc` | `#B00840` | Crimson-pink | 6.7:1 | Absurd peak |

### Design rationale

1. **Neutral start.** K is grey — thousands are nothing special. The color doesn't draw the eye, which is correct because K-tier numbers are the background hum of the game.

2. **Cool blue middle.** M through T sit in the blue family. Blue is trustworthy, stable, competent. These are the tiers where the player is actually building something. The deepening blue communicates "this number is becoming significant."

3. **Violet-purple transition.** Qa through Sx shift into violet and purple. Purple historically signals rarity, power, prestige. This is where numbers start to feel absurd and the player enters late-game territory.

4. **Hot magenta peak.** Sp through Dc push into magenta and crimson-pink. The warmth is intense without being red (which is reserved for danger). Magenta reads as "extreme, maximal, beyond" — which is exactly what Decillions are.

5. **Increasing contrast.** The ramp naturally darkens from 4.8:1 (K) to 6.7:1 (Dc). Higher tiers have more visual weight, which reinforces the magnitude signal through a second channel (contrast weight, not just hue).

### Collision avoidance

| Reserved color | Hex | Where used | Nearest tier | Distance |
|---------------|-----|-----------|-------------|----------|
| Accent gold | `#A0730E` | LVL/BUY/AUTO affordance (ready-to-buy), floating number gold | None close | Gold is warm yellow-brown (hue ~43), ramp stays grey→blue→purple→pink |
| Accent green | `#2F7A3A` | Audience mood recovery, positive rate arrows | T (`#355FA0`) | Different hue family entirely (green vs blue) |
| Accent amber | `#C45A10` | Audience mood degradation, unaffordable cost labels | None close | Orange family, ramp doesn't enter orange |
| Accent red | `#B71C1C` | Audience mood critical, loss events | Dc (`#B00840`) | Dc is magenta-pink (hue ~340), red is pure red (hue ~0). Visually distinct. |
| Viral burst glow | `--glow-halo-rgb` (255,214,107) | Viral event edge glow | None close | Warm gold, foreground text vs background glow — no overlap |
| Platform card accents | Various per platform | Top-border tint on platform cards | Skroll (`#b84dff`) near Qi/Sx | Tier suffixes are small inline text; platform accents are card-level borders. Different scale, different context. |
| Generator badge breathing | `--accent-gold` | Lvl-up ready state glow | None close | Gold family |

### Application rule

Color applies to the **suffix only**, not the entire formatted number.

```
422.39 M      ← "422.39" in --text-primary, "M" in --tier-m
  1.2  Qa     ← "1.2" in --text-primary, "Qa" in --tier-qa
```

This keeps the numeric value maximally legible (high-contrast default text) while the suffix carries the color signal. The suffix is always 1-2 characters, so the colored portion is small — a tag, not a highlight.

### Where it renders

Every call site that displays a formatted compact number:
- **Top bar** — engagement counter, follower count, rate display
- **Generator rows** — rate, BUY/LVL costs in purchase pill ghost labels
- **Platform cards** — follower count, rate
- **Action buttons** — yield display, floating numbers
- **Upgrade drawer** — level costs, rate deltas

The formatter (`fmtCompact` / `fmtCompactInt`) stays a pure string function. The rendering layer wraps the suffix in a `<span>` with the appropriate tier color class or inline style.

### Reduced motion / accessibility

No motion involved — this is a static color property. Color-blind players: the ramp moves along a blue→purple→pink axis, which maintains perceptual distinctness under protanopia and deuteranopia (both see blue and purple well). Tritanopia collapses blue/purple but preserves the pink end. For full color independence, the suffix letters themselves already carry the magnitude information — color is reinforcement, not the sole signal.

## References

1. `client/src/ui/format.ts` — `fmtCompact`, `fmtCompactInt` — the formatter functions
2. `client/src/theme/tokens.css` — existing color tokens, functional accent palette
3. `ux/accent-palette-light-mode.md` — reserved functional colors
4. `ux/purchase-feedback-and-rate-visibility.md` §2 — rate display formatting

## Open Questions

1. **[RESOLVED]** Should the floating numbers on verb buttons also get tier-colored suffixes, or should they stay gold? The gold color is part of the "you earned something" reward signal — adding tier color might dilute it. Recommendation: floating numbers stay gold, tier colors apply everywhere else. **Owner: game-designer**
  - Answer (game-designer): **Floating numbers stay gold.** Gold is the reward signal — "you earned this." Tier coloring on floating numbers would make them informational instead of celebratory. Tier color belongs on persistent displays (top bar, generator rows, platform cards) where the player is scanning. Floating numbers are momentary dopamine hits where color = "good."

---
## Revision: 2026-04-06 — ux-designer

Addresses game-designer's three review comments: (1) Fixed table column order — Token before Hex consistently across all rows. (2) Re-measured all contrast ratios against `#FAF8F5` (warm base) instead of `#FFF`. K darkened from `#787878` to `#6E6E6E` to pass 4.5:1 on the warmer surface. (3) Replaced collision avoidance table — removed dead algorithm modifier chips and scandal references, replaced with surviving systems: audience mood colors, viral burst glow, platform card accents, generator badge breathing.

---
# Review: game-designer

**Date**: 2026-04-06
**Decision**: Request for Comment

**Comments**

The ramp direction is right — neutral grey at K through hot magenta at Dc reads as "getting bigger." The suffix-only application rule is correct. Three issues need fixing before this can be accepted:

**1. Table formatting error.** Row 1 has columns in Token/Hex order (`--tier-k` | `#787878`), but rows 2–11 swap to Hex/Token (`#5B748A` | `--tier-m`). Pick one column order and apply it consistently.

**2. Contrast measured against wrong background.** The table measures contrast against `#FFF` (pure white), but the game uses a warm rust background (`#FAF8F5` per visual-identity). Contrast ratios must be re-measured against the actual game background. K at 4.6:1 against white may dip below the 4.5:1 WCAG floor against the warmer surface. Re-run the numbers.

**3. Collision avoidance table references dead systems.** "Algorithm modifier chips" (boost green, penalty amber) — the algorithm system is being removed per the accepted Remove Algorithm Weather System proposal. Those chips will not exist. "Scandal, loss" for danger red — scandals were removed and replaced by audience mood. The collision table should reference the systems that actually survive: audience mood edge colors, viral burst glow, generator badge breathing, platform card accents, and the buy/level affordance states.

**OQ1 resolved.** Floating numbers stay gold. Answer written inline.

---
# Review: game-designer (re-review)

**Date**: 2026-04-06
**Decision**: Aligned

**Comments**

All three issues from the first review are resolved.

1. Table column order is now consistent across all rows — Token before Hex throughout. No more swap between row 1 and the rest.

2. Contrast re-measured against `#FAF8F5`. K was darkened from `#787878` to `#6E6E6E` to hold at 4.8:1, clearing the 4.5:1 floor on the warmer surface. All other tiers pass comfortably.

3. Collision table references only surviving systems: audience mood colors, viral burst glow, platform card accents, generator badge breathing, accent gold affordance states. Dead algorithm chips and scandal/loss entries are gone.

OQ1 resolved inline — floating numbers stay gold.

Minor: §2.5 rationale prose still reads "4.6:1 (K) to 7.6:1 (Dc)" but the updated table shows 4.8:1 and 6.7:1. Stale copy — non-blocking, fix at build time.

Removing game-designer from reviewers.

---
# Review: engineer

**Date**: 2026-04-06
**Decision**: Aligned

**Comments**

Proposal is well-defined and implementable. No blocking concerns.

1. **Formatter stays pure — implementation shape is clear.** `fmtCompact`/`fmtCompactInt` remain pure string functions as proposed. Implementation will add a parallel structured-return path (number + suffix + tier) or a wrapper `<Compact>` component so the rendering layer can apply the tier color to a `<span>` around the suffix. Current `applyTier` concatenates into one string — straightforward to split.

2. **Broad but mechanical rollout.** `fmtCompact`/`fmtCompactInt` are called across ~18 files (TopBar, GeneratorList, PlatformPanel, ActionsColumn, UpgradeDrawer, PostZone, etc.). Each call site switches from `{fmtCompact(n)}` to the wrapper component. No risk, just surface area.

3. **Stale contrast numbers in §2.5 prose.** Game-designer already flagged — "4.6:1 to 7.6:1" should read "4.8:1 to 6.7:1" per the updated table. Will fix at build time.

4. **CSS tokens fit cleanly.** `--tier-k` through `--tier-dc` go into `tokens.css` alongside the existing functional palette. No conflicts with current token namespace.

Removing engineer from reviewers. All reviewers aligned — moving to accepted.
