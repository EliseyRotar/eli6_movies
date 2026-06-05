package com.eli6movies.app.analytics

import android.content.Context
import com.eli6movies.app.BuildConfig
import com.eli6movies.app.data.api.RetrofitClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.UUID

/**
 * Mirrors frontend/js/s.js — sends pageviews, heartbeats, and active-duration to /api/data.
 * Reuses the OkHttpClient so cookies & TLS pooling are shared with the rest of the app.
 */
object Beacon {

    private const val PREFS = "eli6_beacon"
    private const val KEY_SID = "sid"
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private lateinit var appContext: Context
    private lateinit var sid: String

    private var currentPath: String = "/"
    private var visibleSince: Long? = null
    private var activeMs: Long = 0L

    fun init(context: Context) {
        appContext = context.applicationContext
        val sp = appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        sid = sp.getString(KEY_SID, null) ?: UUID.randomUUID().toString().also {
            sp.edit().putString(KEY_SID, it).apply()
        }
        startHeartbeat()
    }

    fun trackPath(path: String) {
        // flush the current path's duration before switching
        flushDuration()
        currentPath = path
        visibleSince = System.currentTimeMillis()
        send(buildJson("pv", path))
    }

    fun trackEvent(name: String, value: String? = null) {
        val json = JSONObject().apply {
            put("type", "evt")
            put("sid", sid)
            put("path", currentPath)
            put("name", name)
            value?.let { put("value", it) }
        }
        send(json.toString())
    }

    fun onResume() { visibleSince = System.currentTimeMillis() }
    fun onPause()  { flushDuration() }

    private fun flushDuration() {
        val start = visibleSince ?: return
        activeMs += System.currentTimeMillis() - start
        visibleSince = null
        val secs = (activeMs / 1000).toInt()
        if (secs > 0) {
            send(JSONObject().apply {
                put("type", "dur"); put("sid", sid); put("path", currentPath); put("dur", secs)
            }.toString())
            activeMs = 0L
        }
    }

    private fun buildJson(type: String, path: String): String =
        JSONObject().apply {
            put("type", type); put("sid", sid); put("path", path)
        }.toString()

    private fun send(payload: String) {
        scope.launch {
            try {
                val body = payload.toRequestBody("text/plain".toMediaType())
                val req = Request.Builder()
                    .url(BuildConfig.API_BASE_URL + "data")
                    .post(body)
                    .build()
                RetrofitClient.client.newCall(req).execute().close()
            } catch (_: Exception) { /* fire and forget */ }
        }
    }

    private fun startHeartbeat() {
        scope.launch {
            while (true) {
                delay(30_000)
                send(buildJson("hb", currentPath))
            }
        }
    }
}
