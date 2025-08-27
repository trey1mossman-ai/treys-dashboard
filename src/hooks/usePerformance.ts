/* Performance Optimization Hooks */

import { useEffect, useCallback, useRef, useState } from 'react'

/**
 * Debounce hook for optimizing expensive operations
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Throttle hook for rate-limiting function calls
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now())
  const timeout = useRef<NodeJS.Timeout>()

  return useCallback(
    ((...args) => {
      const now = Date.now()
      
      if (now - lastRun.current >= delay) {
        callback(...args)
        lastRun.current = now
      } else {
        clearTimeout(timeout.current)
        timeout.current = setTimeout(() => {
          callback(...args)
          lastRun.current = Date.now()
        }, delay - (now - lastRun.current))
      }
    }) as T,
    [callback, delay]
  )
}

/**
 * Intersection Observer hook for lazy loading
 */
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  {
    threshold = 0,
    root = null,
    rootMargin = '0%',
    freezeOnceVisible = false
  }: IntersectionObserverInit & {
    freezeOnceVisible?: boolean
  } = {}
) {
  const [entry, setEntry] = useState<IntersectionObserverEntry>()

  const frozen = entry?.isIntersecting && freezeOnceVisible

  const updateEntry = ([entry]: IntersectionObserverEntry[]): void => {
    setEntry(entry)
  }

  useEffect(() => {
    const node = elementRef?.current
    const hasIOSupport = !!window.IntersectionObserver

    if (!hasIOSupport || frozen || !node) return

    const observerParams = { threshold, root, rootMargin }
    const observer = new IntersectionObserver(updateEntry, observerParams)

    observer.observe(node)

    return () => observer.disconnect()
  }, [elementRef, threshold, root, rootMargin, frozen])

  return entry
}

/**
 * Request Idle Callback hook for deferring non-critical work
 */
export function useIdleCallback(
  callback: () => void,
  options?: IdleRequestOptions
) {
  const savedCallback = useRef(callback)
  const idleCallbackId = useRef<number>()

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if ('requestIdleCallback' in window) {
      idleCallbackId.current = window.requestIdleCallback(
        () => savedCallback.current(),
        options
      )

      return () => {
        if (idleCallbackId.current) {
          window.cancelIdleCallback(idleCallbackId.current)
        }
      }
    } else {
      // Fallback for browsers without requestIdleCallback
      const timeoutId = setTimeout(() => savedCallback.current(), 1)
      return () => clearTimeout(timeoutId)
    }
  }, [options])
}

/**
 * Virtual Scrolling hook for large lists
 */
export function useVirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
  scrollTop = 0
}: {
  items: T[]
  itemHeight: number
  containerHeight: number
  overscan?: number
  scrollTop?: number
}) {
  const startIndex = Math.max(
    0,
    Math.floor(scrollTop / itemHeight) - overscan
  )
  
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  )

  const virtualItems = items.slice(startIndex, endIndex + 1).map((item, i) => ({
    item,
    index: startIndex + i,
    style: {
      position: 'absolute' as const,
      top: (startIndex + i) * itemHeight,
      height: itemHeight,
      width: '100%'
    }
  }))

  const totalHeight = items.length * itemHeight

  return {
    virtualItems,
    totalHeight,
    startIndex,
    endIndex
  }
}

/**
 * Prefetch hook for preloading resources
 */
export function usePrefetch(urls: string[]) {
  useEffect(() => {
    if ('link' in document) {
      urls.forEach(url => {
        const link = document.createElement('link')
        link.rel = 'prefetch'
        link.href = url
        document.head.appendChild(link)
      })
    }
  }, [urls])
}

/**
 * Memory leak prevention hook
 */
export function useAbortController() {
  const abortControllerRef = useRef<AbortController>()

  useEffect(() => {
    abortControllerRef.current = new AbortController()

    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  return abortControllerRef.current!
}

/**
 * Network status hook for adaptive loading
 */
export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState({
    online: navigator.onLine,
    effectiveType: (navigator as any).connection?.effectiveType || '4g',
    saveData: (navigator as any).connection?.saveData || false
  })

  useEffect(() => {
    const handleOnline = () => setNetworkStatus(prev => ({ ...prev, online: true }))
    const handleOffline = () => setNetworkStatus(prev => ({ ...prev, online: false }))
    
    const handleConnectionChange = () => {
      const connection = (navigator as any).connection
      if (connection) {
        setNetworkStatus({
          online: navigator.onLine,
          effectiveType: connection.effectiveType,
          saveData: connection.saveData
        })
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    const connection = (navigator as any).connection
    if (connection) {
      connection.addEventListener('change', handleConnectionChange)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange)
      }
    }
  }, [])

  return networkStatus
}

/**
 * Performance metrics hook
 */
export function usePerformanceMetrics() {
  const [metrics, setMetrics] = useState({
    fps: 60,
    memory: 0,
    loadTime: 0
  })

  useEffect(() => {
    let frameCount = 0
    let lastTime = performance.now()

    const measureFPS = () => {
      frameCount++
      const currentTime = performance.now()
      
      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime))
        
        const memory = (performance as any).memory
        const memoryUsed = memory ? Math.round(memory.usedJSHeapSize / 1048576) : 0
        
        setMetrics({
          fps,
          memory: memoryUsed,
          loadTime: Math.round(currentTime)
        })
        
        frameCount = 0
        lastTime = currentTime
      }
      
      requestAnimationFrame(measureFPS)
    }

    const rafId = requestAnimationFrame(measureFPS)

    return () => cancelAnimationFrame(rafId)
  }, [])

  return metrics
}