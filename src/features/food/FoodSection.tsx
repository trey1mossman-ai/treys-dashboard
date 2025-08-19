import { useState } from 'react';
import { Plus, Trash2, Utensils, Bot, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FoodItem } from '@/types/daily';

interface FoodSectionProps {
  items: FoodItem[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  onAdd: (item: Omit<FoodItem, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<FoodItem>) => void;
  onDelete: (id: string) => void;
  onAIGenerate: () => Promise<void>;
  isOnline: boolean;
}

export function FoodSection({ 
  items, 
  totals,
  onAdd, 
  onUpdate, 
  onDelete,
  onAIGenerate,
  isOnline 
}: FoodSectionProps) {
  const [newName, setNewName] = useState('');
  const [newCalories, setNewCalories] = useState('');
  const [newProtein, setNewProtein] = useState('');
  const [newCarbs, setNewCarbs] = useState('');
  const [newFat, setNewFat] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAdd({
      name: newName,
      calories: newCalories ? parseInt(newCalories) : undefined,
      protein: newProtein ? parseInt(newProtein) : undefined,
      carbs: newCarbs ? parseInt(newCarbs) : undefined,
      fat: newFat ? parseInt(newFat) : undefined
    });
    setNewName('');
    setNewCalories('');
    setNewProtein('');
    setNewCarbs('');
    setNewFat('');
  };

  const handleAIGenerate = async () => {
    setIsGenerating(true);
    try {
      await onAIGenerate();
    } finally {
      setIsGenerating(false);
    }
  };

  const copyTotals = () => {
    const text = `Daily Totals: ${totals.calories} kcal | ${totals.protein}g P | ${totals.carbs}g C | ${totals.fat}g F`;
    navigator.clipboard.writeText(text);
  };

  return (
    <section id="food" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-emerald-500">Food</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAIGenerate}
            disabled={!isOnline || isGenerating}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all",
              "bg-emerald-500/10 text-emerald-500",
              isOnline && !isGenerating && "hover:bg-emerald-500/20",
              (!isOnline || isGenerating) && "opacity-50 cursor-not-allowed"
            )}
            title={!isOnline ? "Needs connection" : undefined}
          >
            <Bot className={cn("w-4 h-4", isGenerating && "animate-spin")} />
            <span>AI: craft today</span>
          </button>
        </div>
      </div>

      {/* Totals */}
      <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
        <div className="flex items-center gap-4 text-sm">
          <span className="font-medium text-emerald-600">Daily Totals:</span>
          <span>{totals.calories} kcal</span>
          <span>{totals.protein}g P</span>
          <span>{totals.carbs}g C</span>
          <span>{totals.fat}g F</span>
        </div>
        <button
          onClick={copyTotals}
          className="p-1.5 rounded hover:bg-emerald-500/20 transition-colors"
          aria-label="Copy totals"
        >
          <Copy className="w-4 h-4 text-emerald-600" />
        </button>
      </div>

      {/* Quick Add */}
      <div className="space-y-2 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Meal name..."
            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <button
            onClick={handleAdd}
            className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            aria-label="Add meal"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            value={newCalories}
            onChange={(e) => setNewCalories(e.target.value)}
            placeholder="kcal"
            className="flex-1 px-2 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <input
            type="number"
            value={newProtein}
            onChange={(e) => setNewProtein(e.target.value)}
            placeholder="P(g)"
            className="flex-1 px-2 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <input
            type="number"
            value={newCarbs}
            onChange={(e) => setNewCarbs(e.target.value)}
            placeholder="C(g)"
            className="flex-1 px-2 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <input
            type="number"
            value={newFat}
            onChange={(e) => setNewFat(e.target.value)}
            placeholder="F(g)"
            className="flex-1 px-2 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Utensils className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No meals logged</p>
            <p className="text-sm mt-1">Add your first meal above</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-emerald-500/20 hover:border-emerald-500/40 transition-all"
            >
              <div className="flex-1">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => onUpdate(item.id, { name: e.target.value })}
                  className="w-full bg-transparent font-medium focus:outline-none"
                />
                <div className="flex gap-3 mt-1">
                  <input
                    type="number"
                    value={item.calories || ''}
                    onChange={(e) => onUpdate(item.id, { calories: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="kcal"
                    className="w-16 px-1.5 py-0.5 text-sm bg-transparent border-b border-border focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    type="number"
                    value={item.protein || ''}
                    onChange={(e) => onUpdate(item.id, { protein: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="P"
                    className="w-12 px-1.5 py-0.5 text-sm bg-transparent border-b border-border focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    type="number"
                    value={item.carbs || ''}
                    onChange={(e) => onUpdate(item.id, { carbs: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="C"
                    className="w-12 px-1.5 py-0.5 text-sm bg-transparent border-b border-border focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    type="number"
                    value={item.fat || ''}
                    onChange={(e) => onUpdate(item.id, { fat: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="F"
                    className="w-12 px-1.5 py-0.5 text-sm bg-transparent border-b border-border focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                onClick={() => onDelete(item.id)}
                className="p-1.5 rounded hover:bg-red-500/10 hover:text-red-500 transition-colors"
                aria-label="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}