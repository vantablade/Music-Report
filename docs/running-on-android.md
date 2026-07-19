# Running the app on a physical Android phone (Windows)

Get the app onto your Android phone so you can test the library, playback, and **live pitch
feedback**. Login is bypassed (`EXPO_PUBLIC_DEV_NO_AUTH=true` is already set in `mobile/.env`),
so **no Supabase/backend is needed**.

This is a real one-time setup (~30–60 min, mostly downloads). Do the steps in order.

---

## 1. Install Node.js (LTS)

Download the **LTS** installer from https://nodejs.org and install with defaults. Verify:

```powershell
node --version   # v20+ 
npm --version
```

## 2. Install Java JDK 17

Android's Gradle build needs JDK 17. Install **Eclipse Temurin 17** from
https://adoptium.net (MSI installer; tick "Set JAVA_HOME" if offered). Verify in a **new**
terminal:

```powershell
java -version    # should say 17.x
```

## 3. Install Android Studio (for the SDK + build tools)

Download from https://developer.android.com/studio and install with defaults. Launch it once
and let it finish downloading the default SDK. Then:

- **More Actions → SDK Manager → SDK Platforms**: tick a recent Android (e.g. **API 34**).
- **SDK Tools** tab: ensure **Android SDK Platform-Tools** and **Android SDK Build-Tools** are
  checked. Apply.

Set the env vars so the CLI finds the SDK (run in PowerShell, then **restart the terminal**):

```powershell
setx ANDROID_HOME "$env:LOCALAPPDATA\Android\Sdk"
setx PATH "$env:PATH;$env:LOCALAPPDATA\Android\Sdk\platform-tools"
```

Verify (new terminal): `adb --version` should work.

## 4. Prepare your phone

- On the phone: **Settings → About phone → tap "Build number" 7 times** to enable Developer
  options.
- **Settings → System → Developer options → enable "USB debugging"**.
- Plug the phone into the PC via USB. On the phone, tap **Allow** on the "Allow USB debugging?"
  prompt.
- Verify the PC sees it:

```powershell
adb devices     # should list your device as "device" (not "unauthorized")
```

## 5. Install app dependencies

```powershell
cd "c:\Users\maksi\Downloads\VS-Code-Personal\sheet-music-trainer\mobile"
npm install
```

## 6. Build & run on the phone

This compiles the native Dev Client, installs it on your phone, and starts the bundler:

```powershell
npx expo run:android
```

- First run is slow (Gradle downloads + native build — several minutes).
- It runs `expo prebuild` automatically to generate the native `android/` project.
- When done, the app launches on your phone. Leave the terminal running (it serves the JS).
- Later JS-only changes: just save files; the app hot-reloads. To relaunch: `npx expo start --dev-client`.

---

## Try it

1. App opens straight to the home screen (login bypassed).
2. **My library → Load sample** → opens "Ode to Joy".
3. On the score screen, press **Play** to hear it with the moving cursor.
4. Press **Practice with feedback**, then **Start practice**. After the 3-2-1 count-in, play or
   sing the notes — the cursor tints green (in tune) / amber (off) / red (wrong), the tuning
   meter tracks your pitch, and you get an accuracy summary at the end.
   - Grant the microphone permission when prompted (first run), then Start again.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `adb devices` shows "unauthorized" | Re-plug; tap **Allow** on the phone's USB-debugging prompt. |
| `SDK location not found` | Ensure `ANDROID_HOME` is set (step 3) and restart the terminal. |
| `JAVA_HOME`/Gradle JDK errors | Confirm `java -version` is 17; reinstall Temurin 17 with JAVA_HOME. |
| Build fails on first `run:android` | Run it again (first Gradle sync sometimes needs a second pass). |
| Notation doesn't render | The WebView loads OSMD from a CDN — ensure the phone has internet on first open. |
| No mic response in practice | Confirm the mic permission was granted (Android app settings), and you're in a quiet room close to the mic. |

## Notes

- **Expo Go won't work** — this app needs native modules, hence the Dev Client build above.
- To test the **real login** later, set `EXPO_PUBLIC_DEV_NO_AUTH=false` in `mobile/.env` and add
  your Supabase URL + anon key.
