// Life OS Event Bus - Central Communication System
// Team Lead: Claude - Core Infrastructure

type EventCallback = (data: any) => void;

interface EventSubscription {
  unsubscribe: () => void;
}

class LifeOSEventBus {
  private events: Map<string, EventCallback[]> = new Map();
  private eventHistory: Array<{ event: string; data: any; timestamp: number }> = [];
  private maxHistory = 100;

  // Define all event types
  static EVENTS = {
    // System Events
    SYSTEM_READY: 'system.ready',
    MODULE_LOADED: 'module.loaded',
    MODULE_ERROR: 'module.error',
    SYNC_STARTED: 'sync.started',
    SYNC_COMPLETED: 'sync.completed',
    SYNC_FAILED: 'sync.failed',
    
    // Task Events
    TASK_CREATED: 'task.created',
    TASK_UPDATED: 'task.updated',
    TASK_COMPLETED: 'task.completed',
    TASK_DELETED: 'task.deleted',
    TASK_SCHEDULED: 'task.scheduled',
    TASKS_BATCH_UPDATE: 'tasks.batch_update',
    
    // Project Events
    PROJECT_CREATED: 'project.created',
    PROJECT_UPDATED: 'project.updated',
    PROJECT_COMPLETED: 'project.completed',
    PROJECT_ARCHIVED: 'project.archived',
    PROJECT_DELETED: 'project.deleted',
    
    // Knowledge Events
    NOTE_CAPTURED: 'note.captured',
    IDEA_CREATED: 'idea.created',
    KNOWLEDGE_UPDATED: 'knowledge.updated',
    KNOWLEDGE_TAGGED: 'knowledge.tagged',
    
    // Fitness Events
    WORKOUT_PLANNED: 'workout.planned',
    WORKOUT_STARTED: 'workout.started',
    WORKOUT_COMPLETED: 'workout.completed',
    READINESS_CALCULATED: 'readiness.calculated',
    RECOVERY_NEEDED: 'recovery.needed',
    
    // Finance Events
    TRANSACTION_ADDED: 'transaction.added',
    BUDGET_EXCEEDED: 'budget.exceeded',
    INVOICE_DUE: 'invoice.due',
    EXPENSE_ALERT: 'expense.alert',
    
    // Contact Events
    CONTACT_ADDED: 'contact.added',
    CONTACT_UPDATED: 'contact.updated',
    FOLLOW_UP_DUE: 'followup.due',
    RELATIONSHIP_COLD: 'relationship.cold',
    
    // Email Events
    EMAIL_SCANNED: 'email.scanned',
    TASK_EXTRACTED: 'task.extracted',
    EMAIL_SEND: 'email.send',
    
    // UI Events
    NOTIFICATION_SHOW: 'notification.show',
    MODAL_OPEN: 'modal.open',
    MODAL_CLOSE: 'modal.close',
    TOAST_SHOW: 'toast.show',
    
    // Data Events
    DATA_IMPORT: 'data.import',
    DATA_EXPORT: 'data.export',
    BACKUP_CREATED: 'backup.created',
    MIGRATION_COMPLETE: 'migration.complete'
  };

  /**
   * Subscribe to an event
   */
  on(event: string, callback: EventCallback): EventSubscription {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    
    this.events.get(event)!.push(callback);
    
    // Return unsubscribe function
    return {
      unsubscribe: () => this.off(event, callback)
    };
  }

  /**
   * Subscribe to an event (once only)
   */
  once(event: string, callback: EventCallback): EventSubscription {
    const wrapper = (data: any) => {
      callback(data);
      this.off(event, wrapper);
    };
    
    return this.on(event, wrapper);
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, callback: EventCallback) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event
   */
  emit(event: string, data?: any) {
    // Log to history
    this.eventHistory.push({
      event,
      data,
      timestamp: Date.now()
    });
    
    // Trim history if needed
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.shift();
    }
    
    // Call all listeners
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
    
    // Also dispatch as DOM event for React components
    window.dispatchEvent(new CustomEvent(`lifeos:${event}`, { detail: data }));
    
    // Log for debugging (but not in production)
    if (import.meta.env.DEV) {
      console.log(`[LifeOS Event] ${event}`, data);
    }
  }

  /**
   * Emit an event after a delay
   */
  emitDelayed(event: string, data: any, delayMs: number) {
    setTimeout(() => this.emit(event, data), delayMs);
  }

  /**
   * Get event history
   */
  getHistory(): Array<{ event: string; data: any; timestamp: number }> {
    return [...this.eventHistory];
  }

  /**
   * Clear all event listeners
   */
  clear() {
    this.events.clear();
    this.eventHistory = [];
  }

  /**
   * Get all registered events
   */
  getRegisteredEvents(): string[] {
    return Array.from(this.events.keys());
  }
}

// Create singleton instance
export const eventBus = new LifeOSEventBus();

// Make available globally for debugging
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).lifeOSEventBus = eventBus;
}

// ========== REACT HOOKS ==========

import { useEffect } from 'react';

/**
 * Hook to subscribe to Life OS events
 */
export function useLifeOSEvent(
  event: string,
  handler: EventCallback,
  deps: any[] = []
) {
  useEffect(() => {
    const subscription = eventBus.on(event, handler);
    return () => subscription.unsubscribe();
  }, [event, ...deps]);
}

/**
 * Hook to emit Life OS events
 */
export function useLifeOSEmitter() {
  return {
    emit: (event: string, data?: any) => eventBus.emit(event, data),
    emitDelayed: (event: string, data: any, delayMs: number) => 
      eventBus.emitDelayed(event, data, delayMs)
  };
}

// ========== COMMON EVENT PATTERNS ==========

/**
 * Helper to emit CRUD events
 */
export class CRUDEventEmitter {
  constructor(private entityType: string) {}

  created(data: any) {
    eventBus.emit(`${this.entityType}.created`, data);
  }

  updated(data: any) {
    eventBus.emit(`${this.entityType}.updated`, data);
  }

  deleted(id: string) {
    eventBus.emit(`${this.entityType}.deleted`, { id });
  }

  batchUpdate(items: any[]) {
    eventBus.emit(`${this.entityType}.batch_update`, { items });
  }
}

// Export event types for TypeScript
export const LifeOSEvents = LifeOSEventBus.EVENTS;
