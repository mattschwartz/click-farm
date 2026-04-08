// Settings modal — utility surface per ux/settings-screen.md.
//
// Desktop/iPad: floating ~520×620px modal, 30% backdrop, vertical scroll.
// Mobile phones: full-screen with tab bar (Audio / Display / Data).
//
// Enable Motion propagates via the settings hook — this component is a
// pure editor over those values plus the save-management actions. The
// reduceTimePressure schema field is retained as dormant until a future
// feature wires it back in (remove-scandals-interim.md AC #13).

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { Settings } from '../settings/index.ts';
import {
  clearSave,
  exportSaveJSON,
  importSaveJSON,
} from '../save/index.ts';
import { SUPPORTED_LANGUAGES, changeLanguage } from '../i18n.ts';

import { formatExportFilename } from './formatExportFilename.ts';

// ---------------------------------------------------------------------------
// Tab type — mobile only
// ---------------------------------------------------------------------------

type SettingsTab = 'audio' | 'display' | 'data';

const TAB_KEYS: Record<SettingsTab, string> = {
  audio: 'settings.tabs.audio',
  display: 'settings.tabs.display',
  data: 'settings.tabs.data',
};

const TAB_ORDER: SettingsTab[] = ['audio', 'display', 'data'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  settings: Settings;
  onSetReduceMotion: (v: boolean) => void;
  onSetSound: (v: boolean) => void;
  onSetMusicVolume: (v: number) => void;
  onSetSfxVolume: (v: number) => void;
  onSetShowVerbFloats: (v: boolean) => void;
  onSetMusicInBackground: (v: boolean) => void;
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
  /** Whether the game loop is currently paused. */
  isPaused: boolean;
  /** Toggle the game loop pause state. */
  onTogglePause: () => void;
}

type InlineStatus = { kind: 'success' | 'error'; text: string } | null;

export function SettingsModal({
  settings,
  onSetReduceMotion,
  onSetSound,
  onSetMusicVolume,
  onSetSfxVolume,
  onSetShowVerbFloats,
  onSetMusicInBackground,
  rebrandCount,
  onClose,
  onResetRequested,
  onImportApplied,
  isPaused,
  onTogglePause,
}: Props) {
  const { t, i18n } = useTranslation('ui');
  const [resetStep, setResetStep] = useState<'idle' | 'confirm'>('idle');
  const [inlineStatus, setInlineStatus] = useState<InlineStatus>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('audio');
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
      flashStatus({ kind: 'error', text: t('settings.data.noSaveToExport') });
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
    flashStatus({ kind: 'success', text: t('settings.data.exported') });
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
          text: result.reason ?? t('settings.data.importFailed'),
        });
        return;
      }
      flashStatus({ kind: 'success', text: t('settings.data.imported') });
      onImportApplied();
    } catch (err) {
      flashStatus({
        kind: 'error',
        text: t('settings.data.importFailedDetail', { error: err instanceof Error ? err.message : String(err) }),
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

  // -------------------------------------------------------------------------
  // Section renderers — shared between desktop (all visible) and mobile (tab)
  // -------------------------------------------------------------------------

  const audioSection = (
    <section className="settings-section" data-tab="audio">
      <h2 className="settings-section-title">{t('settings.audio.sectionTitle')}</h2>
      <div className="settings-group">
        <SettingsToggle
          label={t('settings.audio.sound')}
          checked={settings.sound}
          onChange={onSetSound}
        />
        {settings.sound && (
          <>
            <SettingsToggle
              label={t('settings.audio.musicInBackground')}
              description={t('settings.audio.musicInBackgroundDesc')}
              checked={settings.musicInBackground}
              onChange={onSetMusicInBackground}
            />
            <SettingsSlider
              label={t('settings.audio.music')}
              value={settings.musicVolume}
              onChange={onSetMusicVolume}
            />
            <SettingsSlider
              label={t('settings.audio.sfx')}
              value={settings.sfxVolume}
              onChange={onSetSfxVolume}
            />
          </>
        )}
        <div className="settings-audio-credit">
          {t('settings.audio.musicCredit')}{' '}
          <a
            href="https://pixabay.com/users/djartmusic-46653586/"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('settings.audio.musicCreditAuthor')}
          </a>
        </div>
      </div>
    </section>
  );

  const controlsSection = (
    <section className="settings-section settings-section-desktop-only">
      <h2 className="settings-section-title">{t('settings.controls.sectionTitle')}</h2>
      <div className="settings-group">
        <div className="settings-controls-list">
          <div className="settings-control-row">
            <span className="settings-control-key">Esc</span>
            <span className="settings-control-desc">{t('settings.controls.escDesc')}</span>
          </div>
          <div className="settings-control-row">
            <span className="settings-control-key">B</span>
            <span className="settings-control-desc">{t('settings.controls.bDesc')}</span>
          </div>
        </div>
      </div>
    </section>
  );

  const displaySection = (
    <section className="settings-section" data-tab="display">
      <h2 className="settings-section-title">{t('settings.display.sectionTitle')}</h2>
      <div className="settings-group">
        <SettingsToggle
          buttonRef={firstToggleRef}
          label={t('settings.display.enableMotion')}
          description={t('settings.display.enableMotionDesc')}
          checked={!settings.reduceMotion}
          onChange={(v) => onSetReduceMotion(!v)}
        />
        <SettingsToggle
          label={t('settings.display.floatingNumbers')}
          description={t('settings.display.floatingNumbersDesc')}
          checked={settings.showVerbFloats}
          onChange={onSetShowVerbFloats}
        />
      </div>
    </section>
  );

  const donateSection = (
    <section className="settings-section settings-donate-section settings-section-desktop-only">
      <a
        href="https://support.savethechildren.org/site/Donation2?df_id=1620&mfc_pref=T&1620.donation=form1"
        target="_blank"
        rel="noopener noreferrer"
        className="settings-donate-btn"
      >
        {t('settings.donate')}
      </a>
    </section>
  );

  const dataSection = (
    <section className="settings-section" data-tab="data">
      <h2 className="settings-section-title">{t('settings.data.sectionTitle')}</h2>
      <div className="settings-group settings-save-group">
        <p className="settings-save-desc">{t('settings.data.autoSaveDesc')}</p>
        <button
          type="button"
          className="settings-btn"
          onClick={handleExport}
        >
          {t('settings.data.exportSave')}
        </button>
        <button
          type="button"
          className="settings-btn"
          onClick={handleImportClick}
        >
          {t('settings.data.importSave')}
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
            {t('settings.data.resetGame')}
          </button>
        ) : (
          <div className="settings-reset-confirm" role="alertdialog">
            <p className="settings-reset-title">{t('settings.data.resetConfirmTitle')}</p>
            <p className="settings-reset-body">
              {t('settings.data.resetConfirmBody')}
            </p>
            <div className="settings-reset-actions">
              <button
                type="button"
                className="settings-btn"
                onClick={handleResetCancel}
              >
                {t('settings.data.cancel')}
              </button>
              <button
                type="button"
                className="settings-btn settings-btn-danger"
                onClick={handleResetConfirm}
              >
                {t('settings.data.yesReset')}
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
  );

  const pauseSection = (
    <section className="settings-section settings-pause-section">
      <button
        type="button"
        className={`settings-pause-btn${isPaused ? ' settings-pause-btn-active' : ''}`}
        onClick={onTogglePause}
      >
        {isPaused ? `▶  ${t('settings.pause.resume')}` : `⏸  ${t('settings.pause.pause')}`}
      </button>
    </section>
  );

  const languageSection = (
    <section className="settings-section" data-tab="display">
      <h2 className="settings-section-title">{t('settings.language.sectionTitle')}</h2>
      <div className="settings-group">
        <div className="settings-toggle-row">
          <div className="settings-toggle-text">
            <div className="settings-toggle-label"><span className="settings-lang-icon" aria-hidden="true">&#x1F310;</span>{t('settings.language.label')}</div>
          </div>
          <select
            className="settings-lang-select"
            value={i18n.language}
            onChange={(e) => changeLanguage(e.target.value)}
          >
            {Object.entries(SUPPORTED_LANGUAGES).map(([code, label]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );

  // Map tabs to their content for mobile view
  const tabContent: Record<SettingsTab, React.ReactNode> = {
    audio: audioSection,
    display: displaySection,
    data: (
      <>
        {dataSection}
        {pauseSection}
      </>
    ),
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
        aria-label={t('settings.title')}
      >
        <div className="settings-header">
          <span className="settings-title">{t('settings.title')}</span>
          <button
            ref={closeBtnRef}
            className="settings-close-btn"
            onClick={onClose}
            aria-label={t('settings.closeAria')}
          >
            ×
          </button>
        </div>

        {/* Tab bar — visible on mobile only via CSS */}
        <nav className="settings-tab-bar" role="tablist">
          {TAB_ORDER.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              id={`settings-tab-${tab}`}
              aria-selected={activeTab === tab}
              aria-controls="settings-tabpanel"
              className={`settings-tab${activeTab === tab ? ' settings-tab-active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {t(TAB_KEYS[tab])}
            </button>
          ))}
        </nav>

        {/* Mobile body — shows active tab content only */}
        <div
          id="settings-tabpanel"
          className="settings-body settings-body-tabbed"
          role="tabpanel"
          aria-labelledby={`settings-tab-${activeTab}`}
        >
          {languageSection}
          {tabContent[activeTab]}
        </div>

        {/* Desktop body — shows all sections in vertical scroll */}
        <div className="settings-body settings-body-scroll">
          {languageSection}
          {audioSection}
          {controlsSection}
          {displaySection}
          {donateSection}
          {dataSection}
          {pauseSection}
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
