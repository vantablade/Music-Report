/**
 * Read the first time-signature numerator (beats per bar) from a MusicXML string, for the
 * count-in and metronome accent. A light regex — the full parser (parseMusicXML) doesn't
 * surface the meter. Defaults to 4 when none is present.
 */
export function readBeatsPerBar(xml: string): number {
  const m = xml.match(/<beats>\s*(\d+)\s*<\/beats>/);
  const n = m ? parseInt(m[1], 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 4;
}
