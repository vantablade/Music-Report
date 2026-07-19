/**
 * Rejects spurious single-frame pitch detections. YIN occasionally reports an octave jump or
 * a stray note for one frame; we only report a note as "stable" once N consecutive frames
 * agree on the same MIDI number. Pure and testable.
 */
export class PitchStabilizer {
  private history: (number | null)[] = [];

  constructor(private readonly window = 3) {}

  /** Push a detected MIDI (or null for silence); returns the stable MIDI or null. */
  push(midi: number | null): number | null {
    this.history.push(midi);
    if (this.history.length > this.window) this.history.shift();
    if (this.history.length < this.window) return null;

    const first = this.history[0];
    if (first == null) return null;
    return this.history.every((m) => m === first) ? first : null;
  }

  reset(): void {
    this.history = [];
  }
}
