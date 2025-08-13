import { useEffect, useCallback, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { FixedSizeList as List } from 'react-window'
import { useNow } from '@/hooks/useNow'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/Card'
import { Section } from '@/components/Section'
import { ProgressBar } from '@/components/ProgressBar'
import { AgendaItem } from './AgendaItem'
import { AgendaEditor } from './AgendaEditor'
import { useAgenda } from './useAgenda'
import { isTimeInRange } from '@/lib/time'

// Virtual scrolling threshold - use virtual scrolling for more than 20 items
const VIRTUAL_SCROLL_THRESHOLD = 20
const ITEM_HEIGHT = 100 // Approximate height of each agenda item

export function Agenda() {
  const now = useNow()
  
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
  
  // Find current item index for auto-scrolling
  const currentItemIndex = useMemo(() => {
    return items.findIndex(item => isTimeInRange(now, item.startTime, item.endTime))
  }, [items, now])
  
  const jumpToNow = useCallback(() => {
    const currentItem = items.find(item => 
      isTimeInRange(now, item.startTime, item.endTime)
    )
    
    if (currentItem) {
      const element = document.getElementById(`agenda-${currentItem.id}`)
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [items, now])
  
  useEffect(() => {
    const handleJump = () => jumpToNow()
    window.addEventListener('jumpToNow', handleJump)
    return () => window.removeEventListener('jumpToNow', handleJump)
  }, [jumpToNow])
  
  // Render individual item for virtual scrolling
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = items[index]
    const isNow = isTimeInRange(now, item.startTime, item.endTime)
    
    return (
      <div style={style}>
        <AgendaItem
          item={item}
          isNow={isNow}
          onToggle={() => toggleItemComplete(item.id)}
          onClick={() => openEditor(item)}
          onStartFocus={(item) => {
            console.log('Start focus for:', item.title)
          }}
          onSnooze={(item) => {
            console.log('Snooze:', item.title)
          }}
          onConvertToTask={(item) => {
            console.log('Convert to task:', item.title)
          }}
          onFollowUp={(item) => {
            console.log('Follow-up:', item.title)
          }}
        />
      </div>
    )
  }, [items, now, toggleItemComplete, openEditor])
  
  // Regular rendering for small lists
  const renderRegularList = () => (
    <div className="space-y-2">
      {items.map((item) => (
        <AgendaItem
          key={item.id}
          item={item}
          isNow={isTimeInRange(now, item.startTime, item.endTime)}
          onToggle={() => toggleItemComplete(item.id)}
          onClick={() => openEditor(item)}
          onStartFocus={(item) => {
            console.log('Start focus for:', item.title)
          }}
          onSnooze={(item) => {
            console.log('Snooze:', item.title)
          }}
          onConvertToTask={(item) => {
            console.log('Convert to task:', item.title)
          }}
          onFollowUp={(item) => {
            console.log('Follow-up:', item.title)
          }}
        />
      ))}
    </div>
  )
  
  // Virtual scrolling for large lists
  const renderVirtualList = () => (
    <List
      height={600}
      itemCount={items.length}
      itemSize={ITEM_HEIGHT}
      width="100%"
      initialScrollOffset={currentItemIndex > 0 ? currentItemIndex * ITEM_HEIGHT : 0}
      className="scroll-container"
    >
      {Row}
    </List>
  )
  
  return (
    <>
      <Section title="Today's Agenda" className="h-full">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <ProgressBar now={now} className="flex-1 mr-4" />
            <Button onClick={() => openEditor()} size="sm" className="touchable">
              <Plus className="w-4 h-4 mr-1" />
              Add Item
            </Button>
          </div>
          
          <Card className="max-h-[600px] overflow-y-auto agenda-container">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <p>No agenda items yet</p>
                <Button 
                  onClick={() => openEditor()} 
                  variant="ghost" 
                  size="sm"
                  className="mt-2"
                >
                  Add your first item
                </Button>
              </div>
            ) : items.length > VIRTUAL_SCROLL_THRESHOLD ? (
              renderVirtualList()
            ) : (
              renderRegularList()
            )}
          </Card>
          
          {items.length > VIRTUAL_SCROLL_THRESHOLD && (
            <p className="text-xs text-muted-foreground text-center">
              Virtual scrolling enabled for {items.length} items
            </p>
          )}
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
    </>
  )
}

// Export optimized version
export default Agenda
