import { Mail, Calendar, FileText, UserPlus, Send, Brain, Activity, Download } from 'lucide-react'
import { n8nService } from '@/services/n8nService'

export interface QuickAction {
  id: string
  label: string
  description?: string
  icon: any
  variant?: 'default' | 'primary' | 'accent'
  run: () => Promise<any>
}

export const quickActions: QuickAction[] = [
  {
    id: 'email-digest',
    label: 'Email Digest',
    description: 'Get last 15 emails',
    icon: Mail,
    variant: 'primary',
    run: () => n8nService.getEmailDigest(15)
  },
  {
    id: 'calendar-summary',
    label: 'Calendar Summary',
    description: "Today's schedule",
    icon: Calendar,
    variant: 'accent',
    run: () => n8nService.getCalendarSummary()
  },
  {
    id: 'status-draft',
    label: 'Daily Status',
    description: 'Generate status update',
    icon: FileText,
    run: () => n8nService.getStatusDraft(new Date().toISOString().split('T')[0])
  },
  {
    id: 'create-lead',
    label: 'Create Lead',
    description: 'From clipboard',
    icon: UserPlus,
    variant: 'primary',
    run: async () => {
      const text = await navigator.clipboard.readText()
      return n8nService.createLead(text)
    }
  },
  {
    id: 'push-agenda',
    label: 'Push to Slack',
    description: 'Send agenda',
    icon: Send,
    variant: 'accent',
    run: async () => {
      const agendaItems = JSON.parse(localStorage.getItem('agenda_items') || '[]')
      return n8nService.pushAgenda(agendaItems)
    }
  },
  {
    id: 'ai-coach',
    label: 'AI Coach',
    description: 'Get motivation',
    icon: Brain,
    run: () => n8nService.getCalendarSummary() // Placeholder
  },
  {
    id: 'health-check',
    label: 'Health Check',
    description: 'System status',
    icon: Activity,
    run: () => Promise.resolve({ status: 'healthy', timestamp: new Date() })
  },
  {
    id: 'export-data',
    label: 'Export Data',
    description: 'Download backup',
    icon: Download,
    run: async () => {
      const data = {
        agenda: localStorage.getItem('agenda_items'),
        tasks: localStorage.getItem('sidebar_tasks'),
        settings: localStorage.getItem('user_settings'),
        exportDate: new Date().toISOString()
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dashboard-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      return { success: true }
    }
  }
]