// CORS utility functions for all API endpoints

export function corsHeaders(origin?: string): HeadersInit {
  const allowedOrigin = origin || '*'
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  }
}

export function handleOptions(origin?: string): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin)
  })
}

export function jsonResponse(data: any, status = 200, origin?: string): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin)
    }
  })
}

export function errorResponse(message: string, status = 500, origin?: string): Response {
  return jsonResponse({ 
    ok: false, 
    error: message 
  }, status, origin)
}

// Helper to safely parse JSON from request
export async function parseRequestBody(request: Request): Promise<any> {
  try {
    const text = await request.text()
    if (!text) return {}
    return JSON.parse(text)
  } catch (error) {
    throw new Error('Invalid JSON in request body')
  }
}

// Helper to check if database table exists
export async function tableExists(db: D1Database, tableName: string): Promise<boolean> {
  try {
    const result = await db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
    ).bind(tableName).first()
    return result !== null
  } catch (error) {
    console.error(`Error checking table ${tableName}:`, error)
    return false
  }
}

// Helper to initialize table if it doesn't exist
export async function ensureTable(db: D1Database, tableName: string, createSQL: string): Promise<void> {
  const exists = await tableExists(db, tableName)
  if (!exists) {
    console.log(`Creating table ${tableName}...`)
    try {
      await db.prepare(createSQL).run()
    } catch (error) {
      console.error(`Error creating table ${tableName}:`, error)
    }
  }
}