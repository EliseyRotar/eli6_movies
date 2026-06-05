package com.eli6movies.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.lifecycleScope
import com.eli6movies.app.analytics.Beacon
import com.eli6movies.app.ui.AppRoot
import com.eli6movies.app.ui.theme.Eli6Theme
import com.eli6movies.app.update.UpdateChecker
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            Eli6Theme { AppRoot() }
        }

        // Background: check for an in-app update
        lifecycleScope.launch {
            UpdateChecker.checkAndPrompt(this@MainActivity)
        }
    }

    override fun onResume() {
        super.onResume()
        Beacon.onResume()
    }

    override fun onPause() {
        Beacon.onPause()
        super.onPause()
    }
}
