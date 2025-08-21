import { corsHeaders, handleOptions } from '../../_utils/cors';
import { json, readJSON } from '../../_utils/json';

export async function onRequestPost(context: any) {
  const { request, env } = context;
  
  if (request.method === 'OPTIONS') {
    return handleOptions(env);
  }

  try {
    const body = await readJSON(request);
    const { date, title, start_ts, end_ts, tag = null, notes = null } = body;

    // Strict validation for AI-created items
    if (!date || !title || !start_ts || !end_ts) {
      return json({ ok: false, error: 'Missing required fields' }, 400);
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return json({ ok: false, error: 'Invalid date format' }, 400);
    }

    // Validate timestamps
    if (typeof start_ts !== 'number' || typeof end_ts !== 'number') {
      return json({ ok: false, error: 'Timestamps must be numbers' }, 400);
    }

    if (start_ts >= end_ts) {
      return json({ ok: false, error: 'Invalid time range' }, 400);
    }

    // Check for overlaps
    const overlaps = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM agenda_items 
      WHERE date = ? AND deleted_at IS NULL
      AND ((start_ts <= ? AND end_ts > ?) OR (start_ts < ? AND end_ts >= ?))
    `).bind(date, start_ts, start_ts, end_ts, end_ts).first();

    if (overlaps.count > 0) {
      return json({ ok: false, error: 'Time slot conflicts with existing item' }, 409);
    }

    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    // Create the agenda item
    await env.DB.prepare(`
      INSERT INTO agenda_items (id, date, title, tag, start_ts, end_ts, notes, 
                               cal_sync_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).bind(id, date, title, tag, start_ts, end_ts, notes, now, now).run();

    // Enqueue calendar sync
    await env.DB.prepare(`
      INSERT INTO cal_outbox (agenda_id, action, payload, next_attempt_at)
      VALUES (?, 'create', ?, ?)
    `).bind(
      id,
      JSON.stringify({ id, date, title, tag, start_ts, end_ts, notes }),
      now
    ).run();

    return json({ ok: true, id }, 200);
    
  } catch (error: any) {
    console.error('AI create error:', error);
    return json({ ok: false, error: error.message }, 500);
  }
}

export const onRequest = onRequestPost;