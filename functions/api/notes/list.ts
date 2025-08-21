import type { EventContext } from "@cloudflare/workers-types";

interface Env {
  DB: D1Database;
}

interface Note {
  id: string;
  body: string;
  tag?: string;
  status: 'active' | 'archived' | 'deleted';
  created_at: string;
}

export const onRequest: PagesFunction<Env> = async (context: EventContext<Env, "", {}>) => {
  try {
    const { DB } = context.env;
    const url = new URL(context.request.url);
    const status = url.searchParams.get('status') || 'active';

    const result = await DB.prepare(
      `SELECT id, body, tag, status, created_at
       FROM notes
       WHERE status = ?
       ORDER BY created_at DESC
       LIMIT 100`
    ).bind(status).all<Note>();

    return new Response(JSON.stringify({ 
      ok: true, 
      notes: result.results 
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return new Response(JSON.stringify({ 
      ok: false, 
      error: 'Failed to fetch notes' 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};