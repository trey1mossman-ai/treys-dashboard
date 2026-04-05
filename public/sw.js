/**
 * NeuralFit Service Worker
 * Minimal SW — no caching strategies that interfere with auth cookies.
 * Only handles push notifications and offline fallback.
 */

// Unregister old caches from previous SW versions
self.addEventListener('install', (event) => {
  console.log('[SW] Installing — clearing old caches');
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((name) => caches.delete(name)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating — claiming clients');
  event.waitUntil(self.clients.claim());
});

// Pass all fetch requests through to the network (no caching)
// This ensures auth cookies and middleware always run correctly
self.addEventListener('fetch', () => {
  // No-op: let the browser handle all fetches normally
});

/**
 * Push notifications
 */
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  const options = {
    body: data.body || 'New notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'notification',
    data: data.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'NeuralFit', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/dashboard')
  );
});

console.log('[SW] Service worker loaded (auth-safe, no caching)');
