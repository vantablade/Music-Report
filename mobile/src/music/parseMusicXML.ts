/**
 * Parse MusicXML into a flat note timeline for the FIRST part / first voice (monophonic MVP).
 *
 * The timeline is deliberately one event per sounded note-head (rests included; chord and
 * grace notes excluded), so its index aligns 1:1 with OpenSheetMusicDisplay's cursor steps —
 * that alignment is what lets the player highlight the current note and, in Phase 3, compare
 * live audio against the expected note at the cursor.
 *
 * Known limits (documented, acceptable for the monophonic MVP):
 *  - Only the first part/voice; `<backup>`/`<forward>` (multi-voice) are ignored.
 *  - Ties are not merged (each note-head re-articulates); keeps index/cursor alignment simple.
 *  - Grace notes are skipped.
 */
import { XMLParser } from "fast-xml-parser";

export interface NoteEvent {
  index: number;
  midi: number | null; // null = rest
  startSec: number;
  durSec: number;
  startBeat: number; // quarter notes
  durBeat: number;
}

export interface ScoreTimeline {
  tempoBpm: number;
  notes: NoteEvent[];
  totalSec: number;
}

const SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) => ["part", "measure", "note", "direction"].includes(name),
});

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function midiFromPitch(pitch: any): number | null {
  const step = pitch?.step;
  const octave = Number(pitch?.octave);
  if (step === undefined || Number.isNaN(octave)) return null;
  const alter = Number(pitch?.alter ?? 0);
  const base = SEMITONE[String(step).toUpperCase()];
  if (base === undefined) return null;
  return 12 * (octave + 1) + base + alter;
}

/** Pull a tempo (BPM) from a <sound tempo> anywhere it appears, else undefined. */
function tempoFrom(node: any): number | undefined {
  const sound = node?.sound;
  const t = sound?.["@_tempo"];
  return t !== undefined ? Number(t) : undefined;
}

export function parseMusicXML(xml: string, defaultTempo = 120): ScoreTimeline {
  const doc = parser.parse(xml);
  const scorePartwise = doc["score-partwise"];
  if (!scorePartwise) {
    // score-timewise or malformed — return an empty timeline rather than throwing.
    return { tempoBpm: defaultTempo, notes: [], totalSec: 0 };
  }

  const part = asArray(scorePartwise.part)[0];
  const measures = asArray(part?.measure);

  let divisions = 1;
  let tempo = defaultTempo;
  let initialTempo: number | undefined;
  let elapsedSec = 0;
  let elapsedBeat = 0;
  const notes: NoteEvent[] = [];

  for (const measure of measures) {
    // Divisions can be (re)declared in a measure's <attributes>.
    const attrs = measure.attributes;
    const div = Array.isArray(attrs) ? attrs[0]?.divisions : attrs?.divisions;
    if (div !== undefined) divisions = Number(div);

    // Tempo can appear on the measure's <sound> or inside a <direction>.
    const measureTempo =
      tempoFrom(measure) ??
      asArray(measure.direction).map(tempoFrom).find((t) => t !== undefined);
    if (measureTempo !== undefined) {
      tempo = measureTempo;
      if (initialTempo === undefined) initialTempo = measureTempo;
    }

    for (const note of asArray(measure.note)) {
      if (note.grace !== undefined) continue; // no duration; skip
      if (note.chord !== undefined) continue; // simultaneous with previous; don't advance

      const durationDivs = Number(note.duration ?? 0);
      const durBeat = divisions > 0 ? durationDivs / divisions : 0;
      const durSec = durBeat * (60 / tempo);
      const midi = note.rest !== undefined ? null : midiFromPitch(note.pitch);

      notes.push({
        index: notes.length,
        midi,
        startSec: elapsedSec,
        durSec,
        startBeat: elapsedBeat,
        durBeat,
      });

      elapsedSec += durSec;
      elapsedBeat += durBeat;
    }
  }

  return {
    tempoBpm: initialTempo ?? defaultTempo,
    notes,
    totalSec: elapsedSec,
  };
}
