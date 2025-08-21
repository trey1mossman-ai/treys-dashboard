// Using Web Crypto API instead of Node.js crypto module

// Helper functions to replace Node.js crypto with Web Crypto API
async function createHash(algorithm: string) {
  return {
    update: (data: string) => ({
      digest: async (format: string) => {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest(algorithm.toUpperCase().replace('SHA', 'SHA-'), dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }
    })
  };
}

async function createHmac(algorithm: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: algorithm.toUpperCase().replace('SHA', 'SHA-') },
    false,
    ['sign']
  );
  
  return {
    update: (data: string) => ({
      digest: async (format: string) => {
        const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
        const hashArray = Array.from(new Uint8Array(signature));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }
    })
  };
}

function timingSafeEqual(a: Buffer | Uint8Array, b: Buffer | Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

export interface Env {
  DB: D1Database;
  AGENT_SERVICE_TOKEN: string;
  AGENT_HMAC_SECRET: string;
  AGENT_NONCE_KV?: KVNamespace;
  AGENT_ALLOWED_TOOLS?: string;
  AGENT_ALLOWED_IPS?: string;
  VITE_PUBLIC_ORIGIN?: string;
}

interface CommandRequest {
  tool: string;
  args: Record<string, any>;
  dryRun?: boolean;
}

interface CommandResponse {
  ok: boolean;
  tool?: string;
  result?: any;
  warning?: string;
  error?: {
    code: 'VALIDATION_ERROR' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'RETRY' | 'INTERNAL';
    message: string;
  };
}

const MAX_TIMESTAMP_SKEW_SECONDS = 300; // 5 minutes
const IDEMPOTENCY_RETENTION_SECONDS = 86400; // 24 hours
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 100;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const startTime = Date.now();
  
  let auditId = crypto.randomUUID();
  let tool = 'unknown';
  let args = {};
  let status = 'fail';
  let errorCode: string | undefined;
  let errorMessage: string | undefined;
  
  try {
    // 1. Verify authorization token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ 
        ok: false, 
        error: { code: 'FORBIDDEN', message: 'Missing or invalid authorization' }
      }, 401);
    }
    
    const token = authHeader.substring(7);
    if (token !== env.AGENT_SERVICE_TOKEN) {
      return jsonResponse({ 
        ok: false, 
        error: { code: 'FORBIDDEN', message: 'Invalid service token' }
      }, 401);
    }
    
    // 2. Check IP allowlist if configured
    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (env.AGENT_ALLOWED_IPS) {
      const allowedIps = env.AGENT_ALLOWED_IPS.split(',').map(ip => ip.trim());
      if (!allowedIps.includes(clientIp)) {
        return jsonResponse({ 
          ok: false, 
          error: { code: 'FORBIDDEN', message: 'IP not allowed' }
        }, 403);
      }
    }
    
    // 3. Verify timestamp to prevent replay attacks
    const timestamp = request.headers.get('X-TS');
    if (!timestamp) {
      return jsonResponse({ 
        ok: false, 
        error: { code: 'FORBIDDEN', message: 'Missing timestamp' }
      }, 400);
    }
    
    const now = Math.floor(Date.now() / 1000);
    const requestTs = parseInt(timestamp, 10);
    if (isNaN(requestTs) || Math.abs(now - requestTs) > MAX_TIMESTAMP_SKEW_SECONDS) {
      return jsonResponse({ 
        ok: false, 
        error: { code: 'FORBIDDEN', message: 'Request timestamp out of range' }
      }, 400);
    }
    
    // 4. Read and verify request body
    const bodyText = await request.text();
    
    // 5. Verify HMAC signature
    const signature = request.headers.get('X-Signature');
    if (!signature || !signature.startsWith('sha256=')) {
      return jsonResponse({ 
        ok: false, 
        error: { code: 'FORBIDDEN', message: 'Missing or invalid signature' }
      }, 401);
    }
    
    const providedSig = signature.substring(7);
    const hmac = await createHmac('sha256', env.AGENT_HMAC_SECRET);
    const expectedSig = await hmac.update(bodyText).digest('hex');
    
    const encoder = new TextEncoder();
    if (!timingSafeEqual(encoder.encode(providedSig), encoder.encode(expectedSig))) {
      return jsonResponse({ 
        ok: false, 
        error: { code: 'FORBIDDEN', message: 'Invalid signature' }
      }, 401);
    }
    
    // 6. Check for replay protection
    const replayKey = `${timestamp}:${providedSig}`;
    if (env.AGENT_NONCE_KV) {
      const existing = await env.AGENT_NONCE_KV.get(replayKey);
      if (existing) {
        return jsonResponse({ 
          ok: false, 
          error: { code: 'FORBIDDEN', message: 'Duplicate request detected' }
        }, 400);
      }
      await env.AGENT_NONCE_KV.put(replayKey, '1', { 
        expirationTtl: MAX_TIMESTAMP_SKEW_SECONDS * 2 
      });
    } else {
      // Use D1 for replay protection
      const hash = await createHash('sha256');
      const replayHash = await hash.update(replayKey).digest('hex');
      const existing = await env.DB.prepare(
        'SELECT 1 FROM replay_protection WHERE signature_hash = ? AND ts > ?'
      ).bind(replayHash, now - MAX_TIMESTAMP_SKEW_SECONDS * 2).first();
      
      if (existing) {
        return jsonResponse({ 
          ok: false, 
          error: { code: 'FORBIDDEN', message: 'Duplicate request detected' }
        }, 400);
      }
      
      await env.DB.prepare(
        'INSERT INTO replay_protection (signature_hash, ts) VALUES (?, ?)'
      ).bind(replayHash, now).run();
    }
    
    // 7. Parse and validate request body
    let body: CommandRequest;
    try {
      body = JSON.parse(bodyText);
    } catch (e) {
      return jsonResponse({ 
        ok: false, 
        error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body' }
      }, 400);
    }
    
    tool = body.tool;
    args = body.args || {};
    
    // 8. Check tool allowlist if configured
    if (env.AGENT_ALLOWED_TOOLS) {
      const allowedTools = env.AGENT_ALLOWED_TOOLS.split(',').map(t => t.trim());
      if (!allowedTools.includes(tool)) {
        return jsonResponse({ 
          ok: false, 
          error: { code: 'FORBIDDEN', message: `Tool '${tool}' not allowed` }
        }, 403);
      }
    }
    
    // 9. Check idempotency key
    const idempotencyKey = request.headers.get('X-Idempotency-Key');
    if (idempotencyKey) {
      const existing = await env.DB.prepare(
        'SELECT result, status_code FROM idempotency_keys WHERE key = ? AND ts > ?'
      ).bind(idempotencyKey, now - IDEMPOTENCY_RETENTION_SECONDS).first();
      
      if (existing) {
        status = 'ok';
        await logAudit(env.DB, {
          id: auditId,
          ts: now,
          actor: 'agent',
          tool,
          args: JSON.stringify(args),
          result: existing.result as string,
          status,
          ip: clientIp,
          duration_ms: Date.now() - startTime,
          idempotency_key: idempotencyKey
        });
        
        return new Response(existing.result as string, {
          status: existing.status_code as number || 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // 10. Apply rate limiting
    const rateLimitKey = `token:${token.substring(0, 8)}:${Math.floor(now / RATE_LIMIT_WINDOW_SECONDS)}`;
    const rateLimit = await checkRateLimit(env.DB, rateLimitKey, RATE_LIMIT_MAX_REQUESTS);
    if (!rateLimit.allowed) {
      return jsonResponse({ 
        ok: false, 
        error: { code: 'RETRY', message: 'Rate limit exceeded' }
      }, 429);
    }
    
    // 11. Execute the command
    const handlers = await import('./handlers');
    const handler = handlers[tool];
    
    if (!handler) {
      return jsonResponse({ 
        ok: false, 
        error: { code: 'VALIDATION_ERROR', message: `Unknown tool: ${tool}` }
      }, 400);
    }
    
    let result: CommandResponse;
    
    if (body.dryRun) {
      // Validate without executing
      const validation = await handler.validate?.(args, env);
      if (validation && !validation.valid) {
        result = { 
          ok: false, 
          error: { code: 'VALIDATION_ERROR', message: validation.error || 'Validation failed' }
        };
      } else {
        result = { 
          ok: true, 
          tool, 
          result: { dryRun: true, wouldExecute: args },
          warning: 'Dry run - no changes made'
        };
      }
    } else {
      // Execute the handler
      try {
        const handlerResult = await handler.execute(args, env);
        result = { ok: true, tool, result: handlerResult };
        status = 'ok';
      } catch (error: any) {
        errorCode = error.code || 'INTERNAL';
        errorMessage = error.message || 'Internal error';
        result = { 
          ok: false, 
          error: { 
            code: errorCode as any, 
            message: errorMessage 
          }
        };
      }
    }
    
    // 12. Store idempotency result if key provided
    if (idempotencyKey && !body.dryRun) {
      const resultJson = JSON.stringify(result);
      const hashObj = await createHash('sha256');
      const argsHash = await hashObj.update(JSON.stringify(args)).digest('hex');
      await env.DB.prepare(
        'INSERT OR IGNORE INTO idempotency_keys (key, ts, tool, args_hash, result, status_code) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(
        idempotencyKey, 
        now, 
        tool, 
        argsHash, 
        resultJson,
        result.ok ? 200 : 400
      ).run();
    }
    
    // 13. Log audit entry
    await logAudit(env.DB, {
      id: auditId,
      ts: now,
      actor: 'agent',
      tool,
      args: JSON.stringify(args),
      result: JSON.stringify(result.result || {}),
      status,
      ip: clientIp,
      duration_ms: Date.now() - startTime,
      error_code: errorCode,
      error_message: errorMessage,
      idempotency_key: idempotencyKey || undefined
    });
    
    return jsonResponse(result, result.ok ? 200 : 400);
    
  } catch (error: any) {
    // Log unexpected errors
    await logAudit(env.DB, {
      id: auditId,
      ts: Math.floor(Date.now() / 1000),
      actor: 'agent',
      tool,
      args: JSON.stringify(args),
      result: '',
      status: 'fail',
      ip: request.headers.get('CF-Connecting-IP') || 'unknown',
      duration_ms: Date.now() - startTime,
      error_code: 'INTERNAL',
      error_message: error.message || 'Unexpected error',
      idempotency_key: request.headers.get('X-Idempotency-Key') || undefined
    });
    
    return jsonResponse({ 
      ok: false, 
      error: { code: 'INTERNAL', message: 'Internal server error' }
    }, 500);
  }
};

async function logAudit(db: D1Database, entry: any) {
  try {
    await db.prepare(`
      INSERT INTO agent_audit (
        id, ts, actor, tool, args, result, status, ip, 
        duration_ms, error_code, error_message, idempotency_key
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      entry.id,
      entry.ts,
      entry.actor,
      entry.tool,
      entry.args,
      entry.result,
      entry.status,
      entry.ip,
      entry.duration_ms,
      entry.error_code || null,
      entry.error_message || null,
      entry.idempotency_key || null
    ).run();
  } catch (e) {
    console.error('Failed to log audit:', e);
  }
}

async function checkRateLimit(
  db: D1Database, 
  key: string, 
  limit: number
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / RATE_LIMIT_WINDOW_SECONDS) * RATE_LIMIT_WINDOW_SECONDS;
  
  const result = await db.prepare(
    'SELECT count FROM rate_limits WHERE key = ? AND window_start = ?'
  ).bind(key, windowStart).first();
  
  const count = (result?.count as number) || 0;
  
  if (count >= limit) {
    return { allowed: false, remaining: 0 };
  }
  
  await db.prepare(`
    INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET count = count + 1, window_start = ?
  `).bind(key, windowStart, windowStart).run();
  
  return { allowed: true, remaining: limit - count - 1 };
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}