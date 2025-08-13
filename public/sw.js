/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare const self: ServiceWorkerGlobalScope

// Precache all static assets
precacheAndRoute(self.__WB_MANIFEST)

// Clean up old caches
cleanupOutdatedCaches()

// Cache the Google Fonts stylesheets with a stale-while-revalidate strategy.
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-stylesheets',
  })
)

// Cache the underlying font files with a cache-first strategy for 1 year.
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        maxEntries: 30,
      }),
    ],
  })
)

// Cache API responses with Network First strategy
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
        purgeOnQuotaError: true,
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
)

// Cache images with Cache First strategy
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        purgeOnQuotaError: true,
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
)

// Handle navigation requests with app shell
const navigationRoute = new NavigationRoute(
  new NetworkFirst({
    cacheName: 'navigations',
    networkTimeoutSeconds: 3,
  })
)

registerRoute(navigationRoute)

// Handle offline fallback
self.addEventListener('fetch', (event: FetchEvent) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline.html') || 
               new Response('Offline - Please check your connection', {
                 status: 503,
                 statusText: 'Service Unavailable',
                 headers: new Headers({
                   'Content-Type': 'text/plain',
                 }),
               })
      })
    )
  }
})

// Background sync for offline actions
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-agenda') {
    event.waitUntil(syncAgenda())
  }
})

async function syncAgenda() {
  try {
    // Get cached agenda updates
    const cache = await caches.open('agenda-sync')
    const requests = await cache.keys()
    
    for (const request of requests) {
      try {
        const response = await fetch(request)
        if (response.ok) {
          await cache.delete(request)
        }
      } catch (error) {
        console.error('Failed to sync:', error)
      }
    }
  } catch (error) {
    console.error('Sync failed:', error)
  }
}

// Handle push notifications (if needed in future)
self.addEventListener('push', (event: PushEvent) => {
  const options = {
    body: event.data?.text() || 'New update available',
    icon: '/pwa-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
  }

  event.waitUntil(
    self.registration.showNotification('Agenda Dashboard', options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  event.waitUntil(
    self.clients.openWindow('/')
  )
})

// Skip waiting and claim clients
self.addEventListener('message', (event: MessageEvent) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim())
})
