// Frontend API for retrieving status data
import { jsonResponse, handleOptions } from '../../_utils/cors';
import { checkFrontendRateLimit, getClientIP } from '../../_utils/proxy';

interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  // Handle CORS preflight
  if (context.request.method === 'OPTIONS') {
    return handleOptions();
  }

  // Only allow GET
  if (context.request.method !== 'GET') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  const requestId = crypto.randomUUID();
  const clientIP = getClientIP(context.request);

  try {
    // Check rate limit
    const rateLimit = await checkFrontendRateLimit(clientIP, context.env);
    if (!rateLimit.allowed) {
      return jsonResponse({
        error: 'rate_limited',
        remaining: rateLimit.remaining,
        resetTime: rateLimit.resetTime
      }, 429);
    }

    // Get latest status snapshot
    const statusStmt = context.env.DB.prepare(`
      SELECT * FROM status_snapshots 
      ORDER BY captured_at DESC 
      LIMIT 1
    `);
    const statusResult = await statusStmt.first();

    // Get today ready status from cache
    const todayReadyStatus = await context.env.CACHE.get('dashboard:today_ready');
    let todayReady = null;
    if (todayReadyStatus) {
      todayReady = JSON.parse(todayReadyStatus);
    }

    // Get recent notifications
    const notificationsStmt = context.env.DB.prepare(`
      SELECT * FROM notifications 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    const notificationsResult = await notificationsStmt.all();

    const response = {
      latest_status: statusResult ? {
        captured_at: statusResult.captured_at,
        sleep_hours: statusResult.sleep_hours,
        recovery_proxy: statusResult.recovery_proxy,
        training_load_today: statusResult.training_load_today,
        nutrition_compliance_7d: statusResult.nutrition_compliance_7d,
        stress_flag: statusResult.stress_flag,
        reason: statusResult.reason
      } : null,
      today_ready: todayReady,
      recent_notifications: notificationsResult.success ? notificationsResult.results.map((row: any) => ({
        id: row.id,
        type: row.type,
        severity: row.severity,
        message: row.message,
        related_ids: row.related_ids ? JSON.parse(row.related_ids) : [],
        created_at: row.created_at
      })) : []
    };

    return jsonResponse(response);

  } catch (error: any) {
    console.error('Frontend API status error:', error);
    return jsonResponse({
      error: 'server_error',
      requestId
    }, 500);
  }
};