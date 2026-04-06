// useSettings — React binding for the settings module.
//
// Loads settings on mount, writes on every change, and propagates the
// `reduceMotion` toggle to a document-level data attribute so CSS can
// pick it up alongside the `prefers-reduced-motion` media query (mirror
// rules live at the bottom of GameScreen.css).

import { useCallback, useEffect, useState } from 'react';
import {
  loadSettings,
  readOsReduceMotion,
  saveSettings,
  type Settings,
} from '../settings/index.ts';
import {
  setSoundEnabled,
  setMusicVolume as setSfxMusicVolume,
  setSfxVolume as setSfxSfxVolume,
} from './sfx.ts';

export interface UseSettingsResult {
  settings: Settings;
  setReduceTimePressure: (v: boolean) => void;
  setReduceMotion: (v: boolean) => void;
  setSound: (v: boolean) => void;
  setMusicVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
}

export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<Settings>(() =>
    loadSettings(readOsReduceMotion()),
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
  const setMusicVolume = useCallback(
    (v: number) => setSettings((s) => ({ ...s, musicVolume: v })),
    [],
  );
  const setSfxVolume = useCallback(
    (v: number) => setSettings((s) => ({ ...s, sfxVolume: v })),
    [],
  );

  return {
    settings,
    setReduceTimePressure,
    setReduceMotion,
    setSound,
    setMusicVolume,
    setSfxVolume,
  };
}
