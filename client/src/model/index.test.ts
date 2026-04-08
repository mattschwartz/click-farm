import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import '../test/decimal-matchers.ts';
import {
  createPlayer,
  createGeneratorState,
  createPlatformState,
  createInitialGameState,
  clampEngagement,
  earnEngagement,
  spendEngagement,
  canAffordEngagement,
  earnClout,
  spendClout,
  canAffordClout,
  earnFollowers,
  syncTotalFollowers,
} from './index.ts';
import { STATIC_DATA } from '../static-data/index.ts';

// ---------------------------------------------------------------------------
// createPlayer
// ---------------------------------------------------------------------------

describe('createPlayer', () => {
  it('creates a player with zeroed currencies', () => {
    const player = createPlayer(1000);
    expect(player.engagement).toEqualDecimal(0);
    expect(player.clout).toBe(0);
    expect(player.total_followers).toEqualDecimal(0);
    expect(player.lifetime_followers).toEqualDecimal(0);
    expect(player.lifetime_engagement).toEqualDecimal(0);
  });

  it('sets run_start_time', () => {
    const player = createPlayer(5000);
    expect(player.run_start_time).toBe(5000);
  });

  it('starts with no close state', () => {
    const player = createPlayer(0);
    expect(player.last_close_time).toBeNull();
    expect(player.last_close_state).toBeNull();
  });

  it('generates a unique id each time', () => {
    const a = createPlayer(0);
    const b = createPlayer(0);
    expect(a.id).not.toBe(b.id);
  });

  it('starts with all clout_upgrades at level 0', () => {
    const player = createPlayer(0);
    for (const level of Object.values(player.clout_upgrades)) {
      expect(level).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// createGeneratorState
// ---------------------------------------------------------------------------

describe('createGeneratorState', () => {
  it('starts unowned with count 0 and level 1', () => {
    const gen = createGeneratorState('selfies');
    expect(gen.owned).toBe(false);
    expect(gen.count).toBe(0);
    expect(gen.level).toBe(1);
    expect(gen.id).toBe('selfies');
  });
});

// ---------------------------------------------------------------------------
// createPlatformState
// ---------------------------------------------------------------------------

describe('createPlatformState', () => {
  it('starts locked by default', () => {
    const platform = createPlatformState('picshift');
    expect(platform.unlocked).toBe(false);
    expect(platform.followers).toEqualDecimal(0);
  });

  it('can be created unlocked', () => {
    const platform = createPlatformState('chirper', true);
    expect(platform.unlocked).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createInitialGameState
// ---------------------------------------------------------------------------

describe('createInitialGameState', () => {
  it('unlocks platforms with threshold 0, locks others', () => {
    const state = createInitialGameState(STATIC_DATA, 0);
    expect(state.platforms.chirper.unlocked).toBe(true);
    expect(state.platforms.picshift.unlocked).toBe(false);
    expect(state.platforms.skroll.unlocked).toBe(false);
  });

  it('starts threshold-0 generators owned, others unowned', () => {
    const state = createInitialGameState(STATIC_DATA, 0);
    for (const gen of Object.values(state.generators)) {
      const threshold = STATIC_DATA.unlockThresholds.generators[gen.id];
      expect(gen.owned).toBe(threshold === 0);
    }
  });

  it('initializes all platform follower counts to 0', () => {
    const state = createInitialGameState(STATIC_DATA, 0);
    for (const platform of Object.values(state.platforms)) {
      expect(platform.followers).toEqualDecimal(0);
    }
  });
});

// ---------------------------------------------------------------------------
// earnEngagement
// ---------------------------------------------------------------------------

describe('earnEngagement', () => {
  it('adds engagement', () => {
    const player = createPlayer(0);
    const updated = earnEngagement(player, new Decimal(50));
    expect(updated.engagement).toEqualDecimal(50);
  });

  it('does not mutate the original player', () => {
    const player = createPlayer(0);
    earnEngagement(player, new Decimal(50));
    expect(player.engagement).toEqualDecimal(0);
  });

  it('throws on negative amount', () => {
    const player = createPlayer(0);
    expect(() => earnEngagement(player, new Decimal(-1))).toThrow();
  });

  it('allows earning 0', () => {
    const player = createPlayer(0);
    const updated = earnEngagement(player, new Decimal(0));
    expect(updated.engagement).toEqualDecimal(0);
  });

  it('allows earning beyond MAX_SAFE_INTEGER — no ceiling', () => {
    const player = { ...createPlayer(0), engagement: new Decimal(Number.MAX_SAFE_INTEGER).minus(10) };
    const updated = earnEngagement(player, new Decimal(1e18));
    // No clamp — the value exceeds MAX_SAFE_INTEGER freely
    expect(updated.engagement.gt(Number.MAX_SAFE_INTEGER)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// clampEngagement (Decimal version — no upper ceiling)
// ---------------------------------------------------------------------------

describe('clampEngagement', () => {
  it('returns value unchanged when in the valid range', () => {
    expect(clampEngagement(new Decimal(0))).toEqualDecimal(0);
    expect(clampEngagement(new Decimal(100))).toEqualDecimal(100);
    expect(clampEngagement(new Decimal(Number.MAX_SAFE_INTEGER))).toEqualDecimal(
      Number.MAX_SAFE_INTEGER,
    );
  });

  it('clamps negative values to 0', () => {
    expect(clampEngagement(new Decimal(-1))).toEqualDecimal(0);
    expect(clampEngagement(new Decimal(-1e18))).toEqualDecimal(0);
  });

  it('does NOT clamp values above MAX_SAFE_INTEGER — no ceiling', () => {
    const big = new Decimal(Number.MAX_SAFE_INTEGER).plus(1);
    expect(clampEngagement(big)).toEqualDecimal(big);
    expect(clampEngagement(new Decimal('1e100'))).toEqualDecimal('1e100');
  });

  it('coerces NaN to 0', () => {
    expect(clampEngagement(new Decimal(NaN))).toEqualDecimal(0);
  });
});

// ---------------------------------------------------------------------------
// spendEngagement
// ---------------------------------------------------------------------------

describe('spendEngagement', () => {
  it('subtracts engagement', () => {
    const player = earnEngagement(createPlayer(0), new Decimal(100));
    const updated = spendEngagement(player, new Decimal(30));
    expect(updated.engagement).toEqualDecimal(70);
  });

  it('throws when insufficient balance', () => {
    const player = earnEngagement(createPlayer(0), new Decimal(10));
    expect(() => spendEngagement(player, new Decimal(20))).toThrow();
  });

  it('throws on negative amount', () => {
    const player = earnEngagement(createPlayer(0), new Decimal(100));
    expect(() => spendEngagement(player, new Decimal(-5))).toThrow();
  });

  it('allows spending exact balance to zero', () => {
    const player = earnEngagement(createPlayer(0), new Decimal(50));
    const updated = spendEngagement(player, new Decimal(50));
    expect(updated.engagement).toEqualDecimal(0);
  });

  it('does not go negative', () => {
    const player = createPlayer(0); // engagement = 0
    expect(() => spendEngagement(player, new Decimal(1))).toThrow();
  });
});

// ---------------------------------------------------------------------------
// canAffordEngagement
// ---------------------------------------------------------------------------

describe('canAffordEngagement', () => {
  it('returns true when sufficient', () => {
    const player = earnEngagement(createPlayer(0), new Decimal(100));
    expect(canAffordEngagement(player, new Decimal(50))).toBe(true);
    expect(canAffordEngagement(player, new Decimal(100))).toBe(true);
  });

  it('returns false when insufficient', () => {
    const player = createPlayer(0);
    expect(canAffordEngagement(player, new Decimal(1))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// earnClout
// ---------------------------------------------------------------------------

describe('earnClout', () => {
  it('adds clout', () => {
    const player = earnClout(createPlayer(0), 5);
    expect(player.clout).toBe(5);
  });

  it('throws on negative amount', () => {
    expect(() => earnClout(createPlayer(0), -1)).toThrow();
  });

  it('throws on non-integer amount', () => {
    expect(() => earnClout(createPlayer(0), 1.5)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// spendClout
// ---------------------------------------------------------------------------

describe('spendClout', () => {
  it('subtracts clout', () => {
    const player = earnClout(createPlayer(0), 10);
    const updated = spendClout(player, 3);
    expect(updated.clout).toBe(7);
  });

  it('throws when insufficient', () => {
    const player = createPlayer(0);
    expect(() => spendClout(player, 1)).toThrow();
  });

  it('throws on negative amount', () => {
    const player = earnClout(createPlayer(0), 10);
    expect(() => spendClout(player, -1)).toThrow();
  });

  it('throws on non-integer amount', () => {
    const player = earnClout(createPlayer(0), 10);
    expect(() => spendClout(player, 0.5)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// canAffordClout
// ---------------------------------------------------------------------------

describe('canAffordClout', () => {
  it('returns true when sufficient', () => {
    const player = earnClout(createPlayer(0), 5);
    expect(canAffordClout(player, 5)).toBe(true);
  });

  it('returns false when insufficient', () => {
    const player = createPlayer(0);
    expect(canAffordClout(player, 1)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// earnFollowers (per-platform independence)
// ---------------------------------------------------------------------------

describe('earnFollowers', () => {
  it('increases platform followers independently', () => {
    let state = createInitialGameState(STATIC_DATA, 0);
    const result = earnFollowers(state.platforms.chirper, state.player, new Decimal(100));
    state = {
      ...state,
      platforms: { ...state.platforms, chirper: result.platform },
      player: result.player,
    };

    expect(state.platforms.chirper.followers).toEqualDecimal(100);
    expect(state.platforms.picshift.followers).toEqualDecimal(0);
    expect(state.platforms.skroll.followers).toEqualDecimal(0);
  });

  it('updates lifetime_followers but not total_followers (derived)', () => {
    const state = createInitialGameState(STATIC_DATA, 0);
    const result = earnFollowers(state.platforms.chirper, state.player, new Decimal(50));

    // earnFollowers updates lifetime_followers
    expect(result.player.lifetime_followers).toEqualDecimal(50);
    // total_followers is derived — earnFollowers does not write it
    expect(result.player.total_followers).toEqualDecimal(0);
    // To keep total_followers in sync, call syncTotalFollowers
    const synced = syncTotalFollowers(result.player, {
      ...state.platforms,
      chirper: result.platform,
    });
    expect(synced.total_followers).toEqualDecimal(50);
  });

  it('throws when platform is locked', () => {
    const state = createInitialGameState(STATIC_DATA, 0);
    expect(() =>
      earnFollowers(state.platforms.picshift, state.player, new Decimal(10))
    ).toThrow();
  });

  it('throws on negative amount', () => {
    const state = createInitialGameState(STATIC_DATA, 0);
    expect(() =>
      earnFollowers(state.platforms.chirper, state.player, new Decimal(-5))
    ).toThrow();
  });

  it('does not mutate original platform or player', () => {
    const state = createInitialGameState(STATIC_DATA, 0);
    const originalFollowers = state.platforms.chirper.followers;
    const originalTotal = state.player.total_followers;

    earnFollowers(state.platforms.chirper, state.player, new Decimal(100));

    expect(state.platforms.chirper.followers).toEqualDecimal(originalFollowers);
    expect(state.player.total_followers).toEqualDecimal(originalTotal);
  });
});

// ---------------------------------------------------------------------------
// syncTotalFollowers
// ---------------------------------------------------------------------------

describe('syncTotalFollowers', () => {
  it('sums followers across all platforms', () => {
    let state = createInitialGameState(STATIC_DATA, 0);

    // Unlock and add followers manually for the test
    const platforms = {
      ...state.platforms,
      chirper: { ...state.platforms.chirper, followers: new Decimal(100) },
      picshift: { ...state.platforms.picshift, followers: new Decimal(200) },
      skroll: { ...state.platforms.skroll, followers: new Decimal(50) },
    };

    const player = syncTotalFollowers(state.player, platforms);
    state = { ...state, platforms, player };

    expect(state.player.total_followers).toEqualDecimal(350);
  });
});
