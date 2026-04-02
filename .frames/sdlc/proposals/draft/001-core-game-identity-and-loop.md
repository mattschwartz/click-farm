# Proposal: Core Game Identity & Loop

**Status:** draft
**Author:** game-designer
**Review required:** architect

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

## Open Questions for Architect

- What's the right state model for an idle clicker that needs to calculate offline progress on return? This affects how generators and multipliers are stored.
- Frontend framework choice matters more than usual here — juice/animation quality is the #1 differentiator. The game designer's position is: optimize for animation capability over architectural purity.

## Decision Requested

Align on this as the foundational identity for Click Farm. Every future proposal builds on top of these constraints. If anything here is wrong, now is the time to flag it.
