package health.clinicos.patient.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import health.clinicos.patient.ui.chat.Teal

@Composable
fun PendingActionCard(summary: String, onConfirm: () -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = Color(0x14F59E0B))) {
        Column(Modifier.padding(16.dp)) {
            Text("Confirm to continue", color = Color(0xFFB45309))
            Spacer(Modifier.height(6.dp))
            Text(summary)
            Spacer(Modifier.height(10.dp))
            Button(onClick = onConfirm,
                colors = ButtonDefaults.buttonColors(containerColor = Teal),
                modifier = Modifier.fillMaxWidth()) { Text("Confirm") }
        }
    }
}

@Composable
fun EscalationCard(reason: String?) {
    Card(colors = CardDefaults.cardColors(containerColor = Color(0x11EF4444))) {
        Column(Modifier.padding(16.dp)) {
            Text("Connecting you with a care team member")
            if (reason == "urgent_symptom") {
                Text("If this is an emergency, call 911.", color = Color(0xFFDC2626))
            }
        }
    }
}
