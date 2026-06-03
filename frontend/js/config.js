// Set this to your Railway backend URL after deploying the backend.
// Example: window.API_BASE_URL = 'https://your-app.up.railway.app/api';
window.API_BASE_URL = 'https://eli6movies.onrender.com/api';
window.TMDB_PROXY_URL = window.API_BASE_URL + '/tmdb';

(function () {
    var s = document.createElement('script');
    s.src = '/js/s.js';
    s.defer = true;
    document.head.appendChild(s);
})();

// ping backend on every page load so render wakes up before content fetches hit
fetch(window.API_BASE_URL + '/health', { method: 'GET' }).catch(function () {});
