package health.clinicos.patient

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.viewmodel.compose.viewModel
import health.clinicos.patient.data.ApiClient
import health.clinicos.patient.data.SecureStore
import health.clinicos.patient.data.SseClient
import health.clinicos.patient.ui.chat.ChatScreen
import health.clinicos.patient.ui.chat.ChatViewModel
import health.clinicos.patient.ui.lock.AppLockScreen
import health.clinicos.patient.ui.lock.promptUnlock

// FragmentActivity is required for BiometricPrompt.
class MainActivity : FragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val store = SecureStore(this)
        val api = ApiClient(tokenProvider = { store.token })
        val sse = SseClient(api)

        setContent {
            var unlocked by remember { mutableStateOf(false) }
            if (unlocked) {
                val vm = remember { ChatViewModel(api, sse) }
                ChatScreen(vm)
            } else {
                AppLockScreen(onUnlock = { promptUnlock(this) { unlocked = true } })
                LaunchedEffect(Unit) { promptUnlock(this@MainActivity) { unlocked = true } }
            }
        }
    }
}
