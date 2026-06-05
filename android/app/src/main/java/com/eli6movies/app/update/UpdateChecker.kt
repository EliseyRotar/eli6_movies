package com.eli6movies.app.update

import android.app.AlertDialog
import android.content.Intent
import android.net.Uri
import android.os.Build
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

/**
 * Polls the GitHub Releases API for tags prefixed `android-v` and prompts the user to install
 * a newer APK. Works because the project ships releases via the GitHub Actions workflow.
 */
object UpdateChecker {

    suspend fun checkAndPrompt(activity: androidx.activity.ComponentActivity) {
        val latest = withContext(Dispatchers.IO) { fetchLatestRelease() } ?: return
        val (tag, apkUrl, releaseBody) = latest
        val current = BuildConfig.VERSION_NAME.removeSuffix("-debug")
        if (!isNewer(tag, current)) return

        activity.runOnUiThread {
            AlertDialog.Builder(activity)
                .setTitle("Update available")
                .setMessage("v$tag is out. You're on $current.\n\n$releaseBody")
                .setPositiveButton("Update") { _, _ ->
                    (activity as LifecycleOwner).lifecycleScope.launch {
                        val file = withContext(Dispatchers.IO) { downloadApk(activity, apkUrl, tag) }
                        if (file != null) installApk(activity, file)
                    }
                }
                .setNegativeButton("Later", null)
                .show()
        }
    }

    private fun fetchLatestRelease(): Triple<String, String, String>? {
        return try {
            val req = Request.Builder()
                .url("https://api.github.com/repos/${BuildConfig.GITHUB_REPO}/releases")
                .addHeader("Accept", "application/vnd.github+json")
                .build()
            val resp = RetrofitClient.client.newCall(req).execute()
            if (!resp.isSuccessful) { resp.close(); return null }
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
            val r = pick ?: return null
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
            if (apk == null) null else Triple(tag, apk, notes)
        } catch (_: Exception) { null }
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
    } catch (_: Exception) { null }

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
