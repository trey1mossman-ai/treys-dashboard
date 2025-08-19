import { useEffect, useCallback, useState } from 'react'
import { Plus } from 'lucide-react'
import { useNow } from '@/hooks/useNow'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/Card'
import { Section } from '@/components/Section'
import { ProgressBar } from '@/components/ProgressBar'
import { AgendaItem } from './AgendaItem'
import { AgendaEditor } from './AgendaEditor'
import { FocusTimer, FocusOverlay } from './FocusTimer'
import { useAgenda } from './useAgenda'
import { isTimeInRange } from '@/lib/time'
import { mockApi } from '@/services/mockApi'
import type { AgendaItem as AgendaItemType } from './types'

export function Agenda() {
  const now = useNow()
  const { toast } = useToast()
  const [focusItem, setFocusItem] = useState<AgendaItemType | null>(null)
  
  const {
    items,
    selectedItem,
    isEditing,
    toggleItemComplete,
    addItem,
    updateItem,
    deleteItem,
    openEditor,
    closeEditor
  } = useAgenda()
  
  const jumpToNow = useCallback(() => {
    const currentItem = items.find(item => 
      isTimeInRange(now, item.startTime, item.endTime)
    )
    
    if (currentItem) {
      const element = document.getElementById(`agenda-${currentItem.id}`)
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [items, now])
  
  const handleSnooze = useCallback((item: AgendaItemType, minutes: number = 15) => {
    const newStartTime = new Date(item.startTime.getTime() + minutes * 60000)
    const newEndTime = new Date(item.endTime.getTime() + minutes * 60000)
    
    updateItem(item.id, { 
      startTime: newStartTime, 
      endTime: newEndTime 
    })
    
    toast({ 
      title: 'Snoozed', 
      description: `"${item.title}" moved ${minutes} minutes later` 
    })
  }, [updateItem, toast])
  
  const handleConvertToTask = useCallback(async (item: AgendaItemType) => {
    try {
      // Create a task from the agenda item
      await mockApi.createTask({
        title: item.title,
        notes: item.notes,
        source: 'agenda',
        createdFrom: item.id,
        createdAt: new Date().toISOString()
      })
      
      // Delete the agenda item
      deleteItem(item.id)
      
      toast({ 
        title: 'Converted to Task', 
        description: `"${item.title}" is now a task` 
      })
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to convert to task',
        variant: 'destructive'
      })
    }
  }, [deleteItem, toast])
  
  const handleStartFocus = useCallback((item: AgendaItemType) => {
    setFocusItem(item)
  }, [])
  
  const handleFocusComplete = useCallback(() => {
    if (focusItem) {
      toggleItemComplete(focusItem.id)
      toast({ 
        title: 'Focus Session Complete!', 
        description: `Great work on "${focusItem.title}"` 
      })
    }
    setFocusItem(null)
  }, [focusItem, toggleItemComplete, toast])
  
  useEffect(() => {
    const handleJump = () => jumpToNow()
    window.addEventListener('jumpToNow', handleJump)
    return () => window.removeEventListener('jumpToNow', handleJump)
  }, [jumpToNow])
  
  return (
    <>
      <Section title="Today's Agenda" className="h-full">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <ProgressBar now={now} className="flex-1 mr-4" />
            <Button 
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                openEditor()
              }} 
              size="sm"
              className="hover-glow"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Item
            </Button>
          </div>
          
          <Card className="max-h-[600px] overflow-y-auto">
            <div className="space-y-2">
              {items.map((item, index) => {
                const isCurrentTask = isTimeInRange(now, item.startTime, item.endTime)
                const isNextTask = !isCurrentTask && 
                  index === items.findIndex(i => !i.completed && i.startTime > now)
                
                return (
                  <AgendaItem
                    key={item.id}
                    item={item}
                    isNow={isCurrentTask}
                    isNext={isNextTask}
                    onToggle={(e?: React.MouseEvent) => {
                      e?.stopPropagation()
                      toggleItemComplete(item.id)
                    }}
                    onClick={(e?: React.MouseEvent) => {
                    e?.stopPropagation()
                    openEditor(item)
                  }}
                  onStartFocus={handleStartFocus}
                  onSnooze={handleSnooze}
                  onConvertToTask={handleConvertToTask}
                  onFollowUp={(item) => {
                    // Create a follow-up item for tomorrow
                    const tomorrow = new Date()
                    tomorrow.setDate(tomorrow.getDate() + 1)
                    tomorrow.setHours(9, 0, 0, 0)
                    
                    const followUp = {
                      title: `Follow-up: ${item.title}`,
                      startTime: tomorrow,
                      endTime: new Date(tomorrow.getTime() + 30 * 60000),
                      notes: `Follow-up from ${new Date().toLocaleDateString()}`,
                      tag: item.tag,
                      completed: false
                    }
                    
                    addItem(followUp)
                    toast({ 
                      title: 'Follow-up Created', 
                      description: 'Scheduled for tomorrow at 9:00 AM' 
                    })
                    }}
                  />
                )
              })}
            </div>
          </Card>
        </div>
      </Section>
      
      <AgendaEditor
        isOpen={isEditing}
        item={selectedItem}
        onClose={closeEditor}
        onSave={addItem}
        onUpdate={updateItem}
        onDelete={deleteItem}
      />
      
      {focusItem && (
        <>
          <FocusOverlay />
          <FocusTimer
            title={focusItem.title}
            duration={Math.round((focusItem.endTime.getTime() - focusItem.startTime.getTime()) / 60000)}
            onComplete={handleFocusComplete}
            onCancel={() => setFocusItem(null)}
          />
        </>
      )}
    </>
  )
}