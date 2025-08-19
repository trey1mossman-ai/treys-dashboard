// Agent Bridge Service - Connects AI Assistant to Agent API
// This service translates AI commands into Agent API calls

import { aiService } from './aiService'

export interface AgentCommand {
  tool: string
  args: Record<string, any>
}

class AgentBridge {
  private agentToken: string | null = null
  private agentSecret: string | null = null
  
  // Initialize with credentials (these should come from a secure settings API)
  async initialize() {
    // In production, these should be fetched from a secure endpoint
    // For now, we'll use the AI config as a proxy
    const config = aiService.loadConfig()
    if (config) {
      // Store agent credentials separately
      const agentConfig = localStorage.getItem('agent_config')
      if (agentConfig) {
        const parsed = JSON.parse(agentConfig)
        this.agentToken = parsed.token
        this.agentSecret = parsed.secret
      }
    }
  }
  
  // Save agent credentials (called from settings)
  saveCredentials(token: string, secret: string) {
    this.agentToken = token
    this.agentSecret = secret
    localStorage.setItem('agent_config', JSON.stringify({
      token: btoa(token),
      secret: btoa(secret)
    }))
  }
  
  // Load saved credentials
  loadCredentials() {
    const stored = localStorage.getItem('agent_config')
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        token: atob(parsed.token),
        secret: atob(parsed.secret)
      }
    }
    return null
  }
  
  // Process natural language command through AI then execute via Agent API
  async processNaturalCommand(command: string): Promise<{
    success: boolean
    message: string
    results?: any[]
  }> {
    try {
      // Step 1: Use AI to parse the natural language command
      const aiResponse = await aiService.processCommand(command)
      
      if (!aiResponse.success || !aiResponse.actions) {
        return {
          success: false,
          message: aiResponse.message || 'Failed to understand command'
        }
      }
      
      // Step 2: Convert AI actions to Agent API calls
      const results = []
      for (const action of aiResponse.actions) {
        const agentCommand = this.convertAIActionToAgentCommand(action)
        if (agentCommand) {
          const result = await this.executeAgentCommand(agentCommand)
          results.push(result)
        }
      }
      
      return {
        success: true,
        message: aiResponse.message,
        results
      }
    } catch (error) {
      console.error('Agent bridge error:', error)
      return {
        success: false,
        message: 'Failed to execute command'
      }
    }
  }
  
  // Convert AI action format to Agent API format
  private convertAIActionToAgentCommand(action: any): AgentCommand | null {
    switch (action.action) {
      case 'add':
        if (action.target === 'agenda' || !action.target) {
          const data = action.data
          return {
            tool: 'agenda.create',
            args: {
              date: this.formatDate(data.startTime || data.date),
              title: data.title,
              start_ts: this.toTimestamp(data.startTime),
              end_ts: this.toTimestamp(data.endTime),
              tag: data.tag,
              notes: data.notes
            }
          }
        } else if (action.target === 'task') {
          return {
            tool: 'tasks.create',
            args: {
              title: action.data.title,
              due_ts: action.data.dueDate ? this.toTimestamp(action.data.dueDate) : undefined,
              source: 'assistant'
            }
          }
        } else if (action.target === 'note') {
          return {
            tool: 'notes.create',
            args: {
              body: action.data.content || action.data.body,
              tag: action.data.tag
            }
          }
        }
        break
        
      case 'edit':
        if (action.target === 'agenda') {
          const patch: any = {}
          if (action.data.title) patch.title = action.data.title
          if (action.data.startTime) patch.start_ts = this.toTimestamp(action.data.startTime)
          if (action.data.endTime) patch.end_ts = this.toTimestamp(action.data.endTime)
          if (action.data.tag) patch.tag = action.data.tag
          if (action.data.notes) patch.notes = action.data.notes
          
          return {
            tool: 'agenda.update',
            args: {
              id: action.data.id,
              patch
            }
          }
        }
        break
        
      case 'delete':
        if (action.target === 'agenda') {
          return {
            tool: 'agenda.delete',
            args: { id: action.data.id }
          }
        } else if (action.target === 'note') {
          return {
            tool: 'notes.archive',
            args: { id: action.data.id }
          }
        }
        break
        
      case 'complete':
        if (action.target === 'task') {
          return {
            tool: 'tasks.toggle',
            args: {
              id: action.data.id,
              status: 'completed'
            }
          }
        }
        break
        
      case 'list':
        if (action.target === 'agenda') {
          return {
            tool: 'agenda.listByDate',
            args: {
              date: this.formatDate(action.data?.date || new Date())
            }
          }
        }
        break
    }
    
    return null
  }
  
  // Execute command via Agent API
  async executeAgentCommand(command: AgentCommand): Promise<any> {
    // Use the relay endpoint which handles auth server-side
    const response = await fetch('/api/agent/relay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tool: command.tool,
        args: command.args
      })
    })
    
    if (!response.ok) {
      throw new Error(`Agent API error: ${response.statusText}`)
    }
    
    return response.json()
  }
  
  // Direct command execution (bypasses AI interpretation)
  async executeDirectCommand(tool: string, args: Record<string, any>): Promise<any> {
    return this.executeAgentCommand({ tool, args })
  }
  
  // Helper methods
  private formatDate(date: Date | string): string {
    if (typeof date === 'string') {
      if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return date
      }
      date = new Date(date)
    }
    const d = date as Date
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  
  private toTimestamp(dateTime: string | Date | number): number {
    if (typeof dateTime === 'number') return dateTime
    return Math.floor(new Date(dateTime).getTime() / 1000)
  }
}

export const agentBridge = new AgentBridge()
