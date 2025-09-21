// Streaming Response Component - Day 5
// Team Lead: Claude
// Provides typing indicator and smooth text streaming

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface StreamingResponseProps {
  text: string;
  isStreaming: boolean;
  className?: string;
  typingSpeed?: number;
}

export const StreamingResponse: React.FC<StreamingResponseProps> = ({
  text,
  isStreaming,
  className,
  typingSpeed = 30
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  
  useEffect(() => {
    if (!text) {
      setDisplayedText('');
      return;
    }
    
    if (!isStreaming) {
      // Show full text immediately when not streaming
      setDisplayedText(text);
      setShowCursor(false);
      return;
    }
    
    // Streaming mode - show text character by character
    let currentIndex = displayedText.length;
    
    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(interval);
        setShowCursor(false);
      }
    }, typingSpeed);
    
    return () => clearInterval(interval);
  }, [text, isStreaming, typingSpeed]);
  
  // Cursor blink animation
  useEffect(() => {
    if (!showCursor) return;
    
    const interval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);
    
    return () => clearInterval(interval);
  }, [showCursor]);
  
  return (
    <div className={cn('relative', className)}>
      {displayedText}
      {isStreaming && (
        <span 
          className={cn(
            'inline-block w-[2px] h-4 ml-1',
            'bg-cyan-400',
            'transition-opacity duration-100',
            showCursor ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            animation: 'pulse 1s ease-in-out infinite'
          }}
        />
      )}
      
      {isStreaming && displayedText.length === 0 && (
        <TypingIndicator />
      )}
    </div>
  );
};

// Typing indicator component
const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-center gap-1">
      <span className="text-gray-500 text-sm">Assistant is typing</span>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block w-2 h-2 rounded-full bg-cyan-400/60"
            style={{
              animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite`
            }}
          />
        ))}
      </div>
      
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.6;
          }
          30% {
            transform: translateY(-4px);
            opacity: 1;
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
};

// Hook for streaming responses from API
export const useStreamingResponse = (
  endpoint: string,
  prompt: string,
  enabled: boolean = true
) => {
  const [response, setResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!enabled || !prompt) return;
    
    const abortController = new AbortController();
    
    const startStreaming = async () => {
      setIsStreaming(true);
      setError(null);
      setResponse('');
      
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt }),
          signal: abortController.signal
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (!reader) {
          throw new Error('No response body');
        }
        
        let accumulated = '';
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          setResponse(accumulated);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(String(err));
        }
      } finally {
        setIsStreaming(false);
      }
    };
    
    startStreaming();
    
    return () => {
      abortController.abort();
    };
  }, [endpoint, prompt, enabled]);
  
  return { response, isStreaming, error };
};

export default StreamingResponse;
