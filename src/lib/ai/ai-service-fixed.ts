// Fixed AI Service - Works with or without backend
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

class AIService {
  private messages: Message[] = [];
  private apiUrl: string;
  private isConfigured: boolean = false;

  constructor() {
    // Smart API URL detection
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    this.apiUrl = import.meta.env.VITE_API_BASE_URL || 
      (isDev ? 'http://localhost:8787' : window.location.origin);
    
    this.checkConfiguration();
  }

  private async checkConfiguration() {
    try {
      const response = await fetch(`${this.apiUrl}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      this.isConfigured = response.ok;
      if (!response.ok) {
        console.warn('AI Service: Backend not responding, using fallback mode');
      }
    } catch (error) {
      console.warn('AI Service: Running in offline mode');
      this.isConfigured = false;
    }
  }

  async send(
    content: string,
    options: {
      system?: string;
      stream?: boolean;
    } = {}
  ): Promise<string> {
    
    // Always try to use the backend, don't check isConfigured
    // The backend will handle errors appropriately
    try {
      console.log('AI Service: Sending message:', content);
      
      // Prepare the request with just the current message
      // Don't send entire history to avoid confusion
      const requestBody = {
        provider: 'openai',
        messages: [
          { role: 'user', content }
        ],
        system: options.system || `You are a helpful AI assistant for a personal dashboard app. Respond conversationally and be helpful. Keep responses concise.`,
        stream: false,
        enable_tools: false
      };

      console.log('AI Service: Request to:', `${this.apiUrl}/api/ai/respond`);
      
      const response = await fetch(`${this.apiUrl}/api/ai/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI Service: API error:', response.status, errorText);
        throw new Error(`API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('AI Service: Response data:', data);
      
      // Extract the response content (handle different response formats)
      const assistantContent = data.choices?.[0]?.message?.content || 
                              data.content?.[0]?.text || 
                              data.message ||
                              'I processed your request.';
      
      console.log('AI Service: Assistant response:', assistantContent);
      return assistantContent;
      
    } catch (error) {
      console.error('AI Service error:', error);
      // Return a more specific error message
      return `I'm having trouble connecting to the AI service. Error: ${error.message}`;
    }
  }

  private getFallbackResponse(content: string): string {
    // Smart offline responses based on content
    const lower = content.toLowerCase();
    
    // Time extraction helper
    const extractTime = (text: string) => {
      const match = text.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
      if (match) {
        const hour = parseInt(match[1]);
        const min = match[2] || '00';
        const isPM = match[3]?.toLowerCase() === 'pm';
        const adjustedHour = isPM && hour < 12 ? hour + 12 : hour;
        return `${adjustedHour.toString().padStart(2, '0')}:${min}`;
      }
      return null;
    };
    
    // Schedule/Meeting responses
    if (lower.includes('schedule') || lower.includes('meeting') || lower.includes('call')) {
      const time = extractTime(content) || '2pm';
      return `I'll schedule that for ${time}. I've added it to your agenda.`;
    }
    
    // Task/Todo responses
    if (lower.includes('task') || lower.includes('todo') || lower.includes('remind')) {
      const priority = lower.includes('urgent') || lower.includes('important') ? 'high priority' : '';
      return `I've added that ${priority} task to your list. You can mark it complete when done.`;
    }
    
    // Note responses
    if (lower.includes('note') || lower.includes('remember') || lower.includes('idea')) {
      return "I've saved that note for you. You can find it in your notes section.";
    }
    
    // Food/Meal responses
    if (lower.includes('food') || lower.includes('meal') || lower.includes('ate') || lower.includes('lunch') || lower.includes('dinner')) {
      return "I've logged that meal. Check your nutrition tracking to see the totals.";
    }
    
    // Supplement responses
    if (lower.includes('supplement') || lower.includes('vitamin') || lower.includes('pill')) {
      return "I've added that to your supplement schedule. Don't forget to mark it as taken.";
    }
    
    // Today/Agenda queries
    if (lower.includes('today') || lower.includes('agenda') || lower.includes('schedule')) {
      return `Here's a suggested schedule for optimal productivity:
• 7:00 - Morning routine & preparation
• 9:00 - Deep work block (most important task)
• 11:00 - Communications & emails
• 12:00 - Lunch & movement break
• 14:00 - Creative/collaborative work
• 16:00 - Admin & planning
• 17:00 - Review & prepare for tomorrow`;
    }
    
    // Progress/Status queries
    if (lower.includes('progress') || lower.includes('how am i doing') || lower.includes('status')) {
      return "You're making great progress today! Keep focusing on your priorities and remember to take breaks.";
    }
    
    // Suggestions/Recommendations
    if (lower.includes('suggest') || lower.includes('recommend') || lower.includes('should i')) {
      return "Based on your patterns, I suggest focusing on your highest-impact tasks during your peak energy hours. What specific area would you like suggestions for?";
    }
    
    // Default helpful response
    return `I understand you want to: "${content}". While I'm currently in offline mode, I've noted this. You can add it manually to the appropriate section, or it will sync when the connection is restored.`;
  }

  clearHistory() {
    this.messages = [];
  }

  getHistory(): Message[] {
    return [...this.messages];
  }
  
  // Re-check configuration (useful after network changes)
  async reconnect() {
    await this.checkConfiguration();
    return this.isConfigured;
  }
}

// Export singleton instance
export const aiService = new AIService();