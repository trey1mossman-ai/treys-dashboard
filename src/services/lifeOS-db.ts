// Life OS Database Schema - Core Infrastructure
// Team Lead: Claude - Creating foundation

import Dexie, { Table } from 'dexie';

// ========== CORE ENTITIES ==========

export interface Project {
  id: string;
  title: string;
  description?: string;
  status: 'active' | 'paused' | 'completed';
  contacts: string[]; // Contact IDs
  createdAt: number;
  updatedAt: number;
  completionPercent: number;
  revenue?: number;
  cost?: number;
  priority: 'high' | 'medium' | 'low';
  tags?: string[];
}

export interface UnifiedTask {
  id: string;
  title: string;
  description?: string;
  source: 'project' | 'fitness' | 'personal' | 'email' | 'ai' | 'finance';
  projectId?: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'A' | 'B' | 'C';
  effortMinutes?: number;
  scheduledFor?: number;
  dueAt?: number;
  completedAt?: number;
  dependencies?: string[];
  assignee?: string;
  tags?: string[];
  sourceRef?: string; // email ID, transcript ID, etc
}

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  lastInteraction?: number;
  nextTouchpoint?: number;
  warmthScore: number; // 0-100
  tags: string[];
  notes?: string;
  projectIds?: string[];
}

export interface KnowledgeItem {
  id: string;
  title?: string;
  content: string;
  type: 'note' | 'idea' | 'summary' | 'transcript' | 'article';
  source?: string;
  projectId?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  aiSummary?: string;
}

export interface FitnessLog {
  id: string;
  date: number;
  type: 'run' | 'gym' | 'recovery' | 'skill';
  duration: number;
  details: any;
  readinessScore?: number;
  rpe?: number;
  notes?: string;
}

export interface FinanceTransaction {
  id: string;
  date: number;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  projectId?: string;
  description: string;
  recurring?: boolean;
  tags?: string[];
}

export interface InventoryItem {
  id: string;
  name: string;
  location: 'home' | 'office';
  quantity: number;
  unit: string;
  category: 'food' | 'supplement' | 'equipment';
  expiryDate?: number;
  tags?: string[];
  lastUpdated: number;
}

export interface DaySnapshot {
  id: string;
  date: string; // ISO date
  sleepHours?: number;
  sleepQuality?: 1 | 2 | 3 | 4 | 5;
  mood?: 1 | 2 | 3 | 4 | 5;
  stress?: 1 | 2 | 3 | 4 | 5;
  readinessScore?: number;
  notes?: string;
}

// ========== DATABASE CLASS ==========

export class LifeOSDatabase extends Dexie {
  // Core tables
  projects!: Table<Project>;
  tasks!: Table<UnifiedTask>;
  contacts!: Table<Contact>;
  knowledge!: Table<KnowledgeItem>;
  fitness!: Table<FitnessLog>;
  finance!: Table<FinanceTransaction>;
  inventory!: Table<InventoryItem>;
  snapshots!: Table<DaySnapshot>;
  
  // Keep existing tables for migration
  todos!: Table<any>;
  notes!: Table<any>;
  cache!: Table<any>;

  constructor() {
    super('LifeOSDB');
    
    // Version 2 adds Life OS tables
    this.version(2).stores({
      // New Life OS tables
      projects: 'id, status, priority, updatedAt, [status+priority]',
      tasks: 'id, projectId, status, priority, dueAt, scheduledFor, source, [projectId+status], [status+priority]',
      contacts: 'id, email, warmthScore, lastInteraction, [warmthScore+lastInteraction]',
      knowledge: 'id, type, projectId, createdAt, updatedAt, [type+projectId]',
      fitness: 'id, date, type, [date+type]',
      finance: 'id, date, type, category, projectId, [date+type], [projectId+type]',
      inventory: 'id, location, category, [location+category]',
      snapshots: 'id, date',
      
      // Existing tables preserved for migration
      todos: 'id, priority, createdAt',
      notes: 'id',
      cache: 'key, timestamp'
    });
  }

  // Helper methods for common queries
  async getTodaysTasks(): Promise<UnifiedTask[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return this.tasks
      .where('scheduledFor')
      .between(today.getTime(), tomorrow.getTime())
      .toArray();
  }

  async getActiveProjects(): Promise<Project[]> {
    return this.projects
      .where('status')
      .equals('active')
      .sortBy('priority');
  }

  async getRecentKnowledge(limit: number = 10): Promise<KnowledgeItem[]> {
    return this.knowledge
      .orderBy('updatedAt')
      .reverse()
      .limit(limit)
      .toArray();
  }
}

// Create and export database instance
export const lifeDB = new LifeOSDatabase();

// Make globally available for debugging
if (typeof window !== 'undefined') {
  (window as any).lifeDB = lifeDB;
}

// ========== MIGRATION HELPERS ==========

export async function migrateFromOldDB() {
  console.log('🔄 Starting Life OS migration...');
  
  try {
    // Import old DB if exists
    const { db: oldDB } = await import('./db');
    
    // Migrate todos to tasks
    const todos = await oldDB.todos.toArray();
    const tasks = todos.map(todo => ({
      id: todo.id || crypto.randomUUID(),
      title: todo.title || 'Untitled',
      description: todo.description,
      source: 'personal' as const,
      status: todo.completed ? 'done' as const : 'todo' as const,
      priority: 'B' as const,
      createdAt: todo.createdAt || Date.now()
    }));
    
    await lifeDB.tasks.bulkAdd(tasks);
    
    // Migrate notes to knowledge
    const notes = await oldDB.notes.toArray();
    const knowledge = notes.map(note => ({
      id: note.id || crypto.randomUUID(),
      content: note.content || '',
      type: 'note' as const,
      tags: [],
      createdAt: note.createdAt || Date.now(),
      updatedAt: Date.now()
    }));
    
    await lifeDB.knowledge.bulkAdd(knowledge);
    
    console.log('✅ Migration complete!');
    return { success: true, tasksImported: tasks.length, notesImported: knowledge.length };
  } catch (error) {
    console.error('Migration error:', error);
    return { success: false, error };
  }
}
