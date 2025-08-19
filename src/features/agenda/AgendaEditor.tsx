import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AgendaItem } from './types'

interface AgendaEditorProps {
  isOpen: boolean
  item?: AgendaItem | null
  onClose: () => void
  onSave: (item: Omit<AgendaItem, 'id'>) => void
  onUpdate: (id: string, updates: Partial<AgendaItem>) => void
  onDelete?: (id: string) => void
}

export function AgendaEditor({ 
  isOpen, 
  item, 
  onClose, 
  onSave, 
  onUpdate,
  onDelete 
}: AgendaEditorProps) {
  const [formData, setFormData] = useState({
    title: '',
    startTime: '',
    endTime: '',
    tag: '',
    notes: ''
  })
  
  useEffect(() => {
    if (!isOpen) return // Don't update if dialog is closed
    
    if (item) {
      const tagValue = item.tag || 'None'
      console.log('Setting tag for existing item:', tagValue)
      setFormData({
        title: item.title,
        startTime: formatDateTimeLocal(item.startTime),
        endTime: formatDateTimeLocal(item.endTime),
        tag: tagValue,
        notes: item.notes || ''
      })
    } else {
      // Set default times for new items
      const now = new Date()
      const startTime = new Date(now)
      startTime.setMinutes(Math.ceil(now.getMinutes() / 15) * 15) // Round to next 15 min
      startTime.setSeconds(0)
      
      const endTime = new Date(startTime)
      endTime.setHours(startTime.getHours() + 1) // Default 1 hour duration
      
      console.log('Setting default tag for new item: None')
      setFormData({
        title: '',
        startTime: formatDateTimeLocal(startTime),
        endTime: formatDateTimeLocal(endTime),
        tag: 'None',
        notes: ''
      })
    }
  }, [item, isOpen])
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Validate required fields
    if (!formData.title.trim()) {
      alert('Title is required')
      return
    }
    
    if (!formData.startTime || !formData.endTime) {
      alert('Start and end times are required')
      return
    }
    
    const startDate = new Date(formData.startTime)
    const endDate = new Date(formData.endTime)
    
    if (endDate <= startDate) {
      alert('End time must be after start time')
      return
    }
    
    const tagToSave = formData.tag === 'None' ? undefined : formData.tag as 'Deep' | 'Move' | 'Gym' | 'Break' | 'Meeting' | 'Personal' | undefined
    console.log('Submitting with tag:', formData.tag, '-> saving as:', tagToSave)
    
    const data = {
      title: formData.title.trim(),
      startTime: startDate,
      endTime: endDate,
      tag: tagToSave,
      notes: formData.notes || undefined,
      completed: item?.completed || false
    }
    
    if (item) {
      onUpdate(item.id, data)
    } else {
      onSave(data)
    }
    
    onClose()
  }
  
  const handleDelete = () => {
    if (item && onDelete) {
      onDelete(item.id)
      onClose()
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>
            {item ? 'Edit Agenda Item' : 'Add Agenda Item'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-sm font-medium">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title"
              required
              autoFocus
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-time" className="text-sm font-medium">Start Time *</Label>
              <Input
                id="start-time"
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="end-time" className="text-sm font-medium">End Time *</Label>
              <Input
                id="end-time"
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="tag" className="text-sm font-medium">Tag</Label>
            <Select 
              value={formData.tag}
              onValueChange={(value) => {
                console.log('Tag selected:', value)
                setFormData({ ...formData, tag: value })
              }}
            >
              <SelectTrigger id="tag">
                <SelectValue placeholder="Select a tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="None">None</SelectItem>
                <SelectItem value="Deep">Deep Work</SelectItem>
                <SelectItem value="Move">Movement</SelectItem>
                <SelectItem value="Gym">Gym</SelectItem>
                <SelectItem value="Break">Break</SelectItem>
                <SelectItem value="Meeting">Meeting</SelectItem>
                <SelectItem value="Personal">Personal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any additional notes..."
              rows={3}
            />
          </div>
          
          <div className="flex justify-between">
            {item && onDelete && (
              <Button type="button" variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {item ? 'Update' : 'Add'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function formatDateTimeLocal(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (isNaN(dateObj.getTime())) {
    // Return current time if invalid
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }
  
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')
  const hours = String(dateObj.getHours()).padStart(2, '0')
  const minutes = String(dateObj.getMinutes()).padStart(2, '0')
  
  return `${year}-${month}-${day}T${hours}:${minutes}`
}