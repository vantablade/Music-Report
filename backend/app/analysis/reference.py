"""Reference score -> the expected performance.

Parses a MusicXML score into an ordered list of expected notes (pitch + timing in beats),
the tempo, and any dynamics markings. Monophonic: we follow the melodic line — the first
part, and the top note of any chord. Rests are dropped (they only create timing gaps; note
matching works on note onsets).

Timing is kept in *beats* (quarter-note lengths), not seconds: the player's tempo is unknown
and recovered later from the alignment, so absolute seconds here would be meaningless.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ExpectedNote:
    midi: int
    onset_beats: float
    dur_beats: float
    # Active dynamic at this onset as a 0..1 loudness target, or None if the score marks none.
    dynamic: float | None


@dataclass
class Reference:
    notes: list[ExpectedNote]
    tempo_bpm: float
    has_dynamics: bool


def _active_dynamic(dyns: list[tuple[float, float]], onset: float) -> float | None:
    """The most recent dynamic marking at or before `onset` (dyns sorted by offset)."""
    level: float | None = None
    for off, vol in dyns:
        if off <= onset + 1e-6:
            level = vol
        else:
            break
    return level


def parse_reference(musicxml: bytes) -> Reference:
    from music21 import converter, dynamics as m21dyn, tempo as m21tempo

    score = converter.parseData(musicxml.decode("utf-8"), format="musicxml")

    mark = score.recurse().getElementsByClass(m21tempo.MetronomeMark).first()
    tempo_bpm = float(mark.number) if mark is not None and mark.number else 100.0

    part = score.parts[0] if getattr(score, "parts", None) and len(score.parts) else score
    flat = part.flatten()

    dyns = sorted(
        (float(d.offset), float(d.volumeScalar))
        for d in flat.getElementsByClass(m21dyn.Dynamic)
        if d.volumeScalar is not None
    )
    has_dynamics = len(dyns) > 0

    notes: list[ExpectedNote] = []
    for n in flat.notes:  # Note and Chord (excludes rests)
        midi = n.pitch.midi if n.isNote else max(p.midi for p in n.pitches)
        onset = float(n.offset)
        notes.append(
            ExpectedNote(
                midi=int(midi),
                onset_beats=onset,
                dur_beats=float(n.duration.quarterLength),
                dynamic=_active_dynamic(dyns, onset) if has_dynamics else None,
            )
        )

    notes.sort(key=lambda x: x.onset_beats)
    return Reference(notes=notes, tempo_bpm=tempo_bpm, has_dynamics=has_dynamics)
