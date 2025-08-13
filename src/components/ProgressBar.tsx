import { getProgressPercentage } from '@/lib/time'
import { DEFAULT_DAY_START_HOUR, DEFAULT_DAY_END_HOUR } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface ProgressBarProps {
  now: Date
  className?: string
}

export function ProgressBar({ now, className }: ProgressBarProps) {
  const progress = getProgressPercentage(now, DEFAULT_DAY_START_HOUR, DEFAULT_DAY_END_HOUR)
  
  return (
    <div className={cn("relative w-full h-2 bg-secondary rounded-full overflow-hidden", className)}>
      <div 
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent transition-all duration-300"
        style={{ width: `${progress}%` }}
      >
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full animate-pulse" />
      </div>
    </div>
  )
}