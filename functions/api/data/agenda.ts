// Frontend API for retrieving agenda data
import { jsonResponse, handleOptions } from '../../_utils/cors';
import { checkFrontendRateLimit, getClientIP } from '../../_utils/proxy';

interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  // Handle CORS preflight
  if (context.request.method === 'OPTIONS') {
    return handleOptions();
  }

  // Only allow GET
  if (context.request.method !== 'GET') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  const requestId = crypto.randomUUID();
  const clientIP = getClientIP(context.request);

  try {
    // Check rate limit
    const rateLimit = await checkFrontendRateLimit(clientIP, context.env);
    if (!rateLimit.allowed) {
      return jsonResponse({
        error: 'rate_limited',
        remaining: rateLimit.remaining,
        resetTime: rateLimit.resetTime
      }, 429);
    }

    const url = new URL(context.request.url);
    const date = url.searchParams.get('date'); // YYYY-MM-DD format
    const source = url.searchParams.get('source'); // Optional filter

    // Build query
    let query = `
      SELECT id, title, source, start_time, end_time, status, metadata, display_notes, updated_at
      FROM agenda_items 
      WHERE 1=1
    `;
    const params: string[] = [];

    if (date) {
      query += ` AND DATE(start_time) = ?`;
      params.push(date);
    } else {
      // Default to today
      const today = new Date().toISOString().split('T')[0];
      query += ` AND DATE(start_time) = ?`;
      params.push(today);
    }

    if (source) {
      query += ` AND source = ?`;
      params.push(source);
    }

    query += ` ORDER BY start_time ASC`;

    // Execute query
    const stmt = context.env.DB.prepare(query);
    const result = await stmt.bind(...params).all();

    if (!result.success) {
      throw new Error('Database query failed');
    }

    // Transform results
    const items = result.results.map((row: any) => ({
      id: row.id,
      title: row.title,
      source: row.source,
      start_time: row.start_time,
      end_time: row.end_time,
      status: row.status,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      display_notes: row.display_notes,
      updated_at: row.updated_at
    }));

    return jsonResponse({
      items,
      count: items.length,
      date: date || new Date().toISOString().split('T')[0],
      ...(source && { source })
    });

  } catch (error: any) {
    console.error('Frontend API agenda error:', error);
    return jsonResponse({
      error: 'server_error',
      requestId
    }, 500);
  }
};