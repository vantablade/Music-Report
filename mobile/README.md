# Mobile — Sheet Music Trainer

Expo + React Native + TypeScript. Uses **Expo Router** and a **custom Dev Client**
(not Expo Go — the app needs native modules for camera and, later, real-time audio).

## Setup

```bash
npm install
cp .env.example .env    # set EXPO_PUBLIC_API_URL + Supabase anon key
```

## Run on a physical Android phone (no backend)

Full clean-machine walkthrough: **[../docs/running-on-android.md](../docs/running-on-android.md)**.
Login is bypassed via `EXPO_PUBLIC_DEV_NO_AUTH=true` (already in `.env`), so no Supabase is
needed to test the library, playback, and live pitch feedback.

## Run (Dev Client required)

Because we depend on native modules, you must build a Dev Client once per native change,
then start the JS bundler against it:

```bash
# Build & install the dev client on a connected device / simulator:
npx expo run:ios       # or: npx expo run:android
#   (first run triggers `expo prebuild` to generate native projects)

# Subsequent JS-only work:
npx expo start --dev-client
```

> Expo Go will **not** work — it can't load the native modules this app uses.

## Layout

```
app/                 Expo Router routes
  _layout.tsx        Providers (React Query, SafeArea) + root Stack
  index.tsx          Home — Phase 0 backend health check
src/
  config/env.ts      Typed EXPO_PUBLIC_* config
  api/client.ts      fetch wrapper (attaches auth token, normalizes errors)
  api/health.ts      /health + /me endpoints
  auth/session.ts    Secure token storage (Supabase JWT)
```

## Scripts

- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint
- `npm test` — Jest (jest-expo)
