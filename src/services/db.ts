// IndexedDB Service - Performance Foundation
// Team Lead: Claude - Day 3-4 Implementation
// Following the rescue plan specifications

import Dexie, { Table } from 'dexie';

export interface CacheItem {
  key: string;
  data: any;
  timestamp: number;
  expiresAt?: number;
}

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: number;
  dueDate?: number;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  syncStatus?: 'local' | 'synced' | 'pending';
}

export interface NoteItem {
  id: string;
  content: string;
  position: { x: number; y: number };
  color?: string;
  pinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AgendaItem {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  location?: string;
  attendees?: string[];
  status: 'pending' | 'synced' | 'error';
  calendarId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface QuickAction {
  id: string;
  name: string;
  webhookUrl: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  payload?: any;
  icon?: string;
  lastRun?: number;
  runCount: number;
}

class DashboardDatabase extends Dexie {
  // Tables
  cache!: Table<CacheItem>;
  todos!: Table<TodoItem>;
  notes!: Table<NoteItem>;
  agenda!: Table<AgendaItem>;
  quickActions!: Table<QuickAction>;
  
  constructor() {
    super('TreysDashboardDB');
    
    // Schema definition - indexes for efficient queries
    this.version(1).stores({
      cache: 'key, timestamp, expiresAt',
      todos: 'id, priority, createdAt, completed, syncStatus',
      notes: 'id, pinned, createdAt',
      agenda: 'id, startTime, endTime, status, calendarId',
      quickActions: 'id, lastRun, runCount'
    });
    
    // Initialize with proper typing
    this.cache = this.table('cache');
    this.todos = this.table('todos');
    this.notes = this.table('notes');
    this.agenda = this.table('agenda');
    this.quickActions = this.table('quickActions');
  }
  
  // Cache management methods
  async getCached<T>(key: string): Promise<T | null> {
    const item = await this.cache.get(key);
    
    if (!item) return null;
    
    // Check expiration
    if (item.expiresAt && Date.now() > item.expiresAt) {
      await this.cache.delete(key);
      return null;
    }
    
    // Check staleness (default 5 minutes)
    const isStale = Date.now() - item.timestamp > 5 * 60 * 1000;
    if (isStale) {
      // Return stale data but trigger background refresh
      this.refreshInBackground(key);
    }
    
    return item.data as T;
  }
  
  async setCached(key: string, data: any, ttlSeconds?: number): Promise<void> {
    const timestamp = Date.now();
    const expiresAt = ttlSeconds ? timestamp + (ttlSeconds * 1000) : undefined;
    
    await this.cache.put({
      key,
      data,
      timestamp,
      expiresAt
    });
  }
  
  private refreshInBackground(key: string): void {
    // Emit event for background refresh
    window.dispatchEvent(new CustomEvent('cache:refresh', { detail: { key } }));
  }
  
  // Bulk operations for performance
  async bulkUpsertTodos(todos: TodoItem[]): Promise<void> {
    await this.transaction('rw', this.todos, async () => {
      await this.todos.bulkPut(todos);
    });
  }
  
  // Clean up old data
  async cleanup(): Promise<void> {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    // Remove old cache entries
    await this.cache.where('timestamp').below(oneWeekAgo).delete();
    
    // Remove completed todos older than a week
    await this.todos
      .where('completed').equals(true)
      .and(todo => todo.updatedAt < oneWeekAgo)
      .delete();
  }
  
  // Performance monitoring
  async getDatabaseSize(): Promise<number> {
    let totalSize = 0;
    
    await this.tables.forEach(async table => {
      const count = await table.count();
      // Rough estimate: 1KB per record average
      totalSize += count * 1024;
    });
    
    return totalSize;
  }
}

// Create singleton instance
export const db = new DashboardDatabase();

// Make globally available for debugging
if (typeof window !== 'undefined') {
  (window as any).db = db;
  
  // Run cleanup on idle
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      db.cleanup().catch(console.error);
    }, { timeout: 10000 });
  }
}

// Export helper functions
export const clearAllData = async (): Promise<void> => {
  await db.delete();
  await db.open();
};

export const exportData = async (): Promise<any> => {
  const todos = await db.todos.toArray();
  const notes = await db.notes.toArray();
  const agenda = await db.agenda.toArray();
  const quickActions = await db.quickActions.toArray();
  
  return {
    todos,
    notes,
    agenda,
    quickActions,
    exportedAt: new Date().toISOString()
  };
};

export const importData = async (data: any): Promise<void> => {
  await db.transaction('rw', db.todos, db.notes, db.agenda, db.quickActions, async () => {
    if (data.todos) await db.todos.bulkPut(data.todos);
    if (data.notes) await db.notes.bulkPut(data.notes);
    if (data.agenda) await db.agenda.bulkPut(data.agenda);
    if (data.quickActions) await db.quickActions.bulkPut(data.quickActions);
  });
};