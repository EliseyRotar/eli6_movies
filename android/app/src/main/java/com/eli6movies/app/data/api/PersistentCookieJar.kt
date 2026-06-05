package com.eli6movies.app.data.api

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import java.util.concurrent.ConcurrentHashMap

/**
 * Persists cookies (the JWT auth cookie) to EncryptedSharedPreferences so users stay logged in
 * across app restarts. Matches the cookie behaviour of the web client.
 */
class PersistentCookieJar(context: Context) : CookieJar {

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val prefs = EncryptedSharedPreferences.create(
        context,
        "eli6_secure_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    private val cache: MutableMap<String, MutableList<Cookie>> = ConcurrentHashMap()

    init { load() }

    @Synchronized
    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        val host = url.host
        val now = System.currentTimeMillis()
        val list = cache[host] ?: return emptyList()
        val valid = list.filter { it.expiresAt > now }
        if (valid.size != list.size) {
            cache[host] = valid.toMutableList()
            persist()
        }
        return valid
    }

    @Synchronized
    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        if (cookies.isEmpty()) return
        val list = cache.getOrPut(url.host) { mutableListOf() }
        cookies.forEach { newCookie ->
            list.removeAll { it.name == newCookie.name && it.path == newCookie.path }
            list += newCookie
        }
        persist()
    }

    @Synchronized
    fun clear() {
        cache.clear()
        prefs.edit().clear().apply()
    }

    private fun persist() {
        val joined = cache.entries.joinToString("|") { (host, cookies) ->
            host + "::" + cookies.joinToString(";;") { it.toString() }
        }
        prefs.edit().putString("cookies", joined).apply()
    }

    private fun load() {
        val raw = prefs.getString("cookies", null) ?: return
        if (raw.isBlank()) return
        raw.split("|").forEach { entry ->
            val parts = entry.split("::", limit = 2)
            if (parts.size != 2) return@forEach
            val host = parts[0]
            val cookies = parts[1].split(";;").mapNotNull { s ->
                val url = HttpUrl.Builder().scheme("https").host(host).build()
                Cookie.parse(url, s)
            }.toMutableList()
            if (cookies.isNotEmpty()) cache[host] = cookies
        }
    }
}
