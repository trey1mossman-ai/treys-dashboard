import { mockApi } from './mockApi';

export interface Note {
  id: string;
  body: string;
  tag?: string;
  status: 'active' | 'archived' | 'deleted';
  created_at?: string;
}

const API_BASE = '/api/notes';

// Better environment detection with fallback
const isProduction = window.location.hostname.includes('pages.dev') || 
                    window.location.hostname.includes('cloudflare') ||
                    window.location.hostname.includes('.workers.dev') ||
                    window.location.port === '8788'; // Wrangler dev port

// Start with mock if not in production
let USE_MOCK = !isProduction;

// Check API health on load
if (isProduction) {
  fetch('/api/health')
    .then(res => res.json())
    .then(data => {
      if (!data.ok) {
        console.warn('API health check failed, falling back to mock');
        USE_MOCK = true;
      }
    })
    .catch(() => {
      console.warn('API not reachable, falling back to mock');
      USE_MOCK = true;
    });
}

export const notesService = {
  async list(status: 'active' | 'archived' = 'active'): Promise<Note[]> {
    if (USE_MOCK) {
      console.log('Using mock API for notes list');
      return mockApi.listNotes(status);
    }
    
    try {
      const response = await fetch(`${API_BASE}/list?status=${status}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || 'Failed to fetch notes');
      return data.notes || [];
    } catch (error) {
      console.error('API error, falling back to mock:', error);
      // Fallback to mock if API fails
      return mockApi.listNotes(status);
    }
  },

  async create(body: string, tag?: string): Promise<Note> {
    if (USE_MOCK) {
      return mockApi.createNote(body, tag);
    }
    
    try {
      const response = await fetch(`${API_BASE}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, tag })
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || 'Failed to create note');
      // Also save to localStorage for offline access
      const newNote = data.note;
      await mockApi.createNote(newNote.body, newNote.tag);
      return newNote;
    } catch (error) {
      console.error('API error, falling back to mock:', error);
      // Fallback to mock if API fails
      return mockApi.createNote(body, tag);
    }
  },

  async archive(id: string): Promise<void> {
    if (USE_MOCK) {
      return mockApi.archiveNote(id);
    }
    
    try {
      const response = await fetch(`${API_BASE}/archive`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || 'Failed to archive note');
    } catch (error) {
      console.error('Error archiving note:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    if (USE_MOCK) {
      return mockApi.deleteNote(id);
    }
    
    try {
      const response = await fetch(`${API_BASE}/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || 'Failed to delete note');
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  }
};