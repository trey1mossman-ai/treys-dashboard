import { cn } from '@/lib/utils'

interface GlowCardProps {
  children: React.ReactNode
  className?: string
  glow?: 'violet' | 'cyan' | 'soft' | 'strong' | 'none'
  hover?: boolean
  interactive?: boolean
  onClick?: () => void
}

export function GlowCard({ 
  children, 
  className, 
  glow = 'soft',
  hover = true,
  interactive = false,
  onClick 
}: GlowCardProps) {
  const glowClass = {
    violet: 'glow-violet',
    cyan: 'glow-cyan',
    soft: 'glow-soft',
    strong: 'card-glow',
    none: ''
  }[glow]
  
  return (
    <div 
      className={cn(
        'card-base p-6 border-glow',
        glowClass,
        hover && 'hover-glow',
        interactive && 'interactive interactive-hover cursor-pointer',
        onClick && 'interactive-active',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}