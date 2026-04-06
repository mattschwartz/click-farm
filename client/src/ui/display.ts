// Display metadata for the core game screen: labels, icons, categories,
// semantic colors, and algorithm mood palettes.
//
// This is presentation-only data. Game logic MUST NOT read from here —
// everything here is about how things look and read.
//
// Icons use emoji as provisional glyphs per UX spec §6.1 — the four
// differentiators are icon + semantic color + category badge shape + stable
// ordering with category dividers. A proper icon pass is a follow-up task
// for ux-designer.

import type {
  AlgorithmStateId,
  GeneratorId,
  PlatformId,
} from '../types.ts';

// ---------------------------------------------------------------------------
// Generator display
// ---------------------------------------------------------------------------

export type GeneratorCategory = 'starter' | 'mid' | 'late';

export interface GeneratorDisplay {
  /** Human-facing name. */
  name: string;
  /** Provisional icon glyph (emoji). Will be replaced by real iconography. */
  icon: string;
  /** Pre-attentive grouping for the badge shape (UX §6.1). */
  category: GeneratorCategory;
  /** Semantic color lane — grouped by content family per UX §6.1. */
  color: string;
  /** One-line description shown on drawer tap (not yet implemented). */
  tagline: string;
}

export const GENERATOR_DISPLAY: Record<GeneratorId, GeneratorDisplay> = {
  chirps: {
    name: 'Chirps',
    icon: '💬',
    category: 'starter',
    color: '#4a9dd6',
    tagline: 'Quick text posts — your voice in 280 characters.',
  },
  selfies: {
    name: 'Selfies',
    icon: '🤳',
    category: 'starter',
    color: '#f2a365',
    tagline: 'Low effort, low yield — everyone starts here.',
  },
  memes: {
    name: 'Memes',
    icon: '😹',
    category: 'starter',
    color: '#e4789e',
    tagline: 'Higher variance, trend-sensitive.',
  },
  hot_takes: {
    name: 'Hot Takes',
    icon: '🔥',
    category: 'mid',
    color: '#d96c5a',
    tagline: 'High engagement, risk of backlash.',
  },
  tutorials: {
    name: 'Tutorials',
    icon: '📚',
    category: 'mid',
    color: '#7aa5c7',
    tagline: 'Steady, reliable, boring.',
  },
  livestreams: {
    name: 'Livestreams',
    icon: '🎥',
    category: 'late',
    color: '#9b6fc7',
    tagline: 'High yield, requires active attention.',
  },
  podcasts: {
    name: 'Podcasts',
    icon: '🎙️',
    category: 'late',
    color: '#6fb89b',
    tagline: 'Slow build, compounding returns.',
  },
  viral_stunts: {
    name: 'Viral Stunts',
    icon: '🎪',
    category: 'late',
    color: '#e8b84a',
    tagline: 'Massive spikes, cooldown period.',
  },
  // Post-prestige generators — unlocked only via Clout upgrades.
  ai_slop: {
    name: 'AI Slop',
    icon: '🤖',
    category: 'late',
    color: '#8a8ae8',
    tagline: 'Infinite content, zero soul.',
  },
  deepfakes: {
    name: 'Deepfakes',
    icon: '🎭',
    category: 'late',
    color: '#c265c2',
    tagline: 'Fake celebrities, real engagement.',
  },
  algorithmic_prophecy: {
    name: 'Algorithmic Prophecy',
    icon: '🔮',
    category: 'late',
    color: '#d4af37',
    tagline: 'Tell people what they already thought.',
  },
};

/**
 * Stable order of generators. Per UX §6.1: "Rows are ordered by unlock order,
 * grouped under category dividers." Muscle memory builds from this.
 */
export const GENERATOR_ORDER: readonly GeneratorId[] = [
  'chirps',
  'selfies',
  'memes',
  'hot_takes',
  'tutorials',
  'livestreams',
  'podcasts',
  'viral_stunts',
  'ai_slop',
  'deepfakes',
  'algorithmic_prophecy',
];

export const CATEGORY_ORDER: readonly GeneratorCategory[] = [
  'starter',
  'mid',
  'late',
];

export const CATEGORY_LABEL: Record<GeneratorCategory, string> = {
  starter: 'STARTER',
  mid: 'MID',
  late: 'LATE',
};

/**
 * Post-prestige generators — unlocked only via Clout upgrades, displayed in
 * the Clout Shop modal (not in the main generator list). Task #70.
 */
export const POST_PRESTIGE_GENERATORS: readonly GeneratorId[] = [
  'ai_slop',
  'deepfakes',
  'algorithmic_prophecy',
];

// ---------------------------------------------------------------------------
// Platform display
// ---------------------------------------------------------------------------

export interface PlatformDisplay {
  name: string;
  icon: string;
  accent: string;
  tagline: string;
}

export const PLATFORM_DISPLAY: Record<PlatformId, PlatformDisplay> = {
  chirper: {
    name: 'Chirper',
    icon: '🐦',
    accent: '#4a9dd6',
    tagline: 'Hot takes and one-liners.',
  },
  instasham: {
    name: 'InstaSham',
    icon: '📸',
    accent: '#d6579e',
    tagline: 'Photos and curated aesthetics.',
  },
  grindset: {
    name: 'Grindset',
    icon: '💼',
    accent: '#5eae8f',
    tagline: 'Hustle culture and thought leadership.',
  },
};

export const PLATFORM_ORDER: readonly PlatformId[] = [
  'chirper',
  'instasham',
  'grindset',
];

// ---------------------------------------------------------------------------
// Algorithm mood library (UX spec §4.2)
// ---------------------------------------------------------------------------

export interface AlgorithmMood {
  name: string;
  /** Seconds for one full drift cycle (UX §4.2 motion signature). */
  cycleSeconds: number;
  /** Narrative tone for flavor text — one line. */
  tagline: string;
  /**
   * Per-state edge color for the mood vignette (hex).
   * MUST match the Tier-1 --palette-mood-* value in tokens.css.
   */
  moodEdgeColor: string;
  /**
   * Base opacity for the mood vignette, [0.14, 0.22].
   * MUST match the --mood-edge-opacity value in tokens.css.
   */
  moodEdgeOpacity: number;
}

// Per-state moodEdgeColor and moodEdgeOpacity MUST match the Tier-1
// palette entries and --mood-edge-opacity values in tokens.css. See
// architecture/visual-theming.md §Coupling Analysis for why both exist.
export const ALGORITHM_MOOD: Record<AlgorithmStateId, AlgorithmMood> = {
  short_form_surge: {
    name: 'Short-Form Surge',
    cycleSeconds: 6,
    tagline: 'Electric, impatient.',
    moodEdgeColor: '#E87B3C',
    moodEdgeOpacity: 0.18,
  },
  authenticity_era: {
    name: 'Authenticity Era',
    cycleSeconds: 12,
    tagline: 'Cool, quiet.',
    moodEdgeColor: '#4F8A7A',
    moodEdgeOpacity: 0.18,
  },
  engagement_bait: {
    name: 'Engagement Bait',
    cycleSeconds: 4,
    tagline: 'Garish, pulsing.',
    moodEdgeColor: '#D63A82',
    moodEdgeOpacity: 0.22,
  },
  nostalgia_wave: {
    name: 'Nostalgia Wave',
    cycleSeconds: 15,
    tagline: 'Warm, slow, looping.',
    moodEdgeColor: '#7A4FA8',
    moodEdgeOpacity: 0.18,
  },
  corporate_takeover: {
    name: 'Corporate Takeover',
    cycleSeconds: 20,
    tagline: 'Flat, cold, inevitable.',
    moodEdgeColor: '#8A95A8',
    moodEdgeOpacity: 0.14,
  },
  // algorithm_winter and viral_storm from the mood library are not in
  // AlgorithmStateId yet — they'd be added when the algorithm state roster
  // grows. (UX spec shows 5 moods; static data has 5 matching states.)
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a top-3 list of generators this platform favors. */
export function topAffinityGenerators(
  affinity: Record<GeneratorId, number>,
  limit = 3,
): Array<{ id: GeneratorId; affinity: number }> {
  return (Object.keys(affinity) as GeneratorId[])
    .map((id) => ({ id, affinity: affinity[id] }))
    .sort((a, b) => b.affinity - a.affinity)
    .slice(0, limit);
}
