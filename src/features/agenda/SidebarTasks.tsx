import { CheckCircle, Circle, X, Calendar } from 'lucide-react'
import { GlowCard } from '@/components/GlowCard'
import { cn } from '@/lib/utils'

export interface Task {
  id: string
  title: string
  completed: boolean
  due?: Date
  ref?: string // Reference to agenda item
}

interface SidebarTasksProps {
  tasks: Task[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

export function SidebarTasks({ tasks, onToggle, onDelete }: SidebarTasksProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const overdueTasks = tasks.filter(t => t.due && t.due < today && !t.completed)
  const todayTasks = tasks.filter(t => {
    if (!t.due || t.completed) return false
    const taskDate = new Date(t.due)
    taskDate.setHours(0, 0, 0, 0)
    return taskDate.getTime() === today.getTime()
  })
  const upcomingTasks = tasks.filter(t => !t.completed && !overdueTasks.includes(t) && !todayTasks.includes(t))
  const completedTasks = tasks.filter(t => t.completed)
  
  return (
    <GlowCard className="p-4 h-full">
      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
        <CheckCircle className="w-5 h-5 text-primary" />
        Tasks
      </h3>
      
      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {overdueTasks.length > 0 && (
          <TaskSection
            title="Overdue"
            tasks={overdueTasks}
            onToggle={onToggle}
            onDelete={onDelete}
            variant="error"
          />
        )}
        
        {todayTasks.length > 0 && (
          <TaskSection
            title="Today"
            tasks={todayTasks}
            onToggle={onToggle}
            onDelete={onDelete}
            variant="primary"
          />
        )}
        
        {upcomingTasks.length > 0 && (
          <TaskSection
            title="Upcoming"
            tasks={upcomingTasks}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        )}
        
        {completedTasks.length > 0 && (
          <TaskSection
            title="Completed"
            tasks={completedTasks}
            onToggle={onToggle}
            onDelete={onDelete}
            variant="muted"
          />
        )}
        
        {tasks.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No tasks yet. Convert agenda items to tasks to track them here.
          </p>
        )}
      </div>
    </GlowCard>
  )
}

interface TaskSectionProps {
  title: string
  tasks: Task[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  variant?: 'default' | 'primary' | 'error' | 'muted'
}

function TaskSection({ title, tasks, onToggle, onDelete, variant = 'default' }: TaskSectionProps) {
  const titleColors = {
    default: 'text-foreground',
    primary: 'text-primary',
    error: 'text-red-400',
    muted: 'text-muted-foreground'
  }
  
  return (
    <div className="space-y-2">
      <h4 className={cn("text-sm font-medium", titleColors[variant])}>
        {title} ({tasks.length})
      </h4>
      
      <div className="space-y-1">
        {tasks.map(task => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={() => onToggle(task.id)}
            onDelete={() => onDelete(task.id)}
          />
        ))}
      </div>
    </div>
  )
}

interface TaskItemProps {
  task: Task
  onToggle: () => void
  onDelete: () => void
}

function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  return (
    <div className={cn(
      "group flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30 interactive",
      task.completed && "opacity-60"
    )}>
      <button
        onClick={onToggle}
        className="shrink-0 interactive"
      >
        {task.completed ? (
          <CheckCircle className="w-4 h-4 text-primary" />
        ) : (
          <Circle className="w-4 h-4 text-muted-foreground hover:text-primary" />
        )}
      </button>
      
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm truncate",
          task.completed && "line-through"
        )}>
          {task.title}
        </p>
        {task.due && (
          <div className="flex items-center gap-1 mt-0.5">
            <Calendar className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {new Date(task.due).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
      
      <button
        onClick={onDelete}
        className="shrink-0 opacity-0 group-hover:opacity-100 interactive p-1 hover:bg-red-500/20 rounded"
      >
        <X className="w-3 h-3 text-red-400" />
      </button>
    </div>
  )
}