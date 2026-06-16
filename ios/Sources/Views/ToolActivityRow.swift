import SwiftUI

struct ToolActivityRow: View {
    let label: String
    var body: some View {
        HStack(spacing: 8) {
            ProgressView().scaleEffect(0.7)
            Text(label).font(.caption).foregroundColor(.secondary)
        }
        .padding(.vertical, 2)
    }
}
