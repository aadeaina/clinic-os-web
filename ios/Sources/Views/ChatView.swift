import SwiftUI

struct ChatView: View {
    @StateObject private var vm = ChatViewModel()
    @State private var draft = ""

    private let samples = [
        "I need to book a follow-up next week",
        "I have chest pain and shortness of breath",
        "Check my coverage and copay",
    ]

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 10) {
                    ForEach(vm.items) { item in
                        row(for: item)
                    }
                    if let p = vm.pending {
                        PendingActionCard(summary: p.summary ?? "Confirm this action?",
                                          onConfirm: vm.confirm)
                    }
                }
                .padding()
            }
            composer
        }
        .background(Color(.systemGroupedBackground))
    }

    @ViewBuilder
    private func row(for item: ChatItem) -> some View {
        let ev = item.event
        switch ev.type {
        case "patient_text":
            MessageBubble(text: ev.text ?? "", mine: true)
        case "agent_msg", "final":
            if let t = ev.text, !t.isEmpty { MessageBubble(text: t, mine: false) }
        case "tool_use":
            ToolActivityRow(label: activity(ev.tool))
        case "routing":
            if let d = ev.decision {
                Text("routed to \(d.agent ?? d.intent)")
                    .font(.caption2).foregroundColor(.secondary)
            }
        case "escalate":
            EscalationCard(reason: ev.reason ?? "")
        default:
            EmptyView()
        }
    }

    private var composer: some View {
        VStack(spacing: 8) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack { ForEach(samples, id: \.self) { s in
                    Button(s) { vm.send(s) }
                        .font(.caption).padding(.horizontal, 10).padding(.vertical, 6)
                        .background(Capsule().stroke(Color.secondary.opacity(0.3)))
                } }
            }
            HStack {
                TextField("Message your clinic…", text: $draft)
                    .textFieldStyle(.roundedBorder)
                Button {
                    vm.send(draft); draft = ""
                } label: { Image(systemName: "arrow.up.circle.fill").font(.title2) }
                .disabled(vm.sending)
            }
        }
        .padding()
        .background(.thinMaterial)
    }

    private func activity(_ tool: String?) -> String {
        switch tool {
        case "check_availability": return "Checking availability…"
        case "book_appointment": return "Preparing your booking…"
        case "lookup_coverage": return "Looking up your coverage…"
        case "start_intake": return "Starting your intake…"
        default: return "Working…"
        }
    }
}
