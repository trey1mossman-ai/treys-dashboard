import { json } from '../../_utils/json';
import { corsHeaders, handleOptions } from '../../_utils/cors';
import type { WorkoutFeedPayload, AgendaItem } from '@/types/mission-control';

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
    
    const payload: WorkoutFeedPayload = await context.request.json();
    
    // Validate required fields
    if (!payload.workout || !payload.scheduled_time || !payload.duration_minutes) {
      return json({ error: 'Invalid payload: workout, scheduled_time, and duration_minutes required' }, 400);
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
    
    // Calculate end time
    const startTime = new Date(payload.scheduled_time);
    const endTime = new Date(startTime.getTime() + payload.duration_minutes * 60000);
    
    // Create workout agenda item
    const blockSummary = payload.workout.blocks
      .map(block => `${block.name} (${block.target_sets}x${block.target_reps})`)
      .join(', ');
    
    const agendaItem: AgendaItem = {
      id: `workout-${startTime.toISOString().split('T')[0]}`,
      title: payload.workout.plan_name,
      source: 'workout' as const,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: 'pending' as const,
      metadata: {
        display_notes: `${payload.workout.intensity_flag.toUpperCase()} intensity: ${blockSummary}`,
        workout: payload.workout,
        duration_minutes: payload.duration_minutes
      }
    };
    
    // Store in database
    await context.env.DB.prepare(
      `INSERT OR REPLACE INTO agenda_items 
       (id, title, source, start_time, end_time, status, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      agendaItem.id,
      agendaItem.title,
      agendaItem.source,
      agendaItem.start_time,
      agendaItem.end_time || null,
      agendaItem.status,
      JSON.stringify(agendaItem.metadata),
      new Date().toISOString()
    ).run();
    
    // Store workout details
    await context.env.DB.prepare(
      `INSERT OR REPLACE INTO workout_plans 
       (date, data, updated_at)
       VALUES (?, ?, ?)`
    ).bind(
      startTime.toISOString().split('T')[0],
      JSON.stringify(payload.workout),
      new Date().toISOString()
    ).run();
    
    // Log the webhook
    await context.env.DB.prepare(
      'INSERT INTO webhook_logs (idempotency_key, source, processed_at) VALUES (?, ?, ?)'
    ).bind(payload.idempotency_key, 'workout', new Date().toISOString()).run();
    
    return json({
      success: true,
      processed: 1,
      idempotency_key: payload.idempotency_key
    });
    
  } catch (error: any) {
    console.error('Workout webhook error:', error);
    return json({ error: error.message || 'Internal server error' }, 500);
  }
};