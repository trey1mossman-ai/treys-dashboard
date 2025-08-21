// Agent Bridge - Connects AI to your dashboard actions
// import { aiCommandParser } from './aiCommandParser'  // TODO: Implement parser
import { aiService } from '@/lib/ai/ai-service'

interface AgentConfig {
  serviceToken: string
  hmacSecret: string
  baseUrl: string
}

class AgentBridge {
  private config: AgentConfig | null = null

  initialize() {
    // Load config from environment or settings
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
      console.log('Processing command:', command)
      
      // Parse the command locally first
      const parsedCommands = { action: 'default', params: {} } // aiCommandParser.parseCommand(command)
      console.log('Parsed commands:', parsedCommands)
      
      if (parsedCommands.length === 0) {
        // If local parser doesn't understand, try AI service for more complex parsing
        const aiResponse = await this.processWithAI(command)
        return aiResponse
      }
      
      // Execute the parsed commands
      const results = []
      for (const cmd of parsedCommands) {
        const result = await this.executeAction(cmd.action, cmd.data)
        results.push(result)
      }
      
      // Generate response message
      const successCount = results.filter(r => r.success).length
      const message = successCount > 0 
        ? `✅ Done! I've ${this.describeActions(parsedCommands)}`
        : 'Sorry, I encountered an issue executing that command.'
      
      return {
        success: successCount > 0,
        message,
        results
      }
    } catch (error) {
      console.error('Agent bridge error:', error)
      return {
        success: false,
        message: 'Sorry, I encountered an error processing your request.',
        results: []
      }
    }
  }
  
  private async processWithAI(command: string) {
    try {
      // Use AI service for complex commands
      const systemPrompt = `You are an assistant that helps manage a daily agenda dashboard. 
Parse the user's command and return a JSON response with actions to take.

Available actions:
- add_agenda: Add item to schedule (needs: title, date, startTime, endTime, tag?, notes?)
- add_task: Add todo item (needs: title, priority?, dueDate?)
- add_note: Create note (needs: body, tag?)
- query: Query information (needs: type)

Respond with JSON like:
{
  "actions": [
    {
      "action": "add_agenda",
      "data": {
        "title": "Meeting",
        "date": "2024-01-15",
        "startTime": "14:00",
        "endTime": "15:00"
      }
    }
  ],
  "message": "I've scheduled your meeting for 2pm today."
}`

      const response = await aiService.send(command, {
        system: systemPrompt,
        stream: false
      })
      
      console.log('AI Response:', response)
      
      // Try to parse JSON from response
      let parsedResponse
      try {
        // Extract JSON from response (might be wrapped in markdown)
        const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/{[\s\S]*}/)
        const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response
        parsedResponse = JSON.parse(jsonStr)
      } catch (e) {
        console.log('Could not parse AI response as JSON, treating as message')
        return {
          success: true,
          message: response,
          results: []
        }
      }
      
      // Execute AI-suggested actions
      const results = []
      if (parsedResponse.actions && Array.isArray(parsedResponse.actions)) {
        for (const action of parsedResponse.actions) {
          const result = await this.executeAction(action.action, action.data)
          results.push(result)
        }
      }
      
      return {
        success: true,
        message: parsedResponse.message || 'Command processed successfully',
        results
      }
    } catch (error) {
      console.error('AI processing error:', error)
      throw error
    }
  }
  
  private async executeAction(action: string, data: any) {
    try {
      console.log('Executing action:', action, data)
      
      switch (action) {
        case 'add_agenda':
          // Dispatch event that agenda component will listen to
          window.dispatchEvent(new CustomEvent('ai-add-agenda', { 
            detail: data
          }))
          return { success: true, action: 'add_agenda', data }
          
        case 'add_task':
        case 'add_todo':
          window.dispatchEvent(new CustomEvent('ai-add-task', { 
            detail: data
          }))
          return { success: true, action: 'add_task', data }
          
        case 'add_note':
          window.dispatchEvent(new CustomEvent('ai-add-note', { 
            detail: data
          }))
          return { success: true, action: 'add_note', data }
          
        case 'execute_action':
          window.dispatchEvent(new CustomEvent('ai-execute-action', { 
            detail: data
          }))
          return { success: true, action: 'execute_action', data }
          
        case 'query':
          window.dispatchEvent(new CustomEvent('ai-query', { 
            detail: data
          }))
          return { success: true, action: 'query', data }
          
        default:
          console.warn('Unknown action:', action)
          return { success: false, error: `Unknown action: ${action}` }
      }
    } catch (error) {
      console.error('Action execution error:', error)
      return { success: false, error: String(error) }
    }
  }
  
  private describeActions(commands: any[]): string {
    const descriptions = commands.map(cmd => {
      switch (cmd.action) {
        case 'add_agenda':
          return `scheduled "${cmd.data.title}"`
        case 'add_task':
          return `added task "${cmd.data.title}"`
        case 'add_note':
          return `created a note`
        case 'execute_action':
          return `triggered ${cmd.data.name}`
        case 'query':
          return `fetched your ${cmd.data.type}`
        default:
          return 'completed the action'
      }
    })
    
    if (descriptions.length === 1) return descriptions[0]
    if (descriptions.length === 2) return `${descriptions[0]} and ${descriptions[1]}`
    return descriptions.slice(0, -1).join(', ') + ', and ' + descriptions[descriptions.length - 1]
  }
}

export const agentBridge = new AgentBridge()
