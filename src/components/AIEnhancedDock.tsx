// Enhanced AI Dock - Floating cyan orb with hotkey C, 420-520px drawer
import React, { useState, useEffect, useRef } from 'react';
import { useDashboardStore } from '../stores/dashboardStore';
import { Mic, MicOff, Send, X, Bot, Sparkles } from 'lucide-react';

interface AIDockProps {
  className?: string;
}

export function AIEnhancedDock({ className }: AIDockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    actions?: Array<{ label: string; action: string; parameters?: any }>;
  }>>([]);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { actions } = useDashboardStore();

  // Hotkey listener for 'C'
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'c' || e.key === 'C') {
        // Only trigger if not in input field
        const activeElement = document.activeElement;
        if (activeElement?.tagName !== 'INPUT' && activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setIsOpen(prev => !prev);
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Parse intent from user input
      const intent = parseUserIntent(userMessage.content);
      
      if (intent.type === 'command') {
        await executeCommand(intent);
        
        const assistantMessage = {
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          content: `Executed command: ${intent.description}`,
          timestamp: new Date(),
          actions: intent.followUp ? [intent.followUp] : undefined
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Trigger baby agent for complex requests
        await actions.triggerBabyAgent(intent.intent, intent.parameters);
        
        const assistantMessage = {
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          content: `I've started processing your request: "${userMessage.content}". I'll update you when it's complete.`,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      const errorMessage = {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const parseUserIntent = (content: string): any => {
    const lower = content.toLowerCase();
    
    // Direct commands
    if (lower.includes('mark') && lower.includes('complete')) {
      return {
        type: 'command',
        description: 'Mark item complete',
        intent: 'mark_complete',
        parameters: { query: content }
      };
    }
    
    if (lower.includes('reorder') || lower.includes('move')) {
      return {
        type: 'command',
        description: 'Reorder items',
        intent: 'queue_reorder',
        parameters: { query: content }
      };
    }
    
    if (lower.includes('add task') || lower.startsWith('/task')) {
      return {
        type: 'command',
        description: 'Add new task',
        intent: 'add_task',
        parameters: { content: content.replace('/task', '').trim() }
      };
    }
    
    // Complex requests go to baby agent
    return {
      type: 'baby_agent',
      intent: 'general_assistance',
      parameters: { query: content, context: 'dashboard_chat' }
    };
  };

  const executeCommand = async (intent: any) => {
    switch (intent.intent) {
      case 'mark_complete':
        // This would need to parse which item to complete
        // For now, just show capability
        break;
      case 'queue_reorder':
        // This would need to parse which item to reorder
        break;
      case 'add_task':
        await actions.triggerBabyAgent('add_task', intent.parameters);
        break;
    }
  };

  const executeAction = async (action: any) => {
    try {
      switch (action.action) {
        case 'mark_complete':
          await actions.markComplete(action.parameters.id, action.parameters.source);
          break;
        case 'queue_reorder':
          await actions.queueReorder(action.parameters.id);
          break;
        default:
          await actions.triggerBabyAgent(action.action, action.parameters);
      }
    } catch (error) {
      console.error('Action execution failed:', error);
    }
  };

  const toggleVoice = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsListening(prev => !prev);
      // Voice recognition implementation would go here
    }
  };

  return (
    <>
      {/* Floating Orb */}
      <button
        onClick={() => setIsOpen(true)}
        className={`
          fixed bottom-6 right-6 w-14 h-14 
          rounded-full bg-gradient-to-r from-cyan-500 to-teal-400
          shadow-lg hover:shadow-xl
          flex items-center justify-center
          transition-all duration-300 ease-out
          hover:scale-110 active:scale-95
          z-50
          ${className}
        `}
        style={{
          boxShadow: '0 4px 20px rgba(55, 230, 227, 0.3), 0 0 40px rgba(55, 230, 227, 0.1)',
        }}
        aria-label="Open AI Assistant (Hotkey: C)"
      >
        <Bot className="w-6 h-6 text-white" />
      </button>

      {/* Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Drawer Content */}
          <div 
            className="relative bg-gray-900/95 backdrop-blur-lg border border-gray-700 rounded-tl-2xl shadow-2xl"
            style={{
              width: 'clamp(420px, 30vw, 520px)',
              height: '70vh',
              maxHeight: '600px'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                <h3 className="text-lg font-medium text-white">AI Assistant</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-800 flex items-center justify-center transition-colors"
                aria-label="Close Assistant"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 h-full">
              {messages.length === 0 && (
                <div className="text-center text-gray-400 mt-8">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Hi! I can help you manage your dashboard.</p>
                  <p className="text-sm mt-1">Try: "Mark my workout complete" or "Add a task"</p>
                </div>
              )}
              
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-cyan-500 text-white'
                        : 'bg-gray-800 text-gray-100'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    
                    {message.actions && (
                      <div className="mt-2 space-y-1">
                        {message.actions.map((action, index) => (
                          <button
                            key={index}
                            onClick={() => executeAction(action)}
                            className="w-full text-left px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 p-3 rounded-2xl">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-700">
              <form onSubmit={handleSubmit} className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                    placeholder="Ask me anything..."
                    className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder-gray-400"
                    rows={1}
                    style={{ minHeight: '48px', maxHeight: '120px' }}
                  />
                  
                  <button
                    type="button"
                    onClick={toggleVoice}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      isListening 
                        ? 'bg-red-500 hover:bg-red-600' 
                        : 'hover:bg-gray-700'
                    }`}
                    aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                  >
                    {isListening ? (
                      <MicOff className="w-4 h-4 text-white" />
                    ) : (
                      <Mic className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
                
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="w-12 h-12 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors"
                  aria-label="Send message"
                >
                  <Send className="w-5 h-5 text-white" />
                </button>
              </form>
              
              <p className="text-xs text-gray-500 mt-2 text-center">
                Press <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400">C</kbd> anywhere to toggle • <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400">Enter</kbd> to send
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}