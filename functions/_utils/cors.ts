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

export function jsonResponse(data: any, status: number = 200, env?: any): Response {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Add CORS headers if env is provided
  if (env) {
    Object.assign(headers, corsHeaders(env));
  }

  return new Response(JSON.stringify(data), {
    status,
    headers
  });
}