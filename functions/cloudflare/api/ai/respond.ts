import { json, cors } from '../../_utils/cors';

export interface Env {
  PROVIDER: string;
  OPENAI_API_KEY: string;
  OPENAI_BASE_URL: string;
  OPENAI_MODEL: string;
  ANTHROPIC_API_KEY: string;
  ANTHROPIC_BASE_URL: string;
  ANTHROPIC_MODEL: string;
  AI_TOOLS: KVNamespace;
}

interface ChatRequest {
  provider?: 'openai' | 'anthropic';
  messages: Array<{ role: string; content: string }>;
  system?: string;
  stream?: boolean;
  user_id?: string;
  metadata?: Record<string, any>;
  enable_tools?: boolean;
}

// SSE helper for streaming responses
function createSSEResponse(readable: ReadableStream) {
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// OpenAI streaming handler
async function streamOpenAI(
  env: Env, 
  messages: any[], 
  system?: string, 
  enableTools?: boolean
): Promise<Response> {
  const response = await fetch(`${env.OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || 'gpt-4o',
      messages: system ? [{ role: 'system', content: system }, ...messages] : messages,
      stream: true,
      tools: enableTools ? await getTools(env) : undefined,
      tool_choice: enableTools ? 'auto' : undefined,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  // Transform OpenAI stream to SSE format
  const reader = response.body?.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      if (!reader) return;
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                break;
              }
              
              try {
                const parsed = JSON.parse(data);
                
                // Handle delta content
                if (parsed.choices?.[0]?.delta?.content) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    type: 'content',
                    content: parsed.choices[0].delta.content
                  })}\n\n`));
                }
                
                // Handle tool calls
                if (parsed.choices?.[0]?.delta?.tool_calls) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    type: 'tool_call',
                    tool_calls: parsed.choices[0].delta.tool_calls
                  })}\n\n`));
                }
              } catch (e) {
                // Skip malformed JSON
              }
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return createSSEResponse(stream);
}

// Anthropic streaming handler
async function streamAnthropic(
  env: Env,
  messages: any[],
  system?: string,
  enableTools?: boolean
): Promise<Response> {
  const response = await fetch(`${env.ANTHROPIC_BASE_URL}/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages,
      system,
      tools: enableTools ? await getAnthropicTools(env) : undefined,
      tool_choice: enableTools ? { type: 'auto' } : undefined,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.statusText}`);
  }

  // Transform Anthropic stream to SSE format
  const reader = response.body?.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      if (!reader) return;
      
      try {
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              try {
                const parsed = JSON.parse(data);
                
                // Handle different event types
                switch (parsed.type) {
                  case 'content_block_delta':
                    if (parsed.delta?.text) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        type: 'content',
                        content: parsed.delta.text
                      })}\n\n`));
                    }
                    break;
                  
                  case 'tool_use':
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      type: 'tool_use',
                      tool: {
                        id: parsed.id,
                        name: parsed.name,
                        input: parsed.input
                      }
                    })}\n\n`));
                    break;
                  
                  case 'message_stop':
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    break;
                }
              } catch (e) {
                // Skip malformed JSON
              }
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return createSSEResponse(stream);
}

// Get tools for OpenAI
async function getTools(env: Env) {
  // Fetch from KV or define inline
  const tools = [
    {
      type: 'function',
      function: {
        name: 'open_view',
        description: 'Change the dashboard panel view',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'View ID to open' }
          },
          required: ['id']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'create_task',
        description: 'Create a new task',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            when: { type: 'string', format: 'date-time' },
            project: { type: 'string' }
          },
          required: ['title']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'send_message',
        description: 'Send a message via SMS, email, or WhatsApp',
        parameters: {
          type: 'object',
          properties: {
            channel: { type: 'string', enum: ['sms', 'email', 'whatsapp'] },
            to: { type: 'string' },
            subject: { type: 'string' },
            body: { type: 'string' }
          },
          required: ['channel', 'to', 'body']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'trigger_workflow',
        description: 'Trigger an n8n workflow',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            payload: { type: 'object' }
          },
          required: ['name']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'fetch_knowledge',
        description: 'Search the knowledge base',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            top_k: { type: 'number', default: 5 }
          },
          required: ['query']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'update_agenda_block',
        description: 'Update an agenda item',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
            notes: { type: 'string' },
            time: { type: 'string' }
          },
          required: ['id']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'search_contacts',
        description: 'Search for contacts',
        parameters: {
          type: 'object',
          properties: {
            q: { type: 'string' }
          },
          required: ['q']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'open_url',
        description: 'Open an external URL',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', format: 'uri' }
          },
          required: ['url']
        }
      }
    }
  ];
  
  return tools;
}

// Convert tools to Anthropic format
async function getAnthropicTools(env: Env) {
  const openAITools = await getTools(env);
  
  return openAITools.map(tool => ({
    name: tool.function.name,
    description: tool.function.description,
    input_schema: tool.function.parameters
  }));
}

export async function onRequestPost(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return cors(request);
  }

  try {
    const body: ChatRequest = await request.json();
    const provider = body.provider || env.PROVIDER || 'openai';

    // Rate limiting check (simple implementation)
    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimitKey = `rate:${clientIp}:${new Date().toISOString().slice(0, 13)}`;
    const currentCount = await env.AI_TOOLS?.get(rateLimitKey);
    
    if (currentCount && parseInt(currentCount) > 100) {
      return json({ error: 'Rate limit exceeded' }, 429);
    }
    
    // Increment rate limit counter
    await env.AI_TOOLS?.put(rateLimitKey, String((parseInt(currentCount || '0') + 1)), {
      expirationTtl: 3600
    });

    // Stream response based on provider
    if (body.stream) {
      if (provider === 'anthropic') {
        return await streamAnthropic(env, body.messages, body.system, body.enable_tools);
      } else {
        return await streamOpenAI(env, body.messages, body.system, body.enable_tools);
      }
    }

    // Non-streaming response
    if (provider === 'anthropic') {
      const response = await fetch(`${env.ANTHROPIC_BASE_URL}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          messages: body.messages,
          system: body.system,
          tools: body.enable_tools ? await getAnthropicTools(env) : undefined,
          tool_choice: body.enable_tools ? { type: 'auto' } : undefined,
        }),
      });

      const data = await response.json();
      return json(data);
    } else {
      const response = await fetch(`${env.OPENAI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || 'gpt-4o',
          messages: body.system 
            ? [{ role: 'system', content: body.system }, ...body.messages] 
            : body.messages,
          tools: body.enable_tools ? await getTools(env) : undefined,
          tool_choice: body.enable_tools ? 'auto' : undefined,
        }),
      });

      const data = await response.json();
      return json(data);
    }
  } catch (error) {
    console.error('AI Proxy error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
}

export async function onRequestOptions(context: { request: Request }) {
  return cors(context.request);
}