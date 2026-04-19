'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  status?: 'sending' | 'sent' | 'error';
  timestamp?: Date;
}

export interface ChatMessagesProps {
  loadingIndicator?: React.ReactNode;
  messages: Message[];
  isLoading?: boolean;
  onRetry?: (messageId: string) => void;
  className?: string;
  activeToolLabel?: string;
}

/**
 * iOS 26 Chat Messages
 * 
 * Features:
 * - Refined message bubbles with iOS 22px radius
 * - Subtle shadows for depth
 * - Spring animations on new messages
 * - Smooth scroll behavior
 */
export function ChatMessages({
  messages,
  isLoading = false,
  onRetry,
  className = '',
  loadingIndicator,
  activeToolLabel,
}: ChatMessagesProps): JSX.Element {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const isAutoScrollingRef = useRef(false);

  // Track if user has scrolled up
  const handleScroll = useCallback(() => {
    if (isAutoScrollingRef.current) return;
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsUserScrolledUp(!isAtBottom);
  }, []);

  // Auto-scroll only when at bottom
  useEffect(() => {
    if (!isUserScrolledUp && containerRef.current) {
      isAutoScrollingRef.current = true;
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      setTimeout(() => { isAutoScrollingRef.current = false; }, 50);
    }
  }, [messages, isLoading, isUserScrolledUp]);

  const shouldShowTypingIndicator = isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user';

  return (
    <div
      ref={containerRef}
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
      className={'flex-1 overflow-y-auto px-4 py-6 space-y-3 ' + className}
      onScroll={handleScroll}
      style={{
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
      } as React.CSSProperties}
    >
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id}
          message={message}
          onRetry={onRetry}
          isLatest={index === messages.length - 1}
        />
      ))}

      {shouldShowTypingIndicator && (loadingIndicator || <TypingIndicator toolLabel={activeToolLabel} />)}

      <div ref={messagesEndRef} />
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  onRetry?: (messageId: string) => void;
  isLatest?: boolean;
}

function MessageBubble({ message, onRetry, isLatest }: MessageBubbleProps): JSX.Element {
  const { role, content, status } = message;

  // System message
  if (role === 'system') {
    return (
      <div className="flex justify-center animate-fade-in">
        <div 
          className="max-w-[85%] px-4 py-2 text-[13px] text-text-tertiary text-center rounded-2xl"
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
          }}
        >
          {content}
        </div>
      </div>
    );
  }

  // User message
  if (role === 'user') {
    const isError = status === 'error';
    const isSending = status === 'sending';

    return (
      <div 
        className={`flex justify-end ${isLatest ? 'animate-slide-up' : ''}`}
      >
        <div className="max-w-[85%] flex flex-col items-end gap-1">
          <div
            className="relative transition-all duration-200 ease-spring"
            style={{
              background: isError 
                ? 'linear-gradient(180deg, rgba(239, 68, 68, 0.9) 0%, rgba(220, 53, 53, 0.95) 100%)'
                : 'linear-gradient(180deg, rgba(99, 102, 241, 1) 0%, rgba(79, 82, 221, 1) 100%)',
              borderRadius: '22px',
              borderBottomRightRadius: '6px',
              padding: '10px 16px',
              boxShadow: isSending 
                ? 'none'
                : '0 1px 3px rgba(99, 102, 241, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              opacity: isSending ? 0.7 : 1,
              transform: isSending ? 'scale(0.98)' : 'scale(1)',
            }}
          >
            <p className="text-[15px] leading-[22px] text-white whitespace-pre-wrap break-words">
              {content}
            </p>
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-2 px-1 h-4">
            {isSending && (
              <span className="text-[11px] text-text-tertiary flex items-center gap-1.5 animate-fade-in">
                <span 
                  className="inline-block w-1 h-1 rounded-full"
                  style={{
                    background: 'var(--color-text-tertiary)',
                    animation: 'typingDot 1.4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                  }}
                />
                Sending
              </span>
            )}
            {isError && onRetry && (
              <button
                onClick={() => onRetry(message.id)}
                className="text-[11px] text-nova flex items-center gap-1 active:scale-95 transition-transform duration-150"
              >
                <RefreshCw size={10} />
                Tap to retry
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div
      className={`flex justify-start ${isLatest ? 'animate-slide-up' : ''}`}
    >
      <div className="max-w-[85%]">
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(10px)',
            borderRadius: '22px',
            borderBottomLeftRadius: '6px',
            padding: '10px 16px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04), inset 0 0.5px 0 rgba(255, 255, 255, 0.04)',
          }}
        >
          <div
            className="text-[15px] leading-[22px] break-words"
            style={{ color: 'var(--color-text-primary)' }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                li: ({ children }) => <li className="mb-0.5">{children}</li>,
                table: ({ children }) => <div className="overflow-x-auto my-2"><table className="w-full text-sm border-collapse">{children}</table></div>,
                thead: ({ children }) => <thead className="border-b border-border-default">{children}</thead>,
                th: ({ children }) => <th className="text-left px-2 py-1 text-text-secondary font-medium text-xs">{children}</th>,
                td: ({ children }) => <td className="px-2 py-1 text-text-primary border-t border-border-subtle">{children}</td>,
                code: ({ children, className: codeClassName }) => {
                  const isBlock = codeClassName?.includes('language-');
                  if (isBlock) {
                    return <pre className="bg-bg-tertiary rounded-lg p-3 my-2 overflow-x-auto"><code className="font-mono text-sm">{children}</code></pre>;
                  }
                  return <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>;
                },
                a: ({ children, href }) => <a href={href} className="text-plasma underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                h1: ({ children }) => <h1 className="text-base font-semibold mb-1">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-semibold mb-1">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}

function TypingIndicator({ toolLabel }: { toolLabel?: string }): JSX.Element {
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="max-w-[85%]">
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(10px)',
            borderRadius: '22px',
            borderBottomLeftRadius: '6px',
            padding: '12px 18px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04), inset 0 0.5px 0 rgba(255, 255, 255, 0.04)',
          }}
        >
          {toolLabel ? (
            <p className="text-[13px] text-text-secondary animate-pulse">{toolLabel}</p>
          ) : (
            <div className="flex items-center gap-[5px]">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-[7px] h-[7px] rounded-full"
                  style={{
                    background: 'var(--color-text-tertiary)',
                    animation: 'typingDot 1.4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
