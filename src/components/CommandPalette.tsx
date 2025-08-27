import { useState, useEffect, useRef } from 'react';
import { Search, Command, Calendar, CheckSquare, Apple, Package, BookOpen, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import '../styles/tokens.css';

interface CommandItem {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  action: () => void;
  category: 'quick' | 'add' | 'view' | 'system';
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Command definitions
  const commands: CommandItem[] = [
    // Quick Actions
    {
      id: 'summarize',
      label: 'Summarize Today',
      description: 'Get AI summary of today\'s agenda and progress',
      icon: BookOpen,
      shortcut: '/summarize',
      action: () => handleCommand('/summarize today'),
      category: 'quick'
    },
    {
      id: 'jump-now',
      label: 'Jump to Now',
      description: 'Scroll to current time block',
      icon: Calendar,
      action: () => window.dispatchEvent(new CustomEvent('jumpToNow')),
      category: 'quick'
    },
    
    // Add Items
    {
      id: 'add-task',
      label: 'Add Task',
      description: 'Add a new task to today',
      icon: CheckSquare,
      shortcut: '/task',
      action: () => handleCommand('/add task'),
      category: 'add'
    },
    {
      id: 'add-meal',
      label: 'Log Meal',
      description: 'Track nutrition for a meal',
      icon: Apple,
      shortcut: '/meal',
      action: () => handleCommand('/meal'),
      category: 'add'
    },
    {
      id: 'add-supplement',
      label: 'Log Supplement',
      description: 'Track supplement intake',
      icon: Package,
      shortcut: '/supp',
      action: () => handleCommand('/supp'),
      category: 'add'
    },
    
    // System
    {
      id: 'reload',
      label: 'Reload Data',
      description: 'Refresh all data from agents',
      icon: RotateCcw,
      action: () => {
        window.location.reload();
      },
      category: 'system'
    }
  ];

  // Parse slash commands
  const handleCommand = async (command: string) => {
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1).join(' ');

    // Basic slash command parsing
    if (cmd === '/summarize') {
      dispatchAICommand('summarize', { target: args || 'today' });
    } else if (cmd === '/add' && parts[1] === 'task') {
      const match = args.match(/"([^"]+)"(?:\s+(\d{1,2}(?:am|pm)))?/);
      if (match) {
        dispatchAICommand('add_task', { 
          title: match[1], 
          time: match[2] || null 
        });
      }
    } else if (cmd === '/meal') {
      const match = args.match(/"([^"]+)"(?:\s+(\d+)kcal)?(?:\s+(\d+)P)?(?:\s+(\d+)C)?(?:\s+(\d+)F)?/);
      if (match) {
        dispatchAICommand('add_meal', {
          name: match[1],
          calories: match[2] || 0,
          protein: match[3] || 0,
          carbs: match[4] || 0,
          fat: match[5] || 0
        });
      }
    } else if (cmd === '/supp') {
      const match = args.match(/"([^"]+)"(?:\s+(\d+)mg)?(?:\s+(AM|PM|Pre|Post))?/);
      if (match) {
        dispatchAICommand('add_supplement', {
          name: match[1],
          dose: match[2] || '',
          time: match[3] || 'AM'
        });
      }
    } else if (cmd === '/book') {
      dispatchAICommand('book_appointment', { description: args });
    } else if (cmd === '/reorder') {
      const item = args.replace(/"/g, '');
      dispatchAICommand('queue_reorder', { item });
    }

    setIsOpen(false);
    setQuery('');
  };

  const dispatchAICommand = (type: string, params: any) => {
    window.dispatchEvent(new CustomEvent('ai-command', {
      detail: { type, params }
    }));
    
    // Show toast notification
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { 
        title: 'Command Executed',
        description: `${type} processed`,
        variant: 'success'
      }
    }));
  };

  // Filter commands based on query
  const filteredCommands = commands.filter(cmd => {
    const searchStr = query.toLowerCase();
    return cmd.label.toLowerCase().includes(searchStr) ||
           cmd.description.toLowerCase().includes(searchStr) ||
           cmd.shortcut?.toLowerCase().includes(searchStr);
  });

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open with Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(!isOpen);
        if (!isOpen) {
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      }

      if (!isOpen) return;

      // Navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (query.startsWith('/')) {
          handleCommand(query);
        } else if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          setIsOpen(false);
          setQuery('');
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, query]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[var(--z-command)]"
        onClick={() => setIsOpen(false)}
      />

      {/* Command Palette */}
      <div 
        ref={containerRef}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                   w-full max-w-2xl bg-panel-bg rounded-[var(--radius-modal)]
                   shadow-2xl border border-border-default z-[var(--z-command)]
                   overflow-hidden"
        style={{ 
          background: 'linear-gradient(180deg, var(--panel-bg) 0%, var(--panel-bg-alt) 100%)',
          boxShadow: 'var(--shadow-modal)'
        }}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 md:px-6 py-4 border-b border-border-default">
          <Search className="w-5 h-5 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-text-primary placeholder-text-muted
                     outline-none text-lg md:text-base"
          />
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 text-xs bg-white/5 rounded border border-border-default">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Command List */}
        <div className="max-h-[60vh] md:max-h-96 overflow-y-auto py-2">
          {query.startsWith('/') ? (
            <div className="px-4 md:px-6 py-3">
              <p className="text-sm text-text-muted mb-2">Execute command:</p>
              <code className="text-accent-400">{query}</code>
              <p className="text-xs text-text-muted mt-2">Press Enter to execute</p>
            </div>
          ) : filteredCommands.length > 0 ? (
            <div>
              {['quick', 'add', 'view', 'system'].map(category => {
                const categoryCommands = filteredCommands.filter(cmd => cmd.category === category);
                if (categoryCommands.length === 0) return null;

                return (
                  <div key={category}>
                    <div className="px-4 md:px-6 py-2">
                      <p className="text-xs text-text-muted uppercase tracking-wider">
                        {category}
                      </p>
                    </div>
                    {categoryCommands.map((cmd, idx) => {
                      const globalIndex = filteredCommands.indexOf(cmd);
                      return (
                        <button
                          key={cmd.id}
                          onClick={() => {
                            cmd.action();
                            setIsOpen(false);
                            setQuery('');
                          }}
                          className={cn(
                            "w-full px-4 md:px-6 py-4 md:py-3 flex items-center gap-3 hover:bg-white/5 active:bg-white/10",
                            "transition-colors text-left min-h-[60px] md:min-h-auto",
                            globalIndex === selectedIndex && "bg-accent-500/10"
                          )}
                        >
                          <cmd.icon className="w-6 h-6 md:w-5 md:h-5 text-text-muted" />
                          <div className="flex-1">
                            <p className="text-base md:text-sm font-medium text-text-primary">{cmd.label}</p>
                            <p className="text-sm md:text-xs text-text-muted">{cmd.description}</p>
                          </div>
                          {cmd.shortcut && (
                            <code className="text-xs text-accent-400">{cmd.shortcut}</code>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-4 md:px-6 py-12 text-center">
              <p className="text-text-muted">No commands found</p>
              <p className="text-xs text-text-muted mt-2">Try starting with / for slash commands</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 md:px-6 py-3 border-t border-border-default flex items-center justify-between">
          <div className="hidden md:flex items-center gap-4 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white/5 rounded">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white/5 rounded">↵</kbd> Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white/5 rounded">esc</kbd> Close
            </span>
          </div>
          {/* Mobile: Just show tap hint */}
          <div className="md:hidden text-xs text-text-muted">
            Tap to select
          </div>
          <div className="text-xs text-text-muted">
            <Command className="w-3 h-3 inline mr-1" />
            Command Palette
          </div>
        </div>
      </div>
    </>
  );
}