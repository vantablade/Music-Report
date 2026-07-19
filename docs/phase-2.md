# Phase 2 — Rendering, library & playback

Sign in, render scanned scores as notation, save them to an offline library, and play them
back with a moving cursor.

## What landed

- **Supabase auth** — email/password sign-in; session gating routes the app to `/sign-in`
  when signed out. The access token now flows to the backend (so Phase 1's `/scores` calls
  are authenticated by a real user).
- **Notation rendering + playback** — `ScorePlayer` renders MusicXML via OpenSheetMusicDisplay
  inside a WebView and plays the parsed timeline with a self-contained WebAudio synth,
  advancing the OSMD cursor in sync. Tempo control: 0.5× / 0.75× / 1×.
- **Offline library** — scanned scores download their MusicXML to disk and are indexed in
  SQLite; list + open + (repository-level) delete.
- **MusicXML → timeline parser** — the shared core reused by Phase 3's comparison engine.

## Key files

| Concern | File |
|---|---|
| Supabase client | [mobile/src/lib/supabase.ts](../mobile/src/lib/supabase.ts) |
| Auth state + gating | [mobile/src/auth/AuthProvider.tsx](../mobile/src/auth/AuthProvider.tsx), [mobile/app/_layout.tsx](../mobile/app/_layout.tsx) |
| Sign-in screen | [mobile/app/sign-in.tsx](../mobile/app/sign-in.tsx) |
| MusicXML parser | [mobile/src/music/parseMusicXML.ts](../mobile/src/music/parseMusicXML.ts) |
| OSMD WebView host | [mobile/src/music/osmdHost.ts](../mobile/src/music/osmdHost.ts) |
| Player component | [mobile/src/components/ScorePlayer.tsx](../mobile/src/components/ScorePlayer.tsx) |
| Local library | [mobile/src/library/db.ts](../mobile/src/library/db.ts), [mobile/src/library/repository.ts](../mobile/src/library/repository.ts) |
| Screens | [mobile/app/library.tsx](../mobile/app/library.tsx), [mobile/app/score/[id].tsx](../mobile/app/score/%5Bid%5D.tsx) |

## How the player stays in sync

`parseMusicXML` emits exactly **one timeline event per sounded note-head** (rests included;
chord/grace excluded), which is the same granularity as OSMD's cursor steps. The WebView host
schedules synth notes on the audio clock and advances the cursor from the same timeline, so
sound and the visual cursor never drift. This one-event-per-cursor-step alignment is exactly
what Phase 3 needs to compare live audio to "the note under the cursor".

## Verification

- **Parser math** (pitch→MIDI, duration→seconds, cumulative onset) was validated numerically
  against a C-major scale. Unit tests in
  [parseMusicXML.test.ts](../mobile/src/music/parseMusicXML.test.ts) cover scale timing, rests,
  and chord/grace skipping — run with `npm test` (jest-expo).
- Manual (device): sign in → scan a score → it opens in the player → **Play** highlights notes
  in time and sounds the melody; tempo toggle changes speed.

## Known limits / follow-ups

- **OSMD loads from a CDN** (`osmdHost.ts`) for dev convenience — the WebView needs network on
  first render. For offline/production, bundle the OSMD UMD build as an asset and point
  `OSMD_SRC` at it.
- **Monophonic playback only** — first part/voice; `<backup>`/`<forward>` multi-voice and ties
  are not merged (documented in the parser). Fine for the MVP; revisit for piano scores.
- **WebAudio + iOS** — playback starts from the Play tap (a user gesture), which satisfies iOS
  autoplay rules.
- **No edit/correction UI yet** — tempo/key/title fixes for imperfect OMR are a follow-up.
- **AsyncStorage session** is unencrypted (Supabase's documented Expo pattern); wrap in a
  SecureStore-encrypted adapter before production.
