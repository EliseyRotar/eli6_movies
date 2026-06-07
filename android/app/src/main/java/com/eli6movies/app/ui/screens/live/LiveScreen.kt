package com.eli6movies.app.ui.screens.live

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.webkit.WebResourceRequest
import android.webkit.WebView
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import com.eli6movies.app.BuildConfig
import com.eli6movies.app.player.PlayerActivity
import com.eli6movies.app.util.Eli6WebViewClient
import com.eli6movies.app.util.applyEli6Defaults

// Intercepts the eli6app://play?embed=<url> scheme that sport-app.html
// uses to hand a stream off to the native fullscreen player. Everything
// else (eli6movies.vercel.app, /watch/..., pop-ad blocking, adblock)
// inherits from Eli6WebViewClient.
private class SportWebViewClient(context: Context) : Eli6WebViewClient(context) {
    private val ctx = context
    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
        val url = request.url
        if (url != null && url.scheme == "eli6app" && url.host == "play") {
            val embed = url.getQueryParameter("embed") ?: return true
            ctx.startActivity(
                Intent(ctx, PlayerActivity::class.java).apply {
                    data = Uri.parse(embed)
                }
            )
            return true
        }
        return super.shouldOverrideUrlLoading(view, request)
    }
}

@Composable
fun LiveScreen() {
    val ctx = LocalContext.current
    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = {
            WebView(ctx).apply {
                applyEli6Defaults()
                webViewClient = SportWebViewClient(ctx)
                loadUrl(BuildConfig.SITE_BASE_URL + "/app/sport?fromApp=1")
            }
        },
    )
}
