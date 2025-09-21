#!/bin/bash

# Life OS Setup Script - Run this NOW to start building
# Execute: ./setup-lifeos.sh

echo "🚀 Setting up Life OS Architecture..."

# 1. Create module structure
echo "📁 Creating module directories..."
mkdir -p src/modules/projects/{components,services,hooks,types}
mkdir -p src/modules/timeline/{components,services,hooks,types}
mkdir -p src/modules/fitness/{components,services,hooks,types}
mkdir -p src/modules/finance/{components,services,hooks,types}
mkdir -p src/modules/knowledge/{components,services,hooks,types}
mkdir -p src/modules/relationships/{components,services,hooks,types}
mkdir -p src/modules/automation/{components,services,hooks,types}
mkdir -p src/modules/travel/{components,services,hooks,types}
mkdir -p src/modules/content/{components,services,hooks,types}
mkdir -p src/modules/review/{components,services,hooks,types}
mkdir -p src/modules/growth/{components,services,hooks,types}
mkdir -p src/modules/future/{components,services,hooks,types}

# 2. Install required dependencies
echo "📦 Installing Life OS dependencies..."
npm install --save \
  @supabase/supabase-js \
  openai \
  @react-email/components \
  react-big-calendar \
  react-beautiful-dnd \
  react-hook-form \
  zod \
  date-fns \
  lodash \
  papaparse \
  file-saver \
  react-markdown

# 3. Create environment template
echo "🔐 Creating environment template..."
cat > .env.lifeos.example << 'EOF'
# Life OS Configuration

# Database (Supabase)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# AI Services
VITE_OPENAI_API_KEY=sk-...

# Email Integration
VITE_GMAIL_CLIENT_ID=your-client-id
VITE_GMAIL_CLIENT_SECRET=your-client-secret

# Calendar
VITE_GOOGLE_CALENDAR_API_KEY=your-key

# n8n Automation
VITE_N8N_WEBHOOK_URL=https://your-n8n.com/webhook

# Feature Flags
VITE_ENABLE_PROJECTS=true
VITE_ENABLE_FITNESS=true
VITE_ENABLE_FINANCE=true
VITE_ENABLE_KNOWLEDGE=true
VITE_ENABLE_RELATIONSHIPS=false
VITE_ENABLE_TRAVEL=false
VITE_ENABLE_AUTOMATION=false
EOF

# 4. Create base services
echo "⚙️ Creating core services..."

# Event Bus
cat > src/services/eventBus.ts << 'EOF'
type EventCallback = (data: any) => void;

class LifeOSEventBus {
  private events: Map<string, EventCallback[]> = new Map();
  
  static EVENTS = {
    TASK_CREATED: 'task.created',
    TASK_UPDATED: 'task.updated',
    TASK_COMPLETED: 'task.completed',
    PROJECT_CREATED: 'project.created',
    PROJECT_UPDATED: 'project.updated',
    WORKOUT_PLANNED: 'workout.planned',
    WORKOUT_COMPLETED: 'workout.completed',
    NOTE_CAPTURED: 'note.captured',
    IDEA_CREATED: 'idea.created',
    SYNC_REQUIRED: 'sync.required',
    MODULE_LOADED: 'module.loaded'
  };

  on(event: string, callback: EventCallback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: EventCallback) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  emit(event: string, data?: any) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
    window.dispatchEvent(new CustomEvent(`lifeos:${event}`, { detail: data }));
    console.log(`[LifeOS] ${event}`, data);
  }
}

export const eventBus = new LifeOSEventBus();
EOF

# 5. Create Life OS main component
cat > src/pages/LifeOS.tsx << 'EOF'
import { useEffect, useState } from 'react';
import { eventBus } from '@/services/eventBus';

export function LifeOS() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [systemStatus, setSystemStatus] = useState('initializing');

  useEffect(() => {
    // Initialize Life OS
    initializeSystem();
  }, []);

  async function initializeSystem() {
    console.log('🚀 Life OS Initializing...');
    
    // Load enabled modules
    const modules = [
      'projects',
      'timeline', 
      'fitness',
      'finance',
      'knowledge'
    ];
    
    for (const module of modules) {
      if (import.meta.env[`VITE_ENABLE_${module.toUpperCase()}`] === 'true') {
        eventBus.emit('module.loaded', { module });
      }
    }
    
    setSystemStatus('ready');
    console.log('✅ Life OS Ready');
  }

  return (
    <div className="min-h-screen bg-[hsl(225,20%,6%)] text-white">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Life OS
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/60">Status: {systemStatus}</span>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </div>
        </div>
      </header>
      
      <nav className="border-b border-white/10 px-6 py-2">
        <div className="flex gap-4">
          {['Dashboard', 'Projects', 'Timeline', 'Fitness', 'Finance', 'Knowledge'].map(module => (
            <button
              key={module}
              onClick={() => setActiveModule(module.toLowerCase())}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeModule === module.toLowerCase()
                  ? 'bg-violet-500/20 text-violet-300'
                  : 'hover:bg-white/5'
              }`}
            >
              {module}
            </button>
          ))}
        </div>
      </nav>
      
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          {activeModule === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <h2 className="text-lg font-semibold mb-4">Timeline</h2>
                  <p className="text-white/60">Your unified timeline will appear here</p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <h2 className="text-lg font-semibold mb-4">Quick Capture</h2>
                  <input 
                    type="text" 
                    placeholder="Add task, note, or idea..."
                    className="w-full bg-white/5 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <h2 className="text-lg font-semibold mb-4">Active Projects</h2>
                  <p className="text-white/60">0 active projects</p>
                </div>
              </div>
            </div>
          )}
          
          {activeModule === 'projects' && (
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-semibold mb-4">Project Management</h2>
              <p className="text-white/60">Project module coming soon...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
EOF

# 6. Update routes
echo "🛣️ Adding Life OS routes..."
cat > src/routes/lifeOSRoutes.tsx << 'EOF'
import { Routes, Route } from 'react-router-dom';
import { LifeOS } from '@/pages/LifeOS';

export function LifeOSRoutes() {
  return (
    <Routes>
      <Route path="/lifeos/*" element={<LifeOS />} />
    </Routes>
  );
}
EOF

# 7. Create migration script from old to new
cat > src/migrations/migrateToLifeOS.ts << 'EOF'
import { db } from '@/services/db'; // Old DB
import { lifeDB } from '@/services/lifeOS-db'; // New DB

export async function migrateToLifeOS() {
  console.log('Starting Life OS migration...');
  
  // Migrate todos to tasks
  const todos = await db.todos.toArray();
  for (const todo of todos) {
    await lifeDB.tasks.add({
      id: todo.id,
      title: todo.title,
      description: todo.description,
      source: 'personal',
      status: todo.completed ? 'done' : 'todo',
      priority: todo.priority || 'B',
      createdAt: todo.createdAt,
      completedAt: todo.completedAt
    });
  }
  
  // Migrate notes to knowledge
  const notes = await db.notes.toArray();
  for (const note of notes) {
    await lifeDB.knowledge.add({
      id: note.id,
      content: note.content,
      type: 'note',
      tags: [],
      createdAt: note.createdAt || Date.now(),
      updatedAt: Date.now()
    });
  }
  
  console.log('Migration complete!');
}
EOF

# 8. Create development dashboard
cat > DEV_DASHBOARD.md << 'EOF'
# Life OS Development Dashboard

## 🚀 Current Sprint: Week 1
**Focus:** Foundation + Project Management

### Today's Tasks
- [ ] Set up Supabase project
- [ ] Create database schema
- [ ] Build Project CRUD
- [ ] Implement email scanner
- [ ] Create timeline view

### Module Status
| Module | Status | Priority | Week |
|--------|--------|----------|------|
| Projects | 🟡 Building | P0 | 1 |
| Timeline | 🟡 Building | P0 | 1 |
| Fitness | ⚪ Planned | P1 | 2 |
| Finance | ⚪ Planned | P1 | 3 |
| Knowledge | ⚪ Planned | P2 | 4 |
| Relationships | ⚪ Planned | P3 | 5 |
| Travel | ⚪ Planned | P4 | 6 |

### Quick Commands
```bash
# Start dev
npm run dev

# Open Life OS
http://localhost:5173/lifeos

# Test email scanner
curl -X POST http://localhost:5173/api/scan-emails

# Run migrations
npm run migrate:lifeos
```

### API Keys Needed
1. Supabase - https://supabase.com/dashboard
2. OpenAI - https://platform.openai.com
3. Google APIs - https://console.cloud.google.com

### Architecture Decisions
- Local-first with cloud sync
- Event-driven module communication
- Progressive enhancement (add modules over time)
- Performance budget: <3s load, <1MB bundle

### This Week's Goals
1. ✅ Set up architecture
2. ⬜ Project management working
3. ⬜ Email task extraction
4. ⬜ Unified timeline
5. ⬜ Basic UI complete
EOF

echo ""
echo "✅ Life OS setup complete!"
echo ""
echo "Next steps:"
echo "1. Copy .env.lifeos.example to .env.local and add your keys"
echo "2. Set up Supabase project at https://supabase.com"
echo "3. Run: npm run dev"
echo "4. Navigate to: http://localhost:5173/lifeos"
echo ""
echo "📚 Documentation:"
echo "- Implementation Plan: LIFEOS_IMPLEMENTATION_PLAN.md"
echo "- Week 1 Tasks: WEEK1_IMPLEMENTATION.md"
echo "- Dev Dashboard: DEV_DASHBOARD.md"
echo ""
echo "🎯 Start with the Projects module - it has immediate ROI!"
