/**
 * Metronome/count-in click sounds. Synthesizes two short sine "pings" (an accented downbeat
 * and a normal beat) as WAV files in the cache dir, so we need no bundled audio asset. Reuses
 * the WAV assembler. Generated once and memoized.
 */
import { fromByteArray } from "base64-js";
import * as FileSystem from "expo-file-system";

import { pcm16ChunksToWavBase64 } from "@/audio/wav";

const SR = 44100;

/** A short decaying sine ping as base64 PCM16LE. */
function pingPcmBase64(freq: number, ms = 45): string {
  const n = Math.floor((SR * ms) / 1000);
  const bytes = new Uint8Array(n * 2);
  const dv = new DataView(bytes.buffer);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.exp(-t * 42); // fast decay -> a click, not a tone
    const s = Math.sin(2 * Math.PI * freq * t) * env * 0.6;
    dv.setInt16(i * 2, Math.max(-1, Math.min(1, s)) * 32767, true);
  }
  return fromByteArray(bytes);
}

async function writeClick(name: string, freq: number): Promise<string> {
  const uri = `${FileSystem.cacheDirectory}${name}`;
  const wav = pcm16ChunksToWavBase64([pingPcmBase64(freq)], SR);
  await FileSystem.writeAsStringAsync(uri, wav, { encoding: FileSystem.EncodingType.Base64 });
  return uri;
}

let cached: { accent: string; normal: string } | null = null;

export async function getClickUris(): Promise<{ accent: string; normal: string }> {
  if (cached) return cached;
  const [accent, normal] = await Promise.all([
    writeClick("click-accent.wav", 1650),
    writeClick("click-normal.wav", 1050),
  ]);
  cached = { accent, normal };
  return cached;
}
