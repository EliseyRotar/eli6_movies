package com.eli6movies.app.util

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.webkit.CookieManager
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import com.eli6movies.app.BuildConfig
import com.eli6movies.app.player.PlayerActivity

// Shared WebView setup: enable JS/storage, strip the "; wv)" UA marker so embed
// providers don't blocklist us, and accept third-party cookies so the cross-origin
// /api/* JWT cookie persists across navigations (fix for the "different account /
// no MyList" bug seen in the Profile/MyList tabs).
@SuppressLint("SetJavaScriptEnabled")
fun WebView.applyEli6Defaults() {
    settings.javaScriptEnabled = true
    settings.domStorageEnabled = true
    settings.mediaPlaybackRequiresUserGesture = false
    settings.useWideViewPort = true
    settings.loadWithOverviewMode = true
    settings.userAgentString = settings.userAgentString
        .replace(Regex("\\s*;\\s*wv\\)"), ")") +
        " eli6movies/${BuildConfig.VERSION_NAME}"
    setBackgroundColor(0xFF0A0A0E.toInt())

    CookieManager.getInstance().setAcceptCookie(true)
    CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)
}

// Regex matches both /watch/<type>/<id> (existing) and /app/watch/<type>/<id> (mobile player).
private val WATCH_PATH = Regex("""^/(?:app/)?watch/(movie|tv|anime)/(\d+)$""")

/**
 * WebViewClient that opens any /watch/<type>/<id> link inside PlayerActivity
 * instead of loading it inside the same WebView. External http(s) hosts that
 * aren't ours fall through to the default behaviour.
 */
open class Eli6WebViewClient(private val context: Context) : WebViewClient() {
    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
        val url = request.url ?: return false
        val host = url.host ?: return false
        if (host.endsWith("eli6movies.vercel.app")) {
            // /watch/<type>/<id> → hand off to the native PlayerActivity instead
            // of loading the page inside this WebView
            val m = WATCH_PATH.matchEntire(url.path ?: "")
            if (m != null) {
                val (type, id) = m.destructured
                context.startActivity(
                    Intent(context, PlayerActivity::class.java).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        putExtra(PlayerActivity.EXTRA_TYPE, type)
                        putExtra(PlayerActivity.EXTRA_ID, id)
                    }
                )
                return true
            }
            return false
        }
        // Sub-frame nav (embed iframe loading itself) — allow
        if (!request.isForMainFrame) return false
        // External top-level nav from a tab WebView = pop-ad. Block silently.
        return true
    }

    override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
        return if (AdBlock.isBlocked(request.url?.host)) AdBlock.emptyResponse() else null
    }
}
