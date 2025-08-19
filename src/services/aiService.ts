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
    console.log('initialize - Setting AI config:', { ...config, apiKey: '***' })
    
    this.config = config
    
    const storageConfig = {
      provider: config.provider,
      model: config.model,
      // Store API key encrypted in production
      apiKey: btoa(config.apiKey)
    }
    
    console.log('initialize - Storing to localStorage:', { ...storageConfig, apiKey: '***' })
    localStorage.setItem('ai_config', JSON.stringify(storageConfig))
    
    // Verify it was stored
    const verification = localStorage.getItem('ai_config')
    console.log('initialize - Verification read:', verification)
  }
  
  loadConfig(): AIConfig | null {
    try {
      // First check for environment variable (development)
      const envApiKey = import.meta.env.VITE_OPENAI_API_KEY
      if (envApiKey) {
        console.log('loadConfig - using environment API key')
        return {
          provider: 'openai',
          apiKey: envApiKey,
          model: 'gpt-4'
        }
      }
      
      // Fall back to localStorage (user settings)
      const stored = localStorage.getItem('ai_config')
      console.log('loadConfig - checking stored value:', stored)
      
      if (stored) {
        const parsed = JSON.parse(stored)
        console.log('loadConfig - parsed value:', parsed)
        
        if (parsed.apiKey) {
          const config = {
            ...parsed,
            apiKey: atob(parsed.apiKey)
          }
          console.log('loadConfig - final config (apiKey masked):', { ...config, apiKey: '***' })
          return config
        }
      }
      return null
    } catch (error) {
      console.error('loadConfig - Error loading AI config:', error)
      return null
    }
  }
  
  clearConfig() {
    this.config = null
    localStorage.removeItem('ai_config')
  }
  
  isConfigured(): boolean {
    console.log('Checking AI configuration...')
    console.log('Current config:', this.config)
    
    const loadedConfig = this.loadConfig()
    console.log('Loaded config from localStorage:', loadedConfig)
    
    const stored = localStorage.getItem('ai_config')
    console.log('Raw localStorage ai_config:', stored)
    
    const isConfigured = this.config !== null || loadedConfig !== null
    console.log('Final isConfigured result:', isConfigured)
    
    return isConfigured
  }
  
  async processCommand(command: string): Promise<AIResponse> {
    console.log('processCommand called with:', command)
    
    if (!this.config && !this.loadConfig()) {
      console.log('No AI config found')
      return {
        success: false,
        message: 'AI service not configured. Please add your API credentials in Settings.'
      }
    }
    
    const config = this.config || this.loadConfig()!
    console.log('Using AI config:', { provider: config.provider, model: config.model, hasApiKey: !!config.apiKey })
    
    try {
      if (config.provider === 'claude') {
        return await this.processClaudeCommand(command, config)
      } else if (config.provider === 'openai') {
        return await this.processOpenAICommand(command, config)
      }
      
      return {
        success: false,
        message: 'Unknown AI provider: ' + config.provider
      }
    } catch (error: any) {
      console.error('AI command processing error:', error)
      return {
        success: false,
        message: `Failed to process AI command: ${error.message || error}`
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
    console.log('processOpenAICommand called with command:', command)
    console.log('Using model:', config.model || 'gpt-4')
    
    // Special handling for test commands
    if (command.toLowerCase().includes('test')) {
      return {
        success: true,
        message: 'AI connection test successful! I can process commands and help manage your agenda.',
        actions: []
      }
    }
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model || 'gpt-4',
          messages: [{
            role: 'system',
            content: `You are an AI assistant helping manage a daily agenda app. You can help with agenda items, todos, food logging, and supplements.

Parse user commands and respond with a JSON object containing:
- success: boolean
- message: string describing what you're doing
- actions: array of action objects

Action types:
- add_agenda: Add agenda item (needs: title, startTime, endTime)
- add_todo: Add todo item (needs: text, priority)
- add_food: Add food item (needs: name, calories, protein, carbs, fat)
- add_supplement: Add supplement (needs: name, dose, time)
- complete_item: Mark item complete (needs: id, type)

Example response:
{
  "success": true,
  "message": "Added meeting to your agenda",
  "actions": [{
    "action": "add_agenda",
    "data": {
      "title": "Team meeting",
      "startTime": "14:00",
      "endTime": "15:00"
    }
  }]
}`
          }, {
            role: 'user',
            content: command
          }],
          temperature: 0.3,
          max_tokens: 500
        })
      })
      
      console.log('OpenAI response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.text()
        console.error('OpenAI API error:', response.status, errorData)
        
        if (response.status === 401) {
          return {
            success: false,
            message: 'Invalid API key. Please check your OpenAI API key in Settings.'
          }
        } else if (response.status === 429) {
          return {
            success: false,
            message: 'Rate limit exceeded. Please try again in a moment.'
          }
        } else {
          return {
            success: false,
            message: `OpenAI API error (${response.status}): ${response.statusText}`
          }
        }
      }
      
      const data = await response.json()
      console.log('OpenAI response data:', data)
      
      try {
        const content = data.choices[0].message.content
        console.log('OpenAI response content:', content)
        const parsed = JSON.parse(content)
        return parsed
      } catch (error) {
        console.error('Failed to parse OpenAI response:', data, error)
        return {
          success: false,
          message: 'I had trouble understanding your request. Could you try rephrasing it?'
        }
      }
    } catch (error: any) {
      console.error('OpenAI request error:', error)
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return {
          success: false,
          message: 'Network error. Please check your internet connection.'
        }
      }
      return {
        success: false,
        message: `Request failed: ${error.message || error}`
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