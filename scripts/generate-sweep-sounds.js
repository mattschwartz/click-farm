#!/usr/bin/env node
/**
 * Generate sweep-start and sweep-end audio files as WAV.
 *
 * sweep-start: ascending chime (200–800 Hz over 200ms, bright & quick)
 * sweep-end: resolving tone (400–200 Hz over 300ms, warm descent)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(__dirname, '../client/src/assets');

// WAV header helpers
function writeWavHeader(samples, sampleRate) {
  const numChannels = 1;
  const bytesPerSample = 2;
  const byteRate = sampleRate * numChannels * bytesPerSample;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = samples.length * bytesPerSample;
  const fileSize = 36 + dataSize;

  const buffer = Buffer.alloc(44);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(fileSize, 4);
  buffer.write('WAVE', 8);

  // fmt sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);           // fmt chunk size
  buffer.writeUInt16LE(1, 20);             // PCM format
  buffer.writeUInt16LE(numChannels, 22);   // channels
  buffer.writeUInt32LE(sampleRate, 24);    // sample rate
  buffer.writeUInt32LE(byteRate, 28);      // byte rate
  buffer.writeUInt16LE(blockAlign, 32);    // block align
  buffer.writeUInt16LE(16, 34);            // bits per sample

  // data sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

function generateSweep(startFreq, endFreq, durationMs, sampleRate = 44100) {
  const numSamples = Math.floor((durationMs / 1000) * sampleRate);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / numSamples;
    // Linear frequency interpolation
    const freq = startFreq + (endFreq - startFreq) * t;
    const phase = 2 * Math.PI * freq * (i / sampleRate);

    // Envelope: fade in 10ms, sustain, fade out 30ms
    let envelope = 1;
    const fadeInSamples = Math.floor(0.01 * sampleRate);
    const fadeOutStart = numSamples - Math.floor(0.03 * sampleRate);

    if (i < fadeInSamples) {
      envelope = i / fadeInSamples;
    } else if (i >= fadeOutStart) {
      envelope = (numSamples - i) / (numSamples - fadeOutStart);
    }

    samples[i] = Math.sin(phase) * envelope * 0.6;
  }

  return samples;
}

function floatSamplesToInt16(floatSamples) {
  const buffer = Buffer.alloc(floatSamples.length * 2);

  for (let i = 0; i < floatSamples.length; i++) {
    const s = Math.max(-1, Math.min(1, floatSamples[i]));
    buffer.writeInt16LE(s < 0 ? s * 0x8000 : s * 0x7FFF, i * 2);
  }

  return buffer;
}

function generateWav(startFreq, endFreq, durationMs) {
  const sampleRate = 44100;
  const floatSamples = generateSweep(startFreq, endFreq, durationMs, sampleRate);
  const int16Samples = floatSamplesToInt16(floatSamples);
  const header = writeWavHeader(floatSamples, sampleRate);
  return Buffer.concat([header, int16Samples]);
}

// Generate both sounds
const sweepStart = generateWav(200, 800, 200);  // ascending chime
const sweepEnd = generateWav(400, 200, 300);    // resolving descent

const startPath = path.join(assetsDir, 'sweep-start.wav');
const endPath = path.join(assetsDir, 'sweep-end.wav');

fs.writeFileSync(startPath, sweepStart);
fs.writeFileSync(endPath, sweepEnd);

console.log(`✓ Generated ${startPath}`);
console.log(`✓ Generated ${endPath}`);
