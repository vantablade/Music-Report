import type { NoteEvent } from "@/music/parseMusicXML";
import { FixedTempoFollower, summarize } from "./scoreFollower";

function quarters(n: number): NoteEvent[] {
  // n quarter notes @ 120bpm => 0.5s each.
  return Array.from({ length: n }, (_, i) => ({
    index: i, midi: 60 + i, startSec: i * 0.5, durSec: 0.5, startBeat: i, durBeat: 1,
  }));
}

describe("FixedTempoFollower", () => {
  const notes = quarters(4);

  it("maps elapsed time to the active note index", () => {
    const f = new FixedTempoFollower(notes, 1);
    expect(f.indexAt(0)).toBe(0);
    expect(f.indexAt(0.6)).toBe(1);
    expect(f.indexAt(1.1)).toBe(2);
    expect(f.indexAt(2.5)).toBe(4); // finished
  });

  it("stretches time by the practice rate", () => {
    const f = new FixedTempoFollower(notes, 0.5); // half speed
    expect(f.indexAt(1.0)).toBe(1); // 1s real = 0.5s score = still note 1
    expect(f.totalRealSec).toBe(4); // 2s of score at 0.5x = 4s real
  });
});

describe("summarize", () => {
  it("tallies verdicts and pitch accuracy", () => {
    const s = summarize([
      { verdict: "correct", centsOff: 5 },
      { verdict: "correct", centsOff: -10 },
      { verdict: "wrong", centsOff: 200 },
      { verdict: "missed", centsOff: null },
    ]);
    expect(s.total).toBe(4);
    expect(s.correct).toBe(2);
    expect(s.pitchAccuracy).toBe(50);
    expect(s.meanCentsError).toBe(72); // mean(|5|,|10|,|200|) over 3 detected = 71.67 -> 72
    expect(s.counts.missed).toBe(1);
  });
});
