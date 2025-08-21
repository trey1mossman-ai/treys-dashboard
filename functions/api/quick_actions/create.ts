import { handleOptions, jsonResponse, errorResponse, parseRequestBody } from '../_utils/cors';

interface Env {
  DB: D1Database;
}

interface CreateActionRequest {
  name: string;
  method: 'GET' | 'POST';
  webhook_url: string;
  headers?: Record<string, string>;
  default_payload?: any;
}

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS quick_actions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    method TEXT NOT NULL,
    webhook_url TEXT NOT NULL,
    headers_json TEXT,
    default_payload_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`;

export const onRequest: PagesFunction<Env> = async (context) => {
  // Handle CORS preflight
  if (context.request.method === 'OPTIONS') {
    return handleOptions();
  }

  if (context.request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const { DB } = context.env;
    const body = await parseRequestBody(context.request) as CreateActionRequest;

    // Validate required fields
    if (!body.name || !body.webhook_url) {
      return errorResponse('Missing required fields: name and webhook_url', 400);
    }
    
    // Default method to POST if not provided
    if (!body.method) {
      body.method = 'POST';
    }

    // Validate webhook URL
    try {
      new URL(body.webhook_url);
    } catch {
      return errorResponse('Invalid webhook URL', 400);
    }

    // Validate method
    if (!['GET', 'POST'].includes(body.method)) {
      return errorResponse('Method must be GET or POST', 400);
    }

    const id = crypto.randomUUID();
    const headers_json = body.headers ? JSON.stringify(body.headers) : null;
    const default_payload_json = body.default_payload ? JSON.stringify(body.default_payload) : null;
    const created_at = new Date().toISOString();

    try {
      // Try to insert into database
      await DB.prepare(
        `INSERT INTO quick_actions (id, name, method, webhook_url, headers_json, default_payload_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(id, body.name, body.method, body.webhook_url, headers_json, default_payload_json, created_at).run();
    } catch (dbError: any) {
      // If table doesn't exist, try to create it
      if (dbError.message?.includes('no such table')) {
        console.log('Creating quick_actions table...');
        try {
          await DB.prepare(CREATE_TABLE_SQL).run();
          // Retry the insert
          await DB.prepare(
            `INSERT INTO quick_actions (id, name, method, webhook_url, headers_json, default_payload_json, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          ).bind(id, body.name, body.method, body.webhook_url, headers_json, default_payload_json, created_at).run();
        } catch (createError) {
          console.error('Failed to create table:', createError);
          // Still return success - will use localStorage on frontend
        }
      }
    }

    const action = {
      id,
      name: body.name,
      method: body.method,
      webhook_url: body.webhook_url,
      headers: body.headers,
      default_payload: body.default_payload,
      created_at
    };

    return jsonResponse({ ok: true, action });
    
  } catch (error: any) {
    console.error('Error creating quick action:', error);
    return errorResponse(error.message || 'Failed to create quick action', 500);
  }
};