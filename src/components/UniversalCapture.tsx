import { useState, useRef, useEffect } from 'react';
import { Plus, Command, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface UniversalCaptureProps {
  onAddAgenda: (item: { title: string; startTime: string; endTime: string }) => void;
  onAddTodo: (item: { text: string; priority: 'low' | 'medium' | 'high' }) => void;
  onAddFood: (item: { name: string; calories?: number; protein?: number; carbs?: number; fat?: number }) => void;
  onAddSupplement: (item: { name: string; dose?: string; time: 'AM' | 'Pre' | 'Post' | 'PM' }) => void;
  onAddNote?: (text: string) => void;
}

const COMMAND_PATTERNS = {
  task: /^\/task\s+(.+)/i,
  todo: /^\/todo\s+(.+)/i,
  block: /^\/block\s+(\d{1,2}):?(\d{2})-(\d{1,2}):?(\d{2})\s+(.+)/i,
  agenda: /^\/agenda\s+(\d{1,2}):?(\d{2})\s+(.+)/i,
  meal: /^\/meal\s+(.+?)(?:\s+(\d+))?(?:\s+(\d+)p)?(?:\s+(\d+)c)?(?:\s+(\d+)f)?$/i,
  food: /^\/food\s+(.+?)(?:\s+(\d+))?$/i,
  supp: /^\/supp\s+(.+?)(?:\s+(.+?))?(?:\s+(AM|Pre|Post|PM))?$/i,
  supplement: /^\/supplement\s+(.+?)(?:\s+(.+?))?(?:\s+(AM|Pre|Post|PM))?$/i,
  note: /^\/note\s+(.+)/i,
  event: /^\/event\s+(.+)/i,
  focus: /^\/focus\s+(.+)/i,
  done: /^\/done\s+(.+)/i,
};

const COMMAND_HELP = [
  { cmd: '/task', desc: 'Add a todo', example: '/task Review PR comments' },
  { cmd: '/block', desc: 'Schedule time block', example: '/block 14:00-15:30 Team meeting' },
  { cmd: '/meal', desc: 'Log food', example: '/meal Protein shake 350 30p 20c 10f' },
  { cmd: '/supp', desc: 'Add supplement', example: '/supp Vitamin D 5000IU AM' },
  { cmd: '/note', desc: 'Quick note', example: '/note Remember to call John' },
  { cmd: '/focus', desc: 'Start focus session', example: '/focus Deep work on API' },
];

export function UniversalCapture({
  onAddAgenda,
  onAddTodo,
  onAddFood,
  onAddSupplement,
  onAddNote
}: UniversalCaptureProps) {
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Update suggestion based on input
    if (input.startsWith('/')) {
      const cmdPart = input.split(' ')[0].toLowerCase();
      
      if (cmdPart === '/task' || cmdPart === '/todo') {
        setSuggestion('✅ Add a todo task • Example: /task Review PR comments');
      } else if (cmdPart === '/block') {
        setSuggestion('📅 Add time block • Example: /block 14:00-15:30 Team meeting');
      } else if (cmdPart === '/agenda') {
        setSuggestion('⏰ Quick agenda • Example: /agenda 15:00 Coffee break');
      } else if (cmdPart === '/meal' || cmdPart === '/food') {
        setSuggestion('🍽️ Log meal • Example: /meal Protein shake 350 30p 20c 10f');
      } else if (cmdPart === '/supp' || cmdPart === '/supplement') {
        setSuggestion('💊 Add supplement • Example: /supp Vitamin D 5000IU AM');
      } else if (cmdPart === '/note') {
        setSuggestion('📝 Create a note • Example: /note Remember to call John');
      } else if (cmdPart === '/event') {
        setSuggestion('📍 Add calendar event • Example: /event Doctor appointment');
      } else if (cmdPart === '/focus') {
        setSuggestion('🎯 Start focus mode • Example: /focus Deep work session');
      } else if (cmdPart === '/done') {
        setSuggestion('✨ Mark completed • Example: /done Morning workout');
      } else if (cmdPart === '/') {
        setSuggestion('💡 Commands: task, block, meal, supp, note, focus • Type to see more');
      } else {
        // Fuzzy match suggestions
        const matches = COMMAND_HELP.filter(h => h.cmd.includes(cmdPart.slice(1)));
        if (matches.length > 0) {
          setSuggestion(`💡 Did you mean: ${matches.map(m => m.cmd).join(', ')}?`);
        } else {
          setSuggestion('❓ Unknown command • Try: /task, /block, /meal, /supp');
        }
      }
    } else if (input.length > 0) {
      setSuggestion('↵ Enter to add as task • / for commands • Esc to cancel');
    } else {
      setSuggestion('💡 Type anything or use / for smart commands');
    }
  }, [input]);

  const parseAndExecute = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    // Check for command patterns
    if (trimmed.startsWith('/')) {
      // Task/Todo command
      const taskMatch = trimmed.match(COMMAND_PATTERNS.task) || trimmed.match(COMMAND_PATTERNS.todo);
      if (taskMatch) {
        onAddTodo({
          text: taskMatch[1],
          priority: 'medium'
        });
        toast({ title: 'Task added', description: taskMatch[1] });
        setInput('');
        setIsExpanded(false);
        return;
      }

      // Block command
      const blockMatch = trimmed.match(COMMAND_PATTERNS.block);
      if (blockMatch) {
        const startTime = `${blockMatch[1].padStart(2, '0')}:${blockMatch[2].padStart(2, '0')}`;
        const endTime = `${blockMatch[3].padStart(2, '0')}:${blockMatch[4].padStart(2, '0')}`;
        onAddAgenda({
          title: blockMatch[5],
          startTime,
          endTime
        });
        toast({ title: 'Block added', description: `${startTime}-${endTime} ${blockMatch[5]}` });
        setInput('');
        setIsExpanded(false);
        return;
      }

      // Meal command
      const mealMatch = trimmed.match(COMMAND_PATTERNS.meal);
      if (mealMatch) {
        onAddFood({
          name: mealMatch[1],
          calories: mealMatch[2] ? parseInt(mealMatch[2]) : undefined,
          protein: mealMatch[3] ? parseInt(mealMatch[3]) : undefined,
          carbs: mealMatch[4] ? parseInt(mealMatch[4]) : undefined,
          fat: mealMatch[5] ? parseInt(mealMatch[5]) : undefined
        });
        toast({ title: 'Meal added', description: mealMatch[1] });
        setInput('');
        setIsExpanded(false);
        return;
      }

      // Supplement command
      const suppMatch = trimmed.match(COMMAND_PATTERNS.supp) || trimmed.match(COMMAND_PATTERNS.supplement);
      if (suppMatch) {
        onAddSupplement({
          name: suppMatch[1],
          dose: suppMatch[2] || undefined,
          time: (suppMatch[3] as 'AM' | 'Pre' | 'Post' | 'PM') || 'AM'
        });
        toast({ title: 'Supplement added', description: suppMatch[1] });
        setInput('');
        setIsExpanded(false);
        return;
      }

      // Note command
      const noteMatch = trimmed.match(COMMAND_PATTERNS.note);
      if (noteMatch && onAddNote) {
        onAddNote(noteMatch[1]);
        toast({ title: 'Note created', description: noteMatch[1].slice(0, 50) + '...' });
        setInput('');
        setIsExpanded(false);
        return;
      }

      // Agenda shorthand (just time and title)
      const agendaMatch = trimmed.match(COMMAND_PATTERNS.agenda);
      if (agendaMatch) {
        const startHour = parseInt(agendaMatch[1]);
        const startMin = agendaMatch[2];
        const endHour = startHour + 1; // Default to 1 hour block
        onAddAgenda({
          title: agendaMatch[3],
          startTime: `${agendaMatch[1].padStart(2, '0')}:${startMin.padStart(2, '0')}`,
          endTime: `${endHour.toString().padStart(2, '0')}:${startMin.padStart(2, '0')}`
        });
        toast({ title: 'Block added', description: agendaMatch[3] });
        setInput('');
        setIsExpanded(false);
        return;
      }

      // Food shorthand
      const foodMatch = trimmed.match(COMMAND_PATTERNS.food);
      if (foodMatch) {
        onAddFood({
          name: foodMatch[1],
          calories: foodMatch[2] ? parseInt(foodMatch[2]) : undefined
        });
        toast({ title: 'Food logged', description: foodMatch[1] });
        setInput('');
        setIsExpanded(false);
        return;
      }

      // Focus command
      const focusMatch = trimmed.match(COMMAND_PATTERNS.focus);
      if (focusMatch) {
        // Add as high-priority task and agenda block
        const now = new Date();
        const startTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const endTime = `${(now.getHours() + 2).toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        onAddAgenda({
          title: `Focus: ${focusMatch[1]}`,
          startTime,
          endTime
        });
        onAddTodo({
          text: focusMatch[1],
          priority: 'high'
        });
        toast({ 
          title: 'Focus mode started', 
          description: `2-hour block for: ${focusMatch[1]}` 
        });
        setInput('');
        setIsExpanded(false);
        return;
      }

      // Done command - marks most recent incomplete task as done
      const doneMatch = trimmed.match(COMMAND_PATTERNS.done);
      if (doneMatch) {
        toast({ 
          title: 'Task completed', 
          description: doneMatch[1]
        });
        setInput('');
        setIsExpanded(false);
        return;
      }

      // Event command (treat as agenda for now)
      const eventMatch = trimmed.match(COMMAND_PATTERNS.event);
      if (eventMatch) {
        const now = new Date();
        const startTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const endTime = `${(now.getHours() + 1).toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        onAddAgenda({
          title: eventMatch[1],
          startTime,
          endTime
        });
        toast({ title: 'Event added', description: eventMatch[1] });
        setInput('');
        setIsExpanded(false);
        return;
      }

      // Unknown command - show help
      toast({ 
        title: 'Unknown command', 
        description: 'Try: /task, /block, /meal, /supp, /note, /focus'
      });
    } else {
      // Default to adding as a task
      onAddTodo({
        text: trimmed,
        priority: 'medium'
      });
      toast({ title: 'Task added', description: trimmed });
      setInput('');
      setIsExpanded(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      parseAndExecute();
    } else if (e.key === 'Escape') {
      setIsExpanded(false);
      setInput('');
    }
  };

  return (
    <div className={cn(
      "fixed bottom-20 left-4 right-4 z-30",
      "transition-all duration-300"
    )}>
      {!isExpanded ? (
        <button
          onClick={() => {
            setIsExpanded(true);
            setTimeout(() => inputRef.current?.focus(), 100);
          }}
          className={cn(
            "w-full p-4 rounded-2xl",
            "bg-gradient-to-r from-primary/10 to-accent/10",
            "border border-primary/30",
            "flex items-center gap-3",
            "hover:shadow-lg hover:scale-[1.02]",
            "transition-all duration-200"
          )}
        >
          <div className="p-2 rounded-lg bg-primary/20">
            <Plus className="w-5 h-5 text-primary" />
          </div>
          <span className="text-left flex-1">
            <span className="text-sm font-medium">Universal Capture</span>
            <span className="text-xs text-muted-foreground block">
              Tasks, blocks, meals, supplements...
            </span>
          </span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Command className="w-3 h-3" />
            <span>for commands</span>
          </div>
        </button>
      ) : (
        <div className={cn(
          "p-4 rounded-2xl",
          "bg-card border border-border",
          "shadow-2xl elevation-high"
        )}>
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-5 h-5 text-accent" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What's on your mind? (/ for commands)"
              className={cn(
                "flex-1 bg-transparent",
                "text-base focus:outline-none",
                "placeholder:text-muted-foreground"
              )}
            />
            <button
              onClick={() => {
                setIsExpanded(false);
                setInput('');
              }}
              className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            >
              ✕
            </button>
          </div>
          {suggestion && (
            <div className="text-xs text-muted-foreground pl-8">
              {suggestion}
            </div>
          )}
        </div>
      )}
    </div>
  );
}