const CACHE = 'remindme-v2';

// Cache-first strategy for all static assets (hashed filenames = safe to cache forever)
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (!request.url.startsWith('http')) return;
  const url = new URL(request.url);

  // Cache-first: JS bundles, fonts, images (all have hashed names — safe forever)
  const isStaticAsset =
    url.pathname.includes('/_expo/') ||
    url.pathname.includes('/assets/') ||
    /\.(ttf|woff2?|otf|js|png|jpg|jpeg|svg|ico|webp)(\?.*)?$/.test(url.pathname);

  if (isStaticAsset) {
    e.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(request).then((hit) => {
          if (hit) return hit;
          return fetch(request).then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // Network-first for HTML so the app always gets fresh index.html
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
  }
});
