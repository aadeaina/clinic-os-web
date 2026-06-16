package health.clinicos.patient.data.models

import kotlinx.serialization.Serializable

/** Outbound ingest payload. patientRef is an opaque token, never raw PII. */
@Serializable
data class ConversationEvent(
    val clinic_id: String,
    val channel: String = "app",
    val patient_ref: String,
    val text: String,
    val session_id: String? = null,
    val metadata: Map<String, String> = mapOf("platform" to "android"),
)

@Serializable
data class EventResponse(val session_id: String)

@Serializable
data class ConfirmResponse(val steps: List<StreamEvent>)

@Serializable
data class Decision(
    val intent: String,
    val agent: String? = null,
    val confidence: Double = 0.0,
    val urgent: Boolean = false,
)

/** One streamed step. `type` discriminates the payload (shared SSE/JSON contract). */
@Serializable
data class StreamEvent(
    val type: String,
    val agent: String? = null,
    val text: String? = null,
    val tool: String? = null,
    val summary: String? = null,
    val action_id: String? = null,
    val reason: String? = null,
    val decision: Decision? = null,
)

enum class Role { PATIENT, AGENT }

data class ChatItem(val role: Role, val event: StreamEvent)
