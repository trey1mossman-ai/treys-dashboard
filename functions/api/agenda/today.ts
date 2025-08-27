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
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's agenda items
    const items = await context.env.DB.prepare(
      `SELECT * FROM agenda_items 
       WHERE DATE(start_time) = ? 
       ORDER BY start_time ASC`
    ).bind(today).all();
    
    // Parse metadata JSON for each item
    const parsedItems = items.results.map((item: any) => ({
      ...item,
      metadata: JSON.parse(item.metadata || '{}')
    }));
    
    return json({
      success: true,
      date: today,
      items: parsedItems
    });
    
  } catch (error: any) {
    console.error('Failed to fetch today agenda:', error);
    return json({ error: error.message || 'Internal server error' }, 500);
  }
};