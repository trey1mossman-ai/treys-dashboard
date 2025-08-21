import { handleOptions } from '../_utils/cors'
import { jsonResponse, errorResponse } from '../_utils/json'

interface Env {
  DB: D1Database
  VITE_PUBLIC_ORIGIN?: string
}

/**
 * GET /api/agenda/get?id=<uuid>
 * Returns a single agenda item by ID
 * 
 * curl "http://localhost:8788/api/agenda/get?id=123e4567-e89b-12d3-a456-426614174000"
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const origin = context.env.VITE_PUBLIC_ORIGIN || '*'
  
  if (context.request.method === 'OPTIONS') {
    return handleOptions(origin)
  }

  try {
    const url = new URL(context.request.url)
    const id = url.searchParams.get('id')
    
    if (!id) {
      return errorResponse('Missing id parameter', 400, origin)
    }

    const query = `
      SELECT id, date, title, tag, start_ts, end_ts, status, notes
      FROM agenda_items 
      WHERE id = ? AND deleted_at IS NULL
      LIMIT 1
    `
    
    const result = await context.env.DB
      .prepare(query)
      .bind(id)
      .first()
    
    if (!result) {
      return errorResponse('Item not found', 404, origin)
    }
    
    return jsonResponse({
      ok: true,
      item: result
    }, 200, origin)
    
  } catch (error) {
    console.error('Get agenda error:', error)
    return errorResponse('Failed to fetch agenda item', 500, origin)
  }
}