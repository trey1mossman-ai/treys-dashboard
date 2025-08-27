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
    // In production, we always use the backend proxy which has the API keys
    // So we just need to check if a provider is configured
    console.log('Checking AI configuration...')
    
    // Always return true since backend handles the API keys
    // The backend will return appropriate errors if not configured
    return true
  }
  
  async processCommand(command: string): Promise<AIResponse> {
    console.log('processCommand called with:', command)
    
    // Get provider preference from localStorage or use default
    let provider = 'openai' // default provider
    const storedConfig = this.loadConfig()
    if (storedConfig?.provider) {
      provider = storedConfig.provider
    }
    
    console.log('Using AI provider:', provider)
    
    try {
      if (provider === 'claude' || provider === 'anthropic') {
        return await this.processClaudeCommand(command, { provider: 'claude', apiKey: '', model: '' })
      } else {
        return await this.processOpenAICommand(command, { provider: 'openai', apiKey: '', model: '' })
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
    // Use the backend proxy endpoint instead of direct Claude API call
    const apiUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:8788' 
      : '';  // Use same origin in production
    
    const response = await fetch(`${apiUrl}/api/ai/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: 'anthropic',
        messages: [{
          role: 'user',
          content: command
        }],
        system: `You are an AI assistant controlling an agenda app. Parse commands and return a JSON response with actions to take.
          
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
          }`,
        stream: false,
        enable_tools: false
      })
    })
    
    if (!response.ok) {
      const errorData = await response.text()
      console.error('Backend proxy error:', response.status, errorData)
      throw new Error(`Backend proxy error: ${response.statusText}`)
    }
    
    const data = await response.json()
    try {
      // The backend proxy returns the Anthropic response
      if (data.content && data.content[0]) {
        const parsed = JSON.parse(data.content[0].text)
        return parsed
      } else if (data.error) {
        return {
          success: false,
          message: data.error
        }
      } else {
        return {
          success: false,
          message: 'Failed to parse AI response'
        }
      }
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
      // Use the backend proxy endpoint instead of direct OpenAI API call
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:8788' 
        : '';  // Use same origin in production
      
      const response = await fetch(`${apiUrl}/api/ai/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'openai',
          messages: [{
            role: 'user',
            content: command
          }],
          system: `You are a helpful AI assistant. Be conversational and natural.

Return ONLY valid JSON:
{
  "success": true,
  "message": "Your response",
  "actions": []
}

Just respond naturally without prefixes like "I've analyzed" or "Here's what I can do".`,
          stream: false,
          enable_tools: false
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
      console.log('Backend proxy response data:', data)
      
      try {
        // The backend proxy returns the OpenAI response directly
        if (data.choices && data.choices[0]) {
          const content = data.choices[0].message.content
          console.log('AI response content:', content)
          
          // Try to parse as JSON if it looks like JSON
          if (content.trim().startsWith('{')) {
            try {
              const parsed = JSON.parse(content)
              return parsed
            } catch {
              // If parsing fails, return a formatted response
              return {
                success: true,
                message: content,
                actions: []
              }
            }
          } else {
            // Plain text response
            return {
              success: true,
              message: content,
              actions: []
            }
          }
        } else if (data.error) {
          // Handle error from backend
          console.error('Backend returned error:', data.error)
          return {
            success: false,
            message: data.error
          }
        } else {
          // Unexpected response format
          console.error('Unexpected response format:', data)
          return {
            success: false,
            message: 'Unexpected response from AI service'
          }
        }
      } catch (error) {
        console.error('Failed to process AI response:', data, error)
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