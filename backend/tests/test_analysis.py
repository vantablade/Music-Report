"""Analysis core: reference parsing, note alignment, and scoring (pure — no audio/ML)."""
from app.analysis.reference import ExpectedNote, Reference, parse_reference
from app.analysis.score_report import build_report
from app.analysis.types import DetectedNote

TWO_NOTE_XML = b"""<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    </measure>
  </part>
</score-partwise>
"""


def _ref(midis: list[int], spacing: float = 1.0) -> Reference:
    notes = [
        ExpectedNote(midi=m, onset_beats=i * spacing, dur_beats=spacing, dynamic=None)
        for i, m in enumerate(midis)
    ]
    return Reference(notes=notes, tempo_bpm=120.0, has_dynamics=False)


def _perfect(ref: Reference, spb: float = 0.5) -> list[DetectedNote]:
    return [
        DetectedNote(
            midi=n.midi,
            hz=440.0 * 2 ** ((n.midi - 69) / 12),
            onset_s=n.onset_beats * spb,
            dur_s=n.dur_beats * spb,
            rms=0.3,
        )
        for n in ref.notes
    ]


def test_parse_reference_two_notes():
    ref = parse_reference(TWO_NOTE_XML)
    assert [n.midi for n in ref.notes] == [60, 62]
    assert [n.onset_beats for n in ref.notes] == [0.0, 1.0]
    assert ref.has_dynamics is False


def test_perfect_performance_scores_100():
    ref = _ref([60, 62, 64, 65, 67, 69])
    rep = build_report(ref, _perfect(ref))
    assert rep["overall"] == 100
    assert rep["pitch"] == {"accuracy": 1.0, "correct": 6, "wrong": 0, "missed": 0, "extra": 0}
    assert rep["rhythm"]["tempo_bpm"] == 120.0


def test_wrong_pitch_flagged():
    ref = _ref([60, 62, 64, 65, 67, 69])
    det = _perfect(ref)
    det[2].midi = 63  # played E-flat instead of E
    det[2].hz = 440.0 * 2 ** ((63 - 69) / 12)
    rep = build_report(ref, det)
    assert rep["pitch"]["correct"] == 5
    assert rep["pitch"]["wrong"] == 1
    assert rep["notes"][2]["pitch"] == "wrong"
    assert rep["notes"][2]["played_midi"] == 63


def test_missed_note_flagged():
    ref = _ref([60, 62, 64, 65, 67, 69])
    det = _perfect(ref)
    del det[3]  # skip the 4th note
    rep = build_report(ref, det)
    assert rep["pitch"]["missed"] == 1
    assert rep["notes"][3]["pitch"] == "missed"
    assert rep["notes"][3]["played_midi"] is None


def test_extra_note_flagged():
    ref = _ref([60, 62, 64])
    det = _perfect(ref)
    det.append(DetectedNote(midi=71, hz=493.9, onset_s=2.0, dur_s=0.5, rms=0.3))
    rep = build_report(ref, det)
    assert rep["pitch"]["extra"] == 1
    assert rep["extras"] and rep["extras"][0]["played_midi"] == 71


def test_rhythm_detects_late_note():
    ref = _ref([60, 62, 64, 65, 67, 69])
    det = _perfect(ref)
    det[4].onset_s += 0.4  # drag the 5th note well past tolerance
    rep = build_report(ref, det)
    assert rep["rhythm"]["off"] >= 1
    assert rep["notes"][4]["timing"] == "late"
