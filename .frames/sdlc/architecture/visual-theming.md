# Visual Theming Architecture

> **Scope:** Defines the CSS token taxonomy, token-file location, mood-edge runtime binding mechanism, and the vignette layer's DOM/prop contract. Covers exactly what `visual-identity-light-mode` and `algorithm-mood-visibility` require, plus the minimum seam to swap palettes in a v2 dark-mode retrofit.

> **Not in scope:** Exact hex values beyond what the source proposals already specify, typography tokens (already defined in `index.css` and owned by `typography-system.md`), motion choreography, accent-tint wash (Phase 2 of `algorithm-mood-visibility` — deferred), panel shadow styling beyond naming a token slot.

> **Source proposals:** `.frames/sdlc/proposals/accepted/visual-identity-light-mode.md`, `.frames/sdlc/proposals/accepted/algorithm-mood-visibility.md`.

---

## Framing

The codebase currently declares ad-hoc CSS custom properties at the top of `client/src/ui/GameScreen.css` (`:root { --bg-base, --panel-bg, --panel-border, --text-p0..p3, --accent-* }`). The names are component-local and palette-coupled — `--bg-base` is both "the thing components reference" *and* "a raw hex value." There is no semantic tier, no place to bind per-algorithm-state mood colors, and no structural seam for a theme swap.

This spec formalizes a **two-tier token system** that reads semantic at the component boundary and palette at a single file. The light-mode palette drops in behind that semantic layer. A v2 dark-mode retrofit is a one-file swap — not a component rewrite.

---

## Data Model

### Token Tiers

Two tiers. Components reference only Tier 2. Tier 1 is palette-internal.

**Tier 1 — Palette (raw values).** Hex literals, opacity numbers, and per-state palette entries. Defined in one place. Components MUST NOT reference these directly.

**Tier 2 — Semantic tokens.** What components consume. Every name describes a role, not a value: `--surface-canvas` not `--warm-white`; `--text-primary` not `--near-black`. The binding from palette → semantic happens in the token file, not at the call site.

### Semantic Token Slots

The following semantic tokens MUST exist. Components reference these and only these.

**Surfaces:**

| Token | Light-mode binding | Purpose |
|-------|-------------------|---------|
| `--surface-canvas` | `#FAF8F5` | Root page background. The warm near-white. |
| `--surface-panel` | `#FFFFFF` | Cards, panels, contained elements. |
| `--surface-overlay` | `#FFFFFF` | Modals, sheets, floating surfaces. |

**Text:**

| Token | Light-mode binding | Contrast (on `--surface-panel`) |
|-------|-------------------|---------------------------------|
| `--text-primary` | `#1A1A1A` | 17.4:1 — AAA |
| `--text-secondary` | `#6B6B6B` | 5.0:1 — AA |
| `--text-receded` | `#9B9B9B` | 2.8:1 — UI component only (1.4.11) |
| `--text-inverse` | `#FFFFFF` | Used on colored or dark chrome surfaces |

`--text-receded` fills the slot that `--text-p3` held in the dark-mode scheme (labels that are present-but-quiet). It does not meet 4.5:1 AA body text contrast and MUST only be used where the current dark-mode code uses `--text-p3` (receded metadata, inactive states).

**Borders:**

| Token | Light-mode binding | Purpose |
|-------|-------------------|---------|
| `--border-default` | `#E8E4DF` | Standard dividers, panel borders. |
| `--border-subtle` | `#F0ECE7` | Quieter separation where `--border-default` is too assertive. |

**Accents (carried through, may need re-tuning for light contrast):**

| Token | Binding | Notes |
|-------|---------|-------|
| `--accent-gold` | `#ffd66b` → tune | Affordance "ready." Current value is dark-mode-tuned; verify contrast on `--surface-panel`. |
| `--accent-green` | `#5fd692` → tune | Success, confirmation. Same note. |
| `--accent-amber` | `#ffb347` → tune | Armed, attention. |
| `--accent-red` | `#ff6b6b` → tune | Danger, error. |
| `--accent-platinum` | `#d9dee8` | Maxed/completed. Cool, stays cool on light base. |
| `--accent-platinum-deep` | `#a6b0c2` | Platinum deep tier. |

Engineer MUST verify each `--accent-*` passes 3:1 UI-component contrast on `--surface-panel` in-browser. If not, retune the Tier-1 palette value — no component changes.

**Algorithm mood (runtime-bound):**

| Token | Binding | Purpose |
|-------|---------|---------|
| `--mood-color-edge` | per-state (see below) | Current mood vignette color. Consumed by `.algorithm-vignette` gradient. |
| `--mood-edge-opacity` | per-state `{0.14 .. 0.22}` | Base opacity for the current mood's vignette. Multiplied by instability at the component. |

The per-state palette entries that these resolve to are the values named in `algorithm-mood-visibility` — `#E87B3C`, `#4F8A7A`, `#D63A82`, `#7A4FA8`, `#8A95A8`, with per-state opacities. See **Mood-Edge Binding Mechanism** for how they are bound.

**Elevation (new slot, flagged):**

| Token | Purpose |
|-------|---------|
| `--panel-shadow` | Box-shadow specifier giving panels lift against `--surface-canvas`. Light mode relies on shadow + border for lift (panels are opaque white on warm-white), not on contrast against a dark base. |

Value deferred to UX; named here so the slot exists and components can reference it without waiting.

---

## Token Location

**Decision:** A new file at `client/src/theme/tokens.css`, imported from `client/src/main.tsx` (or `index.css`) at app boot, before any component styles load.

**Rationale:**

1. **Separation of concerns.** `index.css` carries typography faces, font-face declarations, `color-scheme`, and `body` reset — foundational, theme-agnostic. `GameScreen.css` is component-scoped (core game screen). Neither is the right home for the theme system.
2. **Single source of truth.** All Tier-1 palette values and all Tier-2 semantic bindings live in one file. A reader answers "what is `--surface-panel`?" by opening one file.
3. **Dark-mode seam is obvious.** A future `[data-theme="dark"]` block sits in the same file alongside the default light bindings. No component edits.
4. **Removes the `:root` block from `GameScreen.css`.** That block's tokens (`--bg-base`, `--panel-bg`, `--panel-border`, `--text-p0..p3`, `--accent-*`) are deleted — they are replaced by the semantic tokens in `tokens.css`. Component rules in `GameScreen.css` are updated to reference semantic names (e.g. `color: var(--text-primary)` instead of `color: var(--text-p0)`).

**File structure of `tokens.css`:**

```css
/* Tier 1 — palette (raw values, internal). */
:root {
  /* Base palette */
  --palette-warm-white: #FAF8F5;
  --palette-white: #FFFFFF;
  --palette-near-black: #1A1A1A;
  /* ...etc */

  /* Mood-edge palette, per state */
  --palette-mood-short-form-surge: #E87B3C;
  --palette-mood-authenticity-era: #4F8A7A;
  /* ...etc */
}

/* Tier 2 — semantic bindings (what components consume). */
:root {
  --surface-canvas: var(--palette-warm-white);
  --surface-panel: var(--palette-white);
  --text-primary: var(--palette-near-black);
  /* ...etc */
}

/* Tier 2 — per-algorithm-state mood binding. */
:root[data-algorithm-state="short_form_surge"] {
  --mood-color-edge: var(--palette-mood-short-form-surge);
  --mood-edge-opacity: 0.18;
}
:root[data-algorithm-state="authenticity_era"] {
  --mood-color-edge: var(--palette-mood-authenticity-era);
  --mood-edge-opacity: 0.18;
}
/* ...etc, five states */
```

The Tier-1 / Tier-2 split exists within the same file; they are logically distinct but physically colocated so a palette change is one edit.

---

## Mood-Edge Binding Mechanism

**Decision:** A `data-algorithm-state` attribute on the document root element (`<html>`). React writes this attribute from the current `AlgorithmState.current_state_id`. CSS selectors in `tokens.css` bind the correct Tier-1 palette entry to the `--mood-color-edge` and `--mood-edge-opacity` semantic tokens for that state.

**Why a root-level data attribute, not a React prop passed to the vignette:**

1. **Tokens belong in CSS.** The per-state palette values are theme data, not component state. Expressing them as CSS selectors keeps the token file authoritative and makes the five-state mapping inspectable in one place.
2. **Transitions are CSS-native.** The vignette element applies `transition: background 400ms ease-in-out` on its gradient, and because `--mood-color-edge` resolves to a concrete color at paint time, the crossfade is handled by the browser without React timing logic. (See **Vignette Layer Contract** for the transition caveat.)
3. **Multiple consumers.** Future components (chrome accents, indicator colors) may also read `--mood-color-edge`. A root-level attribute binding makes it universally available; a prop binding would require threading through every subtree.

**The write path:**

`AlgorithmBackground` (or an ancestor — engineer's call) holds a `useEffect` that writes `document.documentElement.dataset.algorithmState = algorithm.current_state_id` whenever `current_state_id` changes. No runtime hex manipulation — React only names the state; CSS resolves the palette.

**Viral burst override:** The viral burst does NOT flip `data-algorithm-state`. It is a transient override driven by React on the vignette element directly, because the burst color is dynamic (platform-affinity) and the phase state machine is React-owned. See **Vignette Layer Contract** below.

**Why not a CSS class?** A data attribute and a CSS class are functionally equivalent here. The data attribute is chosen because it semantically encodes "current state of a thing" rather than "style variant" — the attribute name states *what* is bound, which matters when a future dev greps for where algorithm state leaks into styling.

---

## Interface Contracts

### Vignette Layer — DOM Contract

The vignette is a React component rendered by `AlgorithmBackground`. Per `algorithm-mood-visibility` OQ1, it is a `<div>`, not a pseudo-element. Its DOM shape:

```html
<div
  class="algorithm-vignette"
  style="opacity: <computed>"
  aria-hidden="true"
/>
```

**CSS shape** (in `GameScreen.css` or a new `AlgorithmBackground.css`):

```css
.algorithm-vignette {
  position: fixed;
  inset: 0;
  z-index: 0;                  /* above background (-1 or 0), below panels (1+) */
  pointer-events: none;
  background: radial-gradient(
    ellipse 120% 100% at 50% 50%,
    transparent 40%,
    var(--mood-color-edge) 100%
  );
  transition: background 400ms ease-in-out, opacity 400ms ease-in-out;
}
```

**Layering requirement:** The vignette MUST sit above `.algorithm-background` and below `.game-screen` (panels). Current `.algorithm-background` is `z-index: 0` and `.game-screen` is `z-index: 1`. The vignette at `z-index: 0` (after the background in DOM order) or a dedicated `z-index` slot like `0` (if background is moved to `-1`) is acceptable. Engineer MUST NOT introduce a new stacking context on `.game-screen`'s ancestors that would trap the vignette underneath the background.

**Rendered by:** `AlgorithmBackground` component. Whether nested inside `.algorithm-background` or returned as a sibling via a fragment is engineer's call — both are valid. Nesting keeps the z-index relationship local; sibling keeps each element's purpose single.

### Vignette Layer — Props Contract

```typescript
interface AlgorithmVignetteProps {
  /**
   * Base opacity for the current mood, read by the component but derived
   * from the CSS var by convention. Passed explicitly so the instability
   * multiplication and viral burst override can be computed in React.
   * Source: the per-state opacity in the `ALGORITHM_MOOD` record, or
   * read from `getComputedStyle(root).getPropertyValue('--mood-edge-opacity')`.
   */
  baseOpacity: number;         // 0.14–0.22

  /**
   * 0 (no instability) to 1 (maximum). Scales opacity by ×(1 + 0.2 × factor).
   * Already computed by AlgorithmBackground — pass through.
   */
  instabilityFactor: number;   // [0, 1]

  /**
   * When set, overrides the mood color with the platform-affinity color
   * for the burst's duration. Phase timing is React-owned.
   */
  viralBurst?: {
    color: string;             // hex, e.g., "#D63A82" — platform affinity color
    phase: 'entering' | 'peak' | 'exiting';
  };
}
```

**Computed effective opacity:**

```
effectiveOpacity = baseOpacity * (1 + 0.2 * instabilityFactor)
```

Applied as `style={{ opacity: effectiveOpacity }}`.

**Viral burst override mechanism:** When `viralBurst` is set, the vignette renders the burst color *instead of* `var(--mood-color-edge)`. Two viable implementations:

1. **Inline style override** (recommended). The component writes `style={{ background: <burst-gradient> }}` while burst is active, overriding the CSS-var gradient. Exit restores the inline style to `undefined`, handing control back to CSS.
2. **Second stacked `<div>`** — a burst-only vignette div rendered on top of the mood vignette, crossfading in via its own opacity. More elements, but separates concerns. Acceptable if engineer prefers.

**Viral burst phase timing (recap from source proposal):**
- `entering` — 300ms crossfade from mood color to burst color
- `peak` — 2-second pulse cycle at the mood vignette's current computed opacity
- `exiting` — 400ms crossfade back to mood color

React owns these phase transitions. The vignette component consumes `phase` as a prop — upstream state decides when each phase begins. The vignette MUST NOT internally time-out phases; it is a presentation primitive.

### AlgorithmBackground — updated responsibility

The existing component already receives `algorithm`, `now`, `intervalMs`, `viralActive`. After this spec is implemented, it ALSO:

1. Writes `document.documentElement.dataset.algorithmState = algorithm.current_state_id` via `useEffect`.
2. Renders the `<AlgorithmVignette>` child with computed `baseOpacity`, `instabilityFactor`, and (if applicable) `viralBurst`.
3. Reads `baseOpacity` from `ALGORITHM_MOOD[current_state_id].moodEdgeOpacity` (new field; see below).

### `ALGORITHM_MOOD` record — field additions

`client/src/ui/display.ts` currently carries `ALGORITHM_MOOD` with `{ name, background, cycleSeconds, tagline }`. Add two fields:

| Field | Type | Notes |
|-------|------|-------|
| `moodEdgeColor` | `string` (hex) | The per-state edge color. Redundant with `--palette-mood-*` in CSS — both exist because React needs the value at runtime for viral-burst override composition, and CSS needs it for the gradient binding. Both reference the same canonical table (see Coupling). |
| `moodEdgeOpacity` | `number` | Base opacity, `[0.14, 0.22]`. |

`background` (the full-screen drift gradient) is retained for the ambient layer beneath the vignette. The gradient's colors can optionally be rebound to light-mode palette entries as a follow-up — that is a display-tuning task, not an architecture concern.

---

## Coupling Analysis

### Components → Semantic Tokens

**Dependency:** Every component that renders visual surface, text, or chrome references `var(--surface-*)`, `var(--text-*)`, `var(--border-*)`, or `var(--accent-*)`.

**Interface:** CSS custom property lookups. No JS involvement.

**What breaks if this changes:** Renaming a semantic token requires updating every call site. Mitigation: semantic names are stable by definition — they describe roles, and roles rarely change. Adding new semantic tokens is additive and safe.

### Semantic Tokens → Palette

**Dependency:** Each Tier-2 semantic token is bound to a Tier-1 palette entry inside `tokens.css`.

**Interface:** `var(--palette-*)` references, co-located.

**What breaks if this changes:** Changing a palette value changes every consumer. That is the point. Renaming a palette token is a one-file edit and cannot leak because components never see palette names.

### Mood-Edge CSS Binding ↔ `ALGORITHM_MOOD` Record

**Dependency:** The per-state palette values in `tokens.css` (CSS) and the `moodEdgeColor` / `moodEdgeOpacity` fields in `display.ts` (TypeScript) hold the same logical data. If they diverge, the vignette's transition color and its viral-burst override color could disagree.

**Interface:** Convention and documentation. Not enforced by the type system.

**What breaks if this changes:** If only one side is updated, the vignette shows one color during mood stability and a different color at the moment a burst fires (because burst composition uses the JS value). Mitigation options:

1. **Single source of truth in TypeScript.** `ALGORITHM_MOOD` is authoritative, and `tokens.css` is generated from it at build time, or the Tier-1 palette declarations in `tokens.css` are scaffolded from the same static-data table.
2. **Single source of truth in CSS.** The React side reads `getComputedStyle(document.documentElement).getPropertyValue('--mood-color-edge')` at burst time to get the current mood color, then composes over it.
3. **Accept duplication.** Document it in `display.ts` with a `// MUST match tokens.css` comment and rely on review discipline.

**Recommendation:** Option 3 for now. Five entries is cheap to keep aligned manually. Option 1 becomes worthwhile if the palette grows to dozens of entries. This is a ~**flagged duplication** — acknowledged and bounded, not a structural concern at v1 scale.

### Dark-Mode Retrofit Inversion Points

When a v2 theme swap is attempted, these tokens SWAP (get re-bound to dark-palette entries under a `[data-theme="dark"]` root selector):

- All `--surface-*` tokens
- All `--text-*` tokens
- All `--border-*` tokens
- `--mood-edge-opacity` values per state (dark mode historically used ~0.28–0.32; light mode uses 0.14–0.22 — this is the load-bearing difference in intensity)
- The per-state `--palette-mood-*` entries (dark-mode hues are deeper/more saturated — see the pre-revision table in `algorithm-mood-visibility`'s history)
- Corporate Takeover's palette entry specifically (light: drained cool grey `#8A95A8`; dark: darkest-of-the-five)
- `--panel-shadow` (dark panels rely on translucency + glow, not drop shadow)
- Potentially `--accent-*` values (contrast compliance differs — may need retuning)

These STAY (identity-bearing, theme-agnostic):

- Typography tokens (`--font-ui`, `--font-voice`)
- Motion / timing constants (400ms crossfade, instability factor math, viral burst phase durations)
- Viral burst color (determined by platform identity, not theme)
- The vignette DOM structure, CSS gradient shape, and prop contract
- `AlgorithmBackground`'s data-attribute write path
- `--accent-platinum` and `--accent-platinum-deep` (deliberately cool, reads correctly on both bases)

**The seam is `tokens.css`.** A dark-mode retrofit adds a second set of Tier-1 palette entries and a second block of Tier-2 bindings gated on `[data-theme="dark"]`. Component code does not change. `AlgorithmBackground` does not change. The vignette does not change.

---

## Open Questions

1. **Should `--mood-color-edge` be expressed as a solid hex color with a separate opacity token, or as a pre-composed `rgba()` baked into the palette entry?** This spec chooses solid hex + separate opacity because the instability multiplier scales opacity at runtime and cleaner composition is achieved when opacity is a number, not baked into a color. Confirm with engineer during implementation — if the CSS-side transition between two `rgba()` values turns out cleaner than the hex + opacity split, the palette can flip. **Owner: engineer (during build).**

2. **Should `--accent-*` values be retuned for contrast on `--surface-panel`, or kept as-is?** The current values (`#ffd66b`, `#5fd692`, etc.) were tuned against a dark base. They may read too light/bright on white panels. Engineer MUST verify in-browser; retuning is a palette change (Tier-1), not an architectural change. Not a blocker for this spec. **Owner: engineer (verify) → ux-designer (retune if needed).**

3. **Should the Tier-1 palette live in `tokens.css` as raw hex values, or be generated from a TypeScript source of truth (`display.ts` / a new `theme/palette.ts`)?** This spec places it in `tokens.css` for v1 simplicity. A generated approach becomes valuable if the palette grows or if runtime theme switching is added. Not a blocker. **Owner: engineer (call at build time).**

4. **Does `--panel-shadow` need to be specified in this spec, or left for UX to define separately?** This spec names the token slot but does not define its value. A shadow value is a visual-design call (depth, directionality, softness), and the vignette architecture does not care what the shadow is — only that panels have lift. **Owner: ux-designer (value) — out of this spec's scope.**

---

## Assumptions

1. **Single shipped theme at v1.** Light mode is the only theme. No runtime theme switching, no OS-preference detection, no user-selectable dark mode. The `[data-theme]` attribute hook is reserved as a retrofit seam but is not populated at v1. **Load-bearing: if runtime theme switching is added at v1, the binding strategy for per-state mood colors may need revisiting — switching `[data-theme]` and `[data-algorithm-state]` independently is supported by the current design, but needs a test pass.**

2. **`data-algorithm-state` on `<html>` is available.** No framework or SSR layer is rewriting this attribute or colliding with it. (The codebase is Vite + React client-only — safe.)

3. **Five algorithm states.** The mood-edge binding table enumerates five `[data-algorithm-state="..."]` selectors. Adding a sixth state requires one new Tier-1 palette entry and one new Tier-2 binding block — purely additive. **Not load-bearing.**

4. **No CSS-in-JS.** Components declare styles in `.css` files. If this changes to styled-components / emotion, the Tier-2 tokens are still accessible via `var()` in template strings, but the separation between palette and semantic layers depends on developer discipline, not file structure.

5. **CSS custom properties cascade as expected.** `:root[data-algorithm-state="..."]` is higher-specificity than `:root`, so the mood-token bindings override the default (undefined) values. A `@property` registration is NOT required for v1 because transitions on the gradient's background (not on the custom property itself) work without it.
