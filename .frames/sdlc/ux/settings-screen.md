# Settings Screen — UX Spec

> **Scope:** A utility screen covering Reduce Motion, audio toggles, and save management. Emotional bar is low — this is not a destination, it's a maintenance surface. But Reduce Motion has real accessibility weight and must be specified precisely.
>
> **Not in scope:** Game balance toggles, cheat/debug menus, cloud sync (server deferred per `architecture/core-systems.md`).
>
> **Against contract:** `architecture/core-systems.md` — Save Module (serialize/deserialize, localStorage).
>
> **Related:** `ux/core-game-screen.md` §12 (Reduce Motion expectations), `ux/prestige-rebrand-screen.md` §7 (Reduce Motion in ceremony), `ux/purchase-feedback-and-rate-visibility.md` §10 (breathing pulse alt).

---

## Decisions Taken in This Spec

1. **Settings is a modal, not a route.** Same surface grammar as the Clout Shop — the game keeps running in the background. Settings is never a context switch.
2. **One settings modal with three sections, not tabs.** At current scope (three sections, two–four controls each) tabs add navigation without earning it. Vertically scrolling sections are simpler and accessible.
3. **Reset Game has a two-step confirmation.** Every other destructive action in the game has soft consequences; this one destroys the entire save. Two steps is correct.
4. **No separate sound volume sliders.** One master audio toggle (on/off). A volume slider is out-of-scope for a satirical clicker — players who need fine volume control have OS-level controls.
5. **Access point: gear icon, top-right of top bar.** Standard convention. Doesn't compete with currency or algorithm state.

---

## 1. Access Point

A small gear icon sits in the **far top-right corner of the main screen's top bar**.

- **Size:** 24×24px glyph, 44×44px hit area
- **Contrast:** 4.5:1 at rest, 7:1 on hover (P2 treatment)
- **Position:** past the Followers count, flush right
- **Tap:** opens Settings modal (§2)

Also reachable via **keyboard shortcut**: Esc when no modal is open opens Settings. (Esc when a modal is open closes that modal.)

**Why not in the prestige cluster:** settings is orthogonal to the prestige system. Grouping them would imply relationship.

---

## 2. Layout

Modal, centered, ~520×620px. Backdrop dims main screen to ~30% opacity. Game continues running behind it.

```
┌──────────────────────────────────────────┐
│  Settings                           [×]  │
├──────────────────────────────────────────┤
│                                          │
│   MOTION                                 │
│   ┌────────────────────────────────┐    │
│   │  Reduce Time Pressure   [  ●] │    │  ← toggle
│   │  Doubles the scandal decision  │    │
│   │  window. For players who find  │    │
│   │  the countdown stressful.      │    │
│   ├────────────────────────────────┤    │
│   │  Reduce Motion          [  ●] │    │  ← toggle
│   │  Replaces decorative motion    │    │
│   │  with static alternatives.     │    │
│   │  Number animations preserved.  │    │
│   └────────────────────────────────┘    │
│                                          │
│   AUDIO                                  │
│   ┌────────────────────────────────┐    │
│   │  Sound                  [●  ] │    │  ← toggle
│   └────────────────────────────────┘    │
│                                          │
│   SAVE                                   │
│   ┌────────────────────────────────┐    │
│   │  [  Export Save  ]             │    │
│   │                                │    │
│   │  [  Import Save  ]             │    │
│   │                                │    │
│   │  [  Reset Game  ]  ← danger    │    │
│   └────────────────────────────────┘    │
│                                          │
└──────────────────────────────────────────┘
```

**Close affordances:** ×, Esc, backdrop click. All close without changes (settings persist immediately on toggle/action, not on close).

---

## 3. Motion Section

### 3.1 Reduce Time Pressure toggle

- **Control:** standard toggle switch, on/off
- **Default:** off
- **Behavior:** when enabled, doubles the scandal decision window from its default (10–15s) to 20–30s. The read beat (1–2s flavor text hold) is unchanged.
- **Persistence:** stored in save state, applies immediately on toggle

**Why this is in Motion, not Accessibility as a separate section:** time pressure is intimately connected to anxiety, which is also the driver behind reducing motion. Players who experience anxiety from motion are likely to be the same players for whom 10–15s decision windows are stressful. They belong in the same control cluster.

**Description text under toggle:**
> Doubles the scandal decision window. For players who find the countdown stressful.

**Note:** this toggle only affects scandal modals. No other time-pressured surface exists at current scope.

### 3.2 Reduce Motion toggle

- **Control:** standard toggle switch, on/off
- **Default:** off (honors OS `prefers-reduced-motion` if detectable — set initial state to match OS preference, then let user override)
- **Persistence:** stored in save state, applies immediately on toggle

### 3.3 What Reduce Motion disables

Authoritative list — engineer implements against this. Each entry references the spec that defined the original motion.

| Motion | When ON | When OFF (Reduce Motion enabled) |
|--------|---------|-------------------------------|
| Algorithm background drift (core-game-screen.md §4) | Particle drift, slow color cycle | Static gradient matching current mood |
| Algorithm instability intensification (§4.3) | Drift speed scales up, saturation nudges | No change — state appears static |
| Viral event particle burst (§9.2) | Particles from row to platform | Particles omitted |
| Viral event zoom pulse (§9.2) | ±1% camera-style zoom on beats | Static edge glow only |
| Viral screen edge vignette (§9.2) | Pulses at 2s cycle | Static glow |
| Rebrand Phase 2 desaturation (prestige-rebrand-screen.md §4.3) | Animated desaturation over 3s | Instant desaturation at phase start |
| Rebrand Phase 4 counter dissolution (§4.5) | Counters tick down rapidly | Single fade to zero over 1s |
| Rebrand Phase 4 background desaturation (§4.5) | Animated | Instant |
| Generator breathing pulse (purchase-feedback §6.2, generator-badge-breathing proposal) | Badge scale pulse, 2.5s staggered cycle | Static badge fill on owned rows — no pulse |
| First-purchase sparkle (§6.3) | One-time sparkle pulse | Omitted — badge fill alone |

### 3.4 What Reduce Motion PRESERVES

Explicitly preserved — these are not decorative, they are content.

- **Engagement counter tick animation** (core-game-screen.md §5.1) — the tick-rate drama is the content
- **Viral event counter acceleration** (§9.3) — the counter is the star of viral
- **Rate display flare on change** (purchase-feedback §5.1) — communicates delta, not decoration
- **Delta readout** (purchase-feedback §5.2) — information, not decoration
- **Button press feedback** (scale down/up on tap) — tactile content
- **Counter decrement on purchase** — communicates cost paid
- **First-purchase badge fill** — communicates state change
- **All sound cues** — sound is not motion
- **Ceremony timing (held silences, fade durations)** — these are pacing, not animation

**Rule the engineer can apply:** if a motion communicates state change, delta, or game content, it stays. If a motion communicates mood or ambience, it can be replaced with a static alternative.

### 3.5 Description text

Under the toggle, a two-line explanation:
> Replaces decorative motion with static alternatives. Number animations preserved.

**Why explain:** players disabling motion want to know what they'll lose. "Number animations preserved" preempts the fear that disabling motion makes the game feel dead.

---

## 4. Audio Section

### 4.1 Sound toggle

- **Control:** standard toggle switch, on/off
- **Default:** on
- **Behavior:** master mute. When off, all sound cues (click, purchase, viral, rebrand, algorithm shift, etc.) are silenced.
- **Persistence:** stored in save state, applies immediately

**Why no granular controls:** volume/mix sliders for a satirical clicker exceed the complexity budget. OS-level audio control is sufficient for players who want partial muting.

### 4.2 Description text

None. The label "Sound" is self-explanatory. Adding description to a binary toggle would be noise.

---

## 5. Save Section

### 5.1 Export Save

- **Control:** button, "Export Save"
- **Behavior on tap:** downloads a JSON file named `click-farm-save-{rebrand_count}-{timestamp}.json`
- **Confirmation:** a small inline message appears for 2s: "Exported." No modal.

**Why downloads-not-clipboard:** JSON saves may be large and include enough structure that copy-paste is error-prone. A download is honest about file shape.

### 5.2 Import Save

- **Control:** button, "Import Save"
- **Behavior on tap:** opens file picker for `.json` files
- **On selection:** shows inline warning "Importing will replace your current save." + confirm/cancel
- **On confirm:** loads file, replaces current save, reloads main screen state
- **On failure (invalid JSON, version mismatch that can't migrate):** inline error message, no state change

### 5.3 Reset Game

- **Control:** button, "Reset Game" — styled with **danger treatment** (amber border, amber text, not red — red is for errors)
- **On tap:** inline two-step confirmation appears:
  ```
  Reset Game?
  This erases your save. Clout, upgrades, rebrand count — all of it.
  [  Cancel  ]  [  Yes, reset  ]
  ```
- **On confirm:** save is cleared from localStorage, page reloads with fresh state
- **No export prompt before reset.** Player who wanted to back up had the Export button above. The reset is honest about its destruction.

**Why two-step but not three-step:** deleting the save is serious, but the player clicked a button labeled "Reset Game" under a header labeled "SAVE." They know what they're doing. One confirmation is sufficient respect; two would be patronizing.

**Why danger amber not red:** amber communicates "think about this." Red would communicate "error." The action isn't an error — it's a deliberate reset.

---

## 6. Accessibility

- **Contrast:** all text meets WCAG 2.1 AA. Toggle states pass 3:1 UI component contrast for on/off indicators.
- **Keyboard navigation:** Tab cycles through all controls in document order. Enter activates buttons. Spacebar toggles switches. Esc closes modal.
- **Focus trap:** focus is trapped within the modal while open. First focused element on open: Reduce Motion toggle.
- **Screen reader support:**
  - Toggles use native or ARIA-switch roles with labels
  - Reset confirmation is announced via aria-live
  - Export success message announced via aria-live
- **Hit areas:** all buttons and toggles ≥ 44×44px
- **No color-only signals:** danger button uses color + text label ("Reset Game" is explicit). Toggle states use position (not just color).

---

## 7. Motion Brief Summary

Minimal — this is a utility screen.

| Element | Triggers | Duration | Easing |
|---------|----------|----------|--------|
| Modal open | Tap gear icon | 200ms fade | ease-out |
| Toggle state change | Tap toggle | 150ms slide | ease-out |
| Reset confirmation appear | Tap Reset Game | 200ms slide-down | ease-out |
| Export success message | After export | 100ms fade in / 2s hold / 300ms fade out | ease-out |

---

## 8. Open Questions

1. **Should the OS `prefers-reduced-motion` preference be respected on first launch?** This spec says yes — set initial Reduce Motion toggle state from OS preference, then allow override. Engineer to implement. **Owner: ux-designer (decision) — confirmed here.**
2. **Should export filename include a player-facing name (e.g., current persona handle)?** Depends on whether the persona feature ships (see prestige-rebrand-screen.md §9 OQ2). If yes, filename becomes `click-farm-{persona}-{timestamp}.json`. **Owner: game-designer (persona decision), ux-designer (format follow-up).**
3. **Does Import Save validate save schema version?** Yes, per architecture Save Module — `migrate()` handles version chain. If migration fails, inline error as in §5.2. **Owner: engineer (implementation detail, flagged for visibility).**
4. **Is there a "debug" section for development builds?** Out of scope for launch spec — engineer may add dev-only controls behind a build flag without UX spec. **Owner: engineer.**

---

## 9. References

1. `ux/core-game-screen.md` §12 — original Reduce Motion expectations this spec formalizes
2. `ux/prestige-rebrand-screen.md` §7 — Reduce Motion in the rebrand ceremony
3. `ux/purchase-feedback-and-rate-visibility.md` §10 — breathing pulse alternative
4. `architecture/core-systems.md` — Save Module contract, localStorage persistence
5. `roles/ux-designer.md` — accessibility standards, motion as communication
