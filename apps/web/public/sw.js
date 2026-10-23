// Haraka Net service worker.
// Rules: never touch POSTs or /api/ calls, always return a real Response, and
// serve a cached page only when the network is down.
const CACHE = 'haraka-v2'; // bump this number whenever you change this file

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.add('/index.html'))
      .catch(() => {}) // a failed pre-cache must not block install
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Leave these to the browser: payments, other sites, and anything that isn't a GET.
  if (req.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Page loads: network first, cached page only if offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put('/index.html', copy));
          }
          return res;
        })
        .catch(() =>
          caches.match('/index.html').then(
            (cached) => cached || new Response('You are offline.', { status: 503 })
          )
        )
    );
    return;
  }

  // Static files (JS, CSS, icons): cached copy if we have one, refreshed from the network.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached || new Response('', { status: 504 }));
      return cached || network;
    })
  );
});
