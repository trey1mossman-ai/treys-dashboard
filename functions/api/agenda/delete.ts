import { corsHeaders, handleOptions } from '../../_utils/cors';
import { json, readJSON } from '../../_utils/json';

export async function onRequestPost(context: any) {
  const { request, env } = context;
  
  if (request.method === 'OPTIONS') {
    return handleOptions(env);
  }

  try {
    const body = await readJSON(request);
    const { id } = body;

    if (!id) {
      return json({ ok: false, error: 'ID required' }, 400);
    }

    // Get the item first to check if it has a calendar event
    const item = await env.DB.prepare(
      'SELECT id, cal_event_id FROM agenda_items WHERE id = ? AND deleted_at IS NULL'
    ).bind(id).first();

    if (!item) {
      return json({ ok: false, error: 'Item not found' }, 404);
    }

    const now = Math.floor(Date.now() / 1000);

    // Soft delete the agenda item
    await env.DB.prepare(
      'UPDATE agenda_items SET deleted_at = ?, cal_sync_status = ? WHERE id = ?'
    ).bind(now, 'pending', id).run();

    // Enqueue calendar delete if it has a calendar event
    if (item.cal_event_id) {
      await env.DB.prepare(`
        INSERT INTO cal_outbox (agenda_id, action, payload, next_attempt_at)
        VALUES (?, 'delete', ?, ?)
      `).bind(
        id,
        JSON.stringify({ id, cal_event_id: item.cal_event_id }),
        now
      ).run();
    }

    return json({ ok: true }, 200);
    
  } catch (error: any) {
    console.error('Delete error:', error);
    return json({ ok: false, error: error.message }, 500);
  }
}

export const onRequest = onRequestPost;