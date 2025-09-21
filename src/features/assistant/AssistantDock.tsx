import { useState, useEffect } from 'react'
import { MessageSquare, X, Zap, Calendar, CheckSquare, Mail, Brain, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PrimaryButton } from '@/components/PrimaryButton'
import { agentBridge } from '@/services/agentBridge'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  status?: 'sending' | 'sent' | 'error'
  actions?: any[]
}

export function AssistantDock() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isConfigured, setIsConfigured] = useState(true) // Always true now - backend handles it
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID())

  useEffect(() => {
    // Initialize agent bridge
    agentBridge.initialize()
    
    // Add welcome message
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Hi! I'm your AI assistant. I can help you manage your agenda. Try commands like:
• "Schedule a meeting tomorrow at 2pm"
• "Add a task to review documents"
• "Show me today's agenda"
• "Create a note about project ideas"
• "What's on my schedule?"`,
        timestamp: new Date()
      }])
    }
  }, [messages.length])
  
  // Lock body scroll on mobile when panel is open
  useEffect(() => {
    if (isOpen && window.innerWidth < 768) {
      document.body.classList.add('ai-panel-open')
      return () => {
        document.body.classList.remove('ai-panel-open')
      }
    }
  }, [isOpen])

  const tools = [
    { 
      icon: Calendar, 
      label: 'Add Event', 
      action: 'schedule',
      command: 'Schedule a meeting at 2pm today'
    },
    { 
      icon: CheckSquare, 
      label: 'Add Task', 
      action: 'task',
      command: 'Add task to review documents'
    },
    { 
      icon: Mail, 
      label: 'Draft Email', 
      action: 'email',
      command: 'Draft an email to the team'
    },
    { 
      icon: Brain, 
      label: 'Analyze', 
      action: 'analyze',
      command: "Show me today's progress"
    }
  ]

  const handleSend = async () => {
    if (!message.trim() || isProcessing) return
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
      status: 'sent'
    }
    
    setMessages(prev => [...prev, userMessage])
    setMessage('')
    setIsProcessing(true)
    
    try {
      // Process command through agent bridge with session ID
      const result = await agentBridge.processNaturalCommand(userMessage.content)
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.message,
        timestamp: new Date(),
        status: result.success ? 'sent' : 'error',
        actions: result.results
      }
      
      setMessages(prev => [...prev, assistantMessage])
      
    } catch (error) {
      console.error('Assistant error:', error)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        status: 'error'
      }])
    } finally {
      setIsProcessing(false)
    }
  }

  const handleToolClick = async (tool: typeof tools[0]) => {
    if (isProcessing) return
    
    // Set the command in input
    setMessage(tool.command)
    
    // Auto-send after a short delay
    setTimeout(async () => {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: tool.command,
        timestamp: new Date(),
        status: 'sent'
      }
      
      setMessages(prev => [...prev, userMessage])
      setMessage('')
      setIsProcessing(true)
      
      try {
        // Process command through agent bridge with session ID
        const result = await agentBridge.processNaturalCommand(tool.command)
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.message,
          timestamp: new Date(),
          status: result.success ? 'sent' : 'error',
          actions: result.results
        }
        
        setMessages(prev => [...prev, assistantMessage])
        
      } catch (error) {
        console.error('Tool command error:', error)
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'I encountered an error processing your request. Please try again.',
          timestamp: new Date(),
          status: 'error'
        }])
      } finally {
        setIsProcessing(false)
      }
    }, 100)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  return (
    <>
      {/* Floating Button - Sticky and Always Visible on Mobile */}
      <button
        onClick={() => setIsOpen(true)}
        onTouchStart={() => {
          // Add haptic feedback for mobile
          if ('vibrate' in navigator) {
            navigator.vibrate(100);
          }
        }}
        className={cn(
          "ai-dock-button assistant-dock-button",
          isOpen && "scale-0 opacity-0 pointer-events-none"
        )}
        aria-label="Open Assistant"
      >
        <MessageSquare className="w-6 h-6 text-white" />
      </button>

      {/* Assistant Panel */}
      <div
        className={cn(
          "ai-drawer",
          "fixed z-50",
          // Mobile: Full screen with safe areas
          "inset-0 md:bottom-6 md:right-6 md:inset-auto",
          "bg-card border border-border",
          "md:rounded-2xl", // Only rounded on desktop
          "shadow-2xl elevation-high",
          "transition-all duration-300 transform-gpu",
          isOpen ? "translate-y-0 opacity-100 ai-drawer-open" : "translate-y-full opacity-0 pointer-events-none",
          // Mobile: Full screen, Desktop: Fixed size
          "w-full h-full md:w-[420px] md:h-[580px]",
          // Safe area padding for mobile
          "pt-safe pb-safe",
          // Expanded state only on desktop
          isExpanded && "md:w-[520px] md:h-[680px]"
        )}
      >
        {/* Header with Safe Area */}
        <div className="flex items-center justify-between p-4 md:p-4 pt-6 md:pt-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              "bg-green-500 animate-pulse"
            )} />
            <h3 className="font-semibold text-lg md:text-base">AI Assistant</h3>
            {isProcessing && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
          </div>
          <div className="flex items-center gap-2">
            {/* Hide expand button on mobile */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="hidden md:block p-1.5 rounded-lg hover:bg-muted transition-colors"
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
            {/* Bigger X button for mobile */}
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 md:p-1.5 rounded-lg hover:bg-muted transition-colors touch-button min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
              aria-label="Close Assistant"
            >
              <X className="w-6 h-6 md:w-4 md:h-4" />
            </button>
          </div>
        </div>

        {/* Tools Palette */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-accent" />
            <span className="text-xs font-medium text-muted-foreground">Quick Actions</span>
          </div>
          {/* Mobile: 2 columns, Desktop: 4 columns */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {tools.map((tool) => (
              <button
                key={tool.action}
                onClick={() => handleToolClick(tool)}
                onTouchStart={() => {
                  // Add haptic feedback for mobile
                  if ('vibrate' in navigator && !isProcessing) {
                    navigator.vibrate(50);
                  }
                }}
                disabled={isProcessing}
                className={cn(
                  "p-3 md:p-2 rounded-lg touch-button",
                  "bg-muted/50 hover:bg-muted active:bg-muted",
                  "flex flex-col items-center gap-1",
                  "transition-all duration-150",
                  "hover:scale-105 active:scale-95",
                  "min-h-[60px] md:min-h-auto",
                  isProcessing && "opacity-50 cursor-not-allowed"
                )}
              >
                <tool.icon className="w-5 h-5 md:w-4 md:h-4" />
                <span className="text-xs font-medium">{tool.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4" style={{ 
          // Desktop: Fixed height
          height: isExpanded ? '480px' : '360px',
          // Mobile: Fill available space minus header and input
          maxHeight: 'calc(100vh - 280px)'
        }}>
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className="flex gap-3">
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Brain className="w-4 h-4 text-primary" />
                  </div>
                )}
                {msg.role === 'system' && (
                  <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                  </div>
                )}
                <div className={cn(
                  "flex-1",
                  msg.role === 'user' && "ml-auto max-w-[80%]"
                )}>
                  <div className={cn(
                    "p-3 rounded-lg",
                    msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted/50",
                    msg.status === 'error' && "border border-red-500/50"
                  )}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-1 text-xs text-green-500">
                          <CheckCircle className="w-3 h-3" />
                          <span>{msg.actions.filter(a => a.success).length} action(s) completed</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 block">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium">You</span>
                  </div>
                )}
              </div>
            ))}
            {isProcessing && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Brain className="w-4 h-4 text-primary animate-pulse" />
                </div>
                <div className="flex-1 p-3 rounded-lg bg-muted/50">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2 items-end">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Type a command or question..."
              disabled={isProcessing}
              className={cn(
                "flex-1 px-3 py-3 md:py-2 rounded-lg",
                "bg-background border border-border",
                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                "placeholder:text-muted-foreground",
                "text-base md:text-sm text-foreground",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "min-h-[48px] md:min-h-[40px]"
              )}
            />
            <PrimaryButton
              onClick={handleSend}
              onTouchStart={() => {
                // Add haptic feedback for mobile
                if ('vibrate' in navigator && !isProcessing && message.trim()) {
                  navigator.vibrate(75);
                }
              }}
              size="sm"
              variant="accent"
              className="px-4 md:px-4 h-[48px] md:h-auto touch-button"
              disabled={isProcessing || !message.trim()}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Send'
              )}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </>
  )
}
