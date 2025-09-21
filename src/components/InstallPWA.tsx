import { useState } from 'react'
import { Download, X, Smartphone, Monitor } from 'lucide-react'
import { Button } from './ui/button'
import { Card } from './Card'
import { usePWA } from '@/hooks/usePWA'
import { cn } from '@/lib/utils'

export function InstallPWA() {
  const { isInstalled, isInstallable, isIOS, isAndroid, install } = usePWA()
  const [dismissed, setDismissed] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  // Don't show if already installed, not installable, or dismissed
  if (isInstalled || !isInstallable || dismissed) {
    return null
  }

  const handleInstall = async () => {
    setIsInstalling(true)
    try {
      const result = await install()

      if (result?.outcome === 'accepted' || isIOS) {
        setDismissed(true)
      }
    } finally {
      setIsInstalling(false)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    // Remember dismissal for 7 days
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  // Check if previously dismissed within 7 days
  if (typeof window !== 'undefined') {
    const previouslyDismissed = localStorage.getItem('pwa-install-dismissed')
    if (previouslyDismissed) {
      const dismissedTime = parseInt(previouslyDismissed)
      const sevenDays = 7 * 24 * 60 * 60 * 1000
      if (Date.now() - dismissedTime < sevenDays) {
        return null
      }
    }
  }

  return (
    <Card className={cn(
      "fixed bottom-4 right-4 left-4 md:left-auto md:w-96 p-4 z-50",
      "bg-card/95 backdrop-blur-md border-primary/20",
      "animate-slide-up shadow-lg",
      "safe-area-inset-bottom" // iOS safe area
    )}>
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-lg hover:bg-muted touchable"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-lg",
          isIOS ? "bg-blue-500/10" : "bg-primary/10"
        )}>
          {isIOS ? (
            <Smartphone className="w-5 h-5 text-blue-500" />
          ) : isAndroid ? (
            <Smartphone className="w-5 h-5 text-green-500" />
          ) : (
            <Monitor className="w-5 h-5 text-primary" />
          )}
        </div>
        
        <div className="flex-1 space-y-2">
          <h3 className="font-semibold text-sm">
            Install Agenda Dashboard
          </h3>
          <p className="text-xs text-muted-foreground">
            {isIOS 
              ? "Add to your home screen for quick access and offline support"
              : "Install for a native app experience with offline support"
            }
          </p>
          
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={handleInstall}
              disabled={isInstalling}
              className="flex-1"
            >
              <Download className="w-3 h-3 mr-1" />
              {isInstalling ? "Installing..." : isIOS ? "Show Instructions" : "Install"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDismiss}
              className="flex-1"
            >
              Not Now
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
