import Foundation

/// One streamed step. Decodes the shared SSE/JSON contract; `type` discriminates.
struct StreamEvent: Decodable, Identifiable {
    let id = UUID()
    let type: String
    let agent: String?
    let text: String?
    let tool: String?
    let summary: String?
    let action_id: String?
    let reason: String?
    let decision: Decision?
    let output: [String: AnyCodable]?

    struct Decision: Decodable {
        let intent: String
        let agent: String?
        let confidence: Double
        let urgent: Bool
    }

    private enum CodingKeys: String, CodingKey {
        case type, agent, text, tool, summary, action_id, reason, decision, output
    }
}

/// Minimal type-erased JSON value so tool outputs decode without a fixed schema.
struct AnyCodable: Decodable {
    let value: Any
    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if let v = try? c.decode(String.self) { value = v }
        else if let v = try? c.decode(Int.self) { value = v }
        else if let v = try? c.decode(Double.self) { value = v }
        else if let v = try? c.decode(Bool.self) { value = v }
        else { value = "" }
    }
}
