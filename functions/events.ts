// Server-Sent Events endpoint for live dashboard updates
import { handleOptions } from './_utils/cors';

interface Env {
  CACHE: KVNamespace;
  EVENTS_ENABLED?: string;
  EVENTS_KEEPALIVE_MS?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  // Handle CORS preflight
  if (context.request.method === 'OPTIONS') {
    return handleOptions();
  }

  // Only allow GET for SSE
  if (context.request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Check if events are enabled
  const eventsEnabled = context.env.EVENTS_ENABLED !== 'false';
  if (!eventsEnabled) {
    return new Response('Events disabled', { status: 503 });
  }

  // SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET',
  });

  // Create readable stream for SSE
  const keepaliveMs = parseInt(context.env.EVENTS_KEEPALIVE_MS || '15000');
  
  let controller: ReadableStreamDefaultController<Uint8Array>;
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(streamController) {
      controller = streamController;
      
      // Send initial connection event
      const connectEvent = `data: ${JSON.stringify({
        type: 'connected',
        timestamp: new Date().toISOString()
      })}\n\n`;
      controller.enqueue(encoder.encode(connectEvent));
    },
    
    cancel() {
      // Cleanup when client disconnects
      console.log('SSE client disconnected');
    }
  });

  // Set up keepalive and event polling
  const eventStream = async () => {
    const keepaliveInterval = setInterval(() => {
      try {
        const keepalive = `data: ${JSON.stringify({
          type: 'keepalive',
          timestamp: new Date().toISOString()
        })}\n\n`;
        controller.enqueue(encoder.encode(keepalive));
      } catch (error) {
        console.error('SSE keepalive error:', error);
        clearInterval(keepaliveInterval);
      }
    }, keepaliveMs);

    // Poll for events every 5 seconds
    const eventInterval = setInterval(async () => {
      try {
        await checkAndSendEvents(controller, encoder, context.env);
      } catch (error) {
        console.error('SSE event polling error:', error);
        clearInterval(eventInterval);
        clearInterval(keepaliveInterval);
      }
    }, 5000);

    // Cleanup after 5 minutes to prevent long-running connections
    setTimeout(() => {
      clearInterval(keepaliveInterval);
      clearInterval(eventInterval);
      controller.close();
    }, 5 * 60 * 1000);
  };

  // Start the event streaming
  eventStream();

  return new Response(stream, { headers });
};

async function checkAndSendEvents(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  env: Env
) {
  try {
    // Check for pending events in cache
    const pendingEvents = await env.CACHE.get('sse:pending_events');
    
    if (pendingEvents) {
      const events = JSON.parse(pendingEvents);
      
      for (const event of events) {
        const eventData = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(eventData));
      }
      
      // Clear sent events
      await env.CACHE.delete('sse:pending_events');
    }
    
  } catch (error) {
    console.error('Error checking for SSE events:', error);
  }
}

// Helper function to queue events for SSE (called from other endpoints)
export async function queueSSEEvent(env: { CACHE: KVNamespace }, event: any) {
  try {
    const existingEvents = await env.CACHE.get('sse:pending_events');
    const events = existingEvents ? JSON.parse(existingEvents) : [];
    
    events.push({
      ...event,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 10 events to prevent memory issues
    const recentEvents = events.slice(-10);
    
    await env.CACHE.put('sse:pending_events', JSON.stringify(recentEvents), {
      expirationTtl: 300 // 5 minutes
    });
  } catch (error) {
    console.error('Error queuing SSE event:', error);
  }
}