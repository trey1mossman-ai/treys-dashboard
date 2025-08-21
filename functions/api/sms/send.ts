// /functions/cloudflare/api/sms/send.ts
export const onRequestOptions: PagesFunction = async (ctx) => {
  const origin = ctx.request.headers.get("Origin") || "*";
  const { preflight } = await import("../../_utils/cors");
  return preflight(origin);
};

export const onRequestPost: PagesFunction<{ 
  TWILIO_ACCOUNT_SID?: string; 
  TWILIO_AUTH_TOKEN?: string; 
  TWILIO_FROM?: string;
}> = async (ctx) => {
  const origin = ctx.request.headers.get("Origin") || "*";
  const { cors } = await import("../../_utils/cors");
  
  try {
    const body = await ctx.request.json().catch(() => ({}));
    console.log("[sms-send] payload", body);
    
    const { to, body: message, from } = body;
    
    // TODO: Implement actual SMS sending logic
    // Example for Twilio:
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
            To: to,
            From: from || ctx.env.TWILIO_FROM || '',
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
        message: "SMS sent successfully (stub)"
      }), { 
        headers: { "Content-Type": "application/json" } 
      }), 
      origin
    );
  } catch (error) {
    console.error("[sms-send] error:", error);
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