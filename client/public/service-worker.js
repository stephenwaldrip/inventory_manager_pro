// Minimal service worker. Its job here is to satisfy the installability
// requirement and give the app shell a fast repeat load — deliberately NOT
// to cache API responses, since stale inventory data is worse than no data.
const CACHE = 'imp-shell-v1';
const SHELL = ['/', '/index.html', '/manifest.json', '/logo192.png', '/logo512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Never cache anything but same-origin GETs. API calls go to a different
  // origin and must always hit the network — a cached 200 for /materials
  // would show a customer someone else's stale inventory after a switch.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
  );
});