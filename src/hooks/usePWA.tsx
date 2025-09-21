// PWA Registration Helper
// Team Lead: Claude - For Codex
// Ready-to-use registration code with full error handling

import { useCallback, useEffect, useMemo, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string[] }>;
}

const isLocalhost = () =>
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '[::1]';

let swRegistrationInFlight: Promise<ServiceWorkerRegistration | null> | null = null;

/**
 * Complete PWA registration hook with install prompt handling.
 * Handles service worker registration, install prompt, and platform detection.
 */
export function usePWA() {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [lastCheck, setLastCheck] = useState<number>(Date.now());

  const isIOS = useMemo(
    () => /iphone|ipad|ipod/i.test(window.navigator.userAgent),
    []
  );

  const isAndroid = useMemo(
    () => /android/i.test(window.navigator.userAgent),
    []
  );

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Register service worker
    let intervalId: number | null = null;

    if ('serviceWorker' in navigator && (process.env.NODE_ENV === 'production' || isLocalhost())) {
      if (!swRegistrationInFlight) {
        swRegistrationInFlight = navigator.serviceWorker
          .register('/service-worker.js')
          .catch((error) => {
            console.error('❌ Service Worker registration failed:', error);
            return null;
          });
      }

      swRegistrationInFlight
        ?.then((registration) => {
          if (!registration) return;

          setSwRegistration(registration);
          console.log('✅ Service Worker registered:', registration.scope);

          intervalId = window.setInterval(() => {
            registration.update().catch((error) => {
              console.warn('⚠️ Service Worker update check failed:', error);
            });
            setLastCheck(Date.now());
          }, 10 * 60 * 1000);

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('ℹ️ New service worker available');
                window.dispatchEvent(new CustomEvent('pwa:update-ready'));
              }
            });
          });
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error);
        });
    }

    // Handle install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setInstallPromptEvent(promptEvent);
      setIsInstallable(true);
      console.log('📱 PWA install available');
    };

    // Handle successful install
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPromptEvent(null);
      console.log('🎉 PWA installed successfully');
      
      // Track installation
      window.dispatchEvent(new CustomEvent('pwa:installed'));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  const installApp = useCallback(async (): Promise<{ outcome: 'accepted' | 'dismissed'; platform: string[] } | null> => {
    if (!installPromptEvent) {
      if (isIOS && !isInstalled) {
        // iOS does not support programmatic prompt; surface a manual dismissal hint
        return { outcome: 'dismissed', platform: ['ios-manual'] as string[] };
      }
      return null;
    }

    // Show the install prompt
    await installPromptEvent.prompt();

    try {
      const choice = await installPromptEvent.userChoice;
      console.log('📥 Install prompt outcome:', choice.outcome);

      if (choice.outcome === 'accepted') {
        setInstallPromptEvent(null);
        setIsInstallable(false);
      }

      return choice;
    } catch (error) {
      console.warn('⚠️ Install prompt error:', error);
      return null;
    }
  }, [installPromptEvent, isIOS, isInstalled]);

  const updateServiceWorker = useCallback(async () => {
    if (!swRegistration) return null;

    try {
      const result = await swRegistration.update();
      return result;
    } catch (error) {
      console.warn('⚠️ Failed to update service worker:', error);
      return null;
    }
  }, [swRegistration]);

  const sendSkipWaiting = useCallback(() => {
    if (!swRegistration || !swRegistration.waiting) return;
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }, [swRegistration]);

  return {
    isInstalled,
    isInstallable: isInstallable || (isIOS && !isInstalled),
    install: installApp,
    updateServiceWorker,
    swRegistration,
    lastCheck,
    isIOS,
    isAndroid,
    sendSkipWaiting
  };
}

/**
 * Install Button Component
 * Drop this into your dashboard header
 */
interface PWAInstallButtonProps {
  isInstallable: boolean;
  install: () => Promise<{ outcome: 'accepted' | 'dismissed'; platform: string[] } | null>;
}

export function PWAInstallButton({ isInstallable, install }: PWAInstallButtonProps) {
  if (!isInstallable) return null;

  const handleClick = async () => {
    const choice = await install();
    if (choice?.outcome === 'dismissed') {
      console.info('PWA install dismissed');
    }
  };

  return (
    <button
      onClick={handleClick}
      className="fixed top-4 right-4 z-50 bg-gradient-to-r from-violet-600 to-violet-700 text-white px-6 py-2.5 rounded-xl shadow-[0_8px_32px_rgba(168,132,255,0.3)] hover:shadow-[0_12px_48px_rgba(168,132,255,0.4)] hover:scale-105 transition-all duration-300 flex items-center gap-2 min-h-[44px]"
      data-testid="pwa-install-button"
    >
      <svg 
        className="w-5 h-5" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 4v16m8-8l-8 8-8-8" 
        />
      </svg>
      Install App
    </button>
  );
}
