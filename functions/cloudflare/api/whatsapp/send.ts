// /functions/cloudflare/api/whatsapp/send.ts
export const onRequestOptions: PagesFunction = async (ctx) => {
  const origin = ctx.request.headers.get("Origin") || "*";
  const { preflight } = await import("../../_utils/cors");
  return preflight(origin);
};

export const onRequestPost: PagesFunction<{
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_WHATSAPP_FROM?: string;
}> = async (ctx) => {
  const origin = ctx.request.headers.get("Origin") || "*";
  const { cors } = await import("../../_utils/cors");
  
  try {
    const body = await ctx.request.json().catch(() => ({}));
    console.log("[whatsapp-send] payload", body);
    
    const { to, body: message, from } = body;
    
    // TODO: Implement actual WhatsApp sending logic
    // Example for Twilio WhatsApp:
    /*
    if (ctx.env.TWILIO_ACCOUNT_SID && ctx.env.TWILIO_AUTH_TOKEN) {
      const credentials = btoa(`${ctx.env.TWILIO_ACCOUNT_SID}:${ctx.env.TWILIO_AUTH_TOKEN}`);
      
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${ctx.env.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: `whatsapp:${to}`,
            From: from || ctx.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886', // Twilio sandbox number
            Body: message,
          }),
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `Twilio error: ${response.status}`);
      }
      
      return cors(
        new Response(JSON.stringify({ 
          success: true,
          messageId: data.sid
        }), { 
          headers: { "Content-Type": "application/json" } 
        }), 
        origin
      );
    }
    */
    
    return cors(
      new Response(JSON.stringify({ 
        success: true,
        message: "WhatsApp message sent successfully (stub)"
      }), { 
        headers: { "Content-Type": "application/json" } 
      }), 
      origin
    );
  } catch (error) {
    console.error("[whatsapp-send] error:", error);
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