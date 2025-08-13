import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
}

export function Loading({ size = 'md', text, className }: LoadingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin text-accent', sizeClasses[size])} />
      {text && <p className="text-sm text-muted">{text}</p>}
    </div>
  )
}
