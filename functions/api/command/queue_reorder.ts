// Frontend API proxy for queue reorder command
import { jsonResponse, handleOptions } from '../../_utils/cors';
import { proxyToMachineEndpoint, checkFrontendRateLimit, getClientIP } from '../../_utils/proxy';

interface Env {
  CACHE: KVNamespace;
  CF_ACCESS_CLIENT_ID?: string;
  CF_ACCESS_CLIENT_SECRET?: string;
  DASHBOARD_HMAC_SECRET?: string;
  DASHBOARD_BASE_URL?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  // Handle CORS preflight
  if (context.request.method === 'OPTIONS') {
    return handleOptions();
  }

  // Only allow POST
  if (context.request.method !== 'POST') {
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

    // Parse request body
    let payload;
    try {
      payload = await context.request.json();
    } catch {
      return jsonResponse({
        error: 'invalid_payload',
        reason: 'Invalid JSON in request body'
      }, 422);
    }

    // Proxy to machine endpoint
    const response = await proxyToMachineEndpoint(
      '/command/queue_reorder',
      payload,
      context.env,
      requestId
    );

    return response;

  } catch (error: any) {
    console.error('Frontend API queue_reorder error:', error);
    return jsonResponse({
      error: 'server_error',
      requestId
    }, 500);
  }
};