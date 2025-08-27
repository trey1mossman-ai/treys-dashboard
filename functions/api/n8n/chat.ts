import { json } from '../../_utils/json';
import { corsHeaders, handleOptions } from '../../_utils/cors';

export interface Env {
  N8N_WEBHOOK_URL?: string;
}

export async function onRequestPost(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return handleOptions(env);
  }

  try {
    const body = await request.json();
    
    // Forward to n8n webhook
    const n8nUrl = env.N8N_WEBHOOK_URL || 'https://flow.voxemarketing.com/webhook/c0552eb4-8ed7-4a46-b141-492ba7fefd04/chat';
    
    const message = body.message || body.text || body.content || 'Hello';
    const sessionId = body.sessionId || `session-${Date.now()}`;
    
    console.log('Forwarding to n8n:', { message, sessionId });
    
    // Use the exact format that n8n chat expects
    const n8nResponse = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Instance-Id': 'f6b1f380d6070a265f467a8145e40e52b3fb87f670816b85cc5882aca58cd88c'
      },
      body: JSON.stringify({
        sessionId: sessionId,
        chatInput: message  // Changed from 'message' to 'chatInput'
      })
    });

    const responseText = await n8nResponse.text();
    console.log('n8n response:', n8nResponse.status, responseText);
    
    // Try to parse as JSON, otherwise return as text
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { message: responseText };
    }
    
    // Handle error responses from n8n
    if (!n8nResponse.ok) {
      console.error('n8n webhook error:', n8nResponse.status, responseData);
      
      // Return success: true but with the response data so frontend can handle it
      // This matches what was working before
      return json({
        success: true,
        message: responseData?.output || responseData?.message || responseData?.response || 'I encountered an issue processing that request.',
        data: responseData
      });
    }
    
    // Format response for frontend - n8n returns {output: "response text"}
    return json({
      success: true,
      message: responseData.output || responseData.message || responseData.response || responseData.text || JSON.stringify(responseData),
      data: responseData
    });
    
  } catch (error: any) {
    console.error('n8n proxy error:', error);
    return json({
      success: false,
      message: 'I\'m currently unavailable. Please try again later.',
      error: error.message
    }, 200); // Return 200 to avoid frontend errors
  }
}

export async function onRequestOptions(context: { request: Request; env: Env }) {
  return handleOptions(context.env);
}