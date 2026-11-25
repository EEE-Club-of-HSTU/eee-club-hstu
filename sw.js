// Service Worker for EEE Club of HSTU
const CACHE_NAME = 'eee-club-hstu-v3';

const APP_SHELL = [
  '/',
  '/index.html',
  '/assets/site.css',
  '/assets/site.js',
  '/assets/safe-url.js',
  '/assets/db.js',
  '/assets/search.js',
  '/assets/markdown.js',
  '/assets/consent.js',
  '/assets/firebase-config.js',
  '/assets/logo.png',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/icon-maskable-512.png',
  '/offline.html',
  '/404.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // cache: 'reload' skips the browser's HTTP cache, so a new deploy never precaches stale files.
      .then((cache) => cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isBypassHost(hostname) {
  return (
    hostname.includes('firestore.googleapis.com') ||
    hostname.includes('googleapis.com') ||
    hostname.includes('googletagmanager.com') ||
    hostname.includes('google-analytics.com')
  );
}

function offlineResponse() {
  return new Response('Offline', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

function isCacheable(res) {
  return Boolean(res && res.status === 200 && res.type === 'basic');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (isBypassHost(url.hostname)) return;

  const isSameOrigin = url.origin === self.location.origin;
  const isNav = request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');

  // HTML / Navigations: Network-first with cached fallback -> offline.html
  if (isNav) {
    event.respondWith((async () => {
      try {
        const res = await fetch(request);
        if (isSameOrigin && isCacheable(res)) {
          const copy = res.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((c) => c.put(request, copy)));
        }
        if (res && res.status >= 500) {
          return (await caches.match(request)) || (await caches.match('/offline.html')) || res;
        }
        return res;
      } catch (_err) {
        return (await caches.match(request)) || (await caches.match('/offline.html')) || offlineResponse();
      }
    })());
    return;
  }

  // Same-origin code (CSS/JS/manifest): network-first, so it always matches the freshly loaded HTML;
  // the cached copy is only used offline.
  if (isSameOrigin && /\.(css|js|webmanifest)$/.test(url.pathname)) {
    event.respondWith((async () => {
      try {
        const res = await fetch(request, { cache: 'no-cache' });
        if (isCacheable(res)) {
          const copy = res.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((c) => c.put(request, copy)).catch(() => {}));
        }
        return res;
      } catch (_err) {
        return (await caches.match(request)) || offlineResponse();
      }
    })());
    return;
  }

  // Same-origin images and other static files: Stale-while-revalidate
  if (isSameOrigin) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      const networkPromise = fetch(request)
        .then((res) => {
          if (isCacheable(res)) {
            const copy = res.clone();
            return caches.open(CACHE_NAME)
              .then((c) => c.put(request, copy))
              .catch(() => {})
              .then(() => res);
          }
          return res;
        });
      event.waitUntil(networkPromise.catch(() => {}));
      if (cached) return cached;
      try {
        return await networkPromise;
      } catch (_err) {
        return offlineResponse();
      }
    })());
  }
});
