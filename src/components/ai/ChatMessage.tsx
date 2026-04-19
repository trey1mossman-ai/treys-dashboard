// @ts-nocheck
'use client';

import type { Message } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-plasma text-white rounded-br-md'
            : 'bg-bg-secondary text-text-primary rounded-bl-md'
        }`}
      >
        {message.content && (
          isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <div className="break-words">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                  li: ({ children }) => <li className="mb-0.5">{children}</li>,
                  table: ({ children }) => <div className="overflow-x-auto my-2"><table className="w-full border-collapse">{children}</table></div>,
                  thead: ({ children }) => <thead className="border-b border-border-default">{children}</thead>,
                  th: ({ children }) => <th className="text-left px-2 py-1 font-medium text-xs">{children}</th>,
                  td: ({ children }) => <td className="px-2 py-1 border-t border-border-subtle">{children}</td>,
                  code: ({ children }) => <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>,
                  a: ({ children, href }) => <a href={href} className="text-plasma underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )
        )}

        {/* Tool invocations */}
        {message.toolInvocations?.map((invocation) => (
          <div
            key={invocation.toolCallId}
            className="mt-2 p-3 bg-bg-tertiary rounded-lg border border-border-subtle"
          >
            <div className="text-xs font-medium text-text-tertiary mb-1">
              {formatToolName(invocation.toolName)}
            </div>
            {invocation.state === 'result' && (
              <div className="text-xs text-text-secondary">
                <pre className="whitespace-pre-wrap overflow-hidden">
                  {JSON.stringify(invocation.result, null, 2).slice(0, 500)}
                </pre>
              </div>
            )}
            {invocation.state === 'call' && (
              <div className="text-xs text-text-tertiary italic">
                Running...
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatToolName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
