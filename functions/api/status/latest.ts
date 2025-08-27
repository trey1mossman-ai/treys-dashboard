import { json } from '../../_utils/json';
import { corsHeaders, handleOptions } from '../../_utils/cors';

export interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'OPTIONS') {
    return handleOptions();
  }
  
  if (context.request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }
  
  try {
    // Get latest status snapshot
    const status = await context.env.DB.prepare(
      `SELECT * FROM status_snapshots 
       ORDER BY captured_at DESC 
       LIMIT 1`
    ).first();
    
    if (!status) {
      return json({ 
        success: false, 
        message: 'No status snapshot available' 
      }, 404);
    }
    
    // Parse the stress flag if it's stored as JSON
    const parsedStatus = {
      ...status,
      stress_flag: {
        level: status.stress_flag || 'green',
        reason: status.stress_reason || ''
      }
    };
    
    delete parsedStatus.stress_reason; // Remove the separate field
    
    return json({
      success: true,
      ...parsedStatus
    });
    
  } catch (error: any) {
    console.error('Failed to fetch latest status:', error);
    return json({ error: error.message || 'Internal server error' }, 500);
  }
};