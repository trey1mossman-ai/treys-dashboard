import { corsHeaders, handleOptions } from '../../_utils/cors';
import { json, readJSON } from '../../_utils/json';

export async function onRequestPost(context: any) {
  const { request, env } = context;
  
  if (request.method === 'OPTIONS') {
    return handleOptions(env);
  }

  try {
    const body = await readJSON(request);
    const { 
      id = crypto.randomUUID(),
      date,
      title,
      tag = null,
      start_ts,
      end_ts,
      notes = null,
      tz = 'America/Chicago'
    } = body;

    // Validation
    if (!date || !title || !start_ts || !end_ts) {
      return json({ ok: false, error: 'Missing required fields' }, 400);
    }

    if (start_ts >= end_ts) {
      return json({ ok: false, error: 'Invalid time range' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);

    // Check if updating or creating
    const existing = await env.DB.prepare(
      'SELECT id FROM agenda_items WHERE id = ? AND deleted_at IS NULL'
    ).bind(id).first();

    if (existing) {
      // Update existing
      await env.DB.prepare(`
        UPDATE agenda_items 
        SET date = ?, title = ?, tag = ?, start_ts = ?, end_ts = ?, notes = ?, 
            tz = ?, cal_sync_status = 'pending', updated_at = ?
        WHERE id = ?
      `).bind(date, title, tag, start_ts, end_ts, notes, tz, now, id).run();

      // Enqueue calendar update
      await env.DB.prepare(`
        INSERT INTO cal_outbox (agenda_id, action, payload, next_attempt_at)
        VALUES (?, 'update', ?, ?)
      `).bind(
        id,
        JSON.stringify({ id, date, title, tag, start_ts, end_ts, notes, tz }),
        now
      ).run();

    } else {
      // Create new
      await env.DB.prepare(`
        INSERT INTO agenda_items (id, date, title, tag, start_ts, end_ts, notes, tz, 
                                 cal_sync_status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `).bind(id, date, title, tag, start_ts, end_ts, notes, tz, now, now).run();

      // Enqueue calendar create
      await env.DB.prepare(`
        INSERT INTO cal_outbox (agenda_id, action, payload, next_attempt_at)
        VALUES (?, 'create', ?, ?)
      `).bind(
        id,
        JSON.stringify({ id, date, title, tag, start_ts, end_ts, notes, tz }),
        now
      ).run();
    }

    return json({ ok: true, id }, 200);
    
  } catch (error: any) {
    console.error('Upsert error:', error);
    return json({ ok: false, error: error.message }, 500);
  }
}

export const onRequest = onRequestPost;