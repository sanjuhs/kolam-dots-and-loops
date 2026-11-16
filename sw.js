// Offline support: try the network first, fall back to the cached copy.
const CACHE = 'kolam-v6';
const FILES = ['./', 'index.html', 'motifs.js', 'puzzle-engine.js', 'picture-symmetries.js', 'community.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-180.png'];
const ROOT = new URL('./', self.location.href);
const ASSETS = new Set(FILES.map(f => new URL(f, ROOT).href));
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('kolam-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== ROOT.origin) return;
  url.search = ''; url.hash = '';
  // Only retain the app shell, under fixed keys; query strings cannot grow the cache.
  if (!ASSETS.has(url.href)) return;
  const key = url.href;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) {
        const copy = r.clone();
        e.waitUntil(caches.open(CACHE).then(c => c.put(key, copy)).catch(() => {}));
      }
      return r;
    }).catch(() => caches.match(key).then(r => r || Response.error()))
  );
});
