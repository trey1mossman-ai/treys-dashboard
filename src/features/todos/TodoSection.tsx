import { useState } from 'react';
import { Plus, ChevronUp, ChevronDown, Trash2, CheckSquare, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TodoItem } from '@/types/daily';

interface TodoSectionProps {
  items: TodoItem[];
  onAdd: (item: Omit<TodoItem, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<TodoItem>) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onAIGenerate: () => Promise<void>;
  isOnline: boolean;
}

const priorityColors = {
  low: 'text-gray-500',
  medium: 'text-amber-500',
  high: 'text-red-500'
};


export function TodoSection({ 
  items, 
  onAdd, 
  onUpdate, 
  onDelete, 
  onToggle,
  onReorder,
  onAIGenerate,
  isOnline 
}: TodoSectionProps) {
  const [newText, setNewText] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAdd = () => {
    if (!newText.trim()) return;
    onAdd({
      text: newText,
      priority: newPriority,
      completed: false
    });
    setNewText('');
  };

  const handleAIGenerate = async () => {
    setIsGenerating(true);
    try {
      await onAIGenerate();
    } finally {
      setIsGenerating(false);
    }
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      onReorder(index, index - 1);
    } else if (direction === 'down' && index < items.length - 1) {
      onReorder(index, index + 1);
    }
  };

  const markAllDone = () => {
    items.forEach(item => {
      if (!item.completed) {
        onToggle(item.id);
      }
    });
  };

  const completedCount = items.filter(item => item.completed).length;

  return (
    <section id="todos" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-amber-500">To-Do</h2>
          {items.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {completedCount}/{items.length} done
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && completedCount < items.length && (
            <button
              onClick={markAllDone}
              className="px-3 py-1.5 text-sm bg-amber-500/10 text-amber-500 rounded-lg hover:bg-amber-500/20 transition-colors"
            >
              Mark all done
            </button>
          )}
          <button
            onClick={handleAIGenerate}
            disabled={!isOnline || isGenerating}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all",
              "bg-amber-500/10 text-amber-500",
              isOnline && !isGenerating && "hover:bg-amber-500/20",
              (!isOnline || isGenerating) && "opacity-50 cursor-not-allowed"
            )}
            title={!isOnline ? "Needs connection" : undefined}
          >
            <Bot className={cn("w-4 h-4", isGenerating && "animate-spin")} />
            <span>AI: craft today</span>
          </button>
        </div>
      </div>

      {/* Quick Add - Always visible */}
      <div className="flex gap-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Add task..."
          className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        />
        <select
          value={newPriority}
          onChange={(e) => setNewPriority(e.target.value as 'low' | 'medium' | 'high')}
          className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        >
          <option value="low">Low</option>
          <option value="medium">Med</option>
          <option value="high">High</option>
        </select>
        <button
          onClick={handleAdd}
          className="p-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          aria-label="Add task"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No tasks yet</p>
            <p className="text-sm mt-1">Add your first task above</p>
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all",
                "border border-amber-500/20 hover:border-amber-500/40",
                item.completed && "opacity-60"
              )}
            >
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => onToggle(item.id)}
                className="w-5 h-5 rounded border-2 border-amber-500 text-amber-500 focus:ring-amber-500/50"
              />
              
              <input
                type="text"
                value={item.text}
                onChange={(e) => onUpdate(item.id, { text: e.target.value })}
                className={cn(
                  "flex-1 bg-transparent focus:outline-none",
                  item.completed && "line-through"
                )}
              />

              <select
                value={item.priority}
                onChange={(e) => onUpdate(item.id, { priority: e.target.value as 'low' | 'medium' | 'high' })}
                className={cn(
                  "px-2 py-1 bg-transparent border border-border rounded text-sm focus:outline-none",
                  priorityColors[item.priority]
                )}
              >
                <option value="low">Low</option>
                <option value="medium">Med</option>
                <option value="high">High</option>
              </select>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0}
                  className="p-1.5 rounded hover:bg-amber-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Move up"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moveItem(index, 'down')}
                  disabled={index === items.length - 1}
                  className="p-1.5 rounded hover:bg-amber-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Move down"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  className="p-1.5 rounded hover:bg-red-500/10 hover:text-red-500 transition-colors"
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}