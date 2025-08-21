import { corsHeaders, handleOptions } from '../../_utils/cors';
import { json, readJSON } from '../../_utils/json';

export async function onRequestPost(context: any) {
  const { request, env } = context;
  
  if (request.method === 'OPTIONS') {
    return handleOptions(env);
  }

  try {
    const body = await readJSON(request);
    const { id, status } = body;

    if (!id || !status) {
      return json({ ok: false, error: 'ID and status required' }, 400);
    }

    if (!['pending', 'done', 'cancelled'].includes(status)) {
      return json({ ok: false, error: 'Invalid status' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);

    await env.DB.prepare(`
      UPDATE tasks 
      SET status = ?, updated_at = ?
      WHERE id = ?
    `).bind(status, now, id).run();

    return json({ ok: true }, 200);
    
  } catch (error: any) {
    console.error('Toggle task error:', error);
    return json({ ok: false, error: error.message }, 500);
  }
}

export const onRequest = onRequestPost;