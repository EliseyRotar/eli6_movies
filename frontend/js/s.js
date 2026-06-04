(function () {
    'use strict';

    var API = (window.API_BASE_URL || 'https://eli6movies.onrender.com/api').replace(/\/+$/, '');

    function sid() {
        var s = sessionStorage.getItem('_sid');
        if (!s) { s = crypto.randomUUID(); sessionStorage.setItem('_sid', s); }
        return s;
    }

    function send(payload) {
        try {
            var blob = new Blob([JSON.stringify(payload)], { type: 'text/plain' });
            navigator.sendBeacon(API + '/data', blob);
        } catch (_) {}
    }

    // UTM capture — persist for the whole session
    function getUtms() {
        var p = new URLSearchParams(location.search);
        var src  = p.get('utm_source');
        var med  = p.get('utm_medium');
        var camp = p.get('utm_campaign');
        var cont = p.get('utm_content');
        if (src) {
            var stored = { src: src, med: med, camp: camp, cont: cont };
            try { sessionStorage.setItem('_utms', JSON.stringify(stored)); } catch (_) {}
            return stored;
        }
        try { return JSON.parse(sessionStorage.getItem('_utms') || 'null') || {}; } catch (_) { return {}; }
    }
    var utms = getUtms();

    var ref = document.referrer || null;
    try { if (ref && new URL(ref).hostname === location.hostname) ref = null; } catch (_) {}

    // Page view
    send({
        type: 'pv', sid: sid(), path: location.pathname, ref: ref,
        utm_source: utms.src || null, utm_medium: utms.med || null, utm_campaign: utms.camp || null, utm_content: utms.cont || null,
    });

    // Active-only duration
    var activeMs    = 0;
    var visibleSince = document.visibilityState === 'visible' ? Date.now() : null;

    function flushDuration() {
        if (visibleSince !== null) {
            activeMs += Date.now() - visibleSince;
            visibleSince = null;
        }
        var secs = Math.round(activeMs / 1000);
        if (secs > 0) send({ type: 'dur', sid: sid(), path: location.pathname, dur: secs });
    }

    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') flushDuration();
        else visibleSince = Date.now();
    });
    window.addEventListener('pagehide', flushDuration);

    // Heartbeat
    setInterval(function () {
        send({ type: 'hb', sid: sid(), path: location.pathname });
    }, 30000);

    // ── PUBLIC TRACKER API ────────────────────────────────────────────
    window.trackEvent = function (name, value, meta) {
        if (!name) return;
        send({ type: 'evt', sid: sid(), path: location.pathname, name: name, value: value == null ? null : String(value), meta: meta || null });
    };

    // ── JS Error capture (deduped per-session per-message) ────────────
    var _errSeen = {};
    function reportError(message, source, line, col, stack) {
        try {
            var key = message + '|' + (source || '') + '|' + (line || '');
            if (_errSeen[key]) return;
            _errSeen[key] = 1;
            send({
                type: 'err', sid: sid(), path: location.pathname,
                message: String(message || '').slice(0, 500),
                source: source ? String(source).slice(0, 300) : null,
                line: typeof line === 'number' ? line : null,
                col:  typeof col === 'number' ? col : null,
                stack: stack ? String(stack).slice(0, 2000) : null,
            });
        } catch (_) {}
    }
    window.addEventListener('error', function (e) {
        if (!e || !e.message) return;
        reportError(e.message, e.filename, e.lineno, e.colno, e.error && e.error.stack);
    });
    window.addEventListener('unhandledrejection', function (e) {
        var r = e.reason;
        var msg = (r && (r.message || r.toString && r.toString())) || 'Unhandled Promise rejection';
        reportError('[Promise] ' + msg, null, null, null, r && r.stack);
    });

    // ── Web Vitals (LCP, INP, CLS, FCP, TTFB) ─────────────────────────
    function reportVital(metric, value, rating) {
        if (typeof value !== 'number' || !isFinite(value)) return;
        send({ type: 'vital', sid: sid(), path: location.pathname, metric: metric, value: value, rating: rating || null });
    }
    function rate(metric, v) {
        if (metric === 'LCP')  return v <= 2500 ? 'good' : v <= 4000 ? 'needs-improvement' : 'poor';
        if (metric === 'INP')  return v <= 200  ? 'good' : v <= 500  ? 'needs-improvement' : 'poor';
        if (metric === 'CLS')  return v <= 0.1  ? 'good' : v <= 0.25 ? 'needs-improvement' : 'poor';
        if (metric === 'FCP')  return v <= 1800 ? 'good' : v <= 3000 ? 'needs-improvement' : 'poor';
        if (metric === 'TTFB') return v <= 800  ? 'good' : v <= 1800 ? 'needs-improvement' : 'poor';
        return null;
    }
    try {
        if ('PerformanceObserver' in window) {
            // LCP
            new PerformanceObserver(function (list) {
                var entries = list.getEntries();
                var last = entries[entries.length - 1];
                if (last) reportVital('LCP', Math.round(last.renderTime || last.loadTime || last.startTime), rate('LCP', last.startTime));
            }).observe({ type: 'largest-contentful-paint', buffered: true });

            // FCP
            new PerformanceObserver(function (list) {
                list.getEntries().forEach(function (entry) {
                    if (entry.name === 'first-contentful-paint') {
                        reportVital('FCP', Math.round(entry.startTime), rate('FCP', entry.startTime));
                    }
                });
            }).observe({ type: 'paint', buffered: true });

            // CLS
            var cls = 0;
            new PerformanceObserver(function (list) {
                list.getEntries().forEach(function (entry) {
                    if (!entry.hadRecentInput) cls += entry.value;
                });
            }).observe({ type: 'layout-shift', buffered: true });
            window.addEventListener('pagehide', function () {
                reportVital('CLS', Math.round(cls * 1000) / 1000, rate('CLS', cls));
            });

            // INP (approximation via event timing)
            var maxDur = 0;
            new PerformanceObserver(function (list) {
                list.getEntries().forEach(function (entry) {
                    if (entry.interactionId && entry.duration > maxDur) maxDur = entry.duration;
                });
            }).observe({ type: 'event', buffered: true, durationThreshold: 40 });
            window.addEventListener('pagehide', function () {
                if (maxDur > 0) reportVital('INP', Math.round(maxDur), rate('INP', maxDur));
            });
        }
        // TTFB
        var nav = (performance.getEntriesByType && performance.getEntriesByType('navigation') || [])[0];
        if (nav) {
            var ttfb = nav.responseStart;
            if (ttfb > 0) reportVital('TTFB', Math.round(ttfb), rate('TTFB', ttfb));
        }
    } catch (_) {}

    // ── Auto-track outbound clicks ────────────────────────────────────
    document.addEventListener('click', function (e) {
        var a = e.target && e.target.closest && e.target.closest('a[href]');
        if (!a) return;
        try {
            var u = new URL(a.href, location.origin);
            if (u.hostname && u.hostname !== location.hostname && /^https?:$/.test(u.protocol)) {
                window.trackEvent('outbound_click', u.hostname);
            }
        } catch (_) {}
    }, { capture: true });
})();
