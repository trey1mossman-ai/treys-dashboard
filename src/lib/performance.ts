/**
 * Performance monitoring utility for tracking app metrics
 */

interface PerformanceMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  timestamp: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []

  constructor() {
    this.initializeObserver()
    this.measureCoreWebVitals()
  }

  private initializeObserver() {
    if ('PerformanceObserver' in window) {
      try {
        // Observe LCP (Largest Contentful Paint)
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1] as any
          this.recordMetric('LCP', lastEntry.renderTime || lastEntry.loadTime)
        })
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })

        // Observe FID (First Input Delay)
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries() as any[]
          entries.forEach((entry) => {
            if (entry.processingStart) {
              const fid = entry.processingStart - entry.startTime
              this.recordMetric('FID', fid)
            }
          })
        })
        fidObserver.observe({ type: 'first-input', buffered: true })

        // Observe CLS (Cumulative Layout Shift)
        let clsValue = 0
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries() as any[]
          entries.forEach((entry) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value
            }
          })
          this.recordMetric('CLS', clsValue)
        })
        clsObserver.observe({ type: 'layout-shift', buffered: true })

      } catch (error) {
        console.error('Failed to initialize performance observer:', error)
      }
    }
  }

  private measureCoreWebVitals() {
    // Measure FCP (First Contentful Paint)
    if ('PerformanceObserver' in window) {
      const paintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            this.recordMetric('FCP', entry.startTime)
          }
        })
      })
      
      try {
        paintObserver.observe({ type: 'paint', buffered: true })
      } catch (e) {
        // Fallback for browsers that don't support paint timing
      }
    }

    // Measure TTFB (Time to First Byte)
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing
      const ttfb = timing.responseStart - timing.navigationStart
      if (ttfb > 0) {
        this.recordMetric('TTFB', ttfb)
      }
    }

    // Measure memory usage (if available)
    if ('memory' in performance) {
      const memory = (performance as any).memory
      const usedMemoryMB = memory.usedJSHeapSize / 1048576
      this.recordMetric('Memory', usedMemoryMB, 'MB')
    }
  }

  private recordMetric(name: string, value: number, unit: string = 'ms') {
    const rating = this.getRating(name, value)
    const metric: PerformanceMetric = {
      name: `${name} (${unit})`,
      value: Math.round(value * 100) / 100,
      rating,
      timestamp: Date.now()
    }
    
    this.metrics.push(metric)
    
    // Log to console in development
    if (import.meta.env.DEV) {
      const emoji = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌'
      console.log(`${emoji} ${name}: ${metric.value}${unit}`)
    }
  }

  private getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds: Record<string, { good: number; poor: number }> = {
      FCP: { good: 1800, poor: 3000 },
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      TTFB: { good: 800, poor: 1800 },
      Memory: { good: 50, poor: 100 } // MB
    }

    const threshold = thresholds[name]
    if (!threshold) return 'good'

    if (value <= threshold.good) return 'good'
    if (value >= threshold.poor) return 'poor'
    return 'needs-improvement'
  }

  public getMetrics(): PerformanceMetric[] {
    return this.metrics
  }

  public logMetrics() {
    console.table(this.metrics.map(m => ({
      Metric: m.name,
      Value: m.value,
      Rating: m.rating
    })))
  }

  public sendToAnalytics() {
    // Send metrics to your analytics service
    if (this.metrics.length > 0) {
      // Example: send to Google Analytics
      if (typeof window !== 'undefined' && 'gtag' in window) {
        this.metrics.forEach(metric => {
          (window as any).gtag('event', 'performance', {
            event_category: 'Web Vitals',
            event_label: metric.name,
            value: Math.round(metric.value),
            non_interaction: true
          })
        })
      }
    }
  }
}

// Export singleton instance
export const performanceMonitor = typeof window !== 'undefined' ? new PerformanceMonitor() : null

// Export utility function for manual timing
export function measurePerformance<T>(
  name: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  const start = performance.now()
  const result = fn()
  
  if (result instanceof Promise) {
    return result.finally(() => {
      const duration = performance.now() - start
      console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`)
    })
  }
  
  const duration = performance.now() - start
  console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`)
  return result
}
