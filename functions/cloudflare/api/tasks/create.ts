import { corsHeaders, handleOptions } from '../../_utils/cors';
import { json, readJSON } from '../../_utils/json';

export async function onRequestPost(context: any) {
  const { request, env } = context;
  
  if (request.method === 'OPTIONS') {
    return handleOptions(env);
  }

  try {
    const body = await readJSON(request);
    const { title, due_ts = null, source = 'manual' } = body;

    if (!title) {
      return json({ ok: false, error: 'Title required' }, 400);
    }

    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    // Get max sort order
    const maxOrder = await env.DB.prepare(
      'SELECT MAX(sort_order) as max_order FROM tasks'
    ).first();

    const sort_order = (maxOrder?.max_order || 0) + 1;

    await env.DB.prepare(`
      INSERT INTO tasks (id, title, due_ts, source, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, title, due_ts, source, sort_order, now, now).run();

    return json({ ok: true, id }, 200);
    
  } catch (error: any) {
    console.error('Create task error:', error);
    return json({ ok: false, error: error.message }, 500);
  }
}

export const onRequest = onRequestPost;