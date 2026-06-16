# Patient App — iOS (SwiftUI)

Native patient chat client. Same backend contracts as the web console
(`/events`, `/sessions/{id}/stream` SSE, `/sessions/{id}/confirm`); `channel = "app"`.

## Run
1. Start the backend (`../backend`, on `:8000`).
2. `cp Config.example.xcconfig Config.xcconfig` and adjust `API_BASE` if needed
   (simulator uses `http://localhost:8000/api`).
3. Generate the project: `brew install xcodegen && xcodegen generate`
   (or create a new iOS App target in Xcode and add the `Sources/` files).
4. Open `PatientApp.xcodeproj`, pick a simulator, Run.
5. In `ChatViewModel.swift`, replace `clinicId` with an id from `python manage.py seed`.

## Notes
- SSE is parsed with `URLSession.bytes(for:)` — no third-party networking dependency.
- Only the auth token is persisted (Keychain). Conversation PHI is never written to disk.
- Face ID / passcode gates the app on launch (`AppLockView`).
- `NSAllowsLocalNetworking` is enabled for the local http backend in development only.
