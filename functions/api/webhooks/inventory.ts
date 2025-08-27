import { json } from '../../_utils/json';
import { corsHeaders, handleOptions } from '../../_utils/cors';
import type { InventoryFeedPayload } from '@/types/mission-control';

export interface Env {
  DB: D1Database;
  HMAC_SECRET: string;
}

async function verifyHMAC(request: Request, secret: string): Promise<boolean> {
  const signature = request.headers.get('X-HMAC-Signature');
  const timestamp = request.headers.get('X-Timestamp');
  
  if (!signature || !timestamp) {
    return false;
  }
  
  // Check timestamp is within 5 minutes
  const now = Date.now();
  const requestTime = new Date(timestamp).getTime();
  if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
    return false;
  }
  
  const body = await request.text();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const expectedSignature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body)
  );
  
  const expected = Array.from(new Uint8Array(expectedSignature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return signature === expected;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'OPTIONS') {
    return handleOptions();
  }
  
  if (context.request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }
  
  try {
    // Verify HMAC
    const requestClone = context.request.clone();
    const isValid = await verifyHMAC(requestClone, context.env.HMAC_SECRET);
    
    if (!isValid) {
      return json({ error: 'Invalid signature' }, 401);
    }
    
    const payload: InventoryFeedPayload = await context.request.json();
    
    // Validate required fields
    if (!payload.items || !Array.isArray(payload.items)) {
      return json({ error: 'Invalid payload: items array required' }, 400);
    }
    
    if (!payload.idempotency_key) {
      return json({ error: 'Invalid payload: idempotency_key required' }, 400);
    }
    
    // Check for duplicate submission
    const existing = await context.env.DB.prepare(
      'SELECT id FROM webhook_logs WHERE idempotency_key = ?'
    ).bind(payload.idempotency_key).first();
    
    if (existing) {
      return json({ message: 'Already processed', idempotency_key: payload.idempotency_key }, 200);
    }
    
    // Validate each inventory item
    for (const item of payload.items) {
      if (!item.id || !item.name || !item.category || !item.unit || 
          typeof item.current_qty !== 'number' || typeof item.min_qty !== 'number') {
        return json({ 
          error: `Invalid item: ${item.id || 'unknown'}. Required fields: id, name, category, unit, current_qty, min_qty` 
        }, 400);
      }
    }
    
    // Store inventory items
    const stmt = context.env.DB.prepare(
      `INSERT OR REPLACE INTO inventory_items 
       (id, name, category, unit, current_qty, min_qty, reorder_link, last_updated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    
    const batch = payload.items.map(item =>
      stmt.bind(
        item.id,
        item.name,
        item.category,
        item.unit,
        item.current_qty,
        item.min_qty,
        item.reorder_link || null,
        item.last_updated || new Date().toISOString()
      )
    );
    
    await context.env.DB.batch(batch);
    
    // Check for low stock and create notifications
    const lowStockItems = payload.items.filter(item => item.current_qty <= item.min_qty);
    
    if (lowStockItems.length > 0) {
      const notificationStmt = context.env.DB.prepare(
        `INSERT INTO notifications 
         (id, type, message, severity, related_ids, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      
      const notifications = lowStockItems.map(item => {
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
      
      await context.env.DB.batch(notifications);
    }
    
    // Log the webhook
    await context.env.DB.prepare(
      'INSERT INTO webhook_logs (idempotency_key, source, processed_at) VALUES (?, ?, ?)'
    ).bind(payload.idempotency_key, 'inventory', new Date().toISOString()).run();
    
    return json({
      success: true,
      processed: payload.items.length,
      low_stock_count: lowStockItems.length,
      idempotency_key: payload.idempotency_key
    });
    
  } catch (error: any) {
    console.error('Inventory webhook error:', error);
    return json({ error: error.message || 'Internal server error' }, 500);
  }
};