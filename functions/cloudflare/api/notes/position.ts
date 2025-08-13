import { corsHeaders, handleOptions } from '../../_utils/cors';
import { json, readJSON } from '../../_utils/json';

export async function onRequestPost(context: any) {
  const { request, env } = context;
  
  if (request.method === 'OPTIONS') {
    return handleOptions(env);
  }

  try {
    const body = await readJSON(request);
    const { id, x, y, w, h } = body;

    if (!id) {
      return json({ ok: false, error: 'ID required' }, 400);
    }

    // Validate position values
    if (typeof x !== 'number' || typeof y !== 'number') {
      return json({ ok: false, error: 'Invalid position values' }, 400);
    }

    // Update position
    await env.DB.prepare(`
      UPDATE notes 
      SET x = ?, y = ?, w = ?, h = ?
      WHERE id = ?
    `).bind(
      x,
      y,
      w || 320,
      h || 180,
      id
    ).run();

    return json({ ok: true }, 200);
    
  } catch (error: any) {
    console.error('Update note position error:', error);
    return json({ ok: false, error: error.message }, 500);
  }
}

export const onRequest = onRequestPost;