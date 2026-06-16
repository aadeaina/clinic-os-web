package health.clinicos.patient.data

import health.clinicos.patient.data.models.StreamEvent
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.serialization.json.Json
import okhttp3.Request
import okhttp3.sse.EventSource
import okhttp3.sse.EventSourceListener
import okhttp3.sse.EventSources

/** SSE via OkHttp's EventSource, surfaced as a cold Flow of StreamEvent. */
class SseClient(private val api: ApiClient) {
    private val json = Json { ignoreUnknownKeys = true }

    fun stream(request: Request): Flow<StreamEvent> = callbackFlow {
        val factory = EventSources.createFactory(api.http)
        val source = factory.newEventSource(request, object : EventSourceListener() {
            override fun onEvent(es: EventSource, id: String?, type: String?, data: String) {
                if (type == "done") { close(); return }
                runCatching { json.decodeFromString(StreamEvent.serializer(), data) }
                    .getOrNull()?.let { trySend(it) }
            }
            override fun onClosed(es: EventSource) { close() }
            override fun onFailure(es: EventSource, t: Throwable?, r: okhttp3.Response?) { close() }
        })
        awaitClose { source.cancel() }
    }
}
