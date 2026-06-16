import Foundation

/// Server-Sent Events over URLSession.bytes — no third-party dependency.
/// Yields each decoded StreamEvent as it arrives, then finishes on the `done` event.
struct SSEClient {
    func stream(_ request: URLRequest) -> AsyncStream<StreamEvent> {
        AsyncStream { continuation in
            let task = Task {
                do {
                    let (bytes, _) = try await URLSession.shared.bytes(for: request)
                    var dataBuffer = ""
                    for try await line in bytes.lines {
                        if line.hasPrefix("event: done") { break }
                        if line.hasPrefix("data:") {
                            dataBuffer = String(line.dropFirst(5)).trimmingCharacters(in: .whitespaces)
                            if let d = dataBuffer.data(using: .utf8),
                               let ev = try? JSONDecoder().decode(StreamEvent.self, from: d) {
                                continuation.yield(ev)
                            }
                        }
                    }
                } catch { /* surface via UI state if desired */ }
                continuation.finish()
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }
}
