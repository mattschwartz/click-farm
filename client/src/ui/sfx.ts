// Sound effects — Web Audio API with pitch randomization.
// Gracefully degrades when AudioContext is unavailable (test environments).

import clickSfx from '../assets/click.wav';
import purchaseSfx from '../assets/purchase.wav';

// ---------------------------------------------------------------------------
// Shared AudioContext + buffer loader
// ---------------------------------------------------------------------------

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

const bufferCache = new Map<string, AudioBuffer>();

async function loadBuffer(url: string): Promise<AudioBuffer | null> {
  if (bufferCache.has(url)) return bufferCache.get(url)!;
  const audioCtx = getCtx();
  if (!audioCtx) return null;
  try {
    const resp = await fetch(url);
    const arr = await resp.arrayBuffer();
    const buf = await audioCtx.decodeAudioData(arr);
    bufferCache.set(url, buf);
    return buf;
  } catch {
    return null;
  }
}

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
  buffer: AudioBuffer | null,
  volume: number,
  pitchRange: [number, number],
): void {
  if (!buffer) return;
  const audioCtx = getCtx();
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') {
    // First user gesture — wait for resume before playing so the sound
    // isn't silently dropped into a suspended context.
    audioCtx.resume().then(() => {
      startSource(audioCtx, buffer, volume, pitchRange);
    }).catch(() => {});
    return;
  }
  startSource(audioCtx, buffer, volume, pitchRange);
}

// ---------------------------------------------------------------------------
// Preload on import
// ---------------------------------------------------------------------------

let clickBuffer: AudioBuffer | null = null;
let purchaseBuffer: AudioBuffer | null = null;

loadBuffer(clickSfx).then((b) => { clickBuffer = b; });
loadBuffer(purchaseSfx).then((b) => { purchaseBuffer = b; });

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Play the click sound with +-8% pitch randomization. */
export function playClick(): void {
  play(clickBuffer, 0.3, [0.92, 1.08]);
}

/** Play the purchase sound with +-5% pitch randomization. */
export function playPurchase(): void {
  play(purchaseBuffer, 0.4, [0.95, 1.05]);
}
