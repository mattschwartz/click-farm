// Platform panel — 3 cards with per-platform follower counts, top affinity
// generators, and per-platform follower rate arrows (UX §7).

import type {
  GameState,
  GeneratorId,
  PlatformId,
  StaticData,
} from '../types.ts';
import { computeAllGeneratorEffectiveRates } from '../game-loop/index.ts';
import { computeFollowerDistribution } from '../platform/index.ts';
import {
  GENERATOR_DISPLAY,
  PLATFORM_DISPLAY,
  PLATFORM_ORDER,
  topAffinityGenerators,
} from './display.ts';
import { fmtCompact, fmtCompactInt } from './format.ts';

interface Props {
  state: GameState;
  staticData: StaticData;
  /** When set, this platform's card edges illuminate (UX §9.2 Phase 1–2). */
  viralPlatformId?: PlatformId | null;
  /**
   * When true, dims the platform panel to 40% opacity while the upgrade
   * drawer is open (per UX spec ux/upgrade-curve-drawer-spec.md §1).
   */
  drawerDimmed?: boolean;
}

export function PlatformPanel({ state, staticData, viralPlatformId, drawerDimmed }: Props) {
  // Compute follower rates per platform for the rate indicators (UX §7.1).
  const engagementRates = computeAllGeneratorEffectiveRates(state, staticData);
  const ratesPerMs: Partial<Record<GeneratorId, number>> = {};
  for (const id of Object.keys(engagementRates) as GeneratorId[]) {
    ratesPerMs[id] = (engagementRates[id] ?? 0) / 1000;
  }
  const distribution = computeFollowerDistribution(
    ratesPerMs,
    state.platforms,
    staticData,
  );

  // Identify the single heaviest-contributing generator per platform for
  // the affinity-chip glow (UX §7.2).
  const heaviestByPlatform = computeHeaviestContributor(
    engagementRates,
    state.platforms,
    staticData,
  );

  return (
    <aside className={`platform-panel${drawerDimmed ? ' drawer-dimmed' : ''}`}>
      {PLATFORM_ORDER.map((id) => {
        const p = state.platforms[id];
        const threshold = staticData.unlockThresholds.platforms[id] ?? 0;
        // perPlatformRate is per-ms; convert to per-sec for display.
        const ratePerSec = distribution.perPlatformRate[id] * 1000;
        return (
          <PlatformCard
            key={id}
            id={id}
            unlocked={p.unlocked}
            followers={p.followers}
            ratePerSec={ratePerSec}
            unlockThreshold={threshold}
            staticData={staticData}
            heaviestGenerator={heaviestByPlatform[id]}
            viralIlluminate={id === viralPlatformId}
          />
        );
      })}
    </aside>
  );
}

// ---------------------------------------------------------------------------

interface CardProps {
  id: PlatformId;
  unlocked: boolean;
  followers: number;
  ratePerSec: number;
  unlockThreshold: number;
  staticData: StaticData;
  heaviestGenerator: GeneratorId | null;
  /** True while this card is the viral burst destination (UX §9.2 Phase 1–2). */
  viralIlluminate?: boolean;
}

function PlatformCard({
  id,
  unlocked,
  followers,
  ratePerSec,
  unlockThreshold,
  staticData,
  heaviestGenerator,
  viralIlluminate,
}: CardProps) {
  const display = PLATFORM_DISPLAY[id];
  const def = staticData.platforms[id];
  const topAffinities = topAffinityGenerators(def.content_affinity, 3);

  const style = {
    '--platform-accent': display.accent,
    ...(display.accentGradient ? { '--platform-accent-gradient': display.accentGradient } : {}),
  } as React.CSSProperties;

  if (!unlocked) {
    return (
      <div className="platform-card locked" style={style}>
        {display.image && (
          <img className="platform-bg-art" src={display.image} alt="" aria-hidden="true" />
        )}
        <div className="platform-header">
          <span className="platform-name">{display.name}</span>
        </div>
        <div className="unlock-teaser">
          Unlocks at {unlockThreshold.toLocaleString()} total followers
        </div>
      </div>
    );
  }

  return (
    <div className={`platform-card${viralIlluminate ? ' viral-illuminate' : ''}`} style={style}>
      {display.image && (
        <img className="platform-bg-art" src={display.image} alt="" aria-hidden="true" />
      )}
      <div className="platform-header">
        <span className="platform-name">{display.name}</span>
      </div>
      <div className="platform-followers-row">
        <span className="platform-followers">{fmtCompactInt(followers)}</span>
      </div>
      <div className="platform-sub-label">{display.audienceLabel ?? 'followers'}</div>

      <div className="affinity-row">
        {topAffinities.map((a) => {
          const genDisplay = GENERATOR_DISPLAY[a.id];
          const glow = heaviestGenerator === a.id;
          return (
            <span key={a.id} className={`affinity-chip${glow ? ' glow' : ''}`} title={`${genDisplay.name} ×${a.affinity.toFixed(1)}`}>
              <span>{genDisplay.icon}</span>
              <span>×{a.affinity.toFixed(1)}</span>
            </span>
          );
        })}
      </div>

    </div>
  );
}

// ---------------------------------------------------------------------------
// Hooks & helpers
// ---------------------------------------------------------------------------

function computeHeaviestContributor(
  engagementRates: Partial<Record<GeneratorId, number>>,
  platforms: GameState['platforms'],
  staticData: StaticData,
): Record<PlatformId, GeneratorId | null> {
  const out: Record<PlatformId, GeneratorId | null> = {
    chirper: null,
    picshift: null,
    skroll: null,
    podpod: null,
  };
  const entries = Object.entries(engagementRates) as [GeneratorId, number][];
  for (const pid of Object.keys(platforms) as PlatformId[]) {
    if (!platforms[pid].unlocked) continue;
    const def = staticData.platforms[pid];
    let bestGen: GeneratorId | null = null;
    let bestScore = 0;
    for (const [gid, engagementRate] of entries) {
      const conv = staticData.generators[gid].follower_conversion_rate;
      const affinity = def.content_affinity[gid] ?? 0;
      const score = engagementRate * conv * affinity;
      if (score > bestScore) {
        bestScore = score;
        bestGen = gid;
      }
    }
    // Only glow if the top contributor meaningfully exceeds the rest.
    if (bestScore > 0) out[pid] = bestGen;
  }
  return out;
}
