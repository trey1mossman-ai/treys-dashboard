/**
 * Progressive Enhancement Utilities
 * Provides fallbacks and enhanced experiences based on browser capabilities
 */

// Feature detection utilities
export const features = {
  // CSS features
  hasGrid: CSS.supports('display', 'grid'),
  hasFlexGap: CSS.supports('gap', '1rem'),
  hasContainerQueries: CSS.supports('container-type', 'inline-size'),
  hasSubgrid: CSS.supports('grid-template-columns', 'subgrid'),
  hasCSSNesting: CSS.supports('selector(&)'),
  
  // JavaScript APIs
  hasIntersectionObserver: 'IntersectionObserver' in window,
  hasResizeObserver: 'ResizeObserver' in window,
  hasMutationObserver: 'MutationObserver' in window,
  hasServiceWorker: 'serviceWorker' in navigator,
  hasWebWorker: 'Worker' in window,
  hasSharedWorker: 'SharedWorker' in window,
  
  // Network APIs
  hasNetworkInformation: 'connection' in navigator || 'mozConnection' in navigator,
  hasBeacon: 'sendBeacon' in navigator,
  hasFetch: 'fetch' in window,
  hasAbortController: 'AbortController' in window,
  
  // Storage APIs
  hasIndexedDB: 'indexedDB' in window,
  hasLocalStorage: 'localStorage' in window,
  hasSessionStorage: 'sessionStorage' in window,
  hasCacheAPI: 'caches' in window,
  
  // Performance APIs
  hasPerformanceObserver: 'PerformanceObserver' in window,
  hasRequestIdleCallback: 'requestIdleCallback' in window,
  hasWebVitals: 'PerformanceObserver' in window && PerformanceObserver.supportedEntryTypes?.includes('largest-contentful-paint'),
  
  // Media APIs
  hasMediaSession: 'mediaSession' in navigator,
  hasWebAudio: 'AudioContext' in window || 'webkitAudioContext' in window,
  hasWebRTC: 'RTCPeerConnection' in window,
  hasPictureInPicture: 'pictureInPictureEnabled' in document,
  
  // Device APIs
  hasVibration: 'vibrate' in navigator,
  hasBattery: 'getBattery' in navigator,
  hasGeolocation: 'geolocation' in navigator,
  hasDeviceOrientation: 'DeviceOrientationEvent' in window,
  hasDeviceMotion: 'DeviceMotionEvent' in window,
  
  // Input APIs
  hasPointerEvents: 'PointerEvent' in window,
  hasTouchEvents: 'ontouchstart' in window,
  hasGamepad: 'getGamepads' in navigator,
  
  // Clipboard APIs
  hasClipboard: 'clipboard' in navigator,
  hasClipboardWrite: navigator.clipboard?.writeText !== undefined,
  
  // Share APIs
  hasWebShare: 'share' in navigator,
  hasWebShareFiles: 'canShare' in navigator,
  
  // Payment APIs
  hasPaymentRequest: 'PaymentRequest' in window,
  
  // Notification APIs
  hasNotifications: 'Notification' in window,
  hasPushManager: 'PushManager' in window,
  
  // File APIs
  hasFileAPI: 'File' in window && 'FileReader' in window,
  hasFileSystemAPI: 'showOpenFilePicker' in window,
  
  // Wake Lock API
  hasWakeLock: 'wakeLock' in navigator,
  
  // Web Components
  hasCustomElements: 'customElements' in window,
  hasShadowDOM: 'attachShadow' in Element.prototype,
  hasHTMLTemplates: 'content' in document.createElement('template'),
  
  // Module support
  hasESModules: 'noModule' in document.createElement('script'),
  hasDynamicImport: (async () => {
    try {
      await import('data:text/javascript,')
      return true
    } catch {
      return false
    }
  })(),
  
  // WebAssembly
  hasWebAssembly: 'WebAssembly' in window,
  
  // WebGL
  hasWebGL: (() => {
    try {
      const canvas = document.createElement('canvas')
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    } catch {
      return false
    }
  })(),
  
  hasWebGL2: (() => {
    try {
      const canvas = document.createElement('canvas')
      return !!canvas.getContext('webgl2')
    } catch {
      return false
    }
  })(),
  
  // Compression
  hasCompressionStream: 'CompressionStream' in window,
  hasDecompressionStream: 'DecompressionStream' in window
}

// Device detection
export const device = {
  isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
  isTablet: /iPad|Android.*Tablet|Tablet.*Android|Kindle|Silk/i.test(navigator.userAgent),
  isDesktop: !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)),
  isIOS: /iPhone|iPad|iPod/i.test(navigator.userAgent),
  isAndroid: /Android/i.test(navigator.userAgent),
  isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
  isChrome: /Chrome/i.test(navigator.userAgent) && /Google Inc/i.test(navigator.vendor),
  isFirefox: /Firefox/i.test(navigator.userAgent),
  isEdge: /Edg/i.test(navigator.userAgent),
  
  // Screen information
  screenWidth: window.screen.width,
  screenHeight: window.screen.height,
  pixelRatio: window.devicePixelRatio || 1,
  
  // Touch support
  hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
  maxTouchPoints: navigator.maxTouchPoints || 0,
  
  // Orientation
  orientation: window.screen.orientation?.type || 'portrait-primary',
  
  // Connection
  connection: (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection,
  
  // Memory
  memory: (performance as any).memory,
  
  // CPU cores
  hardwareConcurrency: navigator.hardwareConcurrency || 1,
  
  // Language
  language: navigator.language || 'en-US',
  
  // Standalone mode (PWA)
  isStandalone: window.matchMedia('(display-mode: standalone)').matches ||
                (window.navigator as any).standalone ||
                document.referrer.includes('android-app://'),
  
  // Dark mode preference
  prefersDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
  
  // Reduced motion preference
  prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  
  // High contrast preference
  prefersHighContrast: window.matchMedia('(prefers-contrast: high)').matches
}

// Polyfills and fallbacks
export const polyfills = {
  // RequestIdleCallback polyfill
  requestIdleCallback: window.requestIdleCallback || function(callback: IdleRequestCallback, options?: IdleRequestOptions) {
    const start = Date.now()
    return setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
      } as IdleDeadline)
    }, options?.timeout || 1) as unknown as number
  },
  
  cancelIdleCallback: window.cancelIdleCallback || function(id: number) {
    clearTimeout(id)
  },
  
  // IntersectionObserver polyfill placeholder
  IntersectionObserver: window.IntersectionObserver || class {
    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {}
    observe(target: Element) {}
    unobserve(target: Element) {}
    disconnect() {}
  },
  
  // ResizeObserver polyfill placeholder
  ResizeObserver: window.ResizeObserver || class {
    constructor(callback: ResizeObserverCallback) {}
    observe(target: Element, options?: ResizeObserverOptions) {}
    unobserve(target: Element) {}
    disconnect() {}
  }
}

// Progressive enhancement helpers
export function enhance(feature: keyof typeof features, enhanced: () => void, fallback?: () => void) {
  if (features[feature]) {
    enhanced()
  } else if (fallback) {
    fallback()
  }
}

// Lazy load polyfills
export async function loadPolyfill(feature: string): Promise<void> {
  const polyfillMap: Record<string, string> = {
    'intersection-observer': 'https://polyfill.io/v3/polyfill.min.js?features=IntersectionObserver',
    'resize-observer': 'https://polyfill.io/v3/polyfill.min.js?features=ResizeObserver',
    'web-animations': 'https://cdnjs.cloudflare.com/ajax/libs/web-animations/2.3.2/web-animations.min.js',
    'fetch': 'https://polyfill.io/v3/polyfill.min.js?features=fetch',
    'custom-elements': 'https://polyfill.io/v3/polyfill.min.js?features=CustomElements',
    'smoothscroll': 'https://polyfill.io/v3/polyfill.min.js?features=smoothscroll'
  }
  
  const url = polyfillMap[feature]
  if (!url) return
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = url
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load polyfill: ${feature}`))
    document.head.appendChild(script)
  })
}

// Adaptive loading based on device capabilities
export function getLoadingStrategy() {
  const connection = device.connection
  const memory = device.memory
  
  // Check for save data mode
  if (connection?.saveData) {
    return 'minimal'
  }
  
  // Check connection speed
  const effectiveType = connection?.effectiveType
  if (effectiveType === 'slow-2g' || effectiveType === '2g') {
    return 'basic'
  }
  
  // Check device memory
  const deviceMemory = (navigator as any).deviceMemory
  if (deviceMemory && deviceMemory < 4) {
    return 'light'
  }
  
  // Check hardware concurrency
  if (device.hardwareConcurrency < 4) {
    return 'moderate'
  }
  
  // Default to full experience
  return 'full'
}

// React hook for progressive enhancement
export function useProgressiveEnhancement() {
  const [loadingStrategy, setLoadingStrategy] = React.useState(getLoadingStrategy())
  const [capabilities, setCapabilities] = React.useState(features)
  
  React.useEffect(() => {
    // Update loading strategy on connection change
    const connection = device.connection
    if (connection) {
      const handleChange = () => {
        setLoadingStrategy(getLoadingStrategy())
      }
      
      connection.addEventListener('change', handleChange)
      return () => {
        connection.removeEventListener('change', handleChange)
      }
    }
  }, [])
  
  return {
    features: capabilities,
    device,
    loadingStrategy,
    enhance,
    loadPolyfill
  }
}

// CSS feature detection helper
export function supportsCSS(property: string, value?: string): boolean {
  if (value) {
    return CSS.supports(property, value)
  }
  return CSS.supports(property)
}

// JavaScript API detection helper
export function supportsAPI(api: string): boolean {
  const parts = api.split('.')
  let obj: any = window
  
  for (const part of parts) {
    if (!(part in obj)) {
      return false
    }
    obj = obj[part]
  }
  
  return true
}

// Media query helper
export function matchesMedia(query: string): boolean {
  return window.matchMedia(query).matches
}

// Viewport size detection
export function getViewportSize() {
  return {
    width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
    height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
  }
}

// Screen size detection
export function getScreenSize() {
  return {
    width: window.screen.width,
    height: window.screen.height,
    availWidth: window.screen.availWidth,
    availHeight: window.screen.availHeight
  }
}

// Orientation detection
export function getOrientation(): 'portrait' | 'landscape' {
  if (window.screen.orientation) {
    return window.screen.orientation.type.includes('portrait') ? 'portrait' : 'landscape'
  }
  return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
}

// Performance metrics
export function getPerformanceMetrics() {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
  
  return {
    // Navigation timing
    dns: navigation.domainLookupEnd - navigation.domainLookupStart,
    tcp: navigation.connectEnd - navigation.connectStart,
    ttfb: navigation.responseStart - navigation.requestStart,
    download: navigation.responseEnd - navigation.responseStart,
    domInteractive: navigation.domInteractive - navigation.fetchStart,
    domComplete: navigation.domComplete - navigation.fetchStart,
    loadComplete: navigation.loadEventEnd - navigation.fetchStart,
    
    // Memory (if available)
    memory: (performance as any).memory ? {
      usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
      totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
      jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
    } : null
  }
}