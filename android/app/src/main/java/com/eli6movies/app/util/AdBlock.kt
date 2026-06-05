package com.eli6movies.app.util

import android.webkit.WebResourceResponse
import java.io.ByteArrayInputStream

// Hostname blocklist for the most common pop-ad / pop-under / tracker networks
// that streaming-iframe providers chain through. Sourced from EasyList, AdGuard
// streaming filter, and the most-reported domains for vidsrc/vixsrc/embed.su
// pop-ad behaviour. Suffix-matched, so "popads.net" also blocks "ads.popads.net".
object AdBlock {

    private val BLOCKED_SUFFIXES = setOf(
        // Pop-ads
        "popads.net", "popcash.net", "popcash.com", "propellerads.com", "propu.sh",
        "onclickperformance.com", "onclickservice.com", "onclkds.com", "onclicka.net",
        "hilltopads.com", "hilltopads.net", "adsterra.com", "adsterra.net",
        "adcash.com", "adexc.net", "trafficstars.com", "exoclick.com", "exosrv.com",
        "juicyads.com", "trafficjunky.net", "trafficjunky.com",
        // Notification spam
        "notifyserv.com", "notifyrich.com", "boostpush.io", "browser-push.net",
        // Direct-link / popunder gateways
        "clickadu.com", "redirectvoluum.com", "voluumtrk2.com",
        "yads.c.yimg.jp", "advecs.com", "googletagservices.com",
        // Common tracking
        "doubleclick.net", "googlesyndication.com", "google-analytics.com",
        "googletagmanager.com", "mc.yandex.ru", "scorecardresearch.com",
        "moatads.com", "adnxs.com",
        // Misc embed-provider ad chains
        "adskeeper.com", "mgid.com", "revcontent.com", "taboola.com", "outbrain.com",
        "linkbucks.com", "shorte.st", "ouo.io",
    )

    fun isBlocked(host: String?): Boolean {
        if (host == null) return false
        val lower = host.lowercase()
        return BLOCKED_SUFFIXES.any { lower == it || lower.endsWith(".$it") }
    }

    fun emptyResponse(): WebResourceResponse =
        WebResourceResponse("text/plain", "utf-8", ByteArrayInputStream(ByteArray(0)))
}
