import Foundation

enum Role { case patient, agent, system }

struct ChatItem: Identifiable {
    let id = UUID()
    let role: Role
    let event: StreamEvent
}
