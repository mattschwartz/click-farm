// Platform panel — 3 cards with per-platform follower counts, top affinity
// generators, and per-platform follower rate arrows (UX §7).
//
// Floating +N numbers rise briefly when followers tick into a platform —
// per UX §7.2, this visualises cross-posting flow without drawing lines.

import { useEffect, useRef, useState } from 'react';
import type {
  GameState,
  GeneratorId,
  PlatformId,
  RiskLevel,
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
import { fmtCompactInt } from './format.ts';

interface Props {
  state: GameState;
  staticData: StaticData;
  /** When set, this platform's card edges illuminate (UX §9.2 Phase 1–2). */
  viralPlatformId?: PlatformId | null;
  /**
   * Risk levels keyed by "platform:{id}". When present, cards show amber
   * warmth (building) or pulsing amber (high) risk indicators.
   */
  riskLevels?: Record<string, RiskLevel>;
}

export function PlatformPanel({ state, staticData, viralPlatformId, riskLevels }: Props) {
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
    <aside className="platform-panel">
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
            riskLevel={riskLevels?.[`platform:${id}`] ?? 'none'}
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
  /** Scandal risk level for this platform. 'none' = normal rendering. */
  riskLevel?: RiskLevel;
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
  riskLevel = 'none',
}: CardProps) {
  const display = PLATFORM_DISPLAY[id];
  const def = staticData.platforms[id];
  const topAffinities = topAffinityGenerators(def.content_affinity, 3);

  // Track follower gains for a floating +N indicator.
  const floats = useFollowerFloats(followers);

  const style = {
    '--platform-accent': display.accent,
  } as React.CSSProperties;

  if (!unlocked) {
    return (
      <div className="platform-card locked" style={style}>
        <div className="platform-header">
          <span className="platform-icon">{display.icon}</span>
          <span className="platform-name">{display.name}</span>
        </div>
        <div className="unlock-teaser">
          Unlocks at {unlockThreshold.toLocaleString()} total followers
        </div>
      </div>
    );
  }

  const riskClass = riskLevel !== 'none' ? ` risk-${riskLevel}` : '';
  return (
    <div className={`platform-card${viralIlluminate ? ' viral-illuminate' : ''}${riskClass}`} style={style}>
      <div className="platform-header">
        <span className="platform-icon">{display.icon}</span>
        <span className="platform-name">{display.name}</span>
      </div>
      <div className="platform-followers">{fmtCompactInt(followers)}</div>
      <div className="platform-sub-label">followers</div>

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

      <div className={`rate-row${ratePerSec > 0 ? ' gaining' : ''}`}>
        {ratePerSec > 0 ? '▲' : '—'}{' '}
        {ratePerSec > 0 ? `+${ratePerSec.toFixed(1)}/s` : 'stalled'}
      </div>

      {floats.map((f) => (
        <span
          key={f.id}
          className="float-number"
          style={{ left: '50%', bottom: '10px', top: 'auto' }}
        >
          +{Math.max(1, Math.floor(f.value))}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hooks & helpers
// ---------------------------------------------------------------------------

interface FloatItem {
  id: number;
  value: number;
}

/**
 * Watches `followers` and emits floating-tick items when the value climbs
 * past the next integer boundary. Emits at most ~2 per second to avoid
 * visual spam — floats are semantic, not exact accounting.
 */
function useFollowerFloats(followers: number): FloatItem[] {
  const [floats, setFloats] = useState<FloatItem[]>([]);
  const prev = useRef(followers);
  const lastEmit = useRef(0);
  const nextId = useRef(0);

  useEffect(() => {
    const delta = followers - prev.current;
    prev.current = followers;
    if (delta <= 0) return;
    const now = Date.now();
    if (now - lastEmit.current < 500) return;
    if (delta < 1) return; // wait for a full follower to accrue
    lastEmit.current = now;
    const id = nextId.current++;
    setFloats((prevFloats) => [...prevFloats, { id, value: delta }]);
    window.setTimeout(() => {
      setFloats((prevFloats) => prevFloats.filter((f) => f.id !== id));
    }, 600);
  }, [followers]);

  return floats;
}

function computeHeaviestContributor(
  engagementRates: Partial<Record<GeneratorId, number>>,
  platforms: GameState['platforms'],
  staticData: StaticData,
): Record<PlatformId, GeneratorId | null> {
  const out: Record<PlatformId, GeneratorId | null> = {
    chirper: null,
    instasham: null,
    grindset: null,
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
