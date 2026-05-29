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
        var blob = new Blob([JSON.stringify(payload)], { type: 'text/plain' });
        navigator.sendBeacon(API + '/data', blob);
    }

    // Page view
    send({ type: 'pv', sid: sid(), path: location.pathname, ref: document.referrer || null });

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
