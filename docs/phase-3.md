# Phase 3 — Live audio analysis (monophonic)

Play along with a score and get real-time, per-note pitch feedback plus an end-of-session
accuracy summary.

## How it works

```
mic ──► react-native-live-audio-stream ──► PCM16 frames
                                             │  (useMicPitch)
                                             ▼
                             detector (YIN + noise gate) ──► Hz → MIDI + cents
                                             │
                                             ▼
                             stabilizer (N frames must agree)
                                             │
   fixed-tempo clock ──► FixedTempoFollower ─┼─► compareNote(expected, detected)
   (count-in, then RAF)   (cursor index)     │        │
                                             ▼        ▼
                         ScorePlayer "follow" mode   verdict → summary
                         (OSMD cursor + tint)        (pitch accuracy, cents, counts)
```

**Score following (MVP):** the plan's fixed-tempo strategy — a count-in, then a wall clock
advances the cursor through the note timeline at the chosen rate. It assumes the player keeps
tempo. Free-tempo online alignment (DTW/HMM) is the documented upgrade.

**Feedback:** while the cursor sits on a note, the live detected pitch is compared to it and
the cursor is tinted green (in tune) / amber (right note, sharp/flat) / red (wrong or silent).
When a note's window ends its verdict is recorded; the finish shows % correct, mean cents
error, and a breakdown.

## Key files

| Concern | File |
|---|---|
| Pitch math (Hz→MIDI+cents, names) | [pitch.ts](../mobile/src/audio/pitch.ts) |
| PCM decode + noise gate | [pcm.ts](../mobile/src/audio/pcm.ts) |
| Detector (YIN + gate + range) | [detector.ts](../mobile/src/audio/detector.ts) |
| Stabilizer (anti-flicker) | [stabilizer.ts](../mobile/src/audio/stabilizer.ts) |
| Live mic hook (device) | [useMicPitch.ts](../mobile/src/audio/useMicPitch.ts) |
| Comparison engine | [comparison.ts](../mobile/src/practice/comparison.ts) |
| Fixed-tempo follower + summary | [scoreFollower.ts](../mobile/src/practice/scoreFollower.ts) |
| Session orchestration | [usePracticeSession.ts](../mobile/src/practice/usePracticeSession.ts) |
| Player follow mode | [ScorePlayer.tsx](../mobile/src/components/ScorePlayer.tsx) |
| Practice screen | [practice/[id].tsx](../mobile/app/practice/%5Bid%5D.tsx) |

Reuses the Phase 2 [parseMusicXML](../mobile/src/music/parseMusicXML.ts) timeline — the same
one-event-per-cursor-step alignment is what lets us compare live audio to "the note under the
cursor".

## Verification

- **Pure math validated** (Python replication + Jest): pitch conversion, the comparison
  verdicts (correct/sharp/flat/wrong/missed), the fixed-tempo follower's time→index mapping and
  rate stretching, and the session summary. See `*.test.ts` in `src/audio` and `src/practice`.
- **Device testing required** for the mic path — `react-native-live-audio-stream` + real
  playing. Needs a Dev Client build; validate detected notes against a tuner and try a scale.

## Tuning knobs

- Pitch tolerance: **±50 cents** ([comparison.ts](../mobile/src/practice/comparison.ts) `DEFAULT_TOLERANCES`).
- Stabilizer window: **3 frames** ([useMicPitch.ts](../mobile/src/audio/useMicPitch.ts)).
- Noise gate / frequency range: [detector.ts](../mobile/src/audio/detector.ts).
- Count-in: **3 s** ([usePracticeSession.ts](../mobile/src/practice/usePracticeSession.ts)).

## Known limits / follow-ups

- **Fixed-tempo only** — drifts if the player rushes/drags; DTW/HMM score-following is the
  upgrade. Rhythm feedback is therefore coarse (present/absent at the expected time), not
  precise onset timing yet.
- **Monophonic** — one note at a time (Phase 4 covers polyphonic).
- **First-run permission**: the clock starts alongside the mic-permission prompt on first use;
  grant it once, then restart the session.
- **DSP in JS** — `pitchfinder` YIN per frame. If frame timing is tight on lower-end devices,
  move detection to a native/WASM module (designed-for in the plan).
- **Sessions aren't persisted yet** — the summary is shown but not written to
  `practice_sessions` (backend sync is a follow-up).
