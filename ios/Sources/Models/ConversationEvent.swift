import Foundation

/// Outbound ingest payload. `patientRef` is an opaque token, never raw PII.
struct ConversationEvent: Encodable {
    let clinic_id: String
    let channel: String          // always "app" for this client
    let patient_ref: String
    let text: String
    var session_id: String?
    var metadata: [String: String] = ["platform": "ios"]
}

struct EventResponse: Decodable { let session_id: String }
struct ConfirmResponse: Decodable { let steps: [StreamEvent] }
