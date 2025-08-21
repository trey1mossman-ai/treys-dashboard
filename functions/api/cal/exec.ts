import { corsHeaders, handleOptions } from '../../_utils/cors';
import { json, readJSON } from '../../_utils/json';
import { createHmacSignature } from '../../_utils/hmac';
import { epochToRFC3339 } from '../../_utils/time';

export async function onRequestPost(context: any) {
  const { request, env } = context;
  
  if (request.method === 'OPTIONS') {
    return handleOptions(env);
  }

  try {
    if (env.CAL_SYNC_ENABLED !== 'true') {
      return json({ ok: false, error: 'Calendar sync disabled' }, 503);
    }

    const body = await readJSON(request);
    const { agenda_id, action } = body;

    if (!agenda_id) {
      return json({ ok: false, error: 'agenda_id required' }, 400);
    }

    // Get agenda item details
    const item = await env.DB.prepare(`
      SELECT * FROM agenda_items WHERE id = ? AND deleted_at IS NULL
    `).bind(agenda_id).first();

    if (!item && action !== 'delete') {
      return json({ ok: false, error: 'Agenda item not found' }, 404);
    }

    // Build normalized payload for n8n
    const payload = {
      action: action || (item.cal_event_id ? 'update' : 'create'),
      id: agenda_id,
      cal_event_id: item?.cal_event_id || null,
      title: item?.title || '',
      description: item?.notes || '',
      start: item ? epochToRFC3339(item.start_ts, item.tz) : null,
      end: item ? epochToRFC3339(item.end_ts, item.tz) : null,
      timezone: item?.tz || 'America/Chicago',
      tag: item?.tag || null
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
      // Update agenda item with calendar info
      if (result.cal_event_id && action !== 'delete') {
        await env.DB.prepare(`
          UPDATE agenda_items 
          SET cal_sync_status = 'ok', cal_event_id = ?
          WHERE id = ?
        `).bind(result.cal_event_id, agenda_id).run();
      } else if (action === 'delete') {
        await env.DB.prepare(`
          UPDATE agenda_items 
          SET cal_sync_status = 'ok', cal_event_id = NULL
          WHERE id = ?
        `).bind(agenda_id).run();
      }

      // Remove from outbox if it exists
      await env.DB.prepare(
        'DELETE FROM cal_outbox WHERE agenda_id = ?'
      ).bind(agenda_id).run();

      return json({ ok: true, cal_event_id: result.cal_event_id }, 200);
    } else {
      // Mark as error
      await env.DB.prepare(`
        UPDATE agenda_items SET cal_sync_status = 'error' WHERE id = ?
      `).bind(agenda_id).run();

      // Re-enqueue with backoff
      const existing = await env.DB.prepare(
        'SELECT attempts FROM cal_outbox WHERE agenda_id = ?'
      ).bind(agenda_id).first();

      const attempts = (existing?.attempts || 0) + 1;
      const backoff = Math.min(3600, 30 * Math.pow(2, attempts));
      const next_attempt = Math.floor(Date.now() / 1000) + backoff;

      if (existing) {
        await env.DB.prepare(`
          UPDATE cal_outbox 
          SET attempts = ?, next_attempt_at = ?
          WHERE agenda_id = ?
        `).bind(attempts, next_attempt, agenda_id).run();
      } else {
        await env.DB.prepare(`
          INSERT INTO cal_outbox (agenda_id, action, payload, attempts, next_attempt_at)
          VALUES (?, ?, ?, ?, ?)
        `).bind(
          agenda_id,
          action || 'update',
          JSON.stringify(payload),
          attempts,
          next_attempt
        ).run();
      }

      return json({ ok: false, error: 'Calendar sync failed', retry_at: next_attempt }, 500);
    }
    
  } catch (error: any) {
    console.error('Calendar exec error:', error);
    return json({ ok: false, error: error.message }, 500);
  }
}

export const onRequest = onRequestPost;