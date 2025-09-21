# WEEK 1 SPRINT - Start Building Life OS

## Day 1-2: Database & Architecture Setup

### 1. Expand Database Schema

```typescript
// src/services/lifeOS-db.ts - CREATE NEW
import Dexie, { Table } from 'dexie';

// Core entities for Life OS
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
  details: any; // Specific to type
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

export class LifeOSDatabase extends Dexie {
  // Core tables
  projects!: Table<Project>;
  tasks!: Table<UnifiedTask>;
  contacts!: Table<Contact>;
  knowledge!: Table<KnowledgeItem>;
  fitness!: Table<FitnessLog>;
  finance!: Table<FinanceTransaction>;
  
  // Keep existing tables
  todos!: Table<any>;
  notes!: Table<any>;
  cache!: Table<any>;

  constructor() {
    super('LifeOSDB');
    
    // Version 2 adds new tables
    this.version(2).stores({
      // New tables
      projects: 'id, status, updatedAt',
      tasks: 'id, projectId, status, priority, dueAt, scheduledFor, source',
      contacts: 'id, email, warmthScore, lastInteraction',
      knowledge: 'id, type, projectId, createdAt, updatedAt',
      fitness: 'id, date, type',
      finance: 'id, date, type, category, projectId',
      
      // Existing tables preserved
      todos: 'id, priority, createdAt',
      notes: 'id',
      cache: 'key, timestamp'
    });
  }
}

export const lifeDB = new LifeOSDatabase();
```

### 2. Event Bus System

```typescript
// src/services/eventBus.ts - CREATE NEW
type EventCallback = (data: any) => void;

class LifeOSEventBus {
  private events: Map<string, EventCallback[]> = new Map();
  
  // Event types
  static EVENTS = {
    // Tasks
    TASK_CREATED: 'task.created',
    TASK_UPDATED: 'task.updated',
    TASK_COMPLETED: 'task.completed',
    
    // Projects
    PROJECT_CREATED: 'project.created',
    PROJECT_UPDATED: 'project.updated',
    
    // Fitness
    WORKOUT_PLANNED: 'workout.planned',
    WORKOUT_COMPLETED: 'workout.completed',
    
    // Knowledge
    NOTE_CAPTURED: 'note.captured',
    IDEA_CREATED: 'idea.created',
    
    // System
    SYNC_REQUIRED: 'sync.required',
    MODULE_LOADED: 'module.loaded'
  };

  on(event: string, callback: EventCallback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
    
    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  off(event: string, callback: EventCallback) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event: string, data?: any) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
    
    // Log for debugging
    console.log(`[EventBus] ${event}`, data);
    
    // Also dispatch DOM event for React components
    window.dispatchEvent(new CustomEvent(`lifeos:${event}`, { detail: data }));
  }
}

export const eventBus = new LifeOSEventBus();
```

### 3. Module Loader System

```typescript
// src/modules/moduleLoader.ts - CREATE NEW
export interface LifeOSModule {
  id: string;
  name: string;
  icon: string;
  description: string;
  routes: any[];
  initialize: () => Promise<void>;
  cleanup?: () => void;
  enabled: boolean;
}

class ModuleLoader {
  private modules: Map<string, LifeOSModule> = new Map();
  
  async loadModule(module: LifeOSModule) {
    if (module.enabled) {
      await module.initialize();
      this.modules.set(module.id, module);
      eventBus.emit(LifeOSEventBus.EVENTS.MODULE_LOADED, { moduleId: module.id });
    }
  }
  
  getModule(id: string): LifeOSModule | undefined {
    return this.modules.get(id);
  }
  
  getAllModules(): LifeOSModule[] {
    return Array.from(this.modules.values());
  }
  
  async unloadModule(id: string) {
    const module = this.modules.get(id);
    if (module?.cleanup) {
      module.cleanup();
    }
    this.modules.delete(id);
  }
}

export const moduleLoader = new ModuleLoader();
```

---

## Day 3-4: Project Management Module

### 1. Project Module Structure

```typescript
// src/modules/projects/index.ts - CREATE NEW
import { LifeOSModule } from '../moduleLoader';
import { ProjectList } from './components/ProjectList';
import { ProjectDetail } from './components/ProjectDetail';
import { projectService } from './services/projectService';

export const projectModule: LifeOSModule = {
  id: 'projects',
  name: 'Project Management',
  icon: 'briefcase',
  description: 'Manage projects, tasks, and stakeholder communications',
  enabled: true,
  routes: [
    { path: '/projects', component: ProjectList },
    { path: '/projects/:id', component: ProjectDetail }
  ],
  initialize: async () => {
    // Set up email scanner
    await projectService.startEmailScanner();
    
    // Load active projects
    await projectService.loadActiveProjects();
    
    console.log('Project module initialized');
  }
};
```

### 2. Project Service

```typescript
// src/modules/projects/services/projectService.ts
import { lifeDB, Project, UnifiedTask, Contact } from '@/services/lifeOS-db';
import { eventBus } from '@/services/eventBus';

class ProjectService {
  private emailScanInterval?: NodeJS.Timeout;

  async createProject(data: Partial<Project>): Promise<Project> {
    const project: Project = {
      id: crypto.randomUUID(),
      title: data.title || 'New Project',
      description: data.description,
      status: 'active',
      contacts: data.contacts || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completionPercent: 0,
      revenue: data.revenue,
      cost: data.cost
    };
    
    await lifeDB.projects.add(project);
    eventBus.emit('project.created', project);
    
    return project;
  }

  async addTaskToProject(projectId: string, taskData: Partial<UnifiedTask>) {
    const task: UnifiedTask = {
      id: crypto.randomUUID(),
      title: taskData.title || '',
      projectId,
      source: 'project',
      status: 'todo',
      priority: taskData.priority || 'B',
      effortMinutes: taskData.effortMinutes,
      dueAt: taskData.dueAt,
      ...taskData
    };
    
    await lifeDB.tasks.add(task);
    eventBus.emit('task.created', task);
    
    // Update project completion
    await this.updateProjectCompletion(projectId);
    
    return task;
  }

  async updateProjectCompletion(projectId: string) {
    const tasks = await lifeDB.tasks
      .where('projectId')
      .equals(projectId)
      .toArray();
    
    const completed = tasks.filter(t => t.status === 'done').length;
    const total = tasks.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    await lifeDB.projects.update(projectId, {
      completionPercent: percent,
      updatedAt: Date.now()
    });
  }

  async startEmailScanner() {
    // Scan every 3 hours during work hours
    this.emailScanInterval = setInterval(async () => {
      const hour = new Date().getHours();
      if (hour >= 8 && hour <= 18) {
        await this.scanEmailsForTasks();
      }
    }, 3 * 60 * 60 * 1000);
    
    // Initial scan
    await this.scanEmailsForTasks();
  }

  async scanEmailsForTasks() {
    // This will integrate with Gmail API
    console.log('Scanning emails for tasks...');
    
    // Mock implementation for now
    const mockEmails = [
      {
        from: 'client@example.com',
        subject: 'Please send the proposal by Friday',
        body: 'Need the updated proposal with pricing'
      }
    ];
    
    for (const email of mockEmails) {
      const confidence = this.calculateTaskConfidence(email);
      
      if (confidence > 0.8) {
        // Auto-create task
        await this.createTaskFromEmail(email);
      } else if (confidence > 0.5) {
        // Queue for review
        eventBus.emit('task.review_needed', { email, confidence });
      }
    }
  }

  calculateTaskConfidence(email: any): number {
    // Simple keyword matching for MVP
    const actionWords = ['please', 'send', 'review', 'update', 'fix', 'complete', 'by'];
    const matches = actionWords.filter(word => 
      email.subject.toLowerCase().includes(word) || 
      email.body.toLowerCase().includes(word)
    );
    
    return matches.length / actionWords.length;
  }

  async createTaskFromEmail(email: any) {
    const dueDate = this.extractDueDate(email.body);
    
    await this.addTaskToProject('inbox', {
      title: email.subject,
      description: email.body,
      source: 'email',
      priority: dueDate ? 'A' : 'B',
      dueAt: dueDate?.getTime(),
      sourceRef: email.id
    });
  }

  extractDueDate(text: string): Date | null {
    // Simple date extraction
    if (text.includes('tomorrow')) {
      const date = new Date();
      date.setDate(date.getDate() + 1);
      return date;
    }
    if (text.includes('Friday')) {
      const date = new Date();
      const day = date.getDay();
      const diff = (5 - day + 7) % 7 || 7;
      date.setDate(date.getDate() + diff);
      return date;
    }
    return null;
  }

  async loadActiveProjects() {
    return lifeDB.projects
      .where('status')
      .equals('active')
      .toArray();
  }

  stopEmailScanner() {
    if (this.emailScanInterval) {
      clearInterval(this.emailScanInterval);
    }
  }
}

export const projectService = new ProjectService();
```

---

## Day 5: Unified Timeline Integration

### Timeline Service

```typescript
// src/modules/timeline/timelineService.ts
import { lifeDB, UnifiedTask } from '@/services/lifeOS-db';
import { eventBus } from '@/services/eventBus';

class TimelineService {
  async getTodaysTasks(): Promise<UnifiedTask[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get scheduled tasks for today
    const scheduled = await lifeDB.tasks
      .where('scheduledFor')
      .between(today.getTime(), tomorrow.getTime())
      .toArray();
    
    // Get overdue tasks
    const overdue = await lifeDB.tasks
      .where('dueAt')
      .below(today.getTime())
      .and(task => task.status !== 'done')
      .toArray();
    
    // Combine and sort by priority
    const allTasks = [...scheduled, ...overdue];
    return this.sortByPriority(allTasks);
  }

  sortByPriority(tasks: UnifiedTask[]): UnifiedTask[] {
    const priorityOrder = { 'A': 0, 'B': 1, 'C': 2 };
    return tasks.sort((a, b) => 
      priorityOrder[a.priority] - priorityOrder[b.priority]
    );
  }

  async scheduleTask(taskId: string, time: Date) {
    await lifeDB.tasks.update(taskId, {
      scheduledFor: time.getTime()
    });
    
    eventBus.emit('task.scheduled', { taskId, time });
  }

  async completeTask(taskId: string, notifyStakeholders: boolean = false) {
    const task = await lifeDB.tasks.get(taskId);
    if (!task) return;
    
    await lifeDB.tasks.update(taskId, {
      status: 'done',
      completedAt: Date.now()
    });
    
    eventBus.emit('task.completed', task);
    
    if (notifyStakeholders && task.projectId) {
      await this.notifyProjectStakeholders(task.projectId, task);
    }
  }

  async notifyProjectStakeholders(projectId: string, task: UnifiedTask) {
    // Get project contacts
    const project = await lifeDB.projects.get(projectId);
    if (!project) return;
    
    // Generate update email
    const update = {
      to: project.contacts,
      subject: `Task Completed: ${task.title}`,
      body: `The following task has been completed:\n\n${task.title}\n\nProject: ${project.title}`
    };
    
    eventBus.emit('email.send', update);
  }

  async createTimeBlock(duration: number) {
    const tasks = await this.getTodaysTasks();
    const unscheduled = tasks.filter(t => !t.scheduledFor);
    
    // Fill time block with best-fit tasks
    let remainingMinutes = duration;
    const selectedTasks: UnifiedTask[] = [];
    
    for (const task of unscheduled) {
      if (task.effortMinutes && task.effortMinutes <= remainingMinutes) {
        selectedTasks.push(task);
        remainingMinutes -= task.effortMinutes;
      }
      if (remainingMinutes < 15) break; // Minimum task time
    }
    
    return selectedTasks;
  }
}

export const timelineService = new TimelineService();
```

---

## Day 6-7: Basic UI Components

### 1. Life OS Dashboard

```tsx
// src/pages/LifeOSDashboard.tsx
import { useState, useEffect } from 'react';
import { TimelineView } from '@/modules/timeline/TimelineView';
import { ProjectList } from '@/modules/projects/components/ProjectList';
import { QuickCapture } from '@/components/QuickCapture';
import { DailyBrief } from '@/components/DailyBrief';
import { lifeDB } from '@/services/lifeOS-db';

export function LifeOSDashboard() {
  const [todaysTasks, setTodaysTasks] = useState([]);
  const [activeProjects, setActiveProjects] = useState([]);
  
  useEffect(() => {
    loadDashboardData();
    
    // Subscribe to updates
    const unsubscribe = eventBus.on('task.updated', loadDashboardData);
    return unsubscribe;
  }, []);
  
  async function loadDashboardData() {
    const tasks = await timelineService.getTodaysTasks();
    const projects = await projectService.loadActiveProjects();
    
    setTodaysTasks(tasks);
    setActiveProjects(projects);
  }
  
  return (
    <div className="min-h-screen bg-[hsl(225,20%,6%)] text-white p-4">
      {/* Daily Brief - Top */}
      <DailyBrief tasks={todaysTasks} />
      
      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Left: Timeline */}
        <div className="lg:col-span-2">
          <TimelineView tasks={todaysTasks} />
        </div>
        
        {/* Right: Projects & Quick Capture */}
        <div className="space-y-6">
          <QuickCapture />
          <ProjectList projects={activeProjects} compact />
        </div>
      </div>
    </div>
  );
}
```

### 2. Quick Capture Component

```tsx
// src/components/QuickCapture.tsx
import { useState } from 'react';
import { Mic, Plus, Brain } from 'lucide-react';

export function QuickCapture() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'task' | 'note' | 'idea'>('task');
  
  async function handleCapture() {
    if (!input.trim()) return;
    
    if (mode === 'task') {
      await projectService.addTaskToProject('inbox', {
        title: input,
        source: 'personal',
        priority: 'B'
      });
    } else if (mode === 'note') {
      await lifeDB.knowledge.add({
        id: crypto.randomUUID(),
        content: input,
        type: 'note',
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    } else if (mode === 'idea') {
      await lifeDB.knowledge.add({
        id: crypto.randomUUID(),
        content: input,
        type: 'idea',
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      eventBus.emit('idea.created', { content: input });
    }
    
    setInput('');
  }
  
  return (
    <div className="bg-[hsl(217,33%,17%)]/50 rounded-2xl p-4 border border-white/10">
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setMode('task')}
          className={`px-3 py-1 rounded-lg ${mode === 'task' ? 'bg-violet-500/20' : ''}`}
        >
          Task
        </button>
        <button
          onClick={() => setMode('note')}
          className={`px-3 py-1 rounded-lg ${mode === 'note' ? 'bg-violet-500/20' : ''}`}
        >
          Note
        </button>
        <button
          onClick={() => setMode('idea')}
          className={`px-3 py-1 rounded-lg ${mode === 'idea' ? 'bg-violet-500/20' : ''}`}
        >
          Idea
        </button>
      </div>
      
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleCapture()}
          placeholder={`Capture ${mode}...`}
          className="flex-1 bg-white/5 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500/50"
        />
        <button
          onClick={handleCapture}
          className="p-2 bg-violet-500/20 rounded-lg hover:bg-violet-500/30"
        >
          <Plus className="w-5 h-5" />
        </button>
        <button className="p-2 bg-cyan-500/20 rounded-lg hover:bg-cyan-500/30">
          <Mic className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
```

---

## Next Week Plan

### Week 2: Fitness Module
- Training plan generator
- Readiness scoring
- Nutrition tracker
- Recovery optimizer

### Week 3: Finance Module  
- Transaction tracking
- Budget alerts
- Project profitability

### Week 4: Knowledge Hub
- AI summaries
- Smart search
- Project linking

---

## Immediate Actions (Today)

1. Create module folders:
```bash
mkdir -p src/modules/{projects,timeline,fitness,finance,knowledge}
```

2. Install additional dependencies:
```bash
npm install @supabase/supabase-js openai gmail-api-client
```

3. Set up environment variables:
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_OPENAI_API_KEY=
VITE_GMAIL_CLIENT_ID=
```

4. Start with Project module as it has immediate ROI
