import OpenAI from 'openai';
import { costController } from './cost-controller';
import { localBrain } from '../database/local-brain';

interface QueryOptions {
  forceModel?: 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-turbo';
  type?: string;
  context?: any;
  stream?: boolean;
}

interface LocalResult {
  response: any;
  confidence: number;
  source: 'pattern' | 'template' | 'rule';
}

class ModelRouter {
  private openai: OpenAI;
  // private complexityThreshold = 7; // Unused for now
  private templates: Map<string, string> = new Map();
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true
    });
    
    this.initializeTemplates();
  }
  
  private initializeTemplates(): void {
    // Common response templates for high-confidence local responses
    this.templates.set('schedule_meeting', 'I can help you schedule a meeting. Please provide the participants, preferred time, and duration.');
    this.templates.set('create_task', 'Task created successfully. I\'ve added it to your agenda.');
    this.templates.set('weather_check', 'I\'ll check the weather for you.');
    this.templates.set('reminder_set', 'Reminder set successfully.');
  }
  
  async query(prompt: string, options: QueryOptions = {}): Promise<any> {
    try {
      // 1. Check local intelligence first (FREE!)
      const localResult = await this.tryLocal(prompt, options.context);
      if (localResult.confidence > 0.8) {
        await localBrain.logEvent('local_response', { prompt: prompt.substring(0, 100), confidence: localResult.confidence });
        return localResult.response;
      }
      
      // 2. Check cache (FREE!)
      const cached = await localBrain.getCached(prompt);
      if (cached) {
        console.log('Cache hit! Saved API call');
        await localBrain.logEvent('cache_hit', { prompt: prompt.substring(0, 100) });
        return cached;
      }
      
      // 3. Assess complexity for model selection
      const complexity = this.assessComplexity(prompt);
      
      // 4. Route to appropriate model based on complexity and budget
      let response;
      let model: 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-turbo';
      
      if (options.forceModel) {
        model = options.forceModel;
        if (!costController.canSpend(this.estimateCost(model, prompt))) {
          return this.budgetExhaustedResponse(prompt);
        }
        response = await this.callModel(model, prompt, options);
      } else if (complexity < 3) {
        model = 'gpt-3.5-turbo';
        if (!costController.canSpend(this.estimateCost(model, prompt))) {
          return this.budgetExhaustedResponse(prompt);
        }
        response = await this.callModel(model, prompt, options);
      } else if (complexity < 7 && costController.canSpend(this.estimateCost('gpt-3.5-turbo', prompt))) {
        model = 'gpt-3.5-turbo';
        response = await this.callModel(model, prompt, options);
      } else if (costController.canSpend(this.estimateCost('gpt-4-turbo', prompt))) {
        model = 'gpt-4-turbo';
        response = await this.callModel(model, prompt, options);
      } else {
        // Budget exhausted - use local fallback
        return this.budgetExhaustedResponse(prompt);
      }
      
      return response;
      
    } catch (error) {
      console.error('Model router error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await localBrain.logEvent('router_error', { error: errorMessage, prompt: prompt.substring(0, 100) });
      return this.errorFallback(prompt, error);
    }
  }
  
  private async tryLocal(prompt: string, _context?: any): Promise<LocalResult> {
    const normalizedPrompt = prompt.toLowerCase().trim();
    
    // Rule-based responses for common patterns
    if (normalizedPrompt.includes('schedule') && normalizedPrompt.includes('meeting')) {
      return {
        response: this.templates.get('schedule_meeting'),
        confidence: 0.85,
        source: 'template'
      };
    }
    
    if (normalizedPrompt.includes('create') && (normalizedPrompt.includes('task') || normalizedPrompt.includes('todo'))) {
      return {
        response: this.templates.get('create_task'),
        confidence: 0.85,
        source: 'template'
      };
    }
    
    if (normalizedPrompt.includes('weather')) {
      return {
        response: this.templates.get('weather_check'),
        confidence: 0.9,
        source: 'template'
      };
    }
    
    if (normalizedPrompt.includes('remind')) {
      return {
        response: this.templates.get('reminder_set'),
        confidence: 0.85,
        source: 'template'
      };
    }
    
    // Time-based responses
    const hour = new Date().getHours();
    if (normalizedPrompt.includes('good morning') && hour < 12) {
      return {
        response: 'Good morning! Ready to tackle the day? Let me help you plan your priorities.',
        confidence: 0.95,
        source: 'rule'
      };
    }
    
    // Pattern-based responses from stored patterns
    const patterns = await localBrain.patterns.where('confidence').above(0.8).toArray();
    for (const pattern of patterns) {
      if (normalizedPrompt.includes(pattern.type)) {
        return {
          response: `Based on your patterns, ${pattern.description}`,
          confidence: pattern.confidence,
          source: 'pattern'
        };
      }
    }
    
    return {
      response: null,
      confidence: 0,
      source: 'template'
    };
  }
  
  private assessComplexity(prompt: string): number {
    let score = 0;
    const normalizedPrompt = prompt.toLowerCase();
    
    // Length complexity
    if (prompt.length > 500) score += 2;
    if (prompt.length > 1000) score += 2;
    
    // Content complexity indicators
    if (normalizedPrompt.includes('analyze')) score += 3;
    if (normalizedPrompt.includes('strategy')) score += 3;
    if (normalizedPrompt.includes('compare')) score += 2;
    if (normalizedPrompt.includes('explain')) score += 2;
    if (normalizedPrompt.includes('plan')) score += 2;
    if (normalizedPrompt.includes('review')) score += 2;
    if (normalizedPrompt.includes('decision')) score += 3;
    
    // Simple task indicators (reduce complexity)
    if (normalizedPrompt.includes('schedule')) score -= 1;
    if (normalizedPrompt.includes('remind')) score -= 2;
    if (normalizedPrompt.includes('create task')) score -= 2;
    if (normalizedPrompt.includes('add to')) score -= 1;
    
    // Multiple questions or requirements
    const questionCount = (prompt.match(/\?/g) || []).length;
    score += questionCount;
    
    return Math.max(0, Math.min(10, score));
  }
  
  private estimateCost(model: 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-turbo', prompt: string): number {
    // Rough token estimation (1 token ≈ 4 characters)
    const estimatedTokens = Math.ceil(prompt.length / 4) * 2; // Input + output estimate
    
    switch (model) {
      case 'gpt-3.5-turbo':
        return (estimatedTokens / 1000) * 0.002;
      case 'gpt-4':
        return (estimatedTokens / 1000) * 0.03;
      case 'gpt-4-turbo':
        return (estimatedTokens / 1000) * 0.01;
      default:
        return 0.01; // Conservative estimate
    }
  }
  
  private async callModel(model: 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-turbo', prompt: string, options: QueryOptions): Promise<any> {
    const completion = await this.openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: this.getSystemPrompt(options.type) },
        { role: 'user', content: this.sanitizePrompt(prompt) }
      ],
      temperature: options.type === 'creative' ? 0.7 : 0.3,
      max_tokens: this.getMaxTokens(model),
      stream: false // Force non-streaming for now
    });
    
    const tokens = completion.usage?.total_tokens || 0;
    costController.recordSpend(tokens, model);
    
    const response = completion.choices[0]?.message?.content;
    
    // Cache the response
    await localBrain.storeCache(prompt, response, model, tokens);
    
    // Log successful API call
    await localBrain.logEvent('api_call', { 
      model, 
      tokens, 
      cost: this.estimateCost(model, prompt),
      complexity: this.assessComplexity(prompt)
    });
    
    return response;
  }
  
  private getSystemPrompt(type?: string): string {
    const basePrompt = `You are an intelligent personal assistant focused on productivity and life management. 
Be concise, actionable, and helpful. Prioritize efficiency and clarity in your responses.
Current time: ${new Date().toLocaleString()}`;
    
    switch (type) {
      case 'email_reply':
        return `${basePrompt}\nYou are helping draft email replies. Be professional and concise.`;
      case 'scheduling':
        return `${basePrompt}\nYou are helping with calendar and scheduling tasks. Consider time zones and conflicts.`;
      case 'planning':
        return `${basePrompt}\nYou are helping with strategic planning and decision making. Provide structured, actionable advice.`;
      case 'creative':
        return `${basePrompt}\nYou are helping with creative tasks. Be more expansive and innovative in your responses.`;
      default:
        return basePrompt;
    }
  }
  
  private getMaxTokens(model: string): number {
    switch (model) {
      case 'gpt-4':
      case 'gpt-4-turbo':
        return 1000; // More generous for complex tasks
      case 'gpt-3.5-turbo':
      default:
        return 500; // Conservative for cost control
    }
  }
  
  private sanitizePrompt(prompt: string): string {
    // Strip PII before sending to OpenAI
    return prompt
      .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[PERSON]')
      .replace(/\b\d{3}-\d{3}-\d{4}\b/g, '[PHONE]')
      .replace(/\b[\w._%+-]+@[\w.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
      .replace(/\b\d{1,5}\s\w+\s(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd)\b/gi, '[ADDRESS]')
      .replace(/\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g, '[CARD]');
  }
  
  private budgetExhaustedResponse(_prompt: string): string {
    const stats = costController.getStats();
    return `Budget limit reached for today ($${stats.daily} spent). Using local intelligence: 
    
Based on your request, I suggest focusing on your current priorities. Your budget resets tomorrow, or you can continue with local assistance for basic tasks like scheduling and reminders.`;
  }
  
  private errorFallback(_prompt: string, _error: any): string {
    return `I encountered an issue processing your request. Here's what I can suggest based on the type of request:
    
For scheduling: Try using specific times and dates
For tasks: Break them down into smaller, actionable items
For planning: Focus on your immediate priorities
    
Error details have been logged for improvement.`;
  }
  
  async getUsageStats() {
    const cacheStats = await localBrain.getCacheStats();
    const costStats = costController.getStats();
    
    return {
      cache: cacheStats,
      cost: costStats,
      summary: `Cache hit rate: ${(cacheStats.hitRate * 100).toFixed(1)}%, Daily cost: $${costStats.daily}`
    };
  }
}

export const modelRouter = new ModelRouter();
export type { QueryOptions, LocalResult };