import { useState, useEffect, useCallback } from 'react'
import { dbService, AgendaItem } from '@/services/dbService'
import { useToast } from '@/hooks/useToast'

export function useAgendaDB(date?: string) {
  const [items, setItems] = useState<AgendaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState<AgendaItem | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedDate, setSelectedDate] = useState(date || new Date().toISOString().split('T')[0])
  const { toast } = useToast()

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const data = await dbService.agenda.list(selectedDate)
      setItems(data.sort((a, b) => a.start_ts - b.start_ts))
    } catch (error) {
      console.error('Failed to load agenda items:', error)
      toast({
        title: 'Error',
        description: 'Failed to load agenda items',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [selectedDate, toast])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const addItem = async (item: Omit<AgendaItem, 'id'>) => {
    try {
      const result = await dbService.agenda.upsert(item)
      toast({
        title: 'Success',
        description: 'Agenda item created',
        variant: 'default'
      })
      await loadItems()
      return result.id
    } catch (error) {
      console.error('Failed to add item:', error)
      toast({
        title: 'Error',
        description: 'Failed to create agenda item',
        variant: 'destructive'
      })
      return null
    }
  }

  const updateItem = async (id: string, updates: Partial<AgendaItem>) => {
    try {
      const item = items.find(i => i.id === id)
      if (!item) return
      
      await dbService.agenda.upsert({ 
        ...item,
        ...updates,
        id 
      })
      toast({
        title: 'Success',
        description: 'Agenda item updated',
        variant: 'default'
      })
      await loadItems()
    } catch (error) {
      console.error('Failed to update item:', error)
      toast({
        title: 'Error',
        description: 'Failed to update agenda item',
        variant: 'destructive'
      })
    }
  }

  const deleteItem = async (id: string) => {
    try {
      await dbService.agenda.delete(id)
      toast({
        title: 'Success',
        description: 'Agenda item deleted',
        variant: 'default'
      })
      await loadItems()
    } catch (error) {
      console.error('Failed to delete item:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete agenda item',
        variant: 'destructive'
      })
    }
  }

  const toggleItemComplete = async (id: string) => {
    const item = items.find(i => i.id === id)
    if (!item) return
    
    const newStatus = item.status === 'done' ? 'pending' : 'done'
    await updateItem(id, { status: newStatus })
  }

  const snoozeItem = async (id: string, minutes = 15) => {
    const item = items.find(i => i.id === id)
    if (!item) return
    
    const snoozeTime = minutes * 60 // Convert to seconds
    await updateItem(id, {
      start_ts: item.start_ts + snoozeTime,
      end_ts: item.end_ts + snoozeTime,
      status: 'snoozed'
    })
  }

  const startFocus = async (id: string) => {
    await updateItem(id, { status: 'in_progress' })
    // Trigger focus timer
    window.dispatchEvent(new CustomEvent('startFocusTimer', { detail: { itemId: id } }))
  }

  const openEditor = (item?: AgendaItem) => {
    setSelectedItem(item || null)
    setIsEditing(true)
  }

  const closeEditor = () => {
    setSelectedItem(null)
    setIsEditing(false)
  }

  const changeDate = (newDate: string) => {
    setSelectedDate(newDate)
  }

  return {
    items,
    loading,
    selectedItem,
    isEditing,
    selectedDate,
    addItem,
    updateItem,
    deleteItem,
    toggleItemComplete,
    snoozeItem,
    startFocus,
    openEditor,
    closeEditor,
    changeDate,
    refresh: loadItems
  }
}