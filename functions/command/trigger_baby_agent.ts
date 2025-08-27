// Trigger baby agent command endpoint - triggers specialized AI agent tasks
import { jsonResponse, handleOptions } from '../_utils/cors';
import { withMachineAuth, addSecurityHeaders, AuthenticatedRequest } from '../_utils/middleware';
import { validateTriggerBabyAgent, ValidationError } from '../_utils/schemas';

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
  return withMachineAuth(context.request, context.env, handleTriggerBabyAgent);
};

async function handleTriggerBabyAgent(req: AuthenticatedRequest, env: Env): Promise<Response> {
  try {
    // Validate schema
    let command;
    try {
      command = validateTriggerBabyAgent(req.parsedBody);
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

    // Generate task ID for tracking
    const taskId = crypto.randomUUID();

    // Store the agent task
    const stmt = env.DB.prepare(`
      INSERT INTO agent_tasks
      (task_id, intent, parameters, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    const result = await stmt.bind(
      taskId,
      command.intent,
      JSON.stringify(command.parameters),
      'queued',
      now,
      now
    ).run();

    if (!result.success) {
      throw new Error('Failed to create agent task');
    }

    // Store in cache for quick access
    await env.CACHE.put(`agent_task:${taskId}`, JSON.stringify({
      task_id: taskId,
      intent: command.intent,
      parameters: command.parameters,
      status: 'queued',
      created_at: now
    }), {
      expirationTtl: 24 * 60 * 60 // 24 hours
    });

    // Different intents might have different processing requirements
    let priority = 'normal';
    if (command.intent.includes('urgent') || command.intent.includes('critical')) {
      priority = 'high';
    }
    if (command.intent.includes('analysis') || command.intent.includes('report')) {
      priority = 'low';
    }

    // Log successful task creation
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      requestId: req.requestId,
      event: 'baby_agent_triggered',
      task_id: taskId,
      intent: command.intent,
      priority,
      parameters: Object.keys(command.parameters),
      parameter_count: Object.keys(command.parameters).length
    }));

    const response = jsonResponse({
      ok: true,
      task_id: taskId,
      intent: command.intent,
      status: 'queued',
      priority,
      created_at: now
    });

    return addSecurityHeaders(response);

  } catch (error: any) {
    console.error('Trigger baby agent command error:', error);
    
    const response = jsonResponse({
      error: 'server_error',
      requestId: req.requestId
    }, 500);

    return addSecurityHeaders(response);
  }
}