# Verb Gear — SUPER Button & Gear Purchase UX Spec

> **Scope:** Defines the visual treatment, interaction states, motion briefs, two-tap confirmation pattern, and accessibility for the HIRE-to-SUPER pill transformation on manual-clickable verb rows. Covers: the AUTO pill's lifecycle from HIRE through SUPER I/II/III to maxed, the 10x moment feedback, and the maxed-state celebration. This is the player-facing surface of the per-verb gear upgrade system.
>
> **Not in scope:** Gear multiplier math, cost tables, or balance values (game-designer, `proposals/accepted/20260407-creator-kit-verb-gear.md` §3). Data model and integration points (architect, `architecture/verb-gear.md`). The action-button slab in the Actions column (see `ux/manual-action-ladder.md`). Sweep engine interaction (sweep does not include gear purchases).
>
> **Implements:** `proposals/accepted/20260407-creator-kit-verb-gear.md` §10 (HIRE Button Transformation & Autoclicker Cap Change), §11 open questions on SUPER visual treatment and maxed state. Resolves OQ#3 (confirmation step — two-tap pattern).
>
> **Against contract:** `architecture/verb-gear.md` — `purchaseVerbGear`, `canPurchaseVerbGear`, `verbGearCost` contracts. `proposals/accepted/20260407-creator-kit-verb-gear.md` §10 — autoclicker cap flat 12, HIRE transforms to SUPER at cap, no reset on SUPER purchase.
>
> **Integrates with:** `ux/generator-purchase-pills.md` §2–§5 (pill anatomy, affordance states, press animation, cost ghost), `ux/manual-action-ladder.md` §4 (verb button anatomy, floating numbers, badge), `ux/generator-max-level-state.md` (platinum maxed treatment, shine sweep), `ux/accent-palette-light-mode.md` (functional accent tokens), `ux/visual-identity.md` §2 (generator color lanes).
>
> **Supersedes:** `ux/creator-kit-panel.md` — entire spec is dead. The old collapsible panel was designed for the old 5-axis global modifier system. The new system has no panel; gear purchases live on the pill row per verb.

---

## Decisions Taken in This Spec

1. **SUPER replaces AUTO on the same pill, not as a new element.** The player's muscle memory for the AUTO pill position (rightmost in the row) carries over. The SUPER pill occupies the same DOM position, same dimensions, same tap target. The player learns "the thing I was tapping changed into something bigger" — which is the progression signal.
2. **SUPER uses the verb's own color lane, not a new accent color.** A system-wide "gear color" would fight the per-verb identity that makes the design legible. Chirps SUPER is chirps-blue. Selfies SUPER is selfies-orange. The verb color lane is the continuity thread. The visual distinction from AUTO comes from label text, border weight, and the glow affordance — not from a new color.
3. **Two-tap confirmation for SUPER, not for AUTO.** AUTO purchases are routine; SUPER purchases are expensive breakthroughs. The confirmation gate is proportional to the cost and irreversibility. A player at 2B+ engagement deserves a moment to verify before spending.
4. **The 10x moment feedback is a verb-button-level event, not a pill-level event.** The pill is the input surface; the verb button in the Actions column is where the player sees the payoff. When SUPER lands, the floating numbers on the next tap are 10x larger — the ratio-scaled float system (`ux/manual-action-ladder.md` §ratio-scaled floats) handles this automatically. The pill provides local confirmation; the verb button provides the "oh my god" moment.
5. **Maxed state uses the platinum treatment from `ux/generator-max-level-state.md`, not a celebratory animation.** After SUPER III, the track is permanently complete. Platinum is the established "done" signal. The celebration happens at the moment of the final SUPER purchase, not as an ongoing state.

---

## 1. AUTO Pill Lifecycle

The AUTO pill in `ux/generator-purchase-pills.md` gains a fourth phase. The complete lifecycle for manual-clickable verbs:

```
AUTO (0/12) → AUTO (1/12) → ... → AUTO (11/12) → SUPER I → SUPER II → SUPER III → MAXED
```

### 1.1 Phase transitions

| From | To | Trigger | Visual transition |
|---|---|---|---|
| AUTO (N/12) | AUTO (N+1/12) | autoclicker purchased | Standard pill flash (§5.2 of purchase-pills spec) |
| AUTO (11/12) | SUPER I | 12th autoclicker purchased | SUPER arrival animation (§3) |
| SUPER I | SUPER II | gear L1 purchased | SUPER level-up feedback (§5) |
| SUPER II | SUPER III | gear L2 purchased | SUPER level-up feedback (§5) |
| SUPER III | MAXED | gear L3 purchased | SUPER completion ceremony (§6) |

### 1.2 Progress indicator on AUTO pill

During the HIRE phase (autoclicker_count 0–11), the AUTO pill shows progress toward the SUPER transformation:

- **Label:** `AUTO` (unchanged from current spec)
- **Cost ghost label (hover/long-press):** shows autoclicker cost as today, plus a progress suffix: `"4/12"` — the player sees how many autoclickers they've bought toward the cap.
- **At 12/12:** the pill immediately transforms to SUPER I. There is no "AUTO 12/12" resting state — the moment the 12th autoclicker is purchased, the transition fires.

---

## 2. SUPER Pill Anatomy

The SUPER pill replaces the AUTO pill in place. Same dimensions (44px min-width, 28px height, 14px border-radius). Same position (rightmost in the pill row). Same tap target.

### 2.1 Label

- **Text:** `SUPER` — 11px, Space Grotesk 700 (one weight heavier than AUTO's 600). Uppercase.
- **Why heavier weight:** SUPER is a bigger deal than AUTO. The weight bump is subtle but perceptible — the label has more mass on the page, signaling "this isn't routine."

### 2.2 Affordance states

The SUPER pill has three states, following the same pattern as `ux/generator-purchase-pills.md` §3 but with modifications for visual weight:

#### Affordable (can purchase next gear level)

- **Background:** verb's color lane at **25% opacity** (vs AUTO's 15%). The higher opacity gives SUPER more visual presence — it's calling attention to itself.
- **Text:** verb's color lane at full saturation, weight 700.
- **Border:** **2px** solid, verb's color lane at **50% opacity** (vs AUTO's 1px at 30%). Thicker, more visible. The border weight is the primary signal that this pill is different from a routine purchase.
- **Glow:** `box-shadow: 0 0 8px rgba(var(--gen-{verb}-rgb), 0.30)`. A soft ambient glow in the verb's color lane. This is the "something big is available" signal from §10 of the proposal. The glow is static — not pulsing. Pulsing signals urgency; this signals opportunity.
- **Cursor:** `pointer`.

#### Unaffordable (engagement < gear cost)

- **Background:** transparent.
- **Text:** `var(--text-receded)` (#9B9B9B), weight 700.
- **Border:** 1px solid, `var(--border-subtle)` at 60% opacity. Same as unaffordable AUTO.
- **Glow:** none.
- **Cursor:** `default`.

The unaffordable state looks identical to an unaffordable AUTO pill except for the label text ("SUPER" vs "AUTO"). This is intentional — the player needs to recognize the pill has changed, but the "can't afford it" signal is universal.

#### Maxed (all gear levels purchased)

See §6 — the maxed state has its own treatment.

### 2.3 Cost ghost label

On hover (desktop) / long-press (mobile) / focus (keyboard), the SUPER pill shows a ghost label with:

```
┌────────────────────────┐
│  Mechanical Keyboard   │  ← gear item name
│  2B eng → ×10          │  ← cost + multiplier preview
└───────────┬────────────┘
            │
        [ SUPER ]
```

- **Gear item name:** 11px, Space Grotesk 500, `var(--text-primary)`.
- **Cost + preview:** 10px, Space Grotesk 400. Format: `"{cost} eng -> x{multiplier}"`. The arrow and multiplier tell the player what they're buying — not just the price, but the payoff.
- **Ghost label dimensions:** auto-width, min-width 100px. Same background/border/shadow as the standard cost ghost label from `ux/generator-purchase-pills.md` §4.2.

This ghost label is richer than the standard cost-only ghost label on AUTO/BUY/LVL pills. The extra information is justified: SUPER purchases are infrequent, expensive, and the player hasn't seen "gear multiplier" as a concept before their first one. The ghost label teaches the mechanic on first hover.

---

## 3. SUPER Arrival Animation (AUTO → SUPER I)

When the player buys their 12th autoclicker and the AUTO pill transforms into SUPER I:

### 3.1 Sequence

1. **T+0ms:** 12th autoclicker purchase fires. Standard AUTO pill flash completes (120ms, per purchase-pills §5.2).
2. **T+120ms:** AUTO pill begins transformation:
   - Label cross-fades `AUTO` → `SUPER` over 200ms.
   - Border animates from 1px to 2px over 200ms, ease-out.
   - Background opacity shifts from 15% to 25% over 200ms.
   - Glow fades in: `box-shadow` from `0 0 0px` to `0 0 8px` over 300ms, ease-out.
3. **T+320ms:** transformation complete. SUPER I is in its resting affordable state (if the player can afford it) or unaffordable state (if they can't).

### 3.2 Reduced motion

Under `prefers-reduced-motion: reduce`: all transitions are instant. Label changes from AUTO to SUPER with no fade. Border, background, glow snap to final values.

### 3.3 First SUPER context

The very first time any verb reaches SUPER across all runs, the ghost label auto-shows for 3 seconds without hover, then fades out. This teaches the mechanic once. On subsequent verbs reaching SUPER (same run or later runs), the ghost label does not auto-show — the player already knows what SUPER means.

Persistence: track via a `has_seen_super` flag on the player state (survives rebrand — this is a tutorial flag, not a game-state flag). If this flag is too heavy for state, a localStorage key is acceptable.

---

## 4. Two-Tap Confirmation Pattern

SUPER purchases use a two-tap confirmation to prevent accidental 2B+ engagement spends. This resolves OQ#3 from the proposal.

### 4.1 Flow

```
Tap 1 (reveal)              Tap 2 (confirm)
┌──────────┐                ┌──────────┐
│  SUPER   │  ──tap──>      │  ✓ BUY   │  ──tap──>  purchase fires
│  (glow)  │                │  (pulse) │
└──────────┘                └──────────┘
                                 │
                            3s timeout
                                 │
                                 v
                            ┌──────────┐
                            │  SUPER   │  (reverts to resting state)
                            │  (glow)  │
                            └──────────┘
```

### 4.2 Tap 1 — reveal

On first tap of an affordable SUPER pill:

- **Label changes:** `SUPER` → `BUY` (11px, Space Grotesk 700).
- **Background intensifies:** verb color lane at 25% → 35% opacity.
- **Border:** pulses once — expands from 2px to 3px and back to 2px over 300ms, ease-out. This is the "I heard you, confirm?" signal.
- **Glow intensifies:** `box-shadow` from `0 0 8px` to `0 0 14px` over 200ms.
- **Cost ghost label auto-shows** above the pill (same content as §2.3 — gear name, cost, multiplier). Does not require hover.
- **3-second timeout** begins. If the player does not tap again within 3 seconds, the pill reverts to its resting SUPER state: label reverts, background/border/glow de-intensify over 200ms.

The 3-second window is generous — an intentional buyer confirms in under 500ms. The timeout catches the player who tapped accidentally and looked away.

### 4.3 Tap 2 — confirm

On second tap within the 3-second window:

- **Purchase fires.** `purchaseVerbGear(state, gearId, staticData)` is called.
- **Pill enters the SUPER level-up feedback sequence** (§5).
- **Cost ghost label dismisses** immediately.

### 4.4 Cancellation

- **Timeout:** after 3 seconds, pill reverts to SUPER resting state. No sound, no animation beyond the de-intensify transition.
- **Tap outside:** tapping anywhere else on the screen during the confirmation window cancels. Pill reverts.
- **Keyboard:** Escape key cancels immediately if the pill is focused.

### 4.5 Unaffordable SUPER tap

Tapping an unaffordable SUPER pill: no-op. Same as unaffordable AUTO/BUY/LVL (no shake, no sound — the visual receding is the signal).

---

## 5. SUPER Level-Up Feedback (The 10x Moment)

When a SUPER purchase confirms, the feedback must communicate "something huge just happened." This is the plateau-breaker moment from the proposal §9.

### 5.1 Pill-level feedback

1. **T+0ms:** purchase fires. Engagement counter ticks down.
2. **T+0–60ms:** pill flashes — text color brightens to 100% lightness for 200ms (longer than the standard 120ms pill flash — the moment earns more screen time).
3. **T+60ms:** label updates to reflect the new state:
   - SUPER I → SUPER (same label, cost ghost would show L2 info on next hover)
   - SUPER II → SUPER (same)
   - SUPER III → MAXED (see §6)

### 5.2 Verb-button-level feedback (Actions column)

The real payoff is on the verb button, not the pill. The player's next tap on the upgraded verb produces floating numbers that are 10x larger than their previous tap. The ratio-scaled float system (`ux/manual-action-ladder.md`, `ActionsColumn.tsx floatStyle()`) handles this automatically — the `perClick` value is 10x higher, so the float font size jumps to the upper end of the lerp range.

**No additional animation is needed on the verb button at SUPER purchase time.** The 10x moment lands on the *next tap*, not at the moment of purchase. This is correct: the player buys the gear, then taps the verb and sees the payoff. The sequence is anticipation (buy) → discovery (tap → "whoa, 10x"). Front-loading the celebration to the purchase moment would steal from the discovery moment.

**Autoclicker floats also jump 10x immediately.** Since autoclickers fire continuously, the player sees the 10x effect within one burst interval after the purchase — typically under 1 second. This provides near-immediate visual confirmation even if the player doesn't manually tap.

### 5.3 Engagement counter

The engagement counter shows the cost debit as normal (number ticks down). No additional counter-level feedback. The 2B+ spend is visible in the counter movement itself.

---

## 6. Maxed State (After SUPER III)

After the player purchases the third and final gear level, the SUPER pill enters its permanent completed state.

### 6.1 Completion ceremony (one-time, at the moment of final SUPER purchase)

1. **T+0ms:** final SUPER purchase fires.
2. **T+0–200ms:** pill flash (200ms, as in §5.1).
3. **T+200ms:** label cross-fades `SUPER` → `MAX` over 200ms.
4. **T+200–500ms:** background transitions from verb-color 35% (confirmation state) to platinum `rgba(var(--palette-platinum-rgb), 0.12)` over 300ms, ease-out. Border transitions to platinum 25%. Glow fades out (verb-color glow → none) over 300ms.
5. **T+500ms:** inset shadow appears: `inset 0 1px 2px rgba(0, 0, 0, 0.06)`. The pill settles into its permanent recessed state.
6. **T+700ms:** shine sweep initiates — the pill joins the existing `@keyframes lvl-maxed-shine` cycle (7s period, ~420ms sweep), synced with all other maxed elements on screen.

### 6.2 Permanent maxed anatomy

Identical to the LVL pill maxed state from `ux/generator-purchase-pills.md` §3.3:

- **Background:** `rgba(var(--palette-platinum-rgb), 0.12)`.
- **Text:** `MAX` — `var(--accent-platinum)` (#5C6A86), weight 700.
- **Border:** 1px solid `rgba(var(--palette-platinum-rgb), 0.25)`.
- **Inset shadow:** `inset 0 1px 2px rgba(0, 0, 0, 0.06)`.
- **Shine sweep:** participates in the shared maxed-shine cycle.
- **Cursor:** `default`.

The consistency with the LVL maxed state is the point: "MAX" means "MAX" everywhere. The player recognizes the platinum treatment from their first LVL 10 achievement and understands immediately that this track is complete.

### 6.3 When all five verbs are maxed

When all five verbs reach SUPER III (all gear maxed), the player has completed the entire Phase 2 gear progression. No additional system-level celebration is specified here — that's a game-designer decision about what happens at the progression ceiling. The five platinum MAX pills in the rightmost column position are a passive visual signal that all verb tracks are complete.

---

## 7. Accessibility

### 7.1 Screen reader labels

Dynamic `aria-label` on the SUPER pill:

| State | aria-label |
|---|---|
| SUPER affordable | `"Super upgrade Chirps, Mechanical Keyboard level 1 of 3, affordable, costs 2 billion engagement, multiplier times 10. Press Enter to begin purchase."` |
| SUPER unaffordable | `"Super upgrade Chirps, Mechanical Keyboard level 1 of 3, not affordable, costs 2 billion engagement."` |
| SUPER confirmation (after tap 1) | `"Confirm Super purchase, Mechanical Keyboard, 2 billion engagement. Press Enter to confirm or Escape to cancel."` |
| Maxed | `"Chirps gear maxed, Mechanical Keyboard level 3 of 3."` |

### 7.2 Keyboard interaction

- **Tab:** SUPER pill is focusable in the same position as AUTO (rightmost pill in the row).
- **Enter/Space on affordable SUPER:** enters confirmation state (tap 1). Second Enter/Space confirms (tap 2).
- **Escape during confirmation:** cancels, reverts to resting state.
- **Focus ring:** 2px solid `var(--accent-gold)` outline with 2px offset (same convention as all pills).

### 7.3 Color independence

| Signal | Color | Non-color pair |
|---|---|---|
| SUPER affordable | Verb color tint + glow | `SUPER` label text + 2px border + glow shadow |
| SUPER unaffordable | Receded grey | `SUPER` label text + transparent background + thin border |
| Confirmation state | Intensified verb color | `BUY` label text + auto-shown ghost label |
| Maxed | Platinum | `MAX` label text + inset shadow + shine sweep |

No state is communicated by color alone.

### 7.4 Contrast summary

| State | Text token | Background | Contrast ratio | Passes AA? |
|---|---|---|---|---|
| SUPER affordable | Verb color lane | 25% tint on white | >= 3:1 (verify per verb) | Yes for UI components |
| SUPER unaffordable | `--text-receded` #9B9B9B | Transparent (white) | ~3.5:1 | Marginal — acceptable for non-actionable (same rationale as AUTO, §3.2 of purchase-pills) |
| Confirmation `BUY` | Verb color lane | 35% tint on white | >= 3:1 | Yes |
| Maxed `MAX` | `--accent-platinum` #5C6A86 | 12% platinum on white | ~5.7:1 | Yes |

### 7.5 Reduced motion

Under `prefers-reduced-motion: reduce`:
- SUPER arrival animation (§3): instant label/border/glow change.
- Two-tap confirmation border pulse (§4.2): no pulse, background intensifies instantly.
- SUPER level-up pill flash (§5.1): disabled.
- Completion ceremony (§6.1): instant transition to maxed state. No cross-fade, no glow fade.
- Maxed shine sweep: disabled (static platinum pill).

---

## 8. Motion Briefs (Summary)

| Motion | Trigger | Duration | Easing | Communicates |
|---|---|---|---|---|
| AUTO → SUPER label cross-fade | 12th autoclicker purchased | 200ms | ease-out | Track transformed |
| AUTO → SUPER border thicken | With label cross-fade | 200ms | ease-out | New significance |
| AUTO → SUPER glow fade-in | With label cross-fade | 300ms | ease-out | Opportunity available |
| Ghost label auto-show (first SUPER ever) | First verb reaches SUPER | 3000ms visible, 200ms fade-out | — | Teaches the mechanic |
| Confirmation border pulse | Tap 1 on affordable SUPER | 300ms (2px→3px→2px) | ease-out | "Confirm?" |
| Confirmation glow intensify | Tap 1 | 200ms | ease-out | Armed state |
| Confirmation revert (timeout) | 3s with no tap 2 | 200ms | ease-out | Cancel |
| SUPER purchase pill flash | Tap 2 confirms | 200ms | linear | Purchase confirmed |
| SUPER → MAXED label cross-fade | Final gear level purchased | 200ms | ease-out | Track completed |
| SUPER → MAXED color transition | With label cross-fade | 300ms | ease-out | Settling into permanence |
| SUPER glow fade-out (to maxed) | With color transition | 300ms | ease-out | No more opportunity — done |
| Maxed shine sweep | Continuous (synced) | 7s cycle, 420ms sweep | linear | Trophy |

---

## 9. Engineer Handover

1. **The SUPER pill is the same `<PurchasePill>` component** from `ux/generator-purchase-pills.md` §10, with an extended `track` prop or a new pill variant. Recommended approach: add `track: 'super'` to `PurchasePillProps` and derive the label, affordance states, and confirmation behavior from the track type.

2. **State derivation for SUPER:**
   ```ts
   // When to show SUPER instead of AUTO:
   const isSuperPhase = genState.autoclicker_count >= 12;
   
   // SUPER affordance:
   const gearLevel = state.player.verb_gear[genId as VerbGearId] ?? 0;
   const gearDef = staticData.verbGear[genId as VerbGearId];
   const isMaxed = !gearDef || gearLevel >= gearDef.max_level;
   const cost = isMaxed ? null : gearDef.cost[gearLevel];
   const canAfford = cost !== null && state.player.engagement >= cost;
   ```

3. **Two-tap confirmation state** is local component state (not game state). A `confirming: boolean` flag with a `setTimeout` for the 3-second revert. Clear the timeout on unmount.

4. **`has_seen_super` flag:** for the first-SUPER ghost label auto-show (§3.3). Options:
   - **Preferred:** `localStorage.setItem('click-farm-seen-super', '1')`. Lightweight, survives rebrand, no save schema change.
   - **Alternative:** boolean on Player state if other tutorial flags are added later.

5. **Purchase handler:** on tap-2 confirm, call `driver.buyVerbGear(genId as VerbGearId)`. The driver method calls `purchaseVerbGear` which validates the autoclicker-cap gate at the model layer.

6. **Ghost label for SUPER** is a richer tooltip than the standard cost ghost (§2.3). Implement as the same portal-based tooltip component from `ux/generator-purchase-pills.md` §10 item 5, with a two-line template for SUPER pills.

7. **Maxed shine sweep:** reuse `@keyframes lvl-maxed-shine` and `::before` pseudo from `ux/generator-max-level-state.md` §5 — same as the LVL maxed pill.

8. **AUTO pill progress indicator** (§1.2): the `4/12` progress text appears in the ghost label (hover/long-press), not on the pill face. No change to the pill face label — it remains `AUTO` throughout.

9. **All motion specs** are in §8 table. All honor `prefers-reduced-motion` per §7.5.

---

## 10. References

1. `proposals/accepted/20260407-creator-kit-verb-gear.md` — source proposal, §10 HIRE→SUPER transformation, §11 open questions
2. `architecture/verb-gear.md` — data model, interface contracts, stacking order
3. `ux/generator-purchase-pills.md` — pill anatomy, affordance states, press animation, cost ghost
4. `ux/manual-action-ladder.md` — verb button anatomy, floating numbers, autoclicker badge
5. `ux/generator-max-level-state.md` — platinum maxed treatment, shine sweep
6. `ux/accent-palette-light-mode.md` — functional accent tokens
7. `ux/visual-identity.md` §2 — generator color lanes
8. `ux/creator-kit-panel.md` — **DEAD**, fully superseded by this spec

---

## 11. Open Questions

1. **AUTO pill progress on the pill face vs ghost-only.** This spec puts the `4/12` progress in the ghost label (hover/long-press). An alternative is showing it on the pill face as a micro-label below `AUTO`. The concern is density — 5 verb rows each showing `"AUTO 4/12"` may be noisy. Current decision: ghost-only. **Owner: ux-designer (revisit after playtesting)**

2. **Gear item flavor copy on the ghost label.** The ghost label currently shows gear name + cost + multiplier. Adding a one-line flavor description ("You type faster, hit harder, every keystroke thunders") would add character but increase ghost label height. Current decision: omit — the gear name is enough context. **Owner: ux-designer (revisit if playtesting shows confusion about what gear does)**
