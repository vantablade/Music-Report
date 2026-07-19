# Sheet Music Trainer

Cross-platform (iOS + Android) app that scans printed sheet music into digital notation
(MusicXML) and gives real-time feedback while you play.

Two core features:

1. **Sheet Music Scanning (OMR)** — photograph a score → backend Audiveris pipeline → MusicXML.
2. **Live Audio Analysis** — listen via the mic, compare pitch & rhythm to the score, show
   live per-note feedback. (Monophonic MVP; polyphonic planned.)

## Architecture

```
mobile/   Expo + React Native + TypeScript app (Expo Dev Client, not Expo Go)
backend/  FastAPI gateway + Celery worker (OpenCV pre-process → Audiveris → MusicXML)
```

- **Canonical format:** MusicXML. Everything downstream derives from it.
- **Auth / DB / Storage:** Supabase (Postgres + Auth + object storage).
- **Jobs:** Celery + Redis (OMR is slow → always async).

See [docs/decisions](./docs/decisions.md) for the locked-in technical decisions and the full
phased plan.

## Status

**Phase 3 — Live audio analysis (monophonic)** complete. Play along with a score and get
real-time per-note pitch feedback (green/amber/red cursor + tuning meter) and an accuracy
summary. See [docs/phase-3.md](./docs/phase-3.md).

Roadmap:

- **Phase 0** — Foundation & scaffolding. ✅
- **Phase 1** — Scan → MusicXML end-to-end. ✅ ([docs/phase-1.md](./docs/phase-1.md)) · OMR parked ([decisions](./docs/decisions.md))
- **Phase 2** — Render (OSMD in WebView), local library, playback. ✅ ([docs/phase-2.md](./docs/phase-2.md))
- **Phase 3** — Live monophonic pitch/rhythm feedback. ✅
- **Phase 4** — Polyphonic stretch, native DSP, DTW score-following, offline, monetization.

## Quick start

Prerequisites: Node 20+, Python 3.11+, Docker, and a Supabase project.

```bash
# Backend (API + Redis + worker) via Docker
cd backend
cp .env.example .env      # fill in Supabase keys
docker compose up --build

# Mobile (requires a custom Dev Client build — see mobile/README.md)
cd mobile
npm install
npx expo start --dev-client
```

Full setup: [mobile/README.md](./mobile/README.md) and [backend/README.md](./backend/README.md).
