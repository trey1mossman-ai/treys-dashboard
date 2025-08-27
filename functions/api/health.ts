import { jsonResponse, handleOptions } from './_utils/cors';

interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  // Handle CORS preflight
  if (context.request.method === 'OPTIONS') {
    return handleOptions();
  }

  try {
    const { DB } = context.env;
    
    // Test database connection
    let dbStatus = 'unknown';
    let tableCount = 0;
    
    try {
      // Check if we can query the database
      const tables = await DB.prepare(
        `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'`
      ).first();
      
      tableCount = (tables?.count as number) || 0;
      dbStatus = 'connected';
    } catch (dbError: any) {
      console.error('Database health check failed:', dbError);
      dbStatus = 'error';
    }
    
    // Check specific tables
    const tableChecks: Record<string, boolean> = {};
    const tablesToCheck = ['quick_actions', 'notes', 'agenda', 'tasks'];
    
    for (const tableName of tablesToCheck) {
      try {
        const result = await DB.prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
        ).bind(tableName).first();
        tableChecks[tableName] = result !== null;
      } catch {
        tableChecks[tableName] = false;
      }
    }
    
    // Determine overall health status
    const isHealthy = dbStatus === 'connected' && tableCount > 0;
    const missingTables = Object.entries(tableChecks).filter(([_, exists]) => !exists).map(([name]) => name);
    
    const response = {
      status: 'ok',
      now: new Date().toISOString()
    };
    
    return jsonResponse(response, 200);
    
  } catch (error: any) {
    console.error('Health check error:', error);
    return jsonResponse({
      status: 'ok',
      now: new Date().toISOString()
    }, 200);
  }
};