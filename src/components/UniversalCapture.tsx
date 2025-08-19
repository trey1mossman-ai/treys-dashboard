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
  block: /^\/block\s+(\d{1,2}):?(\d{2})-(\d{1,2}):?(\d{2})\s+(.+)/i,
  meal: /^\/meal\s+(.+?)(?:\s+(\d+)kcal)?(?:\s+(\d+)p)?(?:\s+(\d+)c)?(?:\s+(\d+)f)?$/i,
  supp: /^\/supp\s+(.+?)(?:\s+(.+?))?\s+(AM|Pre|Post|PM)$/i,
  note: /^\/note\s+(.+)/i,
  event: /^\/event\s+(.+)/i,
};

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
      if (input.startsWith('/task')) {
        setSuggestion('Add a todo task');
      } else if (input.startsWith('/block')) {
        setSuggestion('Add time block (HH:MM-HH:MM title)');
      } else if (input.startsWith('/meal')) {
        setSuggestion('Log meal (name [kcal] [p] [c] [f])');
      } else if (input.startsWith('/supp')) {
        setSuggestion('Add supplement (name [dose] AM/Pre/Post/PM)');
      } else if (input.startsWith('/note')) {
        setSuggestion('Create a note');
      } else if (input.startsWith('/event')) {
        setSuggestion('Add calendar event');
      } else {
        setSuggestion('Commands: /task, /block, /meal, /supp, /note, /event');
      }
    } else if (input) {
      setSuggestion('Press Enter to add as task, or use / for commands');
    } else {
      setSuggestion('');
    }
  }, [input]);

  const parseAndExecute = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    // Check for command patterns
    if (trimmed.startsWith('/')) {
      // Task command
      const taskMatch = trimmed.match(COMMAND_PATTERNS.task);
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
      const suppMatch = trimmed.match(COMMAND_PATTERNS.supp);
      if (suppMatch) {
        onAddSupplement({
          name: suppMatch[1],
          dose: suppMatch[2],
          time: suppMatch[3] as 'AM' | 'Pre' | 'Post' | 'PM'
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

      // Unknown command
      toast({ 
        title: 'Unknown command', 
        description: 'Try: /task, /block, /meal, /supp, /note, /event',
        variant: 'destructive'
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
              Quick add anything...
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
              placeholder="Type or use / for commands..."
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