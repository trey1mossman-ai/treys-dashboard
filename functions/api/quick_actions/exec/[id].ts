import type { EventContext } from "@cloudflare/workers-types";

interface Env {
  DB: D1Database;
}

interface ExecRequest {
  payload?: any;
}

interface QuickAction {
  id: string;
  name: string;
  method: 'GET' | 'POST';
  webhook_url: string;
  headers_json?: string;
  default_payload_json?: string;
}

export const onRequest: PagesFunction<Env> = async (context: EventContext<Env, "", {}>) => {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  if (context.request.method !== 'POST') {
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
    const url = new URL(context.request.url);
    const pathParts = url.pathname.split('/');
    const actionId = pathParts[pathParts.length - 1];

    if (!actionId) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Action ID required' 
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Fetch the action configuration
    const result = await DB.prepare(
      `SELECT * FROM quick_actions WHERE id = ?`
    ).bind(actionId).first<QuickAction>();

    if (!result) {
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

    // Parse request body for runtime payload
    let execRequest: ExecRequest = {};
    try {
      const text = await context.request.text();
      if (text) {
        execRequest = JSON.parse(text);
      }
    } catch {
      // Empty or invalid body is ok
    }

    // Build the webhook request
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'AgendaDashboard/1.0'
    };

    if (result.headers_json) {
      const customHeaders = JSON.parse(result.headers_json);
      Object.assign(headers, customHeaders);
    }

    // Determine the payload
    let payload = execRequest.payload;
    if (!payload && result.default_payload_json) {
      payload = JSON.parse(result.default_payload_json);
    }

    // Execute the webhook
    const webhookOptions: RequestInit = {
      method: result.method,
      headers
    };

    if (result.method === 'POST' && payload !== undefined) {
      webhookOptions.body = JSON.stringify(payload);
    }

    const webhookResponse = await fetch(result.webhook_url, webhookOptions);
    
    let responseData;
    const contentType = webhookResponse.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        responseData = await webhookResponse.json();
      } catch {
        responseData = await webhookResponse.text();
      }
    } else {
      responseData = await webhookResponse.text();
    }

    return new Response(JSON.stringify({ 
      ok: webhookResponse.ok,
      id: actionId,
      status: webhookResponse.status,
      data: responseData
    }), {
      status: webhookResponse.ok ? 200 : 502,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error executing quick action:', error);
    return new Response(JSON.stringify({ 
      ok: false, 
      error: 'Failed to execute quick action',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};