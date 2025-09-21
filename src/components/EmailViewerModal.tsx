import { useState } from 'react'
import { X, Send, Wand2, CheckCircle, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { supabaseService } from '@/services/supabaseService'

interface EmailViewerModalProps {
  email: {
    id: string
    from: string
    subject: string
    snippet: string
    body?: string
    date: string
  } | null
  isOpen: boolean
  onClose: () => void
}

export function EmailViewerModal({ email, isOpen, onClose }: EmailViewerModalProps) {
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [aiResponse, setAiResponse] = useState<string>('')
  const [showResponse, setShowResponse] = useState(false)
  const { toast } = useToast()

  if (!isOpen || !email) return null

  const handleAIAction = async (action: 'reply' | 'professional' | 'grammar') => {
    try {
      setAiLoading(action)
      setShowResponse(false)

      // Format prompts for Elios AI system
      const emailContent = email.body || email.snippet
      const prompts = {
        reply: `Reply to email from ${email.from} about "${email.subject}": ${emailContent}`,
        professional: `Make this professional: ${emailContent}`,
        grammar: `Fix grammar: ${emailContent}`
      }

      // Call Elios AI Chat webhook through proxy to avoid CORS
      const proxyUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
        ? '/api/webhook/chat'
        : 'http://localhost:3000/api/webhook/chat'

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatInput: prompts[action],
          sessionId: `email-${email.id}-${Date.now()}`
        })
      })

      if (!response.ok) {
        throw new Error('Elios AI webhook failed')
      }

      // Handle response - Elios may return plain text or JSON
      const contentType = response.headers.get('content-type')
      let aiText = ''

      if (contentType && contentType.includes('application/json')) {
        const data = await response.json()
        // Try multiple possible response fields from Elios
        aiText = data.output || data.message || data.response || data.text || data.result ||
                 (typeof data === 'string' ? data : 'No response generated')
      } else {
        // Handle plain text response
        aiText = await response.text()
      }

      setAiResponse(aiText)

      // Log conversation to Supabase
      await supabaseService.logAIConversation({
        email_id: email.id,
        action: action,
        request: prompts[action],
        response: aiText,
        session_id: `email-${email.id}-${Date.now()}`
      })

      setShowResponse(true)
      toast.success(`AI ${action} generated!`)
    } catch (error) {
      console.error('AI action failed:', error)
      toast.error(`Failed to generate ${action}`)

      // Show a sample response for demo purposes
      const sampleResponses = {
        reply: `Dear ${email.from},\n\nThank you for your email regarding "${email.subject}". I will review this and get back to you shortly.\n\nBest regards`,
        professional: `Subject: Re: ${email.subject}\n\nI hope this email finds you well. I wanted to follow up on your message...`,
        grammar: email.body || email.snippet
      }
      setAiResponse(sampleResponses[action])
      setShowResponse(true)
    } finally {
      setAiLoading(null)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(aiResponse)
    toast.success('Copied to clipboard!')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-white/20">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Email Viewer</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Email Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-2">
            <div className="text-sm text-white/60">From</div>
            <div className="text-white">{email.from}</div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-white/60">Subject</div>
            <div className="text-white font-medium">{email.subject}</div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-white/60">Date</div>
            <div className="text-white">{new Date(email.date).toLocaleString()}</div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-white/60">Message</div>
            <div className="text-white whitespace-pre-wrap bg-white/5 rounded-lg p-4">
              {email.body || email.snippet}
            </div>
          </div>

          {/* AI Response Section */}
          {showResponse && (
            <div className="space-y-2 animate-in slide-in-from-bottom">
              <div className="flex items-center justify-between">
                <div className="text-sm text-green-400">AI Generated Response</div>
                <button
                  onClick={copyToClipboard}
                  className="text-xs text-white/60 hover:text-white transition-colors"
                >
                  Copy to clipboard
                </button>
              </div>
              <div className="text-white whitespace-pre-wrap bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/20">
                {aiResponse}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-white/10">
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleAIAction('reply')}
              disabled={aiLoading !== null}
              className="flex flex-col items-center justify-center gap-2 p-4 bg-blue-500/20 hover:bg-blue-500/30
                rounded-xl transition-all duration-200 disabled:opacity-50 touch-manipulation"
            >
              {aiLoading === 'reply' ? (
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              ) : (
                <Send className="w-5 h-5 text-blue-400" />
              )}
              <span className="text-xs text-white">Reply with AI</span>
            </button>

            <button
              onClick={() => handleAIAction('professional')}
              disabled={aiLoading !== null}
              className="flex flex-col items-center justify-center gap-2 p-4 bg-purple-500/20 hover:bg-purple-500/30
                rounded-xl transition-all duration-200 disabled:opacity-50 touch-manipulation"
            >
              {aiLoading === 'professional' ? (
                <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
              ) : (
                <Wand2 className="w-5 h-5 text-purple-400" />
              )}
              <span className="text-xs text-white">Make Professional</span>
            </button>

            <button
              onClick={() => handleAIAction('grammar')}
              disabled={aiLoading !== null}
              className="flex flex-col items-center justify-center gap-2 p-4 bg-green-500/20 hover:bg-green-500/30
                rounded-xl transition-all duration-200 disabled:opacity-50 touch-manipulation"
            >
              {aiLoading === 'grammar' ? (
                <Loader2 className="w-5 h-5 text-green-400 animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-400" />
              )}
              <span className="text-xs text-white">Fix Grammar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}