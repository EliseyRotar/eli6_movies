(function () {
    'use strict';

    var API = (window.API_BASE_URL || 'https://eli6movies.onrender.com/api').replace(/\/+$/, '');
    var start = Date.now();

    function sid() {
        var s = sessionStorage.getItem('_sid');
        if (!s) { s = crypto.randomUUID(); sessionStorage.setItem('_sid', s); }
        return s;
    }

    function send(payload) {
        // text/plain avoids CORS preflight — simple request works even during cold starts
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

    // Page view
    send({ type: 'pv', sid: sid(), path: location.pathname, ref: document.referrer || null,
           utm_source: utms.src || null, utm_medium: utms.med || null, utm_campaign: utms.camp || null });

    // Duration on tab close / navigate away
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') {
            send({ type: 'dur', sid: sid(), path: location.pathname, dur: Math.round((Date.now() - start) / 1000) });
        }
    });

    // Heartbeat every 30 s — keeps live count accurate
    setInterval(function () {
        send({ type: 'hb', sid: sid(), path: location.pathname });
    }, 30000);
})();
