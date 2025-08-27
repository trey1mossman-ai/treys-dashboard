/**
 * Service Worker for LifeOS Dashboard
 * Implements advanced caching strategies and offline support
 */

const CACHE_NAME = 'lifeos-v1.0.0'
const RUNTIME_CACHE = 'lifeos-runtime'
const IMAGE_CACHE = 'lifeos-images'

// Assets to cache immediately
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest'
]

// Cache strategies per route pattern
const CACHE_STRATEGIES = {
  // Cache first for static assets
  cacheFirst: [
    /\.(?:css|js|woff2?|ttf|otf|eot)$/,
    /^https:\/\/fonts\.(?:googleapis|gstatic)\.com/
  ],
  
  // Network first for API calls
  networkFirst: [
    /\/api\//,
    /\/functions\//
  ],
  
  // Stale while revalidate for images
  staleWhileRevalidate: [
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/
  ]
}

// Install event - precache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Precaching assets')
        return cache.addAll(PRECACHE_ASSETS)
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error('[SW] Precache failed:', err))
  )
})

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE && name !== IMAGE_CACHE)
            .map(name => {
              console.log('[SW] Deleting old cache:', name)
              return caches.delete(name)
            })
        )
      })
      .then(() => self.clients.claim())
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-HTTP requests
  if (!url.protocol.startsWith('http')) return
  
  // Skip cross-origin requests except for allowed domains
  if (url.origin !== self.location.origin) {
    const allowedOrigins = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://cdn.jsdelivr.net'
    ]
    
    if (!allowedOrigins.some(origin => url.origin === origin)) {
      return
    }
  }
  
  // Determine strategy
  let strategy = 'networkOnly'
  
  for (const [strat, patterns] of Object.entries(CACHE_STRATEGIES)) {
    if (patterns.some(pattern => pattern.test(url.pathname) || pattern.test(url.href))) {
      strategy = strat
      break
    }
  }
  
  // Apply strategy
  switch (strategy) {
    case 'cacheFirst':
      event.respondWith(cacheFirstStrategy(request))
      break
      
    case 'networkFirst':
      event.respondWith(networkFirstStrategy(request))
      break
      
    case 'staleWhileRevalidate':
      event.respondWith(staleWhileRevalidateStrategy(request))
      break
      
    default:
      // Network only (no caching)
      return
  }
})

/**
 * Cache-first strategy
 * Try cache, fallback to network
 */
async function cacheFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)
  
  if (cached) {
    console.log('[SW] Cache hit:', request.url)
    return cached
  }
  
  console.log('[SW] Cache miss, fetching:', request.url)
  
  try {
    const response = await fetch(request)
    
    // Cache successful responses
    if (response.ok) {
      const responseClone = response.clone()
      cache.put(request, responseClone)
    }
    
    return response
  } catch (error) {
    console.error('[SW] Fetch failed:', error)
    throw error
  }
}

/**
 * Network-first strategy
 * Try network, fallback to cache
 */
async function networkFirstStrategy(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  
  try {
    const response = await fetch(request)
    
    // Cache successful responses
    if (response.ok) {
      const responseClone = response.clone()
      cache.put(request, responseClone)
    }
    
    return response
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url)
    
    const cached = await cache.match(request)
    if (cached) {
      return cached
    }
    
    throw error
  }
}

/**
 * Stale-while-revalidate strategy
 * Return cache immediately, update in background
 */
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(IMAGE_CACHE)
  const cached = await cache.match(request)
  
  const fetchPromise = fetch(request)
    .then(response => {
      if (response.ok) {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(error => {
      console.error('[SW] Background fetch failed:', error)
      return cached || error
    })
  
  return cached || fetchPromise
}

console.log('[SW] Service Worker loaded')