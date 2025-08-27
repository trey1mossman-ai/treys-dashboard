// Proxy utility for frontend API calls to machine endpoints
import { jsonResponse } from './cors';
import { createHmacHexSignature, generateIdempotencyKey } from './hmac';

interface ProxyEnv {
  CF_ACCESS_CLIENT_ID?: string;
  CF_ACCESS_CLIENT_SECRET?: string;
  DASHBOARD_HMAC_SECRET?: string;
  DASHBOARD_BASE_URL?: string;
}

export async function proxyToMachineEndpoint(
  endpoint: string,
  payload: any,
  env: ProxyEnv,
  requestId?: string
): Promise<Response> {
  try {
    // Validate required environment variables
    if (!env.CF_ACCESS_CLIENT_ID || !env.CF_ACCESS_CLIENT_SECRET || !env.DASHBOARD_HMAC_SECRET) {
      return jsonResponse({
        error: 'server_error',
        reason: 'Machine authentication not configured',
        requestId
      }, 500);
    }

    const baseUrl = env.DASHBOARD_BASE_URL || 'https://ailifeassistanttm.com';
    const url = `${baseUrl}${endpoint}`;
    
    // Prepare request body
    const body = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const idempotencyKey = generateIdempotencyKey();
    
    // Create HMAC signature
    const signature = await createHmacHexSignature(env.DASHBOARD_HMAC_SECRET, body);
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'CF-Access-Client-Id': env.CF_ACCESS_CLIENT_ID,
      'CF-Access-Client-Secret': env.CF_ACCESS_CLIENT_SECRET,
      'X-Timestamp': timestamp,
      'X-Signature': signature,
      'Idempotency-Key': idempotencyKey
    };

    // Make the request
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body
    });

    // Return the response as-is
    const responseText = await response.text();
    
    // Try to parse as JSON, fallback to text
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { message: responseText };
    }

    return jsonResponse(responseData, response.status);

  } catch (error: any) {
    console.error('Proxy request failed:', error);
    return jsonResponse({
      error: 'server_error',
      reason: 'Failed to proxy request to machine endpoint',
      requestId
    }, 500);
  }
}

// Rate limiting for frontend requests
export async function checkFrontendRateLimit(
  ip: string,
  env: { CACHE: KVNamespace }
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const maxRequests = 60; // 60 requests per minute
  const windowMs = 60 * 1000; // 1 minute
  
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const cacheKey = `frontend_rate:${ip}:${windowStart}`;
  
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
    console.error('Frontend rate limit check failed:', error);
    // On error, allow the request
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: windowStart + windowMs
    };
  }
}

export function getClientIP(request: Request): string {
  return request.headers.get('CF-Connecting-IP') || 
         request.headers.get('X-Forwarded-For')?.split(',')[0] || 
         'unknown';
}