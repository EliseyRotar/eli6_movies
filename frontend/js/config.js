// Set this to your Railway backend URL after deploying the backend.
// Example: window.API_BASE_URL = 'https://your-app.up.railway.app/api';
window.API_BASE_URL = 'https://eli6movies.onrender.com/api';
window.TMDB_PROXY_URL = window.API_BASE_URL + '/tmdb';

// Frontend error reporting. Set window.SENTRY_DSN = '...' here to enable
// (leave blank to opt out; sentry-init.js is a no-op without it).
window.SENTRY_DSN = '';
window.APP_RELEASE = 'eli6movies-frontend';

(function () {
    // Analytics beacon is only loaded after the user accepts the cookie banner
    // (set by components.js into localStorage 'eli6.cookies.accepted').
    // The banner's Accept click calls window.__loadEli6Analytics so users who
    // accept on first visit get analytics fired without a reload.
    window.__loadEli6Analytics = function () {
        if (window.__eli6AnalyticsLoaded) return;
        window.__eli6AnalyticsLoaded = true;
        var s = document.createElement('script');
        s.src = '/js/s.js';
        s.defer = true;
        document.head.appendChild(s);
    };
    if (localStorage.getItem('eli6.cookies.accepted')) {
        window.__loadEli6Analytics();
    }

    var t = document.createElement('script');
    t.src = '/js/sentry-init.js';
    t.defer = true;
    document.head.appendChild(t);
})();

// ping backend on every page load so render wakes up before content fetches hit
fetch(window.API_BASE_URL + '/health', { method: 'GET' }).catch(function () {});
