import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ceubhminnsfgrsiootoq.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldWJobWlubnNmZ3JzaW9vdG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MTY5OTQsImV4cCI6MjA3Mzk5Mjk5NH0.a01TpLtDl8VTFL5RuqMkeyRHzO-iBfIxY-YQibWjvsY'

// Initialize Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export interface Email {
  id: string
  timestamp: string
  from_email: string
  from_name: string
  subject: string
  body: string
  body_plain: string
  snippet?: string
  labels?: string[]
  is_read?: boolean
  is_starred?: boolean
}

export interface CalendarEvent {
  id: string
  summary: string
  start: string
  end: string
  location?: string
  description?: string
  attendees?: any[]
  video_link?: string
  all_day?: boolean
  status?: string
}

export interface Task {
  id: string
  title: string
  completed: boolean
  priority: 'high' | 'medium' | 'low'
  due_date?: string
  project_id?: string
  created_at: string
  updated_at: string
}

export const supabaseService = {
  // Email operations
  async fetchEmails(limit = 15): Promise<Email[]> {
    try {
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching emails:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Failed to fetch emails from Supabase:', error)
      return []
    }
  },

  async saveEmailFromWebhook(emailData: Partial<Email>) {
    try {
      const { data, error } = await supabase
        .from('emails')
        .upsert({
          ...emailData,
          timestamp: emailData.timestamp || new Date().toISOString()
        })

      if (error) {
        console.error('Error saving email:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Failed to save email to Supabase:', error)
      return null
    }
  },

  async markEmailAsRead(emailId: string) {
    try {
      const { data, error } = await supabase
        .from('emails')
        .update({ is_read: true })
        .eq('id', emailId)

      if (error) {
        console.error('Error marking email as read:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Failed to mark email as read:', error)
      return false
    }
  },

  // Calendar operations
  async fetchCalendarEvents(days = 7): Promise<CalendarEvent[]> {
    try {
      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + days)

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .gte('start', startDate.toISOString())
        .lte('start', endDate.toISOString())
        .order('start', { ascending: true })

      if (error) {
        console.error('Error fetching calendar events:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Failed to fetch calendar events from Supabase:', error)
      return []
    }
  },

  async saveCalendarEvent(eventData: Partial<CalendarEvent>) {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .upsert(eventData)

      if (error) {
        console.error('Error saving calendar event:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Failed to save calendar event to Supabase:', error)
      return null
    }
  },

  // Task operations
  async fetchTasks(projectId?: string): Promise<Task[]> {
    try {
      let query = supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching tasks:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Failed to fetch tasks from Supabase:', error)
      return []
    }
  },

  async createTask(taskData: Partial<Task>) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error creating task:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Failed to create task in Supabase:', error)
      return null
    }
  },

  async updateTask(taskId: string, updates: Partial<Task>) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)

      if (error) {
        console.error('Error updating task:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Failed to update task in Supabase:', error)
      return null
    }
  },

  // Real-time subscriptions
  subscribeToEmails(callback: (payload: any) => void) {
    return supabase
      .channel('emails')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'emails'
      }, callback)
      .subscribe()
  },

  subscribeToCalendar(callback: (payload: any) => void) {
    return supabase
      .channel('calendar_events')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'calendar_events'
      }, callback)
      .subscribe()
  },

  subscribeToTasks(callback: (payload: any) => void) {
    return supabase
      .channel('tasks')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks'
      }, callback)
      .subscribe()
  },

  // AI Conversation logging
  async logAIConversation(data: {
    email_id?: string
    action: string
    request: string
    response: string
    session_id?: string
  }) {
    try {
      const sessionId = data.session_id || (data.email_id ? `email-${data.email_id}` : `session-${Date.now()}`)
      const timestamp = new Date().toISOString()

      const rows = [
        {
          session_id: sessionId,
          role: 'user',
          message: data.request,
          metadata: {
            email_id: data.email_id,
            action_type: data.action,
            entry_type: 'request',
            logged_at: timestamp
          }
        },
        {
          session_id: sessionId,
          role: 'assistant',
          message: data.response,
          metadata: {
            email_id: data.email_id,
            action_type: data.action,
            entry_type: 'response',
            logged_at: timestamp
          }
        }
      ]

      const { error } = await supabase
        .from('ai_conversations')
        .insert(rows)

      if (error) {
        console.error('Error logging AI conversation:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Failed to log AI conversation:', error)
      return false
    }
  },

  // Utility function to test connection
  async testConnection() {
    try {
      const { data, error } = await supabase
        .from('emails')
        .select('id')
        .limit(1)

      if (error) {
        console.error('Supabase connection test failed:', error)
        return false
      }

      console.log('✅ Supabase connection successful!')
      return true
    } catch (error) {
      console.error('Failed to connect to Supabase:', error)
      return false
    }
  }
}
