import { useState } from 'react'
import { Plus, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlowCard } from '@/components/GlowCard'
import { AgendaItem } from './AgendaItem'
import { AgendaEditor } from './AgendaEditor'
import { useAgendaDB } from './useAgendaDB'
import { format, addDays, subDays } from 'date-fns'

export function AgendaDB() {
  const {
    items,
    loading,
    selectedItem,
    isEditing,
    selectedDate,
    toggleItemComplete,
    addItem,
    updateItem,
    deleteItem,
    snoozeItem,
    startFocus,
    openEditor,
    closeEditor,
    changeDate
  } = useAgendaDB()

  const [, setConvertingToTask] = useState<string | null>(null)

  const handleDateChange = (days: number) => {
    const current = new Date(selectedDate)
    const newDate = days > 0 ? addDays(current, days) : subDays(current, Math.abs(days))
    changeDate(format(newDate, 'yyyy-MM-dd'))
  }

  const handleConvertToTask = async (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    
    // Dispatch event for task creation
    window.dispatchEvent(new CustomEvent('createTaskFromAgenda', {
      detail: {
        title: item.title,
        due: new Date(item.date),
        ref: itemId
      }
    }))
    
    setConvertingToTask(itemId)
    setTimeout(() => setConvertingToTask(null), 2000)
  }

  const handleFollowUp = async (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    
    // Create follow-up for tomorrow
    const tomorrow = format(addDays(new Date(item.date), 1), 'yyyy-MM-dd')
    await addItem({
      date: tomorrow,
      title: `Follow-up: ${item.title}`,
      tag: item.tag,
      start_ts: item.start_ts,
      end_ts: item.end_ts,
      notes: `Follow-up from ${item.date}\n${item.notes || ''}`
    })
  }

  const currentDateDisplay = format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')
  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd')
  const now = Math.floor(Date.now() / 1000)

  return (
    <>
      <GlowCard glow="depth" elevation="medium" className="h-full flex flex-col">
        <div className="space-y-4 flex-1">
          {/* Date Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDateChange(-1)}
                className="p-2 hover-glow rounded-lg interactive"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => changeDate(format(new Date(), 'yyyy-MM-dd'))}
                className={`px-3 py-1 rounded-lg interactive ${
                  isToday ? 'bg-primary text-primary-foreground' : 'hover-glow'
                }`}
              >
                Today
              </button>
              
              <button
                onClick={() => handleDateChange(1)}
                className="p-2 hover-glow rounded-lg interactive"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            <Button
              onClick={() => openEditor()}
              size="sm"
              className="hover-glow"
            >
              <Plus className="w-4 h-4 mr-1" />
              New Item
            </Button>
          </div>

          {/* Date Display */}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-primary" />
            <span className={isToday ? 'text-primary font-semibold' : ''}>
              {currentDateDisplay}
            </span>
            {isToday && <span className="text-xs text-accent">(Today)</span>}
          </div>

          {/* Progress Bar for Today */}
          {isToday && items.length > 0 && (
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              {items.map((item) => {
                const dayStart = new Date(selectedDate).setHours(0, 0, 0, 0) / 1000
                const dayEnd = new Date(selectedDate).setHours(23, 59, 59, 999) / 1000
                const dayDuration = dayEnd - dayStart
                
                const left = ((item.start_ts - dayStart) / dayDuration) * 100
                const width = ((item.end_ts - item.start_ts) / dayDuration) * 100
                const isActive = now >= item.start_ts && now <= item.end_ts
                const isPast = now > item.end_ts
                
                return (
                  <div
                    key={item.id}
                    className={`absolute h-full transition-all ${
                      isActive ? 'bg-primary glow-violet-strong z-10' :
                      isPast ? 'bg-muted-foreground opacity-50' :
                      item.status === 'done' ? 'bg-green-500 opacity-70' :
                      'bg-accent opacity-70'
                    }`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  />
                )
              })}
              
              {/* Current time indicator */}
              {isToday && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                  style={{
                    left: `${((now - new Date(selectedDate).setHours(0, 0, 0, 0) / 1000) / 
                            (24 * 60 * 60)) * 100}%`
                  }}
                >
                  <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                </div>
              )}
            </div>
          )}

          {/* Agenda Items */}
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[500px]">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading agenda...
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No agenda items for this date.
                <br />
                <button
                  onClick={() => openEditor()}
                  className="text-primary hover:underline mt-2"
                >
                  Create your first item
                </button>
              </div>
            ) : (
              items.map((item) => {
                const isNow = isToday && now >= item.start_ts && now <= item.end_ts
                
                const convertedItem = {
                  id: item.id,
                  title: item.title,
                  startTime: new Date(item.start_ts * 1000),
                  endTime: new Date(item.end_ts * 1000),
                  completed: item.status === 'done',
                  tag: item.tag as 'Deep' | 'Move' | 'Gym' | 'Break' | 'Meeting' | 'Personal' | undefined,
                  notes: item.notes
                }
                
                return (
                  <AgendaItem
                    key={item.id}
                    item={convertedItem}
                    isNow={isNow}
                    onToggle={() => toggleItemComplete(item.id)}
                    onClick={() => openEditor(item)}
                    onStartFocus={() => startFocus(item.id)}
                    onSnooze={() => snoozeItem(item.id, 15)}
                    onConvertToTask={() => handleConvertToTask(item.id)}
                    onFollowUp={() => handleFollowUp(item.id)}
                  />
                )
              })
            )}
          </div>
        </div>
      </GlowCard>

      <AgendaEditor
        isOpen={isEditing}
        item={selectedItem ? {
          id: selectedItem.id,
          title: selectedItem.title,
          startTime: new Date(selectedItem.start_ts * 1000),
          endTime: new Date(selectedItem.end_ts * 1000),
          completed: selectedItem.status === 'done',
          tag: selectedItem.tag as 'Deep' | 'Move' | 'Gym' | 'Break' | 'Meeting' | 'Personal' | undefined,
          notes: selectedItem.notes
        } : null}
        onClose={closeEditor}
        onSave={async (item) => {
          const dbItem = {
            date: selectedDate,
            title: item.title,
            start_ts: Math.floor(item.startTime.getTime() / 1000),
            end_ts: Math.floor(item.endTime.getTime() / 1000),
            tag: item.tag,
            notes: item.notes
          }
          
          await addItem(dbItem)
          closeEditor()
        }}
        onUpdate={async (id, updates) => {
          const dbUpdates: any = {}
          if (updates.title) dbUpdates.title = updates.title
          if (updates.startTime) dbUpdates.start_ts = Math.floor(updates.startTime.getTime() / 1000)
          if (updates.endTime) dbUpdates.end_ts = Math.floor(updates.endTime.getTime() / 1000)
          if (updates.tag !== undefined) dbUpdates.tag = updates.tag
          if (updates.notes !== undefined) dbUpdates.notes = updates.notes
          if (updates.completed !== undefined) dbUpdates.status = updates.completed ? 'done' : 'pending'
          
          await updateItem(id, dbUpdates)
          closeEditor()
        }}
        onDelete={selectedItem ? () => deleteItem(selectedItem.id) : undefined}
      />
    </>
  )
}