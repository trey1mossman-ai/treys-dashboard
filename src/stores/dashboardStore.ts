// Normalized dashboard state management with optimistic updates
import { create } from 'zustand';
import { DashboardAPI, eventStream, startLiveUpdates } from '../lib/apiClient';

// Types matching backend schema
export interface AgendaItem {
  id: string;
  title: string;
  source: 'calendar' | 'supplements' | 'workout' | 'tasks' | 'meals';
  start_time: string;
  end_time?: string;
  status: 'pending' | 'done' | 'skipped';
  metadata?: any;
  display_notes?: string;
  updated_at: string;
}

export interface WorkoutItem {
  plan_name: string;
  blocks: {
    name: string;
    sets: number;
    reps: string;
  }[];
  intensity_flag: 'low' | 'moderate' | 'high';
  adjustments?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  current_qty: number;
  min_qty: number;
  reorder_link?: string;
  last_updated: string;
  is_low: boolean;
}

export interface StatusSnapshot {
  captured_at: string;
  sleep_hours: number | null;
  recovery_proxy: number | null;
  training_load_today: 'low' | 'moderate' | 'high' | null;
  nutrition_compliance_7d: number | null;
  stress_flag: 'green' | 'yellow' | 'red' | null;
  reason?: string;
}

export interface Notification {
  id: string;
  type: 'error' | 'info' | 'schedule_change' | 'agent_result';
  severity: 'info' | 'warn' | 'critical';
  message: string;
  related_ids?: string[];
  created_at: string;
}

// Normalized state structure
export interface DashboardState {
  // Normalized data
  agenda: {
    byId: Record<string, AgendaItem>;
    idsByDay: Record<string, string[]>; // YYYY-MM-DD -> item IDs
    loading: boolean;
    error: string | null;
  };
  
  workout: {
    item: WorkoutItem | null;
    loading: boolean;
    error: string | null;
  };
  
  inventory: {
    byId: Record<string, InventoryItem>;
    categories: string[];
    loading: boolean;
    error: string | null;
  };
  
  status: {
    latest: StatusSnapshot | null;
    todayReady: {
      run_at: string;
      sources: string[];
      updated_at: string;
    } | null;
    loading: boolean;
    error: string | null;
  };
  
  notifications: {
    list: Notification[];
    unreadCount: number;
    loading: boolean;
    error: string | null;
  };
  
  // UI state
  ui: {
    selectedId: string | null;
    now: string; // Current time for "Jump to Now" functionality
    currentDate: string; // YYYY-MM-DD
    viewMode: 'today' | 'preview' | 'meta';
    sidebarOpen: boolean;
  };
  
  // Actions
  actions: {
    // Data loading
    loadAgenda: (date?: string, source?: string) => Promise<void>;
    loadStatus: () => Promise<void>;
    loadInventory: (lowOnly?: boolean, category?: string) => Promise<void>;
    
    // Commands (with optimistic updates)
    markComplete: (id: string, source: string) => Promise<void>;
    queueReorder: (id: string) => Promise<void>;
    triggerBabyAgent: (intent: string, parameters?: any) => Promise<void>;
    
    // UI actions
    setSelectedId: (id: string | null) => void;
    setCurrentDate: (date: string) => void;
    setViewMode: (mode: 'today' | 'preview' | 'meta') => void;
    setSidebarOpen: (open: boolean) => void;
    updateNow: () => void;
    
    // Notifications
    markNotificationRead: (id: string) => void;
    clearAllNotifications: () => void;
    
    // Live updates
    startLiveUpdates: () => void;
    stopLiveUpdates: () => void;
    handleLiveUpdate: (update: any) => void;
  };
}

// Utility functions
function getDayKey(dateString: string): string {
  return dateString.split('T')[0]; // Extract YYYY-MM-DD
}

function normalizeAgendaItems(items: AgendaItem[]): {
  byId: Record<string, AgendaItem>;
  idsByDay: Record<string, string[]>;
} {
  const byId: Record<string, AgendaItem> = {};
  const idsByDay: Record<string, string[]> = {};
  
  items.forEach(item => {
    byId[item.id] = item;
    const dayKey = getDayKey(item.start_time);
    
    if (!idsByDay[dayKey]) {
      idsByDay[dayKey] = [];
    }
    idsByDay[dayKey].push(item.id);
  });
  
  // Sort IDs by start_time within each day
  Object.keys(idsByDay).forEach(dayKey => {
    idsByDay[dayKey].sort((a, b) => {
      const itemA = byId[a];
      const itemB = byId[b];
      return new Date(itemA.start_time).getTime() - new Date(itemB.start_time).getTime();
    });
  });
  
  return { byId, idsByDay };
}

function normalizeInventoryItems(items: InventoryItem[]): {
  byId: Record<string, InventoryItem>;
  categories: string[];
} {
  const byId: Record<string, InventoryItem> = {};
  const categoriesSet = new Set<string>();
  
  items.forEach(item => {
    byId[item.id] = item;
    categoriesSet.add(item.category);
  });
  
  return {
    byId,
    categories: Array.from(categoriesSet).sort()
  };
}

// Create the store
export const useDashboardStore = create<DashboardState>((set, get) => ({
  // Initial state
  agenda: {
    byId: {},
    idsByDay: {},
    loading: false,
    error: null
  },
  
  workout: {
    item: null,
    loading: false,
    error: null
  },
  
  inventory: {
    byId: {},
    categories: [],
    loading: false,
    error: null
  },
  
  status: {
    latest: null,
    todayReady: null,
    loading: false,
    error: null
  },
  
  notifications: {
    list: [],
    unreadCount: 0,
    loading: false,
    error: null
  },
  
  ui: {
    selectedId: null,
    now: new Date().toISOString(),
    currentDate: new Date().toISOString().split('T')[0],
    viewMode: 'today',
    sidebarOpen: false
  },
  
  // Actions
  actions: {
    async loadAgenda(date, source) {
      set(state => ({
        agenda: { ...state.agenda, loading: true, error: null }
      }));
      
      try {
        const response = await DashboardAPI.getAgenda(date, source);
        
        if (response.error) {
          throw new Error(response.reason || response.error);
        }
        
        const { byId, idsByDay } = normalizeAgendaItems(response.data.items);
        
        set(state => ({
          agenda: {
            ...state.agenda,
            byId: { ...state.agenda.byId, ...byId },
            idsByDay: { ...state.agenda.idsByDay, ...idsByDay },
            loading: false,
            error: null
          }
        }));
        
      } catch (error) {
        set(state => ({
          agenda: {
            ...state.agenda,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load agenda'
          }
        }));
      }
    },
    
    async loadStatus() {
      set(state => ({
        status: { ...state.status, loading: true, error: null }
      }));
      
      try {
        const response = await DashboardAPI.getStatus();
        
        if (response.error) {
          throw new Error(response.reason || response.error);
        }
        
        set(state => ({
          status: {
            ...state.status,
            latest: response.data.latest_status,
            todayReady: response.data.today_ready,
            loading: false,
            error: null
          },
          notifications: {
            ...state.notifications,
            list: response.data.recent_notifications || [],
            unreadCount: (response.data.recent_notifications || []).filter((n: Notification) => 
              n.severity === 'critical' || n.severity === 'warn'
            ).length
          }
        }));
        
      } catch (error) {
        set(state => ({
          status: {
            ...state.status,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load status'
          }
        }));
      }
    },
    
    async loadInventory(lowOnly, category) {
      set(state => ({
        inventory: { ...state.inventory, loading: true, error: null }
      }));
      
      try {
        const response = await DashboardAPI.getInventory(lowOnly, category);
        
        if (response.error) {
          throw new Error(response.reason || response.error);
        }
        
        const { byId, categories } = normalizeInventoryItems(response.data.items);
        
        set(state => ({
          inventory: {
            ...state.inventory,
            byId,
            categories,
            loading: false,
            error: null
          }
        }));
        
      } catch (error) {
        set(state => ({
          inventory: {
            ...state.inventory,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load inventory'
          }
        }));
      }
    },
    
    async markComplete(id, source) {
      // Optimistic update
      set(state => ({
        agenda: {
          ...state.agenda,
          byId: {
            ...state.agenda.byId,
            [id]: state.agenda.byId[id] ? {
              ...state.agenda.byId[id],
              status: 'done' as const,
              updated_at: new Date().toISOString()
            } : state.agenda.byId[id]
          }
        }
      }));
      
      try {
        const response = await DashboardAPI.markComplete(id, source);
        
        if (response.error && !response.replayed) {
          // Revert optimistic update on error
          set(state => ({
            agenda: {
              ...state.agenda,
              byId: {
                ...state.agenda.byId,
                [id]: state.agenda.byId[id] ? {
                  ...state.agenda.byId[id],
                  status: 'pending' as const
                } : state.agenda.byId[id]
              }
            }
          }));
          throw new Error(response.reason || response.error);
        }
        
        // If replayed, the optimistic update is already correct
        if (response.data && !response.replayed) {
          set(state => ({
            agenda: {
              ...state.agenda,
              byId: {
                ...state.agenda.byId,
                [id]: {
                  ...state.agenda.byId[id],
                  status: response.data.status,
                  updated_at: response.data.updated_at
                }
              }
            }
          }));
        }
        
      } catch (error) {
        console.error('Failed to mark item complete:', error);
        // Optimistic update already reverted above
      }
    },
    
    async queueReorder(id) {
      try {
        const response = await DashboardAPI.queueReorder(id);
        
        if (response.error && !response.replayed) {
          throw new Error(response.reason || response.error);
        }
        
        // Could add visual indicator that item is queued for reordering
        console.log(`Item ${id} queued for reordering`);
        
      } catch (error) {
        console.error('Failed to queue reorder:', error);
      }
    },
    
    async triggerBabyAgent(intent, parameters = {}) {
      try {
        const response = await DashboardAPI.triggerBabyAgent(intent, parameters);
        
        if (response.error && !response.replayed) {
          throw new Error(response.reason || response.error);
        }
        
        console.log(`Baby agent triggered: ${intent}`, response.data);
        
      } catch (error) {
        console.error('Failed to trigger baby agent:', error);
      }
    },
    
    setSelectedId: (id) => {
      set(state => ({
        ui: { ...state.ui, selectedId: id }
      }));
    },
    
    setCurrentDate: (date) => {
      set(state => ({
        ui: { ...state.ui, currentDate: date }
      }));
    },
    
    setViewMode: (mode) => {
      set(state => ({
        ui: { ...state.ui, viewMode: mode }
      }));
    },
    
    setSidebarOpen: (open) => {
      set(state => ({
        ui: { ...state.ui, sidebarOpen: open }
      }));
    },
    
    updateNow: () => {
      set(state => ({
        ui: { ...state.ui, now: new Date().toISOString() }
      }));
    },
    
    markNotificationRead: (id) => {
      set(state => ({
        notifications: {
          ...state.notifications,
          list: state.notifications.list.map(n => 
            n.id === id ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, state.notifications.unreadCount - 1)
        }
      }));
    },
    
    clearAllNotifications: () => {
      set(state => ({
        notifications: {
          ...state.notifications,
          list: [],
          unreadCount: 0
        }
      }));
    },
    
    startLiveUpdates: () => {
      startLiveUpdates();
      
      // Set up event listeners
      eventStream.on('notification.created', (data) => {
        get().actions.handleLiveUpdate({ type: 'notification.created', payload: data });
      });
      
      eventStream.on('agenda.updated', (data) => {
        get().actions.handleLiveUpdate({ type: 'agenda.updated', payload: data });
      });
      
      eventStream.on('status.updated', (data) => {
        get().actions.handleLiveUpdate({ type: 'status.updated', payload: data });
      });
      
      eventStream.on('inventory.updated', (data) => {
        get().actions.handleLiveUpdate({ type: 'inventory.updated', payload: data });
      });
    },
    
    stopLiveUpdates: () => {
      eventStream.disconnect();
    },
    
    handleLiveUpdate: (update) => {
      switch (update.type) {
        case 'notification.created':
          set(state => ({
            notifications: {
              ...state.notifications,
              list: [update.payload, ...state.notifications.list].slice(0, 10),
              unreadCount: state.notifications.unreadCount + 1
            }
          }));
          break;
          
        case 'agenda.updated':
          // Reload agenda for the affected date
          const dayKey = getDayKey(update.payload.start_time);
          if (dayKey === get().ui.currentDate) {
            get().actions.loadAgenda(dayKey);
          }
          break;
          
        case 'status.updated':
          get().actions.loadStatus();
          break;
          
        case 'inventory.updated':
          get().actions.loadInventory();
          break;
      }
    }
  }
}));

// Selectors for convenience
export const useAgendaForDay = (date: string) => {
  return useDashboardStore(state => {
    const itemIds = state.agenda.idsByDay[date] || [];
    return itemIds.map(id => state.agenda.byId[id]).filter(Boolean);
  });
};

export const useCurrentDayAgenda = () => {
  return useDashboardStore(state => {
    const date = state.ui.currentDate;
    const itemIds = state.agenda.idsByDay[date] || [];
    return itemIds.map(id => state.agenda.byId[id]).filter(Boolean);
  });
};

export const useLowInventoryItems = () => {
  return useDashboardStore(state => 
    Object.values(state.inventory.byId).filter(item => item.is_low)
  );
};

export const useCriticalNotifications = () => {
  return useDashboardStore(state => 
    state.notifications.list.filter(n => n.severity === 'critical')
  );
};
// SSE Integration Usage:
// Import { useSSE } from '../hooks/useSSE' in components
// This will automatically handle live updates from the server
// The hook will call store actions when events are received
