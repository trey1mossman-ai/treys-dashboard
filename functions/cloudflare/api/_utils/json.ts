import { corsHeaders } from './cors'

export function jsonResponse(
  data: any,
  status = 200,
  origin?: string
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin)
    }
  })
}

export function errorResponse(
  message: string,
  status = 400,
  origin?: string
): Response {
  return jsonResponse({ error: message }, status, origin)
}