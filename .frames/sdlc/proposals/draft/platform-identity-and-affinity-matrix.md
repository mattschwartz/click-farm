---
name: Platform Identity & Affinity Matrix
description: Names each of the 3 launch platforms, defines their satirical voice and audience character, specifies the platform × generator affinity matrix, and sets follower-based unlock thresholds.
author: game-designer
status: draft
reviewers: [game-designer]
---

# Proposal: Platform Identity & Affinity Matrix

## Problem

`core-game-identity-and-loop.md` commits to 3 launch platforms, each with its own follower count, content affinity, and unlock threshold. Multiple accepted systems are load-bearing on the *identity* of those platforms:

- **`audience-mood-retention.md`** — Content Fatigue is per-(platform, generator). Without per-platform affinity profiles, the fatigue system has no boost/penalty baseline to drift from.
- **`creator-kit-upgrades.md`** — Phone head-starts platforms "sequentially" (next-available). "Next" is undefined without an ordered platform list.
- **`clout-upgrade-menu.md`** — Names two head-start upgrades (`instasham_headstart`, `grindset_headstart`) at specific Clout costs, implying a fixed order and specific platform identities.
- **`generator-balance-and-algorithm-states.md`** — References "a photo platform favors Selfies" and "a professional platform favors Tutorials" but never enumerates which platforms exist or what their full affinity matrix is.

Without a proposal resolving this, platforms collapse into "three bars instead of one." The game loses the per-platform *character* that is the whole point of parallel progression tracks — and three accepted systems sit on undefined foundations.

This proposal names the three platforms, gives each a voice, defines the full affinity matrix, sets unlock thresholds, and names the interaction rules with Audience Mood, Creator Kit Phone, and the Algorithm.

## Proposal

### 1. The Three Platforms

| # | Name | Real-world analog | Voice |
|---|---|---|---|
| 1 | **Skroll** | early Twitter / Threads | Chaotic text-feed. Short-form, viral, high-churn. "Yap at the void and see what sticks." |
| 2 | **Instasham** | Instagram / Reels | Aspirational visual platform. Curated, aesthetic, staged. "Every post is a shrine to the life you pretend to have." |
| 3 | **Grindset** | LinkedIn + YouTube hybrid | Professional authority-building. Thought-leader, long-form, podcasty. "Every take is a keynote." |

Each platform is a distinct satirical target. Skroll mocks the text-dopamine feed. Instasham mocks aspirational curation. Grindset mocks hustle-culture thought leadership. A player who plays all three is performing three different versions of online selfhood — the satire.

---

### 2. Platform Character Sheets

#### Skroll (Platform 1)
- **Unlocked:** From tick one (starting platform, threshold 0).
- **Audience voice:** Brief, reactive, brutal. Quick to love, quicker to move on.
- **Fiction:** The bottom-of-the-feed. The first platform a creator posts to because it's free, fast, and requires nothing. You go viral here by accident more than design.
- **Mechanical character:** High churn, high reach, low loyalty. Rewards volume and viral plays. Punishes long-form.
- **Feels like:** Confetti. Numbers fly past, some of them stick. The chaos state.

#### Instasham (Platform 2)
- **Unlocked:** 500 total followers.
- **Audience voice:** Aesthetic, judgmental-but-polite, brand-conscious.
- **Fiction:** The visual empire. You curate a grid. You post reels. Every frame earns its place. Audiences are loyal if you match the vibe.
- **Mechanical character:** Medium churn, medium reach, medium-high loyalty. Rewards visuals and presence. Punishes text-only edge.
- **Feels like:** A gallery opening. Slower, cleaner, more consistent than Skroll.

#### Grindset (Platform 3)
- **Unlocked:** 5,000 total followers.
- **Audience voice:** Professional, self-serious, insecure about being seen as insecure.
- **Fiction:** The thought-leader platform. You have a podcast. You drop tutorials. You are "building in public." Audiences are glacial to arrive but deeply committed.
- **Mechanical character:** Low churn, slow-compounding reach, highest loyalty. Rewards authority content. Punishes chaos and spectacle.
- **Feels like:** An investment portfolio. Glacial but compounding. You plant this platform early and harvest it late.

---

### 3. Unlock Thresholds & Design Rationale

| Platform | Unlock Threshold (total followers) | Intended timing (first run) |
|---|---|---|
| Skroll | 0 | Available immediately |
| Instasham | 500 | ~5–8 minutes — right as single-platform loop starts feeling stale |
| Grindset | 5,000 | ~18–25 minutes — mid-run commitment, well before first rebrand |

**Why this order is fixed, not player-chosen:**

1. **Narrative arc.** Grow from casual (Skroll) → aesthetic (Instasham) → authority (Grindset) is a satire the game wants to tell. Player choice would scramble the arc.
2. **Upstream systems assume it.** `clout-upgrade-menu.md` names `instasham_headstart` (20 Clout, platform 2) and `grindset_headstart` (50 Clout, platform 3) — different costs for different platforms. Player-chosen order would break that pricing.
3. **Creator Kit Phone.** "Next-available platform" is well-defined only against a fixed sequence.
4. **Onboarding load.** Platform unlocks are teaching moments. Fixed order means the tutorial-less onboarding knows which to introduce when. (See draft `first-five-minutes-onboarding.md`.)

**Why these thresholds specifically:**

- **500 for Instasham:** Cheap enough that a player clicking + buying their first Selfies generator reaches it in ~5 minutes. Late enough that the single-platform loop has been *felt*. The unlock lands as relief ("new surface to work") not as noise ("another thing already?").
- **5,000 for Grindset:** Aligns with `tutorials` generator unlock threshold (1,000 from `generator-balance-and-algorithm-states.md`). By 5,000 total followers the player owns Tutorials, so Grindset unlocks at precisely the moment its boosted content becomes available. Thematic lock.

---

### 4. Platform × Generator Affinity Matrix

Affinity is a flat multiplier applied to follower gain from a post, separate from Algorithm modifiers and separate from retention. Three tiers:

| Tier | Multiplier | Label | Meaning |
|---|---|---|---|
| Boost | ×1.5 | ✓ | "This content thrives here." |
| Neutral | ×1.0 | – | "This content works here." |
| Penalty | ×0.6 | ✗ | "This audience doesn't want this." |

Values are design targets — balance tuning may adjust magnitudes. The *shape* of the matrix (which cells boost/neutral/penalty) is what this proposal locks in.

#### Launch Generators

| Generator | Skroll | Instasham | Grindset | Mechanical logic |
|---|---|---|---|---|
| selfies | – | ✓ | ✗ | Visual platform loves selfies; Grindset finds them unprofessional. |
| memes | ✓ | – | ✗ | Text/image memes are Skroll's native tongue; Grindset is above them. |
| hot_takes | ✓ | ✗ | – | Skroll rewards takes; Instasham's audience doesn't want arguments; Grindset tolerates "thought leadership" framing. |
| tutorials | ✗ | – | ✓ | Text/long-form tutorials die on Skroll; Grindset is built for them. |
| livestreams | – | ✓ | – | Instasham stories/lives are core; Grindset tolerates webinars; Skroll tolerates live chaos. |
| podcasts | ✗ | ✗ | ✓ | Audio long-form collapses on fast platforms; Grindset's whole voice. |
| viral_stunts | ✓ | – | ✗ | Skroll is viral-burst native; Grindset finds stunts cringe. |

**Reading the matrix:**

- **Skroll rewards speed and edge.** memes, hot_takes, viral_stunts boost. tutorials and podcasts penalty. selfies and livestreams neutral.
- **Instasham rewards visual+live.** selfies and livestreams boost. hot_takes and podcasts penalty. memes, tutorials, viral_stunts neutral.
- **Grindset rewards authority.** tutorials and podcasts boost. selfies, memes, viral_stunts penalty. hot_takes and livestreams neutral.

**Each platform boosts exactly 2 generators, penalizes exactly 3, and is neutral on the rest (2).** This symmetry is intentional — it keeps each platform a distinct strategic space with non-overlapping strengths.

**Strategic consequence:** No single generator boosts on every platform. No single platform boosts every generator. The player who runs all three platforms must diversify their content mix, which is the designed reason platforms exist.

#### Post-Prestige Generators (from `clout-upgrade-menu.md`)

| Generator | Skroll | Instasham | Grindset | Logic |
|---|---|---|---|---|
| ai_slop | ✓ | – | ✗ | AI-generated chaos fits Skroll's native form; Grindset rejects it as slop. |
| deepfakes | – | ✓ | ✗ | Visual deception thrives on Instasham; Grindset treats it as reputational suicide. |
| algorithmic_prophecy | ✓ | ✓ | ✓ | The endgame generator transcends platform voice. The joke is scale. |

**Algorithmic Prophecy's uniform boost is deliberate.** By the time the player unlocks it, they have mastered the game. Platform identity has served its purpose. The endgame generator landing everywhere is the "numbers stop making sense" punchline — even the platforms fold.

---

### 5. Interaction with Audience Mood (Retention)

Affinity is **orthogonal** to Audience Mood. Posting a boosted generator does NOT grant immunity to Content Fatigue on that platform.

- A player spamming Selfies on Instasham (boost = ×1.5) *still* triggers Content Fatigue on (Instasham, selfies). The audience loves selfies — until it's tired of yours.
- Content Fatigue's per-(platform, generator) scoping means the designer's intent is: "Boosted content gets fatigued just as fast, but starts from a higher gain baseline."

**Per-platform retention floors** (resolving open question 1):

Retention floor varies per platform to reflect audience character:

| Platform | Retention floor | Why |
|---|---|---|
| Skroll | 0.30 | Chaotic, high-churn audiences give up on you faster. Low loyalty. |
| Instasham | 0.40 | Aesthetic audiences forgive if the vibe recovers. |
| Grindset | 0.50 | Authority audiences are slow to churn — you earned them, they stick. |

**Design intent:** The floor is a second mechanical expression of platform character. Skroll's high churn = low floor (you can run this platform into the ground faster). Grindset's loyalty = high floor (hard to fully alienate an authority audience).

This also creates a strategic asymmetry: **a player who neglects Grindset loses less than a player who neglects Skroll**, because Grindset's floor is higher. Grindset is a "park and compound" platform; Skroll is a "stay attentive" platform. That asymmetry is the fiction paying its rent mechanically.

---

### 6. Interaction with Creator Kit Phone

Phone's sequential head-start is now fully defined:

- **Phone L1:** head-starts Platform 2 (Instasham) — if not already Clout-head-started.
- **Phone L2:** head-starts Platform 3 (Grindset) — if not already Clout-head-started.
- **Phone L3+:** inert until Platform 4+ exists (parking lot for post-launch platforms).

Combined with Clout head-starts, a maxed player can open a run with all three platforms unlocked. This is the designed endgame-run opening tempo.

**Phone ceiling behavior** (open question in `creator-kit-upgrades.md` OQ#1): with 3 launch platforms, Phone maxes at L2. The architect should enforce L2 max via static data, NOT via fallback-benefit. (Matches architect recommendation: "pick between Inert and Hidden.")

---

### 7. Interaction with Algorithm States

Platform affinity is **orthogonal to Algorithm state modifiers.** The full posting formula stacks:

```
follower_gain = base_rate
              × levelMultiplier(level)
              × effective_algorithm_modifier   (trend_sensitivity-folded)
              × platform_affinity              (this proposal)
              × retention                      (Audience Mood)
              × creator_kit_multipliers
              × viral_burst_multiplier (if active)
```

The strategic consequence: **Algorithm and Platform are independent decision axes.** A Hot Takes post during `engagement_bait` on Skroll stacks two boosts (Algorithm +90% effective × Platform ×1.5). A Hot Takes post during `corporate_takeover` on Grindset is a mild penalty × neutral = flat. The player learns to match mix-to-state AND mix-to-platform — two readings running in parallel.

**Flag for architecture:** this proposal adds one multiplier to the core tick formula (`platform_affinity`) at the same integration point as `content_affinity`. Architect confirmation that this is a clean slot in the existing formula is requested in reviewer pass.

---

### 8. What Switching Platforms Should FEEL Like (Discovery Target)

The moment a player unlocks a new platform is a peak beat. Here's what each unlock should feel like:

- **Unlocking Instasham (~5 min in):** *"Oh — now I have to post differently?"* Relief that the single-feed loop has ended + first discovery that content has context. The player posts a Hot Take to Instasham, gets ×0.6, reads the feedback ("audience doesn't want this"), pivots to Selfies, gets ×1.5, and the lesson lands without a tutorial.
- **Unlocking Grindset (~20 min in):** *"Now I'm running a business."* The player realizes they're managing three audiences with different preferences. The game-becomes-a-strategy-game moment. Grindset's higher floor and slower compounding makes it feel more like "an investment" than "a feed."
- **All 3 active:** *"I'm playing three games at once."* The Submission aesthetic (core loop trance) deepens because three counters are ticking in parallel and the player's eye learns to triage.

---

### 9. What This Locks In

- Platform names: Skroll, Instasham, Grindset
- Fixed order and unlock thresholds (0, 500, 5000)
- The full affinity matrix (7 launch generators + 3 post-prestige)
- Per-platform retention floors (0.30, 0.40, 0.50)
- Phone sequential mapping (L1 → Instasham, L2 → Grindset, L3+ inert)
- Orthogonal stacking with Algorithm and Audience Mood
- Platform affinity enters the core tick formula at the `content_affinity` line

### 10. What This Leaves Open

- Exact affinity multiplier magnitudes (×1.5 / ×1.0 / ×0.6) — balance tuning
- Post-launch Platform 4+ — deferred until after launch per core-identity architect note
- Per-platform visual language (color palette, iconography) — ux-designer
- Copy/flavor text for each platform's header, notifications, feed representations — ux-designer collaboration
- Whether `ai_slop`/`deepfakes` late-game content fatigue tuning matches launch generators or needs its own scale — follow-up balance task

## References

1. `.frames/sdlc/proposals/accepted/core-game-identity-and-loop.md` §5 — 3-platform commitment, content-affinity concept
2. `.frames/sdlc/proposals/accepted/audience-mood-retention.md` — per-(platform, generator) Content Fatigue, retention floor range
3. `.frames/sdlc/proposals/accepted/creator-kit-upgrades.md` — Phone sequential head-start, OQ#1 ceiling behavior
4. `.frames/sdlc/proposals/accepted/clout-upgrade-menu.md` — `instasham_headstart`, `grindset_headstart` costs and ordering
5. `.frames/sdlc/proposals/accepted/generator-balance-and-algorithm-states.md` — launch generator roster, unlock thresholds, Algorithm state modifiers
6. `.frames/sdlc/proposals/draft/first-five-minutes-onboarding.md` — platform unlock as onboarding teaching moments
7. `.frames/sdlc/architecture/core-systems.md` line 388 — tick formula integration point for `content_affinity` / `platform_affinity`

## Open Questions

1. **Are the names Skroll / Instasham / Grindset final, or should one change?** The game-designer's preference is to keep all three — Skroll in particular captures the doom-scroll satire in one word. **Owner: game-designer / user**
2. **Platform affinity magnitude: ×1.5 / ×1.0 / ×0.6 target — too wide, too narrow, or right?** The 0.6 penalty is strong enough to discourage off-platform posting without making penalty content useless. 1.5 boost stacks meaningfully with Algorithm modifiers without trivializing non-boosted play. Balance pass may retune after playtest. **Owner: game-designer (balance)**
3. **Does Algorithmic Prophecy's universal boost trivialize platform identity in the endgame?** It is intended to, as a satirical beat. If endgame playtest reveals platforms feel meaningless after Prophecy, consider boost→neutral on one platform to preserve differentiation. **Owner: game-designer (post-launch tuning)**
4. **Per-platform retention floors: does the architect need a per-platform field, or does the retention floor become `platform.retention_floor` in the data model?** Audience Mood proposal specifies floor ∈ 0.3–0.5 as a single range; this proposal splits it per-platform. Architect should confirm the data model change is a single field addition on Platform and not a larger refactor. **Owner: architect**
5. **Does the visual/UX language for each platform (color, iconography, card treatment) need to be proposed alongside, or as a separate ux-designer follow-up?** Recommend separate follow-up — this proposal locks character; UX locks surface. **Owner: ux-designer**
