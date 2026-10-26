/* Price Manager offline shell.
   Serves the app from the device cache so it opens with no internet,
   and quietly refreshes the cache whenever a connection is available.
   Bump VERSION if you ever want to force-clear old cached files. */
var VERSION = 'mpm-shell-v1';
var SHELL = ['./', 'index.html', 'supabase.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (c) {
      return Promise.all(SHELL.map(function (u) { return c.add(u).catch(function () {}); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function refresh(req, key) {
  return fetch(req).then(function (res) {
    if (res && res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(key || req, copy); }); }
    return res;
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // Supabase API calls are never touched

  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match('index.html').then(function (cached) {
        var net = refresh(req, 'index.html').catch(function () { return cached; });
        return cached || net;
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (cached) {
      var net = refresh(req).catch(function () { return cached; });
      return cached || net;
    })
  );
});
