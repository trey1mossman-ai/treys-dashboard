import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  MissionControlState,
  MissionControlSettings,
  AgendaItem,
  StatusSnapshot,
  InventoryItem,
  Notification,
  MarkCompleteCommand,
  BabyAgentCommand,
  QueueReorderCommand
} from '@/types/mission-control';

interface MissionControlStore extends MissionControlState {
  settings: MissionControlSettings;
  
  // Agenda actions
  setAgenda: (items: AgendaItem[]) => void;
  updateAgendaItem: (id: string, updates: Partial<AgendaItem>) => void;
  markItemComplete: (command: MarkCompleteCommand) => Promise<void>;
  
  // Status actions
  setStatus: (status: StatusSnapshot) => void;
  
  // Inventory actions
  setInventory: (items: InventoryItem[]) => void;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;
  queueReorder: (command: QueueReorderCommand) => Promise<void>;
  
  // Notification actions
  addNotification: (notification: Omit<Notification, 'id' | 'created_at'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Baby Agent actions
  triggerBabyAgent: (command: BabyAgentCommand) => Promise<void>;
  
  // UI actions
  selectItem: (id: string | null) => void;
  setLoading: (key: keyof MissionControlState['loading'], value: boolean) => void;
  
  // Settings actions
  updateSettings: (settings: Partial<MissionControlSettings>) => void;
  
  // Daily build
  executeDailyBuild: () => Promise<void>;
}

const defaultSettings: MissionControlSettings = {
  webhook_urls: {},
  outbound_urls: {},
  hmac_secret: '',
  timezone: 'America/Denver',
  daily_build_time: '05:30',
  refresh_window: {
    enabled: true,
    start: '08:00',
    end: '18:00'
  },
  display: {
    reduce_motion: false,
    show_supplements: true,
    show_workout: true,
    show_tasks: true,
    show_calendar: true,
    show_telemetry: true,
    show_inventory: true
  },
  thresholds: {
    low_inventory_percent: 20,
    reorder_days_buffer: 7
  }
};

export const useMissionControlStore = create<MissionControlStore>()(
  persist(
    (set, get) => ({
      // Initial state
      agenda: [],
      status: null,
      inventory: [],
      notifications: [],
      selectedItemId: null,
      loading: {
        agenda: false,
        status: false,
        inventory: false
      },
      lastUpdated: {
        agenda: null,
        status: null,
        inventory: null
      },
      settings: defaultSettings,

      // Agenda actions
      setAgenda: (items) => set({ 
        agenda: items,
        lastUpdated: { ...get().lastUpdated, agenda: new Date().toISOString() }
      }),
      
      updateAgendaItem: (id, updates) => set((state) => ({
        agenda: state.agenda.map(item => 
          item.id === id ? { ...item, ...updates } : item
        )
      })),
      
      markItemComplete: async (command) => {
        // Optimistic update
        get().updateAgendaItem(command.agenda_item_id, { 
          status: command.status 
        });
        
        try {
          const { settings } = get();
          if (!settings.outbound_urls.mark_complete) {
            throw new Error('Mark complete URL not configured');
          }
          
          const response = await fetch(settings.outbound_urls.mark_complete, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-HMAC-Signature': await generateHMAC(command, settings.hmac_secret),
              'X-Timestamp': new Date().toISOString()
            },
            body: JSON.stringify(command)
          });
          
          if (!response.ok) {
            throw new Error(`Failed to mark complete: ${response.statusText}`);
          }
          
          const result = await response.json();
          get().addNotification({
            type: 'agent_result',
            message: `Item marked as ${command.status}`,
            severity: 'info',
            related_ids: [command.agenda_item_id]
          });
          
        } catch (error) {
          // Revert optimistic update
          get().updateAgendaItem(command.agenda_item_id, { 
            status: 'pending' 
          });
          
          get().addNotification({
            type: 'agent_result',
            message: `Failed to update item: ${error}`,
            severity: 'warn',
            related_ids: [command.agenda_item_id]
          });
          
          throw error;
        }
      },

      // Status actions
      setStatus: (status) => set({ 
        status,
        lastUpdated: { ...get().lastUpdated, status: new Date().toISOString() }
      }),

      // Inventory actions
      setInventory: (items) => set({ 
        inventory: items,
        lastUpdated: { ...get().lastUpdated, inventory: new Date().toISOString() }
      }),
      
      updateInventoryItem: (id, updates) => set((state) => ({
        inventory: state.inventory.map(item => 
          item.id === id ? { ...item, ...updates } : item
        )
      })),
      
      queueReorder: async (command) => {
        try {
          const { settings, inventory } = get();
          if (!settings.outbound_urls.queue_reorder) {
            throw new Error('Queue reorder URL not configured');
          }
          
          const item = inventory.find(i => i.id === command.inventory_item_id);
          if (!item) {
            throw new Error('Inventory item not found');
          }
          
          const payload = {
            ...command,
            item_name: item.name,
            category: item.category,
            reorder_link: item.reorder_link
          };
          
          const response = await fetch(settings.outbound_urls.queue_reorder, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-HMAC-Signature': await generateHMAC(payload, settings.hmac_secret),
              'X-Timestamp': new Date().toISOString(),
              'X-Idempotency-Key': command.correlation_id || generateId()
            },
            body: JSON.stringify(payload)
          });
          
          if (!response.ok) {
            throw new Error(`Failed to queue reorder: ${response.statusText}`);
          }
          
          get().addNotification({
            type: 'agent_result',
            message: `Reorder queued for ${item.name}`,
            severity: 'info',
            related_ids: [command.inventory_item_id]
          });
          
        } catch (error) {
          get().addNotification({
            type: 'agent_result',
            message: `Failed to queue reorder: ${error}`,
            severity: 'warn',
            related_ids: [command.inventory_item_id]
          });
          
          throw error;
        }
      },

      // Notification actions
      addNotification: (notification) => set((state) => ({
        notifications: [
          ...state.notifications,
          {
            ...notification,
            id: generateId(),
            created_at: new Date().toISOString()
          }
        ]
      })),
      
      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      })),
      
      clearNotifications: () => set({ notifications: [] }),

      // Baby Agent actions
      triggerBabyAgent: async (command) => {
        try {
          const { settings } = get();
          if (!settings.outbound_urls.baby_agent) {
            throw new Error('Baby agent URL not configured');
          }
          
          const correlationId = command.correlation_id || generateId();
          
          const response = await fetch(settings.outbound_urls.baby_agent, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-HMAC-Signature': await generateHMAC(command, settings.hmac_secret),
              'X-Timestamp': new Date().toISOString(),
              'X-Correlation-ID': correlationId
            },
            body: JSON.stringify(command)
          });
          
          if (!response.ok) {
            throw new Error(`Baby agent failed: ${response.statusText}`);
          }
          
          get().addNotification({
            type: 'agent_result',
            message: `Task "${command.intent}" initiated (${correlationId})`,
            severity: 'info',
            related_ids: []
          });
          
        } catch (error) {
          get().addNotification({
            type: 'agent_result',
            message: `Failed to trigger agent: ${error}`,
            severity: 'warn',
            related_ids: []
          });
          
          throw error;
        }
      },

      // UI actions
      selectItem: (id) => set({ selectedItemId: id }),
      
      setLoading: (key, value) => set((state) => ({
        loading: { ...state.loading, [key]: value }
      })),

      // Settings actions
      updateSettings: (updates) => set((state) => ({
        settings: { ...state.settings, ...updates }
      })),

      // Daily build
      executeDailyBuild: async () => {
        const { settings, inventory } = get();
        
        // 1. Purge yesterday's pending items
        const today = new Date().toISOString().split('T')[0];
        set((state) => ({
          agenda: state.agenda.filter(item => {
            const itemDate = new Date(item.start_time).toISOString().split('T')[0];
            return itemDate >= today || item.status === 'done';
          })
        }));
        
        // 2. Check inventory for low/out items
        const lowStockItems = inventory.filter(item => {
          const percentRemaining = (item.current_qty / item.min_qty) * 100;
          return percentRemaining <= settings.thresholds.low_inventory_percent;
        });
        
        // 3. Create notifications for low stock
        lowStockItems.forEach(item => {
          const isOut = item.current_qty === 0;
          get().addNotification({
            type: 'low_stock',
            message: isOut 
              ? `${item.name} is OUT OF STOCK` 
              : `${item.name} is low (${item.current_qty} ${item.unit} remaining)`,
            severity: isOut ? 'critical' : 'warn',
            related_ids: [item.id]
          });
        });
        
        // 4. Mark build complete
        set((state) => ({
          lastUpdated: {
            ...state.lastUpdated,
            agenda: new Date().toISOString()
          }
        }));
      }
    }),
    {
      name: 'mission-control-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        settings: state.settings,
        notifications: state.notifications
      })
    }
  )
);

// Helper functions
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function generateHMAC(data: any, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(JSON.stringify(data))
  );
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}