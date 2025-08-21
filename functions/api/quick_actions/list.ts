import { handleOptions, jsonResponse, errorResponse } from '../_utils/cors';

interface Env {
  DB: D1Database;
}

interface QuickAction {
  id: string;
  name: string;
  method: 'GET' | 'POST';
  webhook_url: string;
  headers_json?: string;
  default_payload_json?: string;
  created_at: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  // Handle CORS preflight
  if (context.request.method === 'OPTIONS') {
    return handleOptions();
  }

  try {
    const { DB } = context.env;
    
    // Check if table exists and handle gracefully
    try {
      const result = await DB.prepare(
        `SELECT id, name, method, webhook_url, headers_json, default_payload_json, created_at
         FROM quick_actions
         ORDER BY created_at DESC
         LIMIT 100`
      ).all<QuickAction>();

      const actions = result.results.map(action => ({
        id: action.id,
        name: action.name,
        method: action.method,
        webhook_url: action.webhook_url,
        headers: action.headers_json ? JSON.parse(action.headers_json) : undefined,
        default_payload: action.default_payload_json ? JSON.parse(action.default_payload_json) : undefined,
        created_at: action.created_at
      }));

      return jsonResponse({ ok: true, actions });
      
    } catch (dbError: any) {
      // If table doesn't exist, return empty array instead of erroring
      if (dbError.message?.includes('no such table')) {
        console.log('Table quick_actions does not exist yet, returning empty array');
        return jsonResponse({ ok: true, actions: [] });
      }
      throw dbError;
    }
    
  } catch (error: any) {
    console.error('Error in quick_actions/list:', error);
    return errorResponse(error.message || 'Failed to fetch quick actions', 500);
  }
};