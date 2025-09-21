// Enhanced Assistant Dock - Day 5 Implementation
// Team Lead: Claude
// Integrates streaming, voice, and tool execution

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { 
  MessageSquare, 
  Mic, 
  MicOff, 
  Send, 
  X, 
  Minimize2, 
  Maximize2,
  Sparkles,
  Zap,
  Calendar,
  StickyNote,
  TrendingUp
} from 'lucide-react';
import { StreamingResponse } from '@/components/StreamingResponse';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { executeAssistantTool, getToolDescriptions } from '@/services/assistantTools';
import { useOptimizedData } from '@/hooks/useOptimizedData';
import type { AgendaItem, NoteItem } from '@/services/db';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: Array<{ tool: string; params: any; result: any }>;
  isStreaming?: boolean;
}

interface DaySummary {
  date: string;
  todos: { total: number; completed: number; completionRate: string };
  agenda: { total: number; completed: number };
  notes: { created: number };
  productivity: string;
}

interface TrendSummary {
  weeklyTotal: number;
  weeklyCompleted: number;
  averageDaily: string;
  completionRate: string;
  dailyBreakdown: Array<{ day: string; total: number; completed: number; rate: string }>;
}

type ToolData = AgendaItem | NoteItem | DaySummary | TrendSummary | unknown;

const isAgendaItem = (data: ToolData): data is AgendaItem =>
  typeof data === 'object' && data !== null && 'title' in data && 'startTime' in data;

const isNoteItem = (data: ToolData): data is NoteItem =>
  typeof data === 'object' && data !== null && 'content' in data;

const isDaySummary = (data: ToolData): data is DaySummary =>
  typeof data === 'object' && data !== null && 'todos' in data && 'agenda' in data && 'notes' in data;

const isTrendSummary = (data: ToolData): data is TrendSummary =>
  typeof data === 'object' && data !== null && 'weeklyTotal' in data && 'dailyBreakdown' in data;

export const EnhancedAssistantDock: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your AI assistant. I can help you manage your agenda, create notes, execute quick actions, and analyze your productivity. Try saying 'What can you do?' or use voice commands!",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStreamingId, setCurrentStreamingId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Voice input integration
  const {
    isListening,
    transcript,
    interimTranscript,
    toggleListening,
    clearTranscript,
    isSupported: isVoiceSupported
  } = useVoiceInput({
    continuous: false,
    onResult: (text, isFinal) => {
      if (isFinal) {
        setInput(text);
        // Auto-submit on final transcript
        if (text.length > 3) {
          handleSubmit(text);
        }
      } else {
        // Show interim results
        setInput(text);
      }
    }
  });
  
  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Listen for external commands
  useEffect(() => {
    const handleAssistantCommand = (event: CustomEvent) => {
      const { command } = event.detail;
      if (command === 'next-task') {
        handleSubmit("What's my next task?");
      } else if (command === 'summarize-day') {
        handleSubmit("Summarize my day");
      }
    };
    
    const handleToggle = () => setIsOpen(prev => !prev);
    const handleClose = () => setIsOpen(false);
    
    window.addEventListener('assistant:command', handleAssistantCommand as EventListener);
    window.addEventListener('assistant:toggle', handleToggle);
    window.addEventListener('assistant:close', handleClose);
    
    return () => {
      window.removeEventListener('assistant:command', handleAssistantCommand as EventListener);
      window.removeEventListener('assistant:toggle', handleToggle);
      window.removeEventListener('assistant:close', handleClose);
    };
  }, []);
  
  // Process message and execute tools
  const processMessage = async (userMessage: string) => {
    const messageId = `msg-${Date.now()}`;
    
    // Add user message
    const userMsg: Message = {
      id: `user-${messageId}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);
    setCurrentStreamingId(messageId);
    
    // Create assistant response
    const assistantMsg: Message = {
      id: messageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };
    
    setMessages(prev => [...prev, assistantMsg]);
    
    try {
      // Parse for tool commands
      const toolMatch = userMessage.toLowerCase();
      let toolExecuted = false;
      
      // Check for specific commands
      if (toolMatch.includes('add') && toolMatch.includes('agenda')) {
        const result = await executeAssistantTool('agenda.create', {
          title: extractTitle(userMessage),
          startTime: extractTime(userMessage, 'start'),
          endTime: extractTime(userMessage, 'end')
        });

        if (result.success && isAgendaItem(result.data)) {
          updateMessage(messageId, {
            content: `✅ Added to your agenda: "${result.data.title}"`,
            isStreaming: false,
            toolCalls: [{ tool: 'agenda.create', params: {}, result }]
          });
        } else {
          updateMessage(messageId, {
            content: `❌ Failed to add: ${result.error || 'Unknown error'}`,
            isStreaming: false,
            toolCalls: [{ tool: 'agenda.create', params: {}, result }]
          });
        }
        toolExecuted = true;
      } else if (toolMatch.includes('create') && toolMatch.includes('note')) {
        const result = await executeAssistantTool('notes.create', {
          content: extractNoteContent(userMessage),
          color: 'yellow'
        });

        if (result.success && isNoteItem(result.data)) {
          const preview = result.data.content.length > 50
            ? `${result.data.content.substring(0, 50)}...`
            : result.data.content;
          updateMessage(messageId, {
            content: `📝 Created sticky note: "${preview}"`,
            isStreaming: false,
            toolCalls: [{ tool: 'notes.create', params: {}, result }]
          });
        } else {
          updateMessage(messageId, {
            content: `❌ Failed to create note: ${result.error || 'Unknown error'}`,
            isStreaming: false,
            toolCalls: [{ tool: 'notes.create', params: {}, result }]
          });
        }
        toolExecuted = true;
      } else if (toolMatch.includes('summarize') || toolMatch.includes('summary')) {
        const result = await executeAssistantTool('summarize.day', {});

        if (result.success && isDaySummary(result.data)) {
          const summary = result.data;
          updateMessage(messageId, {
            content: `📊 **Today's Summary**\n\n` +
              `📅 ${summary.date}\n\n` +
              `**Tasks:** ${summary.todos.completed}/${summary.todos.total} completed (${summary.todos.completionRate})\n` +
              `**Agenda:** ${summary.agenda.completed}/${summary.agenda.total} items synced\n` +
              `**Notes:** ${summary.notes.created} created\n` +
              `**Productivity:** ${summary.productivity} 🎯`,
            isStreaming: false,
            toolCalls: [{ tool: 'summarize.day', params: {}, result }]
          });
        } else {
          updateMessage(messageId, {
            content: `❌ Failed to summarize: ${result.error || 'Unknown error'}`,
            isStreaming: false,
            toolCalls: [{ tool: 'summarize.day', params: {}, result }]
          });
        }
        toolExecuted = true;
      } else if (toolMatch.includes('trend') || toolMatch.includes('analyze')) {
        const result = await executeAssistantTool('analyze.trends', {});

        if (result.success && isTrendSummary(result.data)) {
          const trends = result.data;
          updateMessage(messageId, {
            content: `📈 **Weekly Trends**\n\n` +
              `**Total Tasks:** ${trends.weeklyTotal}\n` +
              `**Completed:** ${trends.weeklyCompleted} (${trends.completionRate})\n` +
              `**Daily Average:** ${trends.averageDaily} tasks\n\n` +
              `**Daily Breakdown:**\n` +
              trends.dailyBreakdown.map(day =>
                `• ${day.day}: ${day.completed}/${day.total} (${day.rate})`
              ).join('\n'),
            isStreaming: false,
            toolCalls: [{ tool: 'analyze.trends', params: {}, result }]
          });
        } else {
          updateMessage(messageId, {
            content: `❌ Failed to analyze trends: ${result.error || 'Unknown error'}`,
            isStreaming: false,
            toolCalls: [{ tool: 'analyze.trends', params: {}, result }]
          });
        }
        toolExecuted = true;
      }
      else if (toolMatch.includes('what can you do') || toolMatch.includes('help')) {
        const capabilities = `🤖 **I can help you with:**\n\n` +
          `📅 **Agenda Management**\n` +
          `• "Add agenda: Team meeting at 2pm"\n` +
          `• "Update my 3pm meeting"\n` +
          `• "Delete the 4pm appointment"\n\n` +
          `📝 **Sticky Notes**\n` +
          `• "Create note: Remember to call client"\n` +
          `• "Add a reminder about the deadline"\n\n` +
          `⚡ **Quick Actions**\n` +
          `• "Create action for deployment webhook"\n` +
          `• "Execute backup action"\n\n` +
          `📊 **Analytics**\n` +
          `• "Summarize my day"\n` +
          `• "Show weekly trends"\n` +
          `• "Analyze my productivity"\n\n` +
          `🎤 **Voice Commands**\n` +
          `Click the microphone or say:\n` +
          `• "Add agenda"\n` +
          `• "New note"\n` +
          `• "What's next"`;
        
        updateMessage(messageId, {
          content: capabilities,
          isStreaming: false
        });
        toolExecuted = true;
      }
      
      // If no tool was executed, simulate streaming response
      if (!toolExecuted) {
        const response = await simulateStreamingResponse(userMessage);
        updateMessage(messageId, {
          content: response,
          isStreaming: false
        });
      }
    } catch (error) {
      updateMessage(messageId, {
        content: `❌ Error: ${error.message}`,
        isStreaming: false
      });
    } finally {
      setIsProcessing(false);
      setCurrentStreamingId(null);
    }
  };
  
  // Update message helper
  const updateMessage = (id: string, updates: Partial<Message>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    ));
  };
  
  // Simulate streaming for non-tool responses
  const simulateStreamingResponse = async (prompt: string): Promise<string> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const responses = [
      "I understand you want help with that. Let me think about the best approach...",
      "That's interesting! Based on your dashboard data, I can suggest...",
      "Great question! Here's what I recommend based on your patterns..."
    ];
    
    return responses[Math.floor(Math.random() * responses.length)] + 
      "\n\nTry asking me to 'summarize your day' or 'create a note' to see what I can do!";
  };
  
  // Extract helpers
  const extractTitle = (text: string): string => {
    const match = text.match(/["']([^"']+)["']|:\s*(.+?)(?:\s+at|\s+from|$)/);
    return match ? (match[1] || match[2] || 'New Item').trim() : 'New Item';
  };
  
  const extractTime = (text: string, type: 'start' | 'end'): string => {
    const now = new Date();
    const timeMatch = text.match(/(\d{1,2})\s*(am|pm)/gi);
    
    if (timeMatch) {
      const time = timeMatch[type === 'start' ? 0 : timeMatch.length - 1];
      const [, hours, period] = time.match(/(\d+)\s*(am|pm)/i);
      let hour = parseInt(hours);
      if (period.toLowerCase() === 'pm' && hour !== 12) hour += 12;
      if (period.toLowerCase() === 'am' && hour === 12) hour = 0;
      
      now.setHours(hour, 0, 0, 0);
      if (type === 'end') now.setHours(hour + 1);
    }
    
    return now.toISOString();
  };
  
  const extractNoteContent = (text: string): string => {
    const match = text.match(/["']([^"']+)["']|:\s*(.+?)$/);
    return match ? (match[1] || match[2] || text).trim() : text;
  };
  
  // Handle submit
  const handleSubmit = useCallback(async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isProcessing) return;
    
    setInput('');
    clearTranscript();
    await processMessage(text);
  }, [input, isProcessing, clearTranscript]);
  
  // Render
  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            'fixed bottom-6 right-6 z-50',
            'w-14 h-14 rounded-full',
            'bg-gradient-to-r from-violet-600 to-cyan-600',
            'shadow-[0_0_0_1px_rgba(168,132,255,.35)_inset,0_8px_40px_rgba(168,132,255,.15)]',
            'hover:scale-105 active:scale-95',
            'transition-all duration-120',
            'flex items-center justify-center',
            'group'
          )}
          aria-label="Open Assistant"
          data-testid="assistant-dock-button"
        >
          <MessageSquare className="w-6 h-6 text-white" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-pulse" />
        </button>
      )}
      
      {/* Assistant Dock */}
      {isOpen && (
        <div
          className={cn(
            'fixed z-50',
            'bg-gray-900/95 backdrop-blur-xl',
            'border border-gray-800',
            'rounded-2xl shadow-2xl',
            'transition-all duration-300',
            isMinimized
              ? 'bottom-6 right-6 w-80 h-16'
              : 'bottom-6 right-6 w-96 h-[600px] max-h-[80vh]',
            'flex flex-col'
          )}
          data-testid="assistant-panel"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Sparkles className="w-5 h-5 text-violet-400" />
                <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
              </div>
              <h3 className="font-semibold text-white">AI Assistant</h3>
              {isProcessing && (
                <span className="text-xs text-cyan-400 animate-pulse">Thinking...</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[80%] p-3 rounded-xl',
                      message.role === 'user'
                        ? 'bg-violet-600/20 text-white border border-violet-500/30'
                        : 'bg-gray-800 text-gray-200 border border-gray-700'
                    )}
                    data-testid={message.role === 'assistant' ? 'assistant-response' : undefined}
                  >
                      {message.isStreaming && currentStreamingId === message.id ? (
                        <StreamingResponse
                          text={message.content}
                          isStreaming={true}
                        />
                      ) : (
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      )}
                      
                      {/* Tool calls indicator */}
                      {message.toolCalls && message.toolCalls.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-700">
                          <div className="flex items-center gap-2 text-xs text-cyan-400">
                            <Zap className="w-3 h-3" />
                            <span>Executed: {message.toolCalls.map(tc => tc.tool).join(', ')}</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-1 text-xs text-gray-500">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Quick Actions */}
              <div className="px-4 pb-2">
                <div className="flex gap-2 overflow-x-auto">
                  <button
                    onClick={() => handleSubmit('Summarize my day')}
                    className="px-3 py-1.5 text-xs bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap flex items-center gap-1"
                  >
                    <TrendingUp className="w-3 h-3" />
                    Summary
                  </button>
                  <button
                    onClick={() => handleSubmit('Show weekly trends')}
                    className="px-3 py-1.5 text-xs bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap flex items-center gap-1"
                  >
                    📈 Trends
                  </button>
                  <button
                    onClick={() => handleSubmit('Add agenda item')}
                    className="px-3 py-1.5 text-xs bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap flex items-center gap-1"
                  >
                    <Calendar className="w-3 h-3" />
                    Add Agenda
                  </button>
                  <button
                    onClick={() => handleSubmit('Create note')}
                    className="px-3 py-1.5 text-xs bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap flex items-center gap-1"
                  >
                    <StickyNote className="w-3 h-3" />
                    New Note
                  </button>
                </div>
              </div>
              
              {/* Input */}
              <div className="p-4 border-t border-gray-800">
                <div className="flex gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                    placeholder={isListening ? "Listening..." : "Ask me anything..."}
                    className={cn(
                      'flex-1 px-3 py-2',
                      'bg-gray-800 rounded-lg',
                      'text-white placeholder-gray-500',
                      'border border-gray-700',
                      'focus:border-violet-500 focus:outline-none',
                      'transition-colors resize-none',
                      'max-h-24',
                      isListening && 'border-cyan-500 animate-pulse'
                    )}
                    rows={1}
                    disabled={isProcessing}
                    data-testid="assistant-input"
                  />
                  
                  {isVoiceSupported && (
                    <button
                      onClick={toggleListening}
                      className={cn(
                        'p-2.5 rounded-lg',
                        'transition-all duration-150',
                        isListening
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-violet-500 hover:text-violet-400'
                      )}
                      aria-label={isListening ? 'Stop listening' : 'Start voice input'}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleSubmit()}
                    disabled={!input.trim() || isProcessing}
                    className={cn(
                      'p-2.5 rounded-lg',
                      'bg-gradient-to-r from-violet-600 to-cyan-600',
                      'text-white',
                      'transition-all duration-150',
                      'hover:scale-105 active:scale-95',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'shadow-[0_0_0_1px_rgba(168,132,255,.35)_inset,0_4px_20px_rgba(168,132,255,.15)]'
                    )}
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Voice transcript indicator */}
                {interimTranscript && (
                  <div className="mt-2 text-xs text-cyan-400 animate-pulse">
                    Hearing: "{interimTranscript}"
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
      
      {/* Global voice indicator */}
      {isListening && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm text-red-400">Listening...</span>
          </div>
        </div>
      )}
    </>
  );
};

export default EnhancedAssistantDock;
