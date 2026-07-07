const CACHE_NAME = 'expensetrack-cache-v7';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.jpg',
  './icon-512.jpg',
  './icon.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch((err) => {
      console.log('Pre-caching skipped/failed:', err);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Only handle requests from our own origin
  // This prevents caching external CDN or AdSense resources that might fail CORS
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached response instantly and fetch fresh in background to update cache (Stale-While-Revalidate)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => { /* Soft fail background update */ });

        return cachedResponse;
      }

      // If not cached, fetch from network
      return fetch(event.request)
        .then((networkResponse) => {
          // Only cache successful basic responses
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Fallback: if we are offline and page navigation fails, return cached index
          if (event.request.mode === 'navigate') {
            const cache = await caches.open(CACHE_NAME);
            const indexResponse = await cache.match('index.html') || await cache.match('./');
            if (indexResponse) {
              return indexResponse;
            }
          }
          return new Response('Network error and offline content not available.', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
    })
  );
});
