package com.eli6movies.app.ui.screens.profile

import android.annotation.SuppressLint
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import com.eli6movies.app.BuildConfig

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun ProfileScreen() {
    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { ctx ->
            WebView(ctx).apply {
                webViewClient = WebViewClient()
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                setBackgroundColor(0xFF0A0A0E.toInt())
                loadUrl(BuildConfig.SITE_BASE_URL + "/account.html?fromApp=1")
            }
        },
    )
}
