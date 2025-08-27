import { corsHeaders } from '../../_utils/cors';

export async function onRequestGet(context: { request: Request; env: any }) {
  try {
    // Trigger the n8n webhook from server-side (no CORS issues)
    const webhookUrl = 'https://flow.voxemarketing.com/webhook/f4fd2f67-df3b-4ee2-b426-944e51d01f28';
    
    console.log('Triggering calendar workflow webhook:', webhookUrl);
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'LifeOS Dashboard/1.0'
      }
    });
    
    let result = { triggered: true, message: 'Webhook triggered (no-cors)' };
    
    if (webhookResponse.ok) {
      try {
        const data = await webhookResponse.json();
        console.log('Webhook response:', data);
        result = { triggered: true, ...data };
      } catch (e) {
        // Response might not be JSON
        console.log('Webhook triggered successfully (non-JSON response)');
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      webhook: result,
      timestamp: new Date().toISOString()
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
    
  } catch (error: any) {
    console.error('Error triggering calendar webhook:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: corsHeaders
  });
}