package health.clinicos.patient.ui.chat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import health.clinicos.patient.data.ApiClient
import health.clinicos.patient.data.SseClient
import health.clinicos.patient.data.models.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class ChatState(
    val items: List<ChatItem> = emptyList(),
    val pending: StreamEvent? = null,
    val sending: Boolean = false,
)

class ChatViewModel(private val api: ApiClient, private val sse: SseClient) : ViewModel() {
    // Replace with a seeded clinic id from `python manage.py seed`.
    private val clinicId = "00000000-0000-0000-0000-000000000000"
    private var sessionId: String? = null

    private val _state = MutableStateFlow(ChatState())
    val state: StateFlow<ChatState> = _state.asStateFlow()

    fun send(text: String) {
        if (text.isBlank()) return
        val patientItem = ChatItem(Role.PATIENT, StreamEvent(type = "patient_text", text = text))
        _state.value = _state.value.copy(
            items = _state.value.items + patientItem, sending = true, pending = null)
        viewModelScope.launch {
            runCatching {
                val event = ConversationEvent(clinic_id = clinicId, patient_ref = "demo-patient",
                    text = text, session_id = sessionId)
                val sid = withContext(Dispatchers.IO) { api.postEvent(event) }
                sessionId = sid
                sse.stream(api.streamRequest(sid)).collect { ingest(it) }
            }
            _state.value = _state.value.copy(sending = false)
        }
    }

    fun confirm() {
        val sid = sessionId ?: return
        val aid = _state.value.pending?.action_id ?: return
        _state.value = _state.value.copy(pending = null)
        viewModelScope.launch {
            withContext(Dispatchers.IO) { runCatching { api.confirm(sid, aid) }.getOrNull() }
                ?.forEach { ingest(it) }
        }
    }

    private fun ingest(ev: StreamEvent) {
        _state.value = when (ev.type) {
            "pending" -> _state.value.copy(pending = ev)
            "agent_msg", "final", "tool_use", "routing", "escalate" ->
                _state.value.copy(items = _state.value.items + ChatItem(Role.AGENT, ev))
            else -> _state.value
        }
    }
}
