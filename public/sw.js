// Enhanced Service Worker with Offline Support
const CACHE_NAME = 'project-manager-v2';
const OFFLINE_URL = '/offline';

// Core assets to cache for offline use
const STATIC_ASSETS = [
    '/',
    '/login',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip API requests - always go to network
    if (event.request.url.includes('/api/')) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Return cached version if available
            if (cachedResponse) {
                // Update cache in background
                event.waitUntil(
                    fetch(event.request).then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, networkResponse.clone());
                            });
                        }
                    }).catch(() => { })
                );
                return cachedResponse;
            }

            // Try network
            return fetch(event.request)
                .then((networkResponse) => {
                    // Cache successful responses
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Offline fallback for navigation requests
                    if (event.request.mode === 'navigate') {
                        return caches.match('/');
                    }
                    return new Response('Offline', { status: 503 });
                });
        })
    );
});

// Push notification handling
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();

    const options = {
        body: data.body || '',
        icon: data.icon || '/icons/icon-192.png',
        badge: data.badge || '/icons/icon-192.png',
        vibrate: [100, 50, 100],
        data: data.data || {},
        actions: [
            { action: 'open', title: 'Otwórz' },
            { action: 'close', title: 'Zamknij' },
        ],
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'Project Manager', options)
    );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'close') return;

    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            // If a window is already open, focus it
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) {
                const url = event.notification.data?.url || '/';
                return clients.openWindow(url);
            }
        })
    );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-data') {
        event.waitUntil(syncData());
    }
});

async function syncData() {
    // Implement data sync when coming back online
    console.log('Background sync triggered');
    // Could sync queued actions from IndexedDB here
}
