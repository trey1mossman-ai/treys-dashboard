// Inventory ingest endpoint - receives inventory items from n8n
import { jsonResponse, handleOptions } from '../_utils/cors';
import { withMachineAuth, addSecurityHeaders, AuthenticatedRequest } from '../_utils/middleware';
import { validateInventoryItems, ValidationError } from '../_utils/schemas';

interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  CF_ACCESS_CLIENT_ID?: string;
  CF_ACCESS_CLIENT_SECRET?: string;
  DASHBOARD_HMAC_SECRET?: string;
  BODY_LIMIT_BYTES?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  // Handle CORS preflight
  if (context.request.method === 'OPTIONS') {
    return handleOptions();
  }

  // Use machine auth middleware
  return withMachineAuth(context.request, context.env, handleInventoryIngest);
};

async function handleInventoryIngest(req: AuthenticatedRequest, env: Env): Promise<Response> {
  try {
    // Validate schema
    let inventoryItems;
    try {
      inventoryItems = validateInventoryItems(req.parsedBody);
    } catch (error) {
      if (error instanceof ValidationError) {
        return addSecurityHeaders(jsonResponse({
          error: 'invalid_payload',
          reason: error.message,
          field: error.field
        }, 422));
      }
      throw error;
    }

    if (inventoryItems.length === 0) {
      return addSecurityHeaders(jsonResponse({
        error: 'invalid_payload',
        reason: 'No inventory items found in payload'
      }, 422));
    }

    // Prepare database operations
    const stmt = env.DB.prepare(`
      INSERT OR REPLACE INTO inventory_items 
      (id, name, category, unit, current_qty, min_qty, reorder_link, last_updated, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    const batch = inventoryItems.map(item => 
      stmt.bind(
        item.id,
        item.name,
        item.category,
        item.unit,
        item.current_qty,
        item.min_qty,
        item.reorder_link || null,
        item.last_updated,
        now,
        now
      )
    );

    // Execute batch insert
    await env.DB.batch(batch);

    // Check for low inventory items
    const lowInventoryItems = inventoryItems.filter(item => 
      item.current_qty <= item.min_qty
    );

    // Log successful ingestion
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      requestId: req.requestId,
      event: 'inventory_ingested',
      count: inventoryItems.length,
      low_inventory: lowInventoryItems.length,
      low_items: lowInventoryItems.map(item => ({ id: item.id, name: item.name, current_qty: item.current_qty, min_qty: item.min_qty }))
    }));

    const response = jsonResponse({
      ok: true,
      ingested: inventoryItems.length,
      low_inventory: lowInventoryItems.length,
      ...(lowInventoryItems.length > 0 && {
        low_items: lowInventoryItems.map(item => ({
          id: item.id,
          name: item.name,
          current_qty: item.current_qty,
          min_qty: item.min_qty
        }))
      })
    });

    return addSecurityHeaders(response);

  } catch (error: any) {
    console.error('Inventory ingest error:', error);
    
    const response = jsonResponse({
      error: 'server_error',
      requestId: req.requestId
    }, 500);

    return addSecurityHeaders(response);
  }
}