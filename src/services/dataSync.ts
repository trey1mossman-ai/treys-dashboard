// Unified data synchronization service
// Uses localStorage for offline operation and API for cloud sync

import type { DayData, AgendaItem } from '@/types/daily';
import { dbService } from './dbService';

type SyncStatus = 'offline' | 'online' | 'syncing' | 'error';


class DataSyncService {
  private syncStatus: SyncStatus = 'offline';
  private syncQueue: Array<{ action: string; data: any; timestamp: number }> = [];
  private isOnline = false;

  constructor() {
    this.checkOnlineStatus();
    this.setupOnlineListener();
    this.loadSyncQueue();
  }

  private checkOnlineStatus() {
    this.isOnline = navigator.onLine;
    this.syncStatus = this.isOnline ? 'online' : 'offline';
  }

  private setupOnlineListener() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncStatus = 'online';
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.syncStatus = 'offline';
    });
  }

  private loadSyncQueue() {
    const stored = localStorage.getItem('syncQueue');
    if (stored) {
      try {
        this.syncQueue = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to load sync queue:', e);
        this.syncQueue = [];
      }
    }
  }

  private saveSyncQueue() {
    localStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));
  }

  private addToSyncQueue(action: string, data: any) {
    this.syncQueue.push({
      action,
      data,
      timestamp: Date.now()
    });
    this.saveSyncQueue();

    // Process queue if online
    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  private async processSyncQueue() {
    if (!this.isOnline || this.syncStatus === 'syncing' || this.syncQueue.length === 0) {
      return;
    }

    this.syncStatus = 'syncing';
    console.log(`Processing ${this.syncQueue.length} queued operations...`);

    const processed: number[] = [];

    for (let i = 0; i < this.syncQueue.length; i++) {
      const operation = this.syncQueue[i];
      try {
        await this.executeServerOperation(operation.action, operation.data);
        processed.push(i);
      } catch (error) {
        console.error(`Failed to sync operation ${operation.action}:`, error);
        // Keep failed operations in queue for retry
        break;
      }
    }

    // Remove successfully processed operations
    processed.reverse().forEach(index => {
      this.syncQueue.splice(index, 1);
    });

    this.saveSyncQueue();
    this.syncStatus = this.isOnline ? 'online' : 'offline';

    console.log(`Sync complete. ${processed.length} operations synced, ${this.syncQueue.length} remaining.`);
  }

  private async executeServerOperation(action: string, data: any) {
    const [entity, operation] = action.split('.');
    
    switch (entity) {
      case 'agenda':
        switch (operation) {
          case 'create':
          case 'update':
            await dbService.agenda.upsert(data);
            break;
          case 'delete':
            await dbService.agenda.delete(data.id);
            break;
        }
        break;
      // Add other entities (todos, food, supplements) when backend endpoints exist
    }
  }

  // Get storage key for a date
  private getStorageKey(date: string) {
    return `day:${date}`;
  }


  // Load data with fallback logic
  async loadData(date: string): Promise<DayData> {
    const storageKey = this.getStorageKey(date);
    
    // Always load from localStorage first (instant response)
    let localData: DayData;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        localData = JSON.parse(stored);
      } catch {
        localData = this.getDefaultDayData(date);
      }
    } else {
      localData = this.getDefaultDayData(date);
    }

    // If online, try to sync with server
    if (this.isOnline) {
      try {
        const serverAgenda = await dbService.agenda.list(date);
        
        // Convert server format to local format
        const convertedAgenda: AgendaItem[] = serverAgenda.map(item => ({
          id: item.id,
          title: item.title,
          startTime: new Date(item.start_ts * 1000).toTimeString().slice(0, 5),
          endTime: new Date(item.end_ts * 1000).toTimeString().slice(0, 5),
          completed: item.status === 'done'
        }));

        // Merge server data with local data (server wins for conflicts)
        const mergedData = {
          ...localData,
          agenda: convertedAgenda
        };

        // Save merged data locally
        localStorage.setItem(storageKey, JSON.stringify(mergedData));
        
        return mergedData;
      } catch (error) {
        console.log('Failed to load from server, using local data:', error);
        // Return local data if server fails
      }
    }

    return localData;
  }

  // Save data with sync
  async saveData(date: string, data: DayData, changedField?: string) {
    const storageKey = this.getStorageKey(date);
    
    // Always save locally first (instant response)
    localStorage.setItem(storageKey, JSON.stringify(data));

    // Queue server operations if online
    if (changedField === 'agenda') {
      // Queue agenda changes for sync
      for (const item of data.agenda) {
        this.addToSyncQueue('agenda.upsert', {
          id: item.id,
          date,
          title: item.title,
          start_ts: this.timeToTimestamp(date, item.startTime),
          end_ts: this.timeToTimestamp(date, item.endTime),
          status: item.completed ? 'done' : 'pending'
        });
      }
    }
    // Add other field handling when backend supports them
  }

  // Delete operations
  async deleteItem(date: string, type: 'agenda' | 'todo' | 'food' | 'supplement', id: string) {
    // Update localStorage immediately
    const data = await this.loadData(date);
    switch (type) {
      case 'agenda':
        data.agenda = data.agenda.filter(item => item.id !== id);
        break;
      case 'todo':
        data.todos = data.todos.filter(item => item.id !== id);
        break;
      case 'food':
        data.food = data.food.filter(item => item.id !== id);
        break;
      case 'supplement':
        data.supplements = data.supplements.filter(item => item.id !== id);
        break;
    }
    localStorage.setItem(this.getStorageKey(date), JSON.stringify(data));

    // Queue deletion for sync
    this.addToSyncQueue(`${type}.delete`, { id });
  }

  private timeToTimestamp(date: string, time: string): number {
    const dateObj = new Date(date + 'T' + time + ':00');
    return Math.floor(dateObj.getTime() / 1000);
  }

  private getDefaultDayData(date: string): DayData {
    return {
      date,
      agenda: [],
      todos: [],
      food: [],
      supplements: []
    };
  }

  // Public methods
  getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  getPendingCount(): number {
    return this.syncQueue.length;
  }

  async forcSync() {
    if (this.isOnline) {
      await this.processSyncQueue();
    }
  }

  clearSyncQueue() {
    this.syncQueue = [];
    this.saveSyncQueue();
  }
}

export const dataSyncService = new DataSyncService();