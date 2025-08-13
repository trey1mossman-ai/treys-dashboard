import { useState, memo, useRef } from 'react'
import { Check, Clock, Target, Timer, Edit, Trash, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTimeRange } from '@/lib/time'
import type { AgendaItem as AgendaItemType } from './types'

interface AgendaRowProps {
  item: AgendaItemType
  isNow: boolean
  onToggle: () => void
  onClick: () => void
  onStartFocus: (item: AgendaItemType) => void
  onSnooze: (item: AgendaItemType) => void
  onConvertToTask: (item: AgendaItemType) => void
  onFollowUp: (item: AgendaItemType) => void
  onEdit?: () => void
  onDelete?: () => void
  onSync?: () => void
}

// Status dot component
const StatusDot = ({ status }: { status: 'pending' | 'synced' | 'error' }) => {
  const statusClasses = {
    pending: 'status-dot-amber',
    synced: 'status-dot-green',
    error: 'status-dot-red'
  }
  
  return <div className={cn('status-dot', statusClasses[status])} />
}

// Tag pill component
const TagPill = ({ tag }: { tag: string }) => {
  const tagColors: Record<string, string> = {
    work: 'bg-primary/20 text-primary border-primary/30',
    personal: 'bg-accent/20 text-accent border-accent/30',
    meeting: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
    default: 'bg-muted/50 text-muted-foreground border-muted'
  }
  
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
      tagColors[tag.toLowerCase()] || tagColors.default
    )}>
      {tag}
    </span>
  )
}

// Action button component
const ActionButton = memo(function ActionButton({ 
  icon: Icon, 
  tooltip, 
  onClick,
  variant = 'default'
}: {
  icon: React.ElementType
  tooltip: string
  onClick: () => void
  variant?: 'default' | 'danger' | 'success'
}) {
  const variantClasses = {
    default: 'hover:bg-muted',
    danger: 'hover:bg-destructive/20 hover:text-destructive',
    success: 'hover:bg-green-500/20 hover:text-green-400'
  }
  
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        'p-1.5 rounded-lg bg-muted/50 transition-all duration-150',
        'opacity-0 group-hover:opacity-100 focus:opacity-100',
        variantClasses[variant],
        'relative group/btn'
      )}
      title={tooltip}
      aria-label={tooltip}
    >
      <Icon className="w-4 h-4" />
      <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-card border border-border rounded text-xs whitespace-nowrap opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-opacity z-20">
        {tooltip}
      </span>
    </button>
  )
})

export const AgendaRow = memo(function AgendaRow({ 
  item, 
  isNow, 
  onToggle, 
  onClick,
  onStartFocus,
  onSnooze,
  onConvertToTask,
  onEdit,
  onDelete,
  onSync
}: AgendaRowProps) {
  const [isCompleting, setIsCompleting] = useState(false)
  const [showRipple, setShowRipple] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Handle completion animation
  const handleToggle = () => {
    if (!item.completed) {
      setIsCompleting(true)
      setShowRipple(true)
      setTimeout(() => {
        onToggle()
        setTimeout(() => {
          setIsCompleting(false)
          setShowRipple(false)
        }, 280)
      }, 100)
    } else {
      onToggle()
    }
  }
  
  // Calendar sync status (mock for now - you can connect to real data)
  const syncStatus: 'pending' | 'synced' | 'error' = 'pending'
  
  return (
    <div 
      ref={containerRef}
      id={`agenda-${item.id}`}
      className={cn(
        'group relative rounded-2xl transition-all duration-200 animate-slide-fade',
        'border border-border/70 bg-card/50',
        'hover:bg-card/70',
        isNow && 'glow-live-violet bg-primary/5 border-primary/30',
        item.completed && 'opacity-60',
        isCompleting && 'scale-[0.98]'
      )}
    >
      <div 
        className={cn(
          'flex items-center gap-3 p-4',
          'cursor-pointer',
          showRipple && 'ripple-cyan active'
        )}
        onClick={onClick}
      >
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleToggle()
          }}
          className={cn(
            'relative w-5 h-5 rounded-md border-2 flex items-center justify-center',
            'transition-all duration-200',
            'hover:scale-110',
            item.completed 
              ? 'bg-primary border-primary' 
              : 'border-muted-foreground/50 hover:border-primary'
          )}
          aria-label={item.completed ? 'Mark as incomplete' : 'Mark as complete'}
        >
          {item.completed && (
            <Check className="w-3 h-3 text-primary-foreground animate-slide-fade" />
          )}
        </button>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            {/* Time */}
            <span className="text-sm font-mono text-muted-foreground">
              {formatTimeRange(item.startTime, item.endTime)}
            </span>
            
            {/* Tag */}
            {item.tag && <TagPill tag={item.tag} />}
            
            {/* Status dot */}
            <StatusDot status={syncStatus} />
            
            {/* Now indicator */}
            {isNow && (
              <span className="text-xs text-primary font-medium animate-pulse-glow flex items-center gap-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                Now
              </span>
            )}
          </div>
          
          {/* Title with cross-off animation */}
          <p className={cn(
            'font-medium text-foreground',
            'cross-off',
            item.completed && 'completed'
          )}>
            {item.title}
          </p>
          
          {/* Notes */}
          {item.notes && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {item.notes}
            </p>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1">
          <ActionButton
            icon={Timer}
            tooltip="Focus 25"
            onClick={() => onStartFocus(item)}
          />
          <ActionButton
            icon={Clock}
            tooltip="Snooze"
            onClick={() => onSnooze(item)}
          />
          <ActionButton
            icon={Target}
            tooltip="Convert to Task"
            onClick={() => onConvertToTask(item)}
          />
          {onEdit && (
            <ActionButton
              icon={Edit}
              tooltip="Edit"
              onClick={onEdit}
            />
          )}
          {onDelete && (
            <ActionButton
              icon={Trash}
              tooltip="Delete"
              onClick={onDelete}
              variant="danger"
            />
          )}
          {onSync && (syncStatus as string) === 'error' && (
            <ActionButton
              icon={RefreshCw}
              tooltip="Sync now"
              onClick={onSync}
              variant="success"
            />
          )}
        </div>
      </div>
      
      {/* Completion celebration effect */}
      {isCompleting && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl animate-pulse" />
          {/* Tiny sparkles */}
          <div className="absolute top-4 right-4">
            <svg width="20" height="20" className="animate-ping">
              <circle cx="10" cy="10" r="2" fill="currentColor" className="text-accent" />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison for performance
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.completed === nextProps.item.completed &&
    prevProps.item.title === nextProps.item.title &&
    prevProps.item.notes === nextProps.item.notes &&
    prevProps.item.tag === nextProps.item.tag &&
    prevProps.isNow === nextProps.isNow
  )
})