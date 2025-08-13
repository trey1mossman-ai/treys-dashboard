import { corsHeaders, handleOptions } from '../../_utils/cors';
import { json, readJSON } from '../../_utils/json';

export async function onRequestPost(context: any) {
  const { request, env } = context;
  
  if (request.method === 'OPTIONS') {
    return handleOptions(env);
  }

  try {
    const body = await readJSON(request);
    const { entries } = body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return json({ ok: false, error: 'Entries array required' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);
    const dateMap = new Map<string, number>(); // Track sets per date

    // Insert all workout log entries
    for (const entry of entries) {
      const { date, exercise, set_number, reps, load, rpe, notes } = entry;

      if (!date || !exercise) {
        continue; // Skip invalid entries
      }

      const id = crypto.randomUUID();

      await env.DB.prepare(`
        INSERT INTO workout_logs (id, date, exercise, set_number, reps, load, rpe, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(id, date, exercise, set_number, reps, load, rpe, notes, now).run();

      // Track sets per date for metrics
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
    }

    // Update daily metrics based on completed sets
    for (const [date, completedSets] of dateMap) {
      // Get the planned workout for this date
      const plan = await env.DB.prepare(`
        SELECT blocks_json FROM trainer_plans WHERE date = ?
      `).bind(date).first();

      let plannedSets = 10; // Default if no plan
      if (plan?.blocks_json) {
        try {
          const blocks = JSON.parse(plan.blocks_json);
          // Count total sets in the plan
          plannedSets = blocks.reduce((total: number, block: any) => {
            return total + (block.exercises?.reduce((ex: number, e: any) => 
              ex + (e.sets || 3), 0) || 0);
          }, 0) || 10;
        } catch (e) {
          console.error('Error parsing blocks:', e);
        }
      }

      // Calculate completion ratio (can exceed 1.0)
      const completionRatio = completedSets / plannedSets;

      // Update or insert daily metrics
      await env.DB.prepare(`
        INSERT INTO daily_metrics (date, gym_actual, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(date) DO UPDATE SET 
          gym_actual = gym_actual + ?,
          updated_at = ?
      `).bind(date, completionRatio, now, completionRatio, now).run();
    }

    return json({ ok: true, logged: entries.length }, 200);
    
  } catch (error: any) {
    console.error('Log workout error:', error);
    return json({ ok: false, error: error.message }, 500);
  }
}

export const onRequest = onRequestPost;