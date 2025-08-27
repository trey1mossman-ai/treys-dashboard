// Supplements ingest endpoint - receives supplement schedule from n8n
import { jsonResponse, handleOptions } from '../_utils/cors';
import { withMachineAuth, addSecurityHeaders, AuthenticatedRequest } from '../_utils/middleware';
import { validateAgendaItems, ValidationError } from '../_utils/schemas';

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
  return withMachineAuth(context.request, context.env, handleSupplementsIngest);
};

async function handleSupplementsIngest(req: AuthenticatedRequest, env: Env): Promise<Response> {
  try {
    // Validate schema
    let agendaItems;
    try {
      agendaItems = validateAgendaItems(req.parsedBody);
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

    // Filter for supplements items only
    const supplementItems = agendaItems.filter(item => item.source === 'supplements');
    
    if (supplementItems.length === 0) {
      return addSecurityHeaders(jsonResponse({
        error: 'invalid_payload',
        reason: 'No supplement items found in payload'
      }, 422));
    }

    // Prepare database operations
    const stmt = env.DB.prepare(`
      INSERT OR REPLACE INTO agenda_items 
      (id, title, source, start_time, end_time, status, metadata, display_notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const batch = supplementItems.map(item => {
      const now = new Date().toISOString();
      return stmt.bind(
        item.id,
        item.title,
        item.source,
        item.start_time,
        item.end_time || null,
        item.status,
        JSON.stringify(item.metadata || {}),
        item.display_notes || null,
        now,
        now
      );
    });

    // Execute batch insert
    await env.DB.batch(batch);

    // Log successful ingestion
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      requestId: req.requestId,
      event: 'supplements_ingested',
      count: supplementItems.length,
      items: supplementItems.map(item => ({ id: item.id, title: item.title, start_time: item.start_time }))
    }));

    const response = jsonResponse({
      ok: true,
      ingested: supplementItems.length,
      source: 'supplements'
    });

    return addSecurityHeaders(response);

  } catch (error: any) {
    console.error('Supplements ingest error:', error);
    
    const response = jsonResponse({
      error: 'server_error',
      requestId: req.requestId
    }, 500);

    return addSecurityHeaders(response);
  }
}