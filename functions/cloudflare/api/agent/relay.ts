// Agent Relay - Server-side proxy for Agent API
// This handles authentication so the frontend doesn't need credentials

export interface Env {
  DB: D1Database;
  AGENT_SERVICE_TOKEN: string;
  AGENT_HMAC_SECRET: string;
  VITE_PUBLIC_ORIGIN?: string;
}

interface RelayRequest {
  tool: string;
  args: Record<string, any>;
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

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  
  try {
    // Parse request
    const body: RelayRequest = await request.json();
    
    if (!body.tool || !body.args) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Missing tool or args' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check if agent credentials are configured
    if (!env.AGENT_SERVICE_TOKEN || !env.AGENT_HMAC_SECRET) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Agent API not configured. Please set AGENT_SERVICE_TOKEN and AGENT_HMAC_SECRET in environment.' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Prepare the command
    const timestamp = Math.floor(Date.now() / 1000);
    const commandBody = JSON.stringify({
      tool: body.tool,
      args: body.args,
      dryRun: false
    });
    
    // Generate HMAC signature
    const hmac = await createHmac('sha256', env.AGENT_HMAC_SECRET);
    const signature = await hmac.update(commandBody).digest('hex');
    
    // Generate idempotency key
    const idempotencyKey = crypto.randomUUID();
    
    // Build the internal URL
    const origin = env.VITE_PUBLIC_ORIGIN || 'http://localhost:8788';
    const url = `${origin}/api/agent/command`;
    
    // Make the internal API call
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.AGENT_SERVICE_TOKEN}`,
        'X-Signature': `sha256=${signature}`,
        'X-TS': timestamp.toString(),
        'X-Idempotency-Key': idempotencyKey
      },
      body: commandBody
    });
    
    const result = await response.json();
    
    // Log the relay action (optional)
    try {
      await env.DB.prepare(`
        INSERT INTO agent_audit (
          id, ts, actor, tool, args, result, status, ip, duration_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        timestamp,
        'relay',
        body.tool,
        JSON.stringify(body.args),
        JSON.stringify(result),
        result.ok ? 'ok' : 'fail',
        request.headers.get('CF-Connecting-IP') || 'unknown',
        Date.now() - (timestamp * 1000)
      ).run();
    } catch (e) {
      console.error('Failed to log relay audit:', e);
    }
    
    return new Response(JSON.stringify(result), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('Agent relay error:', error);
    return new Response(JSON.stringify({ 
      ok: false, 
      error: 'Internal relay error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// OPTIONS for CORS
export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
