// CLAUDE CODE: Day 2 - Advanced Command Palette
import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Command } from 'cmdk';
import {
  Search, X, Mail, Calendar, CheckSquare, StickyNote,
  Zap, Settings, Moon, Sun, Home, RefreshCw, Plus,
  ArrowRight, Hash, AtSign, Star, Clock, User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';

interface CommandItem {
  id: string;
  name: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  action: () => void | Promise<void>;
  category: 'navigation' | 'action' | 'quick-action' | 'theme' | 'data';
}

export const CommandPalette = memo(() => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  // Listen for Cmd+K or Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((open) => !open);
      }

      // Additional shortcuts when palette is closed
      if (!open) {
        // Quick shortcuts
        if (e.metaKey || e.ctrlKey) {
          switch(e.key) {
            case 'a':
              e.preventDefault();
              navigate('/agenda');
              break;
            case 'n':
              e.preventDefault();
              // Trigger new note
              window.dispatchEvent(new CustomEvent('create-note'));
              break;
            case 'q':
              e.preventDefault();
              // Trigger quick action
              window.dispatchEvent(new CustomEvent('quick-action'));
              break;
          }
        }
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, navigate]);

  // Command items
  const commands = useMemo<CommandItem[]>(() => [
    // Navigation
    {
      id: 'home',
      name: 'Go to Dashboard',
      icon: <Home className="w-4 h-4" />,
      shortcut: '⌘H',
      category: 'navigation',
      action: () => {
        navigate('/');
        setOpen(false);
      }
    },
    {
      id: 'agenda',
      name: 'Open Agenda',
      icon: <CheckSquare className="w-4 h-4" />,
      shortcut: '⌘A',
      category: 'navigation',
      action: () => {
        navigate('/agenda');
        setOpen(false);
      }
    },
    {
      id: 'calendar',
      name: 'View Calendar',
      icon: <Calendar className="w-4 h-4" />,
      category: 'navigation',
      action: () => {
        navigate('/calendar');
        setOpen(false);
      }
    },
    {
      id: 'emails',
      name: 'Check Emails',
      icon: <Mail className="w-4 h-4" />,
      category: 'navigation',
      action: () => {
        navigate('/emails');
        setOpen(false);
      }
    },

    // Actions
    {
      id: 'new-task',
      name: 'Create New Task',
      description: 'Add a task to your agenda',
      icon: <Plus className="w-4 h-4" />,
      shortcut: '⌘N',
      category: 'action',
      action: async () => {
        window.dispatchEvent(new CustomEvent('create-task'));
        setOpen(false);
      }
    },
    {
      id: 'new-note',
      name: 'Create Sticky Note',
      description: 'Add a new sticky note',
      icon: <StickyNote className="w-4 h-4" />,
      category: 'action',
      action: () => {
        window.dispatchEvent(new CustomEvent('create-note'));
        setOpen(false);
      }
    },
    {
      id: 'quick-action',
      name: 'Run Quick Action',
      description: 'Execute a saved quick action',
      icon: <Zap className="w-4 h-4" />,
      shortcut: '⌘Q',
      category: 'quick-action',
      action: () => {
        window.dispatchEvent(new CustomEvent('quick-action'));
        setOpen(false);
      }
    },

    // Data
    {
      id: 'refresh',
      name: 'Refresh Data',
      description: 'Sync all data sources',
      icon: <RefreshCw className="w-4 h-4" />,
      shortcut: '⌘R',
      category: 'data',
      action: async () => {
        setLoading(true);
        window.dispatchEvent(new CustomEvent('refresh-all'));
        setTimeout(() => {
          setLoading(false);
          setOpen(false);
        }, 1000);
      }
    },

    // Theme
    {
      id: 'theme-toggle',
      name: theme === 'dark' ? 'Light Mode' : 'Dark Mode',
      description: 'Toggle theme',
      icon: theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />,
      shortcut: '⌘T',
      category: 'theme',
      action: () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
        setOpen(false);
      }
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: <Settings className="w-4 h-4" />,
      shortcut: '⌘,',
      category: 'navigation',
      action: () => {
        navigate('/settings');
        setOpen(false);
      }
    }
  ], [navigate, theme, setTheme]);

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search) return commands;

    const searchLower = search.toLowerCase();
    return commands.filter(cmd =>
      cmd.name.toLowerCase().includes(searchLower) ||
      cmd.description?.toLowerCase().includes(searchLower) ||
      cmd.category.toLowerCase().includes(searchLower)
    );
  }, [commands, search]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};

    filteredCommands.forEach(cmd => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });

    return groups;
  }, [filteredCommands]);

  const runCommand = useCallback((command: CommandItem) => {
    command.action();
  }, []);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={() => setOpen(false)}
      />

      {/* Command Palette */}
      <div className="fixed inset-x-0 top-[20%] z-50 mx-auto max-w-2xl px-4">
        <Command
          className={cn(
            'rounded-2xl border border-border bg-background/95',
            'backdrop-blur-xl shadow-2xl',
            'overflow-hidden'
          )}
        >
          <div className="flex items-center border-b border-border px-4">
            <Search className="w-5 h-5 text-muted-foreground mr-3" />
            <Command.Input
              placeholder="Type a command or search..."
              value={search}
              onValueChange={setSearch}
              className={cn(
                'flex-1 py-4 bg-transparent',
                'placeholder:text-muted-foreground',
                'outline-none text-lg'
              )}
            />
            <button
              onClick={() => setOpen(false)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            {loading && (
              <div className="py-8 text-center text-muted-foreground">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p>Loading...</p>
              </div>
            )}

            {!loading && filteredCommands.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                <p>No results found for "{search}"</p>
              </div>
            )}

            {!loading && Object.entries(groupedCommands).map(([category, items]) => (
              <Command.Group
                key={category}
                heading={category.charAt(0).toUpperCase() + category.slice(1)}
                className="text-xs text-muted-foreground uppercase tracking-wider px-2 py-1.5"
              >
                {items.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={item.name}
                    onSelect={() => runCommand(item)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg',
                      'hover:bg-muted cursor-pointer',
                      'transition-colors group'
                    )}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted group-hover:bg-background">
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                    </div>
                    {item.shortcut && (
                      <kbd className={cn(
                        'px-2 py-1 text-xs rounded',
                        'bg-muted text-muted-foreground',
                        'border border-border'
                      )}>
                        {item.shortcut}
                      </kbd>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>

          <div className="border-t border-border px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex gap-4">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>⎋ Close</span>
            </div>
            <span>⌘K to toggle</span>
          </div>
        </Command>
      </div>
    </>
  );
});

CommandPalette.displayName = 'CommandPalette';