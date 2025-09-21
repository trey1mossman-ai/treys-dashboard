import React from 'react'
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
  type DraggableProvided,
  type DraggableStateSnapshot
} from 'react-beautiful-dnd'
import { useDragDrop } from '@/hooks/useDragDrop'

interface RenderArgs<T> {
  item: T
  index: number
  provided: DraggableProvided
  snapshot: DraggableStateSnapshot
}

interface DraggableListProps<T> {
  items: T[]
  getId: (item: T, index: number) => string
  onReorder: (items: T[]) => void
  renderItem: (args: RenderArgs<T>) => React.ReactNode
  droppableId?: string
  isDropDisabled?: boolean
  direction?: 'vertical' | 'horizontal'
  className?: string
}

export function DraggableList<T>({
  items,
  getId,
  onReorder,
  renderItem,
  droppableId = 'droppable',
  direction = 'vertical',
  isDropDisabled = false,
  className
}: DraggableListProps<T>) {
  const handleDragEnd = useDragDrop(items, onReorder)

  const onDragEnd = (result: DropResult) => {
    handleDragEnd(result)
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId={droppableId} direction={direction} isDropDisabled={isDropDisabled}>
        {(dropProvided) => (
          <div
            ref={dropProvided.innerRef}
            className={className}
            {...dropProvided.droppableProps}
          >
            {items.map((item, index) => (
              <Draggable key={getId(item, index)} draggableId={getId(item, index)} index={index}>
                {(dragProvided, snapshot) => (
                  <React.Fragment>
                    {renderItem({ item, index, provided: dragProvided, snapshot })}
                  </React.Fragment>
                )}
              </Draggable>
            ))}
            {dropProvided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  )
}
