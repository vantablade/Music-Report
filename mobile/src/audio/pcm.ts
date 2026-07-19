/**
 * PCM helpers. react-native-live-audio-stream emits base64-encoded 16-bit little-endian
 * mono PCM; we decode it to a normalized Float32 frame for the pitch detector.
 */
import { toByteArray } from "base64-js";

/** Decode base64 PCM16LE -> Float32Array in [-1, 1). */
export function pcm16Base64ToFloat32(base64: string): Float32Array {
  const bytes = toByteArray(base64);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const n = Math.floor(bytes.byteLength / 2);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = view.getInt16(i * 2, true) / 32768;
  }
  return out;
}

/** Root-mean-square amplitude of a frame — used as a simple noise gate / silence check. */
export function rms(frame: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
  return Math.sqrt(sum / frame.length);
}
