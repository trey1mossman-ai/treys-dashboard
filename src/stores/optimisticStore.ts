// Optimistic update store for handling UI updates before server confirmation
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface OptimisticItem {
  id: string;
  tempId?: string;
  status: 'pending' | 'synced' | 'failed';
  data: any;
  timestamp: number;
  retryCount: number;
}

interface OptimisticState {
  items: Map<string, OptimisticItem>;
  
  // Add optimistic item
  addOptimistic: (tempId: string, data: any) => void;
  
  // Update item status
  updateStatus: (id: string, status: 'synced' | 'failed', serverId?: string) => void;
  
  // Reconcile with server data
  reconcile: (tempId: string, serverData: any) => void;
  
  // Rollback failed item
  rollback: (id: string) => void;
  
  // Retry failed item
  retry: (id: string) => Promise<void>;
  
  // Clear old items
  cleanup: () => void;
}

export const useOptimisticStore = create<OptimisticState>()(
  devtools(
    (set, get) => ({
      items: new Map(),
      
      addOptimistic: (tempId, data) => {
        set((state) => {
          const items = new Map(state.items);
          items.set(tempId, {
            id: tempId,
            status: 'pending',
            data,
            timestamp: Date.now(),
            retryCount: 0
          });
          return { items };
        });
      },
      
      updateStatus: (id, status, serverId) => {
        set((state) => {
          const items = new Map(state.items);
          const item = items.get(id);
          
          if (item) {
            if (status === 'synced' && serverId) {
              // Replace temp ID with server ID
              items.delete(id);
              items.set(serverId, {
                ...item,
                id: serverId,
                tempId: id,
                status: 'synced'
              });
            } else {
              items.set(id, {
                ...item,
                status
              });
            }
          }
          
          return { items };
        });
      },
      
      reconcile: (tempId, serverData) => {
        set((state) => {
          const items = new Map(state.items);
          const item = items.get(tempId);
          
          if (item) {
            items.set(tempId, {
              ...item,
              data: { ...item.data, ...serverData },
              status: 'synced'
            });
          }
          
          return { items };
        });
      },
      
      rollback: (id) => {
        set((state) => {
          const items = new Map(state.items);
          items.delete(id);
          return { items };
        });
      },
      
      retry: async (id) => {
        const item = get().items.get(id);
        if (!item || item.retryCount >= 3) return;
        
        set((state) => {
          const items = new Map(state.items);
          const item = items.get(id);
          if (item) {
            items.set(id, {
              ...item,
              status: 'pending',
              retryCount: item.retryCount + 1
            });
          }
          return { items };
        });
        
        // Trigger actual retry via API would go here
        // This would call the appropriate API method
      },
      
      cleanup: () => {
        set((state) => {
          const items = new Map(state.items);
          const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
          
          for (const [id, item] of items) {
            if (item.timestamp < cutoff && item.status === 'synced') {
              items.delete(id);
            }
          }
          
          return { items };
        });
      }
    }),
    {
      name: 'optimistic-store'
    }
  )
);