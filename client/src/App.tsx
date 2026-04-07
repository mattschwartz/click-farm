// App root.
//
// Renders the core game screen (E10). The previous dense debug harness
// (E7) is preserved at `?debug` / `#debug` for engineering inspection —
// it's not part of the player-facing experience but helps verify the
// integrated game loop without the full UI between the engineer and the
// numbers.
//
// A start gate modal is shown on first load. If the player is new (no save),
// they see the cover image. If returning (save exists), they see a "welcome
// back" screen with offline earnings.

import { useState, useCallback } from 'react';
import { GameScreen } from './ui/GameScreen.tsx';
import { DebugApp } from './ui/DebugApp.tsx';
import { OfflineGainsModal } from './ui/OfflineGainsModal.tsx';
import type { OfflineResult } from './offline/index.ts';
import coverSrc from './assets/cover.png';

const SAVE_KEY = 'click_farm_save';

function hasSavedGame(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SAVE_KEY) !== null;
}

function isDebugRequested(): boolean {
  if (typeof window === 'undefined') return false;
  const { hash, search } = window.location;
  return hash.includes('debug') || search.includes('debug');
}

// ---------------------------------------------------------------------------
// New-game gate — cover image, tap anywhere to start
// ---------------------------------------------------------------------------

function NewGameGate({ onStart }: { onStart: () => void }) {
  const [popping, setPopping] = useState(false);

  const handleClick = useCallback(() => {
    if (popping) return;
    setPopping(true);
    setTimeout(onStart, 250);
  }, [popping, onStart]);

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.7)',
        transition: 'opacity 250ms ease-in',
        opacity: popping ? 0 : 1,
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
        animation: popping ? 'pop-shrink 250ms ease-in forwards' : undefined,
      }}>
        <img
          src={coverSrc}
          alt="Game cover"
          style={{
            maxWidth: '75vw',
            maxHeight: '75vh',
            borderRadius: '12px',
            objectFit: 'cover',
          }}
        />
      </div>
      {popping && (
        <style>{`
          @keyframes pop-shrink {
            0%   { transform: scale(1); }
            15%  { transform: scale(1.08); }
            100% { transform: scale(0); }
          }
        `}</style>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Welcome-back gate — shows offline earnings, tap to dismiss
// ---------------------------------------------------------------------------

function WelcomeBackGate({
  offlineResult,
  onStart,
}: {
  offlineResult: OfflineResult | null | 'none';
  onStart: () => void;
}) {
  // Waiting for GameScreen to provide the result — show dark overlay briefly.
  if (offlineResult === null) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        zIndex: 9999,
      }} />
    );
  }

  // Save exists but no meaningful offline gains — fall back to cover image.
  if (offlineResult === 'none') {
    return <NewGameGate onStart={onStart} />;
  }

  return (
    <OfflineGainsModal result={offlineResult} onDismiss={onStart} />
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

function App() {
  const [started, setStarted] = useState(isDebugRequested());
  const [isReturning] = useState(() => hasSavedGame());
  const [offlineResult, setOfflineResult] = useState<OfflineResult | null | 'none'>(null);

  if (isDebugRequested()) {
    return <DebugApp />;
  }

  const handleOfflineResult = (result: OfflineResult | null) => {
    // If returning player has no meaningful offline gains (null or <60s),
    // signal 'none' so the gate falls back to the cover image.
    if (result === null || result.durationMs <= 60_000) {
      setOfflineResult('none');
    } else {
      setOfflineResult(result);
    }
  };

  return (
    <>
      <GameScreen onOfflineResult={handleOfflineResult} />
      {!started && (
        isReturning
          ? <WelcomeBackGate offlineResult={offlineResult} onStart={() => setStarted(true)} />
          : <NewGameGate onStart={() => setStarted(true)} />
      )}
    </>
  );
}

export default App;
