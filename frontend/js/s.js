(function () {
    'use strict';

    var API = (window.API_BASE_URL || 'https://eli6movies.onrender.com/api').replace(/\/+$/, '');

    function sid() {
        var s = sessionStorage.getItem('_sid');
        if (!s) { s = crypto.randomUUID(); sessionStorage.setItem('_sid', s); }
        return s;
    }

    function send(payload) {
        // text/plain avoids CORS preflight — works even during cold starts
        var blob = new Blob([JSON.stringify(payload)], { type: 'text/plain' });
        navigator.sendBeacon(API + '/data', blob);
    }

    // UTM capture — persist for the whole session so multi-page visits stay attributed
    function getUtms() {
        var p = new URLSearchParams(location.search);
        var src  = p.get('utm_source');
        var med  = p.get('utm_medium');
        var camp = p.get('utm_campaign');
        if (src) {
            var stored = { src: src, med: med, camp: camp };
            try { sessionStorage.setItem('_utms', JSON.stringify(stored)); } catch (_) {}
            return stored;
        }
        try { return JSON.parse(sessionStorage.getItem('_utms') || 'null') || {}; } catch (_) { return {}; }
    }
    var utms = getUtms();

    // Filter same-domain referrers — internal navigation is not a real referrer
    var ref = document.referrer || null;
    try {
        if (ref && new URL(ref).hostname === location.hostname) ref = null;
    } catch (_) {}

    // Page view
    send({
        type: 'pv', sid: sid(), path: location.pathname, ref: ref,
        utm_source: utms.src || null, utm_medium: utms.med || null, utm_campaign: utms.camp || null,
    });

    // ── Duration: only count time the tab is actually visible ────────────────
    // Fixes the "8 minutes on page" problem where hidden/background time was counted.
    var activeMs    = 0;
    var visibleSince = document.visibilityState === 'visible' ? Date.now() : null;

    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') {
            if (visibleSince !== null) {
                activeMs += Date.now() - visibleSince;
                visibleSince = null;
            }
            var secs = Math.round(activeMs / 1000);
            if (secs > 0) {
                send({ type: 'dur', sid: sid(), path: location.pathname, dur: secs });
            }
        } else {
            // Tab became visible again — restart the visible timer
            visibleSince = Date.now();
        }
    });

    // Heartbeat every 30 s — keeps live count accurate
    setInterval(function () {
        send({ type: 'hb', sid: sid(), path: location.pathname });
    }, 30000);
})();
