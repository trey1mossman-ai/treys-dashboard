/**
 * Intelligent Prefetching System
 * Predictively loads resources based on user behavior
 */

interface PrefetchOptions {
  priority?: 'high' | 'low'
  type?: 'script' | 'style' | 'image' | 'font' | 'fetch'
  crossOrigin?: 'anonymous' | 'use-credentials'
  integrity?: string
  timeout?: number
}

class PrefetchManager {
  private prefetchedUrls = new Set<string>()
  private pendingPrefetches = new Map<string, Promise<any>>()
  private observer: IntersectionObserver | null = null
  private idleCallbackId: number | null = null
  private networkInformation: any = (navigator as any).connection
  
  constructor() {
    this.initializeObserver()
    this.monitorNetworkConditions()
  }
  
  /**
   * Initialize intersection observer for viewport-based prefetching
   */
  private initializeObserver() {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const element = entry.target as HTMLElement
              const prefetchUrl = element.dataset.prefetch
              const prefetchType = element.dataset.prefetchType as PrefetchOptions['type']
              
              if (prefetchUrl) {
                this.prefetch(prefetchUrl, { type: prefetchType })
              }
              
              // Stop observing after prefetch
              this.observer?.unobserve(element)
            }
          })
        },
        {
          rootMargin: '50px' // Start prefetching 50px before entering viewport
        }
      )
    }
  }
  
  /**
   * Monitor network conditions to adjust prefetching strategy
   */
  private monitorNetworkConditions() {
    if (this.networkInformation) {
      this.networkInformation.addEventListener('change', () => {
        this.adjustPrefetchStrategy()
      })
    }
  }
  
  /**
   * Adjust prefetching based on network conditions
   */
  private adjustPrefetchStrategy() {
    if (!this.networkInformation) return
    
    const { effectiveType, saveData } = this.networkInformation
    
    // Disable prefetching on slow connections or save-data mode
    if (saveData || effectiveType === 'slow-2g' || effectiveType === '2g') {
      this.clearPendingPrefetches()
    }
  }
  
  /**
   * Check if prefetching should proceed based on network conditions
   */
  private shouldPrefetch(): boolean {
    if (!this.networkInformation) return true
    
    const { effectiveType, saveData } = this.networkInformation
    
    // Don't prefetch on slow connections or save-data mode
    if (saveData || effectiveType === 'slow-2g' || effectiveType === '2g') {
      return false
    }
    
    return true
  }
  
  /**
   * Prefetch a resource
   */
  async prefetch(url: string, options: PrefetchOptions = {}): Promise<void> {
    // Skip if already prefetched
    if (this.prefetchedUrls.has(url)) return
    
    // Skip if network conditions are poor
    if (!this.shouldPrefetch()) return
    
    // Check if prefetch is already in progress
    if (this.pendingPrefetches.has(url)) {
      return this.pendingPrefetches.get(url)
    }
    
    const prefetchPromise = this.performPrefetch(url, options)
    this.pendingPrefetches.set(url, prefetchPromise)
    
    try {
      await prefetchPromise
      this.prefetchedUrls.add(url)
    } finally {
      this.pendingPrefetches.delete(url)
    }
  }
  
  /**
   * Perform the actual prefetch
   */
  private async performPrefetch(url: string, options: PrefetchOptions): Promise<void> {
    const { priority = 'low', type = 'fetch', crossOrigin, integrity, timeout = 5000 } = options
    
    // Use different strategies based on resource type
    switch (type) {
      case 'script':
        return this.prefetchScript(url, { crossOrigin, integrity, timeout })
        
      case 'style':
        return this.prefetchStyle(url, { crossOrigin, integrity, timeout })
        
      case 'image':
        return this.prefetchImage(url, { timeout })
        
      case 'font':
        return this.prefetchFont(url, { crossOrigin, timeout })
        
      default:
        return this.prefetchFetch(url, { priority, timeout })
    }
  }
  
  /**
   * Prefetch JavaScript
   */
  private prefetchScript(url: string, options: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.as = 'script'
      link.href = url
      
      if (options.crossOrigin) {
        link.crossOrigin = options.crossOrigin
      }
      
      if (options.integrity) {
        link.integrity = options.integrity
      }
      
      const timeout = setTimeout(() => {
        reject(new Error(`Prefetch timeout: ${url}`))
      }, options.timeout)
      
      link.onload = () => {
        clearTimeout(timeout)
        resolve()
      }
      
      link.onerror = () => {
        clearTimeout(timeout)
        reject(new Error(`Failed to prefetch: ${url}`))
      }
      
      document.head.appendChild(link)
    })
  }
  
  /**
   * Prefetch CSS
   */
  private prefetchStyle(url: string, options: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.as = 'style'
      link.href = url
      
      if (options.crossOrigin) {
        link.crossOrigin = options.crossOrigin
      }
      
      if (options.integrity) {
        link.integrity = options.integrity
      }
      
      const timeout = setTimeout(() => {
        reject(new Error(`Prefetch timeout: ${url}`))
      }, options.timeout)
      
      link.onload = () => {
        clearTimeout(timeout)
        resolve()
      }
      
      link.onerror = () => {
        clearTimeout(timeout)
        reject(new Error(`Failed to prefetch: ${url}`))
      }
      
      document.head.appendChild(link)
    })
  }
  
  /**
   * Prefetch image
   */
  private prefetchImage(url: string, options: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      
      const timeout = setTimeout(() => {
        reject(new Error(`Prefetch timeout: ${url}`))
      }, options.timeout)
      
      img.onload = () => {
        clearTimeout(timeout)
        resolve()
      }
      
      img.onerror = () => {
        clearTimeout(timeout)
        reject(new Error(`Failed to prefetch: ${url}`))
      }
      
      img.src = url
    })
  }
  
  /**
   * Prefetch font
   */
  private prefetchFont(url: string, options: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.as = 'font'
      link.href = url
      link.type = 'font/woff2'
      
      if (options.crossOrigin) {
        link.crossOrigin = options.crossOrigin
      }
      
      const timeout = setTimeout(() => {
        reject(new Error(`Prefetch timeout: ${url}`))
      }, options.timeout)
      
      link.onload = () => {
        clearTimeout(timeout)
        resolve()
      }
      
      link.onerror = () => {
        clearTimeout(timeout)
        reject(new Error(`Failed to prefetch: ${url}`))
      }
      
      document.head.appendChild(link)
    })
  }
  
  /**
   * Prefetch using Fetch API
   */
  private async prefetchFetch(url: string, options: any): Promise<void> {
    const controller = new AbortController()
    
    const timeout = setTimeout(() => {
      controller.abort()
    }, options.timeout)
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        priority: options.priority as RequestPriority
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }
      
      // Cache the response
      if ('caches' in window) {
        const cache = await caches.open('prefetch-cache')
        await cache.put(url, response)
      }
    } finally {
      clearTimeout(timeout)
    }
  }
  
  /**
   * Prefetch route components
   */
  async prefetchRoute(routeName: string): Promise<void> {
    const routeMap: Record<string, string[]> = {
      dashboard: ['/assets/dashboard.js', '/assets/dashboard.css'],
      schedule: ['/assets/schedule.js', '/assets/schedule.css'],
      workflows: ['/assets/workflows.js', '/assets/workflows.css'],
      fitness: ['/assets/fitness.js', '/assets/fitness.css'],
      settings: ['/assets/settings.js', '/assets/settings.css']
    }
    
    const resources = routeMap[routeName]
    if (!resources) return
    
    await Promise.all(
      resources.map(url => 
        this.prefetch(url, { 
          type: url.endsWith('.js') ? 'script' : 'style',
          priority: 'high'
        })
      )
    )
  }
  
  /**
   * Observe element for viewport-based prefetching
   */
  observeElement(element: HTMLElement): void {
    if (this.observer) {
      this.observer.observe(element)
    }
  }
  
  /**
   * Prefetch on idle
   */
  prefetchOnIdle(urls: string[], options: PrefetchOptions = {}): void {
    if ('requestIdleCallback' in window) {
      this.idleCallbackId = requestIdleCallback(() => {
        urls.forEach(url => {
          this.prefetch(url, options)
        })
      })
    } else {
      // Fallback to setTimeout
      setTimeout(() => {
        urls.forEach(url => {
          this.prefetch(url, options)
        })
      }, 100)
    }
  }
  
  /**
   * Clear pending prefetches
   */
  clearPendingPrefetches(): void {
    if (this.idleCallbackId) {
      cancelIdleCallback(this.idleCallbackId)
      this.idleCallbackId = null
    }
    
    this.pendingPrefetches.clear()
  }
  
  /**
   * Get prefetch statistics
   */
  getStats(): {
    prefetchedCount: number
    pendingCount: number
    prefetchedUrls: string[]
  } {
    return {
      prefetchedCount: this.prefetchedUrls.size,
      pendingCount: this.pendingPrefetches.size,
      prefetchedUrls: Array.from(this.prefetchedUrls)
    }
  }
}

// Export singleton instance
export const prefetchManager = new PrefetchManager()

// React hook for prefetching
export function usePrefetch() {
  const prefetch = (url: string, options?: PrefetchOptions) => {
    prefetchManager.prefetch(url, options)
  }
  
  const prefetchRoute = (routeName: string) => {
    prefetchManager.prefetchRoute(routeName)
  }
  
  const prefetchOnIdle = (urls: string[], options?: PrefetchOptions) => {
    prefetchManager.prefetchOnIdle(urls, options)
  }
  
  return { prefetch, prefetchRoute, prefetchOnIdle }
}

// HOC for prefetch-enabled links
export function withPrefetch<P extends { href: string }>(
  Component: React.ComponentType<P>
): React.ComponentType<P & { prefetchOn?: 'hover' | 'visible' | 'mount' }> {
  return (props: P & { prefetchOn?: 'hover' | 'visible' | 'mount' }) => {
    const { href, prefetchOn = 'hover', ...rest } = props
    const elementRef = React.useRef<HTMLElement>(null)
    
    React.useEffect(() => {
      if (prefetchOn === 'mount') {
        prefetchManager.prefetch(href)
      } else if (prefetchOn === 'visible' && elementRef.current) {
        prefetchManager.observeElement(elementRef.current)
      }
    }, [href, prefetchOn])
    
    const handleMouseEnter = () => {
      if (prefetchOn === 'hover') {
        prefetchManager.prefetch(href)
      }
    }
    
    return (
      <Component
        {...(rest as P)}
        href={href}
        ref={elementRef}
        onMouseEnter={handleMouseEnter}
        data-prefetch={href}
      />
    )
  }
}