import { json } from '../../_utils/json';

export interface Env {
  ENABLE_REALTIME: string;
  OPENAI_API_KEY: string;
  OPENAI_BASE_URL: string;
}

// Create ephemeral token for OpenAI Realtime
export async function onRequestPost(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { env } = context;

  // Check if realtime is enabled
  if (env.ENABLE_REALTIME !== 'true') {
    return json({ 
      error: 'Realtime voice is not enabled' 
    }, 403);
  }

  try {
    // Create ephemeral session with OpenAI
    const response = await fetch(`${env.OPENAI_BASE_URL}/realtime/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime',
        voice: 'nova', // or 'alloy', 'echo', 'fable', 'onyx', 'shimmer'
        instructions: 'You are a helpful AI assistant integrated into a life management dashboard. Be concise and proactive.',
        temperature: 0.7,
        max_output_tokens: 1000,
        tools: [
          {
            type: 'function',
            function: {
              name: 'create_task',
              description: 'Create a new task',
              parameters: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  priority: { type: 'string', enum: ['high', 'medium', 'low'] }
                },
                required: ['title']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'get_agenda',
              description: 'Get today\'s agenda',
              parameters: {
                type: 'object',
                properties: {}
              }
            }
          }
        ]
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI Realtime API error: ${error}`);
    }

    const data = await response.json();

    // Return ephemeral token and config to client
    return json({
      success: true,
      token: data.token,
      expires: data.expires,
      model: data.model,
      voice: data.voice,
      tools: data.tools,
      // WebRTC config if needed
      webrtc: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      }
    });

  } catch (error: any) {
    console.error('Realtime session error:', error);
    return json({ 
      error: error.message || 'Failed to create realtime session' 
    }, 500);
  }
}