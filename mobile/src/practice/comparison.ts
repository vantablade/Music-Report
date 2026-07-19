/**
 * Compares a detected pitch against the expected note. Pure and fully testable — this is the
 * core of the feedback, kept independent of audio I/O and UI.
 */

export type NoteVerdict = "correct" | "sharp" | "flat" | "wrong" | "missed";

export interface Tolerances {
  /** Max cents deviation still counted as in-tune. */
  cents: number;
}

export const DEFAULT_TOLERANCES: Tolerances = { cents: 50 };

export interface NoteComparison {
  verdict: NoteVerdict;
  /** Signed cents from the expected pitch (null when missed). */
  centsOff: number | null;
}

/**
 * @param expectedMidi the note under the cursor (null = a rest, always "correct").
 * @param detectedMidi the stable detected note during the window (null = nothing played).
 * @param detectedCents cents offset of the detection from its own nearest note.
 */
export function compareNote(
  expectedMidi: number | null,
  detectedMidi: number | null,
  detectedCents: number,
  tol: Tolerances = DEFAULT_TOLERANCES,
): NoteComparison {
  if (expectedMidi == null) return { verdict: "correct", centsOff: null }; // rest
  if (detectedMidi == null) return { verdict: "missed", centsOff: null };

  // Total deviation from the *expected* pitch = whole semitones + the detection's own cents.
  const centsOff = (detectedMidi - expectedMidi) * 100 + detectedCents;

  if (Math.abs(centsOff) <= tol.cents) return { verdict: "correct", centsOff };
  if (detectedMidi !== expectedMidi) return { verdict: "wrong", centsOff };
  return { verdict: centsOff > 0 ? "sharp" : "flat", centsOff };
}

/** Map a verdict to the cursor tint used by the OSMD host (correct/wrong/near). */
export function verdictColorStatus(v: NoteVerdict): "correct" | "wrong" | "near" {
  if (v === "correct") return "correct";
  if (v === "wrong" || v === "missed") return "wrong";
  return "near"; // sharp/flat — right note, out of tune
}
