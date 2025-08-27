import { json } from '../../_utils/json';
import { corsHeaders, handleOptions } from '../../_utils/cors';
import type { SupplementsFeedPayload, AgendaItem } from '@/types/mission-control';

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
    
    const payload: SupplementsFeedPayload = await context.request.json();
    
    // Validate required fields
    if (!payload.routines || !Array.isArray(payload.routines)) {
      return json({ error: 'Invalid payload: routines array required' }, 400);
    }
    
    if (!payload.date || !payload.idempotency_key) {
      return json({ error: 'Invalid payload: date and idempotency_key required' }, 400);
    }
    
    // Check for duplicate submission
    const existing = await context.env.DB.prepare(
      'SELECT id FROM webhook_logs WHERE idempotency_key = ?'
    ).bind(payload.idempotency_key).first();
    
    if (existing) {
      return json({ message: 'Already processed', idempotency_key: payload.idempotency_key }, 200);
    }
    
    // Transform supplement routines to agenda items
    const agendaItems: AgendaItem[] = [];
    
    payload.routines.forEach(routine => {
      routine.schedule.forEach(time => {
        // Create one agenda item per scheduled time
        const itemList = routine.items.map(item => 
          `${item.supplement_name} ${item.dose}${item.unit}${item.with_food ? ' (with food)' : ''}`
        ).join(', ');
        
        agendaItems.push({
          id: `supp-${routine.name}-${time.replace(':', '')}`,
          title: `${routine.name} Supplements`,
          source: 'supplements' as const,
          start_time: `${payload.date}T${time}:00`,
          status: 'pending' as const,
          metadata: {
            display_notes: itemList,
            routine_name: routine.name,
            items: routine.items,
            compliance_percent: routine.compliance_percent
          }
        });
      });
    });
    
    // Store in database
    const stmt = context.env.DB.prepare(
      `INSERT OR REPLACE INTO agenda_items 
       (id, title, source, start_time, end_time, status, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    
    const batch = agendaItems.map(item =>
      stmt.bind(
        item.id,
        item.title,
        item.source,
        item.start_time,
        item.end_time || null,
        item.status,
        JSON.stringify(item.metadata),
        new Date().toISOString()
      )
    );
    
    await context.env.DB.batch(batch);
    
    // Store supplement routines for reference
    await context.env.DB.prepare(
      `INSERT OR REPLACE INTO supplement_routines 
       (date, data, updated_at)
       VALUES (?, ?, ?)`
    ).bind(
      payload.date,
      JSON.stringify(payload.routines),
      new Date().toISOString()
    ).run();
    
    // Log the webhook
    await context.env.DB.prepare(
      'INSERT INTO webhook_logs (idempotency_key, source, processed_at) VALUES (?, ?, ?)'
    ).bind(payload.idempotency_key, 'supplements', new Date().toISOString()).run();
    
    return json({
      success: true,
      processed: agendaItems.length,
      idempotency_key: payload.idempotency_key
    });
    
  } catch (error: any) {
    console.error('Supplements webhook error:', error);
    return json({ error: error.message || 'Internal server error' }, 500);
  }
};