// Today ready ingest endpoint - signals that n8n has finished building today's data
import { jsonResponse, handleOptions } from '../_utils/cors';
import { withMachineAuth, addSecurityHeaders, AuthenticatedRequest } from '../_utils/middleware';
import { validateTodayReady, ValidationError } from '../_utils/schemas';

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
  return withMachineAuth(context.request, context.env, handleTodayReady);
};

async function handleTodayReady(req: AuthenticatedRequest, env: Env): Promise<Response> {
  try {
    // Validate schema
    let todayReadyPayload;
    try {
      todayReadyPayload = validateTodayReady(req.parsedBody);
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

    // Store today ready signal
    const stmt = env.DB.prepare(`
      INSERT OR REPLACE INTO today_ready_signals 
      (run_at, sources, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    await stmt.bind(
      todayReadyPayload.run_at,
      JSON.stringify(todayReadyPayload.sources),
      now,
      now
    ).run();

    // Update dashboard ready status in cache for fast access
    await env.CACHE.put('dashboard:today_ready', JSON.stringify({
      run_at: todayReadyPayload.run_at,
      sources: todayReadyPayload.sources,
      updated_at: now
    }), {
      expirationTtl: 24 * 60 * 60 // 24 hours
    });

    // Log successful signal
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      requestId: req.requestId,
      event: 'today_ready_signal',
      run_at: todayReadyPayload.run_at,
      sources: todayReadyPayload.sources,
      source_count: todayReadyPayload.sources.length
    }));

    const response = jsonResponse({
      ok: true,
      run_at: todayReadyPayload.run_at,
      sources: todayReadyPayload.sources,
      status: 'ready'
    });

    return addSecurityHeaders(response);

  } catch (error: any) {
    console.error('Today ready signal error:', error);
    
    const response = jsonResponse({
      error: 'server_error',
      requestId: req.requestId
    }, 500);

    return addSecurityHeaders(response);
  }
}