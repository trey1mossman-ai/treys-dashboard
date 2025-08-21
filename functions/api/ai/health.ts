import { json } from '../../_utils/json';

export interface Env {
  PROVIDER: string;
  OPENAI_API_KEY: string;
  OPENAI_MODEL: string;
  ANTHROPIC_API_KEY: string;
  ANTHROPIC_MODEL: string;
  AI_TOOLS: KVNamespace;
  AI_LOGS: KVNamespace;
  AI_EMBEDDINGS: KVNamespace;
}

// Health check endpoint for debugging
export async function onRequestGet(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { env } = context;
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    provider: env.PROVIDER || 'not_configured',
    model: {
      openai: env.OPENAI_MODEL || 'not_configured',
      anthropic: env.ANTHROPIC_MODEL || 'not_configured'
    },
    services: {
      openai: {
        configured: !!env.OPENAI_API_KEY,
        keyPrefix: env.OPENAI_API_KEY ? env.OPENAI_API_KEY.substring(0, 7) + '...' : 'missing'
      },
      anthropic: {
        configured: !!env.ANTHROPIC_API_KEY,
        keyPrefix: env.ANTHROPIC_API_KEY ? env.ANTHROPIC_API_KEY.substring(0, 7) + '...' : 'missing'
      },
      kv: {
        tools: !!env.AI_TOOLS,
        logs: !!env.AI_LOGS,
        embeddings: !!env.AI_EMBEDDINGS
      }
    },
    checks: []
  };

  // Check OpenAI connectivity (if configured)
  if (env.OPENAI_API_KEY) {
    try {
      const testResponse = await fetch(`${env.OPENAI_BASE_URL || 'https://api.openai.com/v1'}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`
        },
        signal: AbortSignal.timeout(5000)
      });
      
      health.checks.push({
        service: 'openai',
        status: testResponse.ok ? 'ok' : 'error',
        statusCode: testResponse.status,
        message: testResponse.ok ? 'Connected to OpenAI' : `OpenAI API error: ${testResponse.status}`
      });
    } catch (error: any) {
      health.checks.push({
        service: 'openai',
        status: 'error',
        message: `OpenAI connection failed: ${error.message}`
      });
    }
  }

  // Check Anthropic connectivity (if configured)
  if (env.ANTHROPIC_API_KEY) {
    try {
      // Anthropic doesn't have a simple health endpoint, so we'll just check the headers are accepted
      const testResponse = await fetch(`${env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1'}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }]
        }),
        signal: AbortSignal.timeout(5000)
      });
      
      health.checks.push({
        service: 'anthropic',
        status: testResponse.ok || testResponse.status === 401 ? 'ok' : 'error',
        statusCode: testResponse.status,
        message: testResponse.ok || testResponse.status === 401 
          ? 'Anthropic API accessible' 
          : `Anthropic API error: ${testResponse.status}`
      });
    } catch (error: any) {
      health.checks.push({
        service: 'anthropic',
        status: 'error',
        message: `Anthropic connection failed: ${error.message}`
      });
    }
  }

  // Check KV namespaces
  try {
    if (env.AI_TOOLS) {
      await env.AI_TOOLS.put('health_check', new Date().toISOString(), { expirationTtl: 60 });
      const value = await env.AI_TOOLS.get('health_check');
      health.checks.push({
        service: 'kv_tools',
        status: value ? 'ok' : 'error',
        message: value ? 'KV Tools working' : 'KV Tools write/read failed'
      });
    }
  } catch (error: any) {
    health.checks.push({
      service: 'kv_tools',
      status: 'error',
      message: `KV error: ${error.message}`
    });
  }

  // Determine overall health
  const hasErrors = health.checks.some(check => check.status === 'error');
  if (hasErrors) {
    health.status = 'degraded';
  }
  
  if (!env.OPENAI_API_KEY && !env.ANTHROPIC_API_KEY) {
    health.status = 'unconfigured';
    health.checks.push({
      service: 'configuration',
      status: 'error',
      message: 'No AI provider API keys configured. Add OPENAI_API_KEY or ANTHROPIC_API_KEY'
    });
  }

  return json(health, health.status === 'healthy' ? 200 : 503);
}