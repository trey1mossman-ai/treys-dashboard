// Mock API for development - replace with real API calls when backend is ready
import type { QuickAction, ExecActionResponse } from './quickActions';
import type { Note } from './notes';

class MockAPI {
  private storage = {
    quickActions: 'agenda_quick_actions',
    notes: 'agenda_notes',
    tasks: 'agenda_tasks'
  };

  // Quick Actions
  async listQuickActions(): Promise<QuickAction[]> {
    const stored = localStorage.getItem(this.storage.quickActions);
    return JSON.parse(stored || '[]');
  }

  async createQuickAction(action: Omit<QuickAction, 'id' | 'created_at'>): Promise<QuickAction> {
    const actions = await this.listQuickActions();
    const newAction: QuickAction = { 
      ...action, 
      id: Date.now().toString(), 
      created_at: new Date().toISOString() 
    };
    actions.push(newAction);
    localStorage.setItem(this.storage.quickActions, JSON.stringify(actions));
    return newAction;
  }

  async updateQuickAction(action: QuickAction): Promise<QuickAction> {
    const actions = await this.listQuickActions();
    const index = actions.findIndex((a: QuickAction) => a.id === action.id);
    if (index !== -1) {
      actions[index] = action;
      localStorage.setItem(this.storage.quickActions, JSON.stringify(actions));
    }
    return action;
  }

  async deleteQuickAction(id: string): Promise<void> {
    const actions = await this.listQuickActions();
    const filtered = actions.filter((a: QuickAction) => a.id !== id);
    localStorage.setItem(this.storage.quickActions, JSON.stringify(filtered));
  }

  async executeQuickAction(id: string, payload?: any): Promise<ExecActionResponse> {
    const actions = await this.listQuickActions();
    const action = actions.find((a: QuickAction) => a.id === id);
    if (!action) {
      return {
        ok: false,
        error: 'Action not found'
      };
    }
    
    // Simulate webhook call
    console.log('Mock executing webhook:', action.webhook_url, payload || action.default_payload);
    
    // Simulate success response
    return { 
      ok: true, 
      id, 
      status: 200, 
      data: { 
        simulated: true,
        action: action.name,
        timestamp: new Date().toISOString()
      } 
    };
  }

  // Notes
  async listNotes(status: 'active' | 'archived' = 'active'): Promise<Note[]> {
    const stored = localStorage.getItem(this.storage.notes);
    const notes: Note[] = JSON.parse(stored || '[]');
    return notes.filter((n: Note) => n.status === status);
  }

  async createNote(body: string, tag?: string): Promise<Note> {
    const notes = JSON.parse(localStorage.getItem(this.storage.notes) || '[]');
    const newNote: Note = {
      id: Date.now().toString(),
      body,
      tag,
      status: 'active',
      created_at: new Date().toISOString()
    };
    notes.push(newNote);
    localStorage.setItem(this.storage.notes, JSON.stringify(notes));
    return newNote;
  }

  async archiveNote(id: string): Promise<void> {
    const notes: Note[] = JSON.parse(localStorage.getItem(this.storage.notes) || '[]');
    const note = notes.find((n: Note) => n.id === id);
    if (note) {
      note.status = 'archived';
      localStorage.setItem(this.storage.notes, JSON.stringify(notes));
    }
  }

  async deleteNote(id: string): Promise<void> {
    const notes: Note[] = JSON.parse(localStorage.getItem(this.storage.notes) || '[]');
    const filtered = notes.filter((n: Note) => n.id !== id);
    localStorage.setItem(this.storage.notes, JSON.stringify(filtered));
  }

  // Tasks (for future use)
  async listTasks(): Promise<any[]> {
    const stored = localStorage.getItem(this.storage.tasks);
    return JSON.parse(stored || '[]');
  }

  async createTask(task: any): Promise<any> {
    const tasks = await this.listTasks();
    const newTask = {
      ...task,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    tasks.push(newTask);
    localStorage.setItem(this.storage.tasks, JSON.stringify(tasks));
    return newTask;
  }
}

export const mockApi = new MockAPI();