// Workout ingest endpoint - receives workout plan and agenda items from n8n
import { jsonResponse, handleOptions } from '../_utils/cors';
import { withMachineAuth, addSecurityHeaders, AuthenticatedRequest } from '../_utils/middleware';
import { validateWorkoutItem, validateAgendaItems, ValidationError } from '../_utils/schemas';

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
  return withMachineAuth(context.request, context.env, handleWorkoutIngest);
};

async function handleWorkoutIngest(req: AuthenticatedRequest, env: Env): Promise<Response> {
  try {
    // Validate payload structure
    if (!req.parsedBody.workout || !req.parsedBody.agenda) {
      return addSecurityHeaders(jsonResponse({
        error: 'invalid_payload',
        reason: 'Payload must contain both "workout" and "agenda" fields'
      }, 422));
    }

    // Validate workout item
    let workoutItem;
    try {
      workoutItem = validateWorkoutItem(req.parsedBody.workout);
    } catch (error) {
      if (error instanceof ValidationError) {
        return addSecurityHeaders(jsonResponse({
          error: 'invalid_payload',
          reason: error.message,
          field: `workout.${error.field}`
        }, 422));
      }
      throw error;
    }

    // Validate agenda items
    let agendaItems;
    try {
      agendaItems = validateAgendaItems(req.parsedBody.agenda);
    } catch (error) {
      if (error instanceof ValidationError) {
        return addSecurityHeaders(jsonResponse({
          error: 'invalid_payload',
          reason: error.message,
          field: `agenda.${error.field}`
        }, 422));
      }
      throw error;
    }

    // Filter for workout-related items
    const workoutAgendaItems = agendaItems.filter(item => item.source === 'workout');

    const now = new Date().toISOString();

    // Store workout item
    const workoutStmt = env.DB.prepare(`
      INSERT OR REPLACE INTO workout_plans 
      (plan_name, blocks, intensity_flag, adjustments, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    await workoutStmt.bind(
      workoutItem.plan_name,
      JSON.stringify(workoutItem.blocks),
      workoutItem.intensity_flag,
      workoutItem.adjustments || null,
      now,
      now
    ).run();

    // Store agenda items
    if (workoutAgendaItems.length > 0) {
      const agendaStmt = env.DB.prepare(`
        INSERT OR REPLACE INTO agenda_items 
        (id, title, source, start_time, end_time, status, metadata, display_notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const batch = workoutAgendaItems.map(item => 
        agendaStmt.bind(
          item.id,
          item.title,
          item.source,
          item.start_time,
          item.end_time || null,
          item.status,
          JSON.stringify(item.metadata || {}),
          item.display_notes || null,
          now,
          now
        )
      );

      await env.DB.batch(batch);
    }

    // Log successful ingestion
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      requestId: req.requestId,
      event: 'workout_ingested',
      workout: workoutItem.plan_name,
      intensity: workoutItem.intensity_flag,
      blocks: workoutItem.blocks.length,
      agenda_items: workoutAgendaItems.length
    }));

    const response = jsonResponse({
      ok: true,
      workout: {
        plan_name: workoutItem.plan_name,
        blocks: workoutItem.blocks.length,
        intensity_flag: workoutItem.intensity_flag
      },
      agenda: {
        ingested: workoutAgendaItems.length
      }
    });

    return addSecurityHeaders(response);

  } catch (error: any) {
    console.error('Workout ingest error:', error);
    
    const response = jsonResponse({
      error: 'server_error',
      requestId: req.requestId
    }, 500);

    return addSecurityHeaders(response);
  }
}