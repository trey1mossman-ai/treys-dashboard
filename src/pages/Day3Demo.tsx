import React, { useState } from 'react'
import { DraggableList } from '@/components/DraggableList'
import { useSwipeGesture } from '@/hooks/useGestures'
import { Card } from '@/components/Card'
import { Trash2, Archive, Check, AlertCircle } from 'lucide-react'

interface DemoTask {
  id: string
  title: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
}

interface DemoEmail {
  id: string
  subject: string
  sender: string
  isRead: boolean
}

export default function Day3Demo() {
  const [tasks, setTasks] = useState<DemoTask[]>([
    { id: '1', title: 'Implement drag and drop', completed: true, priority: 'high' },
    { id: '2', title: 'Add swipe gestures', completed: false, priority: 'high' },
    { id: '3', title: 'Create advanced search', completed: false, priority: 'medium' },
    { id: '4', title: 'Offline architecture', completed: false, priority: 'low' },
    { id: '5', title: 'CRDT implementation', completed: false, priority: 'medium' }
  ])

  const [emails, setEmails] = useState<DemoEmail[]>([
    { id: '1', subject: 'Welcome to Day 3!', sender: 'Claude Code', isRead: false },
    { id: '2', subject: 'Drag & Drop Ready', sender: 'System', isRead: true },
    { id: '3', subject: 'Gesture Support Added', sender: 'Development Team', isRead: false },
    { id: '4', subject: 'Performance Update', sender: 'Monitor', isRead: true }
  ])

  const handleTaskReorder = (newTasks: DemoTask[]) => {
    setTasks(newTasks)
  }

  const handleDeleteEmail = (emailId: string) => {
    setEmails(prev => prev.filter(email => email.id !== emailId))
  }

  const handleArchiveEmail = (emailId: string) => {
    setEmails(prev =>
      prev.map(email =>
        email.id === emailId
          ? { ...email, isRead: true }
          : email
      )
    )
  }

  const toggleTaskCompletion = (taskId: string) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === taskId
          ? { ...task, completed: !task.completed }
          : task
      )
    )
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444'
      case 'medium': return '#f59e0b'
      case 'low': return '#10b981'
      default: return '#6b7280'
    }
  }

  return (
    <div className="min-h-screen bg-[hsl(225_20%_6%)] text-[hsl(210_40%_98%)] p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-center">
            Day 3 Demo: Drag & Drop + Gestures
          </h1>
          <p className="text-[hsl(215_20%_65%)] text-center">
            Test the new interaction features below
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Draggable Task List */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              📋 Draggable Tasks
              <span className="text-sm text-[hsl(215_20%_65%)] font-normal">
                (Drag to reorder)
              </span>
            </h2>

            <DraggableList
              items={tasks}
              getId={(task, index) => task.id}
              onReorder={handleTaskReorder}
              renderItem={({ item: task, index, provided, snapshot }) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  className={`
                    bg-[hsl(225_18%_9%)] border border-[hsl(217_30%_15%)] rounded-lg p-4
                    transition-all duration-200 hover:border-[hsl(190_90%_50%)]/30
                    ${snapshot.isDragging ? 'shadow-lg shadow-[hsl(190_90%_50%)]/20 ring-2 ring-[hsl(190_90%_50%)]/20' : ''}
                    ${task.completed ? 'opacity-60' : ''}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleTaskCompletion(task.id)}
                      className={`
                        w-5 h-5 rounded border-2 flex items-center justify-center
                        ${task.completed
                          ? 'bg-[hsl(190_90%_50%)] border-[hsl(190_90%_50%)]'
                          : 'border-[hsl(217_30%_15%)] hover:border-[hsl(190_90%_50%)]'
                        }
                      `}
                    >
                      {task.completed && <Check className="w-3 h-3 text-white" />}
                    </button>

                    <div className="flex-1">
                      <div className={`font-medium ${task.completed ? 'line-through' : ''}`}>
                        {task.title}
                      </div>
                    </div>

                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getPriorityColor(task.priority) }}
                      title={`${task.priority} priority`}
                    />
                  </div>
                </div>
              )}
              className="space-y-3"
            />
          </Card>

          {/* Swipeable Email List */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              📧 Swipeable Emails
              <span className="text-sm text-[hsl(215_20%_65%)] font-normal">
                (Swipe left/right)
              </span>
            </h2>

            <div className="space-y-3">
              {emails.map((email) => (
                <SwipeableEmailItem
                  key={email.id}
                  email={email}
                  onDelete={() => handleDeleteEmail(email.id)}
                  onArchive={() => handleArchiveEmail(email.id)}
                />
              ))}
            </div>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="mt-8 p-6">
          <h3 className="text-lg font-semibold mb-4">🎮 How to Test</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2 text-[hsl(190_90%_50%)]">Drag & Drop</h4>
              <ul className="text-sm text-[hsl(215_20%_65%)] space-y-1">
                <li>• Grab the grip handle (⋮⋮) on tasks</li>
                <li>• Drag to reorder priority</li>
                <li>• Works on both desktop and mobile</li>
                <li>• Includes haptic feedback</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2 text-[hsl(190_90%_50%)]">Swipe Gestures</h4>
              <ul className="text-sm text-[hsl(215_20%_65%)] space-y-1">
                <li>• Swipe emails left to delete</li>
                <li>• Swipe emails right to archive</li>
                <li>• Visual feedback during swipe</li>
                <li>• Haptic feedback on mobile</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

// Swipeable Email Component
function SwipeableEmailItem({
  email,
  onDelete,
  onArchive
}: {
  email: DemoEmail
  onDelete: () => void
  onArchive: () => void
}) {
  const bind = useSwipeGesture({
    onSwipeLeft: onDelete,
    onSwipeRight: onArchive,
    threshold: 100
  })

  return (
    <div
      {...bind()}
      className={`
        relative bg-[hsl(225_18%_9%)] border border-[hsl(217_30%_15%)] rounded-lg p-4
        transition-all duration-200 hover:border-[hsl(190_90%_50%)]/30 cursor-pointer
        ${!email.isRead ? 'border-l-2 border-l-[hsl(190_90%_50%)]' : ''}
      `}
    >
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${!email.isRead ? 'bg-[hsl(190_90%_50%)]' : 'bg-[hsl(217_30%_15%)]'}`} />
        <div className="flex-1 min-w-0">
          <div className={`font-medium truncate ${!email.isRead ? 'font-semibold' : ''}`}>
            {email.subject}
          </div>
          <div className="text-sm text-[hsl(215_20%_65%)] truncate">
            {email.sender}
          </div>
        </div>
      </div>
    </div>
  )
}