import Foundation

@MainActor
final class ChatViewModel: ObservableObject {
    @Published var items: [ChatItem] = []
    @Published var pending: StreamEvent?
    @Published var sessionId: String?
    @Published var sending = false

    // Replace with a seeded clinic id from `python manage.py seed`.
    private let clinicId = "00000000-0000-0000-0000-000000000000"
    private let api = ApiClient.shared
    private let sse = SSEClient()

    func send(_ text: String) {
        guard !text.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        items.append(ChatItem(role: .patient,
                              event: StreamEvent(type: "patient_text", agent: nil, text: text,
                                                 tool: nil, summary: nil, action_id: nil,
                                                 reason: nil, decision: nil, output: nil)))
        sending = true
        pending = nil
        Task { await run(text) }
    }

    private func run(_ text: String) async {
        do {
            let event = ConversationEvent(clinic_id: clinicId, channel: "app",
                                          patient_ref: "demo-patient", text: text,
                                          session_id: sessionId)
            let sid = try await api.postEvent(event)
            sessionId = sid
            for await ev in sse.stream(api.streamRequest(sessionId: sid)) {
                ingest(ev)
            }
        } catch { /* present a non-PHI error banner in production */ }
        sending = false
    }

    func confirm() {
        guard let sid = sessionId, let aid = pending?.action_id else { return }
        let confirming = pending
        pending = nil
        Task {
            if let steps = try? await api.confirm(sessionId: sid, actionId: aid) {
                steps.forEach { ingest($0) }
            } else {
                pending = confirming   // restore on failure so the user can retry
            }
        }
    }

    private func ingest(_ ev: StreamEvent) {
        switch ev.type {
        case "pending": pending = ev
        case "agent_msg", "final", "tool_use", "tool_result", "routing", "escalate":
            items.append(ChatItem(role: .agent, event: ev))
        default: break
        }
    }
}
