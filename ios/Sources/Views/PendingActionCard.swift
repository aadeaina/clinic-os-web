import SwiftUI

struct PendingActionCard: View {
    let summary: String
    let onConfirm: () -> Void
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Confirm to continue").font(.caption).foregroundColor(.orange)
            Text(summary).font(.subheadline)
            Button(action: onConfirm) {
                Text("Confirm").frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent).tint(.teal)
        }
        .padding()
        .background(RoundedRectangle(cornerRadius: 14).fill(Color.orange.opacity(0.08)))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.orange.opacity(0.3)))
    }
}

struct EscalationCard: View {
    let reason: String
    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill").foregroundColor(.red)
            VStack(alignment: .leading) {
                Text("Connecting you with a care team member").font(.subheadline)
                if reason == "urgent_symptom" {
                    Text("If this is an emergency, call 911.").font(.caption).foregroundColor(.red)
                }
            }
        }
        .padding()
        .background(RoundedRectangle(cornerRadius: 14).fill(Color.red.opacity(0.07)))
    }
}
