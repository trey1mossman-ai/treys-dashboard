import { Modal } from '@/components/Modal'
import { Calendar } from 'lucide-react'

interface CalendarSummaryProps {
  isOpen: boolean
  onClose: () => void
  summary: string
}

export function CalendarSummary({ isOpen, onClose, summary }: CalendarSummaryProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Calendar Summary"
      size="lg"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-accent">
          <Calendar className="w-5 h-5" />
          <span className="font-medium">Today's Schedule</span>
        </div>
        
        <div className="bg-muted/30 rounded-xl p-6">
          {summary ? (
            <div className="prose prose-invert max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-foreground">
                {summary}
              </pre>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No calendar data available
            </p>
          )}
        </div>
        
        <div className="flex justify-end gap-2">
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(summary)
              // TODO: Show toast
            }}
            className="px-4 py-2 bg-muted text-foreground rounded-lg interactive"
          >
            Copy
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg interactive"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}