// Status snapshot ingest endpoint - receives health/wellness status from n8n
import { jsonResponse, handleOptions } from '../_utils/cors';
import { withMachineAuth, addSecurityHeaders, AuthenticatedRequest } from '../_utils/middleware';
import { validateStatusSnapshot, ValidationError } from '../_utils/schemas';

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
  return withMachineAuth(context.request, context.env, handleStatusSnapshot);
};

async function handleStatusSnapshot(req: AuthenticatedRequest, env: Env): Promise<Response> {
  try {
    // Validate schema
    let statusSnapshot;
    try {
      statusSnapshot = validateStatusSnapshot(req.parsedBody);
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

    // Store status snapshot
    const stmt = env.DB.prepare(`
      INSERT OR REPLACE INTO status_snapshots 
      (captured_at, sleep_hours, recovery_proxy, training_load_today, nutrition_compliance_7d, stress_flag, reason, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    await stmt.bind(
      statusSnapshot.captured_at,
      statusSnapshot.sleep_hours,
      statusSnapshot.recovery_proxy,
      statusSnapshot.training_load_today,
      statusSnapshot.nutrition_compliance_7d,
      statusSnapshot.stress_flag,
      statusSnapshot.reason || null,
      now,
      now
    ).run();

    // Generate alerts based on status
    const alerts = [];
    if (statusSnapshot.stress_flag === 'red') {
      alerts.push('High stress detected');
    }
    if (statusSnapshot.sleep_hours !== null && statusSnapshot.sleep_hours < 6) {
      alerts.push('Insufficient sleep detected');
    }
    if (statusSnapshot.recovery_proxy !== null && statusSnapshot.recovery_proxy < 40) {
      alerts.push('Poor recovery detected');
    }
    if (statusSnapshot.nutrition_compliance_7d !== null && statusSnapshot.nutrition_compliance_7d < 70) {
      alerts.push('Low nutrition compliance');
    }

    // Log successful ingestion
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      requestId: req.requestId,
      event: 'status_snapshot_ingested',
      captured_at: statusSnapshot.captured_at,
      sleep_hours: statusSnapshot.sleep_hours,
      recovery_proxy: statusSnapshot.recovery_proxy,
      stress_flag: statusSnapshot.stress_flag,
      alerts: alerts.length,
      alert_types: alerts
    }));

    const response = jsonResponse({
      ok: true,
      captured_at: statusSnapshot.captured_at,
      alerts: alerts.length,
      ...(alerts.length > 0 && { alert_types: alerts })
    });

    return addSecurityHeaders(response);

  } catch (error: any) {
    console.error('Status snapshot ingest error:', error);
    
    const response = jsonResponse({
      error: 'server_error',
      requestId: req.requestId
    }, 500);

    return addSecurityHeaders(response);
  }
}