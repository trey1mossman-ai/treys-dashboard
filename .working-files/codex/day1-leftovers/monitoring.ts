// CLAUDE CODE: Day 2 - Error Tracking & Performance Monitoring
import { featureFlags } from './featureFlags';

interface ErrorContext {
  user?: {
    id?: string;
    email?: string;
  };
  tags?: Record<string, string>;
  extra?: Record<string, any>;
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
}

class MonitoringService {
  private initialized = false;
  private queue: Array<{ error: Error; context?: ErrorContext }> = [];
  private performanceObserver?: PerformanceObserver;

  async initialize() {
    if (this.initialized) return;

    // Only initialize in production/staging
    const env = this.getEnvironment();
    if (env === 'development' && !featureFlags.isEnabled('enableDebugMode')) {
      console.log('Monitoring disabled in development');
      return;
    }

    try {
      // Dynamically import Sentry to keep bundle size small
      const Sentry = await import('@sentry/react');
      const { BrowserTracing } = await import('@sentry/tracing');

      Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN || '',
        environment: env,
        integrations: [
          new BrowserTracing(),
        ],
        tracesSampleRate: env === 'production' ? 0.1 : 1.0,
        beforeSend: (event, hint) => {
          // Filter out certain errors
          if (event.exception) {
            const error = hint.originalException;

            // Don't send network errors in development
            if (env === 'development' && error instanceof TypeError && error.message.includes('fetch')) {
              return null;
            }

            // Don't send ResizeObserver errors (common browser quirk)
            if (error instanceof Error && error.message.includes('ResizeObserver')) {
              return null;
            }
          }

          return event;
        },
      });

      this.initialized = true;

      // Process queued errors
      this.queue.forEach(({ error, context }) => {
        this.captureError(error, context);
      });
      this.queue = [];

      // Initialize performance monitoring
      this.initializePerformanceMonitoring();
    } catch (error) {
      console.error('Failed to initialize monitoring:', error);
    }
  }

  private getEnvironment(): string {
    if (typeof window === 'undefined') return 'development';

    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'development';
    }
    if (hostname.includes('staging')) {
      return 'staging';
    }
    return 'production';
  }

  captureError(error: Error, context?: ErrorContext) {
    console.error('Captured error:', error);

    if (!this.initialized) {
      this.queue.push({ error, context });
      return;
    }

    // Send to Sentry
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      const Sentry = (window as any).Sentry;

      if (context?.user) {
        Sentry.setUser(context.user);
      }

      if (context?.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          Sentry.setTag(key, value);
        });
      }

      if (context?.extra) {
        Object.entries(context.extra).forEach(([key, value]) => {
          Sentry.setExtra(key, value);
        });
      }

      Sentry.captureException(error, {
        level: context?.level || 'error',
      });
    }

    // Also send to our own analytics
    this.trackError(error, context);
  }

  captureMessage(message: string, context?: ErrorContext) {
    if (!this.initialized) {
      console.log('Monitoring not initialized:', message);
      return;
    }

    if (typeof window !== 'undefined' && (window as any).Sentry) {
      const Sentry = (window as any).Sentry;
      Sentry.captureMessage(message, context?.level || 'info');
    }
  }

  private trackError(error: Error, context?: ErrorContext) {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: error.toString(),
        fatal: context?.level === 'fatal',
        error_type: error.name,
        error_message: error.message,
        ...context?.tags,
      });
    }
  }

  // Performance monitoring
  private initializePerformanceMonitoring() {
    if (!('PerformanceObserver' in window)) return;

    // Monitor long tasks
    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            console.warn('Long task detected:', {
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name,
            });

            this.trackPerformance('long_task', {
              duration: entry.duration,
              startTime: entry.startTime,
            });
          }
        }
      });

      this.performanceObserver.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      // Not all browsers support longtask
    }

    // Monitor Core Web Vitals
    this.monitorWebVitals();
  }

  private async monitorWebVitals() {
    if (!featureFlags.isEnabled('enableDebugMode')) return;

    try {
      const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import('web-vitals');

      getCLS((metric) => this.reportWebVital('CLS', metric.value));
      getFID((metric) => this.reportWebVital('FID', metric.value));
      getFCP((metric) => this.reportWebVital('FCP', metric.value));
      getLCP((metric) => this.reportWebVital('LCP', metric.value));
      getTTFB((metric) => this.reportWebVital('TTFB', metric.value));
    } catch (error) {
      console.error('Failed to load web-vitals:', error);
    }
  }

  private reportWebVital(name: string, value: number) {
    console.log(`Web Vital - ${name}:`, value);

    // Track in analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', name, {
        value: Math.round(name === 'CLS' ? value * 1000 : value),
        metric_id: name,
        metric_value: value,
        metric_delta: value,
      });
    }

    // Send to Sentry if performance is poor
    const thresholds: Record<string, number> = {
      CLS: 0.1,
      FID: 100,
      FCP: 1800,
      LCP: 2500,
      TTFB: 800,
    };

    if (value > thresholds[name]) {
      this.captureMessage(`Poor ${name} performance: ${value}`, {
        level: 'warning',
        tags: {
          metric: name,
          value: value.toString(),
        },
      });
    }
  }

  trackPerformance(eventName: string, data: any) {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', `performance_${eventName}`, data);
    }
  }

  // User session tracking
  startSession(userId?: string) {
    if (!this.initialized) return;

    if (typeof window !== 'undefined' && (window as any).Sentry) {
      const Sentry = (window as any).Sentry;
      Sentry.setUser({ id: userId || 'anonymous' });
    }
  }

  endSession() {
    if (!this.initialized) return;

    if (typeof window !== 'undefined' && (window as any).Sentry) {
      const Sentry = (window as any).Sentry;
      Sentry.setUser(null);
    }
  }

  // Custom breadcrumbs for debugging
  addBreadcrumb(message: string, category: string, data?: any) {
    if (!this.initialized) return;

    if (typeof window !== 'undefined' && (window as any).Sentry) {
      const Sentry = (window as any).Sentry;
      Sentry.addBreadcrumb({
        message,
        category,
        level: 'info',
        data,
        timestamp: Date.now() / 1000,
      });
    }
  }

  // Performance marks for custom timing
  mark(name: string) {
    if (!('performance' in window)) return;
    performance.mark(name);
  }

  measure(name: string, startMark: string, endMark?: string) {
    if (!('performance' in window)) return;

    try {
      const measure = performance.measure(
        name,
        startMark,
        endMark || undefined
      );

      this.trackPerformance('custom_timing', {
        name,
        duration: measure.duration,
        startTime: measure.startTime,
      });

      return measure.duration;
    } catch (error) {
      console.error('Failed to measure performance:', error);
      return 0;
    }
  }

  // Cleanup
  destroy() {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }
}

// Singleton instance
export const monitoring = new MonitoringService();

// React Error Boundary integration
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    monitoring.captureError(error, {
      level: 'error',
      extra: {
        componentStack: errorInfo.componentStack,
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 text-center">
            <h2>Something went wrong</h2>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 btn-primary"
            >
              Reload Page
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// Hook for error handling
import { useEffect } from 'react';

export function useErrorHandler() {
  return (error: Error, errorInfo?: any) => {
    monitoring.captureError(error, {
      extra: errorInfo,
    });
  };
}

// Performance hook
export function usePerformanceMonitor(componentName: string) {
  useEffect(() => {
    monitoring.mark(`${componentName}_mount`);

    return () => {
      monitoring.measure(
        `${componentName}_lifetime`,
        `${componentName}_mount`
      );
    };
  }, [componentName]);
}