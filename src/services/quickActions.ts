import { mockApi } from './mockApi';

export interface QuickAction {
  id: string;
  name: string;
  method: 'GET' | 'POST';
  webhook_url: string;
  headers?: Record<string, string>;
  default_payload?: any;
  created_at?: string;
}

export interface ExecActionRequest {
  payload?: any;
}

export interface ExecActionResponse {
  ok: boolean;
  id?: string;
  status?: number;
  data?: any;
  error?: string;
}

const API_BASE = '/api/quick_actions';

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

export const quickActionsService = {
  async list(): Promise<QuickAction[]> {
    if (USE_MOCK) {
      console.log('Using mock API for quick actions list');
      return mockApi.listQuickActions();
    }
    
    try {
      const response = await fetch(`${API_BASE}/list`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || 'Failed to fetch actions');
      return data.actions || [];
    } catch (error) {
      console.error('API error, falling back to mock:', error);
      // Fallback to mock if API fails
      return mockApi.listQuickActions();
    }
  },

  async create(action: Omit<QuickAction, 'id' | 'created_at'>): Promise<QuickAction> {
    if (USE_MOCK) {
      return mockApi.createQuickAction(action);
    }
    
    try {
      const response = await fetch(`${API_BASE}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action)
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || 'Failed to create action');
      return data.action;
    } catch (error) {
      console.error('Error creating quick action:', error);
      throw error;
    }
  },

  async update(action: QuickAction): Promise<QuickAction> {
    if (USE_MOCK) {
      return mockApi.updateQuickAction(action);
    }
    
    try {
      const response = await fetch(`${API_BASE}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action)
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || 'Failed to update action');
      return data.action;
    } catch (error) {
      console.error('Error updating quick action:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    if (USE_MOCK) {
      return mockApi.deleteQuickAction(id);
    }
    
    try {
      const response = await fetch(`${API_BASE}/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || 'Failed to delete action');
    } catch (error) {
      console.error('Error deleting quick action:', error);
      throw error;
    }
  },

  async execute(id: string, payload?: any): Promise<ExecActionResponse> {
    if (USE_MOCK) {
      return mockApi.executeQuickAction(id, payload);
    }
    
    try {
      const response = await fetch(`${API_BASE}/exec/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error executing quick action:', error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to execute action'
      };
    }
  }
};