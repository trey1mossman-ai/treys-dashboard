import { cn } from '@/lib/utils'
import { HTMLAttributes, forwardRef } from 'react'

interface GlowCardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  variant?: 'neutral' | 'primary' | 'accent'
  interactive?: boolean
  elevation?: 0 | 1 | 2
  glow?: 'hover' | 'live-violet' | 'live-cyan' | 'celebration' | 'none'
}

export const GlowCard = forwardRef<HTMLDivElement, GlowCardProps>(
  ({ 
    children, 
    className,
    variant = 'neutral',
    interactive = false,
    elevation = 1,
    glow = 'hover',
    onClick,
    ...props
  }, ref) => {
    const variantClasses = {
      neutral: 'bg-card/70 border-border/70',
      primary: 'bg-primary/10 border-primary/30',
      accent: 'bg-accent/10 border-accent/30'
    }
    
    const elevationClasses = {
      0: 'elevation-0',
      1: 'elevation-1',
      2: 'elevation-2'
    }
    
    const glowClasses = {
      hover: interactive ? 'glow-hover' : '',
      'live-violet': 'glow-live-violet',
      'live-cyan': 'glow-live-cyan',
      celebration: 'glow-celebration',
      none: ''
    }
    
    return (
      <div 
        ref={ref}
        className={cn(
          'rounded-2xl border transition-all duration-200',
          variantClasses[variant],
          elevationClasses[elevation],
          glowClasses[glow],
          interactive && 'cursor-pointer hover:scale-[1.01] active:scale-[0.995]',
          className
        )}
        onClick={onClick}
        {...props}
      >
        {children}
      </div>
    )
  }
)

GlowCard.displayName = 'GlowCard'