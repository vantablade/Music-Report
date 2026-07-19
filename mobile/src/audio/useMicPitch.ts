/**
 * Live microphone → pitch hook. Streams raw PCM frames (react-native-live-audio-stream),
 * runs each frame through the YIN detector + stabilizer, and reports readings.
 *
 * Device-only: requires a native build (Dev Client), not Expo Go. The pure pieces it composes
 * (detector, stabilizer, pcm, pitch) are unit-tested; this hook is the wiring.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import LiveAudioStream from "react-native-live-audio-stream";

import { createPitchDetector } from "@/audio/detector";
import { pcm16Base64ToFloat32 } from "@/audio/pcm";
import type { PitchReading } from "@/audio/pitch";
import { PitchStabilizer } from "@/audio/stabilizer";

const SAMPLE_RATE = 44100;

export interface MicReading extends PitchReading {
  /** The stabilized MIDI note (null until several frames agree). */
  stableMidi: number | null;
}

async function ensureMicPermission(): Promise<boolean> {
  if (Platform.OS === "android") {
    const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
      title: "Microphone access",
      message: "Sheet Music Trainer listens while you play to give feedback.",
      buttonPositive: "OK",
    });
    return res === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true; // iOS prompts on first stream via NSMicrophoneUsageDescription.
}

export function useMicPitch(onReading?: (r: MicReading | null) => void) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectorRef = useRef(createPitchDetector({ sampleRate: SAMPLE_RATE }));
  const stabilizerRef = useRef(new PitchStabilizer(3));
  const cbRef = useRef(onReading);
  cbRef.current = onReading;

  // Register the frame listener exactly once for the hook's lifetime (avoids duplicate
  // listeners accumulating across start/stop cycles). start()/stop() only toggle the stream.
  useEffect(() => {
    LiveAudioStream.init({
      sampleRate: SAMPLE_RATE,
      channels: 1,
      bitsPerSample: 16,
      audioSource: 6, // Android VOICE_RECOGNITION: clean, unprocessed capture.
      bufferSize: 4096, // 2048 samples/frame — enough for YIN at 44.1 kHz.
      wavFile: "smt.wav", // required by the lib's typings; we consume live frames, not the file.
    });
    const sub = LiveAudioStream.on("data", (base64: string) => {
      const frame = pcm16Base64ToFloat32(base64);
      const reading = detectorRef.current(frame);
      const stableMidi = stabilizerRef.current.push(reading?.midi ?? null);
      cbRef.current?.(reading ? { ...reading, stableMidi } : null);
    });
    return () => {
      try {
        LiveAudioStream.stop();
      } catch {
        /* not started */
      }
      // Remove the listener if this version returns a subscription handle.
      (sub as { remove?: () => void } | undefined)?.remove?.();
    };
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (!(await ensureMicPermission())) {
      setError("Microphone permission denied");
      return;
    }
    stabilizerRef.current.reset();
    LiveAudioStream.start();
    setActive(true);
  }, []);

  const stop = useCallback(() => {
    try {
      LiveAudioStream.stop();
    } catch {
      /* not started */
    }
    setActive(false);
  }, []);

  return { active, error, start, stop };
}
