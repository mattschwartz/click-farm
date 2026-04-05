# Lvl ↑ Button — Maxed State Visual Treatment

> **Scope:** Defines the visual treatment and arrival celebration for the per-row Lvl ↑ button when a generator hits its level cap (L=10 per task #89). Replaces the current dim-gold placeholder treatment at `GameScreen.css:2306–2316`.
>
> **Not in scope:** The maxed *classification logic* — already implemented in `classifyLvlBtnState` (`GeneratorList.tsx:78–91`). Generator-level progression or cost curves (see `proposals/accepted/generator-level-growth-curves.md`). Prestige/rebrand collection displays.
>
> **Against contract:** Task #69 — the three pre-existing affordance states (`dormant`, `armed`, `ready`) are preserved as-is. Only the fourth state (`maxed`) is redefined here. The `--accent-gold` token remains reserved exclusively for the ready-to-buy affordance signal.
>
> **Coordinated with:** game-designer (confirms trophy direction, rejects persistent animation — see §7 decision log).

---

## 1. The Problem

The current `maxed` treatment uses `--accent-gold` at 70% opacity. Two failures:

1. **Signal collision.** `--accent-gold` is the reserved color for the `ready` affordance state on the *same button*. A dimmed version of the same hue does not read as "completed" — it reads as "degraded ready," which is a failure mode, not a celebration.
2. **Flat payoff.** L=10 is the endpoint of a long cost curve. A slightly-faded gold line does not acknowledge what the player just did. The endowment effect is already at work; the visual should honor it.

**Desired read:** the button has transformed from an *action* into a *trophy*. It is no longer something to do — it is something earned. The player should feel "YAY" on arrival, and then feel quiet pride on every subsequent glance.

---

## 2. Design Direction

**Metaphor:** platinum plaque, not button.

**Color:** a new reserved token `--accent-platinum`. Cool silver-white, deliberately positioned as *the tier above gold*. Platinum is culturally the tier-above-gold (records, cards, trophies) and — critically — its cool temperature contrasts every warm affordance signal on the screen (gold-ready, amber-armed, amber-penalty-chip, viral-gold-glow). It cannot be confused with a live affordance.

**Shape language:** the button stops reading as pressable. Inset shadow (not raised), subtle vertical gradient to suggest embossed metal, thin 1px top-edge highlight. A plaque screwed onto the row, not a button sitting on it.

**Glyph:** replace the `↑` chevron (`.lvl-chevron`) with a **crown** glyph (`♛` or an inline SVG, see §3.2). The `↑` says "there is more above." At max, there isn't. The crown says "this is the top."

**Label text:** the current "MAX" (at `GeneratorList.tsx:450`) is kept — the crown glyph + "MAX" text is the non-color accessibility pairing (§6).

---

## 3. Visual Spec

### 3.1 Token

Add to `:root` in `GameScreen.css`:

```css
--accent-platinum: #d9dee8;
--accent-platinum-deep: #a6b0c2;  /* for gradient bottom + borders */
```

**Contrast check:** `#d9dee8` on `#0b0d12` ≈ 13:1 — passes text (4.5:1) and UI component (3:1) with substantial headroom. `#a6b0c2` on `#0b0d12` ≈ 7.5:1 — passes both.

**Reserved usage:** `--accent-platinum` is reserved for "maxed/completed" states across the app. Do NOT reuse it for generic cool-grey UI. First use is this spec; future maxed states (clout shop items, fully-upgraded meta progression) should pull from this token.

### 3.2 Static treatment

Replace the existing `.row-btn-upgrade.row-btn-lvl-maxed` rules (lines 2308–2316) with:

```css
/* Maxed — cap reached. Platinum plaque, inset, unpressable-looking.
   --accent-gold is reserved for the ready-to-buy signal on this same
   button, so maxed MUST use a distinct, cooler token. */
.row-btn-upgrade.row-btn-lvl-maxed {
  cursor: default;
  border: 1px solid var(--accent-platinum-deep);
  background: linear-gradient(
    to bottom,
    rgba(217, 222, 232, 0.14) 0%,
    rgba(217, 222, 232, 0.06) 100%
  );
  box-shadow:
    inset 0 1px 0 0 rgba(255, 255, 255, 0.18),   /* top-edge highlight */
    inset 0 0 0 1px rgba(11, 13, 18, 0.25);       /* inset depth */
  color: var(--accent-platinum);
  font-weight: 600;
  letter-spacing: 0.08em;
  /* No animation. Arrival celebration is one-shot — see §4. */
}

.row-btn-upgrade.row-btn-lvl-maxed .label {
  color: var(--accent-platinum);
}

/* Crown glyph replaces the ↑ chevron at max.
   Inline in the .label span before "LVL" text. */
.row-btn-upgrade.row-btn-lvl-maxed .lvl-crown {
  display: inline-block;
  font-size: 10px;
  margin-right: 3px;
  color: var(--accent-platinum);
  /* Slight vertical nudge to optically center the crown with caps. */
  transform: translateY(-0.5px);
}

/* No hover affordance — the button is not actionable at max.
   Retain cursor: default, suppress any :hover scale/glow. */
.row-btn-upgrade.row-btn-lvl-maxed:hover {
  background: linear-gradient(
    to bottom,
    rgba(217, 222, 232, 0.14) 0%,
    rgba(217, 222, 232, 0.06) 100%
  );
  box-shadow:
    inset 0 1px 0 0 rgba(255, 255, 255, 0.18),
    inset 0 0 0 1px rgba(11, 13, 18, 0.25);
}
```

**Handler note:** the button remains in the DOM and keeps whatever click handler already exists, but because it is no longer actionable, `disabled` SHOULD be applied (mirroring `dormant`). Confirm existing behavior in `GeneratorList.tsx` around line 421 — if the drawer still opens on click at max (to show already-owned levels), keep it clickable and omit `disabled`. Default: **apply `disabled`** unless there is a demonstrated UX reason to let the drawer open at max.

### 3.3 Where the crown glyph goes

In `GeneratorList.tsx`, the existing chevron pattern (from task #69) renders a `<span class="lvl-chevron">` inside the `.label` span for the `ready` state. Mirror it: render a `<span class="lvl-crown">♛</span>` before the "LVL" text when `lvlState === 'maxed'`.

Glyph character: `♛` (U+265B, BLACK CHESS QUEEN). Renders consistently across system fonts. If render inconsistency shows up in QA, fall back to an inline SVG crown — 10×8px viewBox, single path, `fill="currentColor"`.

---

## 4. Motion — Arrival Only

**The "YAY" is a moment, not a state.** The arrival celebration fires **once** on the frame the state transitions to `maxed`, then the plaque is static forever after.

### 4.1 Trigger

In `GeneratorRow`, keep a `useRef<LvlBtnState | null>(null)` tracking the previous `lvlState`. When the current `lvlState === 'maxed'` and `prev !== 'maxed'` and `prev !== null` (avoid firing on mount for already-maxed generators after reload), apply a `lvl-maxed-arrival` class to the button for 600ms, then clear it.

**Mount guard:** on initial render after a save load, already-maxed rows MUST NOT fire the celebration. The celebration only fires on the live `ready` → `maxed` transition within a session.

### 4.2 Celebration sequence

```css
/* One-shot: fires the instant a generator hits max. 600ms total. */
.row-btn-upgrade.row-btn-lvl-maxed.lvl-maxed-arrival {
  animation: lvl-maxed-arrival 600ms ease-out;
}

@keyframes lvl-maxed-arrival {
  0% {
    transform: scale(1);
    box-shadow:
      inset 0 1px 0 0 rgba(255, 255, 255, 0.18),
      inset 0 0 0 1px rgba(11, 13, 18, 0.25),
      0 0 0 0 rgba(217, 222, 232, 0);
  }
  30% {
    transform: scale(1.08);
    box-shadow:
      inset 0 1px 0 0 rgba(255, 255, 255, 0.35),
      inset 0 0 0 1px rgba(11, 13, 18, 0.25),
      0 0 20px 4px rgba(217, 222, 232, 0.55);
  }
  60% {
    transform: scale(0.98);
    box-shadow:
      inset 0 1px 0 0 rgba(255, 255, 255, 0.22),
      inset 0 0 0 1px rgba(11, 13, 18, 0.25),
      0 0 12px 2px rgba(217, 222, 232, 0.30);
  }
  100% {
    transform: scale(1);
    box-shadow:
      inset 0 1px 0 0 rgba(255, 255, 255, 0.18),
      inset 0 0 0 1px rgba(11, 13, 18, 0.25),
      0 0 0 0 rgba(217, 222, 232, 0);
  }
}
```

**Scale curve:** 1.0 → 1.08 → 0.98 → 1.0. The small overshoot past 1.0 and undershoot below feel like the plaque was *stamped into place*.

**Outer glow:** the `0 0 20px 4px` platinum halo is the visual "pop" — it extends past the button edge for a beat, then retracts.

**Sound (out of scope for this task but flag for audio):** a satisfying tick/chime on arrival. Coordinate with audio pass when it runs.

### 4.3 No persistent animation

This is deliberate. The game-designer was explicit: a persistent shimmer would compete with the `ready`-state breathing halo — which is the most important live signal on the screen. A non-actionable row must never pull focus from a row the player can actually buy from. The plaque is static after arrival and stays that way for the rest of the run.

---

## 5. Reduced Motion

Under `@media (prefers-reduced-motion: reduce)` and `html[data-reduce-motion="true"]`:

- The arrival celebration is **removed entirely.** No scale, no halo.
- The state change is communicated by the static visual differences alone (crown glyph, platinum color, plaque treatment, "MAX" text replacing the cost).
- The player still sees the transition — they just don't see the animation.

```css
@media (prefers-reduced-motion: reduce) {
  .row-btn-upgrade.row-btn-lvl-maxed.lvl-maxed-arrival {
    animation: none;
  }
}

html[data-reduce-motion="true"] .row-btn-upgrade.row-btn-lvl-maxed.lvl-maxed-arrival {
  animation: none;
}
```

---

## 6. Accessibility

**Color-independence:** maxed is distinguishable without color via:
- The **crown glyph** (`♛`) — unique across states (dormant has no glyph, armed has `⊖`, ready has `▲`, maxed has `♛`).
- The **"MAX" text** replacing the numeric cost — a hard textual tell.
- The **inset shadow** — maxed is the only state that looks recessed rather than flat or raised.
- The **letter-spacing 0.08em** — visibly wider tracking than other states.

**Tooltip:** existing aria-label `"{name} is at max level (L{level})"` (`GeneratorList.tsx:433–434`) is kept as-is. No change needed.

**Cursor:** `default` — distinct from `not-allowed` (dormant), `pointer` (armed/ready), and reinforces the non-actionable read.

**Contrast matrix:**

| Element | Color | Against | Ratio | Requirement | Pass |
|---|---|---|---|---|---|
| .label text | `#d9dee8` | `#0b0d12` | ~13:1 | 4.5:1 | ✅ |
| "MAX" numeral text | `#d9dee8` | `#0b0d12` | ~13:1 | 4.5:1 | ✅ |
| Border | `#a6b0c2` | `#0b0d12` | ~7.5:1 | 3:1 | ✅ |
| Crown glyph | `#d9dee8` | `#0b0d12` | ~13:1 | 3:1 (UI) | ✅ |

---

## 7. Decision Log

**Gold vs platinum (resolved — platinum).** Initial draft proposed foil-gold. Rejected because `--accent-gold` is the reserved ready-to-buy signal on the same button. Platinum is positioned as the tier-above-gold and is cool-temperature, which contrasts every warm affordance signal on the screen.

**Persistent shimmer vs one-shot (resolved — one-shot only).** Game-designer verdict: persistent looping gold sweep would compete with the ready-state breathing halo — the single most important live signal on screen. "Players will look where motion is, and motion on a dead button teaches the wrong lesson." The "YAY" lives in the arrival moment; after that, the plaque is quiet.

**Maxed-as-collection reading (resolved — yes, with restraint).** Game-designer confirms maxed generators should read as visible proof of mastery. A completed row implicitly asks "what's the next one?" — this pulls the eye forward toward the next generator. The visual treatment honors the endowment effect without demanding attention.

---

## 8. Open Questions

1. **Should the maxed button remain clickable to open the drawer showing owned levels, or should it be fully `disabled`?** Default: `disabled`. Rationale: nothing actionable inside the drawer at max. If engineer finds the drawer contains useful review info (owned-levels breakdown, current rate contribution), flag to ux-designer to reconsider. — owner: engineer to observe existing drawer contents at max.
2. **Does the arrival celebration need an audio tick?** Out of scope for this task; flag for audio pass. — owner: game-designer or audio owner.
3. **Should the crown glyph use `♛` or a dedicated inline SVG from the start?** Default: `♛`. If QA shows inconsistent rendering across OS font stacks, switch to inline SVG. — owner: engineer to verify cross-platform render during build.
