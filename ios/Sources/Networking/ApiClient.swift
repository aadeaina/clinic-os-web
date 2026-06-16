import Foundation

/// REST + SSE client. Base URL comes from Config.xcconfig (API_BASE).
/// iOS simulator reaches a local backend at http://localhost:8000/api.
struct ApiClient {
    static let shared = ApiClient()

    var base: String {
        (Bundle.main.object(forInfoDictionaryKey: "API_BASE") as? String)
            ?? "http://localhost:8000/api"
    }

    private var token: String? { Keychain.read("auth_token") }

    private func request(_ path: String, method: String, body: Data? = nil) -> URLRequest {
        var req = URLRequest(url: URL(string: base + path)!)
        req.httpMethod = method
        req.httpBody = body
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        return req
    }

    func postEvent(_ event: ConversationEvent) async throws -> String {
        let body = try JSONEncoder().encode(event)
        let (data, _) = try await URLSession.shared.data(for: request("/events", method: "POST", body: body))
        return try JSONDecoder().decode(EventResponse.self, from: data).session_id
    }

    func confirm(sessionId: String, actionId: String) async throws -> [StreamEvent] {
        let body = try JSONSerialization.data(withJSONObject: ["action_id": actionId])
        let req = request("/sessions/\(sessionId)/confirm", method: "POST", body: body)
        let (data, _) = try await URLSession.shared.data(for: req)
        return try JSONDecoder().decode(ConfirmResponse.self, from: data).steps
    }

    func streamRequest(sessionId: String) -> URLRequest {
        request("/sessions/\(sessionId)/stream", method: "GET")
    }
}
