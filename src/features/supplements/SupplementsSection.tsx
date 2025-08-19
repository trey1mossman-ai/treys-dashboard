import { useState } from 'react';
import { Plus, Trash2, Pill, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SupplementItem } from '@/types/daily';

interface SupplementsSectionProps {
  items: SupplementItem[];
  onAdd: (item: Omit<SupplementItem, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<SupplementItem>) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onAIGenerate: () => Promise<void>;
  isOnline: boolean;
}

const timeOptions = ['AM', 'Pre', 'Post', 'PM'] as const;

const timeColors = {
  AM: 'text-blue-500 border-blue-500/30 bg-blue-500/10',
  Pre: 'text-orange-500 border-orange-500/30 bg-orange-500/10',
  Post: 'text-purple-500 border-purple-500/30 bg-purple-500/10',
  PM: 'text-indigo-500 border-indigo-500/30 bg-indigo-500/10'
};

export function SupplementsSection({ 
  items, 
  onAdd, 
  onUpdate, 
  onDelete,
  onToggle,
  onAIGenerate,
  isOnline 
}: SupplementsSectionProps) {
  const [newName, setNewName] = useState('');
  const [newDose, setNewDose] = useState('');
  const [newTime, setNewTime] = useState<'AM' | 'Pre' | 'Post' | 'PM'>('AM');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAdd({
      name: newName,
      dose: newDose || undefined,
      time: newTime,
      taken: false
    });
    setNewName('');
    setNewDose('');
  };

  const handleAIGenerate = async () => {
    setIsGenerating(true);
    try {
      await onAIGenerate();
    } finally {
      setIsGenerating(false);
    }
  };

  const takenCount = items.filter(item => item.taken).length;

  return (
    <section id="supplements" className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-sky-500">Supplements</h2>
          {items.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {takenCount}/{items.length} taken
            </span>
          )}
        </div>
        <button
          onClick={handleAIGenerate}
          disabled={!isOnline || isGenerating}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all",
            "bg-sky-500/10 text-sky-500",
            isOnline && !isGenerating && "hover:bg-sky-500/20",
            (!isOnline || isGenerating) && "opacity-50 cursor-not-allowed"
          )}
          title={!isOnline ? "Needs connection" : undefined}
        >
          <Bot className={cn("w-4 h-4", isGenerating && "animate-spin")} />
          <span>AI: craft today</span>
        </button>
      </div>

      {/* Quick Add */}
      <div className="flex gap-2 p-3 bg-sky-500/5 border border-sky-500/20 rounded-xl">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Supplement name..."
          className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/50"
        />
        <input
          type="text"
          value={newDose}
          onChange={(e) => setNewDose(e.target.value)}
          placeholder="Dose"
          className="w-24 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/50"
        />
        <select
          value={newTime}
          onChange={(e) => setNewTime(e.target.value as typeof newTime)}
          className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/50"
        >
          {timeOptions.map(time => (
            <option key={time} value={time}>{time}</option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          className="p-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
          aria-label="Add supplement"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Pill className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No supplements tracked</p>
            <p className="text-sm mt-1">Add your first supplement above</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {timeOptions.map(timeSlot => {
              const timeItems = items.filter(item => item.time === timeSlot);
              if (timeItems.length === 0) return null;
              
              return (
                <div key={timeSlot} className="space-y-2">
                  <div className={cn(
                    "px-2 py-1 rounded-lg text-xs font-medium inline-block",
                    timeColors[timeSlot]
                  )}>
                    {timeSlot}
                  </div>
                  {timeItems.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl transition-all",
                        "border border-sky-500/20 hover:border-sky-500/40",
                        item.taken && "opacity-60"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={item.taken}
                        onChange={() => onToggle(item.id)}
                        className="w-5 h-5 rounded border-2 border-sky-500 text-sky-500 focus:ring-sky-500/50"
                      />
                      
                      <div className="flex-1">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => onUpdate(item.id, { name: e.target.value })}
                          className={cn(
                            "w-full bg-transparent font-medium focus:outline-none",
                            item.taken && "line-through"
                          )}
                        />
                        {item.dose && (
                          <input
                            type="text"
                            value={item.dose}
                            onChange={(e) => onUpdate(item.id, { dose: e.target.value })}
                            className="text-sm text-muted-foreground bg-transparent focus:outline-none"
                          />
                        )}
                      </div>

                      <select
                        value={item.time}
                        onChange={(e) => onUpdate(item.id, { time: e.target.value as typeof item.time })}
                        className="px-2 py-1 bg-transparent border border-border rounded text-sm focus:outline-none"
                      >
                        {timeOptions.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>

                      <button
                        onClick={() => onDelete(item.id)}
                        className="p-1.5 rounded hover:bg-red-500/10 hover:text-red-500 transition-colors"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}