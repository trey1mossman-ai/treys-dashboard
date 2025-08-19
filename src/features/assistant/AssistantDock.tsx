import { useState } from 'react'
import { MessageSquare, X, Zap, Calendar, CheckSquare, Mail, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PrimaryButton } from '@/components/PrimaryButton'

export function AssistantDock() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  const tools = [
    { icon: Calendar, label: 'Schedule', action: 'schedule' },
    { icon: CheckSquare, label: 'Task', action: 'task' },
    { icon: Mail, label: 'Email', action: 'email' },
    { icon: Brain, label: 'Analyze', action: 'analyze' }
  ]

  const handleSend = () => {
    if (!message.trim()) return
    console.log('Assistant message:', message)
    setMessage('')
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "w-14 h-14 rounded-full",
          "bg-primary text-primary-foreground",
          "flex items-center justify-center",
          "shadow-lg elevation-high",
          "transition-all duration-300",
          "hover:scale-110 active:scale-95",
          "glow-primary",
          isOpen && "scale-0 opacity-0 pointer-events-none"
        )}
        aria-label="Open Assistant"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Assistant Panel */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "bg-card border border-border rounded-2xl",
          "shadow-2xl elevation-high",
          "transition-all duration-300 transform-gpu",
          isOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none",
          isExpanded ? "w-[480px] h-[600px]" : "w-[380px] h-[480px]"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <h3 className="font-semibold">AI Assistant</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                {isExpanded ? (
                  <path d="M10 6L6 6L6 10L10 10L10 6Z" />
                ) : (
                  <path d="M2 6L6 6L6 2M10 2L10 6L14 6M14 10L10 10L10 14M6 14L6 10L2 10" />
                )}
              </svg>
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              aria-label="Close Assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tools Palette */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent" />
            <span className="text-xs font-medium text-muted-foreground">Quick Tools</span>
          </div>
          <div className="flex gap-2 mt-2">
            {tools.map(({ icon: Icon, label, action }) => (
              <button
                key={action}
                onClick={() => console.log('Tool action:', action)}
                className={cn(
                  "flex-1 p-2 rounded-lg",
                  "bg-muted/50 hover:bg-muted",
                  "flex flex-col items-center gap-1",
                  "transition-all duration-150",
                  "hover:scale-105 active:scale-95"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 min-h-[240px] max-h-[400px]">
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 p-3 rounded-lg bg-muted/50">
                <p className="text-sm">
                  Hi! I'm your AI assistant. I can help you:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>• Schedule meetings and tasks</li>
                  <li>• Send emails and messages</li>
                  <li>• Analyze your productivity</li>
                  <li>• Create action items</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything..."
              className={cn(
                "flex-1 px-3 py-2 rounded-lg",
                "bg-muted/50 border border-border",
                "focus:outline-none focus:ring-2 focus:ring-accent/50",
                "placeholder:text-muted-foreground",
                "text-sm"
              )}
            />
            <PrimaryButton
              onClick={handleSend}
              size="sm"
              variant="accent"
              className="px-3"
            >
              Send
            </PrimaryButton>
          </div>
        </div>
      </div>
    </>
  )
}