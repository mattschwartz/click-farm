// Audience Mood model-layer tests. See architecture/audience-mood.md for
// authoritative semantics. Task #104 AC #11.

import { describe, it, expect } from 'vitest';
import type {
  GameState,
  PlatformState,
  StaticData,
} from '../types.ts';
import { STATIC_DATA } from '../static-data/index.ts';
import { createInitialGameState } from '../model/index.ts';
import {
  applyPostToPressures,
  advanceNeglect,
  recomputeRetention,
  recomputeAllRetention,
  applyTickPosts,
} from './index.ts';

const T0 = 1_700_000_000_000;

function freshState(): GameState {
  const s = createInitialGameState(STATIC_DATA, T0);
  // Force all three platforms unlocked for tests that need cross-platform
  // routing. Followers stay 0.
  return {
    ...s,
    platforms: {
      chirper: { ...s.platforms.chirper, unlocked: true },
      instasham: { ...s.platforms.instasham, unlocked: true },
      grindset: { ...s.platforms.grindset, unlocked: true },
    },
  };
}

function withPlatform(state: GameState, id: 'chirper' | 'instasham' | 'grindset', patch: Partial<PlatformState>): GameState {
  return {
    ...state,
    platforms: {
      ...state.platforms,
      [id]: { ...state.platforms[id], ...patch },
    },
  };
}

describe('applyPostToPressures', () => {
  it('accumulates content_fatigue on a same-generator post (clamped to [0,1])', () => {
    const s0 = freshState();
    const cfg = STATIC_DATA.audience_mood;
    const s1 = applyPostToPressures(s0, STATIC_DATA, 'chirper', 'selfies');
    expect(s1.platforms.chirper.content_fatigue.selfies).toBeCloseTo(
      cfg.content_fatigue_per_post_same_gen,
      10,
    );
    // Run enough posts to saturate — value must clamp at 1.0.
    let s = s1;
    for (let i = 0; i < 200; i++) {
      s = applyPostToPressures(s, STATIC_DATA, 'chirper', 'selfies');
    }
    expect(s.platforms.chirper.content_fatigue.selfies).toBe(1);
  });

  it('decays content_fatigue on other generators when a different generator posts', () => {
    const s0 = withPlatform(freshState(), 'chirper', {
      content_fatigue: { selfies: 0.8, memes: 0.5 },
    });
    const cfg = STATIC_DATA.audience_mood;
    const s1 = applyPostToPressures(s0, STATIC_DATA, 'chirper', 'memes');
    // memes post bumps its own fatigue, decays selfies.
    expect(s1.platforms.chirper.content_fatigue.memes).toBeCloseTo(
      0.5 + cfg.content_fatigue_per_post_same_gen,
      10,
    );
    expect(s1.platforms.chirper.content_fatigue.selfies).toBeCloseTo(
      Math.max(0, 0.8 - cfg.content_fatigue_decay_per_post_other_gen),
      10,
    );
  });

  it('resets neglect fully on any post (default neglect_reset_on_post=1.0)', () => {
    const s0 = withPlatform(freshState(), 'chirper', { neglect: 0.9 });
    const s1 = applyPostToPressures(s0, STATIC_DATA, 'chirper', 'selfies');
    expect(s1.platforms.chirper.neglect).toBe(0);
  });

  it('accumulates algorithm_misalignment on an off-trend post', () => {
    // Pick a generator whose current algorithm modifier is < 1.0 on the
    // initial algorithm state (short_form_surge, default): podcasts = 0.5.
    const s0 = freshState();
    const cfg = STATIC_DATA.audience_mood;
    expect(s0.algorithm.state_modifiers.podcasts).toBeLessThan(cfg.alignment_threshold);
    const s1 = applyPostToPressures(s0, STATIC_DATA, 'chirper', 'podcasts');
    expect(s1.platforms.chirper.algorithm_misalignment).toBeCloseTo(
      cfg.misalignment_per_off_trend_post,
      10,
    );
  });

  it('decays algorithm_misalignment on an aligned post', () => {
    // Memes under short_form_surge: 1.8 ≥ 1.0 → aligned.
    const s0 = withPlatform(freshState(), 'chirper', {
      algorithm_misalignment: 0.5,
    });
    const cfg = STATIC_DATA.audience_mood;
    const s1 = applyPostToPressures(s0, STATIC_DATA, 'chirper', 'memes');
    expect(s1.platforms.chirper.algorithm_misalignment).toBeCloseTo(
      Math.max(0, 0.5 - cfg.misalignment_decay_per_aligned_post),
      10,
    );
  });

  it('recomputes retention after mutating pressures', () => {
    const s0 = freshState();
    const s1 = applyPostToPressures(s0, STATIC_DATA, 'chirper', 'selfies');
    // Pre: retention=1.0. Post-one-selfies-post: chirper.selfies fatigue = 0.08
    // → drag_fatigue = 0.08 * 0.5 = 0.04 → retention = 0.96 (no neglect/misalign).
    expect(s1.platforms.chirper.retention).toBeCloseTo(0.96, 10);
  });
});

describe('advanceNeglect', () => {
  it('accumulates neglect per tick on every unlocked platform, clamped to [0,1]', () => {
    const s0 = freshState();
    const cfg = STATIC_DATA.audience_mood;
    const s1 = advanceNeglect(s0, STATIC_DATA, 10);
    expect(s1.platforms.chirper.neglect).toBeCloseTo(cfg.neglect_per_tick * 10, 10);
    expect(s1.platforms.instasham.neglect).toBeCloseTo(cfg.neglect_per_tick * 10, 10);
    // Saturate.
    const s2 = advanceNeglect(s1, STATIC_DATA, 1_000_000);
    expect(s2.platforms.chirper.neglect).toBe(1);
  });

  it('skips locked platforms', () => {
    const base = createInitialGameState(STATIC_DATA, T0);
    // chirper unlocked (threshold=0), instasham/grindset locked.
    const s1 = advanceNeglect(base, STATIC_DATA, 10);
    expect(s1.platforms.chirper.neglect).toBeGreaterThan(0);
    expect(s1.platforms.instasham.neglect).toBe(0);
    expect(s1.platforms.grindset.neglect).toBe(0);
  });

  it('recomputes retention on touched platforms', () => {
    const s0 = freshState();
    const cfg = STATIC_DATA.audience_mood;
    // Advance enough ticks to drive neglect to saturation (retention should
    // drop below 1.0 once drag_neglect > 0).
    const s1 = advanceNeglect(s0, STATIC_DATA, 10);
    const expectedNeglect = cfg.neglect_per_tick * 10;
    const expectedRetention =
      1 * 1 * (1 - expectedNeglect * cfg.neglect_weight);
    expect(s1.platforms.chirper.retention).toBeCloseTo(expectedRetention, 10);
  });

  it('is a no-op when deltaTicks ≤ 0', () => {
    const s0 = freshState();
    expect(advanceNeglect(s0, STATIC_DATA, 0)).toBe(s0);
    expect(advanceNeglect(s0, STATIC_DATA, -5)).toBe(s0);
  });
});

describe('recomputeRetention', () => {
  const cfg = STATIC_DATA.audience_mood;

  function platformWith(patch: Partial<PlatformState>): PlatformState {
    return {
      id: 'chirper',
      unlocked: true,
      followers: 0,
      retention: 1.0,
      content_fatigue: {},
      neglect: 0,
      algorithm_misalignment: 0,
      ...patch,
    };
  }

  it('returns 1.0 retention and null dominant on a healthy platform', () => {
    const p = platformWith({});
    const r = recomputeRetention(p, STATIC_DATA);
    expect(r.retention).toBe(1.0);
    expect(r.dominantPressure).toBeNull();
    expect(r.dominantGenerator).toBeNull();
  });

  it('composes single-pressure case correctly (fatigue only)', () => {
    const p = platformWith({ content_fatigue: { selfies: 0.5 } });
    const r = recomputeRetention(p, STATIC_DATA);
    const expected = 1 - 0.5 * cfg.fatigue_weight;
    expect(r.retention).toBeCloseTo(expected, 10);
    expect(r.dominantPressure).toBe('content_fatigue');
    expect(r.dominantGenerator).toBe('selfies');
  });

  it('composes multi-pressure case multiplicatively', () => {
    const p = platformWith({
      content_fatigue: { selfies: 0.4 },
      neglect: 0.3,
      algorithm_misalignment: 0.2,
    });
    const r = recomputeRetention(p, STATIC_DATA);
    const expected =
      (1 - 0.4 * cfg.fatigue_weight) *
      (1 - 0.3 * cfg.neglect_weight) *
      (1 - 0.2 * cfg.misalignment_weight);
    expect(r.retention).toBeCloseTo(expected, 10);
  });

  it('clamps retention at retention_floor when pressures are fully saturated', () => {
    const p = platformWith({
      content_fatigue: { selfies: 1.0 },
      neglect: 1.0,
      algorithm_misalignment: 1.0,
    });
    const r = recomputeRetention(p, STATIC_DATA);
    expect(r.retention).toBe(cfg.retention_floor);
  });

  it('picks the largest-drag pressure as dominant', () => {
    // Neglect has biggest drag: 0.6 * 0.5 = 0.30 vs fatigue 0.1*0.5=0.05
    const p = platformWith({
      content_fatigue: { selfies: 0.1 },
      neglect: 0.6,
      algorithm_misalignment: 0.2,
    });
    const r = recomputeRetention(p, STATIC_DATA);
    expect(r.dominantPressure).toBe('neglect');
    expect(r.dominantGenerator).toBeNull();
  });

  it('tie-breaks dominant pressure using composition_priority', () => {
    // All three equal (0.5 each; all weights 0.5 → all drags=0.25).
    const p = platformWith({
      content_fatigue: { selfies: 0.5 },
      neglect: 0.5,
      algorithm_misalignment: 0.5,
    });
    const r = recomputeRetention(p, STATIC_DATA);
    // composition_priority default: content_fatigue > algorithm_misalignment > neglect
    expect(r.dominantPressure).toBe('content_fatigue');
  });

  it('returns null dominant when retention ≥ degradation_threshold (strip hidden)', () => {
    // Tiny pressure → retention just below 1.0, above degradation_threshold (0.95).
    const p = platformWith({ content_fatigue: { selfies: 0.05 } });
    const r = recomputeRetention(p, STATIC_DATA);
    expect(r.retention).toBeGreaterThanOrEqual(cfg.degradation_threshold);
    expect(r.dominantPressure).toBeNull();
  });

  it('populates dominantGenerator with the worst-fatigue generator', () => {
    const p = platformWith({
      content_fatigue: { selfies: 0.2, memes: 0.8, hot_takes: 0.4 },
    });
    const r = recomputeRetention(p, STATIC_DATA);
    expect(r.dominantPressure).toBe('content_fatigue');
    expect(r.dominantGenerator).toBe('memes');
  });
});

describe('recomputeAllRetention', () => {
  it('normalises retention across every platform from stored pressures', () => {
    const base = freshState();
    const mutated: GameState = {
      ...base,
      platforms: {
        ...base.platforms,
        chirper: {
          ...base.platforms.chirper,
          // stored retention is stale (1.0) but pressures say otherwise.
          retention: 1.0,
          neglect: 0.5,
        },
        instasham: {
          ...base.platforms.instasham,
          retention: 1.0,
          content_fatigue: { memes: 0.5 },
        },
        grindset: base.platforms.grindset,
      },
    };
    const s1 = recomputeAllRetention(mutated, STATIC_DATA);
    expect(s1.platforms.chirper.retention).toBeLessThan(1.0);
    expect(s1.platforms.instasham.retention).toBeLessThan(1.0);
    expect(s1.platforms.grindset.retention).toBe(1.0);
  });

  it('is a no-op (reference-equal) when nothing changes', () => {
    const s = freshState();
    expect(recomputeAllRetention(s, STATIC_DATA)).toBe(s);
  });
});

describe('applyTickPosts', () => {
  it('routes one post per owned generator to its highest-affinity unlocked platform', () => {
    // Hand-build a state with selfies owned+count>0. Selfies has highest
    // affinity on instasham (2.0) vs chirper (0.8) vs grindset (0.5).
    const s0 = freshState();
    const withSelfies: GameState = {
      ...s0,
      generators: {
        ...s0.generators,
        selfies: { ...s0.generators.selfies, owned: true, count: 1 },
      },
    };
    const s1 = applyTickPosts(withSelfies, STATIC_DATA);
    // instasham should have received the post.
    expect(s1.platforms.instasham.content_fatigue.selfies ?? 0).toBeGreaterThan(0);
    expect(s1.platforms.chirper.content_fatigue.selfies ?? 0).toBe(0);
  });

  it('tie-breaks routing by platform declaration order', () => {
    // Build a synthetic static-data where all platforms have equal affinity.
    const altStatic: StaticData = {
      ...STATIC_DATA,
      platforms: {
        chirper: { ...STATIC_DATA.platforms.chirper, content_affinity: { ...STATIC_DATA.platforms.chirper.content_affinity, selfies: 1.0 } },
        instasham: { ...STATIC_DATA.platforms.instasham, content_affinity: { ...STATIC_DATA.platforms.instasham.content_affinity, selfies: 1.0 } },
        grindset: { ...STATIC_DATA.platforms.grindset, content_affinity: { ...STATIC_DATA.platforms.grindset.content_affinity, selfies: 1.0 } },
      },
    };
    const s0 = freshState();
    const withSelfies: GameState = {
      ...s0,
      generators: {
        ...s0.generators,
        selfies: { ...s0.generators.selfies, owned: true, count: 1 },
      },
    };
    const s1 = applyTickPosts(withSelfies, altStatic);
    // chirper is declared first in static data → wins on tie.
    expect(s1.platforms.chirper.content_fatigue.selfies ?? 0).toBeGreaterThan(0);
    expect(s1.platforms.instasham.content_fatigue.selfies ?? 0).toBe(0);
  });

  it('skips generators that are unowned or count=0', () => {
    const s0 = freshState();
    // selfies owned=false, count=0 — nothing posts.
    const s1 = applyTickPosts(s0, STATIC_DATA);
    // Reference-equal because nothing changed.
    expect(s1).toBe(s0);
  });

  it('skips a generator with zero affinity on every unlocked platform', () => {
    const altStatic: StaticData = {
      ...STATIC_DATA,
      platforms: {
        chirper: { ...STATIC_DATA.platforms.chirper, content_affinity: { ...STATIC_DATA.platforms.chirper.content_affinity, selfies: 0 } },
        instasham: { ...STATIC_DATA.platforms.instasham, content_affinity: { ...STATIC_DATA.platforms.instasham.content_affinity, selfies: 0 } },
        grindset: { ...STATIC_DATA.platforms.grindset, content_affinity: { ...STATIC_DATA.platforms.grindset.content_affinity, selfies: 0 } },
      },
    };
    const s0 = freshState();
    const withSelfies: GameState = {
      ...s0,
      generators: {
        ...s0.generators,
        selfies: { ...s0.generators.selfies, owned: true, count: 1 },
      },
    };
    const s1 = applyTickPosts(withSelfies, altStatic);
    for (const pid of ['chirper', 'instasham', 'grindset'] as const) {
      expect(s1.platforms[pid].content_fatigue.selfies ?? 0).toBe(0);
    }
  });
});
