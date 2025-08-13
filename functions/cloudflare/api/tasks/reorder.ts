import { corsHeaders, handleOptions } from '../../_utils/cors';
import { json, readJSON } from '../../_utils/json';

export async function onRequestPost(context: any) {
  const { request, env } = context;
  
  if (request.method === 'OPTIONS') {
    return handleOptions(env);
  }

  try {
    const body = await readJSON(request);
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return json({ ok: false, error: 'IDs array required' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);

    // Update sort order for each task
    for (let i = 0; i < ids.length; i++) {
      await env.DB.prepare(`
        UPDATE tasks 
        SET sort_order = ?, updated_at = ?
        WHERE id = ?
      `).bind(i, now, ids[i]).run();
    }

    return json({ ok: true }, 200);
    
  } catch (error: any) {
    console.error('Reorder tasks error:', error);
    return json({ ok: false, error: error.message }, 500);
  }
}

export const onRequest = onRequestPost;