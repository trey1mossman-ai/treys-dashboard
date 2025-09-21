import { useState, useEffect } from 'react'
import {
  Home,
  FolderOpen,
  Plus,
  Bot,
  Mail,
  Calendar,
  RefreshCw,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { webhookService } from '@/services/webhookService'
import { useToast } from '@/hooks/useToast'
import { EmailViewerModal } from '@/components/EmailViewerModal'

interface Task {
  id: string
  title: string
  completed: boolean
  priority: 'high' | 'medium' | 'low'
  dueDate?: string
}

interface Email {
  id: string
  from: string
  subject: string
  snippet: string
  date: string
}

interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  location?: string
}

export function MobileDashboardV3() {
  const [activeTab, setActiveTab] = useState('home')
  const [loading, setLoading] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [emails, setEmails] = useState<Email[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [lastRefresh, setLastRefresh] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const { toast } = useToast()

  // Calculate today's progress
  const todayProgress = tasks.filter(t => t.completed).length / Math.max(tasks.length, 1) * 100

  // Fetch emails from API
  const fetchEmailsFromAPI = async () => {
    try {
      // First try webhookService
      const emailData = await webhookService.fetchEmails()
      setEmails(emailData.slice(0, 5))

      // Also try API endpoint if it exists
      try {
        const response = await fetch('/api/webhook/emails')
        if (response.ok) {
          const apiData = await response.json()
          if (apiData.emails && apiData.emails.length > 0) {
            setEmails(apiData.emails.slice(0, 5))
          }
        }
      } catch (apiError) {
        console.log('API endpoint not available, using webhook data')
      }
    } catch (error) {
      console.error('Failed to fetch emails:', error)
    }
  }

  // Fetch calendar from API
  const fetchCalendarFromAPI = async () => {
    try {
      // First try webhookService
      const eventData = await webhookService.fetchCalendarEvents()
      setEvents(eventData.slice(0, 5))

      // Also try API endpoint if it exists
      try {
        const response = await fetch('/api/webhook/calendar')
        if (response.ok) {
          const apiData = await response.json()
          if (apiData.events && apiData.events.length > 0) {
            setEvents(apiData.events.slice(0, 5))
          }
        }
      } catch (apiError) {
        console.log('API endpoint not available, using webhook data')
      }
    } catch (error) {
      console.error('Failed to fetch calendar:', error)
    }
  }

  // Quick action handler
  const executeQuickAction = async (actionId: string, webhook?: string, payload?: any) => {
    try {
      setLoading(actionId)

      if (actionId === 'refresh-all') {
        // Just refresh from API without calling webhook
        await Promise.all([
          fetchEmailsFromAPI(),
          fetchCalendarFromAPI()
        ])
        toast.success('All data refreshed!')
        setLastRefresh(new Date().toISOString())
        localStorage.setItem('lastRefresh', new Date().toISOString())
      } else {
        // Call webhook if provided
        if (webhook) {
          const response = await fetch(webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload || {})
          })
          const data = await response.json()
        }

        // Then fetch from API
        if (actionId === 'email-refresh') {
          await fetchEmailsFromAPI()
          toast.success('Emails refreshed!')
        } else if (actionId === 'calendar-sync') {
          await fetchCalendarFromAPI()
          toast.success('Calendar synced!')
        }
      }
    } catch (error) {
      toast.error(`Failed to ${actionId}`)
      console.error(error)
    } finally {
      setLoading(null)
    }
  }

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Get last refresh time
        const stored = localStorage.getItem('lastRefresh')
        if (stored) setLastRefresh(stored)

        // Try API endpoints first
        const endpoints = [
          fetch('/api/webhook/emails').catch(() => null),
          fetch('/api/webhook/calendar').catch(() => null)
        ]

        const [emailResponse, calendarResponse] = await Promise.all(endpoints)

        if (emailResponse && emailResponse.ok) {
          const emailData = await emailResponse.json()
          if (emailData.emails) {
            setEmails(emailData.emails.slice(0, 5))
          }
        }

        if (calendarResponse && calendarResponse.ok) {
          const calendarData = await calendarResponse.json()
          if (calendarData.events) {
            setEvents(calendarData.events.slice(0, 5))
          }
        }

        // Fallback to cached data from webhookService
        if (!emailResponse || !emailResponse.ok) {
          const cachedEmails = await webhookService.getCachedEmails()
          if (cachedEmails.length > 0) {
            setEmails(cachedEmails.slice(0, 5))
          }
        }

        if (!calendarResponse || !calendarResponse.ok) {
          const cachedEvents = await webhookService.getCachedCalendarEvents()
          if (cachedEvents.length > 0) {
            setEvents(cachedEvents.slice(0, 5))
          }
        }
      } catch (error) {
        console.error('Failed to load initial data:', error)
      }
    }
    loadData()
  }, [])

  // Pull to refresh handler
  const handlePullToRefresh = async () => {
    if (isRefreshing) return

    setIsRefreshing(true)
    try {
      await Promise.all([
        fetchEmailsFromAPI(),
        fetchCalendarFromAPI()
      ])
      setLastRefresh(new Date().toISOString())
      localStorage.setItem('lastRefresh', new Date().toISOString())
      toast.success('Data refreshed!')
    } catch (error) {
      toast.error('Failed to refresh data')
    } finally {
      setIsRefreshing(false)
    }
  }

  const QuickActionButton = ({
    icon: Icon,
    label,
    actionId,
    webhook,
    payload,
    className = ""
  }: {
    icon: any
    label: string
    actionId: string
    webhook: string
    payload?: any
    className?: string
  }) => (
    <button
      onClick={() => executeQuickAction(actionId, webhook, payload)}
      disabled={loading === actionId}
      className={`min-h-[80px] rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20
        flex flex-col items-center justify-center gap-2 text-white
        active:scale-95 transition-all duration-200 touch-manipulation
        disabled:opacity-50 ${className}`}
    >
      {loading === actionId ? (
        <Loader2 className="w-6 h-6 animate-spin" />
      ) : (
        <Icon className="w-6 h-6" />
      )}
      <span className="text-sm font-medium">{label}</span>
    </button>
  )

  const NavButton = ({
    icon: Icon,
    label,
    tab,
    primary = false
  }: {
    icon: any
    label: string
    tab: string
    primary?: boolean
  }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex flex-col items-center justify-center gap-1 py-2
        ${activeTab === tab ? 'text-blue-400' : 'text-white/60'}
        ${primary ? 'bg-blue-500 rounded-full w-14 h-14 -mt-4 text-white' : ''}
        transition-colors duration-200 touch-manipulation`}
    >
      <Icon className={primary ? "w-6 h-6" : "w-5 h-5"} />
      {!primary && <span className="text-xs">{label}</span>}
    </button>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-black/30 backdrop-blur-md border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Life OS</h1>
          {isRefreshing && (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          )}
        </div>
        <div className="mt-2">
          <div className="flex items-center justify-between text-sm text-white/60 mb-1">
            <span>Today's Progress</span>
            <span>{Math.round(todayProgress)}%</span>
          </div>
          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-green-400 transition-all duration-500"
              style={{ width: `${todayProgress}%` }}
            />
          </div>
        </div>
        {lastRefresh && (
          <div className="text-xs text-white/40 mt-2">
            Last refresh: {new Date(lastRefresh).toLocaleTimeString()}
          </div>
        )}
      </header>

      {/* Scrollable Content */}
      <main className="px-4 py-6 space-y-6">
        {/* Quick Actions - Big Touch Targets */}
        <section className="grid grid-cols-2 gap-4">
          <QuickActionButton
            icon={Mail}
            label="Refresh Emails"
            actionId="email-refresh"
            webhook="https://flow.voxemarketing.com/webhook/c14a535e-80bf-4bd9-9b3d-1001e6917d85"
            payload={{ action: 'refresh', limit: 20 }}
          />
          <QuickActionButton
            icon={Calendar}
            label="Sync Calendar"
            actionId="calendar-sync"
            webhook="https://flow.voxemarketing.com/webhook/f4fd2f67-df3b-4ee2-b426-944e51d01f28"
            payload={{ action: 'sync', days: 7 }}
          />
          <QuickActionButton
            icon={Bot}
            label="AI Assistant"
            actionId="ai-chat"
            webhook="https://flow.voxemarketing.com/webhook/c0552eb4-8ed7-4a46-b141-492ba7fefd04/chat"
            payload={{
              sessionId: `session-${Date.now()}`,
              action: 'sendMessage',
              chatInput: 'What are my priorities for today?'
            }}
          />
          <QuickActionButton
            icon={RefreshCw}
            label="Refresh All"
            actionId="refresh-all"
            webhook=""
            className="bg-gradient-to-r from-blue-500/20 to-purple-500/20"
          />
        </section>

        {/* Today's Tasks */}
        <section className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4">
          <h2 className="text-lg font-semibold text-white mb-3">Today's Tasks</h2>
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <p className="text-white/50 text-center py-4">No tasks for today</p>
            ) : (
              tasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 bg-white/5 rounded-xl
                    active:bg-white/10 transition-colors duration-200"
                >
                  <button className="touch-manipulation">
                    <CheckCircle
                      className={`w-6 h-6 ${task.completed ? 'text-green-400' : 'text-white/30'}`}
                    />
                  </button>
                  <div className="flex-1">
                    <p className={`text-white ${task.completed ? 'line-through opacity-50' : ''}`}>
                      {task.title}
                    </p>
                    {task.dueDate && (
                      <p className="text-xs text-white/50 mt-1">Due: {task.dueDate}</p>
                    )}
                  </div>
                  <span className={`w-2 h-2 rounded-full ${
                    task.priority === 'high' ? 'bg-red-400' :
                    task.priority === 'medium' ? 'bg-yellow-400' :
                    'bg-green-400'
                  }`} />
                </div>
              ))
            )}
          </div>
        </section>

        {/* Recent Emails */}
        <section className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4">
          <h2 className="text-lg font-semibold text-white mb-3">Recent Emails</h2>
          <div className="space-y-2">
            {emails.length === 0 ? (
              <p className="text-white/50 text-center py-4">No recent emails</p>
            ) : (
              emails.map(email => (
                <div
                  key={email.id}
                  onClick={() => {
                    setSelectedEmail(email)
                    setEmailModalOpen(true)
                  }}
                  className="p-3 bg-white/5 rounded-xl active:bg-white/10
                    transition-colors duration-200 cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 truncate">{email.from}</p>
                      <p className="text-white font-medium truncate">{email.subject}</p>
                      <p className="text-xs text-white/50 line-clamp-2 mt-1">{email.snippet}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Calendar Events */}
        <section className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4">
          <h2 className="text-lg font-semibold text-white mb-3">Upcoming Events</h2>
          <div className="space-y-2">
            {events.length === 0 ? (
              <p className="text-white/50 text-center py-4">No upcoming events</p>
            ) : (
              events.map(event => (
                <div
                  key={event.id}
                  className="p-3 bg-white/5 rounded-xl active:bg-white/10
                    transition-colors duration-200"
                >
                  <p className="text-white font-medium">{event.title}</p>
                  <p className="text-xs text-white/50 mt-1">
                    {new Date(event.start).toLocaleString()}
                  </p>
                  {event.location && (
                    <p className="text-xs text-white/50">{event.location}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/30 backdrop-blur-md border-t border-white/10">
        <div className="grid grid-cols-4 items-center px-6">
          <NavButton icon={Home} label="Home" tab="home" />
          <NavButton icon={FolderOpen} label="Projects" tab="projects" />
          <div className="flex justify-center">
            <NavButton icon={Plus} label="Add" tab="add" primary />
          </div>
          <NavButton icon={Bot} label="AI" tab="ai" />
        </div>
      </nav>

      {/* Email Viewer Modal */}
      <EmailViewerModal
        email={selectedEmail}
        isOpen={emailModalOpen}
        onClose={() => {
          setEmailModalOpen(false)
          setSelectedEmail(null)
        }}
      />
    </div>
  )
}