import SwiftUI

struct MessageBubble: View {
    let text: String
    let mine: Bool
    var body: some View {
        HStack {
            if mine { Spacer(minLength: 40) }
            Text(text)
                .padding(.horizontal, 14).padding(.vertical, 10)
                .background(mine ? Color.teal : Color(.secondarySystemBackground))
                .foregroundColor(mine ? .white : .primary)
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            if !mine { Spacer(minLength: 40) }
        }
    }
}

extension Color { static let teal = Color(red: 0.05, green: 0.45, blue: 0.47) }
