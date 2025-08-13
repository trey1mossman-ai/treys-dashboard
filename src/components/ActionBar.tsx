import { cn } from '@/lib/utils'

interface ActionBarProps {
  children: React.ReactNode
  className?: string
}

export function ActionBar({ children, className }: ActionBarProps) {
  return (
    <div className={cn(
      "flex items-center justify-end gap-2",
      className
    )}>
      {children}
    </div>
  )
}