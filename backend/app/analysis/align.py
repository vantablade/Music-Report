"""Global (Needleman-Wunsch) alignment of expected vs detected notes by pitch + order.

Monotonic order is the key constraint: it resolves most repeated-pitch ambiguity without
needing to know the player's tempo. Substitution cost is the pitch distance in semitones;
skipping either side costs a fixed gap (a missed or an extra note).

Output is a list of ops (expected_idx | None, detected_idx | None):
    both set        -> matched pair
    detected None   -> missed note (in the score, not played)
    expected None   -> extra note (played, not in the score)
"""
from __future__ import annotations

from app.analysis.reference import ExpectedNote
from app.analysis.types import DetectedNote

GAP = 4.0        # cost of a missed or extra note
SUB_CAP = 8.0    # cap on the semitone substitution cost (a very wrong pitch is no worse than a gap*2)

# Backpointer directions.
_DIAG, _UP, _LEFT = 0, 1, 2


def _sub_cost(e: ExpectedNote, d: DetectedNote) -> float:
    return min(abs(e.midi - d.midi), SUB_CAP)


def nw_align(
    expected: list[ExpectedNote], detected: list[DetectedNote]
) -> list[tuple[int | None, int | None]]:
    n, m = len(expected), len(detected)
    dp = [[0.0] * (m + 1) for _ in range(n + 1)]
    bt = [[_DIAG] * (m + 1) for _ in range(n + 1)]

    for i in range(1, n + 1):
        dp[i][0] = i * GAP
        bt[i][0] = _UP
    for j in range(1, m + 1):
        dp[0][j] = j * GAP
        bt[0][j] = _LEFT

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            diag = dp[i - 1][j - 1] + _sub_cost(expected[i - 1], detected[j - 1])
            up = dp[i - 1][j] + GAP        # skip expected[i-1] -> missed
            left = dp[i][j - 1] + GAP      # skip detected[j-1] -> extra
            best = diag
            move = _DIAG
            if up < best:
                best, move = up, _UP
            if left < best:
                best, move = left, _LEFT
            dp[i][j] = best
            bt[i][j] = move

    ops: list[tuple[int | None, int | None]] = []
    i, j = n, m
    while i > 0 or j > 0:
        move = bt[i][j]
        if move == _DIAG and i > 0 and j > 0:
            ops.append((i - 1, j - 1))
            i -= 1
            j -= 1
        elif move == _UP and i > 0:
            ops.append((i - 1, None))
            i -= 1
        else:
            ops.append((None, j - 1))
            j -= 1
    ops.reverse()
    return ops
