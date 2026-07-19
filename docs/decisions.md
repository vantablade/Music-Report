# Technical decisions

Locked-in decisions for Sheet Music Trainer. Kept short; rationale lives in the plan.

| Area | Decision | Why |
|---|---|---|
| Client | Expo + React Native + TypeScript, **prebuild + Dev Client** | Native modules (real-time PCM audio, DSP) rule out Expo Go. |
| Navigation | Expo Router | File-based routing. |
| Instruments | **Monophonic MVP**, architected for polyphonic later | Real-time mono pitch tracking is solved; poly is research-grade. |
| OMR engine | **Audiveris** (Java CLI) on the backend | Mature open-source OMR → MusicXML. Free, controllable. |
| Backend | **FastAPI (Python)** | Pairs with OpenCV pre-processing + future ML/polyphony. |
| Jobs | **Celery + Redis** | OMR is slow → always async, never block the request. |
| Auth / DB / Storage | **Supabase** (Postgres + Auth + object storage) | Fewest moving parts; relational model fits Postgres. |
| Notation render | OpenSheetMusicDisplay (OSMD) inside `react-native-webview` | Mature renderer is a DOM library; drive cursor via JS bridge. |
| Real-time mic | `react-native-live-audio-stream` | Streams raw PCM frames; `expo-av` only records to file. |
| Pitch detection | `pitchfinder` (YIN) in JS; native/WASM fallback | Start simple, move native if frame budget is tight. |
| Canonical format | **MusicXML** | Single source of truth for render, playback, comparison. |

## Deferred (revisit at the noted phase)

- **Live-feedback tolerances** (cents / ms) — Phase 3. Defaults until then: ±50 cents pitch,
  ±150 ms rhythm.
- **Monetization / timeline** — Phase 4.

## OMR status (parked as of 2026-07-18)

OMR works end-to-end via the local CLI (`app.tools.omr_local`), but **in-app OMR is deferred**.
For now, develop/test the app with **directly-exported/downloaded MusicXML** (e.g. MuseScore
→ Export → MusicXML), which is exact and lossless — OMR is only worth it for paper you can't
get digitally.

**Engine choice for in-app OMR is still open** — evaluate head-to-head when we return to it:
- **Audiveris** (current backend engine, Java). Learnings from local testing:
  - Needs a **~300 DPI** input; staff **interline ~15–18px**. Small web PNGs must be upscaled
    (~4×) or they fail the Scale step / produce garbage.
  - **Accuracy is bounded by source resolution** — upscaling a low-res image does NOT recover
    detail; it only lets the engine run.
  - **Tesseract language data must be installed** (`eng.traineddata`, the full legacy+LSTM one
    from the `tessdata` repo) or text/OCR steps fail.
  - Has a **`no such edge in graph: Exclusion`** crash on some scores (augmentation-dot SIG
    reduction); can sometimes be dodged by re-scaling the input.
- **homr** ([liebharc/homr](https://github.com/liebharc/homr)) — transformer/deep-learning OMR,
  pure Python (pip-friendly, no Java), outputs MusicXML. Easier to run in the FastAPI backend
  and potentially better on varied inputs. **Accuracy not yet validated** (user cloned it
  previously but never measured it). Prime candidate to benchmark against Audiveris.

## Data model (Postgres via Supabase, first cut)

- `users(id, auth_provider_id, created_at)`
- `scores(id, user_id, title, source_image_url, musicxml_url, status, tempo_bpm, created_at)`
  - `status ∈ {uploaded, processing, ready, failed}`
- `omr_jobs(id, score_id, state, error, audiveris_log_url, started_at, finished_at)`
- `practice_sessions(id, score_id, user_id, accuracy_pitch, accuracy_rhythm, created_at)` (Phase 3)
