package health.clinicos.patient.ui.chat

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

val Teal = Color(0xFF0D7377)

@Composable
fun MessageBubble(text: String, mine: Boolean) {
    Row(Modifier.fillMaxWidth(),
        horizontalArrangement = if (mine) Arrangement.End else Arrangement.Start) {
        Text(
            text,
            color = if (mine) Color.White else Color(0xFF1E2A2A),
            modifier = Modifier
                .widthIn(max = 280.dp)
                .background(if (mine) Teal else Color(0xFFEDF4F3), RoundedCornerShape(18.dp))
                .padding(horizontal = 14.dp, vertical = 10.dp),
        )
    }
}
