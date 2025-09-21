import { useCallback } from 'react'
import type { DropResult } from 'react-beautiful-dnd'

export function useDragDrop<T>(items: T[], onReorder: (items: T[]) => void) {
  return useCallback(
    (result: DropResult) => {
      const { destination, source } = result
      if (!destination) return
      if (destination.index === source.index && destination.droppableId === source.droppableId) {
        return
      }

      const updated = [...items]
      const [removed] = updated.splice(source.index, 1)
      updated.splice(destination.index, 0, removed)
      onReorder(updated)
    },
    [items, onReorder]
  )
}
