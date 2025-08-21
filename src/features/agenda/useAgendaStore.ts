import { create } from 'zustand';
import { localBrain } from '@/lib/database/local-brain';

interface AgendaItem {
  id?: string;
  title: string;
  startTime: string;
  endTime?: string;
  tag: string;
  priority: 'low' | 'medium' | 'high';
  completed?: boolean;
  duration?: number;
}

interface AgendaStore {
  items: AgendaItem[];
  addAgendaItem: (item: AgendaItem) => Promise<void>;
  toggleComplete: (itemId: string) => Promise<void>;
  updateItem: (id: string, updates: Partial<AgendaItem>) => void;
  removeItem: (id: string) => void;
}

export const useAgendaStore = create<AgendaStore>((set, get) => ({
  items: [],
  
  addAgendaItem: async (item: AgendaItem) => {
    const newItem = {
      ...item,
      id: item.id || `agenda-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    set(state => ({
      items: [...state.items, newItem].sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      )
    }));
    
    // Log event to local brain
    await localBrain.logEvent('agenda_item_added', {
      title: item.title,
      startTime: item.startTime,
      tag: item.tag
    });
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('agenda-updated'));
  },
  
  toggleComplete: async (itemId: string) => {
    const { items } = get();
    const item = items.find(i => i.id === itemId);
    
    if (item) {
      set(state => ({
        items: state.items.map(i => 
          i.id === itemId ? { ...i, completed: !i.completed } : i
        )
      }));
      
      // Log event to local brain
      await localBrain.logEvent('task_completed', {
        id: itemId,
        title: item.title,
        completedAt: new Date()
      });
      
      // Dispatch event for UI updates
      window.dispatchEvent(new CustomEvent('agenda-updated'));
    }
  },
  
  updateItem: (id: string, updates: Partial<AgendaItem>) => {
    set(state => ({
      items: state.items.map(item => 
        item.id === id ? { ...item, ...updates } : item
      ).sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      )
    }));
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('agenda-updated'));
  },
  
  removeItem: (id: string) => {
    set(state => ({
      items: state.items.filter(item => item.id !== id)
    }));
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('agenda-updated'));
  }
}));