// Sound effects — Web Audio API with pitch randomization.
// Gracefully degrades when AudioContext is unavailable (test environments).
//
// Design:
// 1. Raw audio data is pre-fetched on import (no AudioContext needed).
// 2. AudioContext is created on the first user gesture via a global listener.
// 3. Buffers are eagerly decoded as soon as the context exists.
// 4. play() uses a synchronous fast path when buffers are cached — no async
//    hops between the user gesture and source.start().
// 5. The global gesture listener also resumes suspended contexts (post-idle),
//    so the context is always running by the time play() fires.

import silentSfx from '../assets/silent.wav';
import clickSfx from '../assets/click.wav';
import purchaseSfx from '../assets/purchase.mp3';
import sweepStartSfx from '../assets/sweep-start.wav';
import sweepEndSfx from '../assets/sweep-end.wav';
import ost01 from '../assets/djart-ost/djartmusic-8-bit-console-from-my-childhood-301286.mp3';
import ost02 from '../assets/djart-ost/djartmusic-best-game-console-301284.mp3';
import ost03 from '../assets/djart-ost/djartmusic-fun-with-my-8-bit-game-301278.mp3';
import ost04 from '../assets/djart-ost/djartmusic-i-love-my-8-bit-game-console-301272.mp3';
import ost05 from '../assets/djart-ost/djartmusic-my-8-bit-hero-301280.mp3';
import ost06 from '../assets/djart-ost/djartmusic-so-happy-with-my-8-bit-game-301275.mp3';
import ost07 from '../assets/djart-ost/djartmusic-the-return-of-the-8-bit-era-301292.mp3';
import ost08 from '../assets/djart-ost/djartmusic-the-world-of-8-bit-games-301273.mp3';

const OST_TRACKS = [ost01, ost02, ost03, ost04, ost05, ost06, ost07, ost08];

// ---------------------------------------------------------------------------
// Raw data pre-fetch (no AudioContext required)
// ---------------------------------------------------------------------------

const rawCache = new Map<string, Promise<ArrayBuffer>>();

function prefetch(url: string): void {
  if (rawCache.has(url)) return;
  rawCache.set(
    url,
    fetch(url).then((r) => r.arrayBuffer()).catch(() => new ArrayBuffer(0)),
  );
}

prefetch(clickSfx);
prefetch(purchaseSfx);
prefetch(sweepStartSfx);
prefetch(sweepEndSfx);

// ---------------------------------------------------------------------------
// Lazy AudioContext + eager decode
// ---------------------------------------------------------------------------

let ctx: AudioContext | null = null;
const bufferCache = new Map<string, AudioBuffer>();

/**
 * Get or create the AudioContext. On creation, eagerly kicks off decode of
 * all pre-fetched buffers so they're ready before the first play() call.
 */
function getCtx(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  if (ctx && ctx.state === 'closed') {
    ctx = null;
    bufferCache.clear(); // buffers are tied to the context that decoded them
  }
  if (!ctx) {
    ctx = new AudioContext();
    // Eagerly decode all pre-fetched audio into the new context.
    for (const [url] of rawCache) {
      decodeBuffer(url, ctx);
    }
  }
  return ctx;
}

async function decodeBuffer(url: string, audioCtx: AudioContext): Promise<AudioBuffer | null> {
  if (bufferCache.has(url)) return bufferCache.get(url)!;
  const raw = rawCache.get(url);
  if (!raw) return null;
  try {
    const arr = await raw;
    if (arr.byteLength === 0) return null;
    // decodeAudioData consumes the ArrayBuffer — copy for re-decode safety.
    const buf = await audioCtx.decodeAudioData(arr.slice(0));
    bufferCache.set(url, buf);
    return buf;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Background music — HTML Audio element routed through a Web Audio GainNode.
// Streams (no decode needed), cycles through OST_TRACKS sequentially.
// When a track ends, the next one starts automatically.
//
// Volume is controlled via GainNode, NOT HTMLAudioElement.volume, because
// iOS Safari makes element.volume read-only on iPhone — the hardware buttons
// are the only native volume control. Routing through Web Audio's GainNode
// bypasses this restriction.
// ---------------------------------------------------------------------------

let bgMusic: HTMLAudioElement | null = null;
let bgMusicGain: GainNode | null = null;
let bgMusicConnected = false; // MediaElementSource can only be created once
let bgMusicStarted = false;
let currentTrackIndex = Math.floor(Math.random() * OST_TRACKS.length);

/**
 * Connect the bgMusic element to the AudioContext via a GainNode.
 * Must be called after both bgMusic and AudioContext exist.
 * createMediaElementSource can only be called once per element.
 */
function connectBgMusicToGain(): void {
  if (bgMusicConnected || !bgMusic) return;
  const audioCtx = getCtx();
  if (!audioCtx) return;
  try {
    const source = audioCtx.createMediaElementSource(bgMusic);
    bgMusicGain = audioCtx.createGain();
    bgMusicGain.gain.value = musicVol;
    source.connect(bgMusicGain).connect(audioCtx.destination);
    bgMusicConnected = true;
  } catch {
    // Fallback: if Web Audio routing fails, element.volume is the only option.
    // This won't help on iPhone but at least doesn't break playback.
  }
}

/** Start playing the track at currentTrackIndex. */
function playCurrentTrack(): void {
  if (!bgMusic) return;
  bgMusic.src = OST_TRACKS[currentTrackIndex];
  // Set element volume as fallback; the GainNode is the primary control.
  bgMusic.volume = musicVol;
  if (bgMusicGain) bgMusicGain.gain.value = musicVol;
  bgMusic.play().then(() => { bgMusicStarted = true; }).catch(() => {});
}

/** Create the audio element (if needed) and start playback if unmuted. */
function ensureBgMusic(): void {
  if (typeof window === 'undefined') return;
  if (!bgMusic) {
    bgMusic = new Audio();
    bgMusic.loop = false; // we handle cycling ourselves
    bgMusic.volume = musicVol;
    bgMusic.addEventListener('ended', () => {
      // Advance to the next track, wrapping around.
      currentTrackIndex = (currentTrackIndex + 1) % OST_TRACKS.length;
      playCurrentTrack();
    });
  }
  // Route through GainNode for iOS volume control.
  connectBgMusicToGain();
  if (!masterMuted && !bgMusicStarted) {
    playCurrentTrack();
  }
}

// ---------------------------------------------------------------------------
// Silent loop — keeps the audio context alive on iOS Safari. Plays a 1s
// silent WAV on repeat regardless of mute state. Started on first gesture.
// ---------------------------------------------------------------------------

let silentLoop: HTMLAudioElement | null = null;

function ensureSilentLoop(): void {
  if (typeof window === 'undefined') return;
  if (silentLoop) return;
  silentLoop = new Audio(silentSfx);
  silentLoop.loop = true;
  silentLoop.volume = 1;
  silentLoop.play().catch(() => {});
}

// ---------------------------------------------------------------------------
// Global gesture listener — create context + resume on ANY user interaction.
// This ensures the context is running before play() is called, avoiding the
// async gap between resume() and source.start() that drops the first sound.
// Also starts background music on first gesture.
// ---------------------------------------------------------------------------

if (typeof window !== 'undefined') {
  const onGesture = (): void => {
    const audioCtx = getCtx();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    ensureBgMusic();
    ensureSilentLoop();
  };
  for (const evt of ['click', 'touchstart', 'keydown']) {
    window.addEventListener(evt, onGesture, { capture: true, passive: true });
  }

  // Pause all audio when the tab is hidden (minimized, backgrounded, or
  // switched away in Safari). Resume when the tab becomes visible again.
  // If musicInBackground is enabled, music continues playing when hidden.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (!musicInBackground) bgMusic?.pause();
      silentLoop?.pause();
      ctx?.suspend();
    } else {
      ctx?.resume();
      silentLoop?.play().catch(() => {});
      if (!masterMuted && bgMusicStarted) {
        bgMusic?.play().catch(() => {});
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Playback
// ---------------------------------------------------------------------------

function startSource(
  audioCtx: AudioContext,
  buffer: AudioBuffer,
  volume: number,
  pitchRange: [number, number],
): void {
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value =
    pitchRange[0] + Math.random() * (pitchRange[1] - pitchRange[0]);
  const gain = audioCtx.createGain();
  gain.gain.value = volume;
  source.connect(gain).connect(audioCtx.destination);
  source.start();
}

function play(
  url: string,
  volume: number,
  pitchRange: [number, number],
): void {
  const audioCtx = getCtx();
  if (!audioCtx) return;

  // Belt-and-suspenders: resume here too in case play() is called from a
  // path the global listener didn't catch.
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  // FAST PATH: buffer already decoded — play synchronously in the same
  // microtask as the user gesture. This is critical for Chrome's autoplay
  // policy and for post-idle resume timing.
  const cached = bufferCache.get(url);
  if (cached) {
    startSource(audioCtx, cached, volume, pitchRange);
    return;
  }

  // SLOW PATH: buffer not yet decoded (only possible on the very first play
  // if the eager decode hasn't finished yet). Accept the async penalty.
  decodeBuffer(url, audioCtx).then((buffer) => {
    if (buffer) startSource(audioCtx, buffer, volume, pitchRange);
  }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Volume state — driven by settings via setSfxVolume / setMusicVolume.
// ---------------------------------------------------------------------------

let masterMuted = false;
let sfxVol = 0.5;   // 0–1
let musicVol = 0.3;  // 0–1
let musicInBackground = false;

/** Called by settings UI when master sound toggle changes. */
export function setSoundEnabled(enabled: boolean): void {
  masterMuted = !enabled;
  if (bgMusic) {
    if (masterMuted) {
      bgMusic.pause();
    } else {
      // Start or resume — covers both "was playing before" and "never started
      // because sound was off on load".
      bgMusic.play().then(() => { bgMusicStarted = true; }).catch(() => {});
    }
  }
}

/** Called by settings UI when music volume slider changes (0–100). */
export function setMusicVolume(v: number): void {
  musicVol = Math.max(0, Math.min(1, v / 100));
  // Primary: GainNode (works on iPhone). Fallback: element.volume (desktop).
  if (bgMusicGain) bgMusicGain.gain.value = musicVol;
  if (bgMusic) bgMusic.volume = musicVol;
}

/** Called by settings UI when SFX volume slider changes (0–100). */
export function setSfxVolume(v: number): void {
  sfxVol = Math.max(0, Math.min(1, v / 100));
}

/** Called by settings UI when music-in-background toggle changes. */
export function setMusicInBackground(v: boolean): void {
  musicInBackground = v;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Track controls — prev / play-pause / next for the music player UI.
// ---------------------------------------------------------------------------

/** Skip to the previous track (wraps around). */
export function prevTrack(): void {
  ensureBgMusic();
  currentTrackIndex = (currentTrackIndex - 1 + OST_TRACKS.length) % OST_TRACKS.length;
  playCurrentTrack();
}

/** Skip to the next track (wraps around). */
export function nextTrack(): void {
  ensureBgMusic();
  currentTrackIndex = (currentTrackIndex + 1) % OST_TRACKS.length;
  playCurrentTrack();
}

/** Toggle play/pause on the current track. Returns true if now playing. */
export function togglePlayPause(): boolean {
  ensureBgMusic();
  if (!bgMusic) return false;
  if (bgMusic.paused) {
    bgMusic.play().catch(() => {});
    return true;
  } else {
    bgMusic.pause();
    return false;
  }
}

/** Whether music is currently playing (not paused). */
export function isMusicPlaying(): boolean {
  return bgMusic !== null && !bgMusic.paused;
}

// ---------------------------------------------------------------------------
// SFX playback
// ---------------------------------------------------------------------------

/** Play the click sound with +-8% pitch randomization. */
export function playClick(): void {
  if (masterMuted) return;
  play(clickSfx, sfxVol * 0.6, [0.92, 1.08]);
}

/** Play the purchase sound with +-5% pitch randomization. */
export function playPurchase(): void {
  if (masterMuted) return;
  play(purchaseSfx, sfxVol * 0.8, [0.95, 1.05]);
}

/** Play the sweep-start sound (ascending chime). */
export function playSweepStart(): void {
  if (masterMuted) return;
  play(sweepStartSfx, sfxVol * 0.7, [0.98, 1.02]);
}

/** Play the sweep-end sound (resolving tone). */
export function playSweepEnd(): void {
  if (masterMuted) return;
  play(sweepEndSfx, sfxVol * 0.6, [0.98, 1.02]);
}
