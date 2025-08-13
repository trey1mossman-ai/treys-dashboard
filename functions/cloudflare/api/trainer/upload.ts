/**
 * Trainer Workout Upload
 * Required: KV namespace binding TRAINER_KV
 */

export const onRequestOptions: PagesFunction = async (ctx) => {
  const origin = ctx.request.headers.get("Origin") || ctx.env.VITE_PUBLIC_ORIGIN || "*"
  const { preflight } = await import("../../_utils/cors")
  return preflight(origin)
}

export const onRequestPost: PagesFunction<{
  TRAINER_KV: KVNamespace
  VITE_PUBLIC_ORIGIN?: string
}> = async (ctx) => {
  const origin = ctx.request.headers.get("Origin") || ctx.env.VITE_PUBLIC_ORIGIN || "*"
  const { cors } = await import("../../_utils/cors")
  
  try {
    const plan = await ctx.request.json()
    const { date, title, blocks } = plan
    
    if (!date || !title || !blocks) {
      return cors(
        new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }),
        origin
      )
    }
    
    // Store workout plan in KV
    const key = `plan:${date}`
    await ctx.env.TRAINER_KV.put(key, JSON.stringify(plan), {
      expirationTtl: 60 * 60 * 24 * 30 // 30 days
    })
    
    return cors(
      new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' }
      }),
      origin
    )
  } catch (error) {
    console.error('[trainer-upload] error:', error)
    return cors(
      new Response(JSON.stringify({ error: 'Failed to upload workout' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }),
      origin
    )
  }
}