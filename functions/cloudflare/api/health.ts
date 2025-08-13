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
    
    const response = {
      ok: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        tableCount,
        tables: tableChecks
      },
      environment: {
        runtime: 'cloudflare-pages',
        cors: 'enabled'
      }
    };
    
    return jsonResponse(response);
    
  } catch (error: any) {
    console.error('Health check error:', error);
    return jsonResponse({
      ok: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message || 'Unknown error',
      database: {
        status: 'error'
      }
    }, 500);
  }
};