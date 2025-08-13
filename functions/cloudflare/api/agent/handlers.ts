import { z } from 'zod';
import type { Env } from './command';

interface ToolHandler {
  validate?: (args: any, env: Env) => Promise<{ valid: boolean; error?: string }>;
  execute: (args: any, env: Env) => Promise<any>;
}

// Validation schemas
const schemas = {
  'agenda.create': z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    title: z.string().min(1).max(200),
    start_ts: z.number().int().positive(),
    end_ts: z.number().int().positive(),
    tag: z.string().max(50).optional(),
    notes: z.string().max(5000).optional()
  }),
  
  'agenda.update': z.object({
    id: z.string().uuid(),
    patch: z.object({
      title: z.string().min(1).max(200).optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      start_ts: z.number().int().positive().optional(),
      end_ts: z.number().int().positive().optional(),
      tag: z.string().max(50).optional(),
      notes: z.string().max(5000).optional()
    })
  }),
  
  'agenda.delete': z.object({
    id: z.string().uuid()
  }),
  
  'agenda.listByDate': z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  }),
  
  'actions.create': z.object({
    name: z.string().min(1).max(100),
    webhook_url: z.string().url(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional().default('POST'),
    headers: z.record(z.string()).optional(),
    default_payload: z.record(z.any()).optional()
  }),
  
  'actions.exec': z.object({
    id: z.string().uuid(),
    payload: z.record(z.any()).optional()
  }),
  
  'notes.create': z.object({
    body: z.string().min(1).max(10000),
    tag: z.string().max(50).optional()
  }),
  
  'notes.archive': z.object({
    id: z.string().uuid()
  }),
  
  'notes.position': z.object({
    id: z.string().uuid(),
    x: z.number().min(0).max(10000),
    y: z.number().min(0).max(10000),
    w: z.number().min(50).max(1000),
    h: z.number().min(50).max(1000)
  }),
  
  'tasks.create': z.object({
    title: z.string().min(1).max(200),
    due_ts: z.number().int().positive().optional(),
    source: z.string().max(50).optional()
  }),
  
  'tasks.toggle': z.object({
    id: z.string().uuid(),
    status: z.enum(['pending', 'completed', 'archived'])
  }),
  
  'tasks.reorder': z.object({
    ids: z.array(z.string().uuid()).min(1).max(100)
  }),
  
  'trainer.upload': z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    title: z.string().max(200).optional(),
    blocks: z.array(z.object({
      type: z.string(),
      content: z.any()
    })).max(100)
  }),
  
  'trainer.log': z.object({
    entries: z.array(z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      exercise: z.string().min(1).max(100),
      set_number: z.number().int().positive(),
      reps: z.number().int().min(0),
      load: z.number().min(0).optional(),
      rpe: z.number().min(1).max(10).optional(),
      notes: z.string().max(500).optional()
    })).min(1).max(200)
  }),
  
  'comms.recent': z.object({
    channel: z.enum(['email', 'sms', 'whatsapp']),
    limit: z.number().int().min(1).max(100).optional().default(10)
  }),
  
  'metrics.update': z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    work_actual: z.number().min(0).max(24).optional(),
    gym_actual: z.number().min(0).max(24).optional(),
    nutrition_actual: z.number().min(0).max(10000).optional()
  }),
  
  'calendar.sync': z.object({
    agenda_id: z.string().uuid(),
    action: z.enum(['create', 'update', 'delete'])
  })
};

// Helper function to validate arguments
async function validateArgs(tool: string, args: any): Promise<{ valid: boolean; error?: string }> {
  const schema = schemas[tool as keyof typeof schemas];
  if (!schema) {
    return { valid: false, error: `No schema defined for tool: ${tool}` };
  }
  
  try {
    schema.parse(args);
    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error.errors?.[0]?.message || 'Validation failed' };
  }
}

// Helper to make internal API calls
async function callInternalAPI(
  env: Env,
  path: string,
  method: string = 'POST',
  body?: any
): Promise<any> {
  const origin = env.VITE_PUBLIC_ORIGIN || 'http://localhost:8788';
  const url = `${origin}${path}`;
  
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Agent-Internal': 'true'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API call failed: ${response.status} ${error}`);
  }
  
  return response.json();
}

// Tool Handlers
export const handlers: Record<string, ToolHandler> = {
  'agenda.create': {
    validate: async (args, env) => validateArgs('agenda.create', args),
    execute: async (args, env) => {
      // Validate time range
      if (args.end_ts <= args.start_ts) {
        throw { code: 'VALIDATION_ERROR', message: 'End time must be after start time' };
      }
      
      // Check for overlapping slots
      const existing = await env.DB.prepare(`
        SELECT id FROM agenda 
        WHERE date = ? 
        AND NOT (end_ts <= ? OR start_ts >= ?)
        AND status != 'deleted'
      `).bind(args.date, args.start_ts, args.end_ts).all();
      
      if (existing.results.length > 0) {
        throw { code: 'CONFLICT', message: 'Time slot overlaps with existing agenda item' };
      }
      
      const id = crypto.randomUUID();
      const now = Date.now();
      
      await env.DB.prepare(`
        INSERT INTO agenda (
          id, date, title, start_ts, end_ts, tag, notes, 
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
      `).bind(
        id, args.date, args.title, args.start_ts, args.end_ts,
        args.tag || null, args.notes || null, now, now
      ).run();
      
      // Queue calendar sync
      try {
        await callInternalAPI(env, '/api/cal/exec', 'POST', {
          agenda_id: id,
          action: 'create'
        });
      } catch (e) {
        console.error('Calendar sync failed:', e);
      }
      
      return { id, cal_sync_status: 'pending' };
    }
  },
  
  'agenda.update': {
    validate: async (args, env) => validateArgs('agenda.update', args),
    execute: async (args, env) => {
      const existing = await env.DB.prepare(
        'SELECT * FROM agenda WHERE id = ? AND status != ?'
      ).bind(args.id, 'deleted').first();
      
      if (!existing) {
        throw { code: 'NOT_FOUND', message: 'Agenda item not found' };
      }
      
      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      
      for (const [key, value] of Object.entries(args.patch)) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
      
      if (updates.length === 0) {
        return { id: args.id, updated: false };
      }
      
      updates.push('updated_at = ?');
      values.push(Date.now());
      values.push(args.id);
      
      await env.DB.prepare(`
        UPDATE agenda SET ${updates.join(', ')} WHERE id = ?
      `).bind(...values).run();
      
      // Queue calendar sync
      try {
        await callInternalAPI(env, '/api/cal/exec', 'POST', {
          agenda_id: args.id,
          action: 'update'
        });
      } catch (e) {
        console.error('Calendar sync failed:', e);
      }
      
      return { id: args.id, updated: true, cal_sync_status: 'pending' };
    }
  },
  
  'agenda.delete': {
    validate: async (args, env) => validateArgs('agenda.delete', args),
    execute: async (args, env) => {
      const result = await env.DB.prepare(
        'UPDATE agenda SET status = ?, updated_at = ? WHERE id = ? AND status != ?'
      ).bind('deleted', Date.now(), args.id, 'deleted').run();
      
      if (result.meta.changes === 0) {
        throw { code: 'NOT_FOUND', message: 'Agenda item not found' };
      }
      
      // Queue calendar sync
      try {
        await callInternalAPI(env, '/api/cal/exec', 'POST', {
          agenda_id: args.id,
          action: 'delete'
        });
      } catch (e) {
        console.error('Calendar sync failed:', e);
      }
      
      return { id: args.id, deleted: true, cal_sync_status: 'pending' };
    }
  },
  
  'agenda.listByDate': {
    validate: async (args, env) => validateArgs('agenda.listByDate', args),
    execute: async (args, env) => {
      const items = await env.DB.prepare(`
        SELECT id, title, start_ts, end_ts, tag, notes 
        FROM agenda 
        WHERE date = ? AND status != ?
        ORDER BY start_ts ASC
      `).bind(args.date, 'deleted').all();
      
      return { date: args.date, items: items.results };
    }
  },
  
  'actions.create': {
    validate: async (args, env) => validateArgs('actions.create', args),
    execute: async (args, env) => {
      const id = crypto.randomUUID();
      const now = Date.now();
      
      await env.DB.prepare(`
        INSERT INTO quick_actions (
          id, name, webhook_url, method, headers, default_payload,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, args.name, args.webhook_url, args.method || 'POST',
        JSON.stringify(args.headers || {}),
        JSON.stringify(args.default_payload || {}),
        now, now
      ).run();
      
      return { id, name: args.name };
    }
  },
  
  'actions.exec': {
    validate: async (args, env) => validateArgs('actions.exec', args),
    execute: async (args, env) => {
      const action = await env.DB.prepare(
        'SELECT * FROM quick_actions WHERE id = ?'
      ).bind(args.id).first();
      
      if (!action) {
        throw { code: 'NOT_FOUND', message: 'Action not found' };
      }
      
      const result = await callInternalAPI(
        env, 
        `/api/automations/exec/${args.id}`,
        'POST',
        args.payload || {}
      );
      
      return { id: args.id, execution_id: result.execution_id, status: result.status };
    }
  },
  
  'notes.create': {
    validate: async (args, env) => validateArgs('notes.create', args),
    execute: async (args, env) => {
      const id = crypto.randomUUID();
      const now = Date.now();
      
      await env.DB.prepare(`
        INSERT INTO notes (
          id, body, tag, x, y, w, h, status, created_at, updated_at
        ) VALUES (?, ?, ?, 100, 100, 300, 200, 'active', ?, ?)
      `).bind(id, args.body, args.tag || null, now, now).run();
      
      return { id };
    }
  },
  
  'notes.archive': {
    validate: async (args, env) => validateArgs('notes.archive', args),
    execute: async (args, env) => {
      const result = await env.DB.prepare(
        'UPDATE notes SET status = ?, updated_at = ? WHERE id = ? AND status != ?'
      ).bind('archived', Date.now(), args.id, 'archived').run();
      
      if (result.meta.changes === 0) {
        throw { code: 'NOT_FOUND', message: 'Note not found' };
      }
      
      return { id: args.id, archived: true };
    }
  },
  
  'notes.position': {
    validate: async (args, env) => validateArgs('notes.position', args),
    execute: async (args, env) => {
      const result = await env.DB.prepare(
        'UPDATE notes SET x = ?, y = ?, w = ?, h = ?, updated_at = ? WHERE id = ?'
      ).bind(args.x, args.y, args.w, args.h, Date.now(), args.id).run();
      
      if (result.meta.changes === 0) {
        throw { code: 'NOT_FOUND', message: 'Note not found' };
      }
      
      return { id: args.id, position: { x: args.x, y: args.y, w: args.w, h: args.h } };
    }
  },
  
  'tasks.create': {
    validate: async (args, env) => validateArgs('tasks.create', args),
    execute: async (args, env) => {
      const id = crypto.randomUUID();
      const now = Date.now();
      
      // Get max position for ordering
      const maxPos = await env.DB.prepare(
        'SELECT MAX(position) as max_pos FROM tasks'
      ).first();
      
      const position = ((maxPos?.max_pos as number) || 0) + 1;
      
      await env.DB.prepare(`
        INSERT INTO tasks (
          id, title, due_ts, source, status, position, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)
      `).bind(
        id, args.title, args.due_ts || null, args.source || 'agent',
        position, now, now
      ).run();
      
      return { id, position };
    }
  },
  
  'tasks.toggle': {
    validate: async (args, env) => validateArgs('tasks.toggle', args),
    execute: async (args, env) => {
      const result = await env.DB.prepare(
        'UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?'
      ).bind(args.status, Date.now(), args.id).run();
      
      if (result.meta.changes === 0) {
        throw { code: 'NOT_FOUND', message: 'Task not found' };
      }
      
      return { id: args.id, status: args.status };
    }
  },
  
  'tasks.reorder': {
    validate: async (args, env) => validateArgs('tasks.reorder', args),
    execute: async (args, env) => {
      const batch = [];
      for (let i = 0; i < args.ids.length; i++) {
        batch.push(
          env.DB.prepare(
            'UPDATE tasks SET position = ?, updated_at = ? WHERE id = ?'
          ).bind(i + 1, Date.now(), args.ids[i])
        );
      }
      
      await env.DB.batch(batch);
      
      return { reordered: args.ids.length };
    }
  },
  
  'trainer.upload': {
    validate: async (args, env) => validateArgs('trainer.upload', args),
    execute: async (args, env) => {
      const id = crypto.randomUUID();
      const now = Date.now();
      
      await env.DB.prepare(`
        INSERT INTO trainer_sessions (
          id, date, title, blocks, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        id, args.date, args.title || `Session ${args.date}`,
        JSON.stringify(args.blocks), now, now
      ).run();
      
      return { id, date: args.date };
    }
  },
  
  'trainer.log': {
    validate: async (args, env) => validateArgs('trainer.log', args),
    execute: async (args, env) => {
      const batch = [];
      const ids = [];
      
      for (const entry of args.entries) {
        const id = crypto.randomUUID();
        ids.push(id);
        
        batch.push(
          env.DB.prepare(`
            INSERT INTO trainer_logs (
              id, date, exercise, set_number, reps, load, rpe, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            id, entry.date, entry.exercise, entry.set_number,
            entry.reps, entry.load || null, entry.rpe || null,
            entry.notes || null, Date.now()
          )
        );
      }
      
      await env.DB.batch(batch);
      
      return { logged: ids.length, ids };
    }
  },
  
  'comms.recent': {
    validate: async (args, env) => validateArgs('comms.recent', args),
    execute: async (args, env) => {
      // This would integrate with your email/SMS/WhatsApp APIs
      // For now, returning mock data structure
      const messages = await env.DB.prepare(`
        SELECT id, channel, sender, subject, body, received_at 
        FROM communications 
        WHERE channel = ?
        ORDER BY received_at DESC
        LIMIT ?
      `).bind(args.channel, args.limit || 10).all();
      
      return { channel: args.channel, messages: messages.results };
    }
  },
  
  'metrics.update': {
    validate: async (args, env) => validateArgs('metrics.update', args),
    execute: async (args, env) => {
      const existing = await env.DB.prepare(
        'SELECT id FROM daily_metrics WHERE date = ?'
      ).bind(args.date).first();
      
      if (existing) {
        // Update existing
        const updates: string[] = [];
        const values: any[] = [];
        
        if (args.work_actual !== undefined) {
          updates.push('work_actual = ?');
          values.push(args.work_actual);
        }
        if (args.gym_actual !== undefined) {
          updates.push('gym_actual = ?');
          values.push(args.gym_actual);
        }
        if (args.nutrition_actual !== undefined) {
          updates.push('nutrition_actual = ?');
          values.push(args.nutrition_actual);
        }
        
        if (updates.length > 0) {
          updates.push('updated_at = ?');
          values.push(Date.now());
          values.push(args.date);
          
          await env.DB.prepare(`
            UPDATE daily_metrics SET ${updates.join(', ')} WHERE date = ?
          `).bind(...values).run();
        }
        
        return { date: args.date, updated: true };
      } else {
        // Insert new
        const id = crypto.randomUUID();
        await env.DB.prepare(`
          INSERT INTO daily_metrics (
            id, date, work_actual, gym_actual, nutrition_actual, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          id, args.date,
          args.work_actual || 0,
          args.gym_actual || 0,
          args.nutrition_actual || 0,
          Date.now()
        ).run();
        
        return { date: args.date, created: true };
      }
    }
  },
  
  'calendar.sync': {
    validate: async (args, env) => validateArgs('calendar.sync', args),
    execute: async (args, env) => {
      const result = await callInternalAPI(env, '/api/cal/exec', 'POST', {
        agenda_id: args.agenda_id,
        action: args.action
      });
      
      return { 
        agenda_id: args.agenda_id, 
        action: args.action,
        sync_id: result.sync_id,
        status: result.status 
      };
    }
  }
};

// Export individual handlers for tree-shaking
export default handlers;