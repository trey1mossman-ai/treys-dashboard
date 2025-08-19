// Agent Bridge - Connects AI to your backend API
import { aiService } from './aiService'

interface AgentConfig {
  serviceToken: string
  hmacSecret: string
  baseUrl: string
}

class AgentBridge {
  private config: AgentConfig | null = null

  initialize() {
    // Load config from environment or settings
    // In production, these should come from secure backend
    // For now, check localStorage for dev testing
    const stored = localStorage.getItem('agent_config')
    if (stored) {
      this.config = JSON.parse(stored)
    } else {
      console.warn('Agent bridge not configured. Add credentials in Settings.')
    }
  }

  setConfig(serviceToken: string, hmacSecret: string) {
    this.config = {
      serviceToken,
      hmacSecret,
      baseUrl: import.meta.env.VITE_API_BASE_URL || window.location.origin
    }
    localStorage.setItem('agent_config', JSON.stringify(this.config))
  }

  async processNaturalCommand(command: string) {
    try {
      // Check if AI service is configured
      if (!aiService.isConfigured()) {
        return {
          success: false,
          message: 'Please configure your OpenAI API key in Settings to use the AI assistant.',
          results: []
        }
      }

      // Use AI service to parse the natural language command
      const aiResponse = await aiService.processCommand(command)
      
      if (!aiResponse.success) {
        return {
          success: false,
          message: aiResponse.message || 'Sorry, I could not understand your request.',
          results: []
        }
      }

      // Process the AI actions and execute them on the frontend
      const results = []
      if (aiResponse.actions && aiResponse.actions.length > 0) {
        for (const action of aiResponse.actions) {
          const result = await this.executeUIAction(action)
          results.push(result)
        }
      }

      return {
        success: true,
        message: aiResponse.message || 'Command executed successfully',
        results
      }
    } catch (error) {
      console.error('Agent bridge error:', error)
      return {
        success: false,
        message: 'Sorry, I encountered an error. Please check your API configuration in Settings and try again.',
        results: []
      }
    }
  }

  private async executeUIAction(action: any) {
    try {
      switch (action.action) {
        case 'add_agenda':
          window.dispatchEvent(new CustomEvent('ai-add-item', { 
            detail: { 
              section: 'agenda', 
              ...action.data 
            } 
          }));
          return { success: true, action: 'add_agenda', data: action.data };
          
        case 'add_todo':
          window.dispatchEvent(new CustomEvent('ai-add-item', { 
            detail: { 
              section: 'todo', 
              text: action.data.text || action.data.title,
              priority: action.data.priority || 'medium'
            } 
          }));
          return { success: true, action: 'add_todo', data: action.data };
          
        case 'add_food':
          window.dispatchEvent(new CustomEvent('ai-add-item', { 
            detail: { 
              section: 'food', 
              ...action.data 
            } 
          }));
          return { success: true, action: 'add_food', data: action.data };
          
        case 'add_supplement':
          window.dispatchEvent(new CustomEvent('ai-add-item', { 
            detail: { 
              section: 'supplement', 
              ...action.data 
            } 
          }));
          return { success: true, action: 'add_supplement', data: action.data };
          
        default:
          return { success: false, error: 'Unknown action type' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }
}

export const agentBridge = new AgentBridge()
