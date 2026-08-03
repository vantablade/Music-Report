"""Shared, dependency-free types for the analysis pipeline."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class DetectedNote:
    """One note segmented from the recording."""

    midi: int      # rounded MIDI (median pitch over the note)
    hz: float      # median fundamental frequency (kept for fine cents)
    onset_s: float
    dur_s: float
    rms: float     # linear RMS amplitude over the note (loudness)
