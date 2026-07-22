# Handoff: "musical" — yellow/white redesign of Sheet Music Trainer

## Overview
A full visual + navigation redesign of the Expo/React Native app in `mobile/` (repo `vantablade/Music-Report`). The app scans printed sheet music (OMR → MusicXML), renders it (OSMD in a WebView), and gives live pitch feedback while practicing. This redesign rebrands it as **"musical"**: clean white surfaces, a single vivid yellow accent (#FFD60A), pill buttons, bottom-tab navigation, and a richer Home screen.

## About the Design Files
The files in this bundle are **design references created in HTML** — interactive prototypes showing intended look and behavior, **not production code to copy directly**. The task is to recreate these designs inside the existing Expo + React Native + TypeScript codebase (`mobile/`), using its established patterns: expo-router, StyleSheet, react-query, the existing repository/pipeline hooks. All existing business logic (`src/api`, `src/audio`, `src/library`, `src/music`, `src/practice`, `src/scan`) stays as-is — this is a UI-layer change.

- `Musical.dc.html` — the new design, interactive prototype (all screens + flows).
- `Current UI.dc.html` — faithful recreation of the current UI, for before/after reference.
- `ios-frame.jsx` — device-frame chrome used by the prototypes; ignore for implementation.

Open the .dc.html files in a browser to click through. All exact values (colors, spacing, sizes) are inline styles in `Musical.dc.html`.

## Fidelity
**High-fidelity.** Recreate the UI pixel-perfectly (translated to RN StyleSheet). The interactions in the prototype are simulated (fake OMR delay, fake pitch data); wire the real hooks instead.

## Design Tokens
Replace the old dark palette everywhere. Old → new:

| Role | Old | New |
|---|---|---|
| Screen background | `#0f1115` | `#FEFDF7` |
| Card / input surface | `#1a1e26` | `#FFFFFF` |
| Hairline border | `#2a3140` | `#EDEBDF` |
| Accent (buttons, FAB, cursor) | `#7aa2ff` | `#FFD60A` |
| Text on accent | `#0f1115` | `#171712` |
| Primary text | `#f5f7fa` | `#171712` |
| Muted text | `#8a93a3` / `#5f6a7d` | `#77766B` |
| Accent text/links on white | `#7aa2ff` | `#8A7500` |
| Accent tint (icon chips) | — | `#FFF7CC` |
| Correct | `#5fd08a` | `#1FA55C` |
| Near/off (was amber) | `#ffcf5f` | `#77766B` (grey) |
| Wrong | `#ff6b81` | `#D9503F` |
| Dark surface (scan screen, dark CTA) | — | `#171712` |
| Inactive track / meter track | `#1a1e26` | `#F2F0E4` |
| Faint glyphs (chevrons, tick) | — | `#C9C7B8` |

Suggested file: `mobile/src/theme.ts` exporting these as a `colors` object; refactor every screen's StyleSheet to use it.

**Typography:** Hanken Grotesk (`@expo-google-fonts/hanken-grotesk`, load in `_layout.tsx` via `useFonts`).
- Display / greeting: 26–34px, weight 800, letter-spacing -0.03em
- Screen titles (large): 28px / 800
- Card titles: 15–17px / 600–700
- Body: 13–15px / 400–500
- Micro-labels (e.g. "CONTINUE PRACTICING"): 11px / 700, letter-spacing 0.08em, uppercase, muted
- Buttons: 14–16px / 700

**Shape scale:**
- Buttons & chips: fully rounded pills (`borderRadius: 999`), primary padding ~15–16 vertical
- Cards & list rows: `borderRadius: 14–16`, 1px `#EDEBDF` border, no shadow
- Inputs: `borderRadius: 12`, padding 14–15, white bg, `#EDEBDF` border
- Icon chips in list rows: 34–38px square, `borderRadius: 10–11`, `#FFF7CC` bg
- FAB: 58px circle, `#FFD60A`, shadow `0 6px 18px rgba(23,23,18,.18)`

**Spacing:** screen padding 20px horizontal; section gaps 16–20px; list-row gaps 10px.

## Brand / Logo
Wordmark: lowercase **"musical"**, Hanken Grotesk 800, letter-spacing -0.02em, `#171712`.
Mark: yellow (#FFD60A) rounded square (radius ≈ 28% of size) with a black eighth-note glyph (♪) centered. Used at 26px (home header), 64px (sign-in). Reproduce as an SVG/PNG asset for the app icon.

## Navigation change
Replace the current pure-Stack layout with expo-router **tabs + stack**:
- `app/(tabs)/_layout.tsx` — bottom tab bar: Home, Library, Settings. Text-only labels (13.5px; active: weight 700 `#171712` with a 5px yellow dot below; inactive: weight 500 `#77766B`). Bar: `#FEFDF7`, top hairline `#EDEBDF`.
- Floating scan FAB above the tab bar, right: 20px, opens `/scan`. Icon: rounded-square outline (22px, 2.5px `#171712` border, radius 7) with a centered 8px dot — a viewfinder motif.
- Stack screens over tabs: `/scan`, `/score/[id]`, `/practice/[id]`, plus `/sign-in` (unauthenticated).
- Custom lightweight headers on stack screens: back text button in `#8A7500` ("‹ Back" / "‹ Library" / "‹ Score"), centered 15px/700 title, bottom hairline. Scan screen header is on dark: back in `#FFD60A`, title `#FEFDF7`.
- `StatusBar style="dark"` (light UI) except the scan screen (`light`).

## Screens

### 1. Sign-in (`app/sign-in.tsx`)
Vertically centered, 28px padding, gap 12. Logo mark 64px → wordmark "musical" 34px/800 → subtitle 15px `#77766B` ("Sign in to your library" / "Create an account"). Email + Password inputs (spec above). Primary pill button `#FFD60A` "Sign in"/"Sign up". Text link below in `#8A7500` toggling mode. Keep existing Supabase logic, busy spinner (dark on yellow), error `#D9503F` / notice `#1FA55C` texts.

### 2. Home — new screen (`app/(tabs)/index.tsx`)
Scrollable, padding 18–20px, gap 20, bottom padding ≥90 (clears FAB/tab bar):
1. Header row: 26px logo mark + "musical" 19px/800.
2. Greeting: "Welcome back.\nReady to play?" 26px/800, line-height 1.15.
3. **Continue practicing card** (white, radius 16): micro-label "CONTINUE PRACTICING"; row with score title 17px/700 + meta "Last session · 86% accuracy" 13px muted; right: 52px accuracy ring (yellow arc on `#F2F0E4`, white 40px center showing "86%" 12px/700 — use react-native-svg); full-width yellow pill "Practice". Source: most recently practiced score; hide card if none.
4. Quick actions row (3 equal white cards, radius 14, gap 10, hover/press: yellow border): Scan (viewfinder icon), Import (↓), Sample (♫) — wire to existing `importMusicXML` / `loadSampleScore` mutations and `/scan`.
5. **Recent**: header row "Recent" 15px/700 + "See library" link `#8A7500`; then up to 2 list rows (see Library row spec), from `listScores()`.

### 3. Library (`app/(tabs)/library.tsx`)
Large title "Library" 28px/800. Chip row: "Load sample", "Import MusicXML" (white pill chips, 13px/600). List rows: white card radius 14, padding 15–16; leading 38px `#FFF7CC` icon chip with ♪ in `#8A7500`; title 15.5px/600 + meta 12.5px muted (bpm · date); trailing "›" in `#C9C7B8`. Row → `/score/[id]`. Keep react-query refetch-on-focus, busy states, empty state (reuse copy from current app, restyled: title 20px/700 `#171712`, body muted, actions as chips).

### 4. Scan (`app/scan.tsx`) — dark screen, bg `#171712`
- **Camera stage:** full-bleed CameraView; yellow-stroked rounded frame guide (2px `rgba(255,214,10,.85)`, radius 14, inset ~28px sides); pill hint "Fill the frame · hold steady · good light" (13.5px `#FEFDF7` on `rgba(23,23,18,.72)`); 72px shutter — white circle with 5px `#FFD60A` ring. Permission states: same copy as today, restyled.
- **Review stage:** photo preview (radius 10) on dark; bottom sheet `#FEFDF7` with radius 20 top corners: label "Name this score" 13px/600 muted, title input, row of two pills — "Retake" (white/hairline) + "Scan" (yellow).
- **Processing:** centered yellow spinner (44px ring), title 16px/700 `#FEFDF7` ("Uploading image…" → "Reading the music…"), sub 13.5px `#9a9a8d` ("Recognizing notes takes about 30–60 seconds."). Failure state: title in `#D9503F`, "Try again" yellow pill, "Check backend settings" link `#FFD60A`. Keep `useScanPipeline` wiring and auto-save/navigate on ready.

### 5. Score (`app/score/[id].tsx` + `ScorePlayer.tsx`)
Header: "‹ Library" back, score title centered. Score area: white, OSMD WebView unchanged; playback cursor color → `#FFD60A`. Transport bar (top hairline, `#FEFDF7`, padding 14/20): 48px round yellow play/pause button (▶/❚❚ 17px `#171712`), tempo pill cycling 0.5×/0.75×/1× (white pill, 14px/700), right-aligned meta "N notes · N bpm" 12.5px muted. Below: full-width **dark** pill CTA — `#171712` bg, `#FFD60A` text, "Practice with feedback" → `/practice/[id]`.

### 6. Practice (`app/practice/[id].tsx`)
Header: "‹ Score" back + "Practice". Score area unchanged (follow cursor tinted by status: correct `#1FA55C`, near `#77766B`, wrong `#D9503F`). Bottom panel (top hairline, padding 18–20, gap 14):
- **Idle/running — tuning meter:** note name 34px/800 `#171712` ("—" when idle); track 8px `#F2F0E4` radius 4 with 2px center tick `#C9C7B8`; needle 6×16px radius 3, positioned `50 + cents`% (clamped 0–100), colored by status; cents text 13.5px muted ("+8¢" / "listening…").
- **Count-in:** 52px/800 `#171712` centered digits, "Go!" at zero (pulse opacity animation ~0.7s).
- **Button:** full-width pill — Start practice (yellow), Cancel during count-in (white/hairline), **Stop while running (dark `#171712` bg, `#FEFDF7` text)**.
- **Summary:** accuracy "86%" 46px/800 `#1FA55C`; line "36/42 notes correct · avg 11¢ off" 15px/600; breakdown "wrong 3 · sharp 1 · flat 0" 13px muted; "Practice again" yellow pill. Keep `usePracticeSession` logic; note the near/amber color is now grey.

### 7. Settings (`app/(tabs)/settings.tsx`)
Large title "Settings" 28px/800. One white card (radius 16, padding 18): "Backend URL" 15px/700; help text 13px muted; URL input; row of two pills — "Test connection" (white, shows "Testing…" busy) + "Save" (yellow, flips to "Saved ✓" 1.5s). Success line "✓ Connected — …" 13.5px/600 `#1FA55C`; failure in `#D9503F`. Below card: "Sign out" text button 14px/600 `#B4462F` (calls `supabase.auth.signOut()` — new).

## Interactions & Behavior
- Press states: yellow buttons darken slightly (RN: `opacity 0.85` or overlay); white cards/chips gain `#FFD60A` border on press.
- Tab switch: instant; active dot yellow.
- Scan flow: camera → review → processing → auto-navigate to `/score/[id]` (existing logic).
- Playback: play toggles ▶/❚❚; tempo cycles through steps.
- Practice: Start → count-in (default 3 beats) → live meter → summary on completion; Stop resets to idle.
- Disabled buttons: 40% opacity (as today).

## State Management
No new state architecture — reuse existing hooks (`useScanPipeline`, `usePracticeSession`, react-query for library). New UI state only: active tab (router-managed), sign-out action.

## Assets
- Logo mark: recreate as SVG (yellow rounded square + note glyph) — no binary asset included.
- Icons in the prototype are minimal CSS/unicode stand-ins (viewfinder square, ↓, ♪, ♫, ›). In RN, either reproduce with small SVGs or use a minimal icon set (e.g. lucide-react-native: `scan`, `download`, `music`, `chevron-right`) sized 20–22px, stroke `#171712`.
- Fonts: Hanken Grotesk via `@expo-google-fonts/hanken-grotesk`.

## Files
- `Musical.dc.html` — new design prototype (source of truth for all values)
- `Current UI.dc.html` — current UI recreation (before/after reference)
- `ios-frame.jsx` — prototype device chrome only

## Suggested Claude Code prompt
> Implement the redesign described in `design_handoff_musical_redesign/README.md` across the `mobile/` Expo app. Create `src/theme.ts` with the design tokens, load Hanken Grotesk, restructure navigation to tabs + stack as specified, then restyle each screen. Keep all existing business logic and hooks unchanged. Work screen by screen: theme → navigation → sign-in → home → library → scan → score → practice → settings.
