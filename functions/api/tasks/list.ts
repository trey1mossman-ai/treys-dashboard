import { corsHeaders, handleOptions } from '../../_utils/cors';
import { json } from '../../_utils/json';

export async function onRequestGet(context: any) {
  const { request, env } = context;
  
  if (request.method === 'OPTIONS') {
    return handleOptions(env);
  }

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'pending';

    const tasks = await env.DB.prepare(`
      SELECT * FROM tasks 
      WHERE status = ?
      ORDER BY sort_order ASC, created_at DESC
    `).bind(status).all();

    return json({ 
      ok: true, 
      tasks: tasks.results || [] 
    }, 200);
    
  } catch (error: any) {
    console.error('List tasks error:', error);
    return json({ ok: false, error: error.message }, 500);
  }
}

export const onRequest = onRequestGet;