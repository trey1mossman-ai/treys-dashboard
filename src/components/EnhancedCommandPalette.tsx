// Enhanced Command Palette - ⌘K/Ctrl+K with slash intents
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useDashboardStore, useCurrentDayAgenda } from '../stores/dashboardStore';
import { Search, Calendar, Plus, Zap, ArrowRight, Hash } from 'lucide-react';

interface CommandPaletteProps {
  className?: string;
}

interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  action: () => Promise<void> | void;
  keywords: string[];
  category: 'navigation' | 'actions' | 'quick_add' | 'search';
}

interface SlashIntent {
  trigger: string;
  description: string;
  placeholder: string;
  icon: React.ReactNode;
  handler: (params: string) => Promise<void>;
}

export function EnhancedCommandPalette({ className }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
  const { actions, ui } = useDashboardStore();
  const agendaItems = useCurrentDayAgenda();

  // Hotkey listener for ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Slash intents
  const slashIntents: SlashIntent[] = useMemo(() => [
    {
      trigger: '/task',
      description: 'Add a new task',
      placeholder: '/task "Review reports" 2pm',
      icon: <Plus className="w-4 h-4" />,
      handler: async (params) => {
        const match = params.match(/"([^"]+)"(?:\s+(.+))?/);
        if (match) {
          const [, title, time] = match;
          await actions.triggerBabyAgent('add_task', {
            title: title.trim(),
            time: time?.trim(),
            source: 'command_palette'
          });
        }
      }
    },
    {
      trigger: '/block',
      description: 'Add a time block',
      placeholder: '/block "Deep Work" 14:00-16:00',
      icon: <Calendar className="w-4 h-4" />,
      handler: async (params) => {
        const match = params.match(/"([^"]+)"(?:\s+(.+))?/);
        if (match) {
          const [, title, timeRange] = match;
          await actions.triggerBabyAgent('add_time_block', {
            title: title.trim(),
            time_range: timeRange?.trim(),
            source: 'command_palette'
          });
        }
      }
    },
    {
      trigger: '/meal',
      description: 'Log a meal',
      placeholder: '/meal "chicken" 700kcal 45P 90C 15F',
      icon: <Hash className="w-4 h-4" />,
      handler: async (params) => {
        await actions.triggerBabyAgent('log_meal', {
          description: params.trim(),
          source: 'command_palette'
        });
      }
    },
    {
      trigger: '/supp',
      description: 'Log supplement',
      placeholder: '/supp "Mag Glycinate" 400mg AM',
      icon: <Plus className="w-4 h-4" />,
      handler: async (params) => {
        await actions.triggerBabyAgent('log_supplement', {
          description: params.trim(),
          source: 'command_palette'
        });
      }
    },
    {
      trigger: '/book',
      description: 'Book appointment',
      placeholder: '/book haircut Fri 2-6pm',
      icon: <Calendar className="w-4 h-4" />,
      handler: async (params) => {
        await actions.triggerBabyAgent('book_appointment', {
          description: params.trim(),
          source: 'command_palette'
        });
      }
    },
    {
      trigger: '/reorder',
      description: 'Reorder inventory item',
      placeholder: '/reorder "Mag Glycinate"',
      icon: <Zap className="w-4 h-4" />,
      handler: async (params) => {
        const itemName = params.replace(/"/g, '').trim();
        await actions.triggerBabyAgent('reorder_inventory', {
          item_name: itemName,
          source: 'command_palette'
        });
      }
    }
  ], [actions]);

  // Generate commands
  const commands: Command[] = useMemo(() => {
    const baseCommands: Command[] = [
      {
        id: 'nav_today',
        label: 'Go to Today',
        description: 'View today\'s agenda',
        icon: <Calendar className="w-4 h-4" />,
        action: () => actions.setViewMode('today'),
        keywords: ['today', 'agenda', 'schedule'],
        category: 'navigation'
      },
      {
        id: 'nav_preview',
        label: 'Go to Preview',
        description: 'View preview panel',
        icon: <Search className="w-4 h-4" />,
        action: () => actions.setViewMode('preview'),
        keywords: ['preview', 'detail', 'view'],
        category: 'navigation'
      },
      {
        id: 'nav_meta',
        label: 'Go to Meta',
        description: 'View telemetry and inventory',
        icon: <Hash className="w-4 h-4" />,
        action: () => actions.setViewMode('meta'),
        keywords: ['meta', 'telemetry', 'inventory', 'stats'],
        category: 'navigation'
      },
      {
        id: 'jump_to_now',
        label: 'Jump to Now',
        description: 'Scroll to current time block',
        icon: <ArrowRight className="w-4 h-4" />,
        action: () => {
          actions.updateNow();
          // Logic to scroll to current time would go here
        },
        keywords: ['now', 'current', 'jump', 'time'],
        category: 'navigation'
      }
    ];

    // Add agenda item commands
    const agendaCommands: Command[] = agendaItems
      .filter(item => item.status === 'pending')
      .map(item => ({
        id: `complete_${item.id}`,
        label: `Complete: ${item.title}`,
        description: `Mark "${item.title}" as complete`,
        icon: <Plus className="w-4 h-4" />,
        action: () => actions.markComplete(item.id, item.source),
        keywords: ['complete', 'done', item.title.toLowerCase()],
        category: 'actions' as const
      }));

    return [...baseCommands, ...agendaCommands];
  }, [actions, agendaItems]);

  // Handle slash intents or regular search
  const isSlashIntent = query.startsWith('/');
  const activeIntent = isSlashIntent ? slashIntents.find(intent => 
    query.toLowerCase().startsWith(intent.trigger.toLowerCase())
  ) : null;

  // Filter commands or show slash intents
  const filteredResults = useMemo(() => {
    if (isSlashIntent) {
      if (activeIntent) {
        return [{
          id: 'slash_intent',
          label: activeIntent.trigger,
          description: activeIntent.placeholder,
          icon: activeIntent.icon,
          category: 'quick_add' as const
        }];
      } else {
        return slashIntents
          .filter(intent => intent.trigger.toLowerCase().includes(query.toLowerCase()))
          .map(intent => ({
            id: `intent_${intent.trigger}`,
            label: intent.trigger,
            description: intent.description,
            icon: intent.icon,
            category: 'quick_add' as const
          }));
      }
    }

    if (!query.trim()) return commands.slice(0, 8);

    return commands.filter(cmd => 
      cmd.label.toLowerCase().includes(query.toLowerCase()) ||
      cmd.keywords.some(keyword => keyword.includes(query.toLowerCase()))
    ).slice(0, 8);
  }, [query, commands, slashIntents, activeIntent, isSlashIntent]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredResults.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          handleExecute();
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredResults, selectedIndex]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredResults]);

  const handleExecute = async () => {
    if (filteredResults.length === 0 || isProcessing) return;

    setIsProcessing(true);
    
    try {
      if (isSlashIntent && activeIntent) {
        const params = query.substring(activeIntent.trigger.length).trim();
        await activeIntent.handler(params);
      } else {
        const selectedCommand = filteredResults[selectedIndex] as Command;
        if (selectedCommand?.action) {
          await selectedCommand.action();
        }
      }
      
      setIsOpen(false);
      setQuery('');
    } catch (error) {
      console.error('Command execution failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Command Palette */}
      <div className="relative bg-gray-900/95 backdrop-blur-lg border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl mx-4">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-gray-700">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands or use / for quick actions..."
            className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none"
          />
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <kbd className="px-2 py-1 bg-gray-800 rounded">↑↓</kbd>
            <kbd className="px-2 py-1 bg-gray-800 rounded">↵</kbd>
          </div>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto">
          {filteredResults.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No commands found</p>
              <p className="text-sm mt-1">Try using / for quick actions</p>
            </div>
          ) : (
            <div className="py-2">
              {filteredResults.map((item, index) => (
                <button
                  key={item.id}
                  onClick={handleExecute}
                  className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                    index === selectedIndex
                      ? 'bg-cyan-500/20 border-l-2 border-cyan-400'
                      : 'hover:bg-gray-800/50'
                  }`}
                >
                  <div className={`flex-shrink-0 ${
                    index === selectedIndex ? 'text-cyan-400' : 'text-gray-400'
                  }`}>
                    {item.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium truncate ${
                      index === selectedIndex ? 'text-white' : 'text-gray-100'
                    }`}>
                      {item.label}
                    </div>
                    {item.description && (
                      <div className="text-sm text-gray-400 truncate mt-0.5">
                        {item.description}
                      </div>
                    )}
                  </div>
                  
                  {index === selectedIndex && (
                    <ArrowRight className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-700 text-xs text-gray-500 flex items-center justify-between">
          <div>
            Try: <span className="text-cyan-400">/task</span>, <span className="text-cyan-400">/meal</span>, <span className="text-cyan-400">/book</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded">⌘K</kbd>
            <span>to toggle</span>
          </div>
        </div>
        
        {isProcessing && (
          <div className="absolute inset-0 bg-gray-900/80 rounded-2xl flex items-center justify-center">
            <div className="flex items-center gap-2 text-cyan-400">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.1s]" />
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="ml-2 text-sm">Processing...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}