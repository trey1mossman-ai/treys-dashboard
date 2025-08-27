// Middleware for securing machine-only endpoints with proper error handling and logging

import { jsonResponse } from './cors';
import { verifyMachineAuth, getRequestId, getClientIP } from './hmac';
import { checkIdempotency, recordIdempotencySuccess, isValidUUID } from './idempotency';

interface MachineAuthEnv {
  CF_ACCESS_CLIENT_ID?: string;
  CF_ACCESS_CLIENT_SECRET?: string;
  DASHBOARD_HMAC_SECRET?: string;
  CACHE: KVNamespace;
  BODY_LIMIT_BYTES?: string;
}

export interface AuthenticatedRequest extends Request {
  requestId: string;
  idempotencyKey: string;
  rawBody: string;
  parsedBody: any;
  clientIP: string;
}

export async function withMachineAuth<T extends MachineAuthEnv>(
  request: Request,
  env: T,
  handler: (req: AuthenticatedRequest, env: T) => Promise<Response>
): Promise<Response> {
  const startTime = Date.now();
  const requestId = getRequestId(request);
  const clientIP = getClientIP(request);
  const method = request.method;
  const path = new URL(request.url).pathname;
  
  // Log request start
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    requestId,
    method,
    path,
    clientIP,
    cfRay: request.headers.get('CF-Ray'),
    phase: 'start'
  }));

  try {
    // Only allow POST
    if (method !== 'POST') {
      const response = jsonResponse({ error: 'method_not_allowed' }, 405);
      logResponse(requestId, method, path, 405, Date.now() - startTime);
      return response;
    }

    // Check content type
    const contentType = request.headers.get('Content-Type');
    if (contentType !== 'application/json') {
      const response = jsonResponse({ 
        error: 'invalid_payload', 
        reason: 'Content-Type must be application/json' 
      }, 422);
      logResponse(requestId, method, path, 422, Date.now() - startTime);
      return response;
    }

    // Check body size limit
    const bodyLimit = parseInt(env.BODY_LIMIT_BYTES || '524288'); // 512KB default
    const contentLength = request.headers.get('Content-Length');
    if (contentLength && parseInt(contentLength) > bodyLimit) {
      const response = jsonResponse({ error: 'payload_too_large' }, 413);
      logResponse(requestId, method, path, 413, Date.now() - startTime);
      return response;
    }

    // Get raw body (needed for HMAC verification)
    const rawBody = await request.text();
    if (rawBody.length > bodyLimit) {
      const response = jsonResponse({ error: 'payload_too_large' }, 413);
      logResponse(requestId, method, path, 413, Date.now() - startTime);
      return response;
    }

    // Create a new request with the raw body for auth verification
    const requestForAuth = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: rawBody
    });

    // Verify machine authentication
    const authResult = await verifyMachineAuth(requestForAuth, env);
    if (!authResult.success) {
      let statusCode = 401;
      if (authResult.error === 'unauthorized') statusCode = 403;
      
      const response = jsonResponse({
        error: authResult.error || 'unauthorized',
        reason: authResult.reason || 'Authentication failed'
      }, statusCode);
      
      logResponse(requestId, method, path, statusCode, Date.now() - startTime);
      return response;
    }

    // Validate and check idempotency key
    const idempotencyKey = request.headers.get('Idempotency-Key')!;
    if (!isValidUUID(idempotencyKey)) {
      const response = jsonResponse({
        error: 'invalid_payload',
        reason: 'Idempotency-Key must be a valid UUID',
        field: 'Idempotency-Key'
      }, 422);
      logResponse(requestId, method, path, 422, Date.now() - startTime);
      return response;
    }

    // Check idempotency
    const { isReplay, shouldProcess } = await checkIdempotency(
      idempotencyKey, 
      path, 
      rawBody, 
      env
    );

    if (isReplay) {
      const response = jsonResponse({ ok: true, replayed: true });
      logResponse(requestId, method, path, 200, Date.now() - startTime, idempotencyKey);
      return response;
    }

    if (!shouldProcess) {
      const response = jsonResponse({
        error: 'invalid_payload',
        reason: 'Idempotency key reused with different payload'
      }, 422);
      logResponse(requestId, method, path, 422, Date.now() - startTime, idempotencyKey);
      return response;
    }

    // Parse JSON body
    let parsedBody: any;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch (error) {
      const response = jsonResponse({
        error: 'invalid_payload',
        reason: 'Invalid JSON in request body'
      }, 422);
      logResponse(requestId, method, path, 422, Date.now() - startTime, idempotencyKey);
      return response;
    }

    // Create authenticated request object
    const authenticatedRequest = Object.assign(request, {
      requestId,
      idempotencyKey,
      rawBody,
      parsedBody,
      clientIP
    }) as AuthenticatedRequest;

    // Call the handler
    const response = await handler(authenticatedRequest, env);
    
    // Record successful processing for idempotency
    if (response.status >= 200 && response.status < 300) {
      await recordIdempotencySuccess(idempotencyKey, path, rawBody, env);
    }

    logResponse(requestId, method, path, response.status, Date.now() - startTime, idempotencyKey);
    return response;

  } catch (error: any) {
    console.error('Middleware error:', error);
    const response = jsonResponse({
      error: 'server_error',
      requestId
    }, 500);
    logResponse(requestId, method, path, 500, Date.now() - startTime);
    return response;
  }
}

function logResponse(
  requestId: string, 
  method: string, 
  path: string, 
  status: number, 
  durMs: number, 
  idempotencyKey?: string
): void {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    requestId,
    method,
    path,
    status,
    durMs,
    ...(idempotencyKey && { idempotencyKey }),
    phase: 'complete'
  }));
}

// Rate limiting (simple in-memory implementation for Cloudflare Pages)
interface RateLimitEnv {
  CACHE: KVNamespace;
}

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
  env: RateLimitEnv
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const cacheKey = `ratelimit:${key}:${windowStart}`;
  
  try {
    const current = await env.CACHE.get(cacheKey);
    const count = current ? parseInt(current) : 0;
    
    if (count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: windowStart + windowMs
      };
    }
    
    // Increment counter
    await env.CACHE.put(cacheKey, (count + 1).toString(), {
      expirationTtl: Math.ceil(windowMs / 1000)
    });
    
    return {
      allowed: true,
      remaining: maxRequests - count - 1,
      resetTime: windowStart + windowMs
    };
    
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // On error, allow the request
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: windowStart + windowMs
    };
  }
}

export function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  
  // Security headers per specification
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('Cache-Control', 'no-store');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}