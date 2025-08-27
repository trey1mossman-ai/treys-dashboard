import React, { useRef, useState, useEffect, useCallback, memo } from 'react'
import { useVirtualScroll } from '@/hooks/usePerformance'
import { cn } from '@/lib/utils'

interface VirtualListProps<T> {
  items: T[]
  itemHeight: number | ((index: number) => number)
  renderItem: (item: T, index: number) => React.ReactNode
  overscan?: number
  className?: string
  containerClassName?: string
  onScroll?: (scrollTop: number) => void
  estimatedItemHeight?: number
  getItemKey?: (item: T, index: number) => string | number
  onEndReached?: () => void
  endReachedThreshold?: number
}

/**
 * High-performance virtual list component
 * Renders only visible items for optimal performance with large lists
 */
export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  overscan = 5,
  className,
  containerClassName,
  onScroll,
  estimatedItemHeight = 50,
  getItemKey,
  onEndReached,
  endReachedThreshold = 100
}: VirtualListProps<T>) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)
  const itemHeights = useRef<Map<number, number>>(new Map())
  
  // Calculate item heights for variable height items
  const getItemHeight = useCallback((index: number) => {
    if (typeof itemHeight === 'function') {
      const cached = itemHeights.current.get(index)
      if (cached) return cached
      
      const height = itemHeight(index)
      itemHeights.current.set(index, height)
      return height
    }
    return itemHeight
  }, [itemHeight])
  
  // Calculate total height and item positions
  const calculatePositions = useCallback(() => {
    let totalHeight = 0
    const positions: number[] = []
    
    for (let i = 0; i < items.length; i++) {
      positions.push(totalHeight)
      totalHeight += getItemHeight(i)
    }
    
    return { totalHeight, positions }
  }, [items.length, getItemHeight])
  
  const { totalHeight, positions } = calculatePositions()
  
  // Calculate visible range
  const calculateVisibleRange = useCallback(() => {
    if (!containerHeight) return { start: 0, end: 0 }
    
    let start = 0
    let accumulatedHeight = 0
    
    // Find start index
    for (let i = 0; i < positions.length; i++) {
      if (positions[i] >= scrollTop - overscan * estimatedItemHeight) {
        start = Math.max(0, i - overscan)
        break
      }
    }
    
    // Find end index
    let end = start
    const maxHeight = scrollTop + containerHeight + overscan * estimatedItemHeight
    
    for (let i = start; i < positions.length; i++) {
      if (positions[i] > maxHeight) {
        end = Math.min(items.length - 1, i + overscan)
        break
      }
      end = i
    }
    
    return { start, end: Math.min(end + overscan, items.length - 1) }
  }, [scrollTop, containerHeight, positions, overscan, estimatedItemHeight, items.length])
  
  const { start, end } = calculateVisibleRange()
  
  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop
    setScrollTop(newScrollTop)
    onScroll?.(newScrollTop)
    
    // Check if end reached
    if (onEndReached) {
      const scrollHeight = e.currentTarget.scrollHeight
      const scrollBottom = newScrollTop + containerHeight
      
      if (scrollHeight - scrollBottom < endReachedThreshold) {
        onEndReached()
      }
    }
  }, [containerHeight, onScroll, onEndReached, endReachedThreshold])
  
  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (scrollContainerRef.current) {
        setContainerHeight(scrollContainerRef.current.clientHeight)
      }
    }
    
    updateHeight()
    
    const resizeObserver = new ResizeObserver(updateHeight)
    if (scrollContainerRef.current) {
      resizeObserver.observe(scrollContainerRef.current)
    }
    
    return () => {
      resizeObserver.disconnect()
    }
  }, [])
  
  // Render visible items
  const visibleItems = []
  for (let i = start; i <= end; i++) {
    if (i >= items.length) break
    
    const item = items[i]
    const key = getItemKey ? getItemKey(item, i) : i
    const top = positions[i]
    const height = getItemHeight(i)
    
    visibleItems.push(
      <div
        key={key}
        style={{
          position: 'absolute',
          top,
          left: 0,
          right: 0,
          height
        }}
        data-index={i}
      >
        {renderItem(item, i)}
      </div>
    )
  }
  
  return (
    <div
      ref={scrollContainerRef}
      className={cn(
        'relative overflow-auto',
        containerClassName
      )}
      onScroll={handleScroll}
    >
      <div
        className={cn('relative', className)}
        style={{ height: totalHeight }}
      >
        {visibleItems}
      </div>
    </div>
  )
}

// Memoized item renderer wrapper
interface VirtualListItemProps<T> {
  item: T
  index: number
  renderItem: (item: T, index: number) => React.ReactNode
}

const VirtualListItem = memo(function VirtualListItem<T>({
  item,
  index,
  renderItem
}: VirtualListItemProps<T>) {
  return <>{renderItem(item, index)}</>
})

// Optimized virtual grid for 2D layouts
interface VirtualGridProps<T> {
  items: T[]
  columns: number
  rowHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  gap?: number
  className?: string
  containerClassName?: string
}

export function VirtualGrid<T>({
  items,
  columns,
  rowHeight,
  renderItem,
  gap = 0,
  className,
  containerClassName
}: VirtualGridProps<T>) {
  const rows = Math.ceil(items.length / columns)
  const gridItems: Array<T[]> = []
  
  // Group items into rows
  for (let i = 0; i < rows; i++) {
    const rowItems = items.slice(i * columns, (i + 1) * columns)
    gridItems.push(rowItems)
  }
  
  const renderRow = (rowItems: T[], rowIndex: number) => (
    <div
      key={rowIndex}
      className="flex"
      style={{ gap }}
    >
      {rowItems.map((item, colIndex) => {
        const itemIndex = rowIndex * columns + colIndex
        return (
          <div
            key={itemIndex}
            style={{ flex: `1 1 ${100 / columns}%` }}
          >
            {renderItem(item, itemIndex)}
          </div>
        )
      })}
    </div>
  )
  
  return (
    <VirtualList
      items={gridItems}
      itemHeight={rowHeight + gap}
      renderItem={renderRow}
      className={className}
      containerClassName={containerClassName}
    />
  )
}

// Auto-sizer component for responsive virtual lists
interface AutoSizerProps {
  children: (size: { width: number; height: number }) => React.ReactNode
  className?: string
  defaultWidth?: number
  defaultHeight?: number
}

export function AutoSizer({
  children,
  className,
  defaultWidth = 0,
  defaultHeight = 0
}: AutoSizerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: defaultWidth, height: defaultHeight })
  
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        })
      }
    }
    
    updateSize()
    
    const resizeObserver = new ResizeObserver(updateSize)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }
    
    return () => {
      resizeObserver.disconnect()
    }
  }, [])
  
  return (
    <div ref={containerRef} className={cn('relative flex-1', className)}>
      {size.width > 0 && size.height > 0 && children(size)}
    </div>
  )
}