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
      // Process command through agent bridge
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
        // Process command through agent bridge
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
          isExpanded ? "w-[520px] h-[680px]" : "w-[420px] h-[580px]"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              "bg-green-500 animate-pulse"
            )} />
            <h3 className="font-semibold">AI Assistant</h3>
            {isProcessing && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
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
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-accent" />
            <span className="text-xs font-medium text-muted-foreground">Quick Actions</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {tools.map((tool) => (
              <button
                key={tool.action}
                onClick={() => handleToolClick(tool)}
                disabled={isProcessing}
                className={cn(
                  "p-2 rounded-lg",
                  "bg-muted/50 hover:bg-muted",
                  "flex flex-col items-center gap-1",
                  "transition-all duration-150",
                  "hover:scale-105 active:scale-95",
                  isProcessing && "opacity-50 cursor-not-allowed"
                )}
              >
                <tool.icon className="w-4 h-4" />
                <span className="text-xs">{tool.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4" style={{ height: isExpanded ? '480px' : '360px' }}>
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
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Type a command or question..."
              disabled={isProcessing}
              className={cn(
                "flex-1 px-3 py-2 rounded-lg",
                "bg-background border border-border",
                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                "placeholder:text-muted-foreground",
                "text-sm text-foreground",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "min-h-[40px]"
              )}
            />
            <PrimaryButton
              onClick={handleSend}
              size="sm"
              variant="accent"
              className="px-4"
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
