# Patient App — Android (Kotlin + Jetpack Compose)

Native patient chat client. Same backend contracts as the web console
(`/events`, `/sessions/{id}/stream` SSE, `/sessions/{id}/confirm`); `channel = "app"`.

## Run
1. Start the backend (`../backend`, on `:8000`).
2. `cp local.properties.example local.properties`; set `sdk.dir` and keep
   `API_BASE=http://10.0.2.2:8000/api` (the emulator's alias for your host's localhost).
3. Generate the Gradle wrapper once: `gradle wrapper` (or open the folder in Android Studio,
   which provisions it). Then `./gradlew :app:installDebug` or Run from Android Studio.
4. In `ChatViewModel.kt`, replace `clinicId` with an id from `python manage.py seed`.

## Notes
- SSE uses OkHttp `okhttp-sse` EventSource, surfaced as a Kotlin Flow.
- Only the auth token is persisted (EncryptedSharedPreferences). Conversation PHI is never
  written to disk.
- BiometricPrompt (biometric or device credential) gates the app on launch.
- `usesCleartextTraffic` is enabled for the local http backend in development only.
