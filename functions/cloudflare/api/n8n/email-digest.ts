/**
 * n8n Email Digest Proxy
 * Required env: N8N_BASE_URL, N8N_TOKEN, VITE_PUBLIC_ORIGIN
 */

export const onRequestOptions: PagesFunction = async (ctx) => {
  const origin = ctx.request.headers.get("Origin") || ctx.env.VITE_PUBLIC_ORIGIN || "*"
  const { preflight } = await import("../../_utils/cors")
  return preflight(origin)
}

export const onRequestPost: PagesFunction<{
  N8N_BASE_URL: string
  N8N_TOKEN: string
  VITE_PUBLIC_ORIGIN?: string
}> = async (ctx) => {
  const origin = ctx.request.headers.get("Origin") || ctx.env.VITE_PUBLIC_ORIGIN || "*"
  const { cors } = await import("../../_utils/cors")
  
  try {
    const body = await ctx.request.json()
    const { limit = 15 } = body
    
    // Forward to n8n webhook
    const response = await fetch(`${ctx.env.N8N_BASE_URL}/webhook/email-digest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ctx.env.N8N_TOKEN}`
      },
      body: JSON.stringify({ limit })
    })
    
    if (!response.ok) {
      throw new Error(`n8n returned ${response.status}`)
    }
    
    const data = await response.json()
    
    // Mock data for testing
    const mockEmails = Array.from({ length: limit }, (_, i) => ({
      id: `email-${i}`,
      from: `sender${i}@example.com`,
      subject: `Email subject ${i + 1}`,
      time: new Date(Date.now() - i * 3600000).toISOString(),
      snippet: `This is a preview of email ${i + 1}...`
    }))
    
    return cors(
      new Response(JSON.stringify({
        emails: data.emails || mockEmails
      }), {
        headers: { 'Content-Type': 'application/json' }
      }),
      origin
    )
  } catch (error) {
    console.error('[email-digest] error:', error)
    return cors(
      new Response(JSON.stringify({
        error: 'Failed to fetch email digest'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }),
      origin
    )
  }
}