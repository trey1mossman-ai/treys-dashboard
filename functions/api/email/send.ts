// /functions/cloudflare/api/email/send.ts
export const onRequestOptions: PagesFunction = async (ctx) => {
  const origin = ctx.request.headers.get("Origin") || "*";
  const { preflight } = await import("../../_utils/cors");
  return preflight(origin);
};

export const onRequestPost: PagesFunction<{ 
  SENDGRID_API_KEY?: string; 
  RESEND_API_KEY?: string;
  EMAIL_PROVIDER?: string;
  DEFAULT_FROM_EMAIL?: string;
}> = async (ctx) => {
  const origin = ctx.request.headers.get("Origin") || "*";
  const { cors } = await import("../../_utils/cors");
  
  try {
    const body = await ctx.request.json().catch(() => ({}));
    console.log("[email-send] payload", body);
    
    const { to, subject, text, html, from } = body;
    
    // TODO: Implement actual email sending logic
    // Example for SendGrid:
    /*
    if (ctx.env.EMAIL_PROVIDER === 'sendgrid' && ctx.env.SENDGRID_API_KEY) {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ctx.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: from || ctx.env.DEFAULT_FROM_EMAIL },
          subject,
          content: [
            { type: 'text/plain', value: text },
            ...(html ? [{ type: 'text/html', value: html }] : []),
          ],
        }),
      });
      
      if (!response.ok) {
        throw new Error(`SendGrid error: ${response.status}`);
      }
    }
    */
    
    return cors(
      new Response(JSON.stringify({ 
        success: true,
        message: "Email sent successfully (stub)"
      }), { 
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