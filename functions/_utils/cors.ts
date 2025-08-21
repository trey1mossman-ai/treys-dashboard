export function corsHeaders(env: any): HeadersInit {
  const origin = env.VITE_PUBLIC_ORIGIN || 'http://localhost:5173';
  
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export function handleOptions(env: any): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(env)
  });
}