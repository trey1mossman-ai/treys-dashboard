import { Modal } from '@/components/Modal'
import { Mail, Clock } from 'lucide-react'

interface Email {
  id: string
  from: string
  subject: string
  time: string
  snippet: string
}

interface EmailDigestModalProps {
  isOpen: boolean
  onClose: () => void
  emails: Email[]
}

export function EmailDigestModal({ isOpen, onClose, emails }: EmailDigestModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Email Digest"
      size="xl"
    >
      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        {emails.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No emails found
          </p>
        ) : (
          emails.map((email) => (
            <div
              key={email.id}
              className="card-base p-4 hover:bg-muted/20 interactive cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <Mail className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {email.from}
                      </p>
                      <h4 className="font-semibold text-foreground mt-1">
                        {email.subject}
                      </h4>
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Clock className="w-3 h-3" />
                      {new Date(email.time).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {email.snippet}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-muted text-foreground rounded-lg interactive"
        >
          Close
        </button>
        <button
          onClick={() => {
            // TODO: Implement summarize
            console.log('Summarize emails')
          }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg interactive"
        >
          Summarize with AI
        </button>
      </div>
    </Modal>
  )
}