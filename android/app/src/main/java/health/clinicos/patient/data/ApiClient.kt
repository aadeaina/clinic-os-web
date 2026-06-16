package health.clinicos.patient.data

import health.clinicos.patient.BuildConfig
import health.clinicos.patient.data.models.*
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

class ApiClient(private val tokenProvider: () -> String?) {
    private val base = BuildConfig.API_BASE
    private val json = Json { ignoreUnknownKeys = true }
    val http = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)   // keep SSE open
        .build()
    private val JSON = "application/json".toMediaType()

    private fun req(path: String) = Request.Builder().url(base + path).apply {
        tokenProvider()?.let { header("Authorization", "Bearer $it") }
    }

    fun postEvent(event: ConversationEvent): String {
        val body = json.encodeToString(ConversationEvent.serializer(), event).toRequestBody(JSON)
        http.newCall(req("/events").post(body).build()).execute().use { r ->
            return json.decodeFromString(EventResponse.serializer(), r.body!!.string()).session_id
        }
    }

    fun confirm(sessionId: String, actionId: String): List<StreamEvent> {
        val body = """{"action_id":"$actionId"}""".toRequestBody(JSON)
        http.newCall(req("/sessions/$sessionId/confirm").post(body).build()).execute().use { r ->
            return json.decodeFromString(ConfirmResponse.serializer(), r.body!!.string()).steps
        }
    }

    fun streamRequest(sessionId: String): Request = req("/sessions/$sessionId/stream").build()
}
