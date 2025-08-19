import { cn } from '@/lib/utils';
import { Undo2 } from 'lucide-react';

interface AIGenerateModalProps {
  isOpen: boolean;
  section: string;
  currentItems: any[];
  generatedItems: any[];
  onReplace: () => void;
  onMerge: () => void;
  onCancel: () => void;
}

export function AIGenerateModal({
  isOpen,
  section,
  currentItems,
  generatedItems,
  onReplace,
  onMerge,
  onCancel
}: AIGenerateModalProps) {
  if (!isOpen) return null;

  const sectionColors = {
    agenda: 'violet',
    todos: 'amber',
    food: 'emerald',
    supplements: 'sky'
  };

  const color = sectionColors[section as keyof typeof sectionColors] || 'violet';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className={cn(
        "relative bg-card border border-border rounded-2xl",
        "max-w-md w-full p-6",
        "shadow-2xl elevation-high"
      )}>
        <h3 className={cn(
          "text-lg font-bold mb-4",
          `text-${color}-500`
        )}>
          AI Generated {section === 'todos' ? 'To-Dos' : section.charAt(0).toUpperCase() + section.slice(1)}
        </h3>
        
        <div className="space-y-3 mb-6">
          <div className="text-sm text-muted-foreground">
            Current items: {currentItems.length}
          </div>
          <div className="text-sm text-muted-foreground">
            Generated items: {generatedItems.length}
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onReplace}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg font-medium",
              `bg-${color}-500 text-white hover:bg-${color}-600`,
              "transition-colors"
            )}
          >
            Replace All
          </button>
          <button
            onClick={onMerge}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg font-medium",
              `bg-${color}-500/20 text-${color}-500 hover:bg-${color}-500/30`,
              "border border-${color}-500/50",
              "transition-colors"
            )}
          >
            Merge
          </button>
          <button
            onClick={onCancel}
            className={cn(
              "py-2 px-4 rounded-lg font-medium",
              "bg-muted hover:bg-muted/80",
              "transition-colors"
            )}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

interface UndoToastProps {
  isVisible: boolean;
  onUndo: () => void;
  timeLeft: number;
}

export function UndoToast({ isVisible, onUndo, timeLeft }: UndoToastProps) {
  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed bottom-24 left-4 right-4 z-50",
      "bg-card border border-border rounded-lg shadow-lg",
      "p-3 flex items-center justify-between",
      "animate-slide-up"
    )}>
      <span className="text-sm">AI items applied</span>
      <button
        onClick={onUndo}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg",
          "bg-primary/10 text-primary hover:bg-primary/20",
          "transition-colors text-sm font-medium"
        )}
      >
        <Undo2 className="w-4 h-4" />
        Undo ({timeLeft}s)
      </button>
    </div>
  );
}