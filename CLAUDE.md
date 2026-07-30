# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workflow — commit and push after each sub-task

**After completing every logical piece of work or sub-task, commit and push to `origin/main`.**

- Repo root is this directory (`sheet-music-trainer/` — the `.git` lives here). Remote is
  `origin` → `https://github.com/vantablade/Music-Report.git`, branch `main`. This is a
  solo repo; commit directly to `main` (no feature branches unless asked).
- **Only push when the tree is in a working state** — `npm run typecheck` and `npm test`
  pass for mobile changes; the backend imports/runs for backend changes. Never push a
  broken build or WIP that doesn't compile.
- Group changes into one coherent commit per sub-task with a message that says *why*, not
  just *what*. Do the standard `git add -A` from the repo root, `git commit`, `git push`.
- `mobile/android/`, `mobile/ios/`, `node_modules/`, `.venv/`, and `__pycache__/` are
  gitignored — they are regenerable build artifacts. Never force-add them.

## What this project is

Cross-platform (iOS + Android) app with two features: **(1)** scan printed sheet music into
MusicXML via OMR, and **(2)** live/record-then-analyze performance feedback (pitch, rhythm,
dynamics) while you play. Monophonic MVP; polyphonic is a later stretch. **MusicXML is the
canonical format** — rendering, playback, and the practice comparison timeline all derive
from it.

## Architecture (the parts that span multiple files)

```
mobile/    Expo SDK 51 + RN 0.74 + TypeScript app (Expo Router). NOT Expo Go.
backend/   FastAPI OMR service: image → EXIF-normalize → homr → auto-beam → MusicXML
omr-eval/  Python venv that already has homr + music21 (backend/run-local.ps1 uses it)
tools/     cloudflared.exe (quick tunnels so a phone can reach the local backend)
docs/      decisions.md + phase-1/2/3, running-on-android, testing-omr-locally
```

**Mobile is layered by concern — keep them separate:**

- `app/` — Expo Router routes. Tabs in `app/(tabs)/` (`index` Home, `library`, `settings`);
  stack screens `scan.tsx`, `score/[id].tsx`, `practice/[id].tsx`, `sign-in.tsx`. `app/_layout.tsx`
  loads fonts + providers (React Query, SafeArea) and gates auth.
- `src/api/` — backend HTTP calls (e.g. `scan.ts`: `POST /scan`, `GET /scan/{id}`).
- `src/scan/useScanPipeline.ts` — orchestrates one scan (upload → poll → MusicXML).
- `src/music/` — `parseMusicXML.ts` (MusicXML → note timeline) and `osmdHost.ts` (the HTML
  document run inside a WebView that renders notation with OpenSheetMusicDisplay and drives
  a WebAudio synth + cursor). Notation rendering is a WebView because OSMD is a DOM library.
- `src/audio/` + `src/practice/` — pitch detection (`pitchfinder`) and the score-follower /
  per-note comparison engine for performance feedback.
- `src/library/` — local persistence (`expo-sqlite`): `repository.ts`, `db.ts`, plus
  `practiceHistory.ts` (AsyncStorage last-practice for the Home card).
- `src/config/` — `env.ts` (typed `EXPO_PUBLIC_*`) and `backend.ts` (the **runtime-configurable
  backend URL**, stored in AsyncStorage, editable in Settings).
- `src/components/ui.tsx` + `src/theme.ts` — the "musical" design system (yellow/white,
  Hanken Grotesk). Presentation only; screens keep business logic in the `src/` layers above.

Data flow for a scan: `app/scan.tsx` → OS document scanner (crop/dewarp) → `createScan`
(multipart upload) → `useScanPipeline` polls → `addScore` persists MusicXML → `score/[id]`
renders it via `ScorePlayer` (OSMD WebView).

**Backend** is deliberately minimal: FastAPI + an **in-process `ThreadPoolExecutor` job store**
(`app/jobs.py`) — no Celery, no Redis, no database. Scans run ~30–60s on CPU; the client polls.
Jobs are in memory (lost on restart); the mobile app is the source of truth for saved scores.
The OMR engine is **homr** (deep-learning, ONNX) — chosen over Audiveris in a bake-off. homr
emits no beams, so `app/omr/beaming.py` adds them with music21.

> Note: the root `README.md` architecture/quick-start still describes an earlier design
> (Audiveris + Celery + Redis + Supabase backend). The **backend** is now homr + in-process
> jobs with no DB — trust `backend/README.md` and the code, not the root README, for the backend.

## Commands

**Mobile** (run from `mobile/`, Node 20 LTS):

```bash
npm install
npm run typecheck            # tsc --noEmit
npm run lint                 # eslint
npm test                     # jest (jest-expo)
npx jest src/practice/comparison.test.ts     # single test file
npx jest -t "detects wrong pitch"            # single test by name
npx expo start --dev-client  # JS-only iteration against an installed dev client
```

**Backend** (from `backend/`):

```powershell
./run-local.ps1              # runs uvicorn on 0.0.0.0:8000 from omr-eval/.venv-signed
# health: http://localhost:8000/health ; docs: /docs
```

**Expose the local backend to a physical phone** (Wi-Fi client isolation blocks LAN):

```powershell
../tools/cloudflared.exe tunnel --url http://localhost:8000
# copy the https://<random>.trycloudflare.com URL → paste into the app's Settings → Test → Save
```

## Building & installing a standalone APK

The app can't run in Expo Go (native modules: camera, document scanner, live audio). For
on-device testing without Metro, build a self-contained release APK.

```powershell
# JDK 17 (not 25) and Node 20 (not 24) required.
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot"
cd mobile/android
./gradlew.bat assembleRelease          # → app/build/outputs/apk/release/app-release.apk
# Sideload (Xiaomi blocks `adb install` with INSTALL_FAILED_USER_RESTRICTED):
adb push app/build/outputs/apk/release/app-release.apk /sdcard/Download/
# then install it from the phone's File Manager.
```

## Gotchas that will waste your time otherwise

- **The backend URL changes every session.** The cloudflared quick tunnel mints a new
  `*.trycloudflare.com` URL each run; it must be re-pasted into the app's Settings. This is
  the #1 reason scanning "stops working." A permanent deploy is future work.
- **Adding a native module does NOT require `expo prebuild`.** Android autolinking picks it
  up at gradle build time — just `npm install` it and rebuild the APK. Config plugins (in
  `app.json` `plugins`) only run during prebuild and mostly matter for iOS; adding a
  third-party config plugin that's incompatible with this SDK will *break the JS bundle step*
  (`createBundleReleaseJsAndAssets`). If a plugin's only job is an iOS permission you already
  set under `ios.infoPlist`, leave it out of `plugins`.
- **`expo-constants` is pinned to `16.0.2`** via `overrides` in `mobile/package.json`. Do not
  remove it — expo-router otherwise pulls the SDK-57 version and the Android build fails with
  "Plugin [id: 'expo-module-gradle-plugin'] was not found".
- **`mobile/ios/` does not exist yet** — only Android has been prebuilt. Generate it with
  `npx expo prebuild -p ios` when iOS work starts.
- **Auth is bypassable** in dev via `EXPO_PUBLIC_DEV_NO_AUTH=true` (in `mobile/.env`), so you
  can test library/scan/playback/feedback without Supabase.
- **Smart App Control blocks uv-managed Python.** This machine runs SAC enforced, which blocks
  unsigned `.pyd` files (`_ssl`, `_lzma`, …) in uv's Astral-built Python — so uvicorn and homr
  won't start there, and it recurs after every reboot. The backend therefore runs on
  `omr-eval/.venv-signed`, a venv built on a SAC-trusted **signed python.org 3.12**. If the
  backend dies with "An Application Control policy has blocked this file", rebuild that venv
  from a signed Python (`python.org`/Microsoft Store), not a uv-managed one. Diagnose with the
  `Microsoft-Windows-CodeIntegrity/Operational` event log (IDs 3033/3077).
