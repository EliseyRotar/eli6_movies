package com.eli6movies.app.player

import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.ActivityInfo
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.eli6movies.app.BuildConfig

class PlayerActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private var customView: View? = null
    private var customViewCallback: WebChromeClient.CustomViewCallback? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_USER_LANDSCAPE
        WindowCompat.setDecorFitsSystemWindows(window, false)
        hideSystemBars()

        webView = WebView(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            )
            setBackgroundColor(0xFF000000.toInt())
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                mediaPlaybackRequiresUserGesture = false
                useWideViewPort = true
                loadWithOverviewMode = true
                userAgentString = settings.userAgentString + " eli6movies-android/${BuildConfig.VERSION_NAME}"
                allowFileAccess = false
                allowContentAccess = false
            }
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    val url = request.url ?: return false
                    val host = url.host ?: return false
                    if (host.endsWith("eli6movies.vercel.app")) return false
                    // External link → open in browser, do not navigate inside player
                    runCatching { startActivity(Intent(Intent.ACTION_VIEW, url)) }
                    return true
                }
            }
            webChromeClient = object : WebChromeClient() {
                override fun onShowCustomView(view: View, callback: CustomViewCallback) {
                    if (customView != null) { callback.onCustomViewHidden(); return }
                    customView = view
                    customViewCallback = callback
                    (window.decorView as ViewGroup).addView(view, ViewGroup.LayoutParams(-1, -1))
                    hideSystemBars()
                }
                override fun onHideCustomView() {
                    customView?.let { v -> (window.decorView as ViewGroup).removeView(v) }
                    customView = null
                    customViewCallback?.onCustomViewHidden()
                    customViewCallback = null
                    hideSystemBars()
                }
            }
        }
        setContentView(webView)

        val url = intent?.data?.toString() ?: buildUrl()
        webView.loadUrl(url)
    }

    private fun buildUrl(): String {
        val type = intent.getStringExtra(EXTRA_TYPE) ?: "movie"
        val id = intent.getStringExtra(EXTRA_ID) ?: ""
        val live = intent.getStringExtra(EXTRA_LIVE_ID)
        return when {
            live != null -> BuildConfig.SITE_BASE_URL + "/live.html?match=" + Uri.encode(live) + "&fromApp=1"
            id.isNotBlank() -> BuildConfig.SITE_BASE_URL + "/watch/" + type + "/" + id + "?fromApp=1"
            else -> BuildConfig.SITE_BASE_URL + "/?fromApp=1"
        }
    }

    private fun hideSystemBars() {
        WindowInsetsControllerCompat(window, window.decorView).apply {
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            hide(WindowInsetsCompat.Type.systemBars())
        }
    }

    override fun onUserLeaveHint() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && packageManager.hasSystemFeature("android.software.picture_in_picture")) {
            runCatching { enterPictureInPictureMode() }
        }
        super.onUserLeaveHint()
    }

    override fun onPause() {
        webView.onPause(); webView.pauseTimers()
        super.onPause()
    }

    override fun onResume() {
        super.onResume()
        webView.onResume(); webView.resumeTimers()
        hideSystemBars()
    }

    override fun onDestroy() {
        runCatching {
            webView.stopLoading()
            (webView.parent as? ViewGroup)?.removeView(webView)
            webView.destroy()
        }
        super.onDestroy()
    }

    companion object {
        const val EXTRA_TYPE = "type"   // "movie" | "tv" | "anime"
        const val EXTRA_ID = "id"
        const val EXTRA_LIVE_ID = "live_id"
    }
}
