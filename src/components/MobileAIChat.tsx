import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Mic, Send, X, Loader2, Bot } from 'lucide-react';
import { ChatInterface } from './ChatInterface';
import { cn } from '@/lib/utils';
import { aiService } from '@/lib/ai/ai-service';

interface MobileAIChatProps {
  className?: string;
}

export function MobileAIChat({ className }: MobileAIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [quickInput, setQuickInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [hasRealtime, setHasRealtime] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check for realtime support
  useEffect(() => {
    checkRealtimeSupport();
  }, []);

  const checkRealtimeSupport = async () => {
    try {
      const session = await aiService.getRealtimeSession();
      if (session.success) {
        setHasRealtime(true);
      }
    } catch {
      // Realtime not available
    }
  };

  // Handle voice input
  const handleVoiceInput = async () => {
    if (!hasRealtime) {
      // Fall back to speech recognition API
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setQuickInput(transcript);
          handleQuickSend(transcript);
        };
        
        recognition.onerror = () => {
          setIsListening(false);
        };
        
        recognition.start();
      }
    } else {
      // Use OpenAI Realtime
      try {
        const session = await aiService.getRealtimeSession();
        // Initialize WebRTC or WebSocket connection
        // This would require additional implementation for real-time audio streaming
        console.log('Realtime session:', session);
      } catch (error) {
        console.error('Realtime error:', error);
      }
    }
  };

  // Handle quick send
  const handleQuickSend = async (text?: string) => {
    const message = text || quickInput;
    if (!message.trim()) return;
    
    setQuickInput('');
    setIsOpen(true);
    setIsMinimized(false);
    
    // Send message through chat interface
    window.dispatchEvent(new CustomEvent('ai-chat-prefill', {
      detail: { message }
    }));
  };

  // Mobile-optimized chat container
  if (isOpen && !isMinimized) {
    return (
      <div className={cn(
        "fixed inset-0 z-50 bg-white dark:bg-gray-900",
        "flex flex-col",
        "lg:relative lg:inset-auto lg:h-full",
        className
      )}>
        {/* Mobile header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 lg:hidden">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-500" />
            <span className="font-semibold">AI Assistant</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Minimize"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Chat interface */}
        <div className="flex-1 overflow-hidden">
          <ChatInterface 
            className="h-full"
            systemPrompt="You are a mobile-first AI assistant. Keep responses concise and actionable. Optimize for small screens."
          />
        </div>
      </div>
    );
  }

  // Minimized state - floating bar at bottom
  if (isOpen && isMinimized) {
    return (
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
        "bg-white dark:bg-gray-900 border-t dark:border-gray-700",
        "p-safe pb-safe", // Safe area padding for iOS
        "lg:hidden"
      )}>
        <div className="p-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(false)}
              className="p-2 rounded-lg bg-blue-500 text-white"
              aria-label="Expand chat"
            >
              <Bot className="w-5 h-5" />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleQuickSend();
                }
              }}
              placeholder="Quick message..."
              className={cn(
                "flex-1 px-3 py-2 rounded-lg",
                "bg-gray-100 dark:bg-gray-800",
                "focus:outline-none focus:ring-2 focus:ring-blue-500",
                "min-h-[44px]" // iOS touch target
              )}
            />
            {hasRealtime && (
              <button
                onClick={handleVoiceInput}
                disabled={isListening}
                className={cn(
                  "p-2 rounded-lg",
                  "bg-gray-100 dark:bg-gray-800",
                  "hover:bg-gray-200 dark:hover:bg-gray-700",
                  "min-w-[44px] min-h-[44px]",
                  isListening && "bg-red-500 text-white animate-pulse"
                )}
                aria-label="Voice input"
              >
                {isListening ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>
            )}
            <button
              onClick={() => handleQuickSend()}
              disabled={!quickInput.trim()}
              className={cn(
                "p-2 rounded-lg",
                "bg-blue-500 text-white",
                "disabled:opacity-50",
                "min-w-[44px] min-h-[44px]"
              )}
              aria-label="Send"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Floating action button
  return (
    <button
      onClick={() => {
        setIsOpen(true);
        setIsMinimized(false);
      }}
      className={cn(
        "fixed bottom-6 right-6 z-40",
        "w-14 h-14 rounded-full",
        "bg-blue-500 hover:bg-blue-600 text-white",
        "shadow-lg hover:shadow-xl transition-all",
        "flex items-center justify-center",
        "lg:hidden", // Hide on desktop
        className
      )}
      aria-label="Open AI Assistant"
    >
      <Bot className="w-6 h-6" />
    </button>
  );
}