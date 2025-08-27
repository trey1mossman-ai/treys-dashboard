// HMAC signing and machine authentication per specification
// Supports both legacy base64 and hex signatures for compatibility

export async function createHmacSignature(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );

  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export async function createHmacHexSignature(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );

  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyHmacSignature(
  secret: string,
  payload: string,
  signature: string
): Promise<boolean> {
  const expectedSignature = await createHmacSignature(secret, payload);
  return expectedSignature === signature;
}

export async function verifyHmacHexSignature(
  secret: string,
  payload: string,
  signature: string
): Promise<boolean> {
  const expectedSignature = await createHmacHexSignature(secret, payload);
  return expectedSignature === signature;
}

export interface AuthHeaders {
  'CF-Access-Client-Id'?: string;
  'CF-Access-Client-Secret'?: string;
  'X-Timestamp'?: string;
  'X-Signature'?: string;
  'Idempotency-Key'?: string;
}

export interface AuthResult {
  success: boolean;
  error?: 'missing_headers' | 'invalid_timestamp' | 'invalid_signature' | 'unauthorized';
  reason?: string;
}

export async function verifyMachineAuth(
  request: Request,
  env: { CF_ACCESS_CLIENT_ID?: string; CF_ACCESS_CLIENT_SECRET?: string; DASHBOARD_HMAC_SECRET?: string }
): Promise<AuthResult> {
  const clientId = request.headers.get('CF-Access-Client-Id');
  const clientSecret = request.headers.get('CF-Access-Client-Secret');
  const timestamp = request.headers.get('X-Timestamp');
  const signature = request.headers.get('X-Signature');
  const idempotencyKey = request.headers.get('Idempotency-Key');

  // Check for required headers
  if (!clientId || !clientSecret || !timestamp || !signature || !idempotencyKey) {
    return {
      success: false,
      error: 'missing_headers',
      reason: 'Required headers: CF-Access-Client-Id, CF-Access-Client-Secret, X-Timestamp, X-Signature, Idempotency-Key'
    };
  }

  // Verify Service Token
  if (!env.CF_ACCESS_CLIENT_ID || !env.CF_ACCESS_CLIENT_SECRET) {
    return {
      success: false,
      error: 'unauthorized',
      reason: 'Service token not configured'
    };
  }

  if (clientId !== env.CF_ACCESS_CLIENT_ID || clientSecret !== env.CF_ACCESS_CLIENT_SECRET) {
    return {
      success: false,
      error: 'unauthorized',
      reason: 'Invalid service token'
    };
  }

  // Check timestamp (±300s skew allowed)
  const now = Math.floor(Date.now() / 1000);
  const reqTime = parseInt(timestamp);
  
  if (isNaN(reqTime) || Math.abs(now - reqTime) > 300) {
    return {
      success: false,
      error: 'invalid_timestamp',
      reason: 'Timestamp must be within 300 seconds of server time'
    };
  }

  // Verify HMAC signature
  if (!env.DASHBOARD_HMAC_SECRET) {
    return {
      success: false,
      error: 'unauthorized',
      reason: 'HMAC secret not configured'
    };
  }

  const rawBody = await request.text();
  const isValidSignature = await verifyHmacHexSignature(env.DASHBOARD_HMAC_SECRET, rawBody, signature);
  
  if (!isValidSignature) {
    return {
      success: false,
      error: 'invalid_signature',
      reason: 'HMAC signature verification failed'
    };
  }

  return { success: true };
}

export function getRequestId(request: Request): string {
  // Use CF-Ray if available, otherwise generate UUID
  const cfRay = request.headers.get('CF-Ray');
  if (cfRay) return cfRay;
  
  return crypto.randomUUID();
}

export function getClientIP(request: Request): string {
  return request.headers.get('CF-Connecting-IP') || 
         request.headers.get('X-Forwarded-For')?.split(',')[0] || 
         'unknown';
}

export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}