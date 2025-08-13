// Example: Updated email send function to use n8n webhook
// /functions/cloudflare/api/email/send.ts

export const onRequestOptions: PagesFunction = async (ctx) => {
  const origin = ctx.request.headers.get("Origin") || "*";
  const { preflight } = await import("../../_utils/cors");
  return preflight(origin);
};

export const onRequestPost: PagesFunction<{
  N8N_BASE_URL?: string;
  N8N_WEBHOOK_TOKEN?: string;
}> = async (ctx) => {
  const origin = ctx.request.headers.get("Origin") || "*";
  const { cors } = await import("../../_utils/cors");
  
  try {
    const body = await ctx.request.json().catch(() => ({}));
    console.log("[email-send] forwarding to n8n webhook");
    
    // Get n8n URL from environment or use tunnel URL
    const n8nUrl = ctx.env.N8N_BASE_URL || "https://your-tunnel-url.trycloudflare.com";
    const webhookPath = "/webhook/email-send";
    
    // Forward request to n8n webhook
    const n8nResponse = await fetch(`${n8nUrl}${webhookPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ctx.env.N8N_WEBHOOK_TOKEN && {
          'Authorization': `Bearer ${ctx.env.N8N_WEBHOOK_TOKEN}`
        })
      },
      body: JSON.stringify(body)
    });
    
    if (!n8nResponse.ok) {
      console.error(`n8n webhook error: ${n8nResponse.status}`);
      throw new Error(`n8n webhook failed: ${n8nResponse.statusText}`);
    }
    
    const result = await n8nResponse.json();
    
    return cors(
      new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" }
      }),
      origin
    );
  } catch (error) {
    console.error("[email-send] error:", error);
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