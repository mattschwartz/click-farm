// Settings modal — utility surface per ux/settings-screen.md.
//
// Surface grammar matches CloutShopModal (~520×620px, 30% backdrop, game
// continues running). Three sections (Motion, Audio, Save) rendered as a
// vertical scroll with no tabs.
//
// Reduce Motion propagates via the settings hook — this component is a
// pure editor over those values plus the save-management actions. The
// reduceTimePressure schema field is retained as dormant until a future
// feature wires it back in (remove-scandals-interim.md AC #13).

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Settings } from '../settings/index.ts';
import {
  clearSave,
  exportSaveJSON,
  importSaveJSON,
} from '../save/index.ts';


// ---------------------------------------------------------------------------
// Pure helpers (unit-tested via SettingsModal.test.ts)
// ---------------------------------------------------------------------------

/**
 * Filename used for the Export Save download (§5.1). Intentionally
 * encodes rebrand count + timestamp so multiple exports sort naturally
 * and are self-describing.
 */
export function formatExportFilename(
  rebrandCount: number,
  nowMs: number,
): string {
  // ISO without milliseconds or colons so the filename is filesystem-safe.
  const iso = new Date(nowMs).toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `click-farm-save-${rebrandCount}-${iso}.json`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  settings: Settings;
  onSetReduceMotion: (v: boolean) => void;
  onSetSound: (v: boolean) => void;
  onSetMusicVolume: (v: number) => void;
  onSetSfxVolume: (v: number) => void;
  /** Current rebrand count — drives the export filename. */
  rebrandCount: number;
  onClose: () => void;
  /**
   * Called when the save has been cleared. Parent should perform a hard
   * reload so the driver reinitialises from a fresh initial state.
   */
  onResetRequested: () => void;
  /** Called when an import succeeds — parent should reload similarly. */
  onImportApplied: () => void;
}

type InlineStatus = { kind: 'success' | 'error'; text: string } | null;

export function SettingsModal({
  settings,
  onSetReduceMotion,
  onSetSound,
  onSetMusicVolume,
  onSetSfxVolume,
  rebrandCount,
  onClose,
  onResetRequested,
  onImportApplied,
}: Props) {
  const [resetStep, setResetStep] = useState<'idle' | 'confirm'>('idle');
  const [inlineStatus, setInlineStatus] = useState<InlineStatus>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const firstToggleRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Focus first toggle on open (per §6 focus trap rule).
  useEffect(() => {
    firstToggleRef.current?.focus();
  }, []);

  // Esc closes modal (§6).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const flashStatus = (s: InlineStatus) => {
    setInlineStatus(s);
    if (s !== null) {
      window.setTimeout(() => setInlineStatus(null), 2400);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleExport = () => {
    const json = exportSaveJSON();
    if (json === null) {
      flashStatus({ kind: 'error', text: 'No save to export yet.' });
      return;
    }
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = formatExportFilename(rebrandCount, Date.now());
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    flashStatus({ kind: 'success', text: 'Exported.' });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    // Always reset so the same file can be chosen again after a failure.
    if (e.target) e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const result = importSaveJSON(text);
      if (!result.ok) {
        flashStatus({
          kind: 'error',
          text: result.reason ?? 'Import failed.',
        });
        return;
      }
      flashStatus({ kind: 'success', text: 'Imported.' });
      onImportApplied();
    } catch (err) {
      flashStatus({
        kind: 'error',
        text: `Import failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  };

  const handleResetClick = () => {
    setResetStep('confirm');
  };

  const handleResetConfirm = () => {
    clearSave();
    // Settings are intentionally preserved across reset — players shouldn't
    // have to re-configure audio, reduce-motion, etc. after restarting.
    setResetStep('idle');
    onResetRequested();
  };

  const handleResetCancel = () => {
    setResetStep('idle');
  };

  const modal = (
    <div
      className="settings-overlay"
      onClick={handleBackdropClick}
      aria-hidden="false"
    >
      <div
        ref={modalRef}
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <div className="settings-header">
          <span className="settings-title">Settings</span>
          <button
            ref={closeBtnRef}
            className="settings-close-btn"
            onClick={onClose}
            aria-label="Close Settings"
          >
            ×
          </button>
        </div>

        <div className="settings-body">
          {/* MOTION */}
          <section className="settings-section">
            <h2 className="settings-section-title">MOTION</h2>
            <div className="settings-group">
              <SettingsToggle
                buttonRef={firstToggleRef}
                label="Reduce Motion"
                description="Replaces decorative motion with static alternatives. Number animations preserved."
                checked={settings.reduceMotion}
                onChange={onSetReduceMotion}
              />
            </div>
          </section>

          {/* AUDIO */}
          <section className="settings-section">
            <h2 className="settings-section-title">AUDIO</h2>
            <div className="settings-group">
              <SettingsToggle
                label="Sound"
                checked={settings.sound}
                onChange={onSetSound}
              />
              {settings.sound && (
                <>
                  <SettingsSlider
                    label="Music"
                    value={settings.musicVolume}
                    onChange={onSetMusicVolume}
                  />
                  <SettingsSlider
                    label="SFX"
                    value={settings.sfxVolume}
                    onChange={onSetSfxVolume}
                  />
                </>
              )}
            </div>
          </section>

          {/* SAVE */}
          <section className="settings-section">
            <h2 className="settings-section-title">SAVE</h2>
            <div className="settings-group settings-save-group">
              <button
                type="button"
                className="settings-btn"
                onClick={handleExport}
              >
                Export Save
              </button>
              <button
                type="button"
                className="settings-btn"
                onClick={handleImportClick}
              >
                Import Save
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportFile}
                style={{ display: 'none' }}
              />

              {resetStep === 'idle' ? (
                <button
                  type="button"
                  className="settings-btn settings-btn-danger"
                  onClick={handleResetClick}
                >
                  Reset Game
                </button>
              ) : (
                <div className="settings-reset-confirm" role="alertdialog">
                  <p className="settings-reset-title">Reset Game?</p>
                  <p className="settings-reset-body">
                    This erases your save. Clout, upgrades, rebrand count —
                    all of it.
                  </p>
                  <div className="settings-reset-actions">
                    <button
                      type="button"
                      className="settings-btn"
                      onClick={handleResetCancel}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="settings-btn settings-btn-danger"
                      onClick={handleResetConfirm}
                    >
                      Yes, reset
                    </button>
                  </div>
                </div>
              )}

              {inlineStatus !== null && (
                <p
                  className={`settings-status settings-status-${inlineStatus.kind}`}
                  aria-live="polite"
                >
                  {inlineStatus.text}
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

// ---------------------------------------------------------------------------
// Toggle subcomponent
// ---------------------------------------------------------------------------

interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
}

function SettingsToggle({
  label,
  description,
  checked,
  onChange,
  buttonRef,
}: ToggleProps) {
  return (
    <div className="settings-toggle-row">
      <div className="settings-toggle-text">
        <div className="settings-toggle-label">{label}</div>
        {description && (
          <div className="settings-toggle-desc">{description}</div>
        )}
      </div>
      <button
        ref={buttonRef}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`settings-toggle${checked ? ' settings-toggle-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="settings-toggle-thumb" aria-hidden />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slider subcomponent
// ---------------------------------------------------------------------------

interface SliderProps {
  label: string;
  value: number; // 0–100
  onChange: (v: number) => void;
}

function SettingsSlider({ label, value, onChange }: SliderProps) {
  return (
    <div className="settings-slider-row">
      <label className="settings-slider-label">{label}</label>
      <input
        type="range"
        className="settings-slider"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`${label} volume`}
      />
      <span className="settings-slider-value">{value}</span>
    </div>
  );
}
