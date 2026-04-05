// App root.
//
// Renders the core game screen (E10). The previous dense debug harness
// (E7) is preserved at `?debug` / `#debug` for engineering inspection —
// it's not part of the player-facing experience but helps verify the
// integrated game loop without the full UI between the engineer and the
// numbers.

import { GameScreen } from './ui/GameScreen.tsx';
import { DebugApp } from './ui/DebugApp.tsx';

function isDebugRequested(): boolean {
  if (typeof window === 'undefined') return false;
  const { hash, search } = window.location;
  return hash.includes('debug') || search.includes('debug');
}

function App() {
  if (isDebugRequested()) {
    return <DebugApp />;
  }
  return <GameScreen />;
}

export default App;
