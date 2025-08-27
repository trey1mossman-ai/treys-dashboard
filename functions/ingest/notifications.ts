// Notifications ingest endpoint - receives notifications from n8n
import { jsonResponse, handleOptions } from '../_utils/cors';
import { withMachineAuth, addSecurityHeaders, AuthenticatedRequest } from '../_utils/middleware';
import { validateNotifications, ValidationError } from '../_utils/schemas';

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
  return withMachineAuth(context.request, context.env, handleNotifications);
};

async function handleNotifications(req: AuthenticatedRequest, env: Env): Promise<Response> {
  try {
    // Validate schema - can be single notification or array
    let notifications;
    try {
      notifications = validateNotifications(req.parsedBody);
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

    if (notifications.length === 0) {
      return addSecurityHeaders(jsonResponse({
        error: 'invalid_payload',
        reason: 'No notifications found in payload'
      }, 422));
    }

    // Store notifications
    const stmt = env.DB.prepare(`
      INSERT OR REPLACE INTO notifications 
      (id, type, severity, message, related_ids, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    const batch = notifications.map(notification => 
      stmt.bind(
        notification.id,
        notification.type,
        notification.severity,
        notification.message,
        notification.related_ids ? JSON.stringify(notification.related_ids) : null,
        now,
        now
      )
    );

    // Execute batch insert
    await env.DB.batch(batch);

    // Count by severity for logging
    const severityCounts = notifications.reduce((counts, notification) => {
      counts[notification.severity] = (counts[notification.severity] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    // Log successful ingestion
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      requestId: req.requestId,
      event: 'notifications_ingested',
      count: notifications.length,
      severity_counts: severityCounts,
      types: [...new Set(notifications.map(n => n.type))],
      critical_count: notifications.filter(n => n.severity === 'critical').length
    }));

    const response = jsonResponse({
      ok: true,
      ingested: notifications.length,
      critical: notifications.filter(n => n.severity === 'critical').length,
      warnings: notifications.filter(n => n.severity === 'warn').length,
      info: notifications.filter(n => n.severity === 'info').length
    });

    return addSecurityHeaders(response);

  } catch (error: any) {
    console.error('Notifications ingest error:', error);
    
    const response = jsonResponse({
      error: 'server_error',
      requestId: req.requestId
    }, 500);

    return addSecurityHeaders(response);
  }
}