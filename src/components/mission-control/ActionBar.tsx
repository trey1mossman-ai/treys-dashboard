import { useState } from 'react';
import { useMissionControlStore } from '@/stores/missionControlStore';
import { cn } from '@/lib/utils';
import { Scissors, Utensils, ShoppingCart, StickyNote, Plus, Send, Loader2 } from 'lucide-react';

export function ActionBar() {
  const { triggerBabyAgent, addNotification } = useMissionControlStore();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddText, setQuickAddText] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  
  const actions = [
    {
      id: 'book_haircut',
      label: 'Book Haircut',
      icon: Scissors,
      intent: 'book_haircut',
      defaultParams: {
        window: 'Fri 2-6pm',
        barber: 'any near downtown'
      }
    },
    {
      id: 'order_food',
      label: 'Order Food',
      icon: Utensils,
      intent: 'order_food',
      defaultParams: {
        meal: 'lunch',
        preferences: 'healthy, high protein'
      }
    },
    {
      id: 'grocery_list',
      label: 'Grocery List',
      icon: ShoppingCart,
      intent: 'create_grocery_list',
      defaultParams: {
        type: 'weekly',
        focus: 'meal_prep'
      }
    }
  ];
  
  const handleAction = async (action: typeof actions[0]) => {
    setIsProcessing(action.id);
    
    try {
      await triggerBabyAgent({
        intent: action.intent,
        parameters: action.defaultParams,
        correlation_id: `action-${action.id}-${Date.now()}`
      });
      
      addNotification({
        type: 'agent_result',
        message: `${action.label} task initiated`,
        severity: 'info',
        related_ids: []
      });
    } catch (error) {
      console.error(`Failed to trigger ${action.label}:`, error);
      addNotification({
        type: 'agent_result',
        message: `Failed to initiate ${action.label}`,
        severity: 'warn',
        related_ids: []
      });
    } finally {
      setIsProcessing(null);
    }
  };
  
  const handleQuickAdd = async () => {
    if (!quickAddText.trim()) return;
    
    setIsProcessing('quick_add');
    
    try {
      await triggerBabyAgent({
        intent: 'process_request',
        parameters: {
          text: quickAddText,
          source: 'quick_add'
        },
        correlation_id: `quick-add-${Date.now()}`
      });
      
      addNotification({
        type: 'agent_result',
        message: 'Request sent to your agent',
        severity: 'info',
        related_ids: []
      });
      
      setQuickAddText('');
      setQuickAddOpen(false);
    } catch (error) {
      console.error('Failed to send quick add:', error);
      addNotification({
        type: 'agent_result',
        message: 'Failed to send request',
        severity: 'warn',
        related_ids: []
      });
    } finally {
      setIsProcessing(null);
    }
  };
  
  return (
    <div className="mc-action-bar">
      {/* Action Buttons */}
      <div className="flex gap-2 flex-1">
        {actions.map(action => (
          <button
            key={action.id}
            onClick={() => handleAction(action)}
            disabled={isProcessing === action.id}
            className={cn(
              "mc-button mc-button-secondary flex items-center gap-2 px-3 py-2",
              "hover:border-mc-accent-cyan hover:text-mc-accent-cyan",
              isProcessing === action.id && "opacity-50 cursor-not-allowed"
            )}
          >
            {isProcessing === action.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <action.icon className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">{action.label}</span>
          </button>
        ))}
      </div>
      
      {/* Quick Add */}
      <div className="relative">
        {!quickAddOpen ? (
          <button
            onClick={() => setQuickAddOpen(true)}
            className="mc-button mc-button-primary flex items-center gap-2 px-3 py-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Quick Add</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="relative">
              <StickyNote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mc-text-muted" />
              <input
                type="text"
                value={quickAddText}
                onChange={(e) => setQuickAddText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleQuickAdd();
                  if (e.key === 'Escape') {
                    setQuickAddText('');
                    setQuickAddOpen(false);
                  }
                }}
                placeholder="Send to agent..."
                className="pl-10 pr-3 py-2 bg-mc-surface border border-mc-border rounded-lg 
                         text-sm text-mc-text-primary placeholder:text-mc-text-muted
                         focus:outline-none focus:border-mc-accent-cyan focus:ring-1 focus:ring-mc-accent-cyan/50
                         w-[200px] sm:w-[300px]"
                autoFocus
              />
            </div>
            
            <button
              onClick={handleQuickAdd}
              disabled={!quickAddText.trim() || isProcessing === 'quick_add'}
              className={cn(
                "mc-button mc-button-primary p-2",
                (!quickAddText.trim() || isProcessing === 'quick_add') && "opacity-50 cursor-not-allowed"
              )}
            >
              {isProcessing === 'quick_add' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
            
            <button
              onClick={() => {
                setQuickAddText('');
                setQuickAddOpen(false);
              }}
              className="p-2 text-mc-text-muted hover:text-mc-text-primary transition-colors"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}