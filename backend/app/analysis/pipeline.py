"""Performance analysis pipeline: recording + reference score -> feedback report.

    audio file ─▶ detect_notes ┐
                               ├─▶ build_report ─▶ report dict
    reference MusicXML ─▶ parse_reference ┘
"""
from __future__ import annotations

from app.analysis.pitch_track import detect_notes
from app.analysis.reference import parse_reference
from app.analysis.score_report import build_report


class AnalysisError(RuntimeError):
    """Raised when a performance can't be analysed (bad audio, empty score, etc.)."""


def analyze_performance(audio_path: str, musicxml: bytes) -> dict:
    reference = parse_reference(musicxml)
    if not reference.notes:
        raise AnalysisError("The reference score has no notes to compare against.")

    detected = detect_notes(audio_path)
    if not detected:
        raise AnalysisError("No notes were detected in the recording — check the mic and volume.")

    return build_report(reference, detected)
