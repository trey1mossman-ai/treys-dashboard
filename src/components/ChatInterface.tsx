import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, Wrench, Check, X } from 'lucide-react';
import { aiService, type Message, type StreamEvent, type ToolCall } from '@/lib/ai/ai-service';
import { cn } from '@/lib/utils';

interface ChatInterfaceProps {
  className?: string;
  onToolExecution?: (tool: ToolCall) => Promise<any>;
  systemPrompt?: string;
}

interface ChatMessage extends Message {
  id: string;
  timestamp: Date;
  isStreaming?: boolean;
  toolStatus?: 'pending' | 'executing' | 'success' | 'error';
  toolResults?: any[];
}

export function ChatInterface({ 
  className, 
  onToolExecution,
  systemPrompt 
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Handle sending message
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setStreamingContent('');

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      await aiService.send(userMessage.content, {
        system: systemPrompt,
        stream: true,
        onStream: (event: StreamEvent) => {
          switch (event.type) {
            case 'content':
              setStreamingContent(prev => prev + (event.content || ''));
              break;
            
            case 'tool_call':
              if (event.tool_calls) {
                setMessages(prev => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  if (lastMsg.role === 'assistant') {
                    lastMsg.tool_calls = event.tool_calls;
                    lastMsg.toolStatus = 'pending';
                  }
                  return updated;
                });
              }
              break;
            
            case 'done':
              setMessages(prev => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg.role === 'assistant') {
                  lastMsg.content = streamingContent;
                  lastMsg.isStreaming = false;
                }
                return updated;
              });
              setStreamingContent('');
              break;
          }
        },
        onToolCall: async (tool: ToolCall) => {
          // Update tool status to executing
          setMessages(prev => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg.role === 'assistant') {
              lastMsg.toolStatus = 'executing';
            }
            return updated;
          });

          try {
            // Execute tool
            const result = onToolExecution 
              ? await onToolExecution(tool)
              : await aiService.executeServerTool(
                  tool.function.name,
                  JSON.parse(tool.function.arguments)
                );

            // Update tool status to success
            setMessages(prev => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg.role === 'assistant') {
                lastMsg.toolStatus = 'success';
                lastMsg.toolResults = lastMsg.toolResults || [];
                lastMsg.toolResults.push(result);
              }
              return updated;
            });

            return result;
          } catch (error) {
            // Update tool status to error
            setMessages(prev => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg.role === 'assistant') {
                lastMsg.toolStatus = 'error';
              }
              return updated;
            });
            throw error;
          }
        }
      });
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Render tool status chip
  const renderToolStatus = (message: ChatMessage) => {
    if (!message.tool_calls || message.tool_calls.length === 0) return null;

    const statusConfig = {
      pending: { icon: Wrench, color: 'text-yellow-500', text: 'Preparing tools...', animate: false },
      executing: { icon: Loader2, color: 'text-blue-500', text: 'Executing actions...', animate: true },
      success: { icon: Check, color: 'text-green-500', text: 'Actions completed', animate: false },
      error: { icon: X, color: 'text-red-500', text: 'Action failed', animate: false }
    };

    const config = statusConfig[message.toolStatus || 'pending'];
    const Icon = config.icon;

    return (
      <div className="flex items-center gap-2 mt-2">
        <div className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs",
          config.color
        )}>
          <Icon className={cn("w-3 h-3", config.animate && "animate-spin")} />
          <span>{config.text}</span>
        </div>
        {message.tool_calls.map((tool, i) => (
          <span key={i} className="text-xs text-gray-500 dark:text-gray-400">
            {tool.function.name}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Start a conversation with AI</p>
            <p className="text-xs mt-2">I can help with tasks, answer questions, and control your dashboard</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              
              <div className={cn(
                "max-w-[70%] rounded-lg px-4 py-2",
                message.role === 'user' 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-100 dark:bg-gray-800"
              )}>
                <div className="whitespace-pre-wrap break-words">
                  {message.isStreaming ? streamingContent : message.content}
                  {message.isStreaming && (
                    <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
                  )}
                </div>
                {renderToolStatus(message)}
              </div>
              
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t dark:border-gray-700 p-4">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className={cn(
              "flex-1 px-3 py-2 rounded-lg resize-none",
              "bg-gray-100 dark:bg-gray-800",
              "focus:outline-none focus:ring-2 focus:ring-blue-500",
              "min-h-[44px] max-h-32"
            )}
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={cn(
              "px-4 py-2 rounded-lg transition-colors min-w-[44px]",
              "bg-blue-500 hover:bg-blue-600 text-white",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center justify-center"
            )}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}