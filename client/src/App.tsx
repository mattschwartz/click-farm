// Debug UI for end-to-end playability (E7).
// This is NOT the UX-spec'd interface — that's E10 (Core Game UI). This view
// exists to verify the integrated game loop is working correctly: clicks
// produce engagement, engagement buys generators, generators produce more
// engagement, engagement converts to followers, followers unlock platforms,
// the algorithm shifts. Intentionally unstyled and dense.

import { useState } from 'react';
import { useGame } from './ui/useGame.ts';
import { STATIC_DATA } from './static-data/index.ts';
import {
  generatorBuyCost,
  generatorUpgradeCost,
} from './generator/index.ts';
import {
  cloutForRebrand,
  cloutUpgradeCost,
} from './prestige/index.ts';
import type { GeneratorId, PlatformId, UpgradeId } from './types.ts';
import './App.css';

const UPGRADE_ORDER: UpgradeId[] = [
  'faster_engagement',
  'algorithm_insight',
  'platform_headstart_chirper',
  'platform_headstart_instasham',
  'platform_headstart_grindset',
];

const GENERATOR_ORDER: GeneratorId[] = [
  'selfies',
  'memes',
  'hot_takes',
  'tutorials',
  'livestreams',
  'podcasts',
  'viral_stunts',
];

const PLATFORM_ORDER: PlatformId[] = ['chirper', 'instasham', 'grindset'];

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(2);
}

function fmtInt(n: number): string {
  return Math.floor(n).toLocaleString();
}

function fmtDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

function App() {
  const {
    state,
    click,
    buy,
    upgrade,
    offlineResult,
    clearOfflineResult,
    rebrand,
    buyCloutUpgrade,
  } = useGame();
  const [lastRebrand, setLastRebrand] = useState<number | null>(null);

  const rebrandPreview = cloutForRebrand(state.player.total_followers);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 16, maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 4 }}>Click Farm — Debug</h1>
      <p style={{ marginTop: 0, opacity: 0.7, fontSize: 12 }}>
        E7 integration harness. Not the final UI.
      </p>

      {/* Offline gains banner --------------------------------------------- */}
      {offlineResult && offlineResult.durationMs > 0 && (
        <section style={{
          padding: 12,
          marginBottom: 16,
          border: '1px solid #5aa',
          borderRadius: 4,
          background: '#f0ffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}>
          <div style={{ fontSize: 14 }}>
            <strong>Welcome back.</strong> Away for {fmtDuration(offlineResult.durationMs)}.
            {' '}Gained <strong>{fmt(offlineResult.engagementGained)}</strong> engagement
            {' '}and <strong>{fmtInt(offlineResult.totalFollowersGained)}</strong> followers
            {offlineResult.algorithmAdvances > 0
              && ` (${offlineResult.algorithmAdvances} algorithm shifts)`}.
          </div>
          <button onClick={clearOfflineResult} style={{ cursor: 'pointer' }}>Dismiss</button>
        </section>
      )}

      {/* Currencies ---------------------------------------------------- */}
      <section style={{ display: 'flex', gap: 24, padding: 12, border: '1px solid #ccc', borderRadius: 4, marginBottom: 16 }}>
        <div><strong>Engagement</strong><br />{fmt(state.player.engagement)}</div>
        <div><strong>Followers</strong><br />{fmtInt(state.player.total_followers)}</div>
        <div><strong>Clout</strong><br />{state.player.clout}</div>
        <div><strong>Lifetime</strong><br />{fmtInt(state.player.lifetime_followers)}</div>
        <div><strong>Rebrands</strong><br />{state.player.rebrand_count}</div>
      </section>

      {/* Algorithm ----------------------------------------------------- */}
      <section style={{ padding: 12, border: '1px solid #ccc', borderRadius: 4, marginBottom: 16 }}>
        <strong>Algorithm:</strong> {state.algorithm.current_state_id}{' '}
        <span style={{ opacity: 0.6 }}>(shift #{state.algorithm.current_state_index})</span>
      </section>

      {/* Click --------------------------------------------------------- */}
      <section style={{ marginBottom: 16 }}>
        <button
          onClick={click}
          style={{ padding: '12px 24px', fontSize: 16, cursor: 'pointer' }}
        >
          Post content (+engagement)
        </button>
      </section>

      {/* Platforms ----------------------------------------------------- */}
      <section style={{ padding: 12, border: '1px solid #ccc', borderRadius: 4, marginBottom: 16 }}>
        <strong>Platforms</strong>
        <table style={{ width: '100%', marginTop: 8, fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', opacity: 0.7 }}>
              <th>Platform</th>
              <th>Status</th>
              <th>Followers</th>
              <th>Unlock at</th>
            </tr>
          </thead>
          <tbody>
            {PLATFORM_ORDER.map((id) => {
              const p = state.platforms[id];
              const threshold = STATIC_DATA.unlockThresholds.platforms[id];
              return (
                <tr key={id}>
                  <td>{id}</td>
                  <td>{p.unlocked ? 'unlocked' : 'locked'}</td>
                  <td>{fmtInt(p.followers)}</td>
                  <td>{threshold}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Generators ---------------------------------------------------- */}
      <section style={{ padding: 12, border: '1px solid #ccc', borderRadius: 4 }}>
        <strong>Generators</strong>
        <table style={{ width: '100%', marginTop: 8, fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', opacity: 0.7 }}>
              <th>Generator</th>
              <th>Status</th>
              <th>Count</th>
              <th>Level</th>
              <th>Buy</th>
              <th>Upgrade</th>
            </tr>
          </thead>
          <tbody>
            {GENERATOR_ORDER.map((id) => {
              const g = state.generators[id];
              const threshold = STATIC_DATA.unlockThresholds.generators[id];
              if (!g.owned) {
                return (
                  <tr key={id} style={{ opacity: 0.5 }}>
                    <td>{id}</td>
                    <td>locked (needs {threshold} followers)</td>
                    <td colSpan={4} />
                  </tr>
                );
              }
              const buyCost = generatorBuyCost(id, g.count, STATIC_DATA);
              const upgradeCost = generatorUpgradeCost(id, g.level, STATIC_DATA);
              const canBuy = state.player.engagement >= buyCost;
              const canUpgrade = g.count > 0 && state.player.engagement >= upgradeCost;
              return (
                <tr key={id}>
                  <td>{id}</td>
                  <td>owned</td>
                  <td>{g.count}</td>
                  <td>{g.level}</td>
                  <td>
                    <button
                      onClick={() => buy(id)}
                      disabled={!canBuy}
                      style={{ cursor: canBuy ? 'pointer' : 'not-allowed' }}
                    >
                      {fmt(buyCost)}
                    </button>
                  </td>
                  <td>
                    <button
                      onClick={() => upgrade(id)}
                      disabled={!canUpgrade}
                      style={{ cursor: canUpgrade ? 'pointer' : 'not-allowed' }}
                    >
                      {fmt(upgradeCost)}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Prestige ------------------------------------------------------ */}
      <section style={{ padding: 12, border: '1px solid #ccc', borderRadius: 4, marginTop: 16 }}>
        <strong>Prestige</strong>
        <div style={{ marginTop: 8, fontSize: 14 }}>
          Rebrand now for <strong>{rebrandPreview}</strong> Clout
          {' '}({fmtInt(state.player.total_followers)} followers this run).
          {' '}<em style={{ opacity: 0.6 }}>
            Wipes engagement, followers, generators, platforms. Keeps Clout + upgrades.
          </em>
        </div>
        <button
          onClick={() => {
            if (state.player.total_followers === 0) return;
            if (!confirm(`Rebrand for ${rebrandPreview} Clout? Run will reset.`)) return;
            const r = rebrand();
            setLastRebrand(r.cloutEarned);
          }}
          disabled={state.player.total_followers === 0}
          style={{
            marginTop: 8,
            padding: '6px 12px',
            cursor: state.player.total_followers > 0 ? 'pointer' : 'not-allowed',
          }}
        >
          Rebrand (+{rebrandPreview} Clout)
        </button>
        {lastRebrand !== null && (
          <div style={{ marginTop: 8, fontSize: 13, color: '#080' }}>
            Last rebrand: +{lastRebrand} Clout awarded.
          </div>
        )}

        <div style={{ marginTop: 12, fontSize: 14 }}>
          <strong>Clout Upgrades</strong>
          <table style={{ width: '100%', marginTop: 8, fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', opacity: 0.7 }}>
                <th>Upgrade</th>
                <th>Level</th>
                <th>Next Cost</th>
                <th>Buy</th>
              </tr>
            </thead>
            <tbody>
              {UPGRADE_ORDER.map((id) => {
                const lvl = state.player.clout_upgrades[id] ?? 0;
                const cost = cloutUpgradeCost(lvl, id, STATIC_DATA);
                const def = STATIC_DATA.cloutUpgrades[id];
                const canBuy = cost !== null && state.player.clout >= cost;
                return (
                  <tr key={id}>
                    <td>{id}</td>
                    <td>{lvl} / {def.max_level}</td>
                    <td>{cost === null ? '—' : `${cost} Clout`}</td>
                    <td>
                      <button
                        onClick={() => buyCloutUpgrade(id)}
                        disabled={!canBuy}
                        style={{ cursor: canBuy ? 'pointer' : 'not-allowed' }}
                      >
                        {cost === null ? 'MAX' : 'buy'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default App;
