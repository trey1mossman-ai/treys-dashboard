import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePWA() {
  const [isInstalled, setIsInstalled] = useState(false)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Check if running as PWA
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  (window.navigator as any).standalone === true

    setIsInstalled(isPWA)

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase()
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent)
    const isAndroidDevice = /android/.test(userAgent)
    
    setIsIOS(isIOSDevice)
    setIsAndroid(isAndroidDevice)

    // Handle install prompt for Android/Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }

    // Handle app installed
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // For iOS, check if it's installable (not installed and is iOS Safari)
    if (isIOSDevice && !isPWA) {
      const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent)
      setIsInstallable(isSafari)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const install = async () => {
    if (isIOS) {
      // For iOS, show instructions
      alert('To install on iOS:\n1. Tap the Share button\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add"')
      return { outcome: 'dismissed' as const }
    }

    if (deferredPrompt) {
      // Show the install prompt
      await deferredPrompt.prompt()
      
      // Wait for the user to respond
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        setIsInstalled(true)
        setIsInstallable(false)
      }
      
      setDeferredPrompt(null)
      return { outcome }
    }

    return { outcome: 'dismissed' as const }
  }

  return {
    isInstalled,
    isInstallable,
    isIOS,
    isAndroid,
    install
  }
}
