import { readJSON } from '../../_utils/json';
import { handleOptions, jsonResponse } from '../../_utils/cors';

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export async function onRequestOptions(context: { env: Env }) {
  return handleOptions(context.env);
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;

  try {
    const body = await readJSON(request);
    console.log('Received project upload payload skeleton:', body);

    return jsonResponse({
      success: false,
      error: 'Upload handler not implemented yet',
      message: 'Connect Supabase storage and authentication before enabling project file uploads.'
    }, 501, env);
  } catch (error: any) {
    console.error('Upload endpoint error:', error);
    return jsonResponse({
      success: false,
      error: error.message || 'Failed to process upload request'
    }, 500, env);
  }
}
