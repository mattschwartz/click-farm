// Debug UI for end-to-end playability (E7).
// This is NOT the UX-spec'd interface — that's E10 (Core Game UI). This view
// exists to verify the integrated game loop is working correctly: clicks
// produce engagement, engagement buys generators, generators produce more
// engagement, engagement converts to followers, followers unlock platforms,
// the algorithm shifts. Intentionally unstyled and dense.

import { useGame } from './ui/useGame.ts';
import { STATIC_DATA } from './static-data/index.ts';
import {
  generatorBuyCost,
  generatorUpgradeCost,
} from './generator/index.ts';
import type { GeneratorId, PlatformId } from './types.ts';
import './App.css';

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

function App() {
  const { state, click, buy, upgrade } = useGame();

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 16, maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 4 }}>Click Farm — Debug</h1>
      <p style={{ marginTop: 0, opacity: 0.7, fontSize: 12 }}>
        E7 integration harness. Not the final UI.
      </p>

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
    </main>
  );
}

export default App;
