// useSettings — React binding for the settings module.
//
// Loads settings on mount, writes on every change, and propagates the
// `reduceMotion` toggle to a document-level data attribute so CSS can
// pick it up alongside the `prefers-reduced-motion` media query (mirror
// rules live at the bottom of GameScreen.css).

import { useCallback, useEffect, useState } from 'react';
import {
  detectSafari,
  loadSettings,
  readOsReduceMotion,
  saveSettings,
  type Settings,
} from '../settings/index.ts';
import {
  setSoundEnabled,
  setMusicVolume as setSfxMusicVolume,
  setSfxVolume as setSfxSfxVolume,
  setMusicInBackground as setSfxMusicInBackground,
} from './sfx.ts';

export interface UseSettingsResult {
  settings: Settings;
  setReduceTimePressure: (v: boolean) => void;
  setReduceMotion: (v: boolean) => void;
  setSound: (v: boolean) => void;
  toggleSound: () => void;
  setMusicVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  setShowVerbFloats: (v: boolean) => void;
  setMusicInBackground: (v: boolean) => void;
}

export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<Settings>(() =>
    loadSettings(readOsReduceMotion(), detectSafari()),
  );

  // Push reduceMotion to <html data-reduce-motion="…"> so CSS can mirror
  // the prefers-reduced-motion media query.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    if (settings.reduceMotion) {
      html.setAttribute('data-reduce-motion', 'true');
    } else {
      html.removeAttribute('data-reduce-motion');
    }
  }, [settings.reduceMotion]);

  // Persist on every change and sync audio state.
  useEffect(() => {
    saveSettings(settings);
    setSoundEnabled(settings.sound);
    setSfxMusicVolume(settings.musicVolume);
    setSfxSfxVolume(settings.sfxVolume);
    setSfxMusicInBackground(settings.musicInBackground);
  }, [settings]);

  const setReduceTimePressure = useCallback(
    (v: boolean) =>
      setSettings((s) => ({ ...s, reduceTimePressure: v })),
    [],
  );
  const setReduceMotion = useCallback(
    (v: boolean) => setSettings((s) => ({ ...s, reduceMotion: v })),
    [],
  );
  const setSound = useCallback(
    (v: boolean) => setSettings((s) => ({ ...s, sound: v })),
    [],
  );
  const toggleSound = useCallback(
    () => setSettings((s) => ({ ...s, sound: !s.sound })),
    [],
  );
  const setMusicVolume = useCallback(
    (v: number) => setSettings((s) => ({ ...s, musicVolume: v })),
    [],
  );
  const setSfxVolume = useCallback(
    (v: number) => setSettings((s) => ({ ...s, sfxVolume: v })),
    [],
  );
  const setShowVerbFloats = useCallback(
    (v: boolean) => setSettings((s) => ({ ...s, showVerbFloats: v })),
    [],
  );
  const setMusicInBackground = useCallback(
    (v: boolean) => setSettings((s) => ({ ...s, musicInBackground: v })),
    [],
  );

  return {
    settings,
    setReduceTimePressure,
    setReduceMotion,
    setSound,
    toggleSound,
    setMusicVolume,
    setSfxVolume,
    setShowVerbFloats,
    setMusicInBackground,
  };
}
