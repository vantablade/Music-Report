/**
 * Records the microphone to a mono 16-bit WAV file and returns its uri. Buffers the raw PCM
 * frames from react-native-live-audio-stream, wraps them in a WAV header (see wav.ts), and
 * writes the file to the cache dir for upload to /analyze.
 *
 * Device-only (native module). We record WAV rather than m4a so the backend decodes it without
 * ffmpeg.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import LiveAudioStream from "react-native-live-audio-stream";

import { pcm16ChunksToWavBase64 } from "@/audio/wav";

const SAMPLE_RATE = 44100;

async function ensureMicPermission(): Promise<boolean> {
  if (Platform.OS === "android") {
    const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
      title: "Microphone access",
      message: "Record yourself playing so we can give feedback.",
      buttonPositive: "OK",
    });
    return res === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true; // iOS prompts on first stream via NSMicrophoneUsageDescription.
}

export function useRecorder() {
  const chunks = useRef<string[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Register the frame listener once; start()/stop() only toggle the stream.
  useEffect(() => {
    LiveAudioStream.init({
      sampleRate: SAMPLE_RATE,
      channels: 1,
      bitsPerSample: 16,
      audioSource: 6, // Android VOICE_RECOGNITION: clean, unprocessed capture.
      bufferSize: 8192,
      wavFile: "smt-rec.wav", // required by the lib's typings; we assemble the WAV ourselves.
    });
    const sub = LiveAudioStream.on("data", (base64: string) => {
      chunks.current.push(base64);
    });
    return () => {
      try {
        LiveAudioStream.stop();
      } catch {
        /* not started */
      }
      if (timer.current) clearInterval(timer.current);
      (sub as { remove?: () => void } | undefined)?.remove?.();
    };
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (!(await ensureMicPermission())) {
      setError("Microphone permission denied");
      return;
    }
    chunks.current = [];
    setSeconds(0);
    LiveAudioStream.start();
    setRecording(true);
    timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }, []);

  /** Stop and return the recorded WAV file uri (or null if nothing was captured). */
  const stop = useCallback(async (): Promise<string | null> => {
    try {
      LiveAudioStream.stop();
    } catch {
      /* not started */
    }
    setRecording(false);
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    if (chunks.current.length === 0) return null;

    const wavBase64 = pcm16ChunksToWavBase64(chunks.current, SAMPLE_RATE);
    const uri = `${FileSystem.cacheDirectory}performance-${Date.now()}.wav`;
    await FileSystem.writeAsStringAsync(uri, wavBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return uri;
  }, []);

  return { recording, seconds, error, start, stop };
}
