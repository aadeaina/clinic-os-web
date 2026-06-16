package health.clinicos.patient.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import health.clinicos.patient.ui.chat.Teal

/** Shown when the intake agent requests structured fields. */
@Composable
fun IntakeForm(onSubmit: (Map<String, String>) -> Unit) {
    var reason by remember { mutableStateOf("") }
    var dob by remember { mutableStateOf("") }
    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Quick intake", style = MaterialTheme.typography.titleMedium)
        OutlinedTextField(reason, { reason = it }, label = { Text("Reason for visit") })
        OutlinedTextField(dob, { dob = it }, label = { Text("Date of birth") })
        Button(onClick = { onSubmit(mapOf("reason_for_visit" to reason, "dob" to dob)) },
            colors = ButtonDefaults.buttonColors(containerColor = Teal)) { Text("Submit") }
    }
}
