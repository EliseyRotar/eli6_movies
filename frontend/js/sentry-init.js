// Frontend error reporting — no-op unless window.SENTRY_DSN is set in config.js.
// Loaded with `defer` so it runs after config.js. Uses the CDN bundle so we
// don't have to add a build step.
(function () {
    var dsn = window.SENTRY_DSN;
    if (!dsn) return;

    var release = window.APP_RELEASE || 'eli6movies@unknown';
    var env = window.SENTRY_ENV || (location.hostname === 'eli6movies.vercel.app' ? 'production' : 'preview');

    var s = document.createElement('script');
    s.src = 'https://browser.sentry-cdn.com/8.55.2/bundle.tracing.min.js';
    s.crossOrigin = 'anonymous';
    s.integrity = ''; // Sentry rotates hashes — re-pin if you upgrade.
    s.onload = function () {
        if (!window.Sentry) return;
        window.Sentry.init({
            dsn: dsn,
            release: release,
            environment: env,
            tracesSampleRate: 0.05,
            // Don't ship the user's session JWT or anything else from cookies
            // to a third party. Beacons only carry the URL + UA + stack trace.
            sendDefaultPii: false,
            beforeSend: function (event) {
                if (event.request && event.request.cookies) delete event.request.cookies;
                if (event.request && event.request.headers) {
                    delete event.request.headers.Cookie;
                    delete event.request.headers.Authorization;
                }
                return event;
            },
        });
    };
    document.head.appendChild(s);
})();
