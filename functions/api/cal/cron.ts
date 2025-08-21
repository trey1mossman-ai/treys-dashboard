import { corsHeaders, handleOptions } from '../../_utils/cors';
import { json } from '../../_utils/json';
import { createHmacSignature } from '../../_utils/hmac';
import { epochToRFC3339 } from '../../_utils/time';

// This endpoint can be called by a Cron Trigger or manually
// To set up a Cron Trigger in wrangler.toml:
// [[triggers.crons]]
// crons = ["*/5 * * * *"]  # Every 5 minutes
// route = "/api/cal/cron"

export async function onRequest(context: any) {
  const { request, env } = context;
  
  if (request.method === 'OPTIONS') {
    return handleOptions(env);
  }

  try {
    if (env.CAL_SYNC_ENABLED !== 'true') {
      return json({ ok: false, error: 'Calendar sync disabled' }, 503);
    }

    const now = Math.floor(Date.now() / 1000);
    
    // Get pending items from outbox (max 10 at a time)
    const pending = await env.DB.prepare(`
      SELECT o.*, a.title, a.notes, a.start_ts, a.end_ts, a.tz, a.tag, a.cal_event_id
      FROM cal_outbox o
      LEFT JOIN agenda_items a ON o.agenda_id = a.id
      WHERE o.next_attempt_at <= ?
      ORDER BY o.next_attempt_at ASC
      LIMIT 10
    `).bind(now).all();

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const item of pending.results || []) {
      results.processed++;
      
      try {
        // Parse the stored payload
        const storedPayload = JSON.parse(item.payload);
        
        // Build the payload for n8n
        const payload = {
          action: item.action,
          id: item.agenda_id,
          cal_event_id: item.cal_event_id || storedPayload.cal_event_id,
          title: item.title || storedPayload.title,
          description: item.notes || storedPayload.notes || '',
          start: item.start_ts ? epochToRFC3339(item.start_ts, item.tz) : storedPayload.start,
          end: item.end_ts ? epochToRFC3339(item.end_ts, item.tz) : storedPayload.end,
          timezone: item.tz || storedPayload.tz || 'America/Chicago',
          tag: item.tag || storedPayload.tag || null
        };

        // Prepare headers
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.N8N_TOKEN}`
        };

        // Optional HMAC signing
        if (env.N8N_SIGNING_SECRET) {
          const signature = await createHmacSignature(
            env.N8N_SIGNING_SECRET,
            JSON.stringify(payload)
          );
          headers['X-Signature'] = signature;
        }

        // Call n8n webhook
        const response = await fetch(`${env.N8N_BASE_URL}/webhook/calendar-sync`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
          results.succeeded++;
          
          // Update agenda item
          if (result.cal_event_id && item.action !== 'delete') {
            await env.DB.prepare(`
              UPDATE agenda_items 
              SET cal_sync_status = 'ok', cal_event_id = ?
              WHERE id = ?
            `).bind(result.cal_event_id, item.agenda_id).run();
          } else if (item.action === 'delete') {
            await env.DB.prepare(`
              UPDATE agenda_items 
              SET cal_sync_status = 'ok', cal_event_id = NULL
              WHERE id = ?
            `).bind(item.agenda_id).run();
          }

          // Remove from outbox
          await env.DB.prepare(
            'DELETE FROM cal_outbox WHERE id = ?'
          ).bind(item.id).run();
          
        } else {
          results.failed++;
          
          // Update with exponential backoff
          const nextAttempts = item.attempts + 1;
          const backoff = Math.min(3600, 30 * Math.pow(2, nextAttempts));
          const nextAttemptAt = now + backoff;
          
          await env.DB.prepare(`
            UPDATE cal_outbox 
            SET attempts = ?, next_attempt_at = ?
            WHERE id = ?
          `).bind(nextAttempts, nextAttemptAt, item.id).run();
          
          // Mark agenda item as error
          await env.DB.prepare(`
            UPDATE agenda_items SET cal_sync_status = 'error' WHERE id = ?
          `).bind(item.agenda_id).run();
          
          results.errors.push(`${item.agenda_id}: ${result.error || 'Unknown error'}`);
        }
        
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${item.agenda_id}: ${error.message}`);
        
        // Update retry with backoff
        const nextAttempts = item.attempts + 1;
        const backoff = Math.min(3600, 30 * Math.pow(2, nextAttempts));
        const nextAttemptAt = now + backoff;
        
        await env.DB.prepare(`
          UPDATE cal_outbox 
          SET attempts = ?, next_attempt_at = ?
          WHERE id = ?
        `).bind(nextAttempts, nextAttemptAt, item.id).run();
      }
    }

    return json({ ok: true, ...results }, 200);
    
  } catch (error: any) {
    console.error('Calendar cron error:', error);
    return json({ ok: false, error: error.message }, 500);
  }
}

export const onRequestGet = onRequest;
export const onRequestPost = onRequest;