// /functions/cloudflare/api/agent/relay.ts
export const onRequestOptions: PagesFunction = async (ctx) => {
  const origin = ctx.request.headers.get("Origin") || "*";
  const { preflight } = await import("../../_utils/cors");
  return preflight(origin);
};

export const onRequestPost: PagesFunction<{ 
  MODEL_API_URL?: string; 
  MODEL_API_KEY?: string;
  MODEL_PROVIDER?: string;
  MODEL_NAME?: string;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
}> = async (ctx) => {
  const origin = ctx.request.headers.get("Origin") || "*";
  const { cors } = await import("../../_utils/cors");
  
  try {
    const payload = await ctx.request.json().catch(() => ({}));
    console.log("[agent-relay] payload", payload);
    
    const { messages } = payload;
    
    // Check for API keys from environment or request headers
    const openaiKey = ctx.env.OPENAI_API_KEY || ctx.request.headers.get('X-OpenAI-Key');
    const anthropicKey = ctx.env.ANTHROPIC_API_KEY || ctx.request.headers.get('X-Anthropic-Key');
    const provider = ctx.env.MODEL_PROVIDER || ctx.request.headers.get('X-Model-Provider') || 'openai';
    const modelName = ctx.env.MODEL_NAME || ctx.request.headers.get('X-Model-Name');
    
    // Try OpenAI
    if ((provider === 'openai' || !provider) && openaiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName || 'gpt-3.5-turbo',
          messages,
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('[agent-relay] OpenAI error:', data);
        throw new Error(data.error?.message || `OpenAI error: ${response.status}`);
      }
      
      return cors(
        new Response(JSON.stringify({
          content: data.choices[0].message.content,
          role: 'assistant',
        }), {
          headers: { 'Content-Type': 'application/json' },
        }),
        origin
      );
    }
    
    // Try Anthropic
    if (provider === 'anthropic' && anthropicKey) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName || 'claude-3-haiku-20240307',
          messages,
          max_tokens: 1024,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('[agent-relay] Anthropic error:', data);
        throw new Error(data.error?.message || `Anthropic error: ${response.status}`);
      }
      
      return cors(
        new Response(JSON.stringify({
          content: data.content[0].text,
          role: 'assistant',
        }), {
          headers: { 'Content-Type': 'application/json' },
        }),
        origin
      );
    }
    
    // No API keys configured
    return cors(
      new Response(JSON.stringify({ 
        content: "Please configure your OpenAI or Anthropic API key in Settings to enable AI chat.",
        role: "assistant"
      }), { 
        headers: { "Content-Type": "application/json" } 
      }), 
      origin
    );
  } catch (error) {
    console.error("[agent-relay] error:", error);
    return cors(
      new Response(JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Internal server error" 
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json" } 
      }), 
      origin
    );
  }
};