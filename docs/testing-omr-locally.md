# Test the conversion locally (clean machine)

Goal: turn a photo/scan of sheet music into a **MusicXML** file on your own PC — no Supabase,
no Docker, no mobile app. This exercises the real conversion pipeline the app uses.

You need only **two things installed: Python and Audiveris.** The minimal path needs **no pip
packages** (OpenCV pre-processing is optional).

---

## 1. Python

You already have Python (3.11+ is fine). Check:

```powershell
python --version
```

The minimal test installs **no** Python packages.

## 2. Install Audiveris (the OMR engine)

Audiveris is a free, self-contained app — the Windows installer bundles its own Java runtime
and OCR, so you don't install Java separately.

1. Download the Windows installer from the releases page:
   https://github.com/Audiveris/audiveris/releases
   (pick the latest `Audiveris-*.exe` / `.msi` for Windows).
2. Run the installer.
3. Note where it installs the launcher — typically:
   `C:\Program Files\Audiveris\Audiveris.exe`
   (If it's elsewhere, find `Audiveris.exe` and use that full path below.)

> Sanity check the engine on its own first: open the Audiveris app, drag in a sheet-music
> image, and Export → MusicXML. If that works, the pipeline below will too.

## 3. Get a test image

Use a **clear, well-lit, straight-on** photo or scan of **simple** sheet music (a single
melody line works best for the monophonic MVP). PNG or JPG. Blurry/angled/handwritten scores
will give poor results.

## 4. Run the conversion

From the `backend` folder:

```powershell
cd "c:\Users\maksi\Downloads\VS-Code-Personal\sheet-music-trainer\backend"

python -m app.tools.omr_local "C:\path\to\your\score.jpg" `
  -o "C:\path\to\your\score.musicxml" `
  --no-preprocess `
  --audiveris "C:\Program Files\Audiveris\Audiveris.exe"
```

What you'll see:

```
• OpenCV not installed — running Audiveris on the raw image.
• Running Audiveris on score.jpg (this can take a while)…
✓ Wrote C:\path\to\your\score.musicxml  (12,345 bytes of MusicXML)
```

The first run can take a while. `score.musicxml` is your digital music file.

## 5. View the result

- Open the `.musicxml` in a text editor — it's XML; you'll see `<note>`, `<pitch>`, etc.
- To **see it as notation**, open it in **MuseScore** (free: https://musescore.org) — it reads
  MusicXML directly and will render/play it. This is the friendliest way to confirm the
  conversion worked.
- Later, the app itself renders it (Phase 2), but that needs the full stack.

---

## Optional: better accuracy with pre-processing

Dropping `--no-preprocess` runs the OpenCV cleanup (perspective correction, denoise, binarize,
deskew) that markedly improves Audiveris on phone photos. It needs two packages:

```powershell
pip install opencv-python-headless numpy
```

Then omit `--no-preprocess`. Add `--keep-cleaned cleaned.png` to inspect what Audiveris
actually saw.

> Note: if `pip install opencv-python-headless` fails on a very new Python (e.g. 3.14, no
> wheels yet), use Python 3.12 in a virtual environment for this step. The `--no-preprocess`
> path above avoids this entirely.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Audiveris binary not found` | Pass the correct `--audiveris "…\Audiveris.exe"` path. |
| `produced no .mxl/.xml export` | Image too unclear; try a cleaner/straighter scan, or the Audiveris GUI to inspect. |
| Poor note accuracy | Use a simpler, higher-contrast score; try the pre-processing path above. |
| Takes very long | Normal on first run / large images; Audiveris is thorough. |

## What this does and doesn't prove

- ✅ Proves the **core conversion** (image → MusicXML) works on your scores.
- ❌ Does **not** exercise upload, storage, auth, rendering, or the phone app — those need the
  full stack (see [phase-1.md](./phase-1.md) / [phase-2.md](./phase-2.md)).
