import { useState } from 'react'
import { ActionCard } from '@/components/ActionCard'
import { Modal } from '@/components/Modal'
import { GlowCard } from '@/components/GlowCard'
import { useToast } from '@/components/Toast'
import { quickActions } from './actions'
import { EmailDigestModal } from './EmailDigestModal'
import { CalendarSummary } from './CalendarSummary'

export function QuickActions() {
  const [loading, setLoading] = useState<string | null>(null)
  const [emailDigest, setEmailDigest] = useState<any>(null)
  const [calendarSummary, setCalendarSummary] = useState<string>('')
  const [statusDraft, setStatusDraft] = useState<string>('')
  const { showToast } = useToast()
  
  const handleAction = async (actionId: string) => {
    const action = quickActions.find(a => a.id === actionId)
    if (!action) return
    
    setLoading(actionId)
    
    try {
      const result = await action.run()
      
      // Handle different action results
      switch (actionId) {
        case 'email-digest':
          setEmailDigest(result)
          break
        case 'calendar-summary':
          setCalendarSummary(result.text || '')
          break
        case 'status-draft':
          setStatusDraft(result.markdown || '')
          // Copy to clipboard
          await navigator.clipboard.writeText(result.markdown || '')
          showToast('Status draft copied to clipboard', 'success')
          break
        case 'create-lead':
          showToast(`Lead created: ${result.id}`, 'success')
          break
        case 'push-agenda':
          showToast('Agenda pushed to Slack', 'success')
          break
        default:
          showToast('Action completed', 'success')
      }
    } catch (error) {
      console.error(`Action ${actionId} failed:`, error)
      showToast(`Failed to ${action.label}`, 'error')
    } finally {
      setLoading(null)
    }
  }
  
  return (
    <>
      <GlowCard className="p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {quickActions.map(action => (
            <ActionCard
              key={action.id}
              icon={action.icon}
              title={action.label}
              description={action.description}
              variant={action.variant}
              onClick={() => handleAction(action.id)}
              loading={loading === action.id}
              disabled={loading !== null && loading !== action.id}
            />
          ))}
        </div>
      </GlowCard>
      
      {/* Modals */}
      <EmailDigestModal
        isOpen={emailDigest !== null}
        onClose={() => setEmailDigest(null)}
        emails={emailDigest?.emails || []}
      />
      
      <CalendarSummary
        isOpen={calendarSummary !== ''}
        onClose={() => setCalendarSummary('')}
        summary={calendarSummary}
      />
      
      <Modal
        isOpen={statusDraft !== ''}
        onClose={() => setStatusDraft('')}
        title="Daily Status Draft"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-muted/30 rounded-lg p-4">
            <pre className="whitespace-pre-wrap font-mono text-sm">
              {statusDraft}
            </pre>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(statusDraft)
                showToast('Copied to clipboard', 'success')
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg interactive"
            >
              Copy Again
            </button>
            <button
              onClick={() => setStatusDraft('')}
              className="px-4 py-2 bg-muted text-foreground rounded-lg interactive"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}