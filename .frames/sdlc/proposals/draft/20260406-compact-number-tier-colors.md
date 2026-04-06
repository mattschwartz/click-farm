---
name: Compact Number Tier Colors
description: A progressive color ramp for compact number suffixes (K through Dc) that communicates magnitude at a glance — cool/muted at K, warm/intense at Dc.
created: 2026-04-06
author: ux-designer
status: draft
reviewers: [engineer]
---

# Proposal: Compact Number Tier Colors

## Problem

All compact number suffixes (K, M, B, T, Qa, Qi, Sx, Sp, Oc, No, Dc) render in the same text color. The player must parse the suffix letters to understand magnitude. At a glance, "422.39K" and "422.39Dc" look identical in visual weight. The game-designer wants magnitude to be readable from color alone — a visual temperature ladder where bigger numbers feel bigger.

## Proposal

Apply a progressive color ramp to the suffix portion of formatted numbers. The number itself stays in the default text color (`--text-primary`); only the suffix letter(s) carry the tier color. This preserves the number's legibility while making the suffix a magnitude signal.

### Color ramp

The ramp moves from **neutral grey through cool blue, into violet-purple, ending at hot magenta**. It avoids the three reserved functional hues: green (boost), amber-orange (penalty), and red (danger/loss).

| Tier | Suffix | Token | Hex | Hue | Contrast on #FFF | Feel |
|------|--------|-------|-----|-----|-----------------|------|
| 1 | K | `--tier-k` | `#787878` | Neutral | ~4.6:1 | Mundane — just thousands |
| 2 | M | `#5B748A` | `--tier-m` | Steel blue | ~4.5:1 | Getting somewhere |
| 3 | B | `#3E6B8F` | `--tier-b` | Blue | ~4.8:1 | Billions — real money |
| 4 | T | `#355FA0` | `--tier-t` | Deep blue | ~5.3:1 | Trillions — serious |
| 5 | Qa | `#4E4FA0` | `--tier-qa` | Indigo | ~5.6:1 | Entering absurd territory |
| 6 | Qi | `#6640A0` | `--tier-qi` | Violet | ~5.9:1 | Deep space |
| 7 | Sx | `#7E3090` | `--tier-sx` | Purple | ~6.4:1 | Rich |
| 8 | Sp | `#922080` | `--tier-sp` | Magenta | ~6.8:1 | Hot |
| 9 | Oc | `#A01868` | `--tier-oc` | Fuchsia | ~7.0:1 | Burning |
| 10 | No | `#A81050` | `--tier-no` | Hot pink | ~7.3:1 | Nearly maxed |
| 11 | Dc | `#B00840` | `--tier-dc` | Crimson-pink | ~7.6:1 | Absurd peak |

### Design rationale

1. **Neutral start.** K is grey — thousands are nothing special. The color doesn't draw the eye, which is correct because K-tier numbers are the background hum of the game.

2. **Cool blue middle.** M through T sit in the blue family. Blue is trustworthy, stable, competent. These are the tiers where the player is actually building something. The deepening blue communicates "this number is becoming significant."

3. **Violet-purple transition.** Qa through Sx shift into violet and purple. Purple historically signals rarity, power, prestige. This is where numbers start to feel absurd and the player enters late-game territory.

4. **Hot magenta peak.** Sp through Dc push into magenta and crimson-pink. The warmth is intense without being red (which is reserved for danger). Magenta reads as "extreme, maximal, beyond" — which is exactly what Decillions are.

5. **Increasing contrast.** The ramp naturally darkens from 4.6:1 (K) to 7.6:1 (Dc). Higher tiers have more visual weight, which reinforces the magnitude signal through a second channel (contrast weight, not just hue).

### Collision avoidance

| Reserved color | Hex | Where used | Nearest tier | Distance |
|---------------|-----|-----------|-------------|----------|
| Boost green | `#2F7A3A` | Algorithm modifier chips | T (`#355FA0`) | Different hue family entirely (green vs blue) |
| Penalty amber | `#C45A10` | Algorithm modifier chips | None close | Orange family, ramp doesn't enter orange |
| Danger red | `#B71C1C` | Scandal, loss | Dc (`#B00840`) | Dc is magenta-pink (hue ~340), red is pure red (hue ~0). Visually distinct. |
| Mood edges | Various | Background vignette | Low risk — mood is at 0.14-0.22 opacity on background, suffixes are foreground text |

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

1. Should the floating numbers on verb buttons also get tier-colored suffixes, or should they stay gold? The gold color is part of the "you earned something" reward signal — adding tier color might dilute it. Recommendation: floating numbers stay gold, tier colors apply everywhere else. **Owner: game-designer**
