import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActionCardProps {
  icon: LucideIcon
  title: string
  description?: string
  onClick: () => void
  variant?: 'default' | 'primary' | 'accent'
  disabled?: boolean
  loading?: boolean
}

export function ActionCard({ 
  icon: Icon, 
  title, 
  description, 
  onClick,
  variant = 'default',
  disabled = false,
  loading = false
}: ActionCardProps) {
  const variantClasses = {
    default: 'hover:border-muted-foreground/30',
    primary: 'hover:border-primary/50 hover:glow-violet',
    accent: 'hover:border-accent/50 hover:glow-cyan'
  }
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'card-base p-6 w-full text-left',
        'interactive interactive-hover interactive-active',
        'flex flex-col gap-3',
        'border-2',
        variantClasses[variant],
        (disabled || loading) && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex items-start justify-between">
        <Icon className={cn(
          "w-5 h-5",
          variant === 'primary' && 'text-primary',
          variant === 'accent' && 'text-accent'
        )} />
        {loading && (
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        )}
      </div>
      
      <div className="space-y-1">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}
      </div>
    </button>
  )
}