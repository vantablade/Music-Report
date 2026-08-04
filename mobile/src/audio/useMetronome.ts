/**
 * Metronome / count-in engine (audio output via expo-av).
 *
 * Serves two callers:
 *  - runCountIn(bpm, beats): play a one-bar count-in, resolve when it finishes (the record
 *    screen then starts the mic — so the clicks are never recorded).
 *  - startLoop/stopLoop: a free-running metronome (the standalone practice tool).
 *
 * Beat 1 is accented. The loop self-corrects against wall-clock time to avoid setTimeout drift.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Audio } from "expo-av";

import { getClickUris } from "@/audio/clicks";

export function useMetronome() {
  const accent = useRef<Audio.Sound | null>(null);
  const normal = useRef<Audio.Sound | null>(null);
  const loopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyRef = useRef(false);

  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { accent: a, normal: n } = await getClickUris();
        const [ra, rn] = await Promise.all([
          Audio.Sound.createAsync({ uri: a }),
          Audio.Sound.createAsync({ uri: n }),
        ]);
        if (!mounted) {
          ra.sound.unloadAsync();
          rn.sound.unloadAsync();
          return;
        }
        accent.current = ra.sound;
        normal.current = rn.sound;
        readyRef.current = true;
      } catch {
        /* audio unavailable — count-in becomes silent, which is harmless */
      }
    })();
    return () => {
      mounted = false;
      if (loopTimer.current) clearTimeout(loopTimer.current);
      accent.current?.unloadAsync();
      normal.current?.unloadAsync();
    };
  }, []);

  const play = useCallback(async (isAccent: boolean) => {
    try {
      await (isAccent ? accent.current : normal.current)?.replayAsync();
    } catch {
      /* ignore playback hiccups */
    }
  }, []);

  const runCountIn = useCallback(
    (bpm: number, beats: number): Promise<void> => {
      const interval = 60000 / Math.max(1, bpm);
      return new Promise((resolve) => {
        let i = 0;
        const tick = () => {
          play(i % beats === 0);
          setBeat((i % beats) + 1);
          i += 1;
          if (i >= beats) {
            setTimeout(() => {
              setBeat(0);
              resolve();
            }, interval);
            return;
          }
          setTimeout(tick, interval);
        };
        tick();
      });
    },
    [play],
  );

  const startLoop = useCallback(
    (bpm: number, beatsPerBar: number) => {
      if (loopTimer.current) clearTimeout(loopTimer.current);
      const interval = 60000 / Math.max(1, bpm);
      const start = Date.now();
      let i = 0;
      setRunning(true);
      const tick = () => {
        play(i % beatsPerBar === 0);
        setBeat((i % beatsPerBar) + 1);
        i += 1;
        const next = start + i * interval;
        loopTimer.current = setTimeout(tick, Math.max(0, next - Date.now()));
      };
      tick();
    },
    [play],
  );

  const stopLoop = useCallback(() => {
    if (loopTimer.current) {
      clearTimeout(loopTimer.current);
      loopTimer.current = null;
    }
    setRunning(false);
    setBeat(0);
  }, []);

  return { running, beat, runCountIn, startLoop, stopLoop };
}
