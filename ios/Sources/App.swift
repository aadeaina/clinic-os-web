import SwiftUI

@main
struct PatientApp: App {
    @StateObject private var lock = AppLock()

    var body: some Scene {
        WindowGroup {
            if lock.unlocked {
                ChatView()
            } else {
                AppLockView(lock: lock)
            }
        }
    }
}
