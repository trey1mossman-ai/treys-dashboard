import { openDB, IDBPDatabase } from 'idb';

interface SyncItem {
  id: string;
  type: string;
  endpoint: string;
  method: string;
  data: any;
  timestamp: number;
  status: 'pending' | 'syncing' | 'failed';
  attempts: number;
  retryable: boolean;
}

export class OfflineManager {
  private isOnline: boolean = navigator.onLine;
  private syncQueue: Map<string, SyncItem> = new Map();
  private listeners: Set<(online: boolean) => void> = new Set();
  private db: IDBPDatabase | null = null;

  constructor() {
    this.initialize();
    this.setupEventListeners();
  }

  private async initialize() {
    // Open IndexedDB for sync queue
    this.db = await openDB('offline-sync', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('sync-queue')) {
          const store = db.createObjectStore('sync-queue', { 
            keyPath: 'id',
            autoIncrement: true 
          });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('type', 'type');
          store.createIndex('status', 'status');
        }
      }
    });

    // Load pending sync items
    await this.loadPendingSync();
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      console.log('📡 Back online! Starting sync...');
      this.isOnline = true;
      this.notifyListeners(true);
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      console.log('📵 Gone offline. Queueing changes...');
      this.isOnline = false;
      this.notifyListeners(false);
    });

    // Periodic sync attempt
    setInterval(() => {
      if (this.isOnline && this.syncQueue.size > 0) {
        this.processSyncQueue();
      }
    }, 30000); // Every 30 seconds
  }

  // Queue an action for sync
  async queueAction(action: {
    type: string;
    endpoint: string;
    method: string;
    data: any;
    retryable?: boolean;
  }) {
    const syncItem: SyncItem = {
      ...action,
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      status: 'pending',
      attempts: 0,
      retryable: action.retryable !== false
    };

    // Save to IndexedDB
    if (this.db) {
      await this.db.add('sync-queue', syncItem);
    }
    
    // Add to memory queue
    this.syncQueue.set(syncItem.id, syncItem);

    // Try to sync immediately if online
    if (this.isOnline) {
      this.processSyncQueue();
    }

    return syncItem.id;
  }

  // Process the sync queue
  private async processSyncQueue() {
    if (!this.isOnline || this.syncQueue.size === 0) return;

    console.log(`🔄 Processing ${this.syncQueue.size} queued items...`);

    for (const [id, item] of this.syncQueue) {
      try {
        // Update status
        item.status = 'syncing';
        
        const response = await fetch(item.endpoint, {
          method: item.method,
          headers: {
            'Content-Type': 'application/json',
            'X-Offline-Sync': 'true',
            'X-Sync-Id': id
          },
          body: JSON.stringify(item.data)
        });

        if (response.ok) {
          // Success - remove from queue
          this.syncQueue.delete(id);
          if (this.db) {
            await this.db.delete('sync-queue', id);
          }
          console.log(`✅ Synced: ${item.type}`);
        } else if (response.status >= 400 && response.status < 500) {
          // Client error - don't retry
          console.error(`❌ Sync failed (won't retry): ${item.type}`);
          this.syncQueue.delete(id);
          if (this.db) {
            await this.db.delete('sync-queue', id);
          }
        } else {
          // Server error - retry later
          throw new Error(`Server error: ${response.status}`);
        }
      } catch (error) {
        console.error(`⚠️ Sync error for ${item.type}:`, error);
        
        // Update retry count
        item.status = 'failed';
        item.attempts++;
        
        if (item.attempts > 5 && !item.retryable) {
          // Max retries reached
          this.syncQueue.delete(id);
          if (this.db) {
            await this.db.delete('sync-queue', id);
          }
        } else if (this.db) {
          // Update in DB
          await this.db.put('sync-queue', item);
        }
      }
    }
  }

  // Load pending sync items from IndexedDB
  private async loadPendingSync() {
    if (!this.db) return;
    
    const items = await this.db.getAllFromIndex('sync-queue', 'status', 'pending');
    items.forEach(item => {
      this.syncQueue.set(item.id, item);
    });
    
    if (items.length > 0) {
      console.log(`📦 Loaded ${items.length} pending sync items`);
    }
  }

  // Subscribe to online/offline events
  subscribe(callback: (online: boolean) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(online: boolean) {
    this.listeners.forEach(callback => callback(online));
  }

  // Check if currently online
  getStatus() {
    return {
      isOnline: this.isOnline,
      queueSize: this.syncQueue.size
    };
  }

  // Force sync attempt
  async forceSync() {
    if (this.isOnline) {
      await this.processSyncQueue();
    }
  }

  // Clear sync queue (use with caution)
  async clearQueue() {
    this.syncQueue.clear();
    if (this.db) {
      const tx = this.db.transaction('sync-queue', 'readwrite');
      await tx.objectStore('sync-queue').clear();
    }
  }

  // Get queue details
  getQueueDetails() {
    return Array.from(this.syncQueue.values()).map(item => ({
      id: item.id,
      type: item.type,
      timestamp: item.timestamp,
      attempts: item.attempts,
      data: item.data
    }));
  }
}

// Export singleton
export const offlineManager = new OfflineManager();
