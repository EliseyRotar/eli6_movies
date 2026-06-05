package com.eli6movies.app.update

import android.app.AlertDialog
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.util.Log
import android.widget.Toast
import androidx.core.content.FileProvider
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.lifecycleScope
import com.eli6movies.app.BuildConfig
import com.eli6movies.app.data.api.RetrofitClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

object UpdateChecker {

    private const val TAG = "Eli6Update"

    suspend fun checkAndPrompt(
        activity: androidx.activity.ComponentActivity,
        verbose: Boolean = false,
    ) {
        val current = BuildConfig.VERSION_NAME.removeSuffix("-debug")
        Log.i(TAG, "checking for update; current=$current repo=${BuildConfig.GITHUB_REPO}")
        val result = withContext(Dispatchers.IO) { fetchLatestRelease() }
        when (result) {
            is FetchResult.Error -> {
                Log.w(TAG, "fetch failed: ${result.reason}")
                if (verbose) activity.runOnUiThread {
                    Toast.makeText(activity, "Update check failed: ${result.reason}", Toast.LENGTH_LONG).show()
                }
                return
            }
            is FetchResult.Ok -> {
                val tag = result.tag
                val apkUrl = result.apkUrl
                val releaseBody = result.notes
                Log.i(TAG, "latest=$tag asset=$apkUrl")
                if (!isNewer(tag, current)) {
                    if (verbose) activity.runOnUiThread {
                        Toast.makeText(activity, "You're on the latest version ($current)", Toast.LENGTH_SHORT).show()
                    }
                    return
                }
                activity.runOnUiThread {
                    AlertDialog.Builder(activity)
                        .setTitle("Update available")
                        .setMessage("v$tag is out. You're on $current.\n\n$releaseBody")
                        .setPositiveButton("Update") { _, _ ->
                            Toast.makeText(activity, "Downloading v$tag…", Toast.LENGTH_SHORT).show()
                            (activity as LifecycleOwner).lifecycleScope.launch {
                                val file = withContext(Dispatchers.IO) { downloadApk(activity, apkUrl, tag) }
                                if (file != null) installApk(activity, file)
                                else Toast.makeText(activity, "Download failed", Toast.LENGTH_LONG).show()
                            }
                        }
                        .setNegativeButton("Later", null)
                        .show()
                }
            }
        }
    }

    private sealed class FetchResult {
        data class Ok(val tag: String, val apkUrl: String, val notes: String) : FetchResult()
        data class Error(val reason: String) : FetchResult()
    }

    private fun fetchLatestRelease(): FetchResult {
        return try {
            val req = Request.Builder()
                .url("https://api.github.com/repos/${BuildConfig.GITHUB_REPO}/releases")
                .addHeader("Accept", "application/vnd.github+json")
                .addHeader("User-Agent", "eli6movies-android/${BuildConfig.VERSION_NAME}")
                .build()
            val resp = RetrofitClient.client.newCall(req).execute()
            if (!resp.isSuccessful) {
                val code = resp.code
                resp.close()
                return FetchResult.Error("HTTP $code")
            }
            val body = resp.body?.string().orEmpty()
            resp.close()
            val arr = JSONArray(body)
            var pick: JSONObject? = null
            for (i in 0 until arr.length()) {
                val item = arr.getJSONObject(i)
                val tag = item.optString("tag_name", "")
                if (tag.startsWith(BuildConfig.GITHUB_RELEASE_PREFIX) &&
                    !item.optBoolean("draft") && !item.optBoolean("prerelease")) {
                    pick = item; break
                }
            }
            val r = pick ?: return FetchResult.Error("no matching release")
            val tag = r.getString("tag_name").removePrefix(BuildConfig.GITHUB_RELEASE_PREFIX)
            val assets = r.getJSONArray("assets")
            var apk: String? = null
            for (i in 0 until assets.length()) {
                val a = assets.getJSONObject(i)
                if (a.optString("name").endsWith(".apk")) {
                    apk = a.optString("browser_download_url"); break
                }
            }
            val notes = r.optString("body").take(500)
            if (apk == null) FetchResult.Error("no APK asset")
            else FetchResult.Ok(tag, apk, notes)
        } catch (e: Exception) {
            Log.e(TAG, "fetch error", e)
            FetchResult.Error(e.javaClass.simpleName + ": " + (e.message ?: ""))
        }
    }

    private fun isNewer(remote: String, local: String): Boolean {
        val r = remote.split(".").mapNotNull { it.toIntOrNull() }
        val l = local.split(".").mapNotNull { it.toIntOrNull() }
        val size = maxOf(r.size, l.size)
        for (i in 0 until size) {
            val rp = r.getOrElse(i) { 0 }
            val lp = l.getOrElse(i) { 0 }
            if (rp != lp) return rp > lp
        }
        return false
    }

    private fun downloadApk(activity: androidx.activity.ComponentActivity, url: String, tag: String): File? = try {
        val out = File(activity.cacheDir, "updates").also { it.mkdirs() }
        val target = File(out, "eli6movies-$tag.apk")
        val req = Request.Builder().url(url).build()
        val resp = RetrofitClient.client.newCall(req).execute()
        resp.body?.byteStream()?.use { input ->
            target.outputStream().use { input.copyTo(it) }
        }
        resp.close()
        target
    } catch (e: Exception) {
        Log.e(TAG, "download error", e); null
    }

    private fun installApk(activity: androidx.activity.ComponentActivity, apk: File) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !activity.packageManager.canRequestPackageInstalls()) {
            val settings = Intent(
                android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:${activity.packageName}"),
            )
            activity.startActivity(settings)
            return
        }
        val uri: Uri = FileProvider.getUriForFile(
            activity,
            "${activity.packageName}.fileprovider",
            apk,
        )
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        activity.startActivity(intent)
    }
}
