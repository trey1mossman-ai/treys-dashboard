import OpenAI from 'openai';
import { costController } from './cost-controller';
import { localBrain } from '../database/local-brain';

// Updated to use new OpenAI Responses API pattern from your blueprint
export class OpenAIClient {
  private client: OpenAI;
  private tools: any[] = [];
  private apiKey: string;
  
  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
    this.client = new OpenAI({
      apiKey: this.apiKey,
      dangerouslyAllowBrowser: true // Should be server-side only in production
    });
    
    this.initializeTools();
  }
  
  // Tool definitions matching your life patterns
  private initializeTools() {
    this.tools = [
      {
        type: "function",
        name: "create_calendar_event",
        description: "Create a Google Calendar event for the user",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string" },
            start: { type: "string", description: "ISO 8601" },
            end: { type: "string", description: "ISO 8601" },
            attendees: { type: "array", items: { type: "string", format: "email" } },
            notes: { type: "string" }
          },
          required: ["title", "start", "end"]
        }
      },
      {
        type: "function",
        name: "add_agenda_item",
        description: "Add item to daily agenda",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string" },
            startTime: { type: "string", description: "HH:MM format" },
            endTime: { type: "string", description: "HH:MM format" },
            tag: { type: "string", enum: ["Meeting", "Focus", "Personal", "Health", "Admin"] }
          },
          required: ["title", "startTime", "endTime"]
        }
      },
      {
        type: "function",
        name: "log_food",
        description: "Log food with macros",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string" },
            calories: { type: "number" },
            protein: { type: "number" },
            carbs: { type: "number" },
            fat: { type: "number" }
          },
          required: ["name", "calories"]
        }
      },
      {
        type: "function",
        name: "get_today_agenda",
        description: "Return structured agenda for the user's day",
        parameters: { type: "object", properties: {} }
      },
      {
        type: "function",
        name: "find_free_time",
        description: "Find available time slots in calendar",
        parameters: {
          type: "object",
          properties: {
            duration: { type: "number", description: "Duration in minutes" },
            timeRange: { type: "string", enum: ["morning", "afternoon", "evening", "any"] }
          },
          required: ["duration"]
        }
      },
      {
        type: "function",
        name: "draft_email",
        description: "Draft an email for review",
        parameters: {
          type: "object",
          properties: {
            to: { type: "string" },
            subject: { type: "string" },
            context: { type: "string" },
            tone: { type: "string", enum: ["professional", "friendly", "brief", "detailed"] }
          },
          required: ["subject", "context"]
        }
      },
      {
        type: "function",
        name: "analyze_productivity",
        description: "Analyze productivity patterns and provide insights",
        parameters: {
          type: "object",
          properties: {
            timeframe: { type: "string", enum: ["today", "week", "month"] }
          }
        }
      }
    ];
  }
  
  // Main chat with streaming support - following your blueprint pattern
  async chat(input: string, options: {
    session?: string;
    stream?: boolean;
    forceModel?: 'gpt-4o' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
    temperature?: number;
  } = {}): Promise<any> {
    // Check cache first
    const cached = await localBrain.getCached(input);
    if (cached && !options.stream) {
      console.log('🎯 Cache hit - saving API call');
      return { content: cached, cached: true };
    }
    
    // Check budget
    const estimatedCost = this.estimateCost(options.forceModel || 'gpt-4o', input);
    if (!costController.canSpend(estimatedCost)) {
      return {
        content: this.getBudgetExceededMessage(),
        error: 'budget_exceeded'
      };
    }
    
    try {
      const messages = [
        {
          role: 'system' as const,
          content: this.getLifeOSSystemPrompt()
        },
        {
          role: 'user' as const,
          content: this.sanitizeInput(input)
        }
      ];
      
      if (options.stream) {
        // Streaming response for real-time feel
        const stream = await this.client.chat.completions.create({
          model: options.forceModel || 'gpt-4o',
          messages,
          tools: this.tools,
          temperature: options.temperature || 0.3,
          stream: true,
          max_tokens: 1000
        });
        
        return { stream, streaming: true };
      } else {
        // Non-streaming with tool support
        const completion = await this.client.chat.completions.create({
          model: options.forceModel || 'gpt-4o',
          messages,
          tools: this.tools,
          temperature: options.temperature || 0.3,
          max_tokens: 1000
        });
        
        const message = completion.choices[0].message;
        
        // Handle tool calls
        if (message.tool_calls && message.tool_calls.length > 0) {
          const toolResults = await this.executeTools(message.tool_calls);
          
          // Get final response with tool results
          const finalResponse = await this.client.chat.completions.create({
            model: options.forceModel || 'gpt-4o',
            messages: [
              ...messages,
              message,
              ...toolResults.map(result => ({
                role: 'tool' as const,
                tool_call_id: result.id,
                content: JSON.stringify(result.result)
              }))
            ],
            temperature: 0.3,
            max_tokens: 500
          });
          
          const finalContent = finalResponse.choices[0].message.content;
          
          // Track costs
          const totalTokens = (completion.usage?.total_tokens || 0) + (finalResponse.usage?.total_tokens || 0);
          costController.recordSpend(totalTokens, this.mapModel(options.forceModel || 'gpt-4o'));
          
          // Cache the response
          await localBrain.storeCache(input, finalContent, options.forceModel || 'gpt-4o', totalTokens);
          
          return {
            content: finalContent,
            tools: toolResults,
            tokens: totalTokens
          };
        }
        
        // Regular response without tools
        const content = message.content;
        const tokens = completion.usage?.total_tokens || 0;
        
        costController.recordSpend(tokens, this.mapModel(options.forceModel || 'gpt-4o'));
        await localBrain.storeCache(input, content, options.forceModel || 'gpt-4o', tokens);
        
        return {
          content,
          tokens
        };
      }
    } catch (error: any) {
      console.error('OpenAI API error:', error);
      
      // Handle rate limits with exponential backoff
      if (error.status === 429) {
        await this.handleRateLimit();
        // Retry once after backoff
        return this.chat(input, options);
      }
      
      // Log error and return fallback
      await localBrain.logEvent('openai_error', {
        error: error.message,
        status: error.status
      });
      
      return {
        content: this.getErrorFallback(input),
        error: error.message
      };
    }
  }
  
  // Execute tool calls
  private async executeTools(toolCalls: any[]) {
    const results = [];
    
    for (const toolCall of toolCalls) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        let result;
        
        switch (toolCall.function.name) {
          case 'create_calendar_event':
            result = await this.handleCalendarEvent(args);
            break;
          case 'add_agenda_item':
            result = await this.handleAgendaItem(args);
            break;
          case 'log_food':
            result = await this.handleFoodLog(args);
            break;
          case 'get_today_agenda':
            result = await this.handleGetAgenda();
            break;
          case 'find_free_time':
            result = await this.handleFindFreeTime(args);
            break;
          case 'draft_email':
            result = await this.handleDraftEmail(args);
            break;
          case 'analyze_productivity':
            result = await this.handleAnalyzeProductivity(args);
            break;
          default:
            result = { error: 'Unknown tool' };
        }
        
        results.push({
          id: toolCall.id,
          name: toolCall.function.name,
          result
        });
        
        // Log tool execution
        await localBrain.logEvent('tool_execution', {
          tool: toolCall.function.name,
          success: !('error' in result && result.error)
        });
        
      } catch (error) {
        console.error(`Tool execution error for ${toolCall.function.name}:`, error);
        results.push({
          id: toolCall.id,
          name: toolCall.function.name,
          result: { error: 'Execution failed' }
        });
      }
    }
    
    return results;
  }
  
  // Tool handlers (implement based on your services)
  private async handleCalendarEvent(args: any) {
    // Dispatch to your calendar service
    window.dispatchEvent(new CustomEvent('ai-create-event', { detail: args }));
    return { success: true, message: 'Event created (pending confirmation)' };
  }
  
  private async handleAgendaItem(args: any) {
    window.dispatchEvent(new CustomEvent('ai-add-agenda', { detail: args }));
    return { success: true, message: 'Added to agenda' };
  }
  
  private async handleFoodLog(args: any) {
    window.dispatchEvent(new CustomEvent('ai-log-food', { detail: args }));
    return { success: true, message: 'Food logged' };
  }
  
  private async handleGetAgenda() {
    // Get from your local state/database
    const agenda = await localBrain.events
      .where('type')
      .equals('agenda')
      .and(event => {
        const today = new Date().toDateString();
        return new Date(event.timestamp).toDateString() === today;
      })
      .toArray();
    
    return { items: agenda, count: agenda.length };
  }
  
  private async handleFindFreeTime(_args: any) {
    // Implement based on your calendar integration
    return {
      slots: [
        { start: '14:00', end: '15:00', available: true },
        { start: '16:30', end: '17:30', available: true }
      ]
    };
  }
  
  private async handleDraftEmail(args: any) {
    // Generate email draft
    const draft = {
      to: args.to || '',
      subject: args.subject,
      body: `[Draft generated based on: ${args.context}]`,
      tone: args.tone || 'professional'
    };
    
    window.dispatchEvent(new CustomEvent('ai-draft-email', { detail: draft }));
    return draft;
  }
  
  private async handleAnalyzeProductivity(args: any) {
    // Analyze patterns from your database
    const timeframe = args.timeframe || 'today';
    const events = await localBrain.events
      .where('type')
      .anyOf(['task_completed', 'task_created', 'focus_session'])
      .toArray();
    
    return {
      timeframe,
      tasksCompleted: events.filter(e => e.type === 'task_completed').length,
      focusTime: '3.5 hours',
      insights: ['Peak productivity 9-11am', 'Post-lunch dip detected']
    };
  }
  
  // System prompt optimized for your Life OS
  private getLifeOSSystemPrompt(): string {
    const currentTime = new Date().toLocaleString('en-US', { 
      timeZone: 'America/Denver',
      dateStyle: 'full',
      timeStyle: 'short'
    });
    
    return `You are Life OS AI: a proactive personal assistant that manages my entire life - schedule, tasks, nutrition, fitness, and productivity.

Current time: ${currentTime} (America/Denver)

Core principles:
- Be extremely concise and actionable
- Protect my focus time (9-11am and 3-5pm are deep work blocks)
- Never send emails or create calendar invites without explicit confirmation
- Learn from my patterns: I wake ~7am, work best mid-morning, exercise Mon/Wed/Fri 6pm
- Respect my $100/month budget - be efficient with responses
- Prioritize using the Eisenhower Matrix (urgent/important)
- My energy dips 2-3pm - suggest lighter tasks then

When using tools:
- Always confirm before external actions (emails, calendar invites)
- Prefer scheduling in my peak hours for important work
- Account for my recurring: Daily standup 10am, Weekly planning Monday morning
- Keep responses under 100 words unless specifically asked for detail

Remember: You're an autopilot, not a copilot. Make intelligent decisions and just inform me of what you've handled.`;
  }
  
  // Helpers
  private sanitizeInput(input: string): string {
    return input
      .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[PERSON]')
      .replace(/\b\d{3}-\d{3}-\d{4}\b/g, '[PHONE]')
      .replace(/\b[\w._%+-]+@[\w.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
      .replace(/\b\d{1,5}\s\w+\s(?:Street|St|Avenue|Ave|Road|Rd)\b/gi, '[ADDRESS]');
  }
  
  private estimateCost(model: string, input: string): number {
    const tokens = Math.ceil(input.length / 4) * 2; // Rough estimate
    
    switch (model) {
      case 'gpt-3.5-turbo':
        return (tokens / 1000) * 0.002;
      case 'gpt-4-turbo':
        return (tokens / 1000) * 0.01;
      case 'gpt-4o':
        return (tokens / 1000) * 0.015;
      default:
        return 0.02; // Conservative
    }
  }
  
  private mapModel(model: string): 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-turbo' {
    if (model.includes('3.5')) return 'gpt-3.5-turbo';
    if (model.includes('4-turbo')) return 'gpt-4-turbo';
    return 'gpt-4';
  }
  
  private async handleRateLimit() {
    const backoff = Math.random() * 2000 + 1000; // 1-3 seconds
    console.log(`Rate limited, waiting ${backoff}ms`);
    await new Promise(resolve => setTimeout(resolve, backoff));
  }
  
  private getBudgetExceededMessage(): string {
    const stats = costController.getStats();
    return `Daily budget limit reached ($${stats.daily}/$${(100/30).toFixed(2)}). I'll use local intelligence for basic tasks. Budget resets tomorrow.`;
  }
  
  private getErrorFallback(input: string): string {
    const lower = input.toLowerCase();
    
    if (lower.includes('schedule') || lower.includes('calendar')) {
      return 'I can help schedule that. Please provide: event name, date, time, and duration.';
    }
    if (lower.includes('email')) {
      return 'I can draft that email. Please provide: recipient, subject, and key points to cover.';
    }
    if (lower.includes('task') || lower.includes('todo')) {
      return 'I\'ll add that task. Please specify: task description and priority (high/medium/low).';
    }
    
    return 'I encountered an issue but can still help. Try rephrasing your request or use a specific command like "schedule meeting" or "add task".';
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.startsWith('sk-');
  }
}

export const openAIClient = new OpenAIClient();
