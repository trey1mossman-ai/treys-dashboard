/**
 * Advanced Caching System with IndexedDB, Memory Cache, and Service Worker support
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  expires: number
  etag?: string
  version: number
}

interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  strategy?: 'memory-first' | 'network-first' | 'cache-first' | 'stale-while-revalidate'
  version?: number
  compress?: boolean
}

class CacheManager {
  private memoryCache: Map<string, CacheEntry<any>> = new Map()
  private dbName = 'lifeos-cache'
  private dbVersion = 1
  private storeName = 'api-cache'
  private maxMemoryItems = 100
  private db: IDBDatabase | null = null
  
  constructor() {
    this.initIndexedDB()
    this.setupServiceWorker()
    this.startMemoryCleanup()
  }

  /**
   * Initialize IndexedDB for persistent caching
   */
  private async initIndexedDB(): Promise<void> {
    if (!('indexedDB' in window)) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)
      
      request.onerror = () => reject(request.error)
      
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' })
          store.createIndex('expires', 'expires', { unique: false })
          store.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  /**
   * Setup Service Worker for offline caching
   */
  private async setupServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
      try {
        await navigator.serviceWorker.register('/sw.js')
      } catch (error) {
        console.warn('Service Worker registration failed:', error)
      }
    }
  }

  /**
   * Periodic cleanup of expired memory cache entries
   */
  private startMemoryCleanup(): void {
    setInterval(() => {
      const now = Date.now()
      
      // Clean expired entries
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.expires < now) {
          this.memoryCache.delete(key)
        }
      }
      
      // Enforce memory limit (LRU)
      if (this.memoryCache.size > this.maxMemoryItems) {
        const sortedEntries = Array.from(this.memoryCache.entries())
          .sort((a, b) => a[1].timestamp - b[1].timestamp)
        
        const toRemove = sortedEntries.slice(0, this.memoryCache.size - this.maxMemoryItems)
        toRemove.forEach(([key]) => this.memoryCache.delete(key))
      }
    }, 60000) // Run every minute
  }

  /**
   * Generate cache key with versioning
   */
  private getCacheKey(key: string, version?: number): string {
    return version ? `${key}_v${version}` : key
  }

  /**
   * Compress data for storage efficiency
   */
  private async compress(data: any): Promise<string> {
    if (typeof data === 'string') return data
    
    const json = JSON.stringify(data)
    
    // Use CompressionStream API if available
    if ('CompressionStream' in window) {
      const stream = new Response(json).body!
        .pipeThrough(new (window as any).CompressionStream('gzip'))
      const compressed = await new Response(stream).blob()
      return await compressed.text()
    }
    
    return json
  }

  /**
   * Decompress cached data
   */
  private async decompress(data: string): Promise<any> {
    try {
      // Try to parse as JSON first
      return JSON.parse(data)
    } catch {
      // If it fails, it might be compressed
      if ('DecompressionStream' in window) {
        const stream = new Response(data).body!
          .pipeThrough(new (window as any).DecompressionStream('gzip'))
        const decompressed = await new Response(stream).text()
        return JSON.parse(decompressed)
      }
      
      return data
    }
  }

  /**
   * Set cache entry with multiple storage layers
   */
  async set<T>(
    key: string,
    data: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const {
      ttl = 3600000, // Default 1 hour
      version = 1,
      compress = false
    } = options
    
    const cacheKey = this.getCacheKey(key, version)
    const expires = Date.now() + ttl
    
    const entry: CacheEntry<T> = {
      data: compress ? await this.compress(data) : data,
      timestamp: Date.now(),
      expires,
      version
    }
    
    // Memory cache (fastest)
    this.memoryCache.set(cacheKey, entry)
    
    // IndexedDB (persistent)
    if (this.db) {
      try {
        const transaction = this.db.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)
        store.put({ key: cacheKey, ...entry })
      } catch (error) {
        console.warn('IndexedDB write failed:', error)
      }
    }
    
    // LocalStorage fallback (limited size)
    try {
      if (JSON.stringify(entry).length < 5000) { // 5KB limit for localStorage
        localStorage.setItem(`cache_${cacheKey}`, JSON.stringify(entry))
      }
    } catch {
      // Ignore localStorage quota errors
    }
  }

  /**
   * Get cached entry with fallback chain
   */
  async get<T>(
    key: string,
    options: CacheOptions = {}
  ): Promise<T | null> {
    const { version = 1 } = options
    const cacheKey = this.getCacheKey(key, version)
    const now = Date.now()
    
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(cacheKey)
    if (memoryEntry && memoryEntry.expires > now) {
      memoryEntry.timestamp = now // Update access time
      return memoryEntry.data
    }
    
    // Check IndexedDB
    if (this.db) {
      try {
        const transaction = this.db.transaction([this.storeName], 'readonly')
        const store = transaction.objectStore(this.storeName)
        const request = store.get(cacheKey)
        
        return new Promise((resolve) => {
          request.onsuccess = async () => {
            const entry = request.result
            if (entry && entry.expires > now) {
              const data = entry.data
              
              // Populate memory cache
              this.memoryCache.set(cacheKey, entry)
              
              resolve(data)
            } else {
              resolve(null)
            }
          }
          
          request.onerror = () => resolve(null)
        })
      } catch {
        // Fall through to localStorage
      }
    }
    
    // Check localStorage
    try {
      const stored = localStorage.getItem(`cache_${cacheKey}`)
      if (stored) {
        const entry = JSON.parse(stored) as CacheEntry<T>
        if (entry.expires > now) {
          // Populate memory cache
          this.memoryCache.set(cacheKey, entry)
          return entry.data
        }
      }
    } catch {
      // Ignore parse errors
    }
    
    return null
  }

  /**
   * Fetch with caching strategies
   */
  async fetch<T>(
    url: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const {
      strategy = 'cache-first',
      ttl = 3600000,
      version = 1
    } = options
    
    const cacheKey = `fetch_${url}`
    
    switch (strategy) {
      case 'cache-first': {
        const cached = await this.get<T>(cacheKey, { version })
        if (cached !== null) return cached
        
        const data = await fetcher()
        await this.set(cacheKey, data, { ttl, version })
        return data
      }
      
      case 'network-first': {
        try {
          const data = await fetcher()
          await this.set(cacheKey, data, { ttl, version })
          return data
        } catch (error) {
          const cached = await this.get<T>(cacheKey, { version })
          if (cached !== null) return cached
          throw error
        }
      }
      
      case 'memory-first': {
        const memoryEntry = this.memoryCache.get(this.getCacheKey(cacheKey, version))
        if (memoryEntry && memoryEntry.expires > Date.now()) {
          return memoryEntry.data
        }
        
        const data = await fetcher()
        await this.set(cacheKey, data, { ttl, version })
        return data
      }
      
      case 'stale-while-revalidate': {
        const cached = await this.get<T>(cacheKey, { version })
        
        // Return stale data immediately
        if (cached !== null) {
          // Revalidate in the background
          fetcher().then(data => {
            this.set(cacheKey, data, { ttl, version })
          }).catch(() => {
            // Silent fail for background update
          })
          
          return cached
        }
        
        // No cache, fetch synchronously
        const data = await fetcher()
        await this.set(cacheKey, data, { ttl, version })
        return data
      }
      
      default:
        return fetcher()
    }
  }

  /**
   * Invalidate cache entries
   */
  async invalidate(pattern?: string | RegExp): Promise<void> {
    // Clear memory cache
    if (!pattern) {
      this.memoryCache.clear()
    } else {
      const regex = typeof pattern === 'string' 
        ? new RegExp(pattern) 
        : pattern
      
      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          this.memoryCache.delete(key)
        }
      }
    }
    
    // Clear IndexedDB
    if (this.db) {
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      
      if (!pattern) {
        store.clear()
      } else {
        const regex = typeof pattern === 'string' 
          ? new RegExp(pattern) 
          : pattern
        
        const request = store.openCursor()
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result
          if (cursor) {
            if (regex.test(cursor.value.key)) {
              cursor.delete()
            }
            cursor.continue()
          }
        }
      }
    }
    
    // Clear localStorage
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('cache_')) {
        if (!pattern || (typeof pattern === 'string' ? key.includes(pattern) : pattern.test(key))) {
          keysToRemove.push(key)
        }
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }

  /**
   * Preload data into cache
   */
  async preload<T>(
    entries: Array<{ key: string; fetcher: () => Promise<T>; options?: CacheOptions }>
  ): Promise<void> {
    await Promise.all(
      entries.map(({ key, fetcher, options }) =>
        this.fetch(key, fetcher, options)
      )
    )
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memorySize: number
    memoryItems: number
    localStorageSize: number
    localStorageItems: number
  } {
    let localStorageSize = 0
    let localStorageItems = 0
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('cache_')) {
        localStorageItems++
        const value = localStorage.getItem(key)
        if (value) {
          localStorageSize += key.length + value.length
        }
      }
    }
    
    return {
      memorySize: JSON.stringify(Array.from(this.memoryCache.entries())).length,
      memoryItems: this.memoryCache.size,
      localStorageSize,
      localStorageItems
    }
  }
}

// Export singleton instance
export const cache = new CacheManager()

// Helper hooks for React
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): { data: T | null; loading: boolean; error: Error | null; refresh: () => void } {
  const [data, setData] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)
  
  const fetch = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await cache.fetch(key, fetcher, options)
      setData(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [key, fetcher, options])
  
  React.useEffect(() => {
    fetch()
  }, [fetch])
  
  return { data, loading, error, refresh: fetch }
}