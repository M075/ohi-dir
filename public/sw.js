// Service Worker for Ohi! PWA
const CACHE_NAME = 'ohi-v1';
const STATIC_CACHE = 'ohi-static-v1';

const urlsToCache = [
  '/',
  '/manifest.json',
];

// Install event
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker: Installing...');
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('✅ Service Worker: Static cache opened');
        return cache.addAll(urlsToCache).catch((err) => {
          console.warn('⚠️ Service Worker: Some static assets failed to cache', err);
        });
      }),
      caches.open(CACHE_NAME).then((cache) => {
        console.log('✅ Service Worker: Dynamic cache opened');
      }),
    ])
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Keep only current caches
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
            console.log('🗑️ Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions and other non-http protocols
  if (!request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Don't cache failed responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Clone the response for caching
        const responseToCache = response.clone();

        // Cache successful responses
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      })
      .catch((error) => {
        console.log('📡 Service Worker: Network failed for', request.url, error);
        
        // Try to return cached version
        return caches.match(request).then((response) => {
          if (response) {
            console.log('✅ Service Worker: Using cached response for', request.url);
            return response;
          }

          // Return offline page if available
          if (request.mode === 'navigate') {
            return caches.match('/') || new Response(
              'You are offline - page not available',
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({
                  'Content-Type': 'text/plain',
                }),
              }
            );
          }

          // Return error response for other types
          return new Response('Network unavailable', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain',
            }),
          });
        });
      })
  );
});

console.log('✅ Service Worker loaded and ready');
