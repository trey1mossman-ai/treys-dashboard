import React, { useState, useCallback } from 'react';
import { 
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { 
  Search, 
  MessageSquare, 
  Calendar, 
  CheckSquare, 
  Mail, 
  Phone,
  Brain,
  Sparkles,
  FileText,
  Loader2
} from 'lucide-react';
import { aiService } from '@/lib/ai/ai-service';
import { toast } from 'sonner';

interface AICommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChatOpen?: () => void;
}

type CommandAction = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'ai' | 'task' | 'communication' | 'knowledge' | 'system';
  action: () => void | Promise<void>;
  aiPrompt?: string;
};

export function AICommandPalette({ 
  open, 
  onOpenChange,
  onChatOpen 
}: AICommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Natural language processing for commands
  const processNaturalLanguage = useCallback(async (input: string) => {
    if (input.length < 3) return;
    
    setIsProcessing(true);
    try {
      // Quick AI interpretation without tools
      const response = await aiService.send(
        `Interpret this command and suggest the appropriate action: "${input}". 
         Respond with ONLY the action name from: create_task, send_message, schedule_meeting, search_knowledge, open_chat`,
        { stream: false }
      );
      
      // Parse AI response and trigger appropriate action
      const action = response.trim().toLowerCase();
      
      switch (action) {
        case 'create_task':
          await handleCreateTask(input);
          break;
        case 'send_message':
          await handleSendMessage(input);
          break;
        case 'schedule_meeting':
          await handleScheduleMeeting(input);
          break;
        case 'search_knowledge':
          await handleSearchKnowledge(input);
          break;
        case 'open_chat':
          onChatOpen?.();
          onOpenChange(false);
          break;
        default:
          // Fallback to general AI chat
          onChatOpen?.();
          onOpenChange(false);
      }
    } catch (error) {
      console.error('Natural language processing error:', error);
      toast.error('Failed to process command');
    } finally {
      setIsProcessing(false);
    }
  }, [onChatOpen, onOpenChange]);

  // Command actions
  const handleCreateTask = async (input: string) => {
    setIsProcessing(true);
    try {
      const result = await aiService.executeServerTool('create_task', {
        title: input.replace(/^(create task|add task|new task)/i, '').trim(),
        when: new Date().toISOString()
      });
      
      toast.success('Task created', {
        description: result.message
      });
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to create task');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async (input: string) => {
    // Parse the input for channel and recipient
    const emailMatch = input.match(/email\s+(.+?)\s+about\s+(.+)/i);
    const smsMatch = input.match(/sms\s+(.+?)\s+saying\s+(.+)/i);
    
    if (emailMatch) {
      setIsProcessing(true);
      try {
        const result = await aiService.executeServerTool('send_message', {
          channel: 'email',
          to: emailMatch[1],
          body: emailMatch[2],
          subject: 'Quick message'
        });
        
        toast.success('Email sent', { description: result.message });
        onOpenChange(false);
      } catch (error) {
        toast.error('Failed to send email');
      } finally {
        setIsProcessing(false);
      }
    } else if (smsMatch) {
      setIsProcessing(true);
      try {
        const result = await aiService.executeServerTool('send_message', {
          channel: 'sms',
          to: smsMatch[1],
          body: smsMatch[2]
        });
        
        toast.success('SMS sent', { description: result.message });
        onOpenChange(false);
      } catch (error) {
        toast.error('Failed to send SMS');
      } finally {
        setIsProcessing(false);
      }
    } else {
      toast.error('Please specify recipient and message');
    }
  };

  const handleScheduleMeeting = async (input: string) => {
    // Open chat with pre-filled context
    onChatOpen?.();
    onOpenChange(false);
    
    // Send the scheduling request to chat
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('ai-chat-prefill', {
        detail: { message: `Schedule a meeting: ${input}` }
      }));
    }, 100);
  };

  const handleSearchKnowledge = async (query: string) => {
    setIsProcessing(true);
    try {
      const result = await aiService.searchKnowledge(
        query.replace(/^(search|find|look for)/i, '').trim()
      );
      
      if (result.passages && result.passages.length > 0) {
        // Show results in chat
        onChatOpen?.();
        onOpenChange(false);
        
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('ai-chat-results', {
            detail: { 
              message: `Found ${result.passages.length} relevant results`,
              passages: result.passages 
            }
          }));
        }, 100);
      } else {
        toast.info('No results found');
      }
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Predefined command actions
  const commands: CommandAction[] = [
    // AI Commands
    {
      id: 'open-chat',
      title: 'Open AI Chat',
      description: 'Start a conversation with AI assistant',
      icon: MessageSquare,
      category: 'ai',
      action: () => {
        onChatOpen?.();
        onOpenChange(false);
      }
    },
    {
      id: 'analyze-day',
      title: 'Analyze My Day',
      description: 'Get AI insights about your schedule',
      icon: Brain,
      category: 'ai',
      action: async () => {
        onChatOpen?.();
        onOpenChange(false);
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('ai-chat-prefill', {
            detail: { message: 'Analyze my day and provide insights' }
          }));
        }, 100);
      }
    },
    {
      id: 'suggest-tasks',
      title: 'Suggest Tasks',
      description: 'Get AI task recommendations',
      icon: Sparkles,
      category: 'ai',
      action: async () => {
        onChatOpen?.();
        onOpenChange(false);
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('ai-chat-prefill', {
            detail: { message: 'Suggest tasks based on my goals and schedule' }
          }));
        }, 100);
      }
    },
    
    // Task Commands
    {
      id: 'create-task',
      title: 'Create Task',
      description: 'Add a new task to your list',
      icon: CheckSquare,
      category: 'task',
      action: () => {
        window.dispatchEvent(new CustomEvent('open-task-dialog'));
        onOpenChange(false);
      }
    },
    {
      id: 'schedule-meeting',
      title: 'Schedule Meeting',
      description: 'Find time and create a meeting',
      icon: Calendar,
      category: 'task',
      action: () => {
        onChatOpen?.();
        onOpenChange(false);
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('ai-chat-prefill', {
            detail: { message: 'Help me schedule a meeting' }
          }));
        }, 100);
      }
    },
    
    // Communication Commands
    {
      id: 'draft-email',
      title: 'Draft Email',
      description: 'AI helps draft an email',
      icon: Mail,
      category: 'communication',
      action: () => {
        onChatOpen?.();
        onOpenChange(false);
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('ai-chat-prefill', {
            detail: { message: 'Help me draft an email' }
          }));
        }, 100);
      }
    },
    {
      id: 'send-sms',
      title: 'Send SMS',
      description: 'Quick SMS via AI',
      icon: Phone,
      category: 'communication',
      action: () => {
        onChatOpen?.();
        onOpenChange(false);
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('ai-chat-prefill', {
            detail: { message: 'Send an SMS message' }
          }));
        }, 100);
      }
    },
    
    // Knowledge Commands
    {
      id: 'search-knowledge',
      title: 'Search Knowledge Base',
      description: 'Search your documents and notes',
      icon: Search,
      category: 'knowledge',
      action: () => {
        const query = prompt('What would you like to search for?');
        if (query) {
          handleSearchKnowledge(query);
        }
      }
    },
    {
      id: 'add-note',
      title: 'Add to Knowledge Base',
      description: 'Store information for later',
      icon: FileText,
      category: 'knowledge',
      action: () => {
        window.dispatchEvent(new CustomEvent('open-note-dialog'));
        onOpenChange(false);
      }
    }
  ];

  // Filter commands based on search
  const filteredCommands = commands.filter(cmd => 
    cmd.title.toLowerCase().includes(search.toLowerCase()) ||
    cmd.description.toLowerCase().includes(search.toLowerCase())
  );

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, CommandAction[]>);

  // Handle command selection
  const handleSelect = async (command: CommandAction) => {
    await command.action();
  };

  // Handle Enter key for natural language
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && search && filteredCommands.length === 0) {
      e.preventDefault();
      processNaturalLanguage(search);
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command className="rounded-lg border shadow-md mx-4 md:mx-0 max-h-[90vh] md:max-h-none overflow-hidden">
        <CommandInput 
          placeholder="Type a command or describe what you want to do..." 
          value={search}
          onValueChange={setSearch}
          onKeyDown={handleKeyDown}
          className="h-14 md:h-12 text-base px-4"
        />
        
        <CommandList className="max-h-[70vh] md:max-h-[400px] overflow-y-auto">
          {isProcessing ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
              <span className="ml-2 text-base md:text-sm text-gray-500">Processing...</span>
            </div>
          ) : filteredCommands.length === 0 && search ? (
            <CommandEmpty>
              <div className="text-center py-8 px-4">
                <p className="text-base md:text-sm text-gray-500">No commands found</p>
                <p className="text-sm md:text-xs text-gray-400 mt-2">
                  Press Enter to use AI to interpret "{search}"
                </p>
              </div>
            </CommandEmpty>
          ) : (
            <>
              {Object.entries(groupedCommands).map(([category, cmds]) => (
                <CommandGroup 
                  key={category} 
                  heading={category.charAt(0).toUpperCase() + category.slice(1)}
                >
                  {cmds.map((cmd) => (
                    <CommandItem
                      key={cmd.id}
                      onSelect={() => handleSelect(cmd)}
                      className="flex items-center gap-3 px-4 py-4 md:py-3 cursor-pointer min-h-[60px] md:min-h-auto active:bg-gray-100 dark:active:bg-gray-800"
                    >
                      <cmd.icon className="w-6 h-6 md:w-5 md:h-5 text-gray-500" />
                      <div className="flex-1">
                        <div className="font-medium text-base md:text-sm">{cmd.title}</div>
                        <div className="text-sm md:text-xs text-gray-500">{cmd.description}</div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </>
          )}
          
          {search && (
            <>
              <CommandSeparator />
              <CommandGroup heading="AI Suggestions">
                <CommandItem
                  onSelect={() => processNaturalLanguage(search)}
                  className="flex items-center gap-3 px-4 py-4 md:py-3 cursor-pointer min-h-[60px] md:min-h-auto active:bg-blue-50 dark:active:bg-blue-900/20"
                >
                  <Sparkles className="w-6 h-6 md:w-5 md:h-5 text-blue-500" />
                  <div className="flex-1">
                    <div className="font-medium text-base md:text-sm">Use AI to interpret</div>
                    <div className="text-sm md:text-xs text-gray-500">"{search}"</div>
                  </div>
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}