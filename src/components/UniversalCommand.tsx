import { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { modelRouter } from '@/lib/ai/model-router';
import { autoPilot } from '@/lib/automation/autopilot-v2';
import { localBrain } from '@/lib/database/local-brain';

interface CommandSuggestion {
  id: string;
  text: string;
  action: () => Promise<void>;
  confidence?: number;
}

export function UniversalCommand() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<CommandSuggestion[]>([]);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Keyboard shortcuts
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'a' && !e.metaKey && !e.ctrlKey && !open) {
        e.preventDefault();
        createAgendaItem();
      }
      if (e.key === 'q' && !e.metaKey && !e.ctrlKey && !open) {
        e.preventDefault();
        createQuickAction();
      }
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !open) {
        e.preventDefault();
        createNote();
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open]);
  
  // Load recent commands and suggestions on open
  useEffect(() => {
    if (open) {
      loadRecentCommands();
      generateContextualSuggestions();
    }
  }, [open]);
  
  const handleCommand = async (value: string) => {
    if (!value.trim()) return;
    
    setIsProcessing(true);
    
    try {
      if (value.startsWith('/')) {
        // Command mode
        await executeCommand(value);
      } else {
        // Natural language mode
        const result = await modelRouter.query(value, { type: 'command' });
        await executeAIResult(result, value);
      }
      
      // Store command for future reference
      await storeCommand(value);
      
    } catch (error) {
      console.error('Command execution error:', error);
      // Show error to user
      showNotification('Command failed. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
      setOpen(false);
      setQuery('');
    }
  };
  
  const executeCommand = async (command: string) => {
    const cmd = command.slice(1).toLowerCase();
    const args = cmd.split(' ');
    
    switch (args[0]) {
      case 'task':
        await createTask(args.slice(1).join(' ') || 'New task');
        break;
      case 'block':
        await createTimeBlock(args.slice(1).join(' ') || 'Focus time');
        break;
      case 'meal':
        await logMeal(args.slice(1).join(' '));
        break;
      case 'remind':
        await createReminder(args.slice(1).join(' '));
        break;
      case 'schedule':
        await scheduleEvent(args.slice(1).join(' '));
        break;
      case 'status':
        await showSystemStatus();
        break;
      case 'help':
        showHelp();
        break;
      default:
        showNotification(`Unknown command: ${args[0]}`, 'warning');
    }
  };
  
  const executeAIResult = async (result: string, originalQuery: string) => {
    // Parse AI response and execute appropriate actions
    const lowerResult = result.toLowerCase();
    
    if (lowerResult.includes('schedule') || lowerResult.includes('calendar')) {
      await scheduleEvent(originalQuery);
    } else if (lowerResult.includes('task') || lowerResult.includes('todo')) {
      await createTask(originalQuery);
    } else if (lowerResult.includes('remind')) {
      await createReminder(originalQuery);
    } else if (lowerResult.includes('note')) {
      await createNote(originalQuery);
    } else {
      // Generic AI response - show as notification
      showNotification(result, 'info');
    }
  };
  
  const createAgendaItem = async () => {
    const title = prompt('New agenda item:');
    if (title) {
      await createTask(title);
    }
  };
  
  const createQuickAction = async () => {
    const action = prompt('Quick action:');
    if (action) {
      await handleCommand(action);
    }
  };
  
  const createNote = async (content?: string) => {
    const noteContent = content || prompt('Note content:');
    if (noteContent) {
      await localBrain.logEvent('note_created', { content: noteContent });
      showNotification('Note saved', 'success');
    }
  };
  
  const createTask = async (title: string) => {
    const task = {
      id: `task_${Date.now()}`,
      title,
      createdAt: new Date(),
      priority: 'medium',
      completed: false
    };
    
    // Emit event for the main app to handle
    window.dispatchEvent(new CustomEvent('lifeos:task_created', { detail: task }));
    await localBrain.logEvent('task_created', task);
    showNotification(`Task created: ${title}`, 'success');
  };
  
  const createTimeBlock = async (title: string) => {
    const now = new Date();
    const endTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour default
    
    const event = {
      id: `block_${Date.now()}`,
      title,
      startTime: now,
      endTime,
      type: 'focus'
    };
    
    window.dispatchEvent(new CustomEvent('lifeos:event_created', { detail: event }));
    await localBrain.logEvent('time_block_created', event);
    showNotification(`Time block created: ${title}`, 'success');
  };
  
  const logMeal = async (mealInfo: string) => {
    const meal = {
      timestamp: Date.now(),
      info: mealInfo,
      type: 'meal_log'
    };
    
    window.dispatchEvent(new CustomEvent('lifeos:meal_logged', { detail: meal }));
    await localBrain.logEvent('meal_logged', meal);
    showNotification(`Meal logged: ${mealInfo}`, 'success');
  };
  
  const createReminder = async (reminderText: string) => {
    const reminder = {
      id: `reminder_${Date.now()}`,
      text: reminderText,
      createdAt: new Date(),
      type: 'reminder'
    };
    
    window.dispatchEvent(new CustomEvent('lifeos:reminder_created', { detail: reminder }));
    await localBrain.logEvent('reminder_created', reminder);
    showNotification(`Reminder set: ${reminderText}`, 'success');
  };
  
  const scheduleEvent = async (eventDescription: string) => {
    // Use AI to parse the event description
    await modelRouter.query(
      `Parse this event description and extract title, date, time, and duration: "${eventDescription}"`,
      { type: 'scheduling' }
    );
    
    // For now, create a basic event
    const event = {
      id: `event_${Date.now()}`,
      title: eventDescription,
      startTime: new Date(),
      endTime: new Date(Date.now() + 60 * 60 * 1000),
      type: 'meeting'
    };
    
    window.dispatchEvent(new CustomEvent('lifeos:event_created', { detail: event }));
    await localBrain.logEvent('event_scheduled', event);
    showNotification(`Event scheduled: ${eventDescription}`, 'success');
  };
  
  const showSystemStatus = async () => {
    const stats = await modelRouter.getUsageStats();
    const autopilotStatus = await autoPilot.getStatus();
    
    const status = `System Status:
Cache Hit Rate: ${(stats.cache.hitRate * 100).toFixed(1)}%
Daily Cost: $${stats.cost.daily}
AutoPilot: ${autopilotStatus.running ? 'Running' : 'Stopped'}
Active Rules: ${autopilotStatus.rulesCount}`;
    
    showNotification(status, 'info');
  };
  
  const showHelp = () => {
    const help = `Available Commands:
/ - Open command palette
A - Quick agenda item
Q - Quick action
N - Quick note

Slash Commands:
/task <title> - Create task
/block <title> - Create time block
/meal <info> - Log meal
/remind <text> - Set reminder
/schedule <event> - Schedule event
/status - System status
/help - Show this help

Natural Language:
"Schedule meeting tomorrow at 2pm"
"Create task for grocery shopping"
"Remind me to call John"`;
    
    showNotification(help, 'info');
  };
  
  const generateContextualSuggestions = async () => {
    const hour = new Date().getHours();
    const suggestions: CommandSuggestion[] = [];
    
    // Time-based suggestions
    if (hour >= 9 && hour < 11) {
      suggestions.push({
        id: 'deep_work',
        text: '🎯 Schedule deep work session (prime focus time)',
        action: async () => await createTimeBlock('Deep Work Session')
      });
    }
    
    if (hour >= 12 && hour < 14) {
      suggestions.push({
        id: 'meal_log',
        text: '🍽️ Log lunch',
        action: async () => await logMeal('Lunch')
      });
    }
    
    if (hour >= 16 && hour < 18) {
      suggestions.push({
        id: 'email_triage',
        text: '📧 Email triage time',
        action: async () => await createTask('Email Triage')
      });
    }
    
    // Day-based suggestions
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 1 && hour === 9) { // Monday morning
      suggestions.push({
        id: 'weekly_planning',
        text: '📅 Weekly planning session',
        action: async () => await createTimeBlock('Weekly Planning')
      });
    }
    
    // Always available
    suggestions.push(
      {
        id: 'review_agenda',
        text: '📋 Review today\'s agenda',
        action: async () => showNotification('Opening agenda view...', 'info')
      },
      {
        id: 'quick_task',
        text: '✅ Add quick task',
        action: async () => await createAgendaItem()
      }
    );
    
    setSuggestions(suggestions);
  };
  
  const loadRecentCommands = () => {
    try {
      const stored = localStorage.getItem('lifeos_recent_commands');
      if (stored) {
        setRecentCommands(JSON.parse(stored).slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to load recent commands:', error);
    }
  };
  
  const storeCommand = async (command: string) => {
    try {
      const recent = [...recentCommands];
      recent.unshift(command);
      const uniqueRecent = [...new Set(recent)].slice(0, 10);
      
      localStorage.setItem('lifeos_recent_commands', JSON.stringify(uniqueRecent));
      setRecentCommands(uniqueRecent.slice(0, 5));
      
      await localBrain.logEvent('command_executed', { command });
    } catch (error) {
      console.error('Failed to store command:', error);
    }
  };
  
  const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    // Emit event for notification system
    window.dispatchEvent(new CustomEvent('lifeos:notification', { 
      detail: { message, type }
    }));
  };
  
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-[20vh]">
      <Command className="bg-background border rounded-lg shadow-lg w-full max-w-2xl mx-4">
        <Command.Input
          placeholder={isProcessing ? "Processing..." : "Type a command or describe what you want..."}
          value={query}
          onValueChange={setQuery}
          disabled={isProcessing}
          className="px-4 py-3 text-lg border-0 outline-none bg-transparent"
          autoFocus
        />
        <Command.List className="max-h-96 overflow-y-auto p-2">
          <Command.Empty className="px-4 py-6 text-center text-muted-foreground">
            {isProcessing ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                Processing your request...
              </div>
            ) : (
              <div>
                <p>Type naturally or use commands like:</p>
                <p className="text-sm mt-1">/task, /block, /meal, /remind, /schedule</p>
              </div>
            )}
          </Command.Empty>
          
          {/* Contextual suggestions */}
          {suggestions.length > 0 && (
            <Command.Group heading="Suggested for now">
              {suggestions.map(suggestion => (
                <Command.Item 
                  key={suggestion.id}
                  onSelect={() => suggestion.action()}
                  className="px-4 py-2 rounded hover:bg-muted cursor-pointer flex items-center gap-2"
                >
                  {suggestion.text}
                  {suggestion.confidence && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {Math.round(suggestion.confidence * 100)}%
                    </span>
                  )}
                </Command.Item>
              ))}
            </Command.Group>
          )}
          
          {/* Recent commands */}
          {recentCommands.length > 0 && (
            <Command.Group heading="Recent">
              {recentCommands.map((cmd, index) => (
                <Command.Item 
                  key={index}
                  onSelect={() => handleCommand(cmd)}
                  className="px-4 py-2 rounded hover:bg-muted cursor-pointer"
                >
                  {cmd}
                </Command.Item>
              ))}
            </Command.Group>
          )}
          
          {/* Quick actions */}
          <Command.Group heading="Quick Actions">
            <Command.Item 
              onSelect={() => handleCommand('/task ')}
              className="px-4 py-2 rounded hover:bg-muted cursor-pointer"
            >
              ✅ Create Task
            </Command.Item>
            <Command.Item 
              onSelect={() => handleCommand('/block ')}
              className="px-4 py-2 rounded hover:bg-muted cursor-pointer"
            >
              🎯 Create Time Block
            </Command.Item>
            <Command.Item 
              onSelect={() => handleCommand('/remind ')}
              className="px-4 py-2 rounded hover:bg-muted cursor-pointer"
            >
              🔔 Set Reminder
            </Command.Item>
            <Command.Item 
              onSelect={() => handleCommand('/schedule ')}
              className="px-4 py-2 rounded hover:bg-muted cursor-pointer"
            >
              📅 Schedule Event
            </Command.Item>
          </Command.Group>
        </Command.List>
        
        <div className="px-4 py-2 border-t text-xs text-muted-foreground flex justify-between">
          <span>Press / to open • A for agenda • Q for quick action • N for note</span>
          <span>ESC to close</span>
        </div>
      </Command>
    </div>
  );
}