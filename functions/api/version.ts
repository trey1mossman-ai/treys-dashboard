import { jsonResponse, handleOptions } from './_utils/cors';

interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  // Handle CORS preflight
  if (context.request.method === 'OPTIONS') {
    return handleOptions();
  }

  try {
    // Try to get commit info from build environment
    let commit = 'unknown';
    let builtAt = new Date().toISOString();
    
    // In production, these would be injected at build time
    // For now, return placeholder values
    
    const response = {
      commit,
      built_at: builtAt
    };
    
    return jsonResponse(response);
    
  } catch (error: any) {
    console.error('Version check error:', error);
    return jsonResponse({
      commit: 'unknown',
      built_at: new Date().toISOString()
    });
  }
};