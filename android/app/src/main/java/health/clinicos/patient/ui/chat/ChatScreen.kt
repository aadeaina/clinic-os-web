package health.clinicos.patient.ui.chat

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.viewmodel.compose.viewModel
import health.clinicos.patient.data.models.Role
import health.clinicos.patient.ui.components.*

private val samples = listOf(
    "I need to book a follow-up next week",
    "I have chest pain and shortness of breath",
    "Check my coverage and copay",
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(vm: ChatViewModel) {
    val state by vm.state.collectAsState()
    var draft by remember { mutableStateOf("") }

    Scaffold(bottomBar = {
        Column(Modifier.padding(12.dp)) {
            Row(Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                samples.forEach { s ->
                    AssistChip(onClick = { vm.send(s) }, label = { Text(s, fontSize = 12.sp) })
                }
            }
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                OutlinedTextField(draft, { draft = it }, Modifier.weight(1f),
                    placeholder = { Text("Message your clinic…") })
                IconButton(onClick = { vm.send(draft); draft = "" }, enabled = !state.sending) {
                    Text("Send", color = Teal)
                }
            }
        }
    }) { pad ->
        LazyColumn(Modifier.padding(pad).padding(horizontal = 12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(state.items) { item ->
                val ev = item.event
                when (ev.type) {
                    "patient_text" -> MessageBubble(ev.text ?: "", mine = true)
                    "agent_msg", "final" -> ev.text?.takeIf { it.isNotEmpty() }
                        ?.let { MessageBubble(it, mine = false) }
                    "tool_use" -> ToolActivityRow(ev.tool)
                    "routing" -> Text("routed to ${ev.decision?.agent ?: ev.decision?.intent}",
                        color = Color.Gray, fontSize = 11.sp, fontStyle = FontStyle.Italic)
                    "escalate" -> EscalationCard(ev.reason)
                }
            }
            state.pending?.let { p ->
                item { PendingActionCard(p.summary ?: "Confirm this action?", vm::confirm) }
            }
        }
    }
}
