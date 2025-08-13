import { cn } from '@/lib/utils'
import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  glow?: 'accent' | 'accent2' | 'accent3' | 'violet' | 'cyan'
}

export function Card({ children, className, glow }: CardProps) {
  return (
    <div 
      className={cn(
        "bg-card border border-border rounded-lg p-4",
        glow && {
          'accent': 'glow-accent',
          'accent2': 'glow-accent2',
          'accent3': 'glow-accent3',
          'violet': 'glow-violet',
          'cyan': 'glow-cyan'
        }[glow],
        className
      )}
    >
      {children}
    </div>
  )
}