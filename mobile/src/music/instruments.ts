/**
 * Instruments the user can pick for a score. Two effects:
 *  - transposition: written-minus-sounding interval (semitones). The mic hears sounding pitch;
 *    the score is written. Sending this to /analyze realigns the two for transposing
 *    instruments (e.g. Bb trumpet, +2), so feedback isn't marked wrong across the board.
 *  - timbre: which synth voice to use for playback.
 */
export type Timbre = "piano" | "flute" | "strings" | "voice" | "reed" | "brass";

export interface Instrument {
  id: string;
  label: string;
  transposition: number;
  timbre: Timbre;
}

export const INSTRUMENTS: Instrument[] = [
  { id: "concert", label: "Concert pitch / Piano", transposition: 0, timbre: "piano" },
  { id: "flute", label: "Flute / Recorder", transposition: 0, timbre: "flute" },
  { id: "violin", label: "Violin", transposition: 0, timbre: "strings" },
  { id: "voice", label: "Voice", transposition: 0, timbre: "voice" },
  { id: "oboe", label: "Oboe", transposition: 0, timbre: "reed" },
  { id: "trumpet", label: "Trumpet (B♭)", transposition: 2, timbre: "brass" },
  { id: "clarinet", label: "Clarinet (B♭)", transposition: 2, timbre: "reed" },
  { id: "alto_sax", label: "Alto Sax (E♭)", transposition: 9, timbre: "reed" },
  { id: "tenor_sax", label: "Tenor Sax (B♭)", transposition: 14, timbre: "reed" },
  { id: "horn", label: "French Horn (F)", transposition: 7, timbre: "brass" },
];

export const DEFAULT_INSTRUMENT_ID = "concert";

export function getInstrument(id: string | null | undefined): Instrument {
  return INSTRUMENTS.find((i) => i.id === id) ?? INSTRUMENTS[0];
}
