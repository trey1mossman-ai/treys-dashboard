// AI Service for integration with Claude and OpenAI

export interface AIConfig {
  provider: 'claude' | 'openai'
  apiKey: string
  model?: string
}

export interface AICommand {
  action: 'add' | 'edit' | 'delete' | 'complete' | 'list' | 'navigate' | 'analyze'
  target?: string
  data?: any
}

export interface AIResponse {
  success: boolean
  message: string
  actions?: AICommand[]
  data?: any
}

class AIService {
  private config: AIConfig | null = null
  
  initialize(config: AIConfig) {
    this.config = config
    localStorage.setItem('ai_config', JSON.stringify({
      provider: config.provider,
      model: config.model,
      // Store API key encrypted in production
      apiKey: btoa(config.apiKey)
    }))
  }
  
  loadConfig(): AIConfig | null {
    const stored = localStorage.getItem('ai_config')
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        ...parsed,
        apiKey: atob(parsed.apiKey)
      }
    }
    return null
  }
  
  clearConfig() {
    this.config = null
    localStorage.removeItem('ai_config')
  }
  
  isConfigured(): boolean {
    return this.config !== null || this.loadConfig() !== null
  }
  
  async processCommand(command: string): Promise<AIResponse> {
    if (!this.config && !this.loadConfig()) {
      return {
        success: false,
        message: 'AI service not configured. Please add your API credentials in Settings.'
      }
    }
    
    const config = this.config || this.loadConfig()!
    
    try {
      if (config.provider === 'claude') {
        return await this.processClaudeCommand(command, config)
      } else if (config.provider === 'openai') {
        return await this.processOpenAICommand(command, config)
      }
      
      return {
        success: false,
        message: 'Unknown AI provider'
      }
    } catch (error) {
      console.error('AI command processing error:', error)
      return {
        success: false,
        message: 'Failed to process AI command'
      }
    }
  }
  
  private async processClaudeCommand(command: string, config: AIConfig): Promise<AIResponse> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: config.model || 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `You are an AI assistant controlling an agenda app. Parse this command and return a JSON response with actions to take: "${command}"
          
          Available actions:
          - add: Add a new agenda item (provide title, startTime, endTime, tag, notes)
          - edit: Edit an existing item (provide id and updates)
          - delete: Delete an item (provide id)
          - complete: Mark item as complete (provide id)
          - list: List all items
          - navigate: Navigate to a page (provide page: dashboard/settings/workflows/fitness)
          - analyze: Analyze agenda and provide insights
          
          Respond with valid JSON only:
          {
            "success": true,
            "message": "Description of what you're doing",
            "actions": [
              {
                "action": "add",
                "data": {
                  "title": "Meeting with team",
                  "startTime": "2024-01-15T14:00:00",
                  "endTime": "2024-01-15T15:00:00",
                  "tag": "Meeting",
                  "notes": "Discuss Q1 goals"
                }
              }
            ]
          }`
        }],
        temperature: 0.3
      })
    })
    
    if (!response.ok) {
      throw new Error(`Claude API error: ${response.statusText}`)
    }
    
    const data = await response.json()
    try {
      const parsed = JSON.parse(data.content[0].text)
      return parsed
    } catch {
      return {
        success: false,
        message: 'Failed to parse AI response'
      }
    }
  }
  
  private async processOpenAICommand(command: string, config: AIConfig): Promise<AIResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model || 'gpt-3.5-turbo',
        messages: [{
          role: 'system',
          content: 'You are an AI assistant controlling an agenda app. Parse commands and return JSON responses with actions to take.'
        }, {
          role: 'user',
          content: `Parse this command and return a JSON response with actions: "${command}"
          
          Available actions:
          - add: Add a new agenda item
          - edit: Edit an existing item
          - delete: Delete an item
          - complete: Mark item as complete
          - list: List all items
          - navigate: Navigate to a page
          - analyze: Analyze agenda
          
          Respond with valid JSON only.`
        }],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    })
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }
    
    const data = await response.json()
    try {
      const parsed = JSON.parse(data.choices[0].message.content)
      return parsed
    } catch {
      return {
        success: false,
        message: 'Failed to parse AI response'
      }
    }
  }
  
  // Helper method to execute AI actions
  async executeActions(actions: AICommand[]): Promise<void> {
    for (const action of actions) {
      switch (action.action) {
        case 'add':
          // Dispatch event for adding item
          window.dispatchEvent(new CustomEvent('ai-add-item', { detail: action.data }))
          break
        case 'edit':
          window.dispatchEvent(new CustomEvent('ai-edit-item', { detail: action.data }))
          break
        case 'delete':
          window.dispatchEvent(new CustomEvent('ai-delete-item', { detail: action.data }))
          break
        case 'complete':
          window.dispatchEvent(new CustomEvent('ai-complete-item', { detail: action.data }))
          break
        case 'navigate':
          window.dispatchEvent(new CustomEvent('ai-navigate', { detail: action.data }))
          break
        case 'list':
          window.dispatchEvent(new CustomEvent('ai-list-items'))
          break
        case 'analyze':
          window.dispatchEvent(new CustomEvent('ai-analyze'))
          break
      }
    }
  }
}

export const aiService = new AIService()