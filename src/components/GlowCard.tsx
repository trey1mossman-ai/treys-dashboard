import { cn } from '@/lib/utils'

interface GlowCardProps {
  children: React.ReactNode
  className?: string
  glow?: 'primary' | 'success' | 'depth' | 'none'
  elevation?: 'low' | 'medium' | 'high' | 'none'
  hover?: boolean
  interactive?: boolean
  onClick?: () => void
}

export function GlowCard({ 
  children, 
  className, 
  glow = 'none',
  elevation = 'low',
  hover = true,
  interactive = false,
  onClick 
}: GlowCardProps) {
  const glowClass = {
    primary: 'glow-primary',
    success: 'glow-success',
    depth: 'glow-depth',
    none: ''
  }[glow]
  
  const elevationClass = {
    low: 'elevation-low',
    medium: 'elevation-medium',
    high: 'elevation-high',
    none: ''
  }[elevation]
  
  return (
    <div 
      className={cn(
        'card-base p-6',
        glowClass,
        elevationClass,
        hover && 'motion-safe motion-hover',
        interactive && 'cursor-pointer',
        onClick && 'motion-press',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}