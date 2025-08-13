import { useState, memo } from 'react'
import { Check, Clock, Target, Mail, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTimeRange } from '@/lib/time'
import { Pill } from '@/components/Pill'
import type { AgendaItem as AgendaItemType } from './types'

interface AgendaItemProps {
  item: AgendaItemType
  isNow: boolean
  onToggle: (e?: React.MouseEvent) => void
  onClick: (e?: React.MouseEvent) => void
  onStartFocus: (item: AgendaItemType) => void
  onSnooze: (item: AgendaItemType) => void
  onConvertToTask: (item: AgendaItemType) => void
  onFollowUp: (item: AgendaItemType) => void
}

// Memoized AgendaItem component with custom comparison
export const AgendaItem = memo(function AgendaItem({ 
  item, 
  isNow, 
  onToggle, 
  onClick,
  onStartFocus,
  onSnooze,
  onConvertToTask,
  onFollowUp
}: AgendaItemProps) {
  const [showActions, setShowActions] = useState(false)
  
  return (
    <div 
      id={`agenda-${item.id}`}
      className={cn(
        "group relative flex items-center gap-3 p-4 rounded-xl transition-all",
        "hover:bg-muted/20 cursor-pointer scroll-container", // Added scroll-container for iOS
        isNow && "bg-primary/10 border border-primary/30 glow-violet",
        item.completed && "opacity-60"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      // Touch events for mobile
      onTouchStart={() => setShowActions(true)}
      onTouchEnd={() => setTimeout(() => setShowActions(false), 2000)}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        className={cn(
          "touchable w-5 h-5 rounded-md border-2 flex items-center justify-center interactive shrink-0",
          item.completed 
            ? "bg-primary border-primary" 
            : "border-muted-foreground hover:border-primary"
        )}
        aria-label={item.completed ? "Mark as incomplete" : "Mark as complete"}
      >
        {item.completed && <Check className="w-3 h-3 text-primary-foreground" />}
      </button>
      
      <div className="flex-1 min-w-0" onClick={onClick}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-mono text-muted-foreground">
            {formatTimeRange(item.startTime, item.endTime)}
          </span>
          {item.tag && <Pill tag={item.tag} />}
          {isNow && (
            <span className="text-xs text-primary animate-pulse-glow">Now</span>
          )}
        </div>
        <p className={cn(
          "mt-1 font-medium text-foreground selectable", // Added selectable for iOS
          item.completed && "line-through"
        )}>
          {item.title}
        </p>
        {item.notes && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2 selectable">{item.notes}</p>
        )}
      </div>
      
      {/* Action buttons - improved for touch */}
      <div className={cn(
        "absolute right-4 top-1/2 -translate-y-1/2 md:right-4",
        "flex items-center gap-1",
        "transition-opacity",
        showActions ? "opacity-100" : "opacity-0 md:pointer-events-none",
        "touch-manipulation" // Optimize for touch
      )}>
        <ActionButton
          icon={Timer}
          tooltip="Start Focus (25m)"
          onClick={() => onStartFocus(item)}
        />
        <ActionButton
          icon={Clock}
          tooltip="Snooze 15m"
          onClick={() => onSnooze(item)}
        />
        <ActionButton
          icon={Target}
          tooltip="Convert to Task"
          onClick={() => onConvertToTask(item)}
        />
        <ActionButton
          icon={Mail}
          tooltip="Follow-up"
          onClick={() => onFollowUp(item)}
        />
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison function - only re-render if these specific props change
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.completed === nextProps.item.completed &&
    prevProps.item.title === nextProps.item.title &&
    prevProps.item.notes === nextProps.item.notes &&
    prevProps.item.tag === nextProps.item.tag &&
    prevProps.isNow === nextProps.isNow
  )
})

interface ActionButtonProps {
  icon: React.ElementType
  tooltip: string
  onClick: () => void
}

const ActionButton = memo(function ActionButton({ icon: Icon, tooltip, onClick }: ActionButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="touchable p-1.5 rounded-lg bg-muted/50 hover:bg-muted interactive group/btn relative"
      title={tooltip}
      aria-label={tooltip}
    >
      <Icon className="w-4 h-4 text-muted-foreground group-hover/btn:text-foreground" />
      <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-card border border-border rounded text-xs whitespace-nowrap opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-opacity z-10">
        {tooltip}
      </span>
    </button>
  )
})
