import type { EventContext } from "@cloudflare/workers-types";

interface Env {
  DB: D1Database;
}

interface UpdateActionRequest {
  id: string;
  name: string;
  method: 'GET' | 'POST';
  webhook_url: string;
  headers?: Record<string, string>;
  default_payload?: any;
}

export const onRequest: PagesFunction<Env> = async (context: EventContext<Env, "", {}>) => {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  if (context.request.method !== 'PUT') {
    return new Response(JSON.stringify({ 
      ok: false, 
      error: 'Method not allowed' 
    }), {
      status: 405,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  try {
    const { DB } = context.env;
    const body: UpdateActionRequest = await context.request.json();

    // Validate required fields
    if (!body.id || !body.name || !body.webhook_url || !body.method) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Missing required fields: id, name, webhook_url, method' 
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Validate webhook URL
    try {
      new URL(body.webhook_url);
    } catch {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Invalid webhook URL' 
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Validate method
    if (!['GET', 'POST'].includes(body.method)) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Method must be GET or POST' 
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const headers_json = body.headers ? JSON.stringify(body.headers) : null;
    const default_payload_json = body.default_payload ? JSON.stringify(body.default_payload) : null;

    const result = await DB.prepare(
      `UPDATE quick_actions 
       SET name = ?, method = ?, webhook_url = ?, headers_json = ?, default_payload_json = ?
       WHERE id = ?`
    ).bind(body.name, body.method, body.webhook_url, headers_json, default_payload_json, body.id).run();

    if (result.meta.changes === 0) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Quick action not found' 
      }), {
        status: 404,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    return new Response(JSON.stringify({ 
      ok: true,
      action: {
        id: body.id,
        name: body.name,
        method: body.method,
        webhook_url: body.webhook_url,
        headers: body.headers,
        default_payload: body.default_payload
      }
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error updating quick action:', error);
    return new Response(JSON.stringify({ 
      ok: false, 
      error: 'Failed to update quick action' 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};