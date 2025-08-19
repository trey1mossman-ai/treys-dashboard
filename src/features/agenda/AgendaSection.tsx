import { useState, useRef } from 'react';
import { Plus, ChevronUp, ChevronDown, Trash2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgendaItem } from '@/types/daily';

interface AgendaSectionProps {
  items: AgendaItem[];
  onAdd: (item: Omit<AgendaItem, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<AgendaItem>) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onAIGenerate: () => Promise<void>;
  isOnline: boolean;
}

export function AgendaSection({ 
  items, 
  onAdd, 
  onUpdate, 
  onDelete, 
  onToggle,
  onAIGenerate,
  isOnline 
}: AgendaSectionProps) {
  const [newTitle, setNewTitle] = useState('');
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('10:00');
  const [isGenerating, setIsGenerating] = useState(false);
  const currentBlockRef = useRef<HTMLDivElement>(null);

  // Find current time block
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const currentBlockIndex = items.findIndex(item => 
    item.startTime <= currentTime && item.endTime > currentTime
  );

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    onAdd({
      title: newTitle,
      startTime: newStart,
      endTime: newEnd,
      completed: false
    });
    setNewTitle('');
  };

  const handleAIGenerate = async () => {
    setIsGenerating(true);
    try {
      await onAIGenerate();
    } finally {
      setIsGenerating(false);
    }
  };

  const jumpToNow = () => {
    if (currentBlockRef.current) {
      currentBlockRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const item = items[index];
      const prevItem = items[index - 1];
      // Swap times
      onUpdate(item.id, { startTime: prevItem.startTime, endTime: prevItem.endTime });
      onUpdate(prevItem.id, { startTime: item.startTime, endTime: item.endTime });
    } else if (direction === 'down' && index < items.length - 1) {
      const item = items[index];
      const nextItem = items[index + 1];
      // Swap times
      onUpdate(item.id, { startTime: nextItem.startTime, endTime: nextItem.endTime });
      onUpdate(nextItem.id, { startTime: item.startTime, endTime: item.endTime });
    }
  };

  return (
    <section id="agenda" className="space-y-4">
      {/* Section header with color stripe */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-violet-500">Agenda</h2>
          <div className="flex items-center gap-2">
          {currentBlockIndex >= 0 && (
            <button
              onClick={jumpToNow}
              className="px-3 py-1.5 text-sm bg-violet-500/10 text-violet-500 rounded-lg hover:bg-violet-500/20 transition-colors"
            >
              Jump to Now
            </button>
          )}
            <button
              onClick={handleAIGenerate}
              disabled={!isOnline || isGenerating}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all",
                "bg-violet-500 text-white",
                isOnline && !isGenerating && "hover:bg-violet-600",
                (!isOnline || isGenerating) && "opacity-50 cursor-not-allowed"
              )}
              title={!isOnline ? "Needs connection" : undefined}
            >
              <span>🤖</span>
              <span>{isGenerating ? "Generating..." : "AI: craft today"}</span>
            </button>
          </div>
        </div>
        {/* Color stripe */}
        <div className="h-1 bg-gradient-to-r from-violet-500 to-violet-400 rounded-full" />
      </div>

      {/* Quick Add */}
      <div className="flex gap-2 p-3 bg-violet-500/5 border border-violet-500/20 rounded-xl">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Add block..."
          className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50"
        />
        <input
          type="time"
          value={newStart}
          onChange={(e) => setNewStart(e.target.value)}
          className="px-2 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50"
        />
        <input
          type="time"
          value={newEnd}
          onChange={(e) => setNewEnd(e.target.value)}
          className="px-2 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50"
        />
        <button
          onClick={handleAdd}
          className="p-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors"
          aria-label="Add block"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No blocks scheduled</p>
            <p className="text-sm mt-1">Add your first time block above</p>
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id}
              ref={index === currentBlockIndex ? currentBlockRef : null}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all",
                "bg-violet-500/5 border border-violet-500/20 hover:border-violet-500/40",
                index === currentBlockIndex && "bg-violet-500/10 border-violet-500/50 shadow-lg shadow-violet-500/20",
                item.completed && "opacity-60"
              )}
            >
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => onToggle(item.id)}
                className="w-5 h-5 rounded border-2 border-violet-500 text-violet-500 focus:ring-violet-500/50"
              />
              
              <div className="flex-1 space-y-1">
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => onUpdate(item.id, { title: e.target.value })}
                  className={cn(
                    "w-full bg-transparent font-medium focus:outline-none",
                    item.completed && "line-through"
                  )}
                />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="time"
                    value={item.startTime}
                    onChange={(e) => onUpdate(item.id, { startTime: e.target.value })}
                    className="bg-transparent focus:outline-none"
                  />
                  <span>–</span>
                  <input
                    type="time"
                    value={item.endTime}
                    onChange={(e) => onUpdate(item.id, { endTime: e.target.value })}
                    className="bg-transparent focus:outline-none"
                  />
                  {index === currentBlockIndex && (
                    <span className="text-violet-500 font-medium animate-pulse">Now</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0}
                  className="p-1.5 rounded hover:bg-violet-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Move up"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moveItem(index, 'down')}
                  disabled={index === items.length - 1}
                  className="p-1.5 rounded hover:bg-violet-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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