package com.eli6movies.app.ui.screens.mylist

import android.webkit.WebView
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import com.eli6movies.app.BuildConfig
import com.eli6movies.app.util.Eli6WebViewClient
import com.eli6movies.app.util.applyEli6Defaults

@Composable
fun MyListScreen() {
    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { ctx ->
            WebView(ctx).apply {
                webViewClient = Eli6WebViewClient(ctx)
                applyEli6Defaults()
                loadUrl(BuildConfig.SITE_BASE_URL + "/mylist.html?fromApp=1")
            }
        },
    )
}
