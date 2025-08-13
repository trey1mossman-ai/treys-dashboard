import { cn } from '@/lib/utils'
import { TAG_COLORS } from '@/lib/constants'

interface PillProps {
  tag: keyof typeof TAG_COLORS
  className?: string
}

export function Pill({ tag, className }: PillProps) {
  return (
    <span 
      className={cn(
        "px-2 py-0.5 rounded-full text-xs font-medium border",
        TAG_COLORS[tag],
        className
      )}
    >
      {tag}
    </span>
  )
}