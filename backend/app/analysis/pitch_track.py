"""Audio recording -> detected note sequence (monophonic).

librosa.pyin gives a frame-level fundamental-frequency contour; we round it to semitones,
median-filter to kill vibrato/octave flicker, then merge runs of equal pitch into notes. Per
note we keep the median frequency (for fine intonation) and the RMS amplitude (loudness).

librosa is imported lazily so the rest of the app (and the /scan tests) don't need it loaded.
"""
from __future__ import annotations

import math

from app.analysis.types import DetectedNote

SR = 22050
FMIN = 65.0        # ~C2 — low brass/low voice
FMAX = 1200.0      # ~D6 — comfortably above typical melody instruments
HOP = 512          # 23 ms frames at 22.05 kHz
MIN_NOTE_FRAMES = 3  # drop blips shorter than ~70 ms


def _median_round(midi: list[float], win: int = 5) -> list[int | None]:
    """Round each frame's MIDI to a semitone, median-filtered; None where unvoiced (NaN)."""
    n = len(midi)
    half = win // 2
    out: list[int | None] = []
    for k in range(n):
        if midi[k] is None or math.isnan(midi[k]):
            out.append(None)
            continue
        vals = [midi[t] for t in range(max(0, k - half), min(n, k + half + 1)) if not math.isnan(midi[t])]
        out.append(int(round(sorted(vals)[len(vals) // 2])))
    return out


def detect_notes(audio_path: str) -> list[DetectedNote]:
    import librosa
    import numpy as np

    y, sr = librosa.load(audio_path, sr=SR, mono=True)
    if y.size < HOP:
        return []

    f0, _voiced, _vprob = librosa.pyin(y, fmin=FMIN, fmax=FMAX, sr=sr, hop_length=HOP)
    times = librosa.times_like(f0, sr=sr, hop_length=HOP)
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=HOP)[0]

    n = min(len(f0), len(rms), len(times))
    f0, rms, times = f0[:n], rms[:n], times[:n]
    midi = librosa.hz_to_midi(f0)  # NaN where f0 is NaN
    midi_r = _median_round([float(m) for m in midi])

    def make_note(s: int, e: int) -> DetectedNote | None:
        if e - s < MIN_NOTE_FRAMES:
            return None
        seg = f0[s:e]
        med_hz = float(np.nanmedian(seg))
        if math.isnan(med_hz) or med_hz <= 0:
            return None
        return DetectedNote(
            midi=int(round(float(librosa.hz_to_midi(med_hz)))),
            hz=med_hz,
            onset_s=float(times[s]),
            dur_s=float((e - s) * HOP / sr),
            rms=float(np.mean(rms[s:e])),
        )

    notes: list[DetectedNote] = []
    start: int | None = None
    cur: int | None = None
    for k in range(n):
        m = midi_r[k]
        if m is None:
            if start is not None:
                nt = make_note(start, k)
                if nt:
                    notes.append(nt)
                start = cur = None
        elif start is None:
            start, cur = k, m
        elif m != cur:
            nt = make_note(start, k)
            if nt:
                notes.append(nt)
            start, cur = k, m
    if start is not None:
        nt = make_note(start, n)
        if nt:
            notes.append(nt)

    return notes
