import React, { useState, useEffect, useRef } from 'react';

/**
 * Performance Monitor Component - Day 2
 * Real-time performance metrics for the dashboard
 */

interface PerformanceMetrics {
  fps: number;
  memory: {
    used: number;
    total: number;
    limit: number;
  };
  renderTime: number;
  networkRequests: number;
  cacheHitRate: number;
  ttfb: number; // Time to first byte
  fcp: number;  // First contentful paint
  lcp: number;  // Largest contentful paint
  fid: number;  // First input delay
  cls: number;  // Cumulative layout shift
}

export const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memory: { used: 0, total: 0, limit: 0 },
    renderTime: 0,
    networkRequests: 0,
    cacheHitRate: 0,
    ttfb: 0,
    fcp: 0,
    lcp: 0,
    fid: 0,
    cls: 0,
  });
  
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const rafId = useRef<number>();

  // FPS Monitoring
  const measureFPS = () => {
    const currentTime = performance.now();
    const delta = currentTime - lastTime.current;
    
    frameCount.current++;
    
    if (delta >= 1000) {
      const fps = Math.round((frameCount.current * 1000) / delta);
      frameCount.current = 0;
      lastTime.current = currentTime;
      
      setMetrics(prev => ({ ...prev, fps }));
    }
    
    rafId.current = requestAnimationFrame(measureFPS);
  };

  // Memory Monitoring
  const measureMemory = () => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      setMetrics(prev => ({
        ...prev,
        memory: {
          used: Math.round(memory.usedJSHeapSize / 1048576), // Convert to MB
          total: Math.round(memory.totalJSHeapSize / 1048576),
          limit: Math.round(memory.jsHeapSizeLimit / 1048576),
        }
      }));
    }
  };

  // Network Monitoring
  const measureNetwork = () => {
    const resources = performance.getEntriesByType('resource');
    const requests = resources.length;
    
    // Calculate cache hit rate
    const cached = resources.filter((r: any) => r.transferSize === 0 && r.decodedBodySize > 0);
    const cacheHitRate = requests > 0 ? Math.round((cached.length / requests) * 100) : 0;
    
    setMetrics(prev => ({
      ...prev,
      networkRequests: requests,
      cacheHitRate,
    }));
  };

  // Core Web Vitals
  const measureWebVitals = () => {
    // Get navigation timing
    const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navTiming) {
      setMetrics(prev => ({
        ...prev,
        ttfb: Math.round(navTiming.responseStart - navTiming.requestStart),
      }));
    }

    // Get paint timing
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    if (fcp) {
      setMetrics(prev => ({
        ...prev,
        fcp: Math.round(fcp.startTime),
      }));
    }

    // Observe LCP
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          setMetrics(prev => ({
            ...prev,
            lcp: Math.round(lastEntry.startTime),
          }));
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // CLS Observer
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          setMetrics(prev => ({
            ...prev,
            cls: Math.round(clsValue * 1000) / 1000,
          }));
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('Performance Observer not supported');
      }
    }
  };

  // Measure render time
  const measureRenderTime = () => {
    const startTime = performance.now();
    requestAnimationFrame(() => {
      const renderTime = performance.now() - startTime;
      setMetrics(prev => ({
        ...prev,
        renderTime: Math.round(renderTime * 100) / 100,
      }));
    });
  };

  useEffect(() => {
    if (!isVisible) return;

    // Start monitoring
    measureFPS();
    
    // Set up intervals
    const memoryInterval = setInterval(measureMemory, 1000);
    const networkInterval = setInterval(measureNetwork, 2000);
    const renderInterval = setInterval(measureRenderTime, 1000);
    
    // Initial measurements
    measureWebVitals();

    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
      clearInterval(memoryInterval);
      clearInterval(networkInterval);
      clearInterval(renderInterval);
    };
  }, [isVisible]);

  // Get status colors
  const getFPSColor = (fps: number) => {
    if (fps >= 55) return 'text-green-400';
    if (fps >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getMemoryColor = (used: number, limit: number) => {
    const usage = (used / limit) * 100;
    if (usage < 50) return 'text-green-400';
    if (usage < 80) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getMetricColor = (value: number, good: number, bad: number) => {
    if (value <= good) return 'text-green-400';
    if (value <= bad) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`
        fixed top-4 right-4 
        bg-black/90 backdrop-blur-sm
        border border-gray-700
        rounded-lg
        text-xs font-mono
        z-[10000]
        transition-all duration-200
        ${isMinimized ? 'w-24' : 'w-80'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-gray-700">
        <span className="text-white font-semibold">Performance</span>
        <div className="flex gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-gray-400 hover:text-white px-1"
          >
            {isMinimized ? '□' : '—'}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white px-1"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="p-3 space-y-2">
          {/* FPS */}
          <div className="flex justify-between items-center">
            <span className="text-gray-400">FPS:</span>
            <span className={`font-bold ${getFPSColor(metrics.fps)}`}>
              {metrics.fps}
            </span>
          </div>

          {/* Memory */}
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Memory:</span>
            <span className={`${getMemoryColor(metrics.memory.used, metrics.memory.limit)}`}>
              {metrics.memory.used}MB / {metrics.memory.limit}MB
            </span>
          </div>

          {/* Render Time */}
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Render:</span>
            <span className={`${getMetricColor(metrics.renderTime, 10, 16)}`}>
              {metrics.renderTime}ms
            </span>
          </div>

          {/* Network */}
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Network:</span>
            <span className="text-gray-300">
              {metrics.networkRequests} req ({metrics.cacheHitRate}% cached)
            </span>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-700 pt-2">
            <div className="text-gray-500 mb-1">Core Web Vitals</div>
            
            {/* TTFB */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">TTFB:</span>
              <span className={`${getMetricColor(metrics.ttfb, 800, 1800)}`}>
                {metrics.ttfb}ms
              </span>
            </div>

            {/* FCP */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">FCP:</span>
              <span className={`${getMetricColor(metrics.fcp, 1800, 3000)}`}>
                {metrics.fcp}ms
              </span>
            </div>

            {/* LCP */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">LCP:</span>
              <span className={`${getMetricColor(metrics.lcp, 2500, 4000)}`}>
                {metrics.lcp}ms
              </span>
            </div>

            {/* CLS */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">CLS:</span>
              <span className={`${getMetricColor(metrics.cls, 0.1, 0.25)}`}>
                {metrics.cls}
              </span>
            </div>
          </div>

          {/* Performance Score */}
          <div className="border-t border-gray-700 pt-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Overall Score:</span>
              <span className={`font-bold text-lg ${
                metrics.fps >= 55 && metrics.fcp < 1800 && metrics.lcp < 2500
                  ? 'text-green-400'
                  : metrics.fps >= 30 && metrics.fcp < 3000 && metrics.lcp < 4000
                  ? 'text-yellow-400'
                  : 'text-red-400'
              }`}>
                {Math.round(
                  ((metrics.fps / 60) * 25 +
                  (metrics.fcp < 1800 ? 25 : metrics.fcp < 3000 ? 15 : 5) +
                  (metrics.lcp < 2500 ? 25 : metrics.lcp < 4000 ? 15 : 5) +
                  (metrics.cls < 0.1 ? 25 : metrics.cls < 0.25 ? 15 : 5))
                )}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Minimized View */}
      {isMinimized && (
        <div className="p-2">
          <div className={`text-center font-bold ${getFPSColor(metrics.fps)}`}>
            {metrics.fps} FPS
          </div>
        </div>
      )}
    </div>
  );
};

// Export utilities for programmatic use
export const performanceUtils = {
  /**
   * Mark the start of a performance measurement
   */
  mark: (name: string) => {
    performance.mark(name);
  },

  /**
   * Measure between two marks
   */
  measure: (name: string, startMark: string, endMark?: string) => {
    if (endMark) {
      performance.measure(name, startMark, endMark);
    } else {
      performance.measure(name, startMark);
    }
    
    const entries = performance.getEntriesByName(name);
    const duration = entries[entries.length - 1]?.duration;
    
    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Performance: ${name} took ${duration?.toFixed(2)}ms`);
    }
    
    return duration;
  },

  /**
   * Get current FPS
   */
  getCurrentFPS: (() => {
    let fps = 60;
    let frameCount = 0;
    let lastTime = performance.now();
    
    const measure = () => {
      const currentTime = performance.now();
      const delta = currentTime - lastTime;
      frameCount++;
      
      if (delta >= 1000) {
        fps = Math.round((frameCount * 1000) / delta);
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measure);
    };
    
    measure();
    
    return () => fps;
  })(),

  /**
   * Check if animations should run
   */
  shouldAnimate: () => {
    // Check reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return false;
    }
    
    // Check FPS
    const fps = performanceUtils.getCurrentFPS();
    return fps >= 30;
  },

  /**
   * Log performance metrics
   */
  logMetrics: () => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    
    console.group('Performance Metrics');
    console.table({
      'DOM Content Loaded': navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      'Load Complete': navigation.loadEventEnd - navigation.loadEventStart,
      'First Paint': paint.find(p => p.name === 'first-paint')?.startTime,
      'First Contentful Paint': paint.find(p => p.name === 'first-contentful-paint')?.startTime,
      'Time to Interactive': navigation.domInteractive - navigation.fetchStart,
    });
    console.groupEnd();
  },
};
