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

    await env.DB.prepare(
      'DELETE FROM quick_actions WHERE id = ?'
    ).bind(id).run();

    return json({ ok: true }, 200);
    
  } catch (error: any) {
    console.error('Delete action error:', error);
    return json({ ok: false, error: error.message }, 500);
  }
}

export const onRequest = onRequestPost;