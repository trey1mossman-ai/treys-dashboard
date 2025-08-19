import { useState, useEffect, useRef } from 'react';
import { Focus, X, ChevronRight, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgendaItem } from '@/types/daily';

interface FocusModeProps {
  currentBlock: AgendaItem | null;
  nextBlock: AgendaItem | null;
  onClose: () => void;
}

export function FocusMode({ currentBlock, nextBlock, onClose }: FocusModeProps) {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!currentBlock) return;

    const updateTimer = () => {
      const now = new Date();
      const [endHours, endMinutes] = currentBlock.endTime.split(':').map(Number);
      const endTime = new Date();
      endTime.setHours(endHours, endMinutes, 0, 0);

      const [startHours, startMinutes] = currentBlock.startTime.split(':').map(Number);
      const startTime = new Date();
      startTime.setHours(startHours, startMinutes, 0, 0);

      const totalDuration = endTime.getTime() - startTime.getTime();
      const elapsed = now.getTime() - startTime.getTime();
      const remaining = endTime.getTime() - now.getTime();

      if (remaining <= 0) {
        setTimeRemaining('Complete');
        setProgress(100);
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      setProgress((elapsed / totalDuration) * 100);
    };

    updateTimer();
    intervalRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [currentBlock]);

  if (!currentBlock) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-50",
      "bg-background",
      "flex flex-col items-center justify-center",
      "p-6"
    )}>
      {/* Close button */}
      <button
        onClick={onClose}
        className={cn(
          "absolute top-4 right-4",
          "p-2 rounded-lg",
          "hover:bg-muted transition-colors"
        )}
        aria-label="Exit focus mode"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Focus indicator */}
      <div className="mb-8">
        <div className={cn(
          "w-20 h-20 rounded-full",
          "bg-violet-500/20 border-2 border-violet-500",
          "flex items-center justify-center",
          "animate-pulse"
        )}>
          <Focus className="w-10 h-10 text-violet-500" />
        </div>
      </div>

      {/* Current block */}
      <div className="text-center mb-8 max-w-md">
        <h1 className="text-3xl font-bold mb-2">{currentBlock.title}</h1>
        <div className="text-muted-foreground">
          {currentBlock.startTime} - {currentBlock.endTime}
        </div>
      </div>

      {/* Timer */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-5xl font-mono font-bold">
          <Timer className="w-10 h-10 text-violet-500" />
          <span className={cn(
            timeRemaining === 'Complete' ? 'text-green-500' : 'text-foreground'
          )}>
            {timeRemaining}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md mb-8">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-violet-500 to-violet-600 transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Next block preview */}
      {nextBlock && (
        <div className={cn(
          "p-4 rounded-lg",
          "bg-muted/50 border border-border",
          "max-w-md w-full"
        )}>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <ChevronRight className="w-4 h-4" />
            <span>Next up</span>
          </div>
          <div className="font-medium">{nextBlock.title}</div>
          <div className="text-sm text-muted-foreground">
            {nextBlock.startTime} - {nextBlock.endTime}
          </div>
        </div>
      )}
    </div>
  );
}

interface FocusModeToggleProps {
  isActive: boolean;
  onToggle: () => void;
}

export function FocusModeToggle({ isActive, onToggle }: FocusModeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg",
        "transition-all duration-200",
        isActive 
          ? "bg-violet-500 text-white hover:bg-violet-600" 
          : "bg-violet-500/10 text-violet-500 hover:bg-violet-500/20",
        "border",
        isActive ? "border-violet-600" : "border-violet-500/30"
      )}
    >
      <Focus className="w-4 h-4" />
      <span className="text-sm font-medium">
        {isActive ? 'Exit Focus' : 'Focus Mode'}
      </span>
    </button>
  );
}