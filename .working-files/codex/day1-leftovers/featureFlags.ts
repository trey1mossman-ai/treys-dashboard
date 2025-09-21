// CLAUDE CODE: Day 2 - Feature Flags System
// Enables gradual rollout and A/B testing

export interface FeatureFlags {
  // Real-time features
  enableRealtime: boolean;
  enablePresence: boolean;
  enableOptimisticUpdates: boolean;

  // UI features
  enableCommandPalette: boolean;
  enableGestures: boolean;
  enableDragDrop: boolean;
  enableKeyboardShortcuts: boolean;

  // PWA features
  enableOffline: boolean;
  enablePushNotifications: boolean;
  enableBackgroundSync: boolean;

  // Performance features
  enableVirtualScrolling: boolean;
  enableLazyLoading: boolean;
  enablePreloading: boolean;

  // Beta features
  enableBetaFeatures: boolean;
  enableExperiments: boolean;
  enableDebugMode: boolean;
}

// Default flags for different environments
const defaultFlags: Record<string, FeatureFlags> = {
  development: {
    enableRealtime: false,
    enablePresence: false,
    enableOptimisticUpdates: true,
    enableCommandPalette: true,
    enableGestures: true,
    enableDragDrop: true,
    enableKeyboardShortcuts: true,
    enableOffline: false,
    enablePushNotifications: false,
    enableBackgroundSync: false,
    enableVirtualScrolling: true,
    enableLazyLoading: true,
    enablePreloading: true,
    enableBetaFeatures: true,
    enableExperiments: true,
    enableDebugMode: true,
  },
  staging: {
    enableRealtime: true,
    enablePresence: true,
    enableOptimisticUpdates: true,
    enableCommandPalette: true,
    enableGestures: true,
    enableDragDrop: true,
    enableKeyboardShortcuts: true,
    enableOffline: true,
    enablePushNotifications: false,
    enableBackgroundSync: true,
    enableVirtualScrolling: true,
    enableLazyLoading: true,
    enablePreloading: true,
    enableBetaFeatures: true,
    enableExperiments: false,
    enableDebugMode: false,
  },
  production: {
    enableRealtime: false, // Enable when ready
    enablePresence: false,
    enableOptimisticUpdates: true,
    enableCommandPalette: true,
    enableGestures: false, // Enable after testing
    enableDragDrop: true,
    enableKeyboardShortcuts: true,
    enableOffline: false, // Enable when ready
    enablePushNotifications: false,
    enableBackgroundSync: false,
    enableVirtualScrolling: true,
    enableLazyLoading: true,
    enablePreloading: true,
    enableBetaFeatures: false,
    enableExperiments: false,
    enableDebugMode: false,
  },
};

class FeatureFlagsService {
  private flags: FeatureFlags;
  private overrides: Partial<FeatureFlags> = {};
  private listeners: Set<(flags: FeatureFlags) => void> = new Set();

  constructor() {
    // Determine environment
    const env = this.getEnvironment();

    // Load default flags for environment
    this.flags = { ...defaultFlags[env] };

    // Load overrides from localStorage
    this.loadOverrides();

    // Load remote flags if available
    this.loadRemoteFlags();

    // Support URL parameters for testing
    this.loadUrlFlags();
  }

  private getEnvironment(): string {
    if (typeof window === 'undefined') return 'development';

    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'development';
    }
    if (hostname.includes('staging') || hostname.includes('preview')) {
      return 'staging';
    }
    return 'production';
  }

  private loadOverrides(): void {
    try {
      const stored = localStorage.getItem('featureFlags');
      if (stored) {
        this.overrides = JSON.parse(stored);
        this.flags = { ...this.flags, ...this.overrides };
      }
    } catch (error) {
      console.error('Failed to load feature flag overrides:', error);
    }
  }

  private async loadRemoteFlags(): Promise<void> {
    try {
      // In production, fetch from your API
      if (this.getEnvironment() === 'production') {
        const response = await fetch('/api/feature-flags', {
          credentials: 'include',
        });

        if (response.ok) {
          const remoteFlags = await response.json();
          this.flags = { ...this.flags, ...remoteFlags };
          this.notifyListeners();
        }
      }
    } catch (error) {
      console.error('Failed to load remote feature flags:', error);
    }
  }

  private loadUrlFlags(): void {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const urlFlags: Partial<FeatureFlags> = {};

    // Support ?features=realtime,gestures,offline
    const features = params.get('features');
    if (features) {
      features.split(',').forEach(feature => {
        const flagName = `enable${feature.charAt(0).toUpperCase()}${feature.slice(1)}` as keyof FeatureFlags;
        if (flagName in this.flags) {
          urlFlags[flagName] = true;
        }
      });
    }

    // Support individual flags ?enableRealtime=true
    Object.keys(this.flags).forEach(key => {
      const value = params.get(key);
      if (value !== null) {
        (urlFlags as any)[key] = value === 'true';
      }
    });

    if (Object.keys(urlFlags).length > 0) {
      this.flags = { ...this.flags, ...urlFlags };
      console.log('Feature flags overridden from URL:', urlFlags);
    }
  }

  // Public API
  isEnabled(flag: keyof FeatureFlags): boolean {
    return this.flags[flag] ?? false;
  }

  getFlags(): FeatureFlags {
    return { ...this.flags };
  }

  override(flag: keyof FeatureFlags, value: boolean): void {
    this.overrides[flag] = value;
    this.flags[flag] = value;

    // Persist overrides
    try {
      localStorage.setItem('featureFlags', JSON.stringify(this.overrides));
    } catch (error) {
      console.error('Failed to save feature flag override:', error);
    }

    this.notifyListeners();
  }

  resetOverrides(): void {
    this.overrides = {};
    localStorage.removeItem('featureFlags');

    const env = this.getEnvironment();
    this.flags = { ...defaultFlags[env] };

    this.notifyListeners();
  }

  // Subscribe to flag changes
  subscribe(listener: (flags: FeatureFlags) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getFlags()));
  }

  // A/B Testing support
  getVariant(experimentName: string, variants: string[]): string {
    if (!this.flags.enableExperiments) {
      return variants[0]; // Return control variant
    }

    // Simple hash-based assignment (deterministic per user)
    const userId = this.getUserId();
    const hash = this.hashCode(`${userId}-${experimentName}`);
    const index = Math.abs(hash) % variants.length;

    return variants[index];
  }

  private getUserId(): string {
    // Get or create user ID for consistent A/B testing
    let userId = localStorage.getItem('userId');
    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem('userId', userId);
    }
    return userId;
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  // Performance monitoring per feature
  trackFeatureUsage(flag: keyof FeatureFlags, metadata?: any): void {
    if (!this.isEnabled(flag)) return;

    // Send to analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'feature_usage', {
        feature: flag,
        enabled: true,
        ...metadata,
      });
    }
  }
}

// Singleton instance
export const featureFlags = new FeatureFlagsService();

// React hook for feature flags
import { useState, useEffect } from 'react';

export function useFeatureFlag(flag: keyof FeatureFlags): boolean {
  const [enabled, setEnabled] = useState(() => featureFlags.isEnabled(flag));

  useEffect(() => {
    const unsubscribe = featureFlags.subscribe((flags) => {
      setEnabled(flags[flag]);
    });

    return unsubscribe;
  }, [flag]);

  return enabled;
}

// HOC for feature-gated components
export function withFeatureFlag<P extends object>(
  flag: keyof FeatureFlags,
  Component: React.ComponentType<P>,
  Fallback?: React.ComponentType<P>
): React.FC<P> {
  return (props: P) => {
    const enabled = useFeatureFlag(flag);

    if (!enabled) {
      return Fallback ? <Fallback {...props} /> : null;
    }

    return <Component {...props} />;
  };
}