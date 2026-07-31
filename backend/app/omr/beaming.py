"""Auto-beaming for homr output.

homr emits no <beam> data, so every eighth/sixteenth renders as a separate flagged note.
This groups beamable notes by beat per the time signature. Beaming is cosmetic — it never
changes pitch or duration — so this is safe and deterministic.

Uses music21's makeBeams (proven; may be swapped for a lighter beamer later). It needs a time
signature: homr often reads one, but when it doesn't, makeBeams silently leaves every note
un-beamed (the common "all quavers separate" case). So we insert a default 4/4 when a part has
no time signature at all — enough for correct standard grouping. The note-corrector editor can
override the meter later; changing it re-beams. Beaming never touches pitch or duration.
"""
from __future__ import annotations

from pathlib import Path

# Fallback meter for parts where homr detected no time signature. 4/4 gives conventional
# beat-wise grouping (eighths in pairs) for the vast majority of scanned melodies.
_DEFAULT_METER = "4/4"


def auto_beam(musicxml: bytes) -> bytes:
    try:
        from music21 import converter, meter
    except ImportError:
        return musicxml  # beaming is optional; return as-is if music21 isn't available

    try:
        score = converter.parseData(musicxml.decode("utf-8"), format="musicxml")
        for part in score.parts:
            if not part.recurse().getElementsByClass(meter.TimeSignature):
                first = part.getElementsByClass("Measure").first()
                if first is not None:
                    first.insert(0.0, meter.TimeSignature(_DEFAULT_METER))
            try:
                part.makeBeams(inPlace=True)
            except Exception:
                # Malformed measure (e.g. durations that don't sum to the bar) — skip beaming it.
                pass
        out_path = score.write("musicxml")
        data = Path(out_path).read_bytes()
        try:
            Path(out_path).unlink()
        except OSError:
            pass
        return data
    except Exception:
        # Never let beaming break a scan — fall back to the raw (un-beamed) MusicXML.
        return musicxml
