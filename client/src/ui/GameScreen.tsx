// Core game screen — the main surface the player interacts with during a
// normal session. Implements UX spec §§2–8 and §11.
//
// Zones (per UX §2):
//   - Top bar (80px): Algorithm state + Engagement + Followers
//   - Post zone (left, 320px): click-to-post button
//   - Generators (center, flex): ledger with category dividers
//   - Platforms (right, 280px): 3 cards with follower counts
//
// Not yet wired:
//   - Viral burst visual choreography (UX §9) — blocked on task #44;
//     the engine emits no viral signal. A hook is ready for when it does.
//   - Sound design (click cue, shift swell, viral signature) — no audio
//     pipeline exists yet.
//   - Upgrade drawer with 3-level preview (UX §6.3) — follow-up UX task.

import { useMemo, useRef, useState, useEffect } from 'react';
import { useGame } from './useGame.ts';
import { STATIC_DATA } from '../static-data/index.ts';
import {
  CLICK_BASE_ENGAGEMENT,
  cloutBonus,
  computeAllGeneratorEffectiveRates,
  effectiveAlgorithmModifier,
} from '../game-loop/index.ts';
import { getAlgorithmModifier } from '../algorithm/index.ts';
import { cloutForRebrand } from '../prestige/index.ts';
import type { GeneratorId } from '../types.ts';
import { AlgorithmBackground } from './AlgorithmBackground.tsx';
import { TopBar } from './TopBar.tsx';
import { PostZone } from './PostZone.tsx';
import { GeneratorList } from './GeneratorList.tsx';
import { PlatformPanel } from './PlatformPanel.tsx';
import { OfflineGainsModal } from './OfflineGainsModal.tsx';
import { GENERATOR_DISPLAY, PLATFORM_DISPLAY } from './display.ts';
import { fmtCompactInt } from './format.ts';
import './GameScreen.css';

export function GameScreen() {
  const {
    state,
    click,
    buy,
    upgrade,
    offlineResult,
    clearOfflineResult,
    rebrand,
  } = useGame();

  // Render-time derived values --------------------------------------------
  const engagementRate = useMemo(() => {
    const rates = computeAllGeneratorEffectiveRates(state, STATIC_DATA);
    let total = 0;
    for (const id of Object.keys(rates) as GeneratorId[]) {
      total += rates[id] ?? 0;
    }
    return total;
  }, [state]);

  // Per-click engagement yield, accounting for algorithm state + clout.
  const perClick = useMemo(() => {
    const def = STATIC_DATA.generators.selfies;
    const raw = getAlgorithmModifier(state.algorithm, 'selfies');
    const algoMod = effectiveAlgorithmModifier(raw, def.trend_sensitivity);
    const clout = cloutBonus(state.player.clout_upgrades, STATIC_DATA);
    return CLICK_BASE_ENGAGEMENT * algoMod * clout;
  }, [state.algorithm, state.player.clout_upgrades]);

  // Derive the context sub-label: "Selfie → Chirper" or "+ auto".
  // The "default" here is heuristic: the player's first-unlocked platform
  // and the generator whose current contribution would land most followers
  // on that platform. Auto-posting is active once any generator has count ≥ 1.
  const contextLabel = useMemo(() => {
    const anyActive = (Object.keys(state.generators) as GeneratorId[]).some(
      (id) => state.generators[id].owned && state.generators[id].count > 0,
    );
    const firstPlatform = (['chirper', 'instasham', 'grindset'] as const).find(
      (id) => state.platforms[id].unlocked,
    );
    const label = firstPlatform
      ? `${GENERATOR_DISPLAY.selfies.name} → ${PLATFORM_DISPLAY[firstPlatform].name}`
      : GENERATOR_DISPLAY.selfies.name;
    return anyActive ? `${label}  ·  + auto` : label;
  }, [state.generators, state.platforms]);

  // Modal visibility — only show if meaningful time elapsed (> 60s per §11).
  const [showOffline, setShowOffline] = useState(
    () => offlineResult !== null && offlineResult.durationMs > 60_000,
  );
  useEffect(() => {
    if (offlineResult && offlineResult.durationMs > 60_000) {
      setShowOffline(true);
    }
  }, [offlineResult]);

  // Approximate algorithm interval from static schedule — used for
  // instability scaling (we don't have the exact current-interval value
  // available; base ± variance is close enough for visual intent).
  const intervalMs = STATIC_DATA.algorithmSchedule.baseIntervalMs;

  // Live `now` for the instability computation. Tick once a second — we
  // only need coarse resolution to scale animation speed.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  // Rebrand affordance — minimal corner button; the full prestige screen
  // is a separate task. Disabled when no followers have been earned.
  const rebrandPreview = cloutForRebrand(state.player.total_followers);
  const lastRebrandRef = useRef<number | null>(null);
  const handleRebrand = () => {
    if (state.player.total_followers <= 0) return;
    if (!window.confirm(
      `Rebrand for ${rebrandPreview} Clout? This wipes your current run.`,
    )) return;
    const r = rebrand();
    lastRebrandRef.current = r.cloutEarned;
  };

  return (
    <>
      <AlgorithmBackground
        algorithm={state.algorithm}
        now={now}
        intervalMs={intervalMs}
      />

      <main className="game-screen">
        <TopBar
          algorithm={state.algorithm}
          engagement={state.player.engagement}
          engagementRate={engagementRate}
          totalFollowers={state.player.total_followers}
        />

        <div className="game-body">
          <PostZone
            onClick={click}
            perClick={perClick}
            contextLabel={contextLabel}
          />
          <GeneratorList
            state={state}
            staticData={STATIC_DATA}
            onBuy={buy}
            onUpgrade={upgrade}
          />
          <PlatformPanel state={state} staticData={STATIC_DATA} />
        </div>
      </main>

      {showOffline && offlineResult && (
        <OfflineGainsModal
          result={offlineResult}
          onDismiss={() => {
            setShowOffline(false);
            clearOfflineResult();
          }}
        />
      )}

      <div className="rebrand-corner">
        <button
          className="rebrand-btn"
          onClick={handleRebrand}
          disabled={state.player.total_followers <= 0}
          title={
            state.player.total_followers > 0
              ? `Rebrand for ${rebrandPreview} Clout (${fmtCompactInt(state.player.total_followers)} followers this run)`
              : 'Earn followers first'
          }
        >
          Rebrand · +{rebrandPreview} Clout
        </button>
        {state.player.clout > 0 && (
          <div className="rebrand-tooltip">
            {state.player.clout} Clout · {state.player.rebrand_count} rebrands
          </div>
        )}
      </div>
    </>
  );
}
