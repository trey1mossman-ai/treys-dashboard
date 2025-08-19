import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const SAVAGE_7_THEMES = [
  { name: 'Execution', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', suggestion: 'Ship fast, iterate later' },
  { name: 'Systems', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30', suggestion: 'Build once, leverage forever' },
  { name: 'Focus', color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/30', suggestion: 'Deep work, no distractions' },
  { name: 'Recovery', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30', suggestion: 'Rest is productive' },
  { name: 'Growth', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30', suggestion: 'Learn, apply, teach' },
  { name: 'Connection', color: 'text-pink-500', bg: 'bg-pink-500/10', border: 'border-pink-500/30', suggestion: 'Relationships compound' },
  { name: 'Creation', color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', suggestion: 'Build something meaningful' }
];

export function ThemeOfDay() {
  const [theme, setTheme] = useState(() => {
    // Get today's theme from localStorage or pick based on day
    const stored = localStorage.getItem(`theme:${new Date().toISOString().slice(0, 10)}`);
    if (stored) {
      const index = parseInt(stored);
      return SAVAGE_7_THEMES[index] || SAVAGE_7_THEMES[0];
    }
    // Default: rotate through themes by day of week
    const dayOfWeek = new Date().getDay();
    return SAVAGE_7_THEMES[dayOfWeek];
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const selectTheme = (index: number) => {
    const newTheme = SAVAGE_7_THEMES[index];
    setTheme(newTheme);
    localStorage.setItem(`theme:${new Date().toISOString().slice(0, 10)}`, index.toString());
    setIsExpanded(false);
  };

  useEffect(() => {
    // Check if we need to reset theme for a new day
    const checkNewDay = () => {
      const stored = localStorage.getItem(`theme:${new Date().toISOString().slice(0, 10)}`);
      if (!stored) {
        const dayOfWeek = new Date().getDay();
        setTheme(SAVAGE_7_THEMES[dayOfWeek]);
      }
    };

    const interval = setInterval(checkNewDay, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg",
          "transition-all duration-200",
          theme.bg,
          theme.border,
          "border",
          "hover:scale-105"
        )}
      >
        <Sparkles className={cn("w-4 h-4", theme.color)} />
        <div className="text-left">
          <div className={cn("text-xs font-bold", theme.color)}>
            {theme.name}
          </div>
          <div className="text-xs text-muted-foreground">
            {theme.suggestion}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className={cn(
          "absolute top-full mt-2 left-0 z-50",
          "p-2 rounded-lg",
          "bg-card border border-border",
          "shadow-xl elevation-high",
          "min-w-[200px]"
        )}>
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Choose today's theme:
          </div>
          <div className="space-y-1">
            {SAVAGE_7_THEMES.map((t, index) => (
              <button
                key={t.name}
                onClick={() => selectTheme(index)}
                className={cn(
                  "w-full text-left px-2 py-1.5 rounded",
                  "hover:bg-muted transition-colors",
                  "flex items-center gap-2",
                  theme.name === t.name && "bg-muted"
                )}
              >
                <Sparkles className={cn("w-3 h-3", t.color)} />
                <span className="text-sm font-medium">{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}