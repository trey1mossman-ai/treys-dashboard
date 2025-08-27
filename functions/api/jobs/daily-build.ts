import { json } from '../../_utils/json';
import type { AgendaItem, StatusSnapshot, InventoryItem } from '@/types/mission-control';

export interface Env {
  DB: D1Database;
  MISSION_CONTROL: DurableObjectNamespace;
}

// Durable Object for scheduling
export class DailyBuildScheduler {
  private state: DurableObjectState;
  private env: Env;
  
  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }
  
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === '/schedule') {
      await this.scheduleDailyBuild();
      return new Response('Daily build scheduled');
    }
    
    if (url.pathname === '/execute') {
      const result = await this.executeDailyBuild();
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Not found', { status: 404 });
  }
  
  async scheduleDailyBuild() {
    // Schedule for 05:30 local time (Mountain Time)
    const now = new Date();
    const denver = new Date(now.toLocaleString('en-US', { timeZone: 'America/Denver' }));
    const next530 = new Date(denver);
    next530.setHours(5, 30, 0, 0);
    
    // If it's past 05:30 today, schedule for tomorrow
    if (denver >= next530) {
      next530.setDate(next530.getDate() + 1);
    }
    
    const delay = next530.getTime() - Date.now();
    
    // Set alarm
    await this.state.storage.setAlarm(Date.now() + delay);
  }
  
  async alarm() {
    // Execute the daily build
    await this.executeDailyBuild();
    
    // Schedule the next one
    await this.scheduleDailyBuild();
  }
  
  async executeDailyBuild() {
    console.log('Executing daily build at', new Date().toISOString());
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      // 1. Purge yesterday's pending items (configurable behavior)
      const purgeResult = await this.env.DB.prepare(
        `DELETE FROM agenda_items 
         WHERE DATE(start_time) < ? 
         AND status = 'pending'`
      ).bind(today).run();
      
      // 2. Get latest status snapshot
      const latestStatus = await this.env.DB.prepare(
        `SELECT * FROM status_snapshots 
         ORDER BY captured_at DESC 
         LIMIT 1`
      ).first() as StatusSnapshot | null;
      
      // 3. Check inventory for low/out items
      const lowStockItems = await this.env.DB.prepare(
        `SELECT * FROM inventory_items 
         WHERE current_qty <= min_qty`
      ).all();
      
      // 4. Create notifications for low stock
      if (lowStockItems.results.length > 0) {
        const notificationStmt = this.env.DB.prepare(
          `INSERT INTO notifications 
           (id, type, message, severity, related_ids, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        );
        
        const notifications = lowStockItems.results.map((item: any) => {
          const isOut = item.current_qty === 0;
          return notificationStmt.bind(
            `notif-${item.id}-${Date.now()}`,
            'low_stock',
            isOut 
              ? `${item.name} is OUT OF STOCK` 
              : `${item.name} is low (${item.current_qty} ${item.unit} remaining)`,
            isOut ? 'critical' : 'warn',
            JSON.stringify([item.id]),
            new Date().toISOString()
          );
        });
        
        await this.env.DB.batch(notifications);
      }
      
      // 5. Get today's agenda items
      const todayAgenda = await this.env.DB.prepare(
        `SELECT * FROM agenda_items 
         WHERE DATE(start_time) = ? 
         ORDER BY start_time`
      ).bind(today).all();
      
      // 6. Log the build
      await this.env.DB.prepare(
        `INSERT INTO command_logs 
         (id, command_type, payload, status, created_at)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(
        `build-${Date.now()}`,
        'daily_build',
        JSON.stringify({
          purged: purgeResult.meta.changes,
          agenda_count: todayAgenda.results.length,
          low_stock_count: lowStockItems.results.length
        }),
        'completed',
        new Date().toISOString()
      ).run();
      
      return {
        success: true,
        timestamp: new Date().toISOString(),
        stats: {
          purged_items: purgeResult.meta.changes,
          today_agenda_count: todayAgenda.results.length,
          low_stock_items: lowStockItems.results.length,
          has_status: latestStatus !== null
        }
      };
      
    } catch (error: any) {
      console.error('Daily build error:', error);
      
      // Log the error
      await this.env.DB.prepare(
        `INSERT INTO command_logs 
         (id, command_type, payload, status, created_at, response)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(
        `build-error-${Date.now()}`,
        'daily_build',
        JSON.stringify({ error: error.message }),
        'failed',
        new Date().toISOString(),
        JSON.stringify({ error: error.message })
      ).run();
      
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// API endpoint to trigger manual build or check status
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  
  if (request.method === 'POST' && url.pathname.endsWith('/trigger')) {
    // Manually trigger the daily build
    const id = env.MISSION_CONTROL.idFromName('scheduler');
    const scheduler = env.MISSION_CONTROL.get(id);
    
    const response = await scheduler.fetch(
      new Request('http://internal/execute')
    );
    
    const result = await response.json();
    return json(result);
  }
  
  if (request.method === 'GET' && url.pathname.endsWith('/status')) {
    // Get the last build status
    const lastBuild = await env.DB.prepare(
      `SELECT * FROM command_logs 
       WHERE command_type = 'daily_build' 
       ORDER BY created_at DESC 
       LIMIT 1`
    ).first();
    
    return json({
      last_build: lastBuild,
      next_scheduled: getNext530()
    });
  }
  
  return json({ error: 'Not found' }, 404);
};

function getNext530(): string {
  const now = new Date();
  const denver = new Date(now.toLocaleString('en-US', { timeZone: 'America/Denver' }));
  const next530 = new Date(denver);
  next530.setHours(5, 30, 0, 0);
  
  if (denver >= next530) {
    next530.setDate(next530.getDate() + 1);
  }
  
  return next530.toISOString();
}