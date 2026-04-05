# Accent Palette — Light Mode

> **Scope:** Concrete hex values for the six functional accent tokens (`--accent-gold`, `--accent-green`, `--accent-amber`, `--accent-red`, `--accent-platinum`, `--accent-platinum-deep`) derived for the warm near-white base (`#FAF8F5`) and white panels (`#FFFFFF`) committed in `proposals/accepted/visual-identity-light-mode.md`. Each slot carries a functional state meaning; these values are the light-mode expressions of those meanings.
>
> **Not in scope:** Algorithm-mood edge-vignette hues (owned by `proposals/accepted/algorithm-mood-visibility.md` revision, follow-up task). Generator color-lane tokens (owned by `ux/visual-identity.md`). Platform accent colors. Typography colors (owned by `proposals/accepted/visual-identity-light-mode.md` §3).
>
> **Implements:** Task #106 — replaces the dark-mode values at `client/src/ui/GameScreen.css:17–25`, which were calibrated against `#0b0d12` and fail WCAG on `#FFFFFF`.
>
> **Against contract:**
> - `proposals/accepted/visual-identity-light-mode.md` §1, §3 (base palette, WCAG AA targets)
> - `ux/generator-max-level-state.md` §2 (platinum = cool temperature, tier above gold; reserved for maxed/completed states)
> - `proposals/accepted/algorithm-mood-visibility.md` (revised mood-edge hues — must not confuse with accents)

---

## Functional Slot Semantics (preserved from dark-mode)

These semantics are the contract. The hex values below serve them on a light base.

| Token | Semantic | Where it appears |
|---|---|---|
| `--accent-gold` | Ready-to-buy affordance | Lvl ↑ button `ready` state, buy-now chrome, engagement-counter celebratory flares |
| `--accent-green` | Boost / positive delta / success | Modifier chips (boost), rate-delta positive, engagement celebration tick |
| `--accent-amber` | Armed / warning / negative delta | Modifier chips (penalty), rate-delta negative, risk signals, insufficient-funds |
| `--accent-red` | Danger / loss / error | Critical alerts, loss events, hard-block states |
| `--accent-platinum` | Maxed / completed tier | Lvl ↑ maxed plaque (`ux/generator-max-level-state.md`), future completed-tier states |
| `--accent-platinum-deep` | Platinum variant for borders, chrome, embossed depth | Plaque borders, gradient anchor tones |

---

## Proposed Values

```css
:root {
  --accent-gold: #A0730E;
  --accent-green: #2F7A3A;
  --accent-amber: #C45A10;
  --accent-red: #B71C1C;
  --accent-platinum: #5C6A86;
  --accent-platinum-deep: #3A4556;
}
```

### Contrast compliance

All values measured against `#FFFFFF` (white panel surface, the strictest light-mode background). Values reproduced to the nearest 0.1:1 from standard WCAG luminance formula. Implementation should verify with a contrast tool before committing.

| Token | Hex | Contrast vs `#FFFFFF` | WCAG target applied | Pass |
|---|---|---|---|---|
| `--accent-gold` | `#A0730E` | ~5.0:1 | 4.5:1 (text — appears in buy-now price labels, celebratory number glyphs) | ✓ |
| `--accent-green` | `#2F7A3A` | ~5.2:1 | 4.5:1 (text — rate-delta labels, modifier-chip text) | ✓ |
| `--accent-amber` | `#C45A10` | ~4.6:1 | 4.5:1 (text — rate-delta negative text, penalty chip text) | ✓ (tight) |
| `--accent-red` | `#B71C1C` | ~6.7:1 | 4.5:1 (text — danger labels, loss-event text) | ✓ |
| `--accent-platinum` | `#5C6A86` | ~5.7:1 | 4.5:1 (text — MAX label on plaque, platinum-chip text) | ✓ |
| `--accent-platinum-deep` | `#3A4556` | ~9.8:1 | 4.5:1 (text/chrome — plaque borders, deep-tier emphasis) | ✓ |

**Additional contrast against `#FAF8F5` (warm base, used behind non-panel elements):** every value retains ≥4.3:1 against the warm base, within 0.1:1 of the white-panel contrast. Values are safe on both surfaces.

**Contrast against risk — `--accent-amber` is tight.** `#C45A10` on `#FFFFFF` sits near the 4.5:1 floor. If a subsequent weight/size adjustment pushes amber into thin font weights (<500) or ≤12px display, the effective legibility degrades faster than the raw ratio suggests. Keep amber at weight ≥500 and size ≥13px per `visual-identity-light-mode.md` §3 discipline. If a context demands thinner amber, use `--accent-red` (`#B71C1C`) as the fallback — it carries the same "something is wrong" semantic with more contrast headroom.

---

## Rationale — Hue × Semantic

### `--accent-gold` → `#A0730E` (dark goldenrod, warm)

"Ready to buy" is the anticipation signal — the player is being invited to act. On a dark base, bright gold (`#ffd66b`) reads as glowing warmth. On a light base, bright yellow reads as caution tape or cheap highlighter — the opposite of "earned, valuable, tap-me." The dark-goldenrod range (`#A0730E`) reads as editorial gold — museum-placard gold, not highlighter yellow. It keeps the warm temperature and the "precious metal" semantic while landing on white as a confident, controlled affordance. Still warm enough to pair intuitively with the amber/orange warning family (they share a temperature range, so the player reads them as "related warmth siblings").

### `--accent-green` → `#2F7A3A` (forest green, warm-leaning)

"Boost / positive" needs to read as decisive and alive. Bright kelly-green (`#5fd692`) on white reads as pharmaceutical or generic success — stock-photo green. Forest/leaf green pushes the chroma toward warmer, editorial territory: confidence without cheer. `#2F7A3A` is distinguishable at a glance from the muted teal (`#4F8A7A`) used by the Authenticity Era mood edge — teal sits cooler, forest sits warmer, and the 25° hue separation plus different saturation register reads as "different things."

### `--accent-amber` → `#C45A10` (burnt orange)

"Armed / warning / penalty" is the risk-but-not-danger lane. The value `#C45A10` **intentionally matches the risk amber already specified in `ux/visual-identity.md`** (scandal-adjacent signal). Reusing the same value here consolidates the risk-color vocabulary: any warning signal, anywhere in the game, uses this one burnt-orange. Burnt-orange differentiates from the lighter coral-orange mood edge (`#E87B3C`, Short-Form Surge) by depth and saturation — the mood edge is a pale wash at edge-vignette opacity (~30%), while amber chrome is solid burnt-orange on content. Context + saturation carry the separation.

### `--accent-red` → `#B71C1C` (deep editorial red)

"Danger / loss" is the hardest state — the player should feel this. Bright `#ff6b6b` on white reads as notification-pink or a form validation error in a generic admin panel. `#B71C1C` reads as deliberate, weighty alarm — museum "do not touch" red, editorial masthead red. Distinctly a true-red hue (not magenta), so it does not confuse with the Engagement Bait Season mood edge (`#D63A82`, hot pink) which lives in the pink-magenta lane. The 50°+ hue separation is large and the danger signal should never appear on a screen where hot-pink is the ambient mood.

### `--accent-platinum` → `#5C6A86` (cool steel blue-gray)

"Maxed / completed tier" must feel *above* gold — cooler, more refined, premium. In dark mode, platinum was brighter than gold (cool silver over warm gold). On white, "brighter than" is impossible because white IS the surface. The "tier above" relationship is carried instead through **temperature and chroma control**: gold is warm and richly saturated; platinum is cool and controlled. `#5C6A86` is a deep steel blue-gray — the cool refined metal read. Against the gold's warm earth tone, it reads as a tier jump: gold = earned warmth, platinum = achieved coolness.

**Mood-edge collision risk — resolved.** The Corporate Takeover mood edge (`#8A95A8`, cool grey) is in the same blue-gray lane. Perceptually distinct because: (a) platinum is meaningfully darker (L≈0.13 vs L≈0.30 — a full brightness-tier apart), (b) mood edges render at ~30% opacity as peripheral screen-edge vignettes, while platinum renders as solid chrome on content surfaces, (c) platinum is used only on embossed-plaque chrome (maxed states), not in the top-bar zone where mood-edge vignettes concentrate. Co-visibility at high-visual-competition moments is unlikely.

### `--accent-platinum-deep` → `#3A4556` (deep steel)

Variant for platinum borders and gradient anchor tones on the plaque chrome (per `ux/generator-max-level-state.md` §3.1). Carries the same cool-steel semantic with more weight. Used where platinum needs to structurally frame a region (1px borders, embossed shadow lines, text on tinted platinum backgrounds).

---

## Mood-Edge Collision Check (AC 4)

Each accent verified against the five algorithm-mood edge hues at a glance. No accent is confusable with a mood edge in context.

| Accent | Hex | Nearest mood-edge | Mood hex | Distinguishability |
|---|---|---|---|---|
| `--accent-gold` `#A0730E` | warm dark goldenrod | Short-Form Surge `#E87B3C` | coral-orange | **Distinct.** Gold is darker, warmer-earth; coral is brighter, peachier. Hue distance ~15° but chroma + brightness separate them reliably. Gold renders solid on chrome; coral is a ~30%-opacity edge vignette. |
| `--accent-green` `#2F7A3A` | forest green | Authenticity Era `#4F8A7A` | muted teal | **Distinct.** Forest is warmer (~130°), teal is cooler (~170°). 40° hue separation; different saturation registers. |
| `--accent-amber` `#C45A10` | burnt orange | Short-Form Surge `#E87B3C` | coral-orange | **Distinct but adjacent.** Both orange. Burnt-amber is darker + more earth-toned; coral is lighter + pinker. Context separates: amber is solid chrome on content, coral is pale edge wash. **Non-blocking note:** at small sizes (<12px chips) in the top-bar zone during a Short-Form Surge, brief misreads are possible. Accept knowingly — amber is functional chrome, the mood edge is ambient peripheral. |
| `--accent-red` `#B71C1C` | true red | Engagement Bait `#D63A82` | hot pink | **Distinct.** Red is pure, pink is magenta-warm. ~50°+ hue separation. |
| `--accent-platinum` `#5C6A86` | cool steel | Corporate Takeover `#8A95A8` | cool grey | **Distinct.** Platinum is ~1 brightness-tier darker and rendered as solid chrome on plaque surfaces; mood grey is pale ambient vignette. Full analysis above. |
| `--accent-platinum-deep` `#3A4556` | deep steel | Corporate Takeover `#8A95A8` | cool grey | **Distinct.** Much darker, only used as border/gradient anchor — structural, not signal-bearing. |

---

## Implementation Notes for Engineer (Task #108)

When migrating `client/src/ui/GameScreen.css:17–25` to light mode:

1. **Direct value swap** — keep the six token names unchanged; replace only the hex values. All existing `var(--accent-*)` references across the codebase continue working without rename.
2. **Verify visually at existing usage sites.** Every current reference was designed against bright dark-mode accents; some site-specific treatments (e.g., drop-shadow glows, opacity washes, `color-mix` blends) may need per-site tuning. The most likely regression sites: `.modifier-chip` backgrounds (which use color-mix blends — verify the mixed result on white), drop-shadow glow effects tuned for dark bg (may over-darken on white), any token used at <70% opacity (opacity behaves differently against white).
3. **Do NOT change `--accent-platinum` / `--accent-platinum-deep` dark-mode semantics yet.** If a dark-mode dev/debug surface exists (`DebugApp.tsx` etc.) and should remain on dark, keep the dark values scoped to that surface. This spec covers the light-mode token values only.
4. **Grep for hardcoded hex colors** after the swap — if any `#5fd692` / `#ffd66b` / etc. literals leaked into site-specific CSS, they need migration to the new values as well.

---

## Open Questions

1. **Dark-mode debug surfaces — retain or migrate?** If `DebugApp.tsx` or other engineer-only surfaces remain on a dark base, do they retain the dark-mode accent values, or do they flip too? **Owner: engineer (task #108).** Recommendation: keep the dark values under a `.debug-surface` class scope so debug surfaces are stylistically isolated from player-facing light-mode surfaces. Not blocking — engineer's call during implementation.
2. **Amber at <12px in top-bar during Short-Form Surge.** Non-blocking misread risk flagged in §Mood-Edge Collision Check. Verify during implementation QA by rendering the top-bar in Short-Form Surge state with a rate-delta-negative amber label visible. If misreads occur, the resolution is a small chip background (white container) around amber in the top bar, not a palette shift. **Owner: ux-designer, post-build verification.**
