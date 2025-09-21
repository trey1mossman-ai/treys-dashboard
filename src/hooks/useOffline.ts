import { useState, useEffect, useCallback } from 'react'
import { offlineManager } from '@/services/offlineManager'

export interface UseOfflineResult {
  isOnline: boolean
  isOffline: boolean
  queueSize: number
  queueAction: (action: any) => Promise<string>
  forceSync: () => Promise<void>
  clearQueue: () => Promise<void>
  getQueueDetails: () => any[]
}

export function useOffline(): UseOfflineResult {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [queueSize, setQueueSize] = useState(0)

  useEffect(() => {
    // Subscribe to status changes
    const unsubscribe = offlineManager.subscribe((online) => {
      setIsOnline(online)
      const status = offlineManager.getStatus()
      setQueueSize(status.queueSize)
    })

    // Initial status
    const status = offlineManager.getStatus()
    setIsOnline(status.isOnline)
    setQueueSize(status.queueSize)

    return unsubscribe
  }, [])

  const queueAction = useCallback(async (action: any) => {
    return await offlineManager.queueAction(action)
  }, [])

  const forceSync = useCallback(async () => {
    await offlineManager.forceSync()
    const status = offlineManager.getStatus()
    setQueueSize(status.queueSize)
  }, [])

  const clearQueue = useCallback(async () => {
    await offlineManager.clearQueue()
    setQueueSize(0)
  }, [])

  const getQueueDetails = useCallback(() => {
    return offlineManager.getQueueDetails()
  }, [])

  return {
    isOnline,
    isOffline: !isOnline,
    queueSize,
    queueAction,
    forceSync,
    clearQueue,
    getQueueDetails
  }
}

// Hook for PWA install prompt
export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
      setIsInstallable(true)
    }

    const handleAppInstalled = () => {
      console.log('PWA was installed')
      setInstallPrompt(null)
      setIsInstallable(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!installPrompt) return false

    try {
      installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice

      if (outcome === 'accepted') {
        console.log('User accepted the install prompt')
        setInstallPrompt(null)
        setIsInstallable(false)
        return true
      } else {
        console.log('User dismissed the install prompt')
        return false
      }
    } catch (error) {
      console.error('Error showing install prompt:', error)
      return false
    }
  }, [installPrompt])

  return {
    isInstallable,
    promptInstall
  }
}