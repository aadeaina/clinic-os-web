package health.clinicos.patient.ui.lock

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import health.clinicos.patient.ui.chat.Teal

/** Biometric / device-credential gate shown before any conversation history. */
fun promptUnlock(activity: FragmentActivity, onUnlocked: () -> Unit) {
    val allowed = BiometricManager.Authenticators.BIOMETRIC_WEAK or
        BiometricManager.Authenticators.DEVICE_CREDENTIAL
    val mgr = BiometricManager.from(activity)
    if (mgr.canAuthenticate(allowed) != BiometricManager.BIOMETRIC_SUCCESS) {
        onUnlocked(); return  // production: require enrollment instead of bypassing
    }
    val prompt = BiometricPrompt(activity, ContextCompat.getMainExecutor(activity),
        object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) =
                onUnlocked()
        })
    prompt.authenticate(
        BiometricPrompt.PromptInfo.Builder()
            .setTitle("Unlock your clinic messages")
            .setAllowedAuthenticators(allowed)
            .build())
}

@Composable
fun AppLockScreen(onUnlock: () -> Unit) {
    Column(
        Modifier.fillMaxSize(), verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally) {
        Text("Your messages are protected")
        Spacer(Modifier.height(12.dp))
        Button(onClick = onUnlock,
            colors = ButtonDefaults.buttonColors(containerColor = Teal)) { Text("Unlock") }
    }
}
