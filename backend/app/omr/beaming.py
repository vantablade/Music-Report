"""Auto-beaming for homr output.

homr emits no <beam> data, so every eighth/sixteenth renders as a separate flagged note.
This groups beamable notes by beat per the time signature. Beaming is cosmetic — it never
changes pitch or duration — so this is safe and deterministic.

Uses music21's makeBeams (proven; may be swapped for a lighter beamer later). It needs a time
signature; measures without one are left un-beamed and can be re-beamed once the editor sets a
time signature.
"""
from __future__ import annotations

from pathlib import Path


def auto_beam(musicxml: bytes) -> bytes:
    try:
        from music21 import converter
    except ImportError:
        return musicxml  # beaming is optional; return as-is if music21 isn't available

    try:
        score = converter.parseData(musicxml.decode("utf-8"), format="musicxml")
        for part in score.parts:
            try:
                part.makeBeams(inPlace=True)
            except Exception:
                # e.g. a measure with no time signature — leave it un-beamed.
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
