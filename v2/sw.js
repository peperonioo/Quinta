// Quinta V2 — isolated shell cache. Scope is /v2/, so it can never touch the
// V1 install at the root. Samples are fetched from ../samples/ and NOT cached:
// they are outside this scope by design.
const CACHE = 'quinta-v2-v6.27';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('quinta-v2-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => {
    const c = r.clone();
    caches.open(CACHE).then(cache => { try { cache.put(e.request, c); } catch (_) {} });
    return r;
  }).catch(() => caches.match(e.request)));
});
