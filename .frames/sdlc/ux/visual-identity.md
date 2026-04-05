# Visual Identity — Platforms, Generators & Scandal Icons

> **Scope:** Defines the visual identity elements for the three social platforms (Chirper, InstaSham, Grindset), all seven launch generators, and the six scandal types. Covers icon direction, semantic color lanes, satirical framing, and CVD compliance notes for each. This is the single authoritative reference for player-facing visual tokens across these three systems.
>
> **Not in scope:** Algorithm mood color system (see `proposals/accepted/algorithm-mood-visibility.md`), base palette and light-mode decision (see `proposals/draft/visual-identity-light-mode.md`), badge visual identity (see `proposals/draft/badge-shop.md`).
>
> **Implements:** Task #53 — resolves `ux/core-game-screen.md` OQ3, `ux/scandal-system.md` OQ6, and generator four-differentiator system `§6.1`.
>
> **Against contract:** `proposals/accepted/generator-balance-and-algorithm-states.md` (full generator list), `proposals/accepted/scandals-and-follower-loss.md` (six scandal types), `proposals/accepted/core-game-identity-and-loop.md` (platform names + satire tone).

---

## Design Notes Before Reading

**Color context:** This spec is written against the current dark-mode background (`#0b0d12`). The `proposals/draft/visual-identity-light-mode.md` proposal — pending game-designer review — would shift the base to `#FAF8F5` warm near-white. If that proposal is accepted, all contrast values in this spec must be re-verified. Colors defined here are functionally correct in dark mode; a light-mode pass may require shifted lightness values for several tokens.

**Conflict resolution (OQ2 from task #53):** Platform accent colors *are* used in mechanic visuals, not purely in decorative identity. Per `proposals/accepted/algorithm-mood-visibility.md` §6, during a viral burst the screen-edge vignette takes on the source platform's affinity color as a temporary override. Platform accent colors must therefore be designed to read well as a full-screen vignette edge — not only as a small card label color.

**Generator list (OQ1 from task #53 — resolved):** The full launch generator list is confirmed in `proposals/accepted/generator-balance-and-algorithm-states.md`: selfies, memes, hot_takes, tutorials, livestreams, podcasts, viral_stunts (7 generators). Post-prestige generators (AI Slop, Deepfakes of Yourself, Algorithmic Prophecy) are not in scope for this spec.

---

## 1. Platform Visual Identity

Each platform has an icon direction, an accent color token, and a satire-tone note. The accent color is used in:
- Platform card name and border highlight
- Affinity chips on the platform card
- Screen-edge vignette during viral bursts originating from this platform (per algorithm-mood-visibility §6)

**Contrast target:** Platform accent colors must meet **3:1 against `#0b0d12`** as UI component colors (WCAG 1.4.11), and **4.5:1** where they are used as inline text labels.

---

### 1.1 Chirper

> *The bird site, post-acquisition. Everything is "for the community" while the algorithm maximises outrage.*

| Property | Value |
|----------|-------|
| **Accent color** | `#4da6ff` |
| **Accent color (darker, for text use)** | `#2a88e0` |
| **Icon direction** | A small stylized bird in mid-squawk — beak open, speaking forcefully. Not the neutral perched-bird glyph. The bird should look like it has a hot take. Single-weight line art, readable at 24px. |
| **Satire tone** | The original, still calling itself a town square. Speeds up every other platform. Scandals happen faster here. |

**CVD notes:** `#4da6ff` is a safe blue — blue-coded platforms are distinct from warm generator colors under protanopia and deuteranopia. Tritanopia may reduce the blue-vs-teal distinction; the platform name label is the primary differentiator, not the color alone. Always pair color with the platform name.

**Contrast check:** `#4da6ff` on `#0b0d12` — estimated ~7:1. Passes both 3:1 (UI component) and 4.5:1 (text) at full opacity.

---

### 1.2 InstaSham

> *Curated perfection and hidden existential dread. Every caption is a cry for help phrased as aspiration.*

| Property | Value |
|----------|-------|
| **Accent color** | `#e05aa8` |
| **Accent color (darker, for text use)** | `#b83d88` |
| **Icon direction** | A rounded-square frame (camera-app icon shape) with a sparkle cluster at the top-right corner — the sparkles are the only organic element in an otherwise perfectly geometric container. The tension between the rigid frame and the sparkle is the joke. Readable at 24px. |
| **Satire tone** | Highly curated, high follower conversion on selfies and image content. Scandals here are aesthetic failures, not ethical ones. |

**CVD notes:** Magenta-pink is problematic under protanopia — it may read similarly to grey-blue to some players. Pair the accent color with the InstaSham name label and the rounded-square icon shape at all times. The icon shape, not the color, carries the platform identity in CVD scenarios.

**Contrast check:** `#e05aa8` on `#0b0d12` — estimated ~5.5:1. Passes 4.5:1. At reduced opacity (e.g., affinity chip backgrounds), ensure opacity is ≥70% to maintain 3:1.

---

### 1.3 Grindset

> *Professional networking where "hustle culture" is the only culture. Every post is a humble brag wrapped in a lesson about leadership.*

| Property | Value |
|----------|-------|
| **Accent color** | `#7e6ab0` |
| **Accent color (darker, for text use)** | `#5e4a90` |
| **Icon direction** | A briefcase with a tiny ascending bar chart inside it. The bar chart has too many bars and they go off the top edge of the briefcase. The joke is in the overflow — the hustle cannot be contained. Readable at 24px. |
| **Satire tone** | Rewards podcasts and tutorials disproportionately. Algorithm states favor it during corporate_takeover. Scandals here are credibility scandals — fact-checks, fake expertise. |

**CVD notes:** Muted purple is distinguishable under protanopia (reads as blue-grey) and deuteranopia (similar). Distinct from Chirper's electric blue by saturation and warmth. Tritanopia may compress purple vs. blue distinction — icon shape is the primary identifier.

**Contrast check:** `#7e6ab0` on `#0b0d12` — estimated ~4.2:1 at full opacity. Meets 3:1 for UI components. For text use, the darker variant `#5e4a90` is insufficient — use the lighter `#7e6ab0` for text labels.

**Note:** `#7e6ab0` is borderline for 4.5:1 text contrast. Platform name labels on the Grindset card should use `#8a78bc` (slightly lighter) for text specifically, targeting 4.5:1+.

---

## 2. Generator Visual Identity

Generators use a four-differentiator system (per `ux/core-game-screen.md` §6.1): icon, semantic color, category badge shape, and stable position. This section defines the icon direction and color lane for each generator.

**Badge shapes by category (unchanged from core-game-screen §6.1):**
- Starter: circle
- Mid: hexagon
- Late: diamond
- Prestige: star

**Semantic color lanes:**
- **Images lane (warm):** selfies, memes
- **Text lane (cool):** hot_takes, tutorials, podcasts
- **Video lane (saturated):** livestreams, viral_stunts
- **Prestige lane (metallic):** post-prestige generators — not in scope here

**Important:** Generator lane colors appear as the badge fill and the modifier chip border. They must pass 3:1 against the dark background `#0b0d12` at their full-opacity rendered values.

---

### 2.1 Selfies

| Property | Value |
|----------|-------|
| **Category** | Starter (circle badge) |
| **Semantic lane** | Images — warm |
| **Color token** | `#e07040` |
| **Icon direction** | A phone held at arm's length, tilted slightly — the universal selfie posture. The phone has a tiny mirror-reflection glint at the top. Simple, clean, reads at 24px. The arm is implied, not drawn. |
| **Design note** | The floor generator. Icon should feel relatable and slightly embarrassing — everyone's been here. |

**CVD:** Warm orange is safe under all CVD types. Distinct from text-lane blues and video-lane purples/magentas.

---

### 2.2 Memes

| Property | Value |
|----------|-------|
| **Category** | Starter (circle badge) |
| **Semantic lane** | Images — warm |
| **Color token** | `#dfb020` |
| **Icon direction** | A classic image macro frame: a rectangle with text space at top and bottom, and an abstract figure silhouette in the center — the Distracted Boyfriend or Drake template posture, simplified to stick figure. The frame format, not the content, is the icon. |
| **Design note** | Warmer and slightly more golden than selfies to distinguish within the images lane. The amber-yellow is distinct from the risk amber (which is orange-red in the `#c45a10` range) but the engineer should verify separation in the full rendered context. |

**CVD:** Yellow-amber reads as yellow-grey under protanopia. The icon shape (text-frame format) is the primary differentiator from selfies within the same lane. Do not rely on color alone to distinguish selfies from memes — the icon must be unambiguous at 32px.

---

### 2.3 Hot Takes

| Property | Value |
|----------|-------|
| **Category** | Mid (hexagon badge) |
| **Semantic lane** | Text — cool |
| **Color token** | `#3a8ae0` |
| **Icon direction** | A speech bubble with a lightning bolt inside — not a flame (flames read "fire/viral"), but lightning (reads "charged, dangerous, instant"). The bolt fills most of the bubble interior. Clean geometric, reads at 24px. |
| **Design note** | The highest-sensitivity text generator. The icon's energy should feel sharp and fast, not warm. Blue keeps it in the text lane; the bolt shape distinguishes it from the measured tone of tutorials and podcasts. |

**CVD:** Blue is safe across all CVD types. Distinct from Chirper's lighter `#4da6ff` by saturation and depth — verify at 32px icon size.

---

### 2.4 Tutorials

| Property | Value |
|----------|-------|
| **Category** | Mid (hexagon badge) |
| **Semantic lane** | Text — cool |
| **Color token** | `#3aaad0` |
| **Icon direction** | A simple clapperboard shape, half-open — the tutorial is "instructional content." Alternatively: a chalkboard with a single checkmark on it. The checkmark version reads more directly as "authoritative and complete." Either works at 24px; prefer whichever the engineer can render most crisply. |
| **Design note** | Low sensitivity, boring by design. The teal-blue should feel measured and institutional next to Hot Takes' charged electric blue. Same lane, calmer register. |

**CVD:** Teal-blue may shift under tritanopia. Distinct from hot_takes by hue direction (teal vs electric blue) and badge shape (both hexagon — rely on icon shape within the badge to distinguish). Tutorials' chalkboard vs Hot Takes' lightning bolt should be unambiguous at 32px.

---

### 2.5 Podcasts

| Property | Value |
|----------|-------|
| **Category** | Late (diamond badge) |
| **Semantic lane** | Text — cool |
| **Color token** | `#5a6adf` |
| **Icon direction** | A microphone with a sound wave emanating from it — three concentric arcs to the right of the mic body. Simple, iconic, reads at 24px. The microphone is upright (broadcast posture), not handheld. |
| **Design note** | The compounding loyalist generator. Indigo-blue feels deep and authoritative — the "I've been listening for 200 episodes" generator. Distinguishes from tutorials' teal and hot_takes' electric by moving deeper and more purple in the blue family. |

**CVD:** Deep blue-indigo reduces in saturation under all CVD types but remains a distinguishable blue. Within the text lane, the three blues (hot_takes: electric, tutorials: teal, podcasts: indigo) vary by lightness and warmth — tritanopia may compress teal vs indigo. Icon shape (lightning bolt vs clapperboard vs microphone) provides primary differentiation.

---

### 2.6 Livestreams

| Property | Value |
|----------|-------|
| **Category** | Late (diamond badge) |
| **Semantic lane** | Video — saturated |
| **Color token** | `#9a3adf` |
| **Icon direction** | A play button (right-pointing triangle) with a "LIVE" pill label above it — the pill has a red dot in it. The red dot is the only red element in the icon; it reads "this is happening right now." At 24px, the pill may reduce to just the red dot above the triangle. |
| **Design note** | Moving into the video lane — saturated purple signals high energy, high production, high output. The "LIVE" marker distinguishes livestreams from recordings and gives the icon narrative specificity. |

**CVD:** Saturated purple reads as dark blue-grey under protanopia. The red LIVE dot may shift toward orange. Icon shape (triangle + dot marker) is the primary differentiator. Always pair with the generator name label.

---

### 2.7 Viral Stunts

| Property | Value |
|----------|-------|
| **Category** | Late (diamond badge) |
| **Semantic lane** | Video — saturated |
| **Color token** | `#df3a5a` |
| **Icon direction** | A figure mid-leap, silhouetted against nothing — the universal "stunt" posture. Or: an explosion star with a camera in front of it (you're filming the chaos). Prefer the leaping figure — simpler, reads at 24px without detail loss. The figure has arms wide, maximum drama. |
| **Design note** | Maximum sensitivity, maximum spectacle. The vivid red-pink (not Livestreams' purple) signals extreme, chaotic, dangerous. Distinct from InstaSham's warm magenta (`#e05aa8`) by hue direction (red-pink vs warm pink) and by appearing in the generator column rather than the platform panel. |

**CVD:** Red-pink reduces to pink-grey under protanopia. Within the video lane, the two generators (livestreams purple vs viral stunts red-pink) may converge under CVD — their badge shape (both diamond) does not help differentiation. **Critical:** the icon shapes (triangle-LIVE vs leaping figure) must be unambiguous at 40px mobile badge size. Do not rely on color to distinguish livestreams from viral stunts — the icons carry all the load.

---

## 3. Scandal Visual Identity

Scandals use a unified **red accent** family (`#df3a3a` range) as their semantic color — distinct from the risk-building amber (`building` state) and from the generator/platform color vocabulary. The player has already seen amber as "this is getting risky"; red is "it happened."

Each scandal card appears during the PR Response window (per `ux/scandal-system.md`). The icon appears in the scandal card header alongside the scandal name.

**Contrast target:** Scandal icons at 3:1 against the scandal card background. The card background darkens slightly during a scandal event — verify icons against both the card background and the main screen background.

---

### 3.1 Content Burnout

| Property | Value |
|----------|-------|
| **Icon direction** | A phone with steam rising from the top — the device is overheating. Three wisps of steam, evenly spaced, curling upward. The phone body is intact; it's the output that's cooked. |
| **Satirical framing** | *"You posted 847 selfies this week. Your audience is bored. You are not."* |
| **Trigger reminder** | Overposting a single content type (>70% of output from one generator). |

---

### 3.2 Platform Neglect

| Property | Value |
|----------|-------|
| **Icon direction** | A platform card (rounded rectangle) with a cobweb in the upper-left corner — a single thread from corner to center. Clean geometric cobweb, not illustrated. The cobweb is the joke: the card format itself (a platform card) is wearing neglect as a texture. |
| **Satirical framing** | *"Your InstaSham followers are still there. They're just not sure you are."* |
| **Trigger reminder** | A platform with followers but no recent posts. |

---

### 3.3 Hot Take Backlash

| Property | Value |
|----------|-------|
| **Icon direction** | A speech bubble with a visible crack running diagonally across it — the take shattered on contact with reality. No flames (flames read "it's on fire / going viral"). The crack reads "this did not survive." Geometric crack, two or three line segments. |
| **Satirical framing** | *"Your take did not age well. It aged like an egg salad sandwich left in a car."* |
| **Trigger reminder** | High Hot Take output during an unfavorable algorithm state. |

---

### 3.4 Trend Chasing

| Property | Value |
|----------|-------|
| **Icon direction** | A weathervane spinning — the classic arrow-shaped weathervane with four direction markers, but the arrow is a blurred arc suggesting rapid rotation. Alternatively: a figure running but the ground is a circle and they're going in a loop. The weathervane is cleaner at 24px. |
| **Satirical framing** | *"Your audience noticed. Everyone noticed. The algorithm noticed. The algorithm is not impressed."* |
| **Trigger reminder** | Rapidly switching content mix to follow algorithm shifts. |

---

### 3.5 Growth Scrutiny

| Property | Value |
|----------|-------|
| **Icon direction** | A magnifying glass over a bar chart. The bar chart is suspiciously perfect — every bar exactly the same height, evenly spaced, no variance. The magnifying glass highlights this suspicious regularity. The joke is in the uniform bars. |
| **Satirical framing** | *"Someone looked at your follower graph. The shape of it raised questions."* |
| **Trigger reminder** | Rapid follower growth on a single platform. |

---

### 3.6 Fact Check

| Property | Value |
|----------|-------|
| **Icon direction** | A rubber stamp with "CHECKED" across its face — the stamp is mid-strike (slightly angled, with motion lines). Below the stamp, a document corner is visible. Corporate, bureaucratic, final. |
| **Satirical framing** | *"Someone looked it up. The sources were described, by independent review, as 'vibes'."* |
| **Trigger reminder** | High Podcast or Tutorial output at scale. |

---

## 4. Color Token Reference

All colors defined in this spec. Engineer should implement as CSS custom properties.

### Platform Accent Colors

| Platform | UI Component Token | Text Token | Notes |
|----------|--------------------|------------|-------|
| Chirper | `--platform-chirper: #4da6ff` | same (passes 4.5:1) | Electric blue |
| InstaSham | `--platform-instasham: #e05aa8` | same (passes 4.5:1) | Warm magenta |
| Grindset | `--platform-grindset: #7e6ab0` | `#8a78bc` for text | Muted purple; text variant lighter |

### Generator Lane Colors

| Generator | Token | Lane | Badge shape |
|-----------|-------|------|-------------|
| Selfies | `--gen-selfies: #e07040` | images-warm | circle |
| Memes | `--gen-memes: #dfb020` | images-warm | circle |
| Hot Takes | `--gen-hot-takes: #3a8ae0` | text-cool | hexagon |
| Tutorials | `--gen-tutorials: #3aaad0` | text-cool | hexagon |
| Podcasts | `--gen-podcasts: #5a6adf` | text-cool | diamond |
| Livestreams | `--gen-livestreams: #9a3adf` | video-saturated | diamond |
| Viral Stunts | `--gen-viral-stunts: #df3a5a` | video-saturated | diamond |

### Scandal Accent

| Token | Value | Use |
|-------|-------|-----|
| `--scandal-accent: #df3a3a` | Vivid red | Scandal card header, icon background ring |

---

## 5. CVD Simulation Checklist

Run every token in this spec through protanopia, deuteranopia, and tritanopia simulators before shipping. Critical pairs to verify:

| Pair | Risk | Mitigation |
|------|------|------------|
| Selfies (#e07040) vs Memes (#dfb020) | Both warm, may merge under deuteranopia | Icon shape (phone vs meme frame) carries differentiation |
| Tutorials (#3aaad0) vs Podcasts (#5a6adf) | May compress under tritanopia | Icon shape (clapperboard vs microphone) carries differentiation |
| Livestreams (#9a3adf) vs Viral Stunts (#df3a5a) | Both video lane, both diamond badges — highest CVD risk pair | Icons (triangle+LIVE dot vs leaping figure) must be unambiguous at 40px — test on device before shipping |
| Chirper (#4da6ff) vs Hot Takes (#3a8ae0) | Both blue, adjacent on screen | Chirper is a platform card (right panel), Hot Takes is a generator row (center column) — contextual separation reduces risk |
| InstaSham (#e05aa8) vs Viral Stunts (#df3a5a) | Both in pink/magenta family | Context-separated (platform panel vs generator row). Viral burst vignette uses InstaSham accent — if viral stunt sources on InstaSham, colors converge in vignette + generator row simultaneously. Verify readability. |
| Scandal red (#df3a3a) vs Viral Stunts (#df3a5a) | Numerically very close | Scandals appear as modal overlays (darkened background) not in generator rows — contexts never overlap during normal play. Low risk. |

**Simulator tools:** Use Figma's CVD accessibility plugin, or Stark (figma.com/community/plugin/732603254453395948) in simulation mode. Check all five token groups together in the full game screen layout.

---

## 6. Open Questions

All open questions from task #53 are resolved:

1. **[RESOLVED] Full generator list at launch.** Seven generators: selfies, memes, hot_takes, tutorials, livestreams, podcasts, viral_stunts. Source: `proposals/accepted/generator-balance-and-algorithm-states.md`. Post-prestige generators (AI Slop, Deepfakes of Yourself, Algorithmic Prophecy) are not in scope for this spec — they get their own visual identity pass when prestige economy is designed.

2. **[RESOLVED] Platform accent colors in mechanic visuals.** Yes — platform accent colors appear in the screen-edge vignette during viral bursts, per `proposals/accepted/algorithm-mood-visibility.md` §6. The CSS token system should treat platform accent colors as a first-class input to the vignette layer, not a display-only decoration. Architect: no new design required — the algorithm-mood-visibility proposal already specifies the override mechanism; platform colors simply need to be available as tokens.

---

## 7. References

1. `proposals/accepted/core-game-identity-and-loop.md` — platform names, satire tone, generator roster
2. `proposals/accepted/generator-balance-and-algorithm-states.md` — full generator list, categories, trend sensitivities
3. `proposals/accepted/scandals-and-follower-loss.md` — six scandal types, trigger conditions
4. `proposals/accepted/algorithm-mood-visibility.md` §6 — viral burst vignette override using platform accent colors
5. `ux/core-game-screen.md` §6.1 — four-differentiator system spec, badge shapes
6. `ux/scandal-system.md` — PR Response card context for scandal icon placement
7. `roles/ux-designer.md` — contrast standards, CVD requirements, color-only signal prohibition
