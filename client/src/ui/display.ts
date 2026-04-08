// Display metadata for the core game screen: labels, icons, categories,
// and semantic colors.
//
// This is presentation-only data. Game logic MUST NOT read from here —
// everything here is about how things look and read.
//
// Icons use emoji as provisional glyphs per UX spec §6.1 — the four
// differentiators are icon + semantic color + category badge shape + stable
// ordering with category dividers. A proper icon pass is a follow-up task
// for ux-designer.
//
// String fields (name, tagline) are i18next translation keys — resolve them
// via t() at the consumption site. Keys live in the "game" namespace.

import type {
  GeneratorId,
  PlatformId,
} from '../types.ts';

// ---------------------------------------------------------------------------
// Generator display
// ---------------------------------------------------------------------------

export type GeneratorCategory = 'starter' | 'mid' | 'late';

export interface GeneratorDisplay {
  /** i18n key for the human-facing name (game namespace). */
  name: string;
  /** Provisional icon glyph (emoji). Will be replaced by real iconography. */
  icon: string;
  /** Pre-attentive grouping for the badge shape (UX §6.1). */
  category: GeneratorCategory;
  /** Semantic color lane — grouped by content family per UX §6.1. */
  color: string;
  /** i18n key for one-line description shown on drawer tap. */
  tagline: string;
}

export const GENERATOR_DISPLAY: Record<GeneratorId, GeneratorDisplay> = {
  chirps: {
    name: 'game:generators.chirps.name',
    icon: '💬',
    category: 'starter',
    color: '#4d9ef0',
    tagline: 'game:generators.chirps.tagline',
  },
  selfies: {
    name: 'game:generators.selfies.name',
    icon: '🤳',
    category: 'starter',
    color: '#f2a365',
    tagline: 'game:generators.selfies.tagline',
  },
  memes: {
    name: 'game:generators.memes.name',
    icon: '😹',
    category: 'starter',
    color: '#e4789e',
    tagline: 'game:generators.memes.tagline',
  },
  hot_takes: {
    name: 'game:generators.hot_takes.name',
    icon: '🔥',
    category: 'mid',
    color: '#d96c5a',
    tagline: 'game:generators.hot_takes.tagline',
  },
  tutorials: {
    name: 'game:generators.tutorials.name',
    icon: '📚',
    category: 'mid',
    color: '#7aa5c7',
    tagline: 'game:generators.tutorials.tagline',
  },
  livestreams: {
    name: 'game:generators.livestreams.name',
    icon: '🎥',
    category: 'late',
    color: '#9b6fc7',
    tagline: 'game:generators.livestreams.tagline',
  },
  podcasts: {
    name: 'game:generators.podcasts.name',
    icon: '🎙️',
    category: 'late',
    color: '#6fb89b',
    tagline: 'game:generators.podcasts.tagline',
  },
  mogging: {
    name: 'game:generators.mogging.name',
    icon: '🗿',
    category: 'late',
    color: '#e8b84a',
    tagline: 'game:generators.mogging.tagline',
  },
  // Post-prestige generators — unlocked only via Clout upgrades.
  ai_slop: {
    name: 'game:generators.ai_slop.name',
    icon: '🤖',
    category: 'late',
    color: '#8a8ae8',
    tagline: 'game:generators.ai_slop.tagline',
  },
  deepfakes: {
    name: 'game:generators.deepfakes.name',
    icon: '🎭',
    category: 'late',
    color: '#c265c2',
    tagline: 'game:generators.deepfakes.tagline',
  },
  algorithmic_prophecy: {
    name: 'game:generators.algorithmic_prophecy.name',
    icon: '🔮',
    category: 'late',
    color: '#d4af37',
    tagline: 'game:generators.algorithmic_prophecy.tagline',
  },
};

/**
 * Stable order of generators. Per UX §6.1: "Rows are ordered by unlock order,
 * grouped under category dividers." Muscle memory builds from this.
 */
export const GENERATOR_ORDER: readonly GeneratorId[] = [
  'chirps',
  'selfies',
  'livestreams',
  'podcasts',
  'mogging',
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
  starter: 'game:generatorCategories.starter',
  mid: 'game:generatorCategories.mid',
  late: 'game:generatorCategories.late',
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
  /** i18n key for the platform name (game namespace). */
  name: string;
  icon: string;
  accent: string;
  /** i18n key for the tagline (game namespace). */
  tagline: string;
  /** Pixel-art asset for the platform card background. */
  image?: string;
  /** i18n key for the label shown below the follower count. */
  audienceLabel?: string;
  /** CSS gradient for the top border (overrides solid accent). */
  accentGradient?: string;
}

import chirperImg from '../assets/chirper.png';
import picshiftImg from '../assets/picshift.png';
import skrollImg from '../assets/skroll.png';
import podpodImg from '../assets/podpod.png';

export const PLATFORM_DISPLAY: Record<PlatformId, PlatformDisplay> = {
  chirper: {
    name: 'game:platforms.chirper.name',
    icon: '🐦',
    accent: '#4a9dd6',
    tagline: 'game:platforms.chirper.tagline',
    image: chirperImg,
  },
  picshift: {
    name: 'game:platforms.picshift.name',
    icon: '📸',
    accent: '#d6579e',
    tagline: 'game:platforms.picshift.tagline',
    image: picshiftImg,
    accentGradient: 'linear-gradient(to right, #d6579e, #f0b840)',
  },
  skroll: {
    name: 'game:platforms.skroll.name',
    icon: '📱',
    accent: '#b84dff',
    tagline: 'game:platforms.skroll.tagline',
    image: skrollImg,
  },
  // PLACEHOLDER display metadata — game-designer owns final values (task #131 OQ #2).
  podpod: {
    name: 'game:platforms.podpod.name',
    icon: '🎧',
    accent: '#8b6fb8',
    tagline: 'game:platforms.podpod.tagline',
    image: podpodImg,
    audienceLabel: 'ui:platforms.followers',
  },
};

export const PLATFORM_ORDER: readonly PlatformId[] = [
  'chirper',
  'picshift',
  'skroll',
  'podpod',
];

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
