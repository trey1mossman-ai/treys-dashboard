/**
 * Get Today's Workout
 * Required: KV namespace binding TRAINER_KV
 */

export const onRequestOptions: PagesFunction = async (ctx) => {
  const origin = ctx.request.headers.get("Origin") || ctx.env.VITE_PUBLIC_ORIGIN || "*"
  const { preflight } = await import("../../_utils/cors")
  return preflight(origin)
}

export const onRequestGet: PagesFunction<{
  TRAINER_KV: KVNamespace
  VITE_PUBLIC_ORIGIN?: string
}> = async (ctx) => {
  const origin = ctx.request.headers.get("Origin") || ctx.env.VITE_PUBLIC_ORIGIN || "*"
  const { cors } = await import("../../_utils/cors")
  
  try {
    const url = new URL(ctx.request.url)
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0]
    
    // Get workout plan from KV
    const key = `plan:${date}`
    const planData = await ctx.env.TRAINER_KV.get(key)
    
    if (planData) {
      return cors(
        new Response(planData, {
          headers: { 'Content-Type': 'application/json' }
        }),
        origin
      )
    }
    
    // Return empty plan if not found
    return cors(
      new Response(JSON.stringify({ 
        date,
        title: '',
        blocks: [] 
      }), {
        headers: { 'Content-Type': 'application/json' }
      }),
      origin
    )
  } catch (error) {
    console.error('[trainer-today] error:', error)
    return cors(
      new Response(JSON.stringify({ error: 'Failed to fetch workout' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }),
      origin
    )
  }
}