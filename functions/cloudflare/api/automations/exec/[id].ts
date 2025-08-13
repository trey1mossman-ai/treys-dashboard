import { corsHeaders, handleOptions } from '../../../_utils/cors';
import { json, readJSON } from '../../../_utils/json';

export async function onRequestPost(context: any) {
  const { request, env, params } = context;
  
  if (request.method === 'OPTIONS') {
    return handleOptions(env);
  }

  try {
    const { id } = params;
    
    if (!id) {
      return json({ ok: false, error: 'Action ID required' }, 400);
    }

    // Get action configuration
    const action = await env.DB.prepare(`
      SELECT * FROM quick_actions WHERE id = ?
    `).bind(id).first();

    if (!action) {
      return json({ ok: false, error: 'Action not found' }, 404);
    }

    // Get payload from request or use default
    const body = await readJSON(request);
    const payload = body.payload || JSON.parse(action.default_payload_json || '{}');

    // Parse headers
    const headers = JSON.parse(action.headers_json || '{}');
    headers['Content-Type'] = 'application/json';

    // Execute webhook
    let response;
    try {
      if (action.method === 'GET') {
        const url = new URL(action.webhook_url);
        Object.keys(payload).forEach(key => {
          url.searchParams.append(key, payload[key]);
        });
        response = await fetch(url.toString(), { method: 'GET', headers });
      } else {
        response = await fetch(action.webhook_url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
      }
    } catch (fetchError: any) {
      // Update status
      await env.DB.prepare(`
        UPDATE quick_actions 
        SET last_status = ?, last_run_ts = ?
        WHERE id = ?
      `).bind(0, Math.floor(Date.now() / 1000), id).run();

      return json({ 
        ok: false, 
        error: `Webhook failed: ${fetchError.message}`,
        status: 0 
      }, 500);
    }

    // Update last run info
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(`
      UPDATE quick_actions 
      SET last_status = ?, last_run_ts = ?
      WHERE id = ?
    `).bind(response.status, now, id).run();

    // Return result
    let result;
    try {
      result = await response.json();
    } catch {
      result = await response.text();
    }

    return json({ 
      ok: response.ok,
      status: response.status,
      result 
    }, 200);
    
  } catch (error: any) {
    console.error('Execute action error:', error);
    return json({ ok: false, error: error.message }, 500);
  }
}

export const onRequest = onRequestPost;