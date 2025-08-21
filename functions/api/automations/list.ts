import { corsHeaders, handleOptions } from '../../_utils/cors';
import { json } from '../../_utils/json';

export async function onRequestGet(context: any) {
  const { request, env } = context;
  
  if (request.method === 'OPTIONS') {
    return handleOptions(env);
  }

  try {
    const actions = await env.DB.prepare(`
      SELECT id, name, method, webhook_url, headers_json, default_payload_json, 
             last_status, last_run_ts, created_at
      FROM quick_actions
      ORDER BY created_at DESC
    `).all();

    return json({ 
      ok: true, 
      actions: actions.results || [] 
    }, 200);
    
  } catch (error: any) {
    console.error('List actions error:', error);
    return json({ ok: false, error: error.message }, 500);
  }
}

export const onRequest = onRequestGet;