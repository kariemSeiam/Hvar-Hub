// Service Worker for HVAR Hub PWA
const CACHE_NAME = 'hvar-hub-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker installed');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Bypass caching for Bosta signed images (always fetch fresh)
  try {
    const reqUrl = new URL(event.request.url);
    if (reqUrl.hostname === 'storage.googleapis.com' && reqUrl.pathname.startsWith('/bosta-files/')) {
      event.respondWith(fetch(event.request, { cache: 'no-store' }));
      return;
    }
  } catch (e) {
    // ignore URL parsing errors
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
          .then((fetchResponse) => {
            // Don't cache API calls or dynamic content
            if (event.request.url.includes('/api/') || 
                event.request.url.includes('?') ||
                event.request.url.includes('#')) {
              return fetchResponse;
            }

            // Cache static assets
            const responseToCache = fetchResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return fetchResponse;
          })
          .catch(() => {
            // Return offline page if fetch fails
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Background sync for offline functionality
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event.tag);
  
  if (event.tag === 'camera-permission-sync') {
    event.waitUntil(
      // Handle camera permission sync
      console.log('Syncing camera permissions...')
    );
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'HVAR Hub notification',
    icon: '/icon.svg',
    badge: '/icon.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open Scanner',
        icon: '/icon.svg'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon.svg'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('HVAR Hub', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/scanner')
    );
  } else {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling for camera permissions
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'CAMERA_PERMISSION_REQUEST') {
    // Handle camera permission request
    event.ports[0].postMessage({
      type: 'CAMERA_PERMISSION_RESPONSE',
      success: true,
      message: 'Camera permission handled by service worker'
    });
  }
});

// Handle camera access through service worker
self.addEventListener('fetch', (event) => {
  // Special handling for camera-related requests
  if (event.request.url.includes('camera') || event.request.url.includes('media')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Add camera-specific headers
          const newResponse = new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: {
              ...response.headers,
              'X-Camera-Access': 'granted',
              'X-PWA-Enabled': 'true'
            }
          });
          return newResponse;
        })
        .catch((error) => {
          console.error('Camera access error:', error);
          return new Response(JSON.stringify({
            error: 'Camera access failed',
            message: error.message
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json'
            }
          });
        })
    );
  }
});

console.log('HVAR Hub Service Worker loaded'); 