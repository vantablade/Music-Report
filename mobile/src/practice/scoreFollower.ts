/**
 * Fixed-tempo score follower (the MVP score-following strategy from the plan).
 *
 * The user taps start; a wall clock advances the cursor through the timeline at a chosen
 * rate. This deliberately assumes the player keeps tempo — it's simple and robust. Free-tempo
 * online alignment (DTW/HMM) is the documented Phase 3+ upgrade.
 *
 * Pure/testable: no timers or audio here, just time -> position math and verdict tallying.
 */
import type { NoteEvent } from "@/music/parseMusicXML";
import type { NoteVerdict } from "@/practice/comparison";

export class FixedTempoFollower {
  /** @param rate playback speed multiplier (0.5 = half speed practice). */
  constructor(
    private readonly notes: NoteEvent[],
    private readonly rate = 1,
  ) {}

  /** Score-time (seconds) corresponding to real elapsed time. */
  private scoreTime(realElapsedSec: number): number {
    return realElapsedSec * this.rate;
  }

  /** Index of the note sounding at the given real elapsed time; notes.length when finished. */
  indexAt(realElapsedSec: number): number {
    const t = this.scoreTime(realElapsedSec);
    for (let i = 0; i < this.notes.length; i++) {
      const n = this.notes[i];
      if (t < n.startSec + n.durSec) return i;
    }
    return this.notes.length;
  }

  /** Real-time window [start,end) for a note index. */
  windowFor(index: number): { startSec: number; endSec: number } {
    const n = this.notes[index];
    return { startSec: n.startSec / this.rate, endSec: (n.startSec + n.durSec) / this.rate };
  }

  get totalRealSec(): number {
    if (!this.notes.length) return 0;
    const last = this.notes[this.notes.length - 1];
    return (last.startSec + last.durSec) / this.rate;
  }

  get count(): number {
    return this.notes.length;
  }
}

export interface SessionSummary {
  total: number;
  correct: number;
  /** Correct + in-tune, as a 0–100 percentage. */
  pitchAccuracy: number;
  /** Mean absolute cents error over notes with a detected pitch. */
  meanCentsError: number;
  counts: Record<NoteVerdict, number>;
}

export function summarize(
  verdicts: { verdict: NoteVerdict; centsOff: number | null }[],
): SessionSummary {
  const counts: Record<NoteVerdict, number> = {
    correct: 0, sharp: 0, flat: 0, wrong: 0, missed: 0,
  };
  let centsSum = 0;
  let centsN = 0;
  for (const v of verdicts) {
    counts[v.verdict]++;
    if (v.centsOff != null) {
      centsSum += Math.abs(v.centsOff);
      centsN++;
    }
  }
  const total = verdicts.length;
  return {
    total,
    correct: counts.correct,
    pitchAccuracy: total ? Math.round((counts.correct / total) * 100) : 0,
    meanCentsError: centsN ? Math.round(centsSum / centsN) : 0,
    counts,
  };
}
