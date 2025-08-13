import { useState, useRef, useEffect } from 'react';
import { Send, Bot, Loader2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  error?: boolean;
}

// System prompt to give the AI context about the app
const SYSTEM_PROMPT = `You are an AI assistant for an Agenda/Task management app. You can help users:

1. Manage their daily agenda items (add, edit, delete, complete tasks)
2. Create and manage quick notes
3. Track fitness goals (workouts and meals)
4. Set up automations and webhooks
5. Analyze their productivity and provide insights

When users ask you to perform actions, analyze their intent and provide helpful responses. You can suggest specific actions they can take in the app.

Current capabilities:
- Add agenda items with specific times
- Create quick notes with tags
- Log workouts and meals
- View and analyze daily progress
- Set up quick action automations

Be conversational and helpful. If you're asked to do something, explain what the user needs to do in the app to accomplish it.`;

export function AIAssistant() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: SYSTEM_PROMPT
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message to chat
    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      // Check if API keys are configured
      const openaiKey = localStorage.getItem('api_openai');
      const anthropicKey = localStorage.getItem('api_anthropic');
      
      if (!openaiKey && !anthropicKey) {
        const errorMessage: Message = {
          role: 'assistant',
          content: 'Please configure your OpenAI or Anthropic API key in Settings to enable AI chat.',
          timestamp: new Date(),
          error: true
        };
        setMessages(prev => [...prev, errorMessage]);
        setIsLoading(false);
        return;
      }

      // Prepare messages for API (include conversation history for context)
      const apiMessages = messages
        .filter(m => m.role !== 'system') // Remove system messages for display
        .concat(newUserMessage)
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      // Add system prompt at the beginning for API
      const fullMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...apiMessages
      ];

      // Make API request
      const response = await fetch('/api/agent/relay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(openaiKey && { 'X-OpenAI-Key': openaiKey }),
          ...(anthropicKey && { 'X-Anthropic-Key': anthropicKey }),
          'X-Model-Provider': anthropicKey ? 'anthropic' : 'openai',
          'X-Model-Name': anthropicKey ? 'claude-3-haiku-20240307' : 'gpt-3.5-turbo'
        },
        body: JSON.stringify({ messages: fullMessages })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Add assistant response to chat
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.content,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);

      // Check if the AI suggested any actions we can help with
      if (data.content.toLowerCase().includes('add') && data.content.toLowerCase().includes('agenda')) {
        toast({
          title: 'Tip',
          description: 'You can add agenda items using the "Add Item" button in the Dashboard.',
        });
      } else if (data.content.toLowerCase().includes('note')) {
        toast({
          title: 'Tip', 
          description: 'Create notes using the "New Note" button in the Dashboard.',
        });
      }

    } catch (error) {
      console.error('AI chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please check your API configuration in Settings and try again.',
        timestamp: new Date(),
        error: true
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: 'Error',
        description: 'Failed to get AI response. Please check your API settings.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Filter out system messages for display
  const displayMessages = messages.filter(m => m.role !== 'system');

  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          AI Assistant
        </h3>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {displayMessages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">AI Assistant Ready</p>
              <p className="text-sm mt-2">Ask me anything about your agenda, tasks, or productivity!</p>
              <div className="mt-4 text-left max-w-md mx-auto">
                <p className="text-sm font-medium mb-2">Try asking:</p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• "What should I focus on today?"</li>
                  <li>• "Help me plan my morning routine"</li>
                  <li>• "How can I be more productive?"</li>
                  <li>• "Analyze my daily schedule"</li>
                </ul>
              </div>
            </div>
          ) : (
            displayMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : msg.error
                      ? 'bg-destructive/10 text-destructive border border-destructive/20'
                      : 'bg-muted'
                  }`}
                >
                  {msg.error && (
                    <AlertCircle className="w-4 h-4 inline-block mr-2" />
                  )}
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {msg.timestamp && (
                    <div className="text-xs opacity-70 mt-1">
                      {msg.timestamp.toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={sendMessage} 
            disabled={isLoading || !input.trim()}
            className="hover-glow"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
