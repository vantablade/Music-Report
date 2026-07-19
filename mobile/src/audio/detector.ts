/**
 * Frame -> pitch detector. Wraps pitchfinder's YIN with a noise gate and a plausible
 * instrument frequency range, so silence and out-of-range noise return null instead of
 * garbage notes.
 */
import { YIN } from "pitchfinder";

import { hzToPitch, type PitchReading } from "@/audio/pitch";
import { rms } from "@/audio/pcm";

export interface DetectorOptions {
  sampleRate: number;
  /** Frames below this RMS are treated as silence. */
  noiseGate?: number;
  /** Accepted frequency range (Hz). Defaults roughly C2–C7. */
  minHz?: number;
  maxHz?: number;
}

export function createPitchDetector(opts: DetectorOptions) {
  const detect = YIN({ sampleRate: opts.sampleRate });
  const noiseGate = opts.noiseGate ?? 0.01;
  const minHz = opts.minHz ?? 65;
  const maxHz = opts.maxHz ?? 2100;

  return function detectPitch(frame: Float32Array): PitchReading | null {
    if (rms(frame) < noiseGate) return null;
    const hz = detect(frame);
    if (hz == null || hz < minHz || hz > maxHz) return null;
    return hzToPitch(hz);
  };
}
