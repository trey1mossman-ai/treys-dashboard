import { corsHeaders, handleOptions } from '../../_utils/cors';
import { json, readJSON } from '../../_utils/json';

export async function onRequestPost(context: any) {
  const { request, env } = context;
  
  if (request.method === 'OPTIONS') {
    return handleOptions(env);
  }

  try {
    const body = await readJSON(request);
    const { id, name, webhook_url, method, headers, default_payload } = body;

    if (!id) {
      return json({ ok: false, error: 'ID required' }, 400);
    }

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (webhook_url !== undefined) {
      updates.push('webhook_url = ?');
      params.push(webhook_url);
    }
    if (method !== undefined) {
      if (!['GET', 'POST'].includes(method)) {
        return json({ ok: false, error: 'Method must be GET or POST' }, 400);
      }
      updates.push('method = ?');
      params.push(method);
    }
    if (headers !== undefined) {
      updates.push('headers_json = ?');
      params.push(JSON.stringify(headers));
    }
    if (default_payload !== undefined) {
      updates.push('default_payload_json = ?');
      params.push(JSON.stringify(default_payload));
    }

    if (updates.length === 0) {
      return json({ ok: false, error: 'No fields to update' }, 400);
    }

    params.push(id); // Add ID at the end for WHERE clause

    await env.DB.prepare(`
      UPDATE quick_actions 
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...params).run();

    return json({ ok: true }, 200);
    
  } catch (error: any) {
    console.error('Update action error:', error);
    return json({ ok: false, error: error.message }, 500);
  }
}

export const onRequest = onRequestPost;