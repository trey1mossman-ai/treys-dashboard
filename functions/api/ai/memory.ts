// AI Memory Management for short-term conversation context
import { jsonResponse, handleOptions } from '../../_utils/cors';

interface Env {
  AI_MEMORY: KVNamespace;
  CACHE: KVNamespace;
}

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface ConversationContext {
  sessionId: string;
  messages: ConversationMessage[];
  lastActivity: string;
  metadata: {
    userId?: string;
    source: 'schedule' | 'general' | 'task';
    scheduledItems?: Array<{
      id: string;
      title: string;
      startTime: string;
      endTime?: string;
      status: 'created' | 'pending' | 'completed';
    }>;
  };
}

const MEMORY_TTL = 7200; // 2 hours
const MAX_MESSAGES = 20; // Keep last 20 messages for context

// Store conversation context
export async function storeConversation(
  env: Env,
  sessionId: string,
  message: ConversationMessage,
  metadata?: Record<string, any>
): Promise<void> {
  const key = `conversation:${sessionId}`;
  
  try {
    // Get existing conversation
    const existing = await env.AI_MEMORY.get(key, 'json') as ConversationContext | null;
    
    const context: ConversationContext = {
      sessionId,
      messages: existing?.messages || [],
      lastActivity: new Date().toISOString(),
      metadata: {
        ...existing?.metadata,
        ...metadata,
        source: metadata?.source || existing?.metadata?.source || 'general'
      }
    };
    
    // Add new message
    context.messages.push(message);
    
    // Keep only recent messages to prevent memory bloat
    if (context.messages.length > MAX_MESSAGES) {
      context.messages = context.messages.slice(-MAX_MESSAGES);
    }
    
    // Store updated context
    await env.AI_MEMORY.put(key, JSON.stringify(context), {
      expirationTtl: MEMORY_TTL
    });
    
  } catch (error) {
    console.error('Failed to store conversation:', error);
    // Don't throw - memory is nice-to-have, not critical
  }
}

// Retrieve conversation context
export async function getConversationContext(
  env: Env,
  sessionId: string
): Promise<ConversationContext | null> {
  const key = `conversation:${sessionId}`;
  
  try {
    const context = await env.AI_MEMORY.get(key, 'json') as ConversationContext | null;
    
    if (context) {
      // Update last activity
      context.lastActivity = new Date().toISOString();
      await env.AI_MEMORY.put(key, JSON.stringify(context), {
        expirationTtl: MEMORY_TTL
      });
    }
    
    return context;
  } catch (error) {
    console.error('Failed to get conversation context:', error);
    return null;
  }
}

// Add scheduled item to conversation context
export async function addScheduledItem(
  env: Env,
  sessionId: string,
  item: {
    id: string;
    title: string;
    startTime: string;
    endTime?: string;
    status?: 'created' | 'pending' | 'completed';
  }
): Promise<void> {
  const key = `conversation:${sessionId}`;
  
  try {
    const context = await env.AI_MEMORY.get(key, 'json') as ConversationContext | null;
    
    if (context) {
      if (!context.metadata.scheduledItems) {
        context.metadata.scheduledItems = [];
      }
      
      // Add or update the scheduled item
      const existingIndex = context.metadata.scheduledItems.findIndex(i => i.id === item.id);
      if (existingIndex >= 0) {
        context.metadata.scheduledItems[existingIndex] = {
          ...context.metadata.scheduledItems[existingIndex],
          ...item
        };
      } else {
        context.metadata.scheduledItems.push({
          status: 'created',
          ...item
        });
      }
      
      context.lastActivity = new Date().toISOString();
      
      await env.AI_MEMORY.put(key, JSON.stringify(context), {
        expirationTtl: MEMORY_TTL
      });
    }
  } catch (error) {
    console.error('Failed to add scheduled item to context:', error);
  }
}

// Generate system prompt with conversation context
export function generateContextualSystemPrompt(
  context: ConversationContext | null,
  currentScheduleItems: any[] = [],
  userTimezone: string = 'America/Los_Angeles'
): string {
  const now = new Date();
  
  // Use provided timezone or default to PST
  const timezone = userTimezone || 'America/Los_Angeles';
  
  // Get local time in user's timezone
  const localTime = now.toLocaleString('en-US', { 
    timeZone: timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  
  // Get date parts in user's timezone
  const localDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const localYear = localDate.getFullYear();
  const localMonth = String(localDate.getMonth() + 1).padStart(2, '0');
  const localDay = String(localDate.getDate()).padStart(2, '0');
  const localHour24 = localDate.getHours();
  const localMinute = String(localDate.getMinutes()).padStart(2, '0');
  
  // Calculate 12-hour format
  const localHour12 = localHour24 > 12 ? localHour24 - 12 : localHour24 === 0 ? 12 : localHour24;
  const ampm = localHour24 >= 12 ? 'PM' : 'AM';
  
  let systemPrompt = `You are a helpful AI assistant specialized in schedule and task management.

CRITICAL TIMING INFORMATION - USER'S LOCAL TIME:
User's Timezone: ${timezone}
Current Local Time: ${localTime}
Today's Local Date: ${localYear}-${localMonth}-${localDay}
Current Time (24h): ${localHour24}:${localMinute}
Current Time (12h): ${localHour12}:${localMinute} ${ampm}
UTC Reference: ${now.toISOString()}

IMPORTANT: You are operating in ${timezone} timezone. All times should be interpreted in this timezone!

You can help users:
- Create schedule items with specific dates and times
- View and manage their calendar
- Set reminders and tasks
- Organize their daily activities
- Remember previous conversations and context

IMPORTANT: When user says "schedule X at Y time":
- If they say "at 2pm" or "at 14:00" TODAY, use today's date
- If they say "tomorrow at 2pm", add 1 day to today's date
- Always create proper ISO datetime strings
- Default duration is 1 hour unless specified

Current schedule items for today: ${JSON.stringify(currentScheduleItems)}
`;

  if (context) {
    // Add conversation context
    systemPrompt += `\nConversation Context:`;
    systemPrompt += `\nSession started: ${context.messages[0]?.timestamp || 'recently'}`;
    systemPrompt += `\nLast activity: ${context.lastActivity}`;
    
    if (context.metadata.scheduledItems && context.metadata.scheduledItems.length > 0) {
      systemPrompt += `\nItems scheduled in this conversation:`;
      context.metadata.scheduledItems.forEach(item => {
        systemPrompt += `\n- ${item.title} at ${item.startTime} (${item.status})`;
      });
    }
    
    // Add recent conversation for context (last 5 messages)
    const recentMessages = context.messages.slice(-5);
    if (recentMessages.length > 0) {
      systemPrompt += `\nRecent conversation:`;
      recentMessages.forEach(msg => {
        if (msg.role !== 'system') {
          systemPrompt += `\n${msg.role}: ${msg.content.slice(0, 100)}${msg.content.length > 100 ? '...' : ''}`;
        }
      });
    }
  }
  
  systemPrompt += `\nIf the user wants to create schedule items, respond with a JSON action:

For a SINGLE event:
{
  "action": "create_schedule",
  "scheduleData": {
    "title": "Event title",
    "startTime": "ISO datetime string",
    "endTime": "ISO datetime string", 
    "description": "Optional description"
  },
  "response": "Confirmation message to user"
}

For MULTIPLE events:
{
  "action": "create_multiple_schedules",
  "scheduleItems": [
    {
      "title": "First event",
      "startTime": "ISO datetime string",
      "endTime": "ISO datetime string",
      "description": "Optional"
    },
    {
      "title": "Second event",
      "startTime": "ISO datetime string",
      "endTime": "ISO datetime string",
      "description": "Optional"
    }
  ],
  "response": "Created X events: [list them]"
}

IMPORTANT: When creating times, ensure they are in the user's timezone (${timezone}).
Example: If user says "meeting at 2pm", create timestamp for 2pm ${timezone}, not UTC.

Otherwise, respond normally with helpful information, keeping the conversation context in mind.`;

  return systemPrompt;
}

// API endpoints
export async function onRequestPost(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  if (context.request.method === 'OPTIONS') {
    return handleOptions();
  }

  const { sessionId, action, ...data } = await context.request.json();
  
  if (!sessionId) {
    return jsonResponse({ error: 'sessionId required' }, 400);
  }

  try {
    switch (action) {
      case 'get_context':
        const context_data = await getConversationContext(context.env, sessionId);
        return jsonResponse({ context: context_data });
        
      case 'store_message':
        await storeConversation(context.env, sessionId, data.message, data.metadata);
        return jsonResponse({ success: true });
        
      case 'add_scheduled_item':
        await addScheduledItem(context.env, sessionId, data.item);
        return jsonResponse({ success: true });
        
      default:
        return jsonResponse({ error: 'invalid action' }, 400);
    }
  } catch (error: any) {
    console.error('Memory API error:', error);
    return jsonResponse({ error: 'server_error', message: error.message }, 500);
  }
}

export async function onRequestOptions() {
  return handleOptions();
}