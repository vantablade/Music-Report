# Backend — OMR service (homr)

FastAPI service that turns a sheet-music image into MusicXML:

```
image → EXIF-normalize → homr → auto-beam → MusicXML
```

homr (deep-learning OMR, ONNX) was chosen over Audiveris after a bake-off on real phone photos
— it's more accurate and handles photos/low-res directly. No Java, no DB, no Redis.

## Layout

```
app/
  main.py            FastAPI app
  routers/health.py  /health
  routers/scan.py    POST /scan, GET /scan/{job_id}
  jobs.py            in-process background job store (poll for result)
  omr/pipeline.py    EXIF-normalize → homr → auto-beam
  omr/beaming.py     auto-beam (music21)
tests/test_health.py
```

## API

- `POST /scan` — multipart `file` (image) + optional `title`. Returns `{job_id, status}`.
- `GET /scan/{job_id}` — `{status: processing|ready|failed, title, musicxml?, error?}`.

## Run with Docker (recommended)

```bash
cd backend
docker compose up --build      # first build bakes homr's models in (slow once)
# → http://localhost:8000/health ; docs at /docs
```

## Run locally without Docker (uses the omr-eval venv that already has homr)

```powershell
# from repo root; the omr-eval venv already has homr + music21 installed
$venv = "..\omr-eval\.venv\Scripts"
& "$venv\python.exe" -m pip install fastapi "uvicorn[standard]" python-multipart pillow
$env:HOMR_BIN = "..\omr-eval\.venv\Scripts\homr.exe"
& "$venv\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Test it:

```bash
curl -F file=@some_score.jpg -F title="My piece" http://localhost:8000/scan
# → {"job_id":"...","status":"processing"}
curl http://localhost:8000/scan/<job_id>     # poll until status=ready, then musicxml is populated
```

## Notes

- Scans run in a background thread (~30-60s on CPU); the client polls `GET /scan/{job_id}`.
- Jobs are in-memory (lost on restart) — the mobile app persists the MusicXML locally.
- **Phone → this backend:** on a home Wi-Fi that isolates clients, use an **ngrok tunnel**
  (public URL) or USB `adb reverse tcp:8000 tcp:8000`. Cloud deployment comes later.
