/**
 * Pure pitch/frequency helpers. No audio I/O — trivially testable.
 */

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export interface PitchReading {
  hz: number;
  /** Nearest MIDI note number (A4 = 69). */
  midi: number;
  /** Signed cents from the nearest note: negative = flat, positive = sharp. */
  cents: number;
}

/** Convert a frequency to the nearest MIDI note + cents deviation. */
export function hzToPitch(hz: number): PitchReading {
  const midiFloat = 69 + 12 * Math.log2(hz / 440);
  const midi = Math.round(midiFloat);
  const cents = Math.round((midiFloat - midi) * 100);
  return { hz, midi, cents };
}

export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Human-readable note name, e.g. 69 -> "A4". */
export function midiToName(midi: number): string {
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}
