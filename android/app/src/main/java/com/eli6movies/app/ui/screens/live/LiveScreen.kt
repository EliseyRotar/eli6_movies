package com.eli6movies.app.ui.screens.live

import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import com.eli6movies.app.BuildConfig
import com.eli6movies.app.util.applyEli6Defaults

@Composable
fun LiveScreen() {
    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { ctx ->
            WebView(ctx).apply {
                webViewClient = WebViewClient()
                applyEli6Defaults()
                loadUrl(BuildConfig.SITE_BASE_URL + "/live.html?fromApp=1")
            }
        },
    )
}
