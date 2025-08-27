// Fixed Agent Bridge - Connects AI to dashboard actions
import { aiService } from '@/lib/ai/ai-service-fixed';

interface AgentCommand {
  action: string;
  data: any;
}

class AgentBridge {
  private isInitialized = false;

  initialize() {
    if (this.isInitialized) return;
    
    console.log('AgentBridge initialized');
    this.isInitialized = true;
  }

  async processNaturalCommand(command: string, options?: { sessionId?: string }) {
    try {
      console.log('Processing command:', command);
      
      // First try to parse locally
      const localParsed = this.parseCommandLocally(command);
      if (localParsed) {
        const result = await this.executeAction(localParsed.action, localParsed.data);
        return {
          success: true,
          message: this.getSuccessMessage(localParsed),
          results: [result]
        };
      }
      
      // If local parsing fails, try AI
      const systemPrompt = `You are a life OS assistant. Parse the user's command and respond with a helpful action.
      
Available actions:
- Schedule items: "I'll add that to your agenda"
- Add tasks: "I've added that task"  
- Take notes: "I've saved your note"
- Log food: "I've logged that meal"

Keep responses brief and actionable.`;

      // Try calling the new AI chat endpoint with memory
      try {
        // Get user's timezone
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        const chatResponse = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: command,
            sessionId: options?.sessionId,
            scheduleItems: [], // Could populate with current schedule
            timezone: userTimezone
          })
        });
        
        if (chatResponse.ok) {
          const chatData = await chatResponse.json();
          if (chatData.success) {
            // If the AI returned a schedule action, execute it
            if (chatData.action === 'create_schedule' && chatData.scheduleData) {
              const scheduleResult = await this.executeAction('add_schedule', chatData.scheduleData);
              return {
                success: true,
                message: chatData.response || 'I\'ve processed your request.',
                results: [scheduleResult],
                sessionId: chatData.sessionId
              };
            }
            
            // Handle multiple schedules
            if (chatData.action === 'create_multiple_schedules' && chatData.scheduleItems) {
              const results = [];
              for (const item of chatData.scheduleItems) {
                const result = await this.executeAction('add_schedule', item);
                results.push(result);
              }
              return {
                success: true,
                message: chatData.response || `Created ${results.length} schedule items.`,
                results,
                sessionId: chatData.sessionId
              };
            }
            
            return {
              success: true,
              message: chatData.response || 'I understand.',
              results: [],
              sessionId: chatData.sessionId
            };
          }
        }
      } catch (err) {
        console.log('AI chat API not available, falling back to local AI');
      }
      
      // Fallback to local AI service
      const response = await aiService.send(command, {
        system: systemPrompt
      });
      
      // Parse AI response for actions
      const aiActions = this.extractActionsFromAIResponse(response);
      
      if (aiActions.length > 0) {
        const results = [];
        for (const action of aiActions) {
          const result = await this.executeAction(action.action, action.data);
          results.push(result);
        }
        
        return {
          success: true,
          message: response,
          results
        };
      }
      
      return {
        success: true,
        message: response,
        results: [],
        sessionId: options?.sessionId
      };
      
    } catch (error) {
      console.error('Agent bridge error:', error);
      return {
        success: false,
        message: 'I encountered an issue, but I\'m still here to help. Try rephrasing your request.',
        results: []
      };
    }
  }
  
  private parseCommandLocally(command: string): AgentCommand | null {
    const lower = command.toLowerCase();
    const now = new Date();
    
    // Schedule/Meeting patterns
    if (lower.includes('schedule') || lower.includes('meeting')) {
      const timeMatch = command.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
      let startTime = '14:00';
      let endTime = '15:00';
      
      if (timeMatch) {
        const hour = parseInt(timeMatch[1]);
        const min = timeMatch[2] || '00';
        const isPM = timeMatch[3]?.toLowerCase() === 'pm';
        
        const adjustedHour = isPM && hour < 12 ? hour + 12 : hour;
        startTime = `${adjustedHour.toString().padStart(2, '0')}:${min}`;
        endTime = `${(adjustedHour + 1).toString().padStart(2, '0')}:${min}`;
      }
      
      return {
        action: 'add_agenda',
        data: {
          title: command.replace(/at \d{1,2}:?\d{0,2}\s*(am|pm)?/i, '').trim(),
          date: now.toISOString().split('T')[0],
          startTime,
          endTime
        }
      };
    }
    
    // Task patterns
    if (lower.includes('task') || lower.includes('todo') || lower.includes('add')) {
      return {
        action: 'add_task',
        data: {
          title: command.replace(/^(add|task|todo)\s+/i, '').trim(),
          priority: lower.includes('urgent') || lower.includes('important') ? 'high' : 'medium'
        }
      };
    }
    
    // Note patterns
    if (lower.includes('note') || lower.includes('remember')) {
      return {
        action: 'add_note',
        data: {
          body: command.replace(/^(note|remember)\s+/i, '').trim()
        }
      };
    }
    
    return null;
  }
  
  private extractActionsFromAIResponse(response: string): AgentCommand[] {
    const actions: AgentCommand[] = [];
    const lower = response.toLowerCase();
    
    if (lower.includes('added') && lower.includes('agenda')) {
      // AI confirmed adding to agenda
      actions.push({
        action: 'add_agenda',
        data: {
          title: 'AI Generated Task',
          startTime: '09:00',
          endTime: '10:00'
        }
      });
    }
    
    return actions;
  }
  
  private async executeAction(action: string, data: any) {
    console.log('Executing action:', action, data);
    
    try {
      // Handle schedule/agenda creation
      if (action === 'add_schedule' || action === 'add_agenda') {
        // Create schedule item with proper datetime
        let startDateTime, endDateTime;
        
        if (data.startTime && data.startTime.includes('T')) {
          // Already ISO format
          startDateTime = new Date(data.startTime);
          endDateTime = new Date(data.endTime || data.startTime);
        } else if (data.startTime) {
          // Time only, use today's date
          const [startHour, startMin] = data.startTime.split(':');
          const [endHour, endMin] = (data.endTime || data.startTime).split(':');
          
          startDateTime = new Date();
          startDateTime.setHours(parseInt(startHour), parseInt(startMin) || 0, 0, 0);
          
          endDateTime = new Date();
          endDateTime.setHours(parseInt(endHour), parseInt(endMin) || 0, 0, 0);
        } else {
          // Default to current hour
          startDateTime = new Date();
          endDateTime = new Date();
          endDateTime.setHours(startDateTime.getHours() + 1);
        }
        
        const scheduleItem = {
          id: `ai-${Date.now()}-${Math.random()}`,
          title: data.title || 'New Event',
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          type: 'schedule',
          description: data.description || '',
          location: null,
          status: 'upcoming'
        };
        
        // Save to localStorage
        let existingSchedule = [];
        const saved = localStorage.getItem('dashboard_schedule');
        if (saved) {
          try {
            existingSchedule = JSON.parse(saved);
          } catch (e) {
            console.error('Failed to parse saved schedule');
          }
        }
        
        const updatedSchedule = [...existingSchedule, scheduleItem];
        localStorage.setItem('dashboard_schedule', JSON.stringify(updatedSchedule));
        
        console.log('Saved schedule item to localStorage:', scheduleItem);
        
        // Dispatch event to refresh dashboard
        window.dispatchEvent(new CustomEvent('scheduleUpdated', { 
          detail: { scheduleItem } 
        }));
        
        return { success: true, action, data: scheduleItem };
      }
      
      // Dispatch events that the dashboard will listen to
      const event = new CustomEvent(`ai-${action.replace('_', '-')}`, { 
        detail: data 
      });
      window.dispatchEvent(event);
      
      return { success: true, action, data };
    } catch (error) {
      console.error('Action execution error:', error);
      return { success: false, action, data, error: error.message };
    }
  }
  
  private getSuccessMessage(command: AgentCommand): string {
    switch (command.action) {
      case 'add_agenda':
        return `✅ I've scheduled "${command.data.title}" for ${command.data.startTime}`;
      case 'add_task':
        return `✅ I've added "${command.data.title}" to your tasks`;
      case 'add_note':
        return `✅ I've saved your note`;
      default:
        return '✅ Done!';
    }
  }
}

export const agentBridge = new AgentBridge();