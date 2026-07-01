// Service worker — makes Easy Fifth Circle installable and offline-capable.
// Bump CACHE on each release so clients pick up the new HTML.
const CACHE = 'efc-v5.98';
// Piano samples live in their own cache that SURVIVES version bumps — they never
// change, and re-downloading ~1.2MB on every release would be rude.
const SAMPLES = 'efc-samples-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== SAMPLES).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // HTML: network-first so updates show, falling back to the cached shell offline.
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      fetch(req)
        .then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); return res; })
        .catch(() => caches.match('./index.html') || caches.match('./'))
    );
    return;
  }

  // Piano samples: cache-first into the persistent samples cache.
  if (req.url.indexOf('/samples/') > -1) {
    e.respondWith(
      caches.open(SAMPLES).then(c => c.match(req).then(cached => cached || fetch(req).then(res => {
        if (res.ok) c.put(req, res.clone());
        return res;
      })))
    );
    return;
  }

  // Everything else (fonts, icons): cache-first, then network (and cache it).
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      if (res.ok && (req.url.indexOf('fonts') > -1 || req.url.indexOf('icons') > -1)) {
        const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp));
      }
      return res;
    }).catch(() => cached))
  );
});
