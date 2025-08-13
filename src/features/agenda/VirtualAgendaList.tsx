import { useRef, useEffect, useMemo, useCallback } from 'react'
import { FixedSizeList as List } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import { AgendaItem } from './AgendaItem'
import type { AgendaItem as AgendaItemType } from './types'
import { isTimeInRange } from '@/lib/time'

interface VirtualAgendaListProps {
  items: AgendaItemType[]
  currentTime: Date
  onToggleComplete: (itemId: string) => void
  onItemClick: (item: AgendaItemType) => void
  onStartFocus: (item: AgendaItemType) => void
  onSnooze: (item: AgendaItemType) => void
  onConvertToTask: (item: AgendaItemType) => void
  onFollowUp: (item: AgendaItemType) => void
}

export function VirtualAgendaList({
  items,
  currentTime,
  onToggleComplete,
  onItemClick,
  onStartFocus,
  onSnooze,
  onConvertToTask,
  onFollowUp
}: VirtualAgendaListProps) {
  const listRef = useRef<List>(null)

  // Find the current item index
  const currentItemIndex = useMemo(() => {
    return items.findIndex(item => 
      isTimeInRange(currentTime, item.startTime, item.endTime)
    )
  }, [items, currentTime])

  // Scroll to current item when it changes
  useEffect(() => {
    if (listRef.current && currentItemIndex >= 0) {
      listRef.current.scrollToItem(currentItemIndex, 'center')
    }
  }, [currentItemIndex])

  // Handle jump to now event
  useEffect(() => {
    const handleJumpToNow = () => {
      if (listRef.current && currentItemIndex >= 0) {
        listRef.current.scrollToItem(currentItemIndex, 'center')
      }
    }

    window.addEventListener('jumpToNow', handleJumpToNow)
    return () => window.removeEventListener('jumpToNow', handleJumpToNow)
  }, [currentItemIndex])

  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = items[index]
    const isNow = isTimeInRange(currentTime, item.startTime, item.endTime)

    return (
      <div style={style}>
        <AgendaItem
          item={item}
          isNow={isNow}
          onToggle={() => onToggleComplete(item.id)}
          onClick={() => onItemClick(item)}
          onStartFocus={() => onStartFocus(item)}
          onSnooze={() => onSnooze(item)}
          onConvertToTask={() => onConvertToTask(item)}
          onFollowUp={() => onFollowUp(item)}
        />
      </div>
    )
  }, [items, currentTime, onToggleComplete, onItemClick, onStartFocus, onSnooze, onConvertToTask, onFollowUp])

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted">
        No agenda items for today
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <AutoSizer>
        {({ height, width }) => (
          <List
            ref={listRef}
            height={height}
            itemCount={items.length}
            itemSize={100} // Approximate height of each agenda item
            width={width}
            overscanCount={3} // Render 3 items outside of visible area for smoother scrolling
            className="scroll-container" // iOS optimized scrolling
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </div>
  )
}
