import SwiftUI

/// Rendered when the intake agent is active and requests structured fields.
struct IntakeFormView: View {
    @State private var reason = ""
    @State private var dob = ""
    let onSubmit: ([String: String]) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Quick intake").font(.headline)
            TextField("Reason for visit", text: $reason).textFieldStyle(.roundedBorder)
            TextField("Date of birth", text: $dob).textFieldStyle(.roundedBorder)
            Button("Submit") {
                onSubmit(["reason_for_visit": reason, "dob": dob])
            }.buttonStyle(.borderedProminent).tint(.teal)
        }
        .padding()
    }
}
