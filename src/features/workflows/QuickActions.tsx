import { useState } from 'react'
import { Zap, Mail, Calendar, RefreshCw, Bot, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/Card'
import { webhookService } from '@/services/webhookService'
import { useToast } from '@/hooks/useToast'

export function QuickActions() {
  const [loading, setLoading] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, any>>({})
  const { toast } = useToast()

  const executeQuickAction = async (actionId: string, webhook: string, payload?: any) => {
    try {
      setLoading(actionId)

      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {})
      })

      const data = await response.json()
      setResults(prev => ({ ...prev, [actionId]: data }))

      // Show success feedback
      const message = actionId === 'email-refresh' ? 'Emails refreshed' :
                      actionId === 'calendar-sync' ? 'Calendar synced' :
                      'Action completed'
      toast.success(message)

      // If it's email or calendar, also trigger the webhook service refresh
      if (actionId === 'email-refresh') {
        await webhookService.fetchEmails()
      } else if (actionId === 'calendar-sync') {
        await webhookService.fetchCalendarEvents()
      }

      return data
    } catch (error) {
      const errorMsg = `Failed to execute ${actionId}`
      toast.error(errorMsg)
      console.error(errorMsg, error)
      setResults(prev => ({ ...prev, [actionId]: { error: error.message } }))
    } finally {
      setLoading(null)
    }
  }

  const actions = [
    {
      id: 'email-refresh',
      label: 'Refresh Emails',
      icon: Mail,
      action: () => executeQuickAction(
        'email-refresh',
        'https://flow.voxemarketing.com/webhook/c14a535e-80bf-4bd9-9b3d-1001e6917d85',
        { action: 'refresh', limit: 20 }
      )
    },
    {
      id: 'calendar-sync',
      label: 'Sync Calendar',
      icon: Calendar,
      action: () => executeQuickAction(
        'calendar-sync',
        'https://flow.voxemarketing.com/webhook/f4fd2f67-df3b-4ee2-b426-944e51d01f28',
        { action: 'sync', days: 7 }
      )
    },
    {
      id: 'ai-chat',
      label: 'AI Assistant',
      icon: Bot,
      action: () => executeQuickAction(
        'ai-chat',
        'https://flow.voxemarketing.com/webhook/c0552eb4-8ed7-4a46-b141-492ba7fefd04/chat',
        {
          sessionId: `session-${Date.now()}`,
          action: 'sendMessage',
          chatInput: 'What are my priorities for today?'
        }
      )
    },
    {
      id: 'refresh-all',
      label: 'Refresh All',
      icon: RefreshCw,
      action: async () => {
        setLoading('refresh-all')
        try {
          await webhookService.refreshAll()
          toast.success('All data sources refreshed!')
        } catch (error) {
          toast.error('Failed to refresh all data')
        } finally {
          setLoading(null)
        }
      }
    }
  ]
  
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-accent" />
        <h3 className="font-semibold">Quick Actions</h3>
        {loading && (
          <div className="ml-auto text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {actions.map(action => {
          const isLoading = loading === action.id
          const hasResult = results[action.id]

          return (
            <Button
              key={action.id}
              variant="outline"
              className="h-auto flex-col gap-2 p-4 min-h-[80px] relative"
              onClick={action.action}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <action.icon className="w-5 h-5" />
              )}
              <span className="text-xs">{action.label}</span>
              {hasResult && !hasResult.error && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full" />
              )}
              {hasResult?.error && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </Button>
          )
        })}
      </div>

      {/* Debug results (remove in production) */}
      {Object.keys(results).length > 0 && (
        <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs">
          <div className="font-semibold mb-1">Last Results:</div>
          {Object.entries(results).map(([key, value]) => (
            <div key={key} className="truncate">
              {key}: {value.error ? `❌ ${value.error}` : '✅ Success'}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}