"""End-to-end analysis on synthesized audio — exercises pitch_track + the full pipeline.

Skipped where the audio stack (librosa/soundfile) isn't installed, so the pure tests still run.
"""
import pytest

pytest.importorskip("librosa")
pytest.importorskip("soundfile")

import numpy as np  # noqa: E402
import soundfile as sf  # noqa: E402

from app.analysis.pipeline import analyze_performance  # noqa: E402

# C major scale, 8 quarter notes (C4..C5) in 4/4.
SCALE_XML = b"""<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    </measure>
    <measure number="2">
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><type>quarter</type></note>
    </measure>
  </part>
</score-partwise>
"""

SCALE_MIDIS = [60, 62, 64, 65, 67, 69, 71, 72]


def _synth_wav(midis, path, spb=0.6, sr=22050):
    """Write a mono WAV of the given MIDI notes as fading sine tones (no clicks between notes)."""
    fade = int(0.012 * sr)
    chunks = []
    for m in midis:
        f = 440.0 * 2 ** ((m - 69) / 12)
        t = np.linspace(0, spb, int(sr * spb), endpoint=False)
        tone = 0.3 * np.sin(2 * np.pi * f * t)
        env = np.ones_like(tone)
        env[:fade] = np.linspace(0, 1, fade)
        env[-fade:] = np.linspace(1, 0, fade)
        chunks.append(tone * env)
    sf.write(path, np.concatenate(chunks).astype("float32"), sr)


def test_synth_scale_scores_well(tmp_path):
    wav = str(tmp_path / "scale.wav")
    _synth_wav(SCALE_MIDIS, wav)
    report = analyze_performance(wav, SCALE_XML)
    # A clean synthetic scale should be graded highly (allow pyin edge slop at note boundaries).
    assert report["pitch"]["accuracy"] >= 0.75
    assert report["pitch"]["missed"] <= 1
    assert report["rhythm"]["graded"] is True


def test_synth_wrong_note_is_flagged(tmp_path):
    wrong = list(SCALE_MIDIS)
    wrong[4] = 66  # play F#4 instead of G4
    wav = str(tmp_path / "wrong.wav")
    _synth_wav(wrong, wav)
    report = analyze_performance(wav, SCALE_XML)
    # The substituted note should show up as a wrong pitch, not a perfect run.
    assert report["pitch"]["accuracy"] < 1.0


def test_transposition_realigns_transposing_instrument(tmp_path):
    # A Bb instrument reading the written C scale sounds a whole tone lower.
    sounding = [m - 2 for m in SCALE_MIDIS]
    wav = str(tmp_path / "bb.wav")
    _synth_wav(sounding, wav)
    without = analyze_performance(wav, SCALE_XML, 0)
    corrected = analyze_performance(wav, SCALE_XML, 2)
    assert corrected["pitch"]["accuracy"] > without["pitch"]["accuracy"]
    assert corrected["pitch"]["accuracy"] >= 0.75
