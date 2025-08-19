import { useState } from 'react';
import { Plus, Trash2, Pill, Clock, CheckCircle2 } from 'lucide-react';
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

const timeConfig = {
  AM: {
    label: 'Morning',
    icon: '🌅',
    color: 'sky',
    bgClass: 'bg-sky-500/10',
    borderClass: 'border-sky-500/30',
    textClass: 'text-sky-500'
  },
  Pre: {
    label: 'Pre-Workout',
    icon: '💪',
    color: 'orange',
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-orange-500/30',
    textClass: 'text-orange-500'
  },
  Post: {
    label: 'Post-Workout',
    icon: '🥤',
    color: 'purple',
    bgClass: 'bg-purple-500/10',
    borderClass: 'border-purple-500/30',
    textClass: 'text-purple-500'
  },
  PM: {
    label: 'Evening',
    icon: '🌙',
    color: 'indigo',
    bgClass: 'bg-indigo-500/10',
    borderClass: 'border-indigo-500/30',
    textClass: 'text-indigo-500'
  }
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
      {/* Section header with color stripe */}
      <div>
        <div className="flex items-center justify-between mb-2">
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
              "bg-sky-500 text-white",
              isOnline && !isGenerating && "hover:bg-sky-600",
              (!isOnline || isGenerating) && "opacity-50 cursor-not-allowed"
            )}
            title={!isOnline ? "Needs connection" : undefined}
          >
            <span>🤖</span>
            <span>{isGenerating ? "Generating..." : "AI: craft today"}</span>
          </button>
        </div>
        {/* Color stripe */}
        <div className="h-1 bg-gradient-to-r from-sky-500 to-sky-400 rounded-full" />
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

      {/* Items organized by time lanes */}
      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Pill className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No supplements tracked</p>
            <p className="text-sm mt-1">Add your first supplement above</p>
          </div>
        ) : (
          <div className="space-y-4">
            {timeOptions.map(timeSlot => {
              const timeItems = items.filter(item => item.time === timeSlot);
              const config = timeConfig[timeSlot];
              const takenInSlot = timeItems.filter(item => item.taken).length;
              
              return (
                <div key={timeSlot} className="space-y-2">
                  {/* Time lane header */}
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{config.icon}</span>
                    <div className="flex items-center gap-2 flex-1">
                      <h3 className={cn("font-semibold", config.textClass)}>
                        {config.label}
                      </h3>
                      {timeItems.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {takenInSlot}/{timeItems.length}
                        </span>
                      )}
                      {timeItems.length > 0 && takenInSlot === timeItems.length && (
                        <CheckCircle2 className={cn("w-4 h-4", config.textClass)} />
                      )}
                    </div>
                    <div className={cn(
                      "h-px flex-1",
                      config.bgClass
                    )} />
                  </div>
                  
                  {/* Items in this time lane */}
                  {timeItems.length === 0 ? (
                    <div className={cn(
                      "p-3 rounded-xl text-center text-sm text-muted-foreground",
                      config.bgClass,
                      "border border-dashed",
                      config.borderClass
                    )}>
                      No {config.label.toLowerCase()} supplements
                    </div>
                  ) : (
                    <div className="grid gap-2 pl-7">
                      {timeItems.map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl transition-all",
                            config.bgClass,
                            "border",
                            config.borderClass,
                            "hover:shadow-lg",
                            item.taken && "opacity-60"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={item.taken}
                            onChange={() => onToggle(item.id)}
                            className={cn(
                              "w-5 h-5 rounded border-2",
                              `border-${config.color}-500 text-${config.color}-500 focus:ring-${config.color}-500/50`
                            )}
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
                                placeholder="Dose"
                              />
                            )}
                          </div>

                          <Clock className={cn("w-4 h-4", config.textClass)} />

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
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}