package com.eli6movies.app.util

import android.annotation.SuppressLint
import android.webkit.CookieManager
import android.webkit.WebView
import com.eli6movies.app.BuildConfig

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
