import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { buildTodaySchedule, mergeScheduleWithSaved } from '@/lib/schedule'
import { STORAGE_KEYS } from '@/lib/constants'
import { getTodayDateString } from '@/lib/time'
import type { AgendaItem } from './types'

export function useAgenda() {
  const [savedItems, setSavedItems] = useLocalStorage<AgendaItem[]>(
    STORAGE_KEYS.AGENDA_ITEMS,
    []
  )
  
  const [selectedItem, setSelectedItem] = useState<AgendaItem | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  
  // Memoize the merged items to prevent unnecessary recalculations
  const items = useMemo(() => {
    const defaultSchedule = buildTodaySchedule()
    const dateString = getTodayDateString()
    
    // Convert string dates back to Date objects
    const parsedSavedItems = savedItems.map(item => ({
      ...item,
      startTime: typeof item.startTime === 'string' ? new Date(item.startTime) : item.startTime,
      endTime: typeof item.endTime === 'string' ? new Date(item.endTime) : item.endTime
    }))
    
    // Merge and add completion status in one pass
    const mergedItems = mergeScheduleWithSaved(defaultSchedule, parsedSavedItems).map(item => {
      const key = `${STORAGE_KEYS.AGENDA_DONE}_${item.id}_${dateString}`
      const completed = localStorage.getItem(key) === 'true'
      return { ...item, completed }
    })
    
    return mergedItems
  }, [savedItems])
  
  const toggleItemComplete = useCallback((itemId: string) => {
    const dateString = getTodayDateString()
    const key = `${STORAGE_KEYS.AGENDA_DONE}_${itemId}_${dateString}`
    const item = items.find(i => i.id === itemId)
    
    if (item) {
      const newCompleted = !item.completed
      localStorage.setItem(key, String(newCompleted))
      
      // Update the saved items to trigger re-computation
      setSavedItems(prev => prev.map(i => 
        i.id === itemId ? { ...i, completed: newCompleted } : i
      ))
    }
  }, [items, setSavedItems])
  
  const addItem = useCallback((item: Omit<AgendaItem, 'id'>) => {
    try {
      // Generate a more robust unique ID
      const newItem = { 
        ...item, 
        id: `agenda-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
      }
      
      setSavedItems(prev => {
        // Check for duplicate titles at the same time
        const isDuplicate = prev.some(existing => 
          existing.title === newItem.title &&
          existing.startTime.getTime() === newItem.startTime.getTime()
        )
        
        if (isDuplicate) {
          console.warn('Duplicate agenda item detected, skipping add')
          return prev
        }
        
        const updated = [...prev, newItem].sort((a, b) => 
          a.startTime.getTime() - b.startTime.getTime()
        )
        return updated
      })
    } catch (error) {
      console.error('Error adding agenda item:', error)
    }
  }, [setSavedItems])
  
  const updateItem = useCallback((id: string, updates: Partial<AgendaItem>) => {
    try {
      setSavedItems(prev => {
        const updated = prev.map(item => 
          item.id === id ? { ...item, ...updates } : item
        )
        
        // Re-sort if times changed
        if (updates.startTime || updates.endTime) {
          return updated.sort((a, b) => 
            a.startTime.getTime() - b.startTime.getTime()
          )
        }
        
        return updated
      })
    } catch (error) {
      console.error('Error updating agenda item:', error)
    }
  }, [setSavedItems])
  
  const deleteItem = useCallback((id: string) => {
    try {
      setSavedItems(prev => prev.filter(item => item.id !== id))
      
      // Also clean up the completion status
      const dateString = getTodayDateString()
      const key = `${STORAGE_KEYS.AGENDA_DONE}_${id}_${dateString}`
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Error deleting agenda item:', error)
    }
  }, [setSavedItems])
  
  const openEditor = useCallback((item?: AgendaItem) => {
    setSelectedItem(item || null)
    setIsEditing(true)
  }, [])
  
  const closeEditor = useCallback(() => {
    setSelectedItem(null)
    setIsEditing(false)
  }, [])
  
  // Clean up old completion statuses (older than 7 days)
  useEffect(() => {
    const cleanupOldStatuses = () => {
      const keys = Object.keys(localStorage)
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
      
      keys.forEach(key => {
        if (key.startsWith(STORAGE_KEYS.AGENDA_DONE)) {
          const parts = key.split('_')
          const dateStr = parts[parts.length - 1]
          
          if (dateStr && new Date(dateStr).getTime() < sevenDaysAgo) {
            localStorage.removeItem(key)
          }
        }
      })
    }
    
    cleanupOldStatuses()
  }, [])
  
  return {
    items,
    selectedItem,
    isEditing,
    toggleItemComplete,
    addItem,
    updateItem,
    deleteItem,
    openEditor,
    closeEditor
  }
}
