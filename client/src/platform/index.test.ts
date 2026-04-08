import { describe, it, expect } from 'vitest';
import {
  getPlatformAffinity,
  checkPlatformUnlocks,
  computeFollowerDistribution,
} from './index.ts';
import { STATIC_DATA } from '../static-data/index.ts';
import { createPlatformState } from '../model/index.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlatforms(
  chirperUnlocked = true,
  picshiftUnlocked = false,
  skrollUnlocked = false,
  podpodUnlocked = false,
) {
  return {
    chirper: createPlatformState('chirper', chirperUnlocked),
    picshift: createPlatformState('picshift', picshiftUnlocked),
    skroll: createPlatformState('skroll', skrollUnlocked),
    podpod: createPlatformState('podpod', podpodUnlocked),
  };
}

// ---------------------------------------------------------------------------
// getPlatformAffinity
// ---------------------------------------------------------------------------

describe('getPlatformAffinity', () => {
  it('returns the correct affinity for a known generator', () => {
    // chirper hot_takes affinity is 2.0 per static data
    expect(getPlatformAffinity('chirper', 'hot_takes', STATIC_DATA)).toBe(2.0);
  });

  it('returns 1.0 for an unknown generator id', () => {
    // Cast to trick TS — simulates a future generator not yet in static data
    expect(
      getPlatformAffinity('chirper', 'unknown_gen' as never, STATIC_DATA)
    ).toBe(1.0);
  });

  it('returns different values for different platforms', () => {
    const chirperSelfies = getPlatformAffinity('chirper', 'selfies', STATIC_DATA);
    const picshiftSelfies = getPlatformAffinity('picshift', 'selfies', STATIC_DATA);
    // picshift should boost selfies more than chirper
    expect(picshiftSelfies).toBeGreaterThan(chirperSelfies);
  });
});

// ---------------------------------------------------------------------------
// checkPlatformUnlocks
// ---------------------------------------------------------------------------

describe('checkPlatformUnlocks', () => {
  it('does not unlock any platform when followers are below all thresholds', () => {
    const platforms = makePlatforms(true, false, false);
    const result = checkPlatformUnlocks(platforms, 0, STATIC_DATA);
    expect(result.picshift.unlocked).toBe(false);
    expect(result.skroll.unlocked).toBe(false);
  });

  it('unlocks picshift when total followers meets its threshold', () => {
    const platforms = makePlatforms(true, false, false);
    const threshold = STATIC_DATA.unlockThresholds.platforms.picshift; // 100
    const result = checkPlatformUnlocks(platforms, threshold, STATIC_DATA);
    expect(result.picshift.unlocked).toBe(true);
  });

  it('does not unlock picshift when one follower short', () => {
    const platforms = makePlatforms(true, false, false);
    const threshold = STATIC_DATA.unlockThresholds.platforms.picshift;
    const result = checkPlatformUnlocks(platforms, threshold - 1, STATIC_DATA);
    expect(result.picshift.unlocked).toBe(false);
  });

  it('unlocks skroll when total followers meets its threshold', () => {
    const platforms = makePlatforms(true, false, false);
    const threshold = STATIC_DATA.unlockThresholds.platforms.skroll; // 15_000
    const result = checkPlatformUnlocks(platforms, threshold, STATIC_DATA);
    expect(result.skroll.unlocked).toBe(true);
  });

  it('unlocks multiple platforms simultaneously when followers are high enough', () => {
    const platforms = makePlatforms(true, false, false);
    const result = checkPlatformUnlocks(platforms, 20_000, STATIC_DATA);
    expect(result.picshift.unlocked).toBe(true);
    expect(result.skroll.unlocked).toBe(true);
  });

  it('does not mutate already-unlocked platforms', () => {
    const platforms = makePlatforms(true, true, false);
    const result = checkPlatformUnlocks(platforms, 0, STATIC_DATA);
    // picshift was already unlocked; should remain so
    expect(result.picshift.unlocked).toBe(true);
    // picshift state object should be the same reference (no copy)
    expect(result.picshift).toBe(platforms.picshift);
  });

  it('returns the same reference when nothing changes', () => {
    const platforms = makePlatforms(true, false, false);
    const result = checkPlatformUnlocks(platforms, 0, STATIC_DATA);
    expect(result).toBe(platforms);
  });

  it('returns a new object reference when something unlocks', () => {
    const platforms = makePlatforms(true, false, false);
    const result = checkPlatformUnlocks(platforms, 100, STATIC_DATA);
    expect(result).not.toBe(platforms);
  });
});

// ---------------------------------------------------------------------------
// computeFollowerDistribution
// ---------------------------------------------------------------------------

describe('computeFollowerDistribution', () => {
  it('returns zero rates when no generators are active', () => {
    const platforms = makePlatforms(true, false, false);
    const { perPlatformRate, totalRate } = computeFollowerDistribution(
      {},
      platforms,
      STATIC_DATA
    );
    expect(totalRate).toBe(0);
    expect(perPlatformRate.chirper).toBe(0);
  });

  it('returns zero rates when no platforms are unlocked', () => {
    const platforms = makePlatforms(false, false, false);
    const rates = { selfies: 1.0 };
    const { totalRate } = computeFollowerDistribution(rates, platforms, STATIC_DATA);
    expect(totalRate).toBe(0);
  });

  it('sends all followers to the only unlocked platform', () => {
    const platforms = makePlatforms(true, false, false);
    const rates = { selfies: 10.0 };
    const { perPlatformRate, totalRate } = computeFollowerDistribution(
      rates,
      platforms,
      STATIC_DATA
    );
    // chirper is the only unlocked platform → gets 100 %
    expect(perPlatformRate.picshift).toBe(0);
    expect(perPlatformRate.skroll).toBe(0);
    expect(perPlatformRate.chirper).toBeCloseTo(totalRate, 10);
    expect(totalRate).toBeGreaterThan(0);
  });

  it('distributes followers proportionally across two platforms', () => {
    const platforms = makePlatforms(true, true, false);
    // selfies: picshift has higher affinity (2.0) than chirper (0.8)
    const rates = { selfies: 10.0 };
    const { perPlatformRate } = computeFollowerDistribution(
      rates,
      platforms,
      STATIC_DATA
    );
    expect(perPlatformRate.picshift).toBeGreaterThan(perPlatformRate.chirper);
    expect(perPlatformRate.skroll).toBe(0);
  });

  it('total rate equals base follower rate (sum across platforms is conserved)', () => {
    const platforms = makePlatforms(true, true, true);
    const rates = { selfies: 5.0, memes: 3.0, tutorials: 2.0 };

    const { perPlatformRate, totalRate } = computeFollowerDistribution(
      rates,
      platforms,
      STATIC_DATA
    );

    const sumOfPlatforms =
      perPlatformRate.chirper + perPlatformRate.picshift + perPlatformRate.skroll + perPlatformRate.podpod;
    expect(sumOfPlatforms).toBeCloseTo(totalRate, 10);
  });

  it('base rate equals Σ(engagement_rate × conversion_rate)', () => {
    const platforms = makePlatforms(true, false, false);
    const selfiesRate = 4.0;
    const selfiesConv = STATIC_DATA.generators.selfies.follower_conversion_rate;

    const { totalRate } = computeFollowerDistribution(
      { selfies: selfiesRate },
      platforms,
      STATIC_DATA
    );

    // With one platform, totalRate == base rate
    expect(totalRate).toBeCloseTo(selfiesRate * selfiesConv, 10);
  });

  it('tutorials produce more followers on skroll than chirper', () => {
    const platforms = makePlatforms(true, false, true);
    const rates = { tutorials: 10.0 };
    const { perPlatformRate } = computeFollowerDistribution(
      rates,
      platforms,
      STATIC_DATA
    );
    // skroll has 2.0 affinity for tutorials; chirper has 0.7
    expect(perPlatformRate.skroll).toBeGreaterThan(perPlatformRate.chirper);
  });

  it('locked platforms receive zero followers even with high affinity', () => {
    // picshift has 2.0 selfies affinity but is locked
    const platforms = makePlatforms(true, false, false);
    const rates = { selfies: 100.0 };
    const { perPlatformRate } = computeFollowerDistribution(
      rates,
      platforms,
      STATIC_DATA
    );
    expect(perPlatformRate.picshift).toBe(0);
  });
});
