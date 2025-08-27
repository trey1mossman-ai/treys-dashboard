// Frontend API for retrieving inventory data
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
    const showLowOnly = url.searchParams.get('low_only') === 'true';
    const category = url.searchParams.get('category');

    // Build query
    let query = `
      SELECT id, name, category, unit, current_qty, min_qty, reorder_link, last_updated
      FROM inventory_items 
      WHERE 1=1
    `;
    const params: string[] = [];

    if (showLowOnly) {
      query += ` AND current_qty <= min_qty`;
    }

    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }

    query += ` ORDER BY name ASC`;

    // Execute query
    const stmt = context.env.DB.prepare(query);
    const result = await stmt.bind(...params).all();

    if (!result.success) {
      throw new Error('Database query failed');
    }

    // Transform results
    const items = result.results.map((row: any) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      unit: row.unit,
      current_qty: row.current_qty,
      min_qty: row.min_qty,
      reorder_link: row.reorder_link,
      last_updated: row.last_updated,
      is_low: row.current_qty <= row.min_qty
    }));

    // Calculate summary stats
    const lowItems = items.filter(item => item.is_low);
    const categories = [...new Set(items.map(item => item.category))];

    return jsonResponse({
      items,
      count: items.length,
      low_inventory: lowItems.length,
      categories,
      filters: {
        low_only: showLowOnly,
        category: category || null
      }
    });

  } catch (error: any) {
    console.error('Frontend API inventory error:', error);
    return jsonResponse({
      error: 'server_error',
      requestId
    }, 500);
  }
};