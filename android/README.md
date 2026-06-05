# ELI6 Movies — Android

Native Kotlin / Jetpack Compose client for [eli6movies.vercel.app](https://eli6movies.vercel.app).

## Architecture

| Layer | Tech |
|-------|------|
| UI | Jetpack Compose + Material 3 |
| Navigation | Navigation-Compose, bottom bar with 5 tabs |
| Player | Full-screen `WebView` Activity pointing at `eli6movies.vercel.app/watch/{type}/{id}?fromApp=1` |
| API | Retrofit + OkHttp + kotlinx.serialization, talking to `https://eli6movies.onrender.com/api` |
| Auth | HttpOnly JWT cookie persisted in `EncryptedSharedPreferences` |
| Analytics | `Beacon.kt` mirrors `frontend/js/s.js` — `pv` / `hb` / `dur` / `evt` events |
| Updates | `UpdateChecker.kt` polls GitHub Releases, downloads APK, `FileProvider` → `ACTION_VIEW` |

## Build

```bash
cd android
./gradlew assembleDebug          # produces app/build/outputs/apk/debug/app-debug.apk
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

JDK 21 and Android SDK platform 36 required (already installed at `/home/eli6/Android/sdk`).

## Release (auto via GitHub Actions)

```bash
git tag android-v0.2.0
git push origin android-v0.2.0
```

CI builds the release APK, signs it (if `ANDROID_KEYSTORE_BASE64` etc. secrets are set), creates a GitHub Release with the APK attached. Installed devices auto-prompt to update on next launch.

## Required GitHub Secrets (for signed releases)

| Name | What |
|------|------|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w 0 release.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password |
| `ANDROID_KEY_ALIAS` | key alias |
| `ANDROID_KEY_PASSWORD` | key password |

Without these the CI falls back to the debug-signed APK, which still installs fine on personal devices.

## Generating a release keystore (one time)

```bash
keytool -genkeypair -v -keystore release.jks -alias eli6 \
  -keyalg RSA -keysize 4096 -validity 36500 \
  -storetype pkcs12
```

Then base64-encode and store in GitHub Secrets.

## Package & versioning

- Application ID: `com.eli6movies.app`
- Tag pattern: `android-v{major}.{minor}.{patch}`
- Versioning rule: `versionCode = major*10000 + minor*100 + patch` (set in `app/build.gradle.kts`)
