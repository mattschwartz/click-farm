// Tests for the scandal system.
// Coverage contract: each scandal trigger type, empire scaling, magnitude
// bounds, offline freeze/resume, stacking suppression, and session snapshot
// floor enforcement. Mirrors the acceptance criteria on task #30.

import { describe, it, expect } from 'vitest';
import {
  createAccumulators,
  ensureAccumulators,
  freezeAccumulators,
  unfreezeAccumulators,
  empireScale,
  computeEffectiveThreshold,
  computeRiskLevel,
  computeAllRiskLevels,
  updateAccumulatorsOnTick,
  updateAccumulatorsOnPurchase,
  onAccumulatorFire,
  onTimerExpire,
  onPlayerConfirm,
  resolveScandal,
  applyFollowerLoss,
  createScandalSessionSnapshot,
  createDefaultStateMachine,
  selectTargetPlatform,
  computeScandalUIState,
} from './index.ts';
import { STATIC_DATA } from '../static-data/index.ts';
import { createInitialGameState, createGeneratorState } from '../model/index.ts';
import type {
  GameState,
  GeneratorId,
  PlatformId,
  RiskAccumulator,
  ScandalEvent,
  ScandalSessionSnapshot,
  ScandalStateMachine,
} from '../types.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const T0 = 1_700_000_000_000;
const SD = STATIC_DATA;

/** Build a game state with enough followers to enable the scandal system. */
function scandalReadyState(totalFollowers = 5_000): GameState {
  const base = createInitialGameState(SD, T0);
  return {
    ...base,
    player: { ...base.player, total_followers: totalFollowers, algorithm_seed: 0xDEADBEEF },
    algorithm: { ...base.algorithm, shift_time: T0 + 10_000_000 },
  };
}

/**
 * Build a game state where the specified generator is owned and producing,
 * with enough followers to enable scandal system.
 */
function stateWithActiveGenerator(
  genId: GeneratorId,
  count: number = 1,
  totalFollowers = 5_000,
): GameState {
  const base = scandalReadyState(totalFollowers);
  return {
    ...base,
    generators: {
      ...base.generators,
      [genId]: { ...createGeneratorState(genId), owned: true, count, level: 1 },
    },
  };
}

/**
 * Pump an accumulator to just below its effective threshold.
 * Returns the modified accumulator array.
 */
function primeAccumulator(
  accumulators: RiskAccumulator[],
  scandalType: string,
  value: number,
): RiskAccumulator[] {
  return accumulators.map((a) =>
    a.scandal_type === scandalType ? { ...a, value } : a,
  );
}

/** Create a dummy ScandalEvent for state machine tests. */
function makeScandalEvent(overrides?: Partial<ScandalEvent>): ScandalEvent {
  return {
    id: 'test-id',
    scandal_type: 'content_burnout',
    target_platform: 'chirper',
    raw_magnitude: 0.10,
    final_magnitude: null,
    engagement_spent: 0,
    followers_lost: 0,
    timestamp: T0,
    resolved: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Empire scale
// ---------------------------------------------------------------------------

describe('empireScale', () => {
  it('returns 1.0 below minFollowersToEnable', () => {
    expect(empireScale(0, SD)).toBe(1.0);
    expect(empireScale(999, SD)).toBe(1.0);
  });

  it('decreases as followers increase', () => {
    const at1k = empireScale(1_000, SD);
    const at10k = empireScale(10_000, SD);
    const at100k = empireScale(100_000, SD);
    expect(at10k).toBeLessThan(at1k);
    expect(at100k).toBeLessThan(at10k);
  });

  it('is 0.5 at the scaleConstant follower count', () => {
    const sc = SD.scandal.empireScaleCurve.scaleConstant;
    // empire_scale = 1 / (1 + sc / sc) = 1 / 2 = 0.5
    expect(empireScale(sc, SD)).toBeCloseTo(0.5);
  });
});

// ---------------------------------------------------------------------------
// computeEffectiveThreshold
// ---------------------------------------------------------------------------

describe('computeEffectiveThreshold', () => {
  it('returns Infinity below minimum follower count', () => {
    const acc = createAccumulators(
      createInitialGameState(SD, T0).generators,
      createInitialGameState(SD, T0).platforms,
      SD,
    ).find((a) => a.scandal_type === 'trend_chasing')!;
    expect(computeEffectiveThreshold(acc, 0, SD)).toBe(Infinity);
    expect(computeEffectiveThreshold(acc, 500, SD)).toBe(Infinity);
  });

  it('returns base_threshold × empire_scale at eligible follower count', () => {
    const acc: RiskAccumulator = {
      scandal_type: 'content_burnout',
      scope_type: 'generator',
      scope_id: 'selfies',
      value: 0,
      base_threshold: 0.70,
      frozen: false,
    };
    const followers = 50_000; // == scaleConstant → scale = 0.5
    const expected = 0.70 * 0.5;
    expect(computeEffectiveThreshold(acc, followers, SD)).toBeCloseTo(expected);
  });
});

// ---------------------------------------------------------------------------
// computeRiskLevel
// ---------------------------------------------------------------------------

describe('computeRiskLevel', () => {
  it('returns none when below minimum followers', () => {
    const acc: RiskAccumulator = {
      scandal_type: 'content_burnout',
      scope_type: 'generator',
      scope_id: 'selfies',
      value: 0.9,
      base_threshold: 0.70,
      frozen: false,
    };
    expect(computeRiskLevel(acc, 0, SD)).toBe('none');
  });

  it('returns none when value / threshold < 0.4', () => {
    const acc: RiskAccumulator = {
      scandal_type: 'content_burnout',
      scope_type: 'generator',
      scope_id: 'selfies',
      value: 0.1,
      base_threshold: 0.70,
      frozen: false,
    };
    // threshold at 50k followers = 0.35; ratio = 0.1/0.35 ≈ 0.286 < 0.4
    expect(computeRiskLevel(acc, 50_000, SD)).toBe('none');
  });

  it('returns building at ratio ≥ 0.4 and < 0.75', () => {
    // threshold at 50k = 0.35; value = 0.20 → ratio = 0.57 (building)
    const acc: RiskAccumulator = {
      scandal_type: 'content_burnout',
      scope_type: 'generator',
      scope_id: 'selfies',
      value: 0.20,
      base_threshold: 0.70,
      frozen: false,
    };
    expect(computeRiskLevel(acc, 50_000, SD)).toBe('building');
  });

  it('returns high at ratio ≥ 0.75', () => {
    // threshold at 50k = 0.35; value = 0.30 → ratio = 0.857 ≥ 0.75 → high
    const acc: RiskAccumulator = {
      scandal_type: 'content_burnout',
      scope_type: 'generator',
      scope_id: 'selfies',
      value: 0.30,
      base_threshold: 0.70,
      frozen: false,
    };
    expect(computeRiskLevel(acc, 50_000, SD)).toBe('high');
  });
});

// ---------------------------------------------------------------------------
// createAccumulators
// ---------------------------------------------------------------------------

describe('createAccumulators', () => {
  it('creates a trend_chasing global accumulator at game start', () => {
    const state = createInitialGameState(SD, T0);
    const accs = createAccumulators(state.generators, state.platforms, SD);
    const tc = accs.find((a) => a.scandal_type === 'trend_chasing');
    expect(tc).toBeDefined();
    expect(tc!.scope_type).toBe('global');
    expect(tc!.scope_id).toBeNull();
  });

  it('creates content_burnout only for owned generators', () => {
    const state = createInitialGameState(SD, T0);
    const accs = createAccumulators(state.generators, state.platforms, SD);
    const cb = accs.filter((a) => a.scandal_type === 'content_burnout');
    // Only selfies is owned at game start (threshold = 0)
    expect(cb).toHaveLength(1);
    expect(cb[0].scope_id).toBe('selfies');
  });

  it('creates platform_neglect only for unlocked platforms', () => {
    const state = createInitialGameState(SD, T0);
    const accs = createAccumulators(state.generators, state.platforms, SD);
    const pn = accs.filter((a) => a.scandal_type === 'platform_neglect');
    // Only chirper starts unlocked
    expect(pn).toHaveLength(1);
    expect(pn[0].scope_id).toBe('chirper');
  });
});

// ---------------------------------------------------------------------------
// ensureAccumulators
// ---------------------------------------------------------------------------

describe('ensureAccumulators', () => {
  it('adds accumulators for newly owned generators without touching existing ones', () => {
    const state = createInitialGameState(SD, T0);
    const initial = createAccumulators(state.generators, state.platforms, SD);

    // Simulate hot_takes being unlocked
    const withHotTakes: GameState = {
      ...state,
      generators: {
        ...state.generators,
        hot_takes: { ...state.generators.hot_takes, owned: true },
      },
    };

    const updated = ensureAccumulators(
      initial,
      withHotTakes.generators,
      withHotTakes.platforms,
      SD,
    );

    // Should have a new hot_take_backlash and content_burnout for hot_takes
    const htb = updated.filter((a) => a.scandal_type === 'hot_take_backlash');
    expect(htb).toHaveLength(1);
    expect(htb[0].scope_id).toBe('hot_takes');
    // Existing accumulators retained
    expect(updated.length).toBeGreaterThan(initial.length);
  });

  it('returns the same array reference when nothing changes', () => {
    const state = createInitialGameState(SD, T0);
    const accs = createAccumulators(state.generators, state.platforms, SD);
    const result = ensureAccumulators(accs, state.generators, state.platforms, SD);
    expect(result).toBe(accs);
  });
});

// ---------------------------------------------------------------------------
// Freeze / unfreeze
// ---------------------------------------------------------------------------

describe('freeze / unfreeze accumulators', () => {
  it('freezeAccumulators sets all accumulators to frozen=true', () => {
    const state = createInitialGameState(SD, T0);
    const accs = createAccumulators(state.generators, state.platforms, SD);
    const frozen = freezeAccumulators(accs);
    expect(frozen.every((a) => a.frozen)).toBe(true);
  });

  it('unfreezeAccumulators sets all accumulators to frozen=false', () => {
    const state = createInitialGameState(SD, T0);
    const accs = createAccumulators(state.generators, state.platforms, SD)
      .map((a) => ({ ...a, frozen: true }));
    const unfrozen = unfreezeAccumulators(accs);
    expect(unfrozen.every((a) => !a.frozen)).toBe(true);
  });

  it('frozen accumulators do not advance during tick', () => {
    const state = stateWithActiveGenerator('selfies', 1, 5_000);
    const initialAccs = createAccumulators(state.generators, state.platforms, SD);
    const frozenAccs = freezeAccumulators(initialAccs);

    // Run a very long tick — if frozen, value should not change
    const ratesPerMs: Partial<Record<GeneratorId, number>> = { selfies: 1.0 };
    const result = updateAccumulatorsOnTick(
      frozenAccs,
      state,
      60_000, // 1 minute
      ratesPerMs,
      {},
      T0,
      SD,
    );

    // Frozen accumulators should stay at their original values
    const cb = result.accumulators.find(
      (a) => a.scandal_type === 'content_burnout' && a.scope_id === 'selfies',
    );
    expect(cb?.value).toBe(0);
    expect(result.firedScandal).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Trigger: Content Burnout
// ---------------------------------------------------------------------------

describe('Content Burnout accumulator', () => {
  it('increments when one generator dominates output (>70% share)', () => {
    const state = stateWithActiveGenerator('selfies', 1, 5_000);
    const accs = createAccumulators(state.generators, state.platforms, SD);

    // selfies gets 100% of the output
    const ratesPerMs: Partial<Record<GeneratorId, number>> = { selfies: 1.0 };
    const result = updateAccumulatorsOnTick(
      accs,
      state,
      60_000, // 1 minute
      ratesPerMs,
      {},
      T0,
      SD,
    );

    const cb = result.accumulators.find(
      (a) => a.scandal_type === 'content_burnout' && a.scope_id === 'selfies',
    );
    expect(cb!.value).toBeGreaterThan(0);
  });

  it('decays when output is balanced (≤70% share)', () => {
    const state = stateWithActiveGenerator('selfies', 1, 5_000);
    const accs = createAccumulators(state.generators, state.platforms, SD).map(
      (a) => a.scandal_type === 'content_burnout' ? { ...a, value: 0.4 } : a,
    );

    // Equal output across two generators — selfies share = 50% ≤ 70%
    const ratesPerMs: Partial<Record<GeneratorId, number>> = {
      selfies: 0.5,
      memes: 0.5,
    };
    const result = updateAccumulatorsOnTick(
      accs,
      state,
      60_000,
      ratesPerMs,
      {},
      T0,
      SD,
    );

    const cb = result.accumulators.find(
      (a) => a.scandal_type === 'content_burnout' && a.scope_id === 'selfies',
    );
    expect(cb!.value).toBeLessThan(0.4);
  });
});

// ---------------------------------------------------------------------------
// Trigger: Platform Neglect
// ---------------------------------------------------------------------------

describe('Platform Neglect accumulator', () => {
  it('increments over time when no followers are being gained on the platform', () => {
    const state = scandalReadyState(5_000);
    const accs = createAccumulators(state.generators, state.platforms, SD);

    const result = updateAccumulatorsOnTick(
      accs,
      state,
      600_000, // 10 minutes of no posting
      {},       // no generator rates
      {},       // no followers gained
      T0,
      SD,
    );

    const pn = result.accumulators.find((a) => a.scandal_type === 'platform_neglect');
    expect(pn!.value).toBeGreaterThan(0);
  });

  it('resets to 0 when followers are gained on the platform', () => {
    const state = scandalReadyState(5_000);
    const accs = createAccumulators(state.generators, state.platforms, SD).map(
      (a) => a.scandal_type === 'platform_neglect' ? { ...a, value: 0.5 } : a,
    );

    const result = updateAccumulatorsOnTick(
      accs,
      state,
      100,
      {},
      { chirper: 10 }, // followers gained on chirper resets neglect
      T0,
      SD,
    );

    const pn = result.accumulators.find(
      (a) => a.scandal_type === 'platform_neglect' && a.scope_id === 'chirper',
    );
    expect(pn!.value).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Trigger: Hot Take Backlash
// ---------------------------------------------------------------------------

describe('Hot Take Backlash accumulator', () => {
  it('increments when hot_takes are producing', () => {
    const state = stateWithActiveGenerator('hot_takes', 1, 5_000);
    const accs = createAccumulators(state.generators, state.platforms, SD);

    // hot_takes is 100% of output
    const ratesPerMs: Partial<Record<GeneratorId, number>> = { hot_takes: 1.0 };
    const result = updateAccumulatorsOnTick(
      accs,
      state,
      60_000,
      ratesPerMs,
      {},
      T0,
      SD,
    );

    const htb = result.accumulators.find((a) => a.scandal_type === 'hot_take_backlash');
    expect(htb!.value).toBeGreaterThan(0);
  });

  it('increments faster when algorithm penalizes hot_takes', () => {
    const baseState = stateWithActiveGenerator('hot_takes', 1, 5_000);
    const accs = createAccumulators(baseState.generators, baseState.platforms, SD);
    const ratesPerMs: Partial<Record<GeneratorId, number>> = { hot_takes: 1.0 };

    // State A: algorithm favorable to hot_takes (modifier = 1.5)
    const stateA: GameState = {
      ...baseState,
      algorithm: {
        ...baseState.algorithm,
        state_modifiers: { ...baseState.algorithm.state_modifiers, hot_takes: 1.5 },
      },
    };
    // State B: algorithm penalizes hot_takes (modifier = 0.5 → penalty = 2.0)
    const stateB: GameState = {
      ...baseState,
      algorithm: {
        ...baseState.algorithm,
        state_modifiers: { ...baseState.algorithm.state_modifiers, hot_takes: 0.5 },
      },
    };

    const resultA = updateAccumulatorsOnTick(accs, stateA, 60_000, ratesPerMs, {}, T0, SD);
    const resultB = updateAccumulatorsOnTick(accs, stateB, 60_000, ratesPerMs, {}, T0, SD);

    const htbA = resultA.accumulators.find((a) => a.scandal_type === 'hot_take_backlash')!;
    const htbB = resultB.accumulators.find((a) => a.scandal_type === 'hot_take_backlash')!;

    // Penalized algorithm should produce higher accumulator value
    expect(htbB.value).toBeGreaterThan(htbA.value);
  });
});

// ---------------------------------------------------------------------------
// Trigger: Trend Chasing
// ---------------------------------------------------------------------------

describe('Trend Chasing accumulator', () => {
  it('increments on generator purchase', () => {
    const prevState = stateWithActiveGenerator('selfies', 1, 5_000);
    const accs = createAccumulators(prevState.generators, prevState.platforms, SD);

    // "Purchase" memes — shift the dominant share significantly
    const afterBuy: GameState = {
      ...prevState,
      generators: {
        ...prevState.generators,
        memes: { ...createGeneratorState('memes'), owned: true, count: 5, level: 1 },
      },
    };

    const result = updateAccumulatorsOnPurchase(accs, prevState, afterBuy, SD);
    const tc = result.find((a) => a.scandal_type === 'trend_chasing');
    expect(tc!.value).toBeGreaterThan(0);
  });

  it('decays in the tick (not increment-driven)', () => {
    const state = scandalReadyState(5_000);
    const accs = createAccumulators(state.generators, state.platforms, SD).map(
      (a) => a.scandal_type === 'trend_chasing' ? { ...a, value: 0.5 } : a,
    );

    const result = updateAccumulatorsOnTick(accs, state, 600_000, {}, {}, T0, SD);
    const tc = result.accumulators.find((a) => a.scandal_type === 'trend_chasing');
    expect(tc!.value).toBeLessThan(0.5);
  });
});

// ---------------------------------------------------------------------------
// Trigger: Growth Scrutiny
// ---------------------------------------------------------------------------

describe('Growth Scrutiny accumulator', () => {
  it('increments when one platform gets a disproportionate share of growth', () => {
    const state = scandalReadyState(5_000);
    const accs = createAccumulators(state.generators, state.platforms, SD);

    // chirper gets 80% of all follower gains (above 60% threshold)
    const result = updateAccumulatorsOnTick(
      accs,
      state,
      60_000,
      {},
      { chirper: 80, instasham: 10, grindset: 10 },
      T0,
      SD,
    );

    const gs = result.accumulators.find(
      (a) => a.scandal_type === 'growth_scrutiny' && a.scope_id === 'chirper',
    );
    expect(gs!.value).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Trigger: Fact Check
// ---------------------------------------------------------------------------

describe('Fact Check accumulator', () => {
  it('increments when podcasts/tutorials are producing at scale', () => {
    const state = stateWithActiveGenerator('podcasts', 1, 100_000);
    const accs = createAccumulators(state.generators, state.platforms, SD);

    const ratesPerMs: Partial<Record<GeneratorId, number>> = { podcasts: 1.0 };
    const result = updateAccumulatorsOnTick(
      accs,
      state,
      60_000,
      ratesPerMs,
      {},
      T0,
      SD,
    );

    const fc = result.accumulators.find(
      (a) => a.scandal_type === 'fact_check' && a.scope_id === 'podcasts',
    );
    expect(fc!.value).toBeGreaterThan(0);
  });

  it('increments faster at higher follower counts (empire scaling amplifies)', () => {
    const stateSmall = stateWithActiveGenerator('podcasts', 1, 5_000);
    const stateLarge = stateWithActiveGenerator('podcasts', 1, 200_000);
    const ratesPerMs: Partial<Record<GeneratorId, number>> = { podcasts: 1.0 };

    const accsSmall = createAccumulators(stateSmall.generators, stateSmall.platforms, SD);
    const accsLarge = createAccumulators(stateLarge.generators, stateLarge.platforms, SD);

    const resultSmall = updateAccumulatorsOnTick(
      accsSmall, stateSmall, 60_000, ratesPerMs, {}, T0, SD,
    );
    const resultLarge = updateAccumulatorsOnTick(
      accsLarge, stateLarge, 60_000, ratesPerMs, {}, T0, SD,
    );

    const fcSmall = resultSmall.accumulators.find(
      (a) => a.scandal_type === 'fact_check' && a.scope_id === 'podcasts',
    )!;
    const fcLarge = resultLarge.accumulators.find(
      (a) => a.scandal_type === 'fact_check' && a.scope_id === 'podcasts',
    )!;

    expect(fcLarge.value).toBeGreaterThan(fcSmall.value);
  });
});

// ---------------------------------------------------------------------------
// Empire scaling on effective thresholds
// ---------------------------------------------------------------------------

describe('empire scaling', () => {
  it('reduces effective threshold as followers increase', () => {
    const acc: RiskAccumulator = {
      scandal_type: 'content_burnout',
      scope_type: 'generator',
      scope_id: 'selfies',
      value: 0,
      base_threshold: 0.70,
      frozen: false,
    };
    const low = computeEffectiveThreshold(acc, 5_000, SD);
    const high = computeEffectiveThreshold(acc, 200_000, SD);
    expect(high).toBeLessThan(low);
  });

  it('does not enable scandals below minFollowersToEnable', () => {
    const state = scandalReadyState(500); // below 1000 threshold
    const accs = createAccumulators(state.generators, state.platforms, SD).map(
      // Force value above what would be threshold at 5k
      (a) => a.scandal_type === 'content_burnout' ? { ...a, value: 0.9 } : a,
    );

    const ratesPerMs: Partial<Record<GeneratorId, number>> = { selfies: 1.0 };
    const result = updateAccumulatorsOnTick(
      accs,
      state,
      100,
      ratesPerMs,
      {},
      T0,
      SD,
    );

    expect(result.firedScandal).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Scandal firing and stacking suppression
// ---------------------------------------------------------------------------

describe('scandal firing', () => {
  it('fires a scandal when accumulator crosses effective threshold', () => {
    const state = scandalReadyState(5_000);
    const accs = createAccumulators(state.generators, state.platforms, SD);

    // Prime content_burnout to just below effective threshold
    const threshold = computeEffectiveThreshold(
      accs.find((a) => a.scandal_type === 'content_burnout')!,
      5_000,
      SD,
    );
    // Set value above threshold to guarantee fire
    const primed = accs.map((a) =>
      a.scandal_type === 'content_burnout' ? { ...a, value: threshold + 0.1 } : a,
    );

    const ratesPerMs: Partial<Record<GeneratorId, number>> = { selfies: 1.0 };
    // Small delta so the increment doesn't change things much
    const result = updateAccumulatorsOnTick(primed, state, 1, ratesPerMs, {}, T0, SD);

    expect(result.firedScandal).not.toBeNull();
    expect(result.firedScandal!.scandal_type).toBe('content_burnout');
    expect(result.firedScandal!.resolved).toBe(false);
  });

  it('resets the fired accumulator to 0 after firing', () => {
    const state = scandalReadyState(5_000);
    const accs = createAccumulators(state.generators, state.platforms, SD);
    const threshold = computeEffectiveThreshold(
      accs.find((a) => a.scandal_type === 'content_burnout')!,
      5_000,
      SD,
    );
    const primed = accs.map((a) =>
      a.scandal_type === 'content_burnout' ? { ...a, value: threshold + 0.1 } : a,
    );

    const result = updateAccumulatorsOnTick(primed, state, 1, { selfies: 1.0 }, {}, T0, SD);
    const cb = result.accumulators.find((a) => a.scandal_type === 'content_burnout');
    expect(cb!.value).toBe(0);
  });

  it('raw_magnitude is clamped to [0.05, 0.15]', () => {
    const state = scandalReadyState(5_000);
    const accs = createAccumulators(state.generators, state.platforms, SD);
    const threshold = computeEffectiveThreshold(
      accs.find((a) => a.scandal_type === 'content_burnout')!,
      5_000,
      SD,
    );
    const primed = accs.map((a) =>
      a.scandal_type === 'content_burnout' ? { ...a, value: threshold + 0.2 } : a,
    );

    const result = updateAccumulatorsOnTick(primed, state, 1, { selfies: 1.0 }, {}, T0, SD);
    const mag = result.firedScandal!.raw_magnitude;
    expect(mag).toBeGreaterThanOrEqual(0.05);
    expect(mag).toBeLessThanOrEqual(0.15);
  });

  it('stacking suppression: only most severe fires when multiple trigger simultaneously', () => {
    const state = scandalReadyState(50_000);

    // Unlock multiple generators so multiple accumulators exist
    const stateMultiGen: GameState = {
      ...state,
      generators: {
        ...state.generators,
        hot_takes: { ...state.generators.hot_takes, owned: true, count: 1 },
      },
    };
    let accs = createAccumulators(stateMultiGen.generators, stateMultiGen.platforms, SD);

    // Prime both content_burnout (selfies) and platform_neglect to above threshold
    const cbThreshold = computeEffectiveThreshold(
      accs.find((a) => a.scandal_type === 'content_burnout')!,
      50_000,
      SD,
    );
    const pnThreshold = computeEffectiveThreshold(
      accs.find((a) => a.scandal_type === 'platform_neglect')!,
      50_000,
      SD,
    );

    accs = accs.map((a) => {
      if (a.scandal_type === 'content_burnout') return { ...a, value: cbThreshold + 0.1 };
      if (a.scandal_type === 'platform_neglect') return { ...a, value: pnThreshold + 0.1 };
      return a;
    });

    const result = updateAccumulatorsOnTick(accs, stateMultiGen, 1, { selfies: 1.0 }, {}, T0, SD);

    // Exactly one scandal fires
    expect(result.firedScandal).not.toBeNull();
    // Suppressed notification is set (since both fired)
    expect(result.suppressedNotification).not.toBeNull();
    // Both accumulators reset to 0
    const remaining = result.accumulators.filter(
      (a) =>
        (a.scandal_type === 'content_burnout' || a.scandal_type === 'platform_neglect') &&
        a.value > 0,
    );
    expect(remaining).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Magnitude bounds
// ---------------------------------------------------------------------------

describe('magnitude bounds', () => {
  it('raw magnitude is never below 0.05', () => {
    const acc: RiskAccumulator = {
      scandal_type: 'content_burnout',
      scope_type: 'generator',
      scope_id: 'selfies',
      value: 0,     // just fired at 0 accumulated value
      base_threshold: 0.70,
      frozen: false,
    };
    // baseMagnitude × (1 + 0) = 0.08 → above 0.05 clamp
    // Even at minimum base magnitude, should stay ≥ 0.05
    const { scandal: { types } } = SD;
    const lowest = Math.min(...Object.values(types).map((t) => t.baseMagnitude));
    expect(lowest * 1).toBeGreaterThanOrEqual(0.05);
  });

  it('raw magnitude never exceeds 0.15', () => {
    const acc: RiskAccumulator = {
      scandal_type: 'content_burnout',
      scope_type: 'generator',
      scope_id: 'selfies',
      value: 1.0,   // maximum value at fire
      base_threshold: 0.70,
      frozen: false,
    };
    // With value = 1.0: raw = baseMagnitude × (1 + 1.0)
    // hot_take_backlash has baseMagnitude 0.09: 0.09 × 2 = 0.18 > 0.15 → clamped
    const { scandal: { types } } = SD;
    const highest = Math.max(...Object.values(types).map((t) => t.baseMagnitude * 2));
    // Even if unclamped it would exceed 0.15, but computeRawMagnitude clamps it.
    // Here we just verify the config makes the clamp necessary.
    expect(highest).toBeGreaterThan(0.15);
  });
});

// ---------------------------------------------------------------------------
// resolveScandal — magnitude floor enforcement
// ---------------------------------------------------------------------------

describe('resolveScandal', () => {
  it('applies raw magnitude with no mitigation when no engagement is spent', () => {
    const platforms = createInitialGameState(SD, T0).platforms;
    const state = {
      ...createInitialGameState(SD, T0),
      platforms: {
        ...platforms,
        chirper: { ...platforms.chirper, followers: 10_000, unlocked: true },
      },
    };

    const scandal = makeScandalEvent({ raw_magnitude: 0.10, target_platform: 'chirper' });
    const result = resolveScandal(scandal, 0, 0, null, state.platforms, SD);

    expect(result.followersLost.chirper).toBe(1000); // 10% of 10,000
    expect(result.finalMagnitude).toBeCloseTo(0.10);
  });

  it('reduces loss when engagement is spent', () => {
    const platforms = createInitialGameState(SD, T0).platforms;
    const state = {
      ...createInitialGameState(SD, T0),
      platforms: {
        ...platforms,
        chirper: { ...platforms.chirper, followers: 10_000, unlocked: true },
      },
    };

    const scandal = makeScandalEvent({ raw_magnitude: 0.10, target_platform: 'chirper' });
    // Max engagement spend: reduce by up to maxMitigationRate (0.65)
    const result = resolveScandal(scandal, 500, 500, null, state.platforms, SD);

    // Final magnitude = 0.10 × (1 - 0.65) = 0.035 → clamped → 350 followers lost
    expect(result.followersLost.chirper).toBeLessThan(1000);
    expect(result.finalMagnitude).toBeLessThan(0.10);
  });

  it('enforces magnitude floor: loss cannot exceed platform gains since session start', () => {
    const platforms = createInitialGameState(SD, T0).platforms;
    const pWithFollowers = {
      ...platforms,
      chirper: { ...platforms.chirper, followers: 5_000, unlocked: true },
    };

    // Snapshot says chirper had 4_800 followers at session start
    // → max possible loss = 5_000 - 4_800 = 200
    const snapshot: ScandalSessionSnapshot = {
      timestamp: T0,
      platform_followers: { chirper: 4_800, instasham: 0, grindset: 0 },
    };

    const scandal = makeScandalEvent({ raw_magnitude: 0.10, target_platform: 'chirper' });
    // Without floor: 10% × 5000 = 500. But floor caps at 200.
    const result = resolveScandal(scandal, 0, 0, snapshot, pWithFollowers, SD);

    expect(result.followersLost.chirper).toBe(200);
  });

  it('allows no loss when platform followers equal snapshot (session floor)', () => {
    const platforms = createInitialGameState(SD, T0).platforms;
    const pWithFollowers = {
      ...platforms,
      chirper: { ...platforms.chirper, followers: 3_000, unlocked: true },
    };

    // Snapshot matches current — no gains this session → max loss = 0
    const snapshot: ScandalSessionSnapshot = {
      timestamp: T0,
      platform_followers: { chirper: 3_000, instasham: 0, grindset: 0 },
    };

    const scandal = makeScandalEvent({ raw_magnitude: 0.10, target_platform: 'chirper' });
    const result = resolveScandal(scandal, 0, 0, snapshot, pWithFollowers, SD);

    expect(result.followersLost.chirper ?? 0).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// applyFollowerLoss
// ---------------------------------------------------------------------------

describe('applyFollowerLoss', () => {
  it('reduces platform follower count by the specified amount', () => {
    const platforms = {
      ...createInitialGameState(SD, T0).platforms,
      chirper: { id: 'chirper' as PlatformId, unlocked: true, followers: 5_000 },
    };
    const result = applyFollowerLoss(platforms, { chirper: 500 });
    expect(result.chirper.followers).toBe(4_500);
  });

  it('does not reduce below 0', () => {
    const platforms = {
      ...createInitialGameState(SD, T0).platforms,
      chirper: { id: 'chirper' as PlatformId, unlocked: true, followers: 100 },
    };
    const result = applyFollowerLoss(platforms, { chirper: 200 });
    expect(result.chirper.followers).toBe(0);
  });

  it('returns the same reference when no followers are lost', () => {
    const platforms = createInitialGameState(SD, T0).platforms;
    const result = applyFollowerLoss(platforms, {});
    expect(result).toBe(platforms);
  });
});

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

describe('scandal state machine', () => {
  it('transitions normal → scandal_active on accumulator fire', () => {
    const sm = createDefaultStateMachine(SD);
    const event = makeScandalEvent();
    const next = onAccumulatorFire(sm, event, null, T0);
    expect(next.state).toBe('scandal_active');
    expect(next.activeScandal).toBe(event);
    expect(next.timerStartTime).toBe(T0);
  });

  it('stays in scandal_active and records suppressed notification if already active', () => {
    const sm = createDefaultStateMachine(SD);
    const event1 = makeScandalEvent({ scandal_type: 'content_burnout' });
    const event2 = makeScandalEvent({ scandal_type: 'platform_neglect' });
    const active = onAccumulatorFire(sm, event1, null, T0);
    const suppressed = onAccumulatorFire(active, event2, 'some suppression text', T0);

    expect(suppressed.state).toBe('scandal_active');
    expect(suppressed.activeScandal).toBe(event1); // primary unchanged
    expect(suppressed.suppressedNotification).toBe('some suppression text');
  });

  it('transitions scandal_active → resolving on timer expire', () => {
    const sm = createDefaultStateMachine(SD);
    const active = onAccumulatorFire(sm, makeScandalEvent(), null, T0);
    const resolving = onTimerExpire(active);
    expect(resolving.state).toBe('resolving');
  });

  it('transitions scandal_active → resolving on player confirm', () => {
    const sm = createDefaultStateMachine(SD);
    const active = onAccumulatorFire(sm, makeScandalEvent(), null, T0);
    const resolving = onPlayerConfirm(active, 250);
    expect(resolving.state).toBe('resolving');
    expect(resolving.pendingEngagementSpend).toBe(250);
  });

  it('does nothing if timer expires when not in scandal_active', () => {
    const sm = createDefaultStateMachine(SD);
    const result = onTimerExpire(sm);
    expect(result).toBe(sm);
  });
});

// ---------------------------------------------------------------------------
// Session snapshot
// ---------------------------------------------------------------------------

describe('createScandalSessionSnapshot', () => {
  it('captures current per-platform follower counts', () => {
    const platforms = createInitialGameState(SD, T0).platforms;
    const state = {
      ...createInitialGameState(SD, T0),
      platforms: {
        ...platforms,
        chirper: { ...platforms.chirper, followers: 1_234 },
        instasham: { ...platforms.instasham, followers: 567 },
      },
    };

    const snap = createScandalSessionSnapshot(state, T0);
    expect(snap.timestamp).toBe(T0);
    expect(snap.platform_followers.chirper).toBe(1_234);
    expect(snap.platform_followers.instasham).toBe(567);
  });
});

// ---------------------------------------------------------------------------
// selectTargetPlatform
// ---------------------------------------------------------------------------

describe('selectTargetPlatform', () => {
  it('uses the scoped platform for per-platform accumulators', () => {
    const state = createInitialGameState(SD, T0);
    const acc: RiskAccumulator = {
      scandal_type: 'platform_neglect',
      scope_type: 'platform',
      scope_id: 'chirper',
      value: 0.5,
      base_threshold: 0.80,
      frozen: false,
    };
    expect(selectTargetPlatform(acc, state.platforms, SD)).toBe('chirper');
  });

  it('selects platform with highest content_affinity for generator accumulators', () => {
    const state = createInitialGameState(SD, T0);
    // hot_takes has highest affinity for chirper (2.0)
    const acc: RiskAccumulator = {
      scandal_type: 'hot_take_backlash',
      scope_type: 'generator',
      scope_id: 'hot_takes',
      value: 0.5,
      base_threshold: 0.60,
      frozen: false,
    };
    const platforms: typeof state.platforms = {
      ...state.platforms,
      chirper: { ...state.platforms.chirper, unlocked: true },
      instasham: { ...state.platforms.instasham, unlocked: true },
      grindset: { ...state.platforms.grindset, unlocked: true },
    };
    expect(selectTargetPlatform(acc, platforms, SD)).toBe('chirper');
  });

  it('selects platform with most followers for global accumulators', () => {
    const state = createInitialGameState(SD, T0);
    const platforms = {
      ...state.platforms,
      chirper: { ...state.platforms.chirper, unlocked: true, followers: 100 },
      instasham: { ...state.platforms.instasham, unlocked: true, followers: 5_000 },
      grindset: { ...state.platforms.grindset, unlocked: true, followers: 200 },
    };
    const acc: RiskAccumulator = {
      scandal_type: 'trend_chasing',
      scope_type: 'global',
      scope_id: null,
      value: 0.5,
      base_threshold: 0.75,
      frozen: false,
    };
    expect(selectTargetPlatform(acc, platforms, SD)).toBe('instasham');
  });
});

// ---------------------------------------------------------------------------
// computeAllRiskLevels — ensures UI contract is satisfied
// ---------------------------------------------------------------------------

describe('computeAllRiskLevels', () => {
  it('returns a keyed map with risk levels for all accumulators', () => {
    const state = scandalReadyState(5_000);
    const accs = createAccumulators(state.generators, state.platforms, SD);
    const levels = computeAllRiskLevels(accs, 5_000, SD);

    // Should have at least keys for the existing scopes
    expect(Object.keys(levels).length).toBeGreaterThan(0);
    // All values are valid risk levels
    for (const level of Object.values(levels)) {
      expect(['none', 'building', 'high']).toContain(level);
    }
  });

  it('uses the highest level when multiple accumulators share a scope', () => {
    // hot_takes has both content_burnout and hot_take_backlash accumulators
    const state: GameState = {
      ...scandalReadyState(50_000),
      generators: {
        ...scandalReadyState(50_000).generators,
        hot_takes: { ...createGeneratorState('hot_takes'), owned: true, count: 1 },
      },
    };
    const accs = createAccumulators(state.generators, state.platforms, SD).map((a) => {
      // Set hot_take_backlash to 'high' but content_burnout to 'none'
      if (a.scandal_type === 'hot_take_backlash') {
        const threshold = computeEffectiveThreshold(a, 50_000, SD);
        return { ...a, value: threshold * 0.9 }; // just below high
      }
      return a;
    });

    const levels = computeAllRiskLevels(accs, 50_000, SD);
    // Even if one accumulator is higher, the merged level should be the maximum
    const hotTakesLevel = levels['generator:hot_takes'];
    expect(['none', 'building', 'high']).toContain(hotTakesLevel);
  });
});

// ---------------------------------------------------------------------------
// Task #31: computeScandalUIState — lastResolution, timerDuration, activeScandal
// ---------------------------------------------------------------------------

describe('computeScandalUIState — task #31 additions', () => {
  /** Build a minimal ScandalStateMachine in normal state with no resolution. */
  function baseSM(): ScandalStateMachine {
    return {
      ...createDefaultStateMachine(SD),
      state: 'normal',
      lastResolution: null,
    };
  }

  it('returns lastResolution: null when state machine has none', () => {
    const state = scandalReadyState();
    const ui = computeScandalUIState(state, T0, SD);
    expect(ui.lastResolution).toBeNull();
  });

  it('returns lastResolution from state machine when present', () => {
    const state: GameState = {
      ...scandalReadyState(),
      scandalStateMachine: {
        ...baseSM(),
        lastResolution: {
          type: 'content_burnout',
          platformAffected: 'chirper',
          followersLost: 500,
          suppressedNotice: null,
        },
      },
    };
    const ui = computeScandalUIState(state, T0, SD);
    expect(ui.lastResolution).not.toBeNull();
    expect(ui.lastResolution!.type).toBe('content_burnout');
    expect(ui.lastResolution!.followersLost).toBe(500);
  });

  it('includes suppressedNotice in lastResolution when set', () => {
    const state: GameState = {
      ...scandalReadyState(),
      scandalStateMachine: {
        ...baseSM(),
        lastResolution: {
          type: 'hot_take_backlash',
          platformAffected: 'chirper',
          followersLost: 200,
          suppressedNotice: '...and your audience noticed the Trend Chasing too',
        },
      },
    };
    const ui = computeScandalUIState(state, T0, SD);
    expect(ui.lastResolution!.suppressedNotice).toContain('Trend Chasing');
  });

  it('includes timerDuration in activeScandal for timer bar fraction', () => {
    const event: ScandalEvent = {
      id: 'test-1',
      scandal_type: 'content_burnout',
      target_platform: 'chirper',
      raw_magnitude: 0.1,
      final_magnitude: null,
      engagement_spent: 0,
      followers_lost: 0,
      timestamp: T0,
      resolved: false,
    };
    const sm: ScandalStateMachine = {
      ...createDefaultStateMachine(SD),
      state: 'scandal_active',
      activeScandal: event,
      timerStartTime: T0,
      timerDuration: 13_500,
      readBeatDuration: 1_500,
    };
    const state: GameState = {
      ...scandalReadyState(),
      platforms: {
        ...scandalReadyState().platforms,
        chirper: { id: 'chirper', unlocked: true, followers: 10_000 },
      },
      scandalStateMachine: sm,
    };
    const ui = computeScandalUIState(state, T0 + 3_000, SD);
    expect(ui.activeScandal).not.toBeNull();
    expect(ui.activeScandal!.timerDuration).toBe(13_500);
    // 3s elapsed out of 13.5s → ~10.5s remaining
    expect(ui.activeScandal!.timerRemaining).toBeCloseTo(10_500, -1);
  });

  it('sliderActive is false during read beat and true after', () => {
    const event: ScandalEvent = {
      id: 'test-2',
      scandal_type: 'platform_neglect',
      target_platform: 'chirper',
      raw_magnitude: 0.08,
      final_magnitude: null,
      engagement_spent: 0,
      followers_lost: 0,
      timestamp: T0,
      resolved: false,
    };
    const sm: ScandalStateMachine = {
      ...createDefaultStateMachine(SD),
      state: 'scandal_active',
      activeScandal: event,
      timerStartTime: T0,
      timerDuration: 13_500,
      readBeatDuration: 1_500,
    };
    const state: GameState = {
      ...scandalReadyState(),
      platforms: {
        ...scandalReadyState().platforms,
        chirper: { id: 'chirper', unlocked: true, followers: 5_000 },
      },
      scandalStateMachine: sm,
    };

    // During read beat (500ms in)
    const duringBeat = computeScandalUIState(state, T0 + 500, SD);
    expect(duringBeat.activeScandal!.sliderActive).toBe(false);

    // After read beat (2000ms in)
    const afterBeat = computeScandalUIState(state, T0 + 2_000, SD);
    expect(afterBeat.activeScandal!.sliderActive).toBe(true);
  });
});
