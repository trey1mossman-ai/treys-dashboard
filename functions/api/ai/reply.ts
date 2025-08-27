import { corsHeaders } from '../../_utils/cors';

export interface Env {
  OPENAI_API_KEY: string;
}

export async function onRequestPost(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { request, env } = context;
  
  try {
    const { emailId, from, to, subject, body, userMessage } = await request.json();
    
    if (!emailId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email ID is required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Log the request for n8n processing
    console.log('Email reply request:', {
      emailId,
      from,
      userMessage: userMessage?.substring(0, 50) + '...'
    });
    
    // Generate a response using OpenAI if available
    if (env.OPENAI_API_KEY && userMessage) {
      const systemPrompt = `You are an AI assistant helping to draft email replies. 
      Generate a professional and contextually appropriate reply based on the user's instructions.
      Keep responses professional, clear, and concise.
      Match the tone the user requests.`;
      
      const userPrompt = `Original Email:
      From: ${from}
      To: ${to || 'me'}
      Subject: ${subject}
      Body: ${body || 'No body content'}
      
      User's Reply Instructions: ${userMessage}
      
      Generate a professional email reply based on the user's instructions above.`;
      
      const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 400
        })
      });
      
      if (openAIResponse.ok) {
        const aiData = await openAIResponse.json();
        const suggestedReply = aiData.choices[0].message.content;
        
        return new Response(JSON.stringify({
          success: true,
          emailId,
          suggestedReply,
          userMessage,
          message: 'Reply generated successfully'
        }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
    }
    
    // If OpenAI is not configured or no user message, return simple confirmation
    return new Response(JSON.stringify({
      success: true,
      emailId,
      userMessage,
      message: userMessage ? 'Reply request received' : 'Please provide a message for the reply'
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
    
  } catch (error: any) {
    console.error('Reply endpoint error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to process reply request'
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