import { parseMusicXML } from "./parseMusicXML";

// Minimal MusicXML: C-major scale, quarter notes, divisions=1, tempo 120.
function scaleXml(): string {
  const steps: [string, number][] = [
    ["C", 4], ["D", 4], ["E", 4], ["F", 4],
    ["G", 4], ["A", 4], ["B", 4], ["C", 5],
  ];
  const notes = steps
    .map(
      ([s, o]) =>
        `<note><pitch><step>${s}</step><octave>${o}</octave></pitch><duration>1</duration><type>quarter</type></note>`,
    )
    .join("");
  return `<?xml version="1.0"?>
<score-partwise>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions></attributes>
      <sound tempo="120"/>
      ${notes}
    </measure>
  </part>
</score-partwise>`;
}

describe("parseMusicXML", () => {
  it("maps pitches to MIDI and computes onset/duration in seconds", () => {
    const t = parseMusicXML(scaleXml());
    expect(t.tempoBpm).toBe(120);
    expect(t.notes).toHaveLength(8);
    expect(t.notes[0]).toMatchObject({ index: 0, midi: 60, startSec: 0, durSec: 0.5 });
    expect(t.notes[7]).toMatchObject({ index: 7, midi: 72, startSec: 3.5, durSec: 0.5 });
    expect(t.totalSec).toBeCloseTo(4.0, 3);
  });

  it("represents rests as null-pitch events that still advance time", () => {
    const xml = `<?xml version="1.0"?>
<score-partwise><part id="P1"><measure number="1">
  <attributes><divisions>1</divisions></attributes>
  <note><rest/><duration>1</duration></note>
  <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration></note>
</measure></part></score-partwise>`;
    const t = parseMusicXML(xml, 60);
    expect(t.notes[0].midi).toBeNull();
    expect(t.notes[1]).toMatchObject({ midi: 69, startSec: 1.0 }); // 1 quarter @ 60bpm = 1s
  });

  it("skips chord and grace notes so index aligns with cursor steps", () => {
    const xml = `<?xml version="1.0"?>
<score-partwise><part id="P1"><measure number="1">
  <attributes><divisions>1</divisions></attributes>
  <note><grace/><pitch><step>D</step><octave>4</octave></pitch></note>
  <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration></note>
  <note><chord/><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration></note>
</measure></part></score-partwise>`;
    const t = parseMusicXML(xml);
    expect(t.notes).toHaveLength(1);
    expect(t.notes[0].midi).toBe(60);
  });
});
