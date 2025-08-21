import { corsHeaders, handleOptions } from '../../_utils/cors';
import { json, readJSON } from '../../_utils/json';

export async function onRequestPost(context: any) {
  const { request, env } = context;
  
  if (request.method === 'OPTIONS') {
    return handleOptions(env);
  }

  try {
    const body = await readJSON(request);
    const { 
      name,
      webhook_url,
      method = 'POST',
      headers = {},
      default_payload = {}
    } = body;

    if (!name || !webhook_url) {
      return json({ ok: false, error: 'Name and webhook_url required' }, 400);
    }

    // Validate method
    if (!['GET', 'POST'].includes(method)) {
      return json({ ok: false, error: 'Method must be GET or POST' }, 400);
    }

    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await env.DB.prepare(`
      INSERT INTO quick_actions (id, name, method, webhook_url, headers_json, 
                                default_payload_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      name,
      method,
      webhook_url,
      JSON.stringify(headers),
      JSON.stringify(default_payload),
      now
    ).run();

    return json({ ok: true, id }, 200);
    
  } catch (error: any) {
    console.error('Create action error:', error);
    return json({ ok: false, error: error.message }, 500);
  }
}

export const onRequest = onRequestPost;