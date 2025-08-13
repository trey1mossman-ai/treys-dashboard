import { useEffect, useState, useRef } from 'react'
import { X, Play, Pause, RotateCcw } from 'lucide-react'

interface FocusTimerProps {
  title: string
  duration?: number // minutes
  onComplete: () => void
  onCancel: () => void
}

export function FocusTimer({ 
  title, 
  duration = 25, 
  onComplete, 
  onCancel 
}: FocusTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration * 60)
  const [isPaused, setIsPaused] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout>()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  // Create notification sound
  useEffect(() => {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    gainNode.gain.value = 0.3
    
    // Store audio for later use
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGN1fPTgjMGHm7A7+OZURE')
  }, [])
  
  useEffect(() => {
    if (!isPaused && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Play notification sound
            if (audioRef.current) {
              audioRef.current.play().catch(e => console.log('Audio play failed:', e))
            }
            // Show notification if permission granted
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Focus Session Complete!', {
                body: `Completed: ${title}`,
                icon: '/pwa-192x192.png'
              })
            }
            onComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPaused, timeLeft, onComplete, title])
  
  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])
  
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const progress = ((duration * 60 - timeLeft) / (duration * 60)) * 100
  
  const handleReset = () => {
    setTimeLeft(duration * 60)
    setIsPaused(true)
  }
  
  return (
    <div className="fixed top-20 right-6 z-40 card-base glow-violet p-4 min-w-[280px] animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span className="text-sm font-medium text-primary">Focus Session</span>
        </div>
        <button
          onClick={onCancel}
          className="p-1 rounded hover:bg-muted/50 interactive"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground truncate">{title}</p>
        
        <div className="text-center">
          <div className="text-3xl font-mono font-bold text-foreground">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
        </div>
        
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="absolute inset-y-0 left-0 bg-primary transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="flex-1 p-2 bg-primary/10 hover:bg-primary/20 rounded-lg interactive flex items-center justify-center gap-2"
          >
            {isPaused ? (
              <>
                <Play className="w-4 h-4" />
                <span className="text-sm">Resume</span>
              </>
            ) : (
              <>
                <Pause className="w-4 h-4" />
                <span className="text-sm">Pause</span>
              </>
            )}
          </button>
          <button
            onClick={handleReset}
            className="p-2 bg-muted/50 hover:bg-muted rounded-lg interactive"
            title="Reset timer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Overlay to dim the rest of the UI when focus timer is active
export function FocusOverlay() {
  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-30 pointer-events-none" />
  )
}