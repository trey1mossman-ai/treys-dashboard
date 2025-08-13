import { corsHeaders, handleOptions } from '../../_utils/cors';
import { json, readJSON } from '../../_utils/json';

export async function onRequestPost(context: any) {
  const { request, env } = context;
  
  if (request.method === 'OPTIONS') {
    return handleOptions(env);
  }

  try {
    const body = await readJSON(request);
    const { tool, args = {} } = body;

    if (!tool) {
      return json({ ok: false, error: 'Tool name required' }, 400);
    }

    // Route to appropriate internal endpoints based on tool
    let result;
    const baseUrl = env.VITE_API_BASE_URL || 'http://localhost:8788';

    switch (tool) {
      // Agenda tools
      case 'agenda.create':
      case 'agenda.update':
        result = await fetch(`${baseUrl}/api/agenda/upsert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args)
        });
        break;

      case 'agenda.delete':
        result = await fetch(`${baseUrl}/api/agenda/delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args)
        });
        break;

      case 'agenda.list':
        result = await fetch(`${baseUrl}/api/agenda/list?date=${args.date}`, {
          method: 'GET'
        });
        break;

      // Quick Actions tools
      case 'actions.create':
        result = await fetch(`${baseUrl}/api/automations/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args)
        });
        break;

      case 'actions.exec':
        result = await fetch(`${baseUrl}/api/automations/exec/${args.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload: args.payload })
        });
        break;

      case 'actions.list':
        result = await fetch(`${baseUrl}/api/automations/list`, {
          method: 'GET'
        });
        break;

      // Notes tools
      case 'notes.create':
        result = await fetch(`${baseUrl}/api/notes/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args)
        });
        break;

      case 'notes.archive':
        result = await fetch(`${baseUrl}/api/notes/archive`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args)
        });
        break;

      case 'notes.delete':
        result = await fetch(`${baseUrl}/api/notes/delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args)
        });
        break;

      case 'notes.position':
        result = await fetch(`${baseUrl}/api/notes/position`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args)
        });
        break;

      case 'notes.list':
        result = await fetch(`${baseUrl}/api/notes/list`, {
          method: 'GET'
        });
        break;

      // Trainer tools
      case 'trainer.upload':
        result = await fetch(`${baseUrl}/api/trainer/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args)
        });
        break;

      case 'trainer.get':
      case 'trainer.today':
        result = await fetch(`${baseUrl}/api/trainer/today?date=${args.date || ''}`, {
          method: 'GET'
        });
        break;

      case 'trainer.log':
        result = await fetch(`${baseUrl}/api/trainer/log`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args)
        });
        break;

      // Communications tools
      case 'comms.recent':
      case 'comms.email':
        result = await fetch(`${baseUrl}/api/n8n/recent-email?limit=${args.limit || 5}`, {
          method: 'GET'
        });
        break;

      case 'comms.sms':
        result = await fetch(`${baseUrl}/api/n8n/recent-sms?limit=${args.limit || 5}`, {
          method: 'GET'
        });
        break;

      case 'comms.whatsapp':
        result = await fetch(`${baseUrl}/api/n8n/recent-whatsapp?limit=${args.limit || 5}`, {
          method: 'GET'
        });
        break;

      // Tasks tools
      case 'tasks.create':
        result = await fetch(`${baseUrl}/api/tasks/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args)
        });
        break;

      case 'tasks.toggle':
        result = await fetch(`${baseUrl}/api/tasks/toggle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args)
        });
        break;

      case 'tasks.reorder':
        result = await fetch(`${baseUrl}/api/tasks/reorder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args)
        });
        break;

      // Summarize tools (placeholder for now)
      case 'summarize.day':
      case 'summarize.week':
        return json({ 
          ok: true, 
          result: {
            summary: `Summary for ${tool} with args: ${JSON.stringify(args)}`,
            placeholder: true
          }
        }, 200);

      // Analyze tools (placeholder for now)
      case 'analyze.trends':
        return json({ 
          ok: true, 
          result: {
            trends: 'Trend analysis placeholder',
            data: args,
            placeholder: true
          }
        }, 200);

      default:
        return json({ ok: false, error: `Unknown tool: ${tool}` }, 400);
    }

    // Get the response
    const data = await result.json();
    
    return json({ 
      ok: result.ok,
      result: data 
    }, result.status);
    
  } catch (error: any) {
    console.error('Tool router error:', error);
    return json({ ok: false, error: error.message }, 500);
  }
}

export const onRequest = onRequestPost;