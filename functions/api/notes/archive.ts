import type { EventContext } from "@cloudflare/workers-types";

interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context: EventContext<Env, "", {}>) => {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  if (context.request.method !== 'PUT') {
    return new Response(JSON.stringify({ 
      ok: false, 
      error: 'Method not allowed' 
    }), {
      status: 405,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  try {
    const { DB } = context.env;
    const body = await context.request.json();

    if (!body.id) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Missing required field: id' 
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const result = await DB.prepare(
      `UPDATE notes 
       SET status = 'archived'
       WHERE id = ? AND status = 'active'`
    ).bind(body.id).run();

    if (result.meta.changes === 0) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Note not found or already archived' 
      }), {
        status: 404,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    return new Response(JSON.stringify({ 
      ok: true,
      id: body.id
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error archiving note:', error);
    return new Response(JSON.stringify({ 
      ok: false, 
      error: 'Failed to archive note' 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};