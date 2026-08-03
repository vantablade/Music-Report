"""Performance analysis: compare a recorded performance to a reference score.

Pipeline (record-then-analyze, monophonic):
    audio ─▶ pitch_track ─▶ detected notes ┐
                                            ├─▶ align ─▶ score_report ─▶ feedback JSON
    reference MusicXML ─▶ reference ────────┘

The pure pieces (reference, align, score_report) have no audio/ML dependency and are unit
tested; pitch_track wraps librosa. Everything here is engine-agnostic — swapping the pitch
tracker (or adding a polyphonic model) only touches pitch_track.
"""
