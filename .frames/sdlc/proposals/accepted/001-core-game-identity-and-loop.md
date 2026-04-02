---
name: Core Game Identity & Loop
description: Proposal for how the game feels.
author: game-designer
status: accepted
reviewers: []
---

## Target Feeling

Gleeful accumulation with a wink. The player feels powerful watching numbers explode while the premise is inherently ridiculous. The game doesn't lecture or moralize — the satire lives in the theme, not the mechanics. Running a click farm is already absurd; the game leans into that absurdity and lets the player enjoy it.

The aesthetic goal (MDA): **Sensation** (juicy, flashy, satisfying feedback) and **Submission** (turn your brain off, watch numbers go up, have a fun time).

## Depth

Light. This is an Adventure Capitalist-style idle clicker, not an Antimatter Dimensions-style systems game. One primary currency, linear generator tiers, a simple prestige mechanic. No complex interlocking resource systems. No deep strategic puzzles. The skill ceiling is low and that's intentional — this game respects the player's desire to just vibe.

## Core Loop

1. **Click** to earn the primary currency (working name: "Followers")
2. **Buy generators** that produce Followers passively at increasing rates
3. **Buy upgrades** that multiply generator output or click value
4. **Prestige** — sacrifice all progress for a permanent multiplier, unlocking the next tier of absurdity
5. **Repeat** with bigger numbers, flashier generators, and more ridiculous scale

This is the whole game. Every feature we add must serve this loop or it doesn't belong.

## Where the Fun Lives

### 1. Juice
The #1 priority for this game's feel. Flashy animations, bright colors, particles, screen shake, satisfying sound, big number formatting (1.2M, 3.4B, 7.8T). When you buy something, it should FEEL like something happened. When you prestige, the screen should explode. The frontend carries this game.

### 2. Escalating Absurdity
The generators tell a story through scale:
- Early game: you're one person tapping a phone
- Mid game: you're running a warehouse of devices with bot networks
- Late game: you're manipulating platform algorithms, launching satellites, bribing politicians for favorable content regulation
- Post-prestige: the scale resets but the premise gets more ridiculous each time

The comedy is in the escalation. The player should laugh when they see what the next generator is.

### 3. Big Numbers
Idle clickers live and die by number presentation. Followers should climb visibly. Counters should tick up in real time. Milestones should pop. The feeling of going from thousands to millions to billions to trillions IS the game.

## What This Game Is NOT

- **Not a strategy game.** There are no wrong choices, just faster and slower paths. A player who buys generators in a suboptimal order still progresses.
- **Not a commentary game.** The theme is funny, but the game never wags its finger at the player. You're here to have fun, not feel guilty.
- **Not a complex economy.** One currency. Generators and upgrades. Prestige. That's the economy. If we're ever debating adding a second currency, the bar is extremely high.
- **Not a social game.** No leaderboards, no multiplayer, no competitive pressure. This is a solo chill experience.

## Engagement Line Check

This design is clean on the three-question test:
1. **Is it honest?** Yes — what you see is what you get. No hidden mechanics, no deceptive reward schedules.
2. **Can the player quit without loss?** Yes — idle progress accumulates while away. No daily login penalties, no streak mechanics, no FOMO.
3. **Is progression tied to engagement, not just time?** Yes — clicking and buying decisions accelerate progress. Time alone progresses you, but engagement progresses you faster. No paywall, no monetized shortcuts.

No dark patterns. The game is fun because it's fun, not because it's manipulative.

## Open Questions for Architect (Resolved)

- **What's the right state model for an idle clicker that needs to calculate offline progress on return?** Architect answer: snapshot-based model — save full game state with a timestamp, calculate offline earnings analytically on return (generators × rates × elapsed time × multipliers). For a linear generator model this is O(1) regardless of time away. No tick-by-tick simulation needed. Exact state shape and offline calculation contract will be defined in the architecture spec.
- **Frontend framework choice matters more than usual here — juice/animation quality is the #1 differentiator. The game designer's position is: optimize for animation capability over architectural purity.** Architect answer: constraint accepted. Framework selection will prioritize fine-grained rendering control and frequent DOM update performance (ticking counters, particles, screen shake). Recommendation will be delivered in the architecture spec.

## Open Questions for Game Designer (from Architect Review) — Resolved

- **Prestige generator model:** Same generator list with a permanent multiplier. The player rebuys the same generators each prestige, but everything scales faster due to the multiplier. No new generator catalogs per layer. The fun is in the scale, not new systems to learn.
- **Upgrade stacking model:** Both per-generator and global upgrades exist. Per-generator upgrades let the player invest within a tier; global upgrades create "everything just got better" moments. All upgrades stack multiplicatively — this is what drives the exponential number growth the game wants.

## Decision Requested

Align on this as the foundational identity for Click Farm. Every future proposal builds on top of these constraints. If anything here is wrong, now is the time to flag it.

---

## Review Log

### architect — 2026-04-02

**Assessment:** request-changes

The core loop, depth constraint, and engagement line are all architecturally sound. The single-currency model with linear generators and analytical offline calculation is clean to spec and implement. No structural concerns with the proposed identity.

**Blocking:**

- The prestige generator model question (see "Open Questions for Game Designer") must be answered before I can approve. The data model diverges significantly between "same generator list + permanent multiplier" (flat state, scalar multiplier) and "new generator catalog per prestige layer" (layered state, growing entity catalog). I cannot produce an architecture spec that covers both without introducing unnecessary abstraction. Need a decision.

**Non-blocking:**

- The upgrade stacking model needs definition before architecture work begins. Are upgrades per-generator, global, or both? Do multiple upgrades stack multiplicatively or additively? This is a design question — flagging it now so it doesn't become a blocker later.
- The "one currency" constraint is load-bearing. I will treat it as a hard architectural constraint. Introducing a second currency later would require structural changes to state, offline calculation, and prestige reset scope. The proposal's high bar is noted and respected.
- Offline calculation approach (analytical, O(1)) is confirmed sound for the proposed linear generator model, as long as no time-dependent rate changes are introduced.

**For game-designer:**
- Answer the prestige generator model question — same list with multiplier, or new catalog per layer?
- Define upgrade stacking model (per-generator vs. global, multiplicative vs. additive) before or during architecture phase

### architect — 2026-04-02 (follow-up)

**Assessment:** approve

Both blocking and non-blocking questions are now resolved:

- **Prestige model:** Same generator list + permanent multiplier. This gives a flat state model — one generator catalog, one scalar prestige multiplier. Clean to spec and implement.
- **Upgrade stacking:** Per-generator and global, multiplicative stacking. This means the damage formula is: `base_rate × generator_count × product(per_gen_upgrades) × product(global_upgrades) × prestige_multiplier`. Straightforward to calculate analytically for offline progress.

No remaining architectural concerns. This proposal is ready to accept. Once accepted, I will produce:
1. An architecture spec covering state model, offline calculation contract, and frontend data requirements
2. Engineer tasks with explicit done-whens

### game-designer — 2026-04-02

**Assessment:** approve

The proposal accurately captures the game's identity and core loop. Target feeling is precisely named, MDA trace is correct (Sensation + Submission), and every mechanic traces back to those aesthetics. The resolved design decisions — same generators with scalar prestige multiplier, multiplicative upgrade stacking — are the right calls for the stated depth.

**Non-blocking observations:**

- The "no wrong choices" principle is load-bearing for the chill factor. Worth remembering during implementation: the *illusion of choice* still matters. Pacing — making some generators feel like breakthroughs — does this work without adding real complexity.
- The single-currency constraint is correct and should be defended. If pressure to add a second currency ever arises, it almost certainly means the first one has a faucet/drain imbalance. Fix the economy, don't add complexity.

**For ux-designer:**
- Juice is called out as the #1 priority. The game-designer position is that this game lives or dies on frontend feel — animation quality, number presentation, feedback on every action. The UX review should confirm whether the "escalating absurdity" narrative through generators creates enough visual/thematic variety to sustain interest across prestige cycles.

### ux-designer — 2026-04-02

**Assessment:** approve

The core loop is tight and maps cleanly to a single primary screen with a shop/upgrade panel. Juice as the #1 priority is the correct call — this game's feel IS the product. The zero-tutorial test should pass naturally for a loop this simple. No structural UX concerns with the proposed identity.

**Non-blocking observations:**

- **Escalating absurdity across prestiges:** The generator list is the same each cycle, but the proposal promises the premise "gets more ridiculous each time." Bigger numbers alone won't land that comedy beat. The UX spec needs to define what changes visually to signal escalation when the content is structurally identical — options include visual theming per prestige tier, generator name/description variants, or environmental changes on the main screen. This is a presentation problem, not a design problem, and I'll solve it in the UX spec phase.
- **Prestige as a screen moment:** This is simultaneously the biggest payoff and the most psychologically risky moment (loss aversion). The motion design must overwhelm the feeling of loss with spectacle — the player should feel triumph, not grief. This will be a first-class motion brief deliverable.
- **Number presentation is a trust signal problem:** How numbers tick, how they format at scale transitions (999K → 1.0M), how milestones celebrate — these are UX decisions that directly affect whether the player trusts and engages with the core loop. I'll treat this as a first-class deliverable, not a formatting afterthought.

**For architect:**
- The UX spec will define animation and number presentation requirements that have frontend performance implications (ticking counters, particles, screen shake). Flagging early so the architecture spec accounts for rendering performance as a constraint.
