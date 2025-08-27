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
    // Get all inventory items
    const items = await context.env.DB.prepare(
      `SELECT * FROM inventory_items 
       ORDER BY category, name`
    ).all();
    
    return json({
      success: true,
      items: items.results || []
    });
    
  } catch (error: any) {
    console.error('Failed to fetch inventory:', error);
    return json({ error: error.message || 'Internal server error' }, 500);
  }
};