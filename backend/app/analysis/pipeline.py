"""Performance analysis pipeline: recording + reference score -> feedback report.

    audio file ─▶ detect_notes ┐
                               ├─▶ build_report ─▶ report dict
    reference MusicXML ─▶ parse_reference ┘
"""
from __future__ import annotations

from dataclasses import replace

from app.analysis.pitch_track import detect_notes
from app.analysis.reference import parse_reference
from app.analysis.score_report import build_report


class AnalysisError(RuntimeError):
    """Raised when a performance can't be analysed (bad audio, empty score, etc.)."""


def analyze_performance(audio_path: str, musicxml: bytes, transposition: int = 0) -> dict:
    """Grade a recording against a reference score.

    `transposition` is the instrument's written-minus-sounding interval in semitones. The mic
    hears sounding (concert) pitch; the score is written pitch. For a transposing instrument
    (e.g. Bb trumpet, +2) we shift the detected notes up to written pitch so the comparison is
    apples-to-apples. 0 for concert-pitch instruments.
    """
    reference = parse_reference(musicxml)
    if not reference.notes:
        raise AnalysisError("The reference score has no notes to compare against.")

    detected = detect_notes(audio_path)
    if not detected:
        raise AnalysisError("No notes were detected in the recording — check the mic and volume.")

    if transposition:
        factor = 2 ** (transposition / 12)
        detected = [replace(d, midi=d.midi + transposition, hz=d.hz * factor) for d in detected]

    return build_report(reference, detected)
