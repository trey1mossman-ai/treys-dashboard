// Assistant Tools Service - Day 5 Implementation (TypeScript Fixed)
// Team Lead: Claude - Day 6 TypeScript Improvements
// Enables AI to operate the UI directly with proper type safety

import { db } from '@/services/db';
import { AgendaItem, TodoItem, NoteItem, QuickAction } from '@/services/db';

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface ParameterDefinition {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  default?: unknown;
}

export interface AssistantTool {
  name: string;
  description: string;
  parameters: Record<string, ParameterDefinition>;
  execute: (params: Record<string, unknown>) => Promise<ToolResult>;
}

// Tool Registry with proper typing
export const assistantTools: Record<string, AssistantTool> = {
  // ===== AGENDA TOOLS =====
  'agenda.create': {
    name: 'Create Agenda Item',
    description: 'Add a new item to the agenda',
    parameters: {
      title: { type: 'string', required: true },
      startTime: { type: 'string', required: true },
      endTime: { type: 'string', required: true },
      location: { type: 'string', required: false },
      attendees: { type: 'array', required: false }
    },
    execute: async (params) => {
      try {
        const agendaItem: AgendaItem = {
          id: `agenda-${Date.now()}`,
          title: params.title as string,
          startTime: new Date(params.startTime as string).getTime(),
          endTime: new Date(params.endTime as string).getTime(),
          location: (params.location as string) || '',
          attendees: (params.attendees as string[]) || [],
          status: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        
        await db.agenda.add(agendaItem);
        
        // Trigger UI update
        window.dispatchEvent(new CustomEvent('agenda:created', { detail: agendaItem }));
        
        return { success: true, data: agendaItem };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  },
  
  'agenda.update': {
    name: 'Update Agenda Item',
    description: 'Modify an existing agenda item',
    parameters: {
      id: { type: 'string', required: true },
      updates: { type: 'object', required: true }
    },
    execute: async (params) => {
      try {
        const updates = params.updates as Partial<AgendaItem>;
        await db.agenda.update(params.id as string, {
          ...updates,
          updatedAt: Date.now()
        });
        
        const updated = await db.agenda.get(params.id as string);
        window.dispatchEvent(new CustomEvent('agenda:updated', { detail: updated }));
        
        return { success: true, data: updated };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  },
  
  'agenda.delete': {
    name: 'Delete Agenda Item',
    description: 'Remove an item from the agenda',
    parameters: {
      id: { type: 'string', required: true }
    },
    execute: async (params) => {
      try {
        const id = params.id as string;
        await db.agenda.delete(id);
        window.dispatchEvent(new CustomEvent('agenda:deleted', { detail: { id } }));
        
        return { success: true, data: { deleted: id } };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  },
  
  // ===== QUICK ACTION TOOLS =====
  'actions.create': {
    name: 'Create Quick Action',
    description: 'Add a new quick action webhook',
    parameters: {
      name: { type: 'string', required: true },
      webhookUrl: { type: 'string', required: true },
      method: { type: 'string', required: false, default: 'POST' },
      payload: { type: 'object', required: false }
    },
    execute: async (params) => {
      try {
        const action: QuickAction = {
          id: `action-${Date.now()}`,
          name: params.name as string,
          webhookUrl: params.webhookUrl as string,
          method: (params.method as 'GET' | 'POST') || 'POST',
          payload: params.payload,
          runCount: 0
        };
        
        await db.quickActions.add(action);
        window.dispatchEvent(new CustomEvent('action:created', { detail: action }));
        
        return { success: true, data: action };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  },
  
  'actions.execute': {
    name: 'Execute Quick Action',
    description: 'Trigger a quick action webhook',
    parameters: {
      id: { type: 'string', required: true }
    },
    execute: async (params) => {
      try {
        const action = await db.quickActions.get(params.id as string);
        if (!action) throw new Error('Action not found');
        
        // Execute webhook
        const response = await fetch(action.webhookUrl, {
          method: action.method,
          headers: action.headers || { 'Content-Type': 'application/json' },
          body: action.payload ? JSON.stringify(action.payload) : undefined
        });
        
        // Update run count and last run
        await db.quickActions.update(action.id, {
          runCount: action.runCount + 1,
          lastRun: Date.now()
        });
        
        window.dispatchEvent(new CustomEvent('action:executed', { 
          detail: { action, response: response.ok } 
        }));
        
        return { success: response.ok, data: { status: response.status } };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  },
  
  // ===== NOTE TOOLS =====
  'notes.create': {
    name: 'Create Sticky Note',
    description: 'Add a new sticky note to the board',
    parameters: {
      content: { type: 'string', required: true },
      color: { type: 'string', required: false },
      position: { type: 'object', required: false }
    },
    execute: async (params) => {
      try {
        const note: NoteItem = {
          id: `note-${Date.now()}`,
          content: params.content as string,
          color: (params.color as string) || 'yellow',
          position: (params.position as { x: number; y: number }) || 
                   { x: Math.random() * 500, y: Math.random() * 300 },
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        
        await db.notes.add(note);
        window.dispatchEvent(new CustomEvent('note:created', { detail: note }));
        
        return { success: true, data: note };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  },
  
  'notes.position': {
    name: 'Move Sticky Note',
    description: 'Update the position of a sticky note',
    parameters: {
      id: { type: 'string', required: true },
      position: { type: 'object', required: true }
    },
    execute: async (params) => {
      try {
        const id = params.id as string;
        const position = params.position as { x: number; y: number };
        
        await db.notes.update(id, {
          position,
          updatedAt: Date.now()
        });
        
        window.dispatchEvent(new CustomEvent('note:moved', { 
          detail: { id, position } 
        }));
        
        return { success: true, data: { id, position } };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  },
  
  // ===== ANALYTICS TOOLS =====
  'summarize.day': {
    name: 'Summarize Day',
    description: 'Generate a summary of today\'s activities',
    parameters: {},
    execute: async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Gather today's data
        const todos = await db.todos
          .where('createdAt')
          .between(today.getTime(), tomorrow.getTime())
          .toArray();
        
        const completedTodos = todos.filter(t => t.completed).length;
        const totalTodos = todos.length;
        
        const agenda = await db.agenda
          .where('startTime')
          .between(today.getTime(), tomorrow.getTime())
          .toArray();
        
        const notes = await db.notes
          .where('createdAt')
          .between(today.getTime(), tomorrow.getTime())
          .toArray();
        
        const summary = {
          date: today.toDateString(),
          todos: {
            total: totalTodos,
            completed: completedTodos,
            completionRate: totalTodos > 0 ? (completedTodos / totalTodos * 100).toFixed(1) + '%' : '0%'
          },
          agenda: {
            total: agenda.length,
            completed: agenda.filter(a => a.status === 'synced').length
          },
          notes: {
            created: notes.length
          },
          productivity: completedTodos >= 5 ? 'High' : completedTodos >= 3 ? 'Medium' : 'Low'
        };
        
        return { success: true, data: summary };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  },
  
  'analyze.trends': {
    name: 'Analyze Trends',
    description: 'Analyze productivity trends over the past week',
    parameters: {},
    execute: async () => {
      try {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const todos = await db.todos
          .where('createdAt')
          .above(weekAgo.getTime())
          .toArray();
        
        // Group by day
        const dailyStats = new Map<string, { total: number; completed: number }>();
        
        todos.forEach(todo => {
          const day = new Date(todo.createdAt).toDateString();
          const stats = dailyStats.get(day) || { total: 0, completed: 0 };
          stats.total++;
          if (todo.completed) stats.completed++;
          dailyStats.set(day, stats);
        });
        
        const trends = {
          weeklyTotal: todos.length,
          weeklyCompleted: todos.filter(t => t.completed).length,
          averageDaily: (todos.length / 7).toFixed(1),
          completionRate: todos.length > 0 
            ? (todos.filter(t => t.completed).length / todos.length * 100).toFixed(1) + '%'
            : '0%',
          dailyBreakdown: Array.from(dailyStats.entries()).map(([day, stats]) => ({
            day,
            ...stats,
            rate: stats.total > 0 ? (stats.completed / stats.total * 100).toFixed(1) + '%' : '0%'
          }))
        };
        
        return { success: true, data: trends };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  }
};

// Tool execution handler with proper typing
export async function executeAssistantTool(
  toolName: string, 
  parameters: Record<string, unknown>
): Promise<ToolResult> {
  const tool = assistantTools[toolName];
  
  if (!tool) {
    return { 
      success: false, 
      error: `Unknown tool: ${toolName}` 
    };
  }
  
  try {
    // Validate required parameters
    const paramDef = tool.parameters;
    for (const [key, def] of Object.entries(paramDef)) {
      if (def.required && !(key in parameters)) {
        return { 
          success: false, 
          error: `Missing required parameter: ${key}` 
        };
      }
    }
    
    // Execute the tool
    const result = await tool.execute(parameters);
    
    // Development logging - will be removed in production
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Assistant Tool] Executed ${toolName}:`, result);
    }
    
    return result;
  } catch (error) {
    // Development error logging - will be removed in production
    if (process.env.NODE_ENV === 'development') {
      console.error(`[Assistant Tool] Error executing ${toolName}:`, error);
    }
    return { 
      success: false, 
      error: String(error) 
    };
  }
}

// Export tool descriptions for AI context
export function getToolDescriptions(): string {
  return Object.entries(assistantTools)
    .map(([name, tool]) => `- ${name}: ${tool.description}`)
    .join('\n');
}