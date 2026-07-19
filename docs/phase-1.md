# Phase 1 — Sheet music scanning → MusicXML

Photograph a printed score and get digital notation (MusicXML) back, end to end.

## Flow

```
App (scan.tsx)                 Backend API              Celery worker            Supabase
──────────────                 ───────────              ─────────────            ────────
capture photo
  │ POST /scores  ───────────► create score row ──────────────────────────────► scores(insert)
  │                            + signed upload URL ◄───────────────────────────  Storage
  │ PUT image ──────────────────────────────────────────────────────────────►  Storage(source)
  │ POST /scores/{id}/omr ───► create job, status=processing
  │                            run_omr.delay() ──────► download source ◄───────  Storage
  │                                                    preprocess (OpenCV)
  │                                                    Audiveris → MusicXML
  │                                                    upload MusicXML ────────► Storage(score)
  │                                                    status=ready
  │ GET /scores/{id} (poll every 2s) ─────────────►   read row ◄──────────────  scores
  ▼ ready → signed MusicXML URL
```

Canonical output is **plain (uncompressed) MusicXML**, extracted from Audiveris's `.mxl`
export via the container spec (`META-INF/container.xml` rootfile), with a fallback to the
first score XML in the archive.

## Key files

| Concern | File |
|---|---|
| API endpoints | [backend/app/routers/scores.py](../backend/app/routers/scores.py) |
| DB + Storage access | [backend/app/services/scores_repo.py](../backend/app/services/scores_repo.py) |
| OMR task | [backend/app/worker/tasks.py](../backend/app/worker/tasks.py) |
| Pre-process + Audiveris | [backend/app/worker/omr.py](../backend/app/worker/omr.py) |
| Worker image (Audiveris build) | [backend/Dockerfile.worker](../backend/Dockerfile.worker) |
| Client API | [mobile/src/api/scores.ts](../mobile/src/api/scores.ts) |
| Scan pipeline hook | [mobile/src/scan/useScanPipeline.ts](../mobile/src/scan/useScanPipeline.ts) |
| Scan screen | [mobile/app/scan.tsx](../mobile/app/scan.tsx) |

## Image pre-processing (why it matters)

A phone photo is warped, unevenly lit, and noisy — Audiveris does far better on a clean,
upright, high-contrast bitonal page. `preprocess_image()` runs: 4-corner **perspective
correction** (largest page quadrilateral) → bilateral **denoise** → adaptive **binarize** →
**deskew**. This pass often matters as much as the engine.

## Run it end-to-end

1. **Supabase:** run [backend/migrations/0001_init.sql](../backend/migrations/0001_init.sql)
   in the SQL editor; create a Storage bucket named `scores`. Put keys in `backend/.env`.
2. **Backend:** `cd backend && docker compose up --build`
   (the worker image builds Audiveris from source — first build is slow).
3. **Mobile:** set `EXPO_PUBLIC_API_URL` in `mobile/.env`, then
   `cd mobile && npx expo run:ios` (or `run:android`), tap **Scan sheet music**.

## Verification

- `pytest` (backend): `test_omr_extract.py` covers the `.mxl` → MusicXML extraction
  (container rootfile + fallback + error). `test_health.py` covers app boot + route wiring.
- The extraction algorithm was validated against a synthetic `.mxl` archive.
- Manual: scan a clean printed score; confirm status reaches `ready` and the returned signed
  MusicXML URL downloads a valid `score-partwise` document.
- **Accuracy pass (recommended before Phase 2):** assemble 10–20 test images (clean → hard)
  and measure note-level accuracy to tune the pre-processing constants.

## Known limits / follow-ups

- **Auth:** scanning requires a real Supabase user (rows are keyed to `auth.users`). The
  dev-anonymous `/me` shortcut does **not** work for `/scores` — wire Supabase sign-in
  (planned alongside Phase 2) or pass a real JWT when testing.
- **Audiveris build** in `Dockerfile.worker` pins `AUDIVERIS_REF` and guesses the install
  path; both are version-sensitive and may need adjusting for the release you target.
- **No manual correction yet** — OMR output is imperfect; editing/tempo/key fixes come in
  Phase 2.
- **Signed upload URL** key names vary across supabase-py versions; `scores_repo` normalizes
  the common variants but verify against your installed version.
