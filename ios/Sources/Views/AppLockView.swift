import SwiftUI
import LocalAuthentication

@MainActor
final class AppLock: ObservableObject {
    @Published var unlocked = false

    func authenticate() {
        let ctx = LAContext()
        var error: NSError?
        let reason = "Unlock to view your clinic messages"
        if ctx.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) {
            ctx.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { ok, _ in
                Task { @MainActor in self.unlocked = ok }
            }
        } else {
            // No biometrics/passcode enrolled — in production, require enrollment.
            unlocked = true
        }
    }
}

struct AppLockView: View {
    @ObservedObject var lock: AppLock
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "lock.shield").font(.system(size: 44)).foregroundColor(.teal)
            Text("Your messages are protected").font(.headline)
            Button("Unlock") { lock.authenticate() }.buttonStyle(.borderedProminent).tint(.teal)
        }
        .onAppear { lock.authenticate() }
    }
}
