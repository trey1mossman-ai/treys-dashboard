import { openDB } from 'idb'

const DB_NAME = 'offline-sync-db'
const STORE_NAME = 'sync-queue'
const DB_VERSION = 1

interface SyncEntry {
  id: string
  resource: string
  payload: unknown
  createdAt: number
  retries: number
}

class OfflineManager {
  private dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt')
      }
    }
  })

  private listeners = new Set<(online: boolean) => void>()

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.notify(true))
      window.addEventListener('offline', () => this.notify(false))
    }
  }

  private notify(online: boolean) {
    this.listeners.forEach(listener => listener(online))
  }

  subscribe(listener: (online: boolean) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  async enqueue(resource: string, payload: unknown) {
    const db = await this.dbPromise
    const entry: SyncEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      resource,
      payload,
      createdAt: Date.now(),
      retries: 0
    }
    await db.put(STORE_NAME, entry)
    return entry
  }

  async dequeueAll(): Promise<SyncEntry[]> {
    const db = await this.dbPromise
    const entries = await db.getAllFromIndex(STORE_NAME, 'createdAt')
    await Promise.all(entries.map(entry => db.delete(STORE_NAME, entry.id)))
    return entries
  }

  async peekAll(): Promise<SyncEntry[]> {
    const db = await this.dbPromise
    return db.getAllFromIndex(STORE_NAME, 'createdAt')
  }

  isOnline(): boolean {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine
    }
    return true
  }
}

export const offlineManager = new OfflineManager()
