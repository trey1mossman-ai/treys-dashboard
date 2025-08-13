import { corsHeaders, handleOptions } from '../../_utils/cors';
import { json } from '../../_utils/json';

export async function onRequestGet(context: any) {
  const { request, env } = context;
  
  if (request.method === 'OPTIONS') {
    return handleOptions(env);
  }

  try {
    const url = new URL(request.url);
    const date = url.searchParams.get('date');

    if (!date) {
      return json({ ok: false, error: 'Date parameter required' }, 400);
    }

    const items = await env.DB.prepare(`
      SELECT id, date, title, tag, start_ts, end_ts, status, notes, 
             cal_sync_status, cal_event_id, tz
      FROM agenda_items 
      WHERE date = ? AND deleted_at IS NULL
      ORDER BY start_ts ASC
    `).bind(date).all();

    return json({ 
      ok: true, 
      items: items.results || [] 
    }, 200);
    
  } catch (error: any) {
    console.error('List error:', error);
    return json({ ok: false, error: error.message }, 500);
  }
}

export const onRequest = onRequestGet;