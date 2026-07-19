/**
 * Practice session orchestration: a count-in, then a fixed-tempo clock advances the cursor
 * through the score while the mic feeds pitch readings. Each note gets a verdict when its time
 * window ends; a summary is produced at the finish.
 *
 * Composes the tested pure pieces (FixedTempoFollower, compareNote, summarize) with the
 * device mic hook. The RAF clock + refs keep per-frame work off React state.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { useMicPitch, type MicReading } from "@/audio/useMicPitch";
import type { ScoreTimeline } from "@/music/parseMusicXML";
import {
  compareNote,
  type NoteComparison,
  verdictColorStatus,
} from "@/practice/comparison";
import { FixedTempoFollower, summarize, type SessionSummary } from "@/practice/scoreFollower";

export type PracticePhase = "idle" | "countin" | "running" | "done";
export type CursorStatus = "correct" | "wrong" | "near" | null;

const COUNT_IN_SEC = 3;

export function usePracticeSession(timeline: ScoreTimeline | null, rate = 1) {
  const [phase, setPhase] = useState<PracticePhase>("idle");
  const [countdown, setCountdown] = useState(COUNT_IN_SEC);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [live, setLive] = useState<MicReading | null>(null);
  const [status, setStatus] = useState<CursorStatus>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  const followerRef = useRef<FixedTempoFollower | null>(null);
  const startAtRef = useRef(0);
  const lastIndexRef = useRef(0);
  const candidateRef = useRef<{ midi: number; cents: number } | null>(null);
  const verdictsRef = useRef<NoteComparison[]>([]);
  const rafRef = useRef<number | null>(null);

  // Mic readings: keep the latest stable pitch as the candidate for the current note, and
  // surface a live cursor tint so the player sees instant in-tune/out feedback.
  const mic = useMicPitch(
    useCallback(
      (r: MicReading | null) => {
        setLive(r);
        if (r?.stableMidi != null) {
          candidateRef.current = { midi: r.stableMidi, cents: r.cents };
          const expected = timeline?.notes[lastIndexRef.current]?.midi ?? null;
          setStatus(verdictColorStatus(compareNote(expected, r.stableMidi, r.cents).verdict));
        } else {
          setStatus(null);
        }
      },
      [timeline],
    ),
  );

  const finalize = useCallback(
    (index: number, useCandidate: boolean) => {
      if (!timeline) return;
      const expected = timeline.notes[index]?.midi ?? null;
      const cand = useCandidate ? candidateRef.current : null;
      verdictsRef.current[index] = compareNote(expected, cand?.midi ?? null, cand?.cents ?? 0);
    },
    [timeline],
  );

  const finish = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    mic.stop();
    setSummary(summarize(verdictsRef.current));
    setStatus(null);
    setPhase("done");
  }, [mic]);

  const tick = useCallback(() => {
    const follower = followerRef.current;
    if (!follower) return;
    const elapsed = (Date.now() - startAtRef.current) / 1000;
    const idx = follower.indexAt(elapsed);

    if (idx !== lastIndexRef.current) {
      // Finalize the note we were on (with its candidate), then any skipped notes as missed.
      finalize(lastIndexRef.current, true);
      for (let j = lastIndexRef.current + 1; j < idx; j++) finalize(j, false);
      candidateRef.current = null;
      lastIndexRef.current = idx;
      setCurrentIndex(Math.min(idx, follower.count - 1));
    }

    if (idx >= follower.count) {
      finish();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [finalize, finish]);

  const beginRun = useCallback(() => {
    if (!timeline) return;
    followerRef.current = new FixedTempoFollower(timeline.notes, rate);
    verdictsRef.current = [];
    candidateRef.current = null;
    lastIndexRef.current = 0;
    setCurrentIndex(0);
    startAtRef.current = Date.now();
    setPhase("running");
    void mic.start();
    rafRef.current = requestAnimationFrame(tick);
  }, [timeline, rate, mic, tick]);

  const start = useCallback(() => {
    if (!timeline || phase === "running" || phase === "countin") return;
    setSummary(null);
    setPhase("countin");
    setCountdown(COUNT_IN_SEC);
  }, [timeline, phase]);

  // Count-in ticker.
  useEffect(() => {
    if (phase !== "countin") return;
    if (countdown <= 0) {
      beginRun();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown, beginRun]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    mic.stop();
    setPhase("idle");
    setStatus(null);
  }, [mic]);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  return {
    phase,
    countdown,
    currentIndex,
    live,
    status,
    summary,
    error: mic.error,
    start,
    stop,
  };
}
