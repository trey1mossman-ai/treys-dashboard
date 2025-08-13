import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User } from 'lucide-react'
import { Card } from '@/components/Card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { agentService } from '@/services/agentService'
import type { ChatMessage } from './types'

export function AgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. How can I help you today?',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [messages])
  
  const handleSend = async () => {
    if (!input.trim() || sending) return
    
    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setSending(true)
    
    try {
      const response = await agentService.sendMessage(
        messages.map(m => ({ role: m.role, content: m.content }))
          .concat({ role: 'user', content: input })
      )
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.content,
        timestamp: new Date()
      }])
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }])
    }
    
    setSending(false)
  }
  
  return (
    <Card className="flex flex-col h-[600px]">
      <div className="border-b border-border p-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Bot className="w-5 h-5 text-accent" />
          AI Agent Chat
        </h3>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.map((message, idx) => (
          <div 
            key={idx}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-accent" />
              </div>
            )}
            
            <div className={`max-w-[70%] ${message.role === 'user' ? 'order-1' : ''}`}>
              <div className={`rounded-lg p-3 ${
                message.role === 'user' 
                  ? 'bg-accent text-white' 
                  : 'bg-panel border border-border'
              }`}>
                <p className="text-sm">{message.content}</p>
              </div>
              <p className="text-xs text-muted mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
            
            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-accent2/20 flex items-center justify-center order-2">
                <User className="w-5 h-5 text-accent2" />
              </div>
            )}
          </div>
        ))}
        
        {sending && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-accent animate-pulse" />
            </div>
            <div className="bg-panel border border-border rounded-lg p-3">
              <p className="text-sm text-muted">Thinking...</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="border-t border-border p-4">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend() }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={sending}
          />
          <Button type="submit" disabled={sending || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </Card>
  )
}