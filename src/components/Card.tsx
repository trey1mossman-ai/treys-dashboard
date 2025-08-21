import { cn } from '@/lib/utils'
import React from 'react'
import '@/styles/aesthetic-enhancements.css'

interface CardProps {
  children: React.ReactNode
  className?: string
  glow?: 'accent' | 'accent2' | 'accent3' | 'violet' | 'cyan'
}

export function Card({ children, className, glow }: CardProps) {
  return (
    <div 
      className={cn(
        "neon-card glass-morphism-enhanced rounded-lg p-4 transition-all duration-300",
        glow && {
          'accent': 'glow-accent glow-violet-strong',
          'accent2': 'glow-accent2 glow-cyan-strong',
          'accent3': 'glow-accent3 pulse-ring',
          'violet': 'glow-violet glow-violet-strong',
          'cyan': 'glow-cyan glow-cyan-strong'
        }[glow],
        className
      )}
    >
      {children}
    </div>
  )
}