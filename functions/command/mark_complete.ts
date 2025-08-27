// Mark complete command endpoint - marks agenda items as completed
import { jsonResponse, handleOptions } from '../_utils/cors';
import { withMachineAuth, addSecurityHeaders, AuthenticatedRequest } from '../_utils/middleware';
import { validateMarkComplete, ValidationError } from '../_utils/schemas';

interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  CF_ACCESS_CLIENT_ID?: string;
  CF_ACCESS_CLIENT_SECRET?: string;
  DASHBOARD_HMAC_SECRET?: string;
  BODY_LIMIT_BYTES?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  // Handle CORS preflight
  if (context.request.method === 'OPTIONS') {
    return handleOptions();
  }

  // Use machine auth middleware
  return withMachineAuth(context.request, context.env, handleMarkComplete);
};

async function handleMarkComplete(req: AuthenticatedRequest, env: Env): Promise<Response> {
  try {
    // Validate schema
    let command;
    try {
      command = validateMarkComplete(req.parsedBody);
    } catch (error) {
      if (error instanceof ValidationError) {
        return addSecurityHeaders(jsonResponse({
          error: 'invalid_payload',
          reason: error.message,
          field: error.field
        }, 422));
      }
      throw error;
    }

    // Check if the item exists
    const existingItem = await env.DB.prepare(
      'SELECT id, title, source, status FROM agenda_items WHERE id = ?'
    ).bind(command.id).first();

    if (!existingItem) {
      return addSecurityHeaders(jsonResponse({
        error: 'invalid_payload',
        reason: 'Item not found',
        field: 'id'
      }, 422));
    }

    // Verify source matches
    if (existingItem.source !== command.source) {
      return addSecurityHeaders(jsonResponse({
        error: 'invalid_payload',
        reason: `Item source mismatch. Expected ${command.source}, found ${existingItem.source}`,
        field: 'source'
      }, 422));
    }

    // Update the item status
    const stmt = env.DB.prepare(`
      UPDATE agenda_items 
      SET status = ?, updated_at = ?
      WHERE id = ?
    `);

    const now = new Date().toISOString();
    const result = await stmt.bind(command.status, now, command.id).run();

    if (!result.success) {
      throw new Error('Failed to update item status');
    }

    // Log successful completion
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      requestId: req.requestId,
      event: 'item_completed',
      item_id: command.id,
      title: existingItem.title,
      source: command.source,
      previous_status: existingItem.status,
      new_status: command.status
    }));

    const response = jsonResponse({
      ok: true,
      id: command.id,
      status: command.status,
      updated_at: now
    });

    return addSecurityHeaders(response);

  } catch (error: any) {
    console.error('Mark complete command error:', error);
    
    const response = jsonResponse({
      error: 'server_error',
      requestId: req.requestId
    }, 500);

    return addSecurityHeaders(response);
  }
}