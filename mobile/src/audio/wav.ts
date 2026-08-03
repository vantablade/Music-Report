/**
 * Assemble a mono 16-bit PCM WAV (base64) from the base64 PCM16LE chunks that
 * react-native-live-audio-stream emits. We record WAV (not m4a) so the backend can decode it
 * with libsndfile — no ffmpeg needed. Pure and testable: no native calls.
 */
import { fromByteArray, toByteArray } from "base64-js";

export function pcm16ChunksToWavBase64(chunks: string[], sampleRate: number): string {
  const parts = chunks.map(toByteArray);
  const dataLen = parts.reduce((sum, p) => sum + p.length, 0);
  const pcm = new Uint8Array(dataLen);
  let offset = 0;
  for (const p of parts) {
    pcm.set(p, offset);
    offset += p.length;
  }
  return wrapWav(pcm, sampleRate);
}

function wrapWav(pcm: Uint8Array, sampleRate: number): string {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;

  const out = new Uint8Array(44 + pcm.length);
  const dv = new DataView(out.buffer);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  dv.setUint32(4, 36 + pcm.length, true); // file size - 8
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  dv.setUint32(16, 16, true); // fmt chunk size
  dv.setUint16(20, 1, true); // PCM
  dv.setUint16(22, numChannels, true);
  dv.setUint32(24, sampleRate, true);
  dv.setUint32(28, byteRate, true);
  dv.setUint16(32, blockAlign, true);
  dv.setUint16(34, bitsPerSample, true);
  writeStr(36, "data");
  dv.setUint32(40, pcm.length, true);
  out.set(pcm, 44);

  return fromByteArray(out);
}
