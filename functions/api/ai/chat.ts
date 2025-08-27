import { corsHeaders } from '../../_utils/cors';
import { getConversationContext, storeConversation, generateContextualSystemPrompt, addScheduledItem } from './memory';

export interface Env {
  OPENAI_API_KEY: string;
  AI_MEMORY: KVNamespace;
  CACHE: KVNamespace;
  DB: D1Database;
}

export async function onRequestPost(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { request, env } = context;
  
  try {
    const { message, context: chatContext, scheduleItems, sessionId, timezone } = await request.json();
    
    // Generate or use provided session ID
    const currentSessionId = sessionId || crypto.randomUUID();
    
    if (!message) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Message is required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Get conversation context from memory
    const conversationContext = await getConversationContext(env, currentSessionId);
    
    // Store user message
    await storeConversation(env, currentSessionId, {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    }, { source: 'schedule' });
    
    // Generate contextual system prompt with user's timezone
    const systemPrompt = generateContextualSystemPrompt(conversationContext, scheduleItems || [], timezone);

    // Call OpenAI API
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
          // Include recent conversation context
          ...(conversationContext?.messages.slice(-3).filter(m => m.role !== 'system') || []),
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });
    
    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.text();
      console.error('OpenAI API error:', errorData);
      throw new Error('Failed to get AI response');
    }
    
    const aiData = await openAIResponse.json();
    const aiMessage = aiData.choices[0].message.content;
    
    // Store AI response in memory
    await storeConversation(env, currentSessionId, {
      role: 'assistant',
      content: aiMessage,
      timestamp: new Date().toISOString()
    });
    
    // Try to parse if it's a JSON response with action
    let response;
    try {
      response = JSON.parse(aiMessage);
      
      // If a single schedule item was created
      if (response.action === 'create_schedule' && response.scheduleData) {
        await addScheduledItem(env, currentSessionId, {
          id: crypto.randomUUID(),
          title: response.scheduleData.title,
          startTime: response.scheduleData.startTime,
          endTime: response.scheduleData.endTime,
          status: 'created'
        });
      }
      
      // If multiple schedule items were created
      if (response.action === 'create_multiple_schedules' && response.scheduleItems) {
        for (const item of response.scheduleItems) {
          await addScheduledItem(env, currentSessionId, {
            id: crypto.randomUUID(),
            title: item.title,
            startTime: item.startTime,
            endTime: item.endTime,
            status: 'created'
          });
        }
      }
    } catch {
      // Not JSON, just a regular text response
      response = {
        success: true,
        response: aiMessage
      };
    }
    
    return new Response(JSON.stringify({
      success: true,
      sessionId: currentSessionId,
      ...response
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
    
  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    
    // Fallback response if OpenAI fails
    return new Response(JSON.stringify({
      success: true,
      response: "I understand you want to manage your schedule. However, I'm having trouble connecting to my AI service right now. You can still manually add items to your schedule!"
    }), {
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