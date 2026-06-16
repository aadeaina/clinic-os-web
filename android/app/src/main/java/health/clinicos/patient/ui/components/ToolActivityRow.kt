package health.clinicos.patient.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun ToolActivityRow(tool: String?) {
    val label = when (tool) {
        "check_availability" -> "Checking availability…"
        "book_appointment" -> "Preparing your booking…"
        "lookup_coverage" -> "Looking up your coverage…"
        "start_intake" -> "Starting your intake…"
        else -> "Working…"
    }
    Row(verticalAlignment = Alignment.CenterVertically) {
        CircularProgressIndicator(strokeWidth = 2.dp, modifier = Modifier.size(14.dp))
        Spacer(Modifier.width(8.dp))
        Text(label, color = Color.Gray, fontSize = 13.sp)
    }
}
