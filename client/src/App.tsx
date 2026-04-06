// App root.
//
// Renders the core game screen (E10). The previous dense debug harness
// (E7) is preserved at `?debug` / `#debug` for engineering inspection —
// it's not part of the player-facing experience but helps verify the
// integrated game loop without the full UI between the engineer and the
// numbers.
//
// A start gate modal is shown on first load. The "Play" button is the
// user gesture that unlocks audio (Chrome autoplay policy).

import { useState } from 'react';
import { GameScreen } from './ui/GameScreen.tsx';
import { DebugApp } from './ui/DebugApp.tsx';
import coverSrc from './assets/cover.png';

function isDebugRequested(): boolean {
  if (typeof window === 'undefined') return false;
  const { hash, search } = window.location;
  return hash.includes('debug') || search.includes('debug');
}

function StartGate({ onStart }: { onStart: () => void }) {
  return (
    <div
      onClick={onStart}
      style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.7)',
        zIndex: 9999,
        cursor: 'pointer',
      }}
    >
      <div style={{
        background: 'rgba(180, 200, 220, 0.12)',
        backdropFilter: 'blur(20px) saturate(1.4) brightness(1.15)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.4) brightness(1.15)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '20px',
        padding: '6px',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        pointerEvents: 'none',
      }}>
        <img
          src={coverSrc}
          alt="Click Farm"
          style={{
            width: '75vw',
            borderRadius: '12px',
            objectFit: 'cover',
          }}
        />
      </div>
    </div>
  );
}

function App() {
  const [started, setStarted] = useState(isDebugRequested());

  if (isDebugRequested()) {
    return <DebugApp />;
  }

  return (
    <>
      <GameScreen />
      {!started && <StartGate onStart={() => setStarted(true)} />}
    </>
  );
}

export default App;
