// Clout Shop — Modal shell (task #62)
//
// UX spec: ux/prestige-rebrand-screen.md §3.1–3.2
//
// This task ships the modal shell only:
//   - Header: "Rebrand Upgrades" + × close affordance
//   - Clout balance display
//   - Placeholder body ("Upgrades coming soon")
//   - Backdrop: dims main screen to ~30% opacity
//   - Game loop continues ticking while shop is open (not paused — §3.1)
//
// The real upgrade list and purchase flow land in task #64 (Clout Shop modal).

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { GameState } from '../types.ts';

// ---------------------------------------------------------------------------
// Pure helpers — exported for testing
// ---------------------------------------------------------------------------

/** Formatted Clout balance label for the shop header. */
export function formatCloutBalance(clout: number): string {
  return `Clout: ${clout}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface CloutShopModalProps {
  state: GameState;
  onClose: () => void;
}

export function CloutShopModal({ state, onClose }: CloutShopModalProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Focus the × close button on open.
  useEffect(() => {
    closeBtnRef.current?.focus();
  }, []);

  // Escape closes.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Focus trap within the modal (single × button for now — Tab wraps back).
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    // Only one focusable element in the shell — Tab wraps on itself.
    closeBtnRef.current?.focus();
  }

  const modal = (
    <>
      {/* Backdrop — ~30% opacity per spec §3.1; game loop keeps ticking. */}
      <div
        ref={overlayRef}
        className="shop-overlay"
        onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
        aria-hidden="false"
      >
        <div
          className="shop-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Rebrand Upgrades"
          onKeyDown={handleKeyDown}
        >
          {/* Header */}
          <div className="shop-header">
            <span className="shop-title">Rebrand Upgrades</span>
            <button
              ref={closeBtnRef}
              className="shop-close-btn"
              onClick={onClose}
              aria-label="Close Rebrand Upgrades"
            >
              ×
            </button>
          </div>

          {/* Clout balance — P0 contrast per spec §3.2. */}
          <div className="shop-balance">
            {formatCloutBalance(state.player.clout)}
          </div>

          {/* Body placeholder — full upgrade list lands in task #64. */}
          <div className="shop-body-placeholder">
            {state.player.clout === 0 && state.player.rebrand_count === 0
              ? 'Earn Clout by rebranding. Your first rebrand is ahead.'
              : 'Upgrades coming soon.'}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}
