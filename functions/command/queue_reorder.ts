// Queue reorder command endpoint - triggers reordering of agenda items
import { jsonResponse, handleOptions } from '../_utils/cors';
import { withMachineAuth, addSecurityHeaders, AuthenticatedRequest } from '../_utils/middleware';
import { validateQueueReorder, ValidationError } from '../_utils/schemas';

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
  return withMachineAuth(context.request, context.env, handleQueueReorder);
};

async function handleQueueReorder(req: AuthenticatedRequest, env: Env): Promise<Response> {
  try {
    // Validate schema
    let command;
    try {
      command = validateQueueReorder(req.parsedBody);
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
      'SELECT id, title, source, status, start_time FROM agenda_items WHERE id = ?'
    ).bind(command.id).first();

    if (!existingItem) {
      return addSecurityHeaders(jsonResponse({
        error: 'invalid_payload',
        reason: 'Item not found',
        field: 'id'
      }, 422));
    }

    // For this implementation, we'll create a reorder queue entry
    // The actual reordering logic would be handled by a background process or n8n
    const stmt = env.DB.prepare(`
      INSERT OR REPLACE INTO reorder_queue
      (item_id, queued_at, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    const result = await stmt.bind(
      command.id,
      now,
      'queued',
      now,
      now
    ).run();

    if (!result.success) {
      throw new Error('Failed to queue item for reordering');
    }

    // Store in cache for quick access by frontend
    await env.CACHE.put(`reorder_queue:${command.id}`, JSON.stringify({
      item_id: command.id,
      title: existingItem.title,
      source: existingItem.source,
      queued_at: now,
      status: 'queued'
    }), {
      expirationTtl: 60 * 60 // 1 hour
    });

    // Log successful queue
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      requestId: req.requestId,
      event: 'item_queued_for_reorder',
      item_id: command.id,
      title: existingItem.title,
      source: existingItem.source,
      start_time: existingItem.start_time
    }));

    const response = jsonResponse({
      ok: true,
      id: command.id,
      status: 'queued',
      queued_at: now
    });

    return addSecurityHeaders(response);

  } catch (error: any) {
    console.error('Queue reorder command error:', error);
    
    const response = jsonResponse({
      error: 'server_error',
      requestId: req.requestId
    }, 500);

    return addSecurityHeaders(response);
  }
}