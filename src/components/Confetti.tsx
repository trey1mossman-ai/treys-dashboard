import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface ConfettiProps {
  trigger: boolean
  onComplete?: () => void
}

export function Confetti({ trigger, onComplete }: ConfettiProps) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([])

  useEffect(() => {
    if (!trigger) return

    const newParticles = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100 - 50,
      y: Math.random() * -50 - 20
    }))

    setParticles(newParticles)

    const timer = setTimeout(() => {
      setParticles([])
      onComplete?.()
    }, 1000)

    return () => clearTimeout(timer)
  }, [trigger, onComplete])

  if (particles.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute left-1/2 top-1/2 w-2 h-2"
          style={{
            animation: 'confetti-fall 1s ease-out forwards',
            ['--x' as any]: `${particle.x}px`,
            ['--y' as any]: `${particle.y}px`
          }}
        >
          <div className={cn(
            "w-full h-full rounded-full",
            Math.random() > 0.5 ? "bg-primary" : "bg-accent",
            "animate-pulse"
          )} />
        </div>
      ))}
      
    </div>
  )
}