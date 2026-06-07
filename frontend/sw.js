// ELI6 Movies — minimal app-shell service worker
// Network-first for our own JS/CSS/JSON so feature shipping isn't blocked by
// the previous-visit cache; cache-only fallback if the user is offline.
// HTML and other shell files still use stale-while-revalidate for fast nav.
var CACHE_NAME = 'eli6-shell-v4';
var SHELL_ASSETS = [
  '/sport.html',
  '/css/theme.css',
  '/css/design.css',
  '/js/config.js',
  '/js/theme.js',
  '/js/components.js',
  '/js/i18n.js',
  '/js/sport.js',
  '/locales/en.json',
  '/locales/it.json',
  '/locales/ru.json',
  '/manifest.webmanifest',
  '/favicon.svg'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // Don't fail the whole install if a single asset is missing
      return Promise.all(SHELL_ASSETS.map(function (url) {
        return cache.add(url).catch(function () { /* skip missing */ });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE_NAME) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);

  // Don't intercept cross-origin or auth-bearing requests
  if (url.origin !== self.location.origin) return;
  // Don't cache API routes or HTML at /watch/* (dynamic)
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/watch/')) return;

  var isShellAsset =
    SHELL_ASSETS.indexOf(url.pathname) !== -1 ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.json');

  if (!isShellAsset) return;

  // Network-first for JS / CSS / JSON so new deploys ship without a 2nd reload;
  // stale-while-revalidate for the HTML shell and other assets.
  var isCodeAsset = url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.json');

  if (isCodeAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then(function (cache) {
        return fetch(req).then(function (resp) {
          if (resp && resp.status === 200) cache.put(req, resp.clone());
          return resp;
        }).catch(function () { return cache.match(req); });
      })
    );
    return;
  }

  // Stale-while-revalidate (HTML shell, manifest, svg, etc.)
  event.respondWith(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(req).then(function (cached) {
        var network = fetch(req).then(function (resp) {
          if (resp && resp.status === 200) cache.put(req, resp.clone());
          return resp;
        }).catch(function () { return cached; });
        return cached || network;
      });
    })
  );
});
