import type { EventContext } from "@cloudflare/workers-types";

interface Env {
  DB: D1Database;
}

interface CreateNoteRequest {
  body: string;
  tag?: string;
}

export const onRequest: PagesFunction<Env> = async (context: EventContext<Env, "", {}>) => {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  if (context.request.method !== 'POST') {
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
    const body: CreateNoteRequest = await context.request.json();

    // Validate required fields
    if (!body.body || body.body.trim() === '') {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Note body is required' 
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const id = crypto.randomUUID();

    await DB.prepare(
      `INSERT INTO notes (id, body, tag, status)
       VALUES (?, ?, ?, 'active')`
    ).bind(id, body.body.trim(), body.tag || null).run();

    return new Response(JSON.stringify({ 
      ok: true, 
      id,
      note: {
        id,
        body: body.body.trim(),
        tag: body.tag,
        status: 'active',
        created_at: new Date().toISOString()
      }
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error creating note:', error);
    return new Response(JSON.stringify({ 
      ok: false, 
      error: 'Failed to create note' 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};