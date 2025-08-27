import React, { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { Calendar, Clock, CheckSquare, Utensils, Pill, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { AssistantDock } from '@/features/assistant/AssistantDock'
import { useDebounce, useIntersectionObserver, useNetworkStatus } from '@/hooks/usePerformance'
import { cn } from '@/lib/utils'

// Memoized Components
const TimelineItem = memo(({ item, isNow }: { item: any; isNow: boolean }) => {
  const timeRef = React.useRef<HTMLDivElement>(null)
  const entry = useIntersectionObserver(timeRef, {
    threshold: 0.1,
    rootMargin: '50px'
  })
  const isVisible = entry?.isIntersecting

  return (
    <div 
      ref={timeRef}
      className={cn(
        "timeline-item relative pl-4 py-2 transition-all duration-300",
        isNow && "bg-accent/10 border-l-4 border-accent",
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-sm text-muted-foreground font-mono">
          {item.time}
        </span>
        <div className="flex-1">
          <h4 className="font-medium">{item.title}</h4>
          {item.description && (
            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
          )}
        </div>
      </div>
    </div>
  )
})
TimelineItem.displayName = 'TimelineItem'

const SectionCard = memo(({ 
  icon: Icon, 
  title, 
  items, 
  color,
  onAdd 
}: {
  icon: React.ElementType
  title: string
  items: any[]
  color: string
  onAdd?: () => void
}) => {
  const [isExpanded, setIsExpanded] = useState(true)
  const cardRef = React.useRef<HTMLDivElement>(null)
  const entry = useIntersectionObserver(cardRef, {
    threshold: 0.1,
    freezeOnceVisible: true
  })
  const isVisible = entry?.isIntersecting

  const itemCount = useMemo(() => items.length, [items.length])
  
  return (
    <div 
      ref={cardRef}
      className={cn(
        "card-base p-6 transition-all duration-300 gpu-accelerated",
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5" style={{ color }} />
          <h3 className="font-semibold text-lg">{title}</h3>
          <span className="text-sm text-muted-foreground">({itemCount})</span>
        </div>
        <div className="flex gap-2">
          {onAdd && (
            <button
              onClick={onAdd}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              aria-label={`Add ${title}`}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No items</p>
          ) : (
            items.map((item, index) => (
              <div key={item.id || index} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={item.completed || false}
                  onChange={() => {/* Handle toggle */}}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <p className={cn(
                    "text-sm",
                    item.completed && "line-through text-muted-foreground"
                  )}>
                    {item.title || item.name}
                  </p>
                  {item.time && (
                    <span className="text-xs text-muted-foreground">{item.time}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
})
SectionCard.displayName = 'SectionCard'

export function SimpleDashboardOptimized() {
  const [scheduleItems, setScheduleItems] = useState<any[]>([])
  const [todos, setTodos] = useState<any[]>([])
  const [foods, setFoods] = useState<any[]>([])
  const [supplements, setSupplements] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())
  
  const networkStatus = useNetworkStatus()
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Load data from localStorage
  useEffect(() => {
    const loadData = () => {
      try {
        // Load schedule
        const savedSchedule = localStorage.getItem('dashboard_schedule')
        if (savedSchedule) {
          const parsed = JSON.parse(savedSchedule)
          const today = new Date().toISOString().split('T')[0]
          const todaySchedule = parsed.filter((item: any) => {
            if (!item.startTime) return false
            const itemDate = new Date(item.startTime).toISOString().split('T')[0]
            return itemDate >= today
          })
          setScheduleItems(todaySchedule)
        }

        // Load todos
        const savedTodos = localStorage.getItem('dashboard_todos')
        if (savedTodos) {
          setTodos(JSON.parse(savedTodos))
        }

        // Load foods
        const savedFoods = localStorage.getItem('dashboard_foods')
        if (savedFoods) {
          setFoods(JSON.parse(savedFoods))
        }

        // Load supplements
        const savedSupplements = localStorage.getItem('dashboard_supplements')
        if (savedSupplements) {
          setSupplements(JSON.parse(savedSupplements))
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      }
    }

    loadData()
    
    // Listen for updates
    const handleScheduleUpdate = (e: CustomEvent) => {
      setScheduleItems(prev => [...prev, e.detail.scheduleItem])
    }
    
    window.addEventListener('scheduleUpdated', handleScheduleUpdate as EventListener)
    
    return () => {
      window.removeEventListener('scheduleUpdated', handleScheduleUpdate as EventListener)
    }
  }, [])

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [])

  // Memoized timeline items
  const timelineItems = useMemo(() => {
    const items = []
    const now = currentTime.getHours() * 60 + currentTime.getMinutes()
    
    // Add schedule items to timeline
    scheduleItems.forEach(item => {
      if (item.startTime) {
        const startDate = new Date(item.startTime)
        const time = startDate.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true
        })
        const itemMinutes = startDate.getHours() * 60 + startDate.getMinutes()
        
        items.push({
          id: item.id,
          time,
          title: item.title,
          description: item.description,
          minutes: itemMinutes,
          isNow: Math.abs(itemMinutes - now) < 30
        })
      }
    })
    
    return items.sort((a, b) => a.minutes - b.minutes)
  }, [scheduleItems, currentTime])

  // Filtered items based on search
  const filteredTodos = useMemo(() => 
    todos.filter(item => 
      !debouncedSearch || 
      item.title?.toLowerCase().includes(debouncedSearch.toLowerCase())
    ),
    [todos, debouncedSearch]
  )

  const filteredFoods = useMemo(() =>
    foods.filter(item =>
      !debouncedSearch ||
      item.name?.toLowerCase().includes(debouncedSearch.toLowerCase())
    ),
    [foods, debouncedSearch]
  )

  const filteredSupplements = useMemo(() =>
    supplements.filter(item =>
      !debouncedSearch ||
      item.name?.toLowerCase().includes(debouncedSearch.toLowerCase())
    ),
    [supplements, debouncedSearch]
  )

  // Callbacks
  const handleAddTodo = useCallback(() => {
    const title = prompt('Enter todo:')
    if (title) {
      const newTodo = { id: Date.now().toString(), title, completed: false }
      const updatedTodos = [...todos, newTodo]
      setTodos(updatedTodos)
      localStorage.setItem('dashboard_todos', JSON.stringify(updatedTodos))
    }
  }, [todos])

  const handleAddFood = useCallback(() => {
    const name = prompt('Enter food:')
    if (name) {
      const newFood = { id: Date.now().toString(), name, consumed: false }
      const updatedFoods = [...foods, newFood]
      setFoods(updatedFoods)
      localStorage.setItem('dashboard_foods', JSON.stringify(updatedFoods))
    }
  }, [foods])

  const handleAddSupplement = useCallback(() => {
    const name = prompt('Enter supplement:')
    if (name) {
      const newSupplement = { id: Date.now().toString(), name, taken: false }
      const updatedSupplements = [...supplements, newSupplement]
      setSupplements(updatedSupplements)
      localStorage.setItem('dashboard_supplements', JSON.stringify(updatedSupplements))
    }
  }, [supplements])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="header-clean border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <div className="flex items-center gap-4">
              {!networkStatus.online && (
                <span className="text-sm text-yellow-500">Offline</span>
              )}
              <span className="text-sm text-muted-foreground">
                {currentTime.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true
                })}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="container mx-auto px-4 py-4">
        <input
          type="search"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-32">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Timeline */}
          <div className="lg:col-span-2">
            <div className="card-base p-6">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">Today's Timeline</h3>
              </div>
              
              <div className="space-y-2 max-h-[600px] overflow-y-auto smooth-scroll">
                {timelineItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No scheduled items for today</p>
                ) : (
                  timelineItems.map(item => (
                    <TimelineItem key={item.id} item={item} isNow={item.isNow} />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="space-y-6">
            <SectionCard
              icon={CheckSquare}
              title="To-Do"
              items={filteredTodos}
              color="var(--color-todo)"
              onAdd={handleAddTodo}
            />
            
            <SectionCard
              icon={Utensils}
              title="Food"
              items={filteredFoods}
              color="var(--color-food)"
              onAdd={handleAddFood}
            />
            
            <SectionCard
              icon={Pill}
              title="Supplements"
              items={filteredSupplements}
              color="var(--color-supplements)"
              onAdd={handleAddSupplement}
            />
          </div>
        </div>
      </main>

      {/* AI Assistant */}
      <AssistantDock />
    </div>
  )
}