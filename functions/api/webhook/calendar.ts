import { json } from '../../_utils/json';
import { corsHeaders, handleOptions } from '../../_utils/cors';

export interface Env {
  CACHE: KVNamespace;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  attendees?: string[];
  isAllDay?: boolean;
  color?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
}

export async function onRequestPost(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { request, env } = context;

  try {
    let body = await request.json();
    console.log('Calendar webhook received:', JSON.stringify(body));
    
    // Handle various n8n formats
    let events = null;
    
    // If body is already the events array
    if (Array.isArray(body)) {
      events = body;
    }
    // If body.events exists
    else if (body.events) {
      events = body.events;
      // If events is a string, parse it
      if (typeof events === 'string') {
        try {
          const parsed = JSON.parse(events);
          events = parsed.events || parsed;
        } catch (e) {
          console.log('Could not parse events string');
        }
      }
    }
    // If body has a property with empty key containing stringified data
    else if (body['']) {
      console.log('Found n8n empty key format');
      try {
        const parsed = JSON.parse(body['']);
        events = parsed.events || parsed;
      } catch (e) {
        console.log('Could not parse empty key data:', e);
      }
    }
    // If body has other common keys
    else if (body.data) {
      events = body.data;
    }
    // If body is the event object itself
    else if (body.id && body.start) {
      events = [body];
    }
    
    // Ensure events is an array
    if (!Array.isArray(events)) {
      events = events ? [events] : [];
    }
    
    // Normalize event fields (n8n uses 'summary' instead of 'title')
    events = events.map((event: any) => ({
      ...event,
      title: event.title || event.summary || 'Untitled Event',
      summary: event.summary || event.title
    }))
    
    // Store with timestamp
    const calendarData = {
      events: events,
      timestamp: new Date().toISOString(),
      source: 'n8n'
    };
    
    // Store in KV (expires in 1 hour)
    await env.CACHE.put('calendar-events', JSON.stringify(calendarData), {
      expirationTtl: 3600
    });
    
    console.log(`Stored ${calendarData.events.length} calendar events from n8n`);
    
    return json({
      success: true,
      message: `Received ${calendarData.events.length} events`,
      count: calendarData.events.length
    });
    
  } catch (error: any) {
    console.error('Calendar webhook error:', error);
    return json({
      success: false,
      error: error.message
    }, 500);
  }
}

export async function onRequestGet(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { env } = context;
  
  try {
    // Retrieve calendar events from KV
    const calendarData = await env.CACHE.get('calendar-events');
    
    if (!calendarData) {
      return new Response(JSON.stringify({
        events: [],
        message: 'No calendar events available'
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    return new Response(calendarData, {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
    
  } catch (error: any) {
    console.error('Error retrieving calendar events:', error);
    return new Response(JSON.stringify({
      events: [],
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

export async function onRequestOptions(context: { request: Request; env: Env }) {
  return handleOptions(context.env);
}