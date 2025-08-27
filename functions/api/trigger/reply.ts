import { corsHeaders } from '../../_utils/cors';

export async function onRequestPost(context: {
  request: Request;
  env: any;
}): Promise<Response> {
  const { request } = context;
  
  try {
    // Get the reply data from the request
    const data = await request.json();
    
    // Forward to n8n webhook
    const webhookUrl = 'https://flow.voxemarketing.com/webhook/c0552eb4-8ed7-4a46-b141-492ba7fefd04/chat';
    
    // Ensure we're sending the exact format n8n expects
    const webhookPayload = {
      sessionId: data.sessionId,
      action: data.action,
      chatInput: data.chatInput
    };
    
    console.log('Triggering n8n webhook with payload:', webhookPayload);
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(webhookPayload)
    });
    
    let result;
    const contentType = webhookResponse.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      result = await webhookResponse.json();
    } else {
      const text = await webhookResponse.text();
      result = { 
        success: webhookResponse.ok, 
        status: webhookResponse.status,
        message: text || 'Webhook triggered'
      };
    }
    
    console.log('n8n webhook response:', result);
    
    return new Response(JSON.stringify({
      success: true,
      webhookResponse: result,
      message: 'Reply sent to n8n workflow'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
    
  } catch (error: any) {
    console.error('Error triggering reply webhook:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to trigger webhook'
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