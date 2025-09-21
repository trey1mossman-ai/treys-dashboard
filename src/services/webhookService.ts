import { supabase } from './supabase';

// VERCEL API PROXY ENDPOINTS (NO CORS ISSUES!)
const WEBHOOKS = {
  // Email webhook - via Vercel proxy
  email: '/api/webhook/emails',

  // Calendar webhook - via Vercel proxy
  calendar: '/api/webhook/calendar',

  // AI Agent chat - via Vercel proxy
  agent: '/api/webhook/chat',
};

// Helper function for webhook calls with retry logic
async function callWebhook(url: string, options: RequestInit = {}, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Calling webhook: ${url}`);
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return text; // Return as text if not JSON
      }
    } catch (error) {
      console.error(`Webhook attempt ${i + 1} failed:`, error);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// Save webhook logs to Supabase
async function logWebhookCall(
  webhookType: string,
  url: string,
  method: string,
  responseStatus: number,
  responseBody: any,
  errorMessage?: string
) {
  try {
    // Only log if we have a user session
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('webhook_logs').insert({
        user_id: user.id,
        webhook_type: webhookType,
        request_url: url,
        request_method: method,
        response_status: responseStatus,
        response_body: responseBody,
        error_message: errorMessage,
        duration_ms: 0,
      });
    }
  } catch (error) {
    console.error('Failed to log webhook call:', error);
  }
}

export const webhookService = {
  // Fetch emails via n8n webhook
  async fetchEmails() {
    try {
      console.log('📧 Fetching emails from n8n...');
      
      // Call the n8n webhook directly
      const response = await callWebhook(WEBHOOKS.email, { 
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      console.log('Email response:', response);
      
      // Handle different response formats from n8n
      let emails = [];
      if (Array.isArray(response)) {
        emails = response;
      } else if (response.emails && Array.isArray(response.emails)) {
        emails = response.emails;
      } else if (response.data && Array.isArray(response.data)) {
        emails = response.data;
      } else if (response.items && Array.isArray(response.items)) {
        emails = response.items;
      }
      
      // Transform email data to our format
      const formattedEmails = emails.map((email: any) => ({
        id: email.id || email.messageId || email.message_id || `email-${Date.now()}-${Math.random()}`,
        from: email.from || email.sender || email.from_email || 'Unknown',
        subject: email.subject || 'No Subject',
        snippet: email.snippet || email.preview || (email.body ? email.body.substring(0, 100) : ''),
        body: email.body || email.body_plain || email.content || '',
        date: email.date || email.received || email.received_at || new Date().toISOString(),
        labels: email.labels || email.tags || [],
        isRead: email.isRead || email.is_read || false,
        isStarred: email.isStarred || email.is_starred || false,
      }));
      
      // Save to Supabase if we have user auth
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && formattedEmails.length > 0) {
          const { error } = await supabase
            .from('emails')
            .upsert(formattedEmails.map(email => ({
              id: email.id,
              user_id: user.id,
              from_email: email.from,
              subject: email.subject,
              snippet: email.snippet,
              body_plain: email.body,
              labels: email.labels,
              is_read: email.isRead,
              is_starred: email.isStarred,
              received_at: new Date(email.date).toISOString(),
            })), { 
              onConflict: 'id',
              ignoreDuplicates: false 
            });
            
          if (error) console.error('Failed to save emails to Supabase:', error);
        }
      } catch (error) {
        console.log('Supabase auth not configured yet, skipping save');
      }
      
      await logWebhookCall('email_fetch', WEBHOOKS.email, 'GET', 200, formattedEmails);
      console.log(`✅ Fetched ${formattedEmails.length} emails`);
      return formattedEmails;
      
    } catch (error) {
      console.error('❌ Email fetch failed:', error);
      await logWebhookCall('email_fetch', WEBHOOKS.email, 'GET', 500, null, error.message);
      
      // Return cached data if available
      try {
        const cached = await this.getCachedEmails();
        if (cached && cached.length > 0) {
          console.log('📧 Returning cached emails');
          return cached;
        }
      } catch (cacheError) {
        console.error('Cache retrieval failed:', cacheError);
      }
      
      throw error;
    }
  },

  // Fetch calendar events via n8n webhook
  async fetchCalendarEvents() {
    try {
      console.log('📅 Fetching calendar events from n8n...');
      
      // Call the n8n webhook directly
      const response = await callWebhook(WEBHOOKS.calendar, { 
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      console.log('Calendar response:', response);
      
      // Handle different response formats from n8n
      let events = [];
      if (Array.isArray(response)) {
        events = response;
      } else if (response.events && Array.isArray(response.events)) {
        events = response.events;
      } else if (response.data && Array.isArray(response.data)) {
        events = response.data;
      } else if (response.items && Array.isArray(response.items)) {
        events = response.items;
      }
      
      // Transform calendar data to our format
      const formattedEvents = events.map((event: any) => ({
        id: event.id || event.eventId || event.event_id || `event-${Date.now()}-${Math.random()}`,
        title: event.summary || event.title || event.name || 'Untitled Event',
        description: event.description || '',
        start: event.start?.dateTime || event.start?.date || event.startTime || event.start_time || new Date().toISOString(),
        end: event.end?.dateTime || event.end?.date || event.endTime || event.end_time || new Date().toISOString(),
        location: event.location || '',
        attendees: event.attendees || [],
        reminders: event.reminders || [],
        status: event.status || 'confirmed',
        allDay: event.allDay || event.all_day || false,
      }));
      
      // Save to Supabase if we have user auth
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && formattedEvents.length > 0) {
          const { error } = await supabase
            .from('calendar_events')
            .upsert(formattedEvents.map(event => ({
              id: event.id,
              user_id: user.id,
              title: event.title,
              description: event.description,
              start_time: new Date(event.start).toISOString(),
              end_time: new Date(event.end).toISOString(),
              location: event.location,
              attendees: event.attendees,
              reminders: event.reminders,
              status: event.status,
              all_day: event.allDay,
            })), {
              onConflict: 'id',
              ignoreDuplicates: false
            });
            
          if (error) console.error('Failed to save calendar events to Supabase:', error);
        }
      } catch (error) {
        console.log('Supabase auth not configured yet, skipping save');
      }
      
      await logWebhookCall('calendar_fetch', WEBHOOKS.calendar, 'GET', 200, formattedEvents);
      console.log(`✅ Fetched ${formattedEvents.length} calendar events`);
      return formattedEvents;
      
    } catch (error) {
      console.error('❌ Calendar fetch failed:', error);
      await logWebhookCall('calendar_fetch', WEBHOOKS.calendar, 'GET', 500, null, error.message);
      
      // Return cached data if available
      try {
        const cached = await this.getCachedCalendarEvents();
        if (cached && cached.length > 0) {
          console.log('📅 Returning cached calendar events');
          return cached;
        }
      } catch (cacheError) {
        console.error('Cache retrieval failed:', cacheError);
      }
      
      throw error;
    }
  },

  // Send message to AI agent
  async sendToAgent(message: string, sessionId?: string) {
    try {
      console.log('🤖 Sending message to AI agent...');
      
      const payload = {
        sessionId: sessionId || `session-${Date.now()}`,
        action: 'sendMessage',
        chatInput: message,
      };
      
      const response = await callWebhook(WEBHOOKS.agent, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      
      console.log('Agent response:', response);
      
      // Save conversation to Supabase if we have user auth
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('ai_conversations').insert([
            {
              user_id: user.id,
              session_id: payload.sessionId,
              message: message,
              role: 'user',
            },
            {
              user_id: user.id,
              session_id: payload.sessionId,
              message: response.output || response.message || response.response || 'No response',
              role: 'assistant',
              metadata: response,
            },
          ]);
        }
      } catch (error) {
        console.log('Supabase auth not configured yet, skipping save');
      }
      
      await logWebhookCall('agent_chat', WEBHOOKS.agent, 'POST', 200, response);
      return response;
      
    } catch (error) {
      console.error('❌ Agent communication failed:', error);
      await logWebhookCall('agent_chat', WEBHOOKS.agent, 'POST', 500, null, error.message);
      throw error;
    }
  },

  // Refresh all data sources
  async refreshAll() {
    console.log('🔄 Refreshing all data sources...');
    
    const results = {
      emails: { success: false, data: null, error: null },
      calendar: { success: false, data: null, error: null },
    };

    // Fetch emails
    try {
      results.emails.data = await this.fetchEmails();
      results.emails.success = true;
    } catch (error) {
      results.emails.error = error.message;
      console.error('Email refresh failed:', error);
    }

    // Fetch calendar
    try {
      results.calendar.data = await this.fetchCalendarEvents();
      results.calendar.success = true;
    } catch (error) {
      results.calendar.error = error.message;
      console.error('Calendar refresh failed:', error);
    }

    console.log('Refresh results:', results);
    return results;
  },

  // Get cached data from Supabase
  async getCachedEmails() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .eq('user_id', user.id)
        .order('received_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get cached emails:', error);
      return [];
    }
  },

  async getCachedCalendarEvents() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get cached calendar events:', error);
      return [];
    }
  },

  // Test all webhooks
  async testWebhooks() {
    console.log('🧪 Testing all webhooks...');
    
    const results = {
      email: false,
      calendar: false,
      agent: false,
    };
    
    // Test email webhook
    try {
      const emails = await this.fetchEmails();
      results.email = emails && emails.length >= 0;
      console.log(`✅ Email webhook: ${results.email ? 'Working' : 'Failed'}`);
    } catch (error) {
      console.error('❌ Email webhook test failed:', error);
    }
    
    // Test calendar webhook
    try {
      const events = await this.fetchCalendarEvents();
      results.calendar = events && events.length >= 0;
      console.log(`✅ Calendar webhook: ${results.calendar ? 'Working' : 'Failed'}`);
    } catch (error) {
      console.error('❌ Calendar webhook test failed:', error);
    }
    
    // Test agent webhook
    try {
      const response = await this.sendToAgent('Test connection');
      results.agent = !!response;
      console.log(`✅ Agent webhook: ${results.agent ? 'Working' : 'Failed'}`);
    } catch (error) {
      console.error('❌ Agent webhook test failed:', error);
    }
    
    console.log('Test results:', results);
    return results;
  },
};