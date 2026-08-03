"""Turn an alignment into a feedback report: pitch, rhythm and dynamics.

Pure Python (no numpy) so it stays independent of the audio/ML stack. The tempo is recovered
from the alignment by a closed-form linear fit of played-time (s) against expected-beat, which
makes rhythm grading tempo-independent — we grade how evenly you kept *your* tempo, not whether
you matched some nominal bpm.
"""
from __future__ import annotations

import math

from app.analysis.align import nw_align
from app.analysis.reference import Reference
from app.analysis.types import DetectedNote

RHYTHM_TOL_BEATS = 0.2   # within a fifth of a beat counts as on-time
ACCENT_RATIO = 1.6       # a note this much louder than the local median is flagged as an accent


def _midi_to_hz(midi: float) -> float:
    return 440.0 * (2.0 ** ((midi - 69.0) / 12.0))


def _cents(hz: float, target_midi: int) -> int:
    if hz <= 0:
        return 0
    return round(1200.0 * math.log2(hz / _midi_to_hz(target_midi)))


def _linfit(xs: list[float], ys: list[float]) -> tuple[float, float]:
    """Least-squares y = a + b*x. Returns (a, b); b falls back to a sane default if degenerate."""
    n = len(xs)
    sx, sy = sum(xs), sum(ys)
    sxx = sum(x * x for x in xs)
    sxy = sum(x * y for x, y in zip(xs, ys))
    denom = n * sxx - sx * sx
    if abs(denom) < 1e-9:
        return (sy / n if n else 0.0), 0.5  # default 0.5 s/beat = 120 bpm
    b = (n * sxy - sx * sy) / denom
    a = (sy - b * sx) / n
    return a, b


def build_report(reference: Reference, detected: list[DetectedNote]) -> dict:
    expected = reference.notes
    ops = nw_align(expected, detected)

    matched = [(i, j) for (i, j) in ops if i is not None and j is not None]
    missed = [i for (i, j) in ops if i is not None and j is None]
    extra = [j for (i, j) in ops if i is None and j is not None]

    # ---- pitch ----
    correct = sum(1 for i, j in matched if expected[i].midi == detected[j].midi)
    wrong = len(matched) - correct
    total = max(1, len(expected))
    pitch_accuracy = correct / total

    # ---- rhythm (recover tempo from matched onsets) ----
    xs = [expected[i].onset_beats for i, j in matched]
    ys = [detected[j].onset_s for i, j in matched]
    rhythm_graded = len(matched) >= 2
    sec_per_beat = 0.5
    on_time = 0
    residuals: dict[int, float] = {}
    if rhythm_graded:
        a, sec_per_beat = _linfit(xs, ys)
        sec_per_beat = sec_per_beat if sec_per_beat > 1e-6 else 0.5
        for i, j in matched:
            pred = a + sec_per_beat * expected[i].onset_beats
            resid = detected[j].onset_s - pred
            residuals[i] = resid
            if abs(resid / sec_per_beat) <= RHYTHM_TOL_BEATS:
                on_time += 1
    rhythm_accuracy = (on_time / len(matched)) if matched else 0.0
    tempo_bpm_est = round(60.0 / sec_per_beat, 1) if sec_per_beat > 1e-6 else None

    # ---- dynamics ----
    rms_by_expected = {i: detected[j].rms for i, j in matched}
    max_rms = max((r for r in rms_by_expected.values()), default=0.0)
    loudness = {i: (r / max_rms if max_rms > 0 else 0.0) for i, r in rms_by_expected.items()}
    dyn_graded = reference.has_dynamics and any(expected[i].dynamic is not None for i, _ in matched)
    dyn_score: float | None = None
    if dyn_graded:
        pairs = [
            (expected[i].dynamic, loudness[i])
            for i, _ in matched
            if expected[i].dynamic is not None
        ]
        dyn_score = _corr([p for p, _ in pairs], [q for _, q in pairs])

    # ---- per-note breakdown (indexed by expected note, for the UI / score highlighting) ----
    matched_by_expected = {i: j for i, j in matched}
    notes_out = []
    for idx, e in enumerate(expected):
        if idx in matched_by_expected:
            d = detected[matched_by_expected[idx]]
            is_correct = e.midi == d.midi
            timing = "on"
            timing_ms = None
            if idx in residuals:
                timing_ms = round(residuals[idx] * 1000)
                if residuals[idx] / sec_per_beat > RHYTHM_TOL_BEATS:
                    timing = "late"
                elif residuals[idx] / sec_per_beat < -RHYTHM_TOL_BEATS:
                    timing = "early"
            notes_out.append(
                {
                    "index": idx,
                    "expected_midi": e.midi,
                    "played_midi": d.midi,
                    "pitch": "correct" if is_correct else "wrong",
                    "cents": _cents(d.hz, e.midi) if is_correct else None,
                    "timing": timing,
                    "timing_ms": timing_ms,
                    "loudness": round(loudness.get(idx, 0.0), 2),
                }
            )
        else:
            notes_out.append(
                {
                    "index": idx,
                    "expected_midi": e.midi,
                    "played_midi": None,
                    "pitch": "missed",
                    "cents": None,
                    "timing": None,
                    "timing_ms": None,
                    "loudness": None,
                }
            )

    extras_out = [
        {"played_midi": detected[j].midi, "time_s": round(detected[j].onset_s, 2)} for j in extra
    ]

    # ---- overall (reweight when a component can't be graded) ----
    if dyn_graded and rhythm_graded:
        overall = 0.6 * pitch_accuracy + 0.25 * rhythm_accuracy + 0.15 * (dyn_score or 0.0)
    elif rhythm_graded:
        overall = 0.7 * pitch_accuracy + 0.3 * rhythm_accuracy
    else:
        overall = pitch_accuracy

    return {
        "overall": round(overall * 100),
        "pitch": {
            "accuracy": round(pitch_accuracy, 3),
            "correct": correct,
            "wrong": wrong,
            "missed": len(missed),
            "extra": len(extra),
        },
        "rhythm": {
            "graded": rhythm_graded,
            "accuracy": round(rhythm_accuracy, 3),
            "tempo_bpm": tempo_bpm_est,
            "on_time": on_time,
            "off": len(matched) - on_time,
        },
        "dynamics": {
            "graded": dyn_graded,
            "score": round(dyn_score, 3) if dyn_score is not None else None,
            "accents": _find_accents(notes_out),
        },
        "notes": notes_out,
        "extras": extras_out,
    }


def _corr(a: list[float], b: list[float]) -> float:
    """Pearson correlation clamped to [0, 1] (0 when flat/degenerate)."""
    n = len(a)
    if n < 2:
        return 0.0
    ma, mb = sum(a) / n, sum(b) / n
    num = sum((x - ma) * (y - mb) for x, y in zip(a, b))
    da = math.sqrt(sum((x - ma) ** 2 for x in a))
    db = math.sqrt(sum((y - mb) ** 2 for y in b))
    if da < 1e-9 or db < 1e-9:
        return 0.0
    return max(0.0, min(1.0, num / (da * db)))


def _find_accents(notes_out: list[dict]) -> list[int]:
    """Indices of notes markedly louder than their neighbours (unintended accents)."""
    louds = [(n["index"], n["loudness"]) for n in notes_out if n["loudness"] is not None]
    accents: list[int] = []
    for k, (idx, lv) in enumerate(louds):
        window = [louds[t][1] for t in range(max(0, k - 2), min(len(louds), k + 3)) if t != k]
        if window:
            local = sorted(window)[len(window) // 2]  # median
            if local > 0 and lv > local * ACCENT_RATIO:
                accents.append(idx)
    return accents
