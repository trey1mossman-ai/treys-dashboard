import React from "react"
import ReactDOM from "react-dom/client"
import "./styles/globals-optimized.css"
import { BrowserRouter } from "react-router-dom"
import AppRoutes from "@/routes/index-optimized"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { ToastProvider } from "@/hooks/use-toast"

// Performance monitoring
const measureWebVitals = () => {
  if ('PerformanceObserver' in window) {
    // Measure First Contentful Paint
    try {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            console.log(`FCP: ${entry.startTime.toFixed(2)}ms`)
          }
        }
      })
      paintObserver.observe({ entryTypes: ['paint'] })
    } catch (e) {
      // Silent fail for unsupported browsers
    }
    
    // Measure Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        console.log(`LCP: ${lastEntry.startTime.toFixed(2)}ms`)
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
    } catch (e) {
      // Silent fail
    }
    
    // Measure First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const delay = entry.processingStart - entry.startTime
          console.log(`FID: ${delay.toFixed(2)}ms`)
        }
      })
      fidObserver.observe({ entryTypes: ['first-input'] })
    } catch (e) {
      // Silent fail
    }
    
    // Measure Cumulative Layout Shift
    let clsValue = 0
    let clsEntries: any[] = []
    
    try {
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value
            clsEntries.push(entry)
          }
        }
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
      
      // Log CLS after page load
      window.addEventListener('load', () => {
        setTimeout(() => {
          console.log(`CLS: ${clsValue.toFixed(3)}`)
        }, 5000)
      })
    } catch (e) {
      // Silent fail
    }
  }
  
  // Log page load time
  window.addEventListener('load', () => {
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart
    console.log(`Page Load Time: ${loadTime}ms`)
    
    // Send metrics to analytics if available
    if (typeof window.gtag !== 'undefined') {
      window.gtag('event', 'page_load_time', {
        value: loadTime,
        event_category: 'performance'
      })
    }
  })
}

// Register service worker for PWA
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })
      
      console.log('Service Worker registered:', registration.scope)
      
      // Check for updates periodically
      setInterval(() => {
        registration.update()
      }, 60000) // Check every minute
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available
              console.log('New service worker available')
              
              // Optionally show update notification
              if (window.confirm('New version available! Reload to update?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' })
                window.location.reload()
              }
            }
          })
        }
      })
    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  }
}

// Optimize initial render
const rootElement = document.getElementById("root")

if (rootElement) {
  // Enable concurrent mode for better performance
  const root = ReactDOM.createRoot(rootElement, {
    onRecoverableError: (error, errorInfo) => {
      console.error('React recoverable error:', error, errorInfo)
    }
  } as any)
  
  // Render app
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  )
  
  // Start performance monitoring
  measureWebVitals()
  
  // Register service worker after initial render
  requestIdleCallback(() => {
    registerServiceWorker()
  })
  
  // Prefetch critical assets
  requestIdleCallback(() => {
    // Prefetch fonts
    const fontLink = document.createElement('link')
    fontLink.rel = 'prefetch'
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
    document.head.appendChild(fontLink)
  })
  
  // Report errors to monitoring service
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error)
    // Send to error tracking service
  })
  
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason)
    // Send to error tracking service
  })
} else {
  console.error("Root element not found!")
}