import { useState, useEffect, useRef } from 'react';
import { Mic, X, Send, Sparkles, Calendar, Mail, Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import '../styles/tokens.css';

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: AIAction[];
}

interface AIAction {
  type: 'add_task' | 'add_block' | 'queue_reorder' | 'book_appointment';
  label: string;
  params: Record<string, any>;
}

export function AIDock() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeQuickAction, setActiveQuickAction] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const sessionIdRef = useRef(`session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Quick action buttons for common requests
  const quickActions = [
    { icon: Calendar, label: 'Today\'s Calendar', message: "What's on my calendar today?" },
    { icon: Mail, label: 'Check Emails', message: 'Show me my recent emails' },
    { icon: Clock, label: 'Next Meeting', message: 'When is my next meeting?' },
    { icon: CheckCircle, label: 'Daily Summary', message: 'Give me a summary of today' },
  ];

  // Hotkey handler (C for Chat)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'c' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        // Don't trigger if user is typing in an input
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
          }
        }
      }
      // ESC to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const savedInput = input;
    setInput('');
    setIsProcessing(true);

    try {
      // Use Vercel API proxy to call n8n webhook (avoids CORS issues)
      const proxyUrl = window.location.hostname !== 'localhost'
        ? '/api/webhook/chat'
        : 'http://localhost:3000/api/webhook/chat';

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: savedInput,
          chatInput: savedInput, // n8n expects this field
          sessionId: sessionIdRef.current
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract the assistant's response
      let assistantContent = '';
      if (data.message) {
        assistantContent = data.message;
      } else if (data.output) {
        assistantContent = data.output;
      } else if (data.response) {
        assistantContent = data.response;
      } else {
        assistantContent = 'Message received.';
      }
      
      const aiResponse: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
        // n8n will handle actions through the response
        actions: undefined
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('AI chat error:', error);
      const errorMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I had trouble processing that. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
      setActiveQuickAction(null);
    }
  };

  const handleAction = (action: AIAction) => {
    // Dispatch action to command system
    window.dispatchEvent(new CustomEvent('ai-command', { 
      detail: { 
        type: action.type, 
        params: action.params 
      } 
    }));
    
    // Show confirmation
    const confirmMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `✓ ${action.label} completed`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, confirmMessage]);
  };

  const sendQuickMessage = async (message: string, label: string) => {
    // Directly send the message when clicking a context chip
    if (isProcessing) return;
    
    setActiveQuickAction(label);
    
    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      const proxyUrl = window.location.hostname !== 'localhost'
        ? '/api/webhook/chat'
        : 'http://localhost:3000/api/webhook/chat';

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          chatInput: message, // n8n expects this field
          sessionId: sessionIdRef.current
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      let assistantContent = '';
      if (data.message) {
        assistantContent = data.message;
      } else if (data.output) {
        assistantContent = data.output;
      } else if (data.response) {
        assistantContent = data.response;
      } else {
        assistantContent = 'Message received.';
      }
      
      const aiResponse: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
        actions: undefined
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('AI chat error:', error);
      const errorMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I had trouble processing that. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
      setActiveQuickAction(null);
    }
  };

  return (
    <>
      {/* Floating Button - Fixed for mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed w-14 h-14 rounded-full",
          "bg-gradient-to-br from-cyan-500 to-cyan-600",
          "shadow-lg hover:shadow-xl transform hover:scale-105",
          "transition-all duration-200",
          "flex items-center justify-center",
          "border border-cyan-400/30",
          isOpen && "scale-0 opacity-0 pointer-events-none"
        )}
        style={{ 
          bottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
          right: '24px',
          zIndex: 9999,
          boxShadow: '0 0 30px rgba(0, 212, 255, 0.4)' 
        }}
        aria-label="Open AI Assistant"
      >
        <Sparkles className="w-6 h-6 text-white" />
      </button>

      {/* AI Dock Panel - Mobile Optimized */}
      <div
        className={cn(
          "fixed",
          "bg-gray-900/95 backdrop-blur-xl",
          "shadow-2xl",
          "transition-transform duration-300 ease-out",
          "flex flex-col",
          isMobile ? "" : "border border-gray-700 rounded-2xl",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        style={{ 
          width: isMobile ? '100vw' : '400px',
          height: isMobile ? '100vh' : 'calc(100vh - 40px)',
          top: isMobile ? '0' : '20px',
          right: isMobile ? '0' : '20px',
          bottom: isMobile ? '0' : '20px',
          borderRadius: isMobile ? '0' : '16px',
          zIndex: 9998,
          background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
            <span className="text-xs text-gray-400 px-2 py-0.5 bg-cyan-500/10 rounded-full hidden sm:inline-block">
              Press C
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close AI Assistant"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 p-4 border-b border-gray-700 flex-wrap">
          {quickActions.map(({ icon: Icon, label, message }) => {
            const isActive = activeQuickAction === label;
            return (
              <button
                key={label}
                onClick={() => sendQuickMessage(message, label)}
                disabled={isProcessing}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all text-xs text-white",
                  "border focus:outline-none focus:ring-2 focus:ring-cyan-400/50",
                  isActive 
                    ? "bg-cyan-500/30 border-cyan-500/50 animate-pulse" 
                    : "bg-cyan-500/10 hover:bg-cyan-500/20 active:bg-cyan-500/30 hover:scale-105 active:scale-95 border-cyan-500/30 hover:border-cyan-500/50",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                title={message}
              >
                {isActive ? (
                  <>
                    <div className="w-4 h-4 border-2 border-accent-400 border-t-transparent rounded-full animate-spin" />
                    <span className="font-medium">Sending...</span>
                  </>
                ) : (
                  <>
                    <Icon className="w-4 h-4 text-cyan-400" />
                    <span className="font-medium">{label}</span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 text-cyan-400/30 mx-auto mb-4" />
              <p className="text-gray-400 text-sm">
                I can manage your calendar and emails
              </p>
              <div className="mt-4 text-left space-y-2 max-w-xs mx-auto">
                <p className="text-xs text-gray-500">• "What's on my calendar today?"</p>
                <p className="text-xs text-gray-500">• "Schedule a meeting with John at 2pm"</p>
                <p className="text-xs text-gray-500">• "Send an email to the team"</p>
                <p className="text-xs text-gray-500">• "Show my upcoming tasks"</p>
              </div>
            </div>
          ) : (
            messages.map(message => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2",
                    message.role === 'user' 
                      ? "bg-cyan-500/20 text-white" 
                      : "bg-gray-800 text-gray-200"
                  )}
                >
                  <p className="text-sm">{message.content}</p>
                  
                  {/* Action Cards */}
                  {message.actions && (
                    <div className="mt-3 space-y-2">
                      {message.actions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleAction(action)}
                          className="w-full text-left px-3 py-2 rounded-lg bg-cyan-500/10 
                                   hover:bg-cyan-500/20 transition-colors text-xs text-white
                                   border border-cyan-500/30"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {isProcessing && (
            <div className="flex gap-3">
              <div className="bg-white/5 rounded-2xl px-4 py-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-75" />
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-150" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-700 p-4">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask about calendar, emails, or tasks..."
              className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm text-white 
                       placeholder-gray-400 border border-gray-600
                       focus:border-cyan-400 focus:outline-none resize-none"
              rows={2}
            />
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setIsRecording(!isRecording)}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  isRecording 
                    ? "bg-error-500 hover:bg-error-600 animate-pulse" 
                    : "bg-white/5 hover:bg-white/10"
                )}
                aria-label="Voice input"
              >
                <Mic className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isProcessing}
                className="p-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 
                         disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                aria-label="Send message"
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}