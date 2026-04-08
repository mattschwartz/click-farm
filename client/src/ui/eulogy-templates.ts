// Eulogy stanza templates for Rebrand Ceremony Phase 2 (task #65).
//
// UX spec: ux/prestige-rebrand-screen.md §4.3
//
// The Eulogy phase plays 3–4 short stanzas that comment on the run that just
// ended. Tone: affectionate, deadpan, satirical. Punchlines land via
// juxtaposition — a factual claim followed by a deflating coda.
//
// IMPORTANT — data-driven with run-state substitution, but the content
// itself is game-designer territory (spec §9.3). This file ships an initial
// placeholder set of 3 stanzas that the game-designer will expand later.
//
// Data sources the spec calls for:
//   1. top platform by followers
//   2. top generator by lifetime engagement
//   3. total engagement earned
//
// Current game state tracks (1) and (3) directly. It does NOT track:
//   - per-generator lifetime engagement
//
// The initial stanzas below work within these constraints. Expanding run-
// state tracking is a separate architecture question for follow-up.

import type { GameState, PlatformId } from '../types.ts';
import { PLATFORM_DISPLAY } from './display.ts';
import { fmtCompactInt } from './format.ts';

// ---------------------------------------------------------------------------
// Data helpers (exported for testing)
// ---------------------------------------------------------------------------

/** Names of all unlocked platforms, joined with commas and "and". */
export function unlockedPlatformsList(state: GameState, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const unlocked = (Object.keys(state.platforms) as PlatformId[])
    .filter((id) => state.platforms[id].unlocked)
    .map((id) => t(PLATFORM_DISPLAY[id].name));
  if (unlocked.length === 0) return t('narrative:eulogy.noPlatforms');
  if (unlocked.length === 1) return unlocked[0];
  if (unlocked.length === 2) return `${unlocked[0]} ${t('narrative:eulogy.and')} ${unlocked[1]}`;
  return `${unlocked.slice(0, -1).join(', ')}, ${t('narrative:eulogy.and')} ${unlocked[unlocked.length - 1]}`;
}

// ---------------------------------------------------------------------------
// Stanza generation
// ---------------------------------------------------------------------------

/**
 * Build the 3 eulogy stanzas for the given game state. Returns an array of
 * strings ready for sequential display in Phase 2.
 *
 * TODO(game-designer): expand to ~20 templates with variety, per spec §9.3.
 * TODO(architect): add run-state tracking for per-generator lifetime
 *   engagement so stanzas can use richer data described in the spec.
 */
export function buildEulogyStanzas(state: GameState, t: (key: string, opts?: Record<string, unknown>) => string): string[] {
  const followers = fmtCompactInt(state.player.total_followers);
  const platforms = unlockedPlatformsList(state, t);
  const engagement = fmtCompactInt(state.player.lifetime_engagement);

  return [
    t('narrative:eulogy.hadFollowers', { followers, platforms }),
    t('narrative:eulogy.willNotRemember'),
    t('narrative:eulogy.madEngagement', { engagement }),
  ];
}
